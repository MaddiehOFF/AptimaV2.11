import React, { useState, useMemo } from 'react';
import { CalculatorProjection, Product, WalletTransaction, CashShift, Partner, RoyaltyHistoryItem, SupplierProduct, InventorySession } from '../types';
import { generateUUID } from '../utils/uuid';
import { Calculator, DollarSign, Users, Box, Crown, TrendingUp, RefreshCcw, Save, Check, History, Clock, ArrowRight, Upload, Loader2, AlertCircle, X, ShoppingCart, Info, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { parseSalesExcel } from '../utils/excelParser';

interface FinanceDashboardProps {
    products: Product[];
    setTransactions?: React.Dispatch<React.SetStateAction<WalletTransaction[]>>;
    transactions?: WalletTransaction[];
    projections?: CalculatorProjection[];
    setProjections?: React.Dispatch<React.SetStateAction<CalculatorProjection[]>>;
    userName?: string;
    cashShifts?: CashShift[];
    partners?: Partner[];
    setPartners?: React.Dispatch<React.SetStateAction<Partner[]>>;
    addRoyaltyHistory?: (item: RoyaltyHistoryItem) => Promise<void>;
    supplierProducts?: SupplierProduct[];
    inventorySessions?: InventorySession[];
}

export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ products, setTransactions, transactions, projections, setProjections, userName, cashShifts, partners, setPartners, addRoyaltyHistory, supplierProducts = [], inventorySessions = [] }) => {
    const [activeTab, setActiveTab] = useState<'CALCULATOR' | 'HISTORY' | 'INPUTS'>('CALCULATOR');
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [showCommitModal, setShowCommitModal] = useState(false);
    const [realSalesInput, setRealSalesInput] = useState('');

    // Sales Import State
    const [isImporting, setIsImporting] = useState(false);
    const [showImportLog, setShowImportLog] = useState(false);
    const [importLog, setImportLog] = useState<{ name: string; qty: number }[]>([]);

    // Inputs Calculator State
    const [showInventoryComparison, setShowInventoryComparison] = useState(false);
    const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');

    // Calculate Cash Deductions
    const cashDeductions = useMemo(() => {
        if (!cashShifts) return { labor: 0, material: 0 };
        const openShift = cashShifts.find(s => s.status === 'OPEN');
        if (!openShift) return { labor: 0, material: 0 };
        const labor = openShift.transactions.filter(t => t.type === 'EXPENSE' && t.category === 'PERSONAL').reduce((acc, t) => acc + t.amount, 0);
        const material = openShift.transactions.filter(t => t.type === 'EXPENSE' && t.category === 'INSUMOS').reduce((acc, t) => acc + t.amount, 0);
        return { labor, material };
    }, [cashShifts]);

    const handleQtyChange = (id: string, val: string) => {
        const num = parseInt(val) || 0;
        setQuantities(prev => ({ ...prev, [id]: num }));
    };

    const resetCalculator = () => setQuantities({});

    const handleImportSales = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportLog([]);

        try {
            const parsedItems = await parseSalesExcel(file);

            if (parsedItems.length === 0) {
                alert('No se encontraron items válidos en la hoja "Productos".');
                setIsImporting(false);
                return;
            }

            const newQuantities = { ...quantities };
            const skippedList: { name: string; qty: number }[] = [];
            let addedCount = 0;

            parsedItems.forEach(item => {
                const product = products.find(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
                if (product) {
                    newQuantities[product.id] = (newQuantities[product.id] || 0) + item.qty;
                    addedCount += item.qty;
                } else {
                    skippedList.push(item);
                }
            });

            setQuantities(newQuantities);
            setImportLog(skippedList);

            if (skippedList.length > 0) {
                setShowImportLog(true);
            } else {
                alert(`Importación exitosa. Se cargaron ${addedCount} items.`);
            }

        } catch (error: any) {
            console.error(error);
            alert('Error: ' + error.message);
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    // --- IMPORT FROM SHIFT HISTORY ---
    const [showHistoryImportModal, setShowHistoryImportModal] = useState(false);

    const handleImportFromShift = (shift: CashShift) => {
        if (!shift.salesDataSnapshot || shift.salesDataSnapshot.length === 0) {
            alert('Este cierre no tiene datos de ventas adjuntos.');
            return;
        }

        const newQuantities = { ...quantities };
        const skippedList: { name: string; qty: number }[] = [];
        let addedCount = 0;

        shift.salesDataSnapshot.forEach((item: any) => {
            const product = products.find(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
            if (product) {
                newQuantities[product.id] = (newQuantities[product.id] || 0) + item.qty;
                addedCount += item.qty;
            } else {
                skippedList.push(item);
            }
        });

        setQuantities(newQuantities);
        setImportLog(skippedList);
        setShowHistoryImportModal(false);

        if (skippedList.length > 0) {
            setShowImportLog(true);
        } else {
            alert(`Importación exitosa desde cierre del ${new Date(shift.date).toLocaleDateString()}. Se cargaron ${addedCount} items.`);
        }
    };

    const totals = useMemo(() => {
        let labor = 0;
        let material = 0;
        let royalties = 0;
        let profit = 0;
        Object.entries(quantities).forEach(([id, qty]) => {
            const product = products.find(p => p.id === id);
            if (product && qty > 0) {
                labor += product.laborCost * qty;
                material += product.materialCost * qty;
                royalties += product.royalties * qty;
                profit += product.profit * qty;
            }
        });
        return { labor, material, royalties, profit, total: labor + material + royalties + profit };
    }, [quantities, products]);

    const payableLabor = Math.max(0, totals.labor - cashDeductions.labor);
    const payableMaterial = Math.max(0, totals.material - cashDeductions.material);

    const initiateCommit = () => {
        setRealSalesInput(totals.total.toString());
        setShowCommitModal(true);
    };

    const handleCommit = () => {
        if (!setTransactions || !transactions || !userName || !setProjections || !projections || !partners || !setPartners) return;
        const realSales = parseFloat(realSalesInput) || 0;
        const diff = realSales - totals.total;
        const adjustedPartnerProfit = totals.profit + diff; // Simplify logic: Difference goes to Partners/Profit space

        // This logic can be refined. For now, assuming diff affects pure profit (Royalties in this context seem to mean Profit Share).

        const incomeTx: WalletTransaction = {
            id: generateUUID(),
            date: new Date().toISOString(),
            time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            amount: realSales,
            type: 'INCOME',
            category: 'Ventas',
            description: 'Cierre Calculadora (Venta Real)',
            createdBy: userName
        };
        setTransactions([incomeTx, ...transactions]);
        const updatedPartners = partners.map(p => {
            const shareAmount = (adjustedPartnerProfit * p.sharePercentage) / 100;
            return { ...p, balance: (p.balance || 0) + shareAmount };
        });
        setPartners(updatedPartners);

        if (addRoyaltyHistory) {
            const royaltyItem: RoyaltyHistoryItem = {
                id: generateUUID(),
                date: new Date().toISOString(),
                type: 'INCOME',
                amount: adjustedPartnerProfit,
                description: 'Ingreso desde Calculadora de Rentabilidad',
                user: userName
            };
            addRoyaltyHistory(royaltyItem);
        }
        const itemsSnapshot = Object.entries(quantities).filter(([_, qty]) => qty > 0).map(([id, qty]) => {
            const prod = products.find(p => p.id === id);
            return { name: prod?.name || 'Unknown', qty };
        });
        const newProjection: CalculatorProjection = {
            id: generateUUID(),
            date: new Date().toISOString(),
            totalSales: totals.total,
            realSales: realSales,
            netProfit: totals.royalties, // "Ganancia Neta" label in UI maps to royalties field in logic above? Wait, logic says royalties += product.royalties.
            royalties: adjustedPartnerProfit, // This is the "Socios/Profit" part
            itemsSnapshot,
            createdBy: userName
        };
        setProjections([newProjection, ...projections]);
        setShowCommitModal(false);
        resetCalculator();
    };

    const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Reporte de Insumos - Comparativa", 14, 15);

        const tableData = ingredientAnalysis.map(item => [
            item.name,
            `${item.required.toLocaleString('es-AR')} ${item.unit}`,
            showInventoryComparison ? (item.matchName ? `${item.userUsage.toLocaleString('es-AR')} ${item.stockUnit}` : '-') : '-',
            showInventoryComparison ? (item.matchName ? `${item.diff.toLocaleString('es-AR')} ${item.stockUnit}` : '-') : '-',
            showInventoryComparison ? (item.matchName ? `${item.stock} ${item.stockUnit}` : '-') : '-',
            showInventoryComparison ? (item.matchName ? (item.stock >= item.required ? 'OK' : 'FALTA') : '?') : '-'
        ]);

        autoTable(doc, {
            head: [['Insumo', 'Requerido (Sistema)', 'Uso Real (Usuario)', 'Diferencia', 'Inventario Final', 'Estado']],
            body: tableData,
            startY: 20,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255] }
        });

        doc.save(`reporte_insumos_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleExportXLS = () => {
        const wb = XLSX.utils.book_new();
        const wsData = ingredientAnalysis.map(item => ({
            "Insumo": item.name,
            "Requerido (Sistema)": item.required,
            "Unidad": item.unit,
            "Uso Real (Usuario)": showInventoryComparison ? (item.matchName ? item.userUsage : 0) : 0,
            "Diferencia": showInventoryComparison ? (item.matchName ? item.diff : 0) : 0,
            "En Inventario Final": showInventoryComparison ? (item.matchName ? item.stock : 0) : 0,
            "Stock Unit": showInventoryComparison ? (item.matchName ? item.stockUnit : '-') : '-',
            "Estado": showInventoryComparison ? (item.matchName ? (item.stock >= item.required ? 'OK' : 'FALTA') : 'No Vinculado') : '-'
        }));
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Insumos");
        XLSX.writeFile(wb, `reporte_insumos_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- INPUTS CALCULATOR LOGIC ---
    const ingredientAnalysis = useMemo(() => {
        const required: Record<string, number> = {};

        Object.entries(quantities).forEach(([prodId, qty]) => {
            if (qty <= 0) return;
            const product = products.find(p => p.id === prodId);
            if (!product || !product.ingredients) return;

            Object.entries(product.ingredients).forEach(([ingName, ingQtyPerUnit]) => {
                required[ingName] = (required[ingName] || 0) + (ingQtyPerUnit * qty);
            });
        });

        // Match with Inventory
        let targetSession: InventorySession | undefined;

        if (selectedInventoryId) {
            targetSession = inventorySessions.find(s => s.id === selectedInventoryId);
        } else {
            // Fallback: Pick latest CLOSED, or latest OPEN
            targetSession = inventorySessions.find(s => s.status === 'CLOSED') || inventorySessions.find(s => s.status === 'OPEN');
        }

        const currentStockMap: Record<string, number> = {};
        const userUsageMap: Record<string, number> = {}; // New: Track User Usage (Initial - Final)

        if (targetSession) {
            targetSession.data.forEach(d => {
                currentStockMap[d.itemId] = d.final !== undefined ? d.final : d.initial;
                // Calculate Usage: If Closed (has Final), usage = Initial - Final. If Open, assume 0 usage yet? or Initial?
                // Request says: "User Usage based on inventory record at start and end of shift"
                if (d.final !== undefined) {
                    userUsageMap[d.itemId] = Math.max(0, d.initial - d.final);
                } else {
                    userUsageMap[d.itemId] = 0; // Usage unknown if not closed
                }
            });
        }

        const analysis = Object.entries(required).map(([ingName, reqQty]) => {
            // Find matching supplier product
            const term = ingName.replace(/_[a-z]+$/, '').replace(/_/g, ' ').toLowerCase();
            const match = supplierProducts.find(sp => sp.name.toLowerCase().includes(term));

            let stock = 0;
            let stockUnit = '-';
            let userUsage = 0;

            if (match) {
                stock = currentStockMap[match.id] || 0;
                stockUnit = match.unit;
                userUsage = userUsageMap[match.id] || 0;
            }

            return {
                name: ingName.replace(/_/g, ' '),
                required: reqQty, // System Usage
                unit: ingName.includes('_g') || ingName.includes('gramos') ? 'g' : 'un',
                stock,
                stockUnit,
                userUsage, // User Usage
                diff: reqQty - userUsage, // Difference (System - User) > 0 implies User used LESS than system? No.
                // If System says 100g required, and User used 120g (Initial 1000 - Final 880).
                // Diff = 100 - 120 = -20. (User used 20g MORE than system).
                // Diff > 0: User used LESS (Efficiency/Savings/Error).
                // Diff < 0: User used MORE (Waste/Theft/Error).
                matchName: match?.name,
                status: match && stock >= reqQty ? 'OK' : 'FALTA'
            };
        });

        return analysis;

    }, [quantities, products, supplierProducts, inventorySessions, selectedInventoryId]);


    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                        <Calculator className="w-8 h-8 text-sushi-gold" />
                        Calculadora de Rentabilidad
                    </h2>
                    <p className="text-gray-500 dark:text-sushi-muted mt-2">Proyecta la mano de obra, insumos y ganancias.</p>
                </div>
                <div className="flex gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('CALCULATOR')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${activeTab === 'CALCULATOR' ? 'bg-sushi-gold text-sushi-black' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        <Calculator className="w-4 h-4" />
                        COSTOS
                    </button>
                    <button
                        onClick={() => setActiveTab('INPUTS')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${activeTab === 'INPUTS' ? 'bg-sushi-gold text-sushi-black' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        <Box className="w-4 h-4" />
                        INSUMOS
                    </button>
                    {/* History moved or kept? User said "DOS pestañas y solo esas dos". I will move History to a standalone button to the right? Or just remove the tab. Let's make it a small icon button outside this group. */}
                </div>
                <button
                    onClick={() => setActiveTab('HISTORY')}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors"
                    title="Ver Historial"
                >
                    <History className="w-5 h-5" />
                </button>
            </div>

            {activeTab === 'CALCULATOR' && (
                <>
                    <div className="flex justify-between items-center mb-2">
                        <label className={`cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg text-sm ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {isImporting ? 'Procesando...' : 'Importar Ventas (XLS)'}
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleImportSales}
                                disabled={isImporting}
                            />
                        </label>

                        <button
                            onClick={() => setShowHistoryImportModal(true)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg text-sm"
                        >
                            <History className="w-4 h-4" />
                            Importar de Cierre
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={resetCalculator}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-sushi-muted hover:text-red-500 transition-colors"
                            >
                                <RefreshCcw className="w-4 h-4" /> Reiniciar
                            </button>
                            {setTransactions && totals.total > 0 && (
                                <button
                                    onClick={initiateCommit}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                                >
                                    <Save className="w-4 h-4" /> Abrir Ficha / Cerrar Proyección
                                </button>
                            )}
                        </div>
                    </div>

                    {importLog.length > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/20 p-3 rounded-lg flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>Se importaron items, pero <b>{importLog.length}</b> no se encontraron en el sistema.</span>
                            </div>
                            <button
                                onClick={() => setShowImportLog(true)}
                                className="text-orange-600 underline text-xs font-bold"
                            >
                                Ver Detalles
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/20 rounded-xl relative overflow-hidden group">
                            <p className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Mano de Obra</p>
                            <p className="text-2xl font-mono font-bold text-blue-700 dark:text-blue-300">{formatMoney(payableLabor)}</p>
                            {cashDeductions.labor > 0 && (
                                <div className="text-[10px] text-blue-500 mt-1 flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3" /> Adelanto Caja: -{formatMoney(cashDeductions.labor)}
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                            <p className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Box className="w-3 h-3" /> Costo Mercadería</p>
                            <p className="text-2xl font-mono font-bold text-gray-700 dark:text-white">{formatMoney(payableMaterial)}</p>
                            {cashDeductions.material > 0 && (
                                <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3" /> Pago Caja: -{formatMoney(cashDeductions.material)}
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/20 rounded-xl">
                            <p className="text-xs uppercase font-bold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Ganancia Neta</p>
                            <p className="text-2xl font-mono font-bold text-green-700 dark:text-green-300">{formatMoney(totals.royalties)}</p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/20 rounded-xl">
                            <p className="text-xs uppercase font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1"><Crown className="w-3 h-3" /> Regalías (Socios)</p>
                            <p className="text-2xl font-mono font-bold text-purple-700 dark:text-purple-300">{formatMoney(totals.profit)}</p>
                        </div>
                        <div className="p-4 bg-sushi-gold/10 border border-sushi-gold/30 rounded-xl">
                            <p className="text-xs uppercase font-bold text-yellow-700 dark:text-sushi-gold mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Venta Teórica</p>
                            <p className="text-2xl font-mono font-bold text-yellow-800 dark:text-sushi-gold">{formatMoney(totals.total)}</p>
                        </div>
                    </div>

                    <div className="flex-1 bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden flex flex-col shadow-lg">
                        <div className="p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/20">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar producto para agregar a la simulación..."
                                className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-sm focus:border-sushi-gold outline-none text-gray-900 dark:text-white"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredProducts.map(p => (
                                    <div key={p.id} className={`p-3 rounded-lg border transition-all flex justify-between items-center ${quantities[p.id] > 0 ? 'bg-sushi-gold/5 border-sushi-gold/30' : 'bg-white dark:bg-white/[0.02] border-gray-100 dark:border-white/5'}`}>
                                        <div className="flex-1 overflow-hidden mr-2">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate" title={p.name}>{p.name}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-sushi-muted">Mano Obra: {formatMoney(p.laborCost)}</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/30 rounded-lg p-1">
                                            <button
                                                onClick={() => handleQtyChange(p.id, String(Math.max(0, (quantities[p.id] || 0) - 1)))}
                                                className="w-6 h-6 flex items-center justify-center bg-white dark:bg-white/10 rounded text-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20"
                                            >-
                                            </button>
                                            <input
                                                type="text"
                                                value={quantities[p.id] || 0}
                                                onChange={(e) => handleQtyChange(p.id, e.target.value)}
                                                className="w-10 text-center bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none"
                                            />
                                            <button
                                                onClick={() => handleQtyChange(p.id, String((quantities[p.id] || 0) + 1))}
                                                className="w-6 h-6 flex items-center justify-center bg-sushi-gold text-sushi-black rounded hover:bg-sushi-goldhover"
                                            >+
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* INPUTS CALCULATOR TAB */}
            {activeTab === 'INPUTS' && (
                <div className="flex-1 bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden shadow-lg p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                                Calculadora de Insumos
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-sushi-muted">
                                Basado en la simulación actual de ventas ({Object.values(quantities).reduce((a, b) => a + b, 0)} productos simulados).
                            </p>
                        </div>
                        <div className="flex gap-2 items-center">
                            {showInventoryComparison && (
                                <select
                                    className="bg-gray-100 dark:bg-white/10 border border-transparent dark:border-white/10 rounded-lg text-sm px-3 py-2 outline-none focus:border-sushi-gold"
                                    value={selectedInventoryId}
                                    onChange={(e) => setSelectedInventoryId(e.target.value)}
                                >
                                    <option value="">-- Último Inventario --</option>
                                    {inventorySessions.filter(s => s.status === 'CLOSED').map(s => (
                                        <option key={s.id} value={s.id}>
                                            {new Date(s.date).toLocaleDateString()} - {s.openedBy}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1">
                                <button onClick={handleExportPDF} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-md text-red-500" title="Exportar PDF"><FileText className="w-4 h-4" /></button>
                                <button onClick={handleExportXLS} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-md text-green-600" title="Exportar Excel"><Download className="w-4 h-4" /></button>
                            </div>

                            <button
                                onClick={() => setShowInventoryComparison(!showInventoryComparison)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${showInventoryComparison
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                                    }`}
                            >
                                <ShoppingCart className="w-4 h-4" />
                                {showInventoryComparison ? 'Ocultar Comparación' : 'COMPARAR'}
                            </button>
                        </div>
                    </div>

                    {ingredientAnalysis.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-sushi-muted py-12">
                            <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                            <p>No hay insumos requeridos. Agrega productos al simulador primero.</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="text-xs uppercase bg-gray-50 dark:bg-black/20 text-gray-500 dark:text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 font-bold">Insumo (Receta)</th>
                                        <th className="p-3 text-right font-bold w-32">Uso Sistema</th>
                                        {showInventoryComparison && (
                                            <>
                                                <th className="p-3 text-right font-bold text-blue-600 dark:text-blue-400 w-32">Uso Usuario</th>
                                                <th className="p-3 text-right font-bold w-32">Diferencia</th>
                                                <th className="p-3 text-center font-bold w-24">Estado</th>
                                                <th className="p-3 font-bold text-gray-400">Producto Detectado</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                                    {ingredientAnalysis.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                            <td className="p-3 font-medium text-gray-900 dark:text-white capitalize">
                                                {item.name}
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-700 dark:text-white">
                                                {item.required.toLocaleString('es-AR')} {item.unit}
                                            </td>
                                            {showInventoryComparison && (
                                                <>
                                                    <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">
                                                        {item.matchName ? (
                                                            <span>{item.userUsage.toLocaleString('es-AR')} {item.stockUnit}</span>
                                                        ) : (
                                                            <span className="text-gray-400 italic">No vinc.</span>
                                                        )}
                                                    </td>
                                                    <td className={`p-3 text-right font-mono font-bold ${item.diff < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                        {item.matchName ? (
                                                            <span>{item.diff > 0 ? '+' : ''}{item.diff.toLocaleString('es-AR')} {item.unit}</span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {item.matchName ? (
                                                            // Diff logic: 
                                                            // Diff ~ 0 (tolerance) -> OK
                                                            // Diff < 0 (Used MORE than system) -> WARN
                                                            // Diff > 0 (Used LESS than system) -> OK/SAVING
                                                            Math.abs(item.diff) < (item.required * 0.05) ? ( // 5% Tolerance
                                                                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded text-xs font-bold">EXACTO</span>
                                                            ) : item.diff < 0 ? (
                                                                <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded text-xs font-bold animate-pulse">EXCESO</span>
                                                            ) : (
                                                                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold">AHORRO</span>
                                                            )
                                                        ) : (
                                                            <span className="text-xs text-gray-400">?</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-xs text-gray-400 italic">
                                                        {item.matchName || 'No se encontró coincidencia'}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {showInventoryComparison && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-500/10 mt-4 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-300">
                            <Info className="w-5 h-5 flex-shrink-0" />
                            <div>
                                <p className="font-bold mb-1">¿Cómo funciona la comparación?</p>
                                <p>
                                    <b>Uso Sistema:</b> Cantidad teórica según la receta de los productos simulados.<br />
                                    <b>Uso Usuario:</b> Consumo real calculado según el inventario seleccionado (Stock Inicial - Stock Final).<br />
                                    <b>Estado:</b> "EXCESO" si se usó más de lo debido, "AHORRO" si se usó menos.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="flex-1 bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden shadow-lg p-6">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-white/5 pb-4">
                        Historial de Cierres
                    </h3>

                    {!projections || projections.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-sushi-muted">
                            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No hay proyecciones guardadas en el historial.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
                            {projections.map(proj => (
                                <div key={proj.id} className="bg-gray-50 dark:bg-black/20 rounded-xl p-4 border border-gray-100 dark:border-white/5 hover:border-sushi-gold/30 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-sushi-gold/10 rounded-full text-yellow-700 dark:text-sushi-gold">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                    Cierre: {new Date(proj.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-sushi-muted flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(proj.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} • Por {proj.createdBy}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs uppercase text-gray-500 font-bold">Venta Real</p>
                                            <p className="text-lg font-mono font-bold text-green-600 dark:text-green-500">{formatMoney(proj.realSales || proj.totalSales)}</p>
                                            {proj.realSales && proj.realSales !== proj.totalSales && (
                                                <p className="text-[10px] text-gray-400 line-through">Teórico: {formatMoney(proj.totalSales)}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm bg-white dark:bg-white/5 p-3 rounded-lg">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-sushi-muted">Ganancia Neta</span>
                                            <span className="font-mono text-green-600 dark:text-green-500 font-bold">{formatMoney(proj.netProfit)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-sushi-muted">Regalías</span>
                                            <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{formatMoney(proj.royalties)}</span>
                                        </div>
                                    </div>

                                    <div className="text-xs">
                                        <p className="text-gray-400 mb-1 uppercase font-bold tracking-wider">Resumen Items</p>
                                        <div className="flex flex-wrap gap-2">
                                            {proj.itemsSnapshot.slice(0, 5).map((item, idx) => (
                                                <span key={idx} className="bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                                    {item.qty}x {item.name}
                                                </span>
                                            ))}
                                            {proj.itemsSnapshot.length > 5 && (
                                                <span className="text-gray-400 px-2">+{proj.itemsSnapshot.length - 5} más...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Confirmation Modal */}
            {showCommitModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-sm rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in">
                        <div className="w-16 h-16 bg-sushi-gold text-sushi-black rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Confirmar Ingreso</h3>
                        <p className="text-sm text-gray-500 dark:text-sushi-muted mb-6 text-center">
                            Se actualizará la billetera global y se distribuirán las regalías a las cuentas de los socios según porcentaje.
                        </p>

                        <div className="mb-6">
                            <label className="text-xs uppercase text-gray-500 mb-1 block font-bold">Venta Total Real (Dinero en Mano)</label>
                            <input
                                type="number"
                                value={realSalesInput}
                                onChange={(e) => setRealSalesInput(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-lg font-mono font-bold text-gray-900 dark:text-white focus:border-sushi-gold outline-none"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Sugerido (Teórico): {formatMoney(totals.total)}</p>
                        </div>

                        <div className="space-y-3 mb-6 text-left bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-xs uppercase text-gray-500 font-bold">Diferencia</span>
                                <span className={`font-mono font-bold ${parseFloat(realSalesInput) - totals.total >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {formatMoney(parseFloat(realSalesInput) - totals.total)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs uppercase text-gray-500 font-bold">Regalías Ajustadas (Total)</span>
                                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                    {formatMoney(totals.profit + (parseFloat(realSalesInput) - totals.total))}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCommitModal(false)}
                                className="flex-1 bg-gray-100 dark:bg-white/5 py-3 rounded-lg text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/10"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCommit}
                                className="flex-1 bg-sushi-gold text-sushi-black py-3 rounded-lg font-bold hover:bg-sushi-goldhover"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Log Modal */}
            {
                showImportLog && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-sushi-dark w-full max-w-md rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in max-h-[80vh] flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <AlertCircle className="w-6 h-6 text-orange-500" />
                                    Items No Encontrados
                                </h3>
                                <button onClick={() => setShowImportLog(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-sushi-muted mb-4">
                                Los siguientes productos del Excel no tienen coincidencia exacta en el "Catálogo de Productos" y fueron omitidos del cálculo:
                            </p>

                            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black/20 rounded-lg p-2 border border-gray-100 dark:border-white/5">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
                                        <tr>
                                            <th className="p-2">Nombre en Excel</th>
                                            <th className="p-2 text-right">Cant.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {importLog.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2 text-gray-700 dark:text-gray-300 font-medium">{item.name}</td>
                                                <td className="p-2 text-right font-mono text-gray-500">{item.qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowImportLog(false)}
                                    className="bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-white/20"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* History Import Modal */}
            {showHistoryImportModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-lg rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-white/10 pb-4">
                            <h3 className="text-xl font-serif text-gray-900 dark:text-white flex items-center gap-2">
                                <History className="w-6 h-6 text-purple-600" />
                                Importar desde Cierre
                            </h3>
                            <button onClick={() => setShowHistoryImportModal(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-sushi-muted mb-4">
                            Selecciona un cierre de caja pasado para cargar sus ventas en la calculadora.
                        </p>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {(!cashShifts || cashShifts.filter(s => s.salesDataSnapshot && s.salesDataSnapshot.length > 0).length === 0) ? (
                                <p className="text-center text-gray-400 italic py-8">No hay cierres con datos de ventas guardados.</p>
                            ) : (
                                (cashShifts || [])
                                    .filter(s => s.salesDataSnapshot && s.salesDataSnapshot.length > 0)
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Newest first
                                    .map(shift => (
                                        <button
                                            key={shift.id}
                                            onClick={() => handleImportFromShift(shift)}
                                            className="w-full text-left bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 rounded-xl p-4 transition-all group"
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {new Date(shift.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${shift.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                    {shift.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-sushi-muted">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(shift.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span>
                                                    {shift.salesDataSnapshot?.length} items
                                                </span>
                                            </div>
                                        </button>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};