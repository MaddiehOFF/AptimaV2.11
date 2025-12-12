import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { parseSalesExcel } from '../utils/excelParser';

import { CashCategory, CashShift, CashTransaction, WalletTransaction } from '../types';
import { Wallet, ArrowRight, Save, Clock, History, DollarSign, TrendingDown, Plus, Check, Play, Lock, CreditCard, TrendingUp, Banknote, Tag, ShoppingBag, Trash2, FileText, Table as TableIcon, FileDigit, X } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { playSound } from '../utils/soundUtils';
import { SecurityConfirmationModal } from './SecurityConfirmationModal';
import { ConfirmationModal } from './common/ConfirmationModal';

interface CashRegisterProps {
    shifts: CashShift[];
    setShifts: React.Dispatch<React.SetStateAction<CashShift[]>>;
    userName: string;
    // Wallet Sync
    transactions?: WalletTransaction[];
    setTransactions?: React.Dispatch<React.SetStateAction<WalletTransaction[]>>;
}

export const CashRegister: React.FC<CashRegisterProps> = ({ shifts, setShifts, userName, transactions, setTransactions }) => {
    const [activeTab, setActiveTab] = useState<'SHIFT' | 'HISTORY'>('SHIFT');
    const [currentShift, setCurrentShift] = useState<CashShift | null>(null);

    // Time Selection Modal State
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'OPEN' | 'CLOSE' | 'TRANSACTION' | null>(null);
    const [manualTime, setManualTime] = useState('');

    // Details Modal State
    const [selectedTransaction, setSelectedTransaction] = useState<CashTransaction | null>(null);

    // Security Modal State
    const [securityModalOpen, setSecurityModalOpen] = useState(false);
    const [securityAction, setSecurityAction] = useState<{ type: 'OPEN' | 'CLOSE', time: string } | null>(null);

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info'; confirmText?: string }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // Transaction Form States
    const [transType, setTransType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
    const [transMethod, setTransMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
    const [transCategory, setTransCategory] = useState<CashCategory>('GASTOS_VARIOS');
    const [transAmount, setTransAmount] = useState<string>('');
    const [transDesc, setTransDesc] = useState('');
    const [useGlobalWallet, setUseGlobalWallet] = useState(false); // Checkbox state

    // Shift States
    const [initialCash, setInitialCash] = useState<string>('');
    const [finalCash, setFinalCash] = useState<string>('');
    const [finalTransfer, setFinalTransfer] = useState<string>('');

    // Order Counts
    const [ordersFudo, setOrdersFudo] = useState<string>('');
    const [ordersPedidosYa, setOrdersPedidosYa] = useState<string>('');

    useEffect(() => {
        const open = shifts.find(s => s.status === 'OPEN');
        if (open) setCurrentShift(open);
        else setCurrentShift(null);
    }, [shifts]);

    const initiateAction = (action: 'OPEN' | 'CLOSE' | 'TRANSACTION') => {
        setPendingAction(action);
        setManualTime(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
        setShowTimeModal(true);
    };

    const confirmTime = (useCurrent: boolean) => {
        const time = useCurrent
            ? new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
            : manualTime;

        if (pendingAction === 'OPEN') confirmSecurityAction('OPEN', time);
        if (pendingAction === 'CLOSE') confirmSecurityAction('CLOSE', time);
        if (pendingAction === 'TRANSACTION') handleAddTransaction(time);

        setShowTimeModal(false);
        setPendingAction(null);
    };

    const confirmSecurityAction = (type: 'OPEN' | 'CLOSE', time: string) => {
        setSecurityAction({ type, time });
        setSecurityModalOpen(true);
    };

    const executeSecurityAction = () => {
        if (!securityAction) return;
        if (securityAction.type === 'OPEN') handleOpenShift(securityAction.time);
        if (securityAction.type === 'CLOSE') handleCloseShift(securityAction.time);
        setSecurityAction(null);
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !currentShift) return;

        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });

                // Try to find 'Pagos' sheet, otherwise use first
                const wsname = wb.SheetNames.find(n => n.toLowerCase().includes('pago')) || wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Use robust json parsing
                const data: any[] = XLSX.utils.sheet_to_json(ws);

                let newTransactions: CashTransaction[] = [];
                let importedCount = 0;

                data.forEach((row: any) => {
                    // Mapping based on User Screenshot:
                    // "Medio de Pago", "Monto", "Cliente", "Cancelado"

                    // 1. Check Cancellation
                    const isCancelled = row['Cancelado'] && String(row['Cancelado']).toLowerCase() === 'si';
                    if (isCancelled) return;

                    // 2. Extract Amount
                    const amountRaw = row['Monto'];
                    const amount = parseFloat(amountRaw);

                    if (!amount || isNaN(amount) || amount <= 0) {
                        return;
                    }

                    // 3. Extract Method
                    const methodRaw = row['Medio de Pago'] ? String(row['Medio de Pago']).toLowerCase() : '';
                    let method: 'CASH' | 'TRANSFER' = 'CASH'; // Default
                    if (methodRaw.includes('transferencia') || methodRaw.includes('tranferencia')) {
                        method = 'TRANSFER';
                    } else if (methodRaw.includes('efectivo')) {
                        method = 'CASH';
                    }

                    // 4. Extract Description / Client
                    const client = row['Cliente'] || '';
                    const description = client ? `Venta: ${client}` : 'Venta Importada';

                    newTransactions.push({
                        id: generateUUID(),
                        type: 'INCOME',
                        method: method,
                        category: 'VENTA',
                        amount: amount,
                        description: description,
                        time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                        createdBy: userName,
                        status: 'ACTIVE'
                    });
                    importedCount++;
                });

                // Try to parse Sales Data (Products/Qty) for Cost Calculator Snapshot
                let salesSnapshot = null;
                try {
                    // Re-process the file using the specialized parser
                    salesSnapshot = await parseSalesExcel(file);
                } catch (e) {
                    console.log("No sales data found for snapshot", e);
                }

                if (newTransactions.length > 0) {
                    const updatedShift = {
                        ...currentShift,
                        transactions: [...newTransactions, ...currentShift.transactions],
                        salesDataSnapshot: salesSnapshot || undefined // Persist snapshot if available
                    };
                    setShifts((prevShifts: CashShift[]) => prevShifts.map(s => s.id === currentShift.id ? updatedShift : s));
                    playSound('SUCCESS');
                    alert(`Se importaron ${importedCount} ventas exitosamente.${salesSnapshot ? ' También se guardó el detalle para Costos.' : ''}`);
                } else {
                    alert('No se encontraron ventas válidas o formato incorrecto. Verifique las columnas: "Monto", "Medio de Pago", "Cliente".');
                }
            } catch (error) {
                console.error("Error Import Excel", error);
                alert("Error al procesar el archivo. Asegúrese de que sea un Excel válido (.xlsx o .xls).");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleOpenShift = (time: string) => {
        // Validation: Prevent empty open amount
        const amount = parseFloat(initialCash) || 0;

        const shift: CashShift = {
            id: generateUUID(),
            date: new Date().toISOString(),
            status: 'OPEN',
            openedBy: userName,
            openTime: time,
            initialAmount: amount,
            transactions: []
        };
        setShifts([shift, ...shifts]);
        setInitialCash('');
    };

    const handleAddTransaction = (time: string) => {
        if (!currentShift) return;
        const amount = parseFloat(transAmount) || 0;
        if (amount <= 0) return;

        const transaction: CashTransaction = {
            id: generateUUID(),
            type: transType,
            method: transMethod,
            category: transCategory,
            amount: amount,
            description: transDesc,
            time: time,
            createdBy: userName,
            status: 'ACTIVE' // Default status
        };

        const updatedShift = {
            ...currentShift,
            transactions: [transaction, ...currentShift.transactions]
        };

        setShifts(shifts.map(s => s.id === currentShift.id ? updatedShift : s));

        // WALLET SYNC: If Adding Money (INCOME) and Source is Global Wallet
        if (transType === 'INCOME' && useGlobalWallet && setTransactions) {
            const walletTx: WalletTransaction = {
                id: generateUUID(),
                date: new Date().toISOString(),
                time: time,
                amount: amount,
                type: 'EXPENSE',
                category: 'Caja Chica',
                description: `Traspaso a Caja: ${transDesc || 'Ingreso Efectivo'}`,
                createdBy: userName,
                method: transMethod === 'CASH' ? 'EFECTIVO' : 'TRANSFERENCIA'
            };
            setTransactions(prev => [walletTx, ...prev]);
        }

        setTransAmount('');
        setTransDesc('');
        setTransCategory('GASTOS_VARIOS');
        setUseGlobalWallet(false);
    };

    const handleDeleteTransaction = (transId: string) => {
        if (!currentShift) return;

        const existingTrans = currentShift.transactions.find(t => t.id === transId);
        if (!existingTrans) return;

        // Prompt for Mandatory Reason
        const reason = prompt(`Por favor, indica el MOTIVO de la anulación para: "${existingTrans.description}"`);

        if (reason === null) return; // Cancelled
        if (!reason.trim()) {
            alert("⚠️ Debes ingresar un motivo para poder anular el movimiento.");
            return;
        }

        playSound('SUCCESS'); // Or a delete sound

        const updatedTransactions = currentShift.transactions.map(t =>
            t.id === transId ? {
                ...t,
                status: 'ANULADO' as const,
                description: `${t.description} (ANULADO: ${reason})` // Append Reason
            } : t
        );

        const updatedShift = { ...currentShift, transactions: updatedTransactions };
        setShifts(shifts.map(s => s.id === currentShift.id ? updatedShift : s));
    };

    const deleteShiftHistory = (shiftId: string) => {
        setConfirmModal({
            isOpen: true,
            title: '¿Anular Registro?',
            message: '¿Estás seguro de ANULAR este registro de caja histórico?',
            onConfirm: () => {
                playSound('SUCCESS');
                setShifts(shifts.map(s =>
                    s.id === shiftId ? { ...s, status: 'ANULADO' } : s
                ));
            }
        });
    };

    const handleExport = (type: 'PDF' | 'EXCEL', dataScope: 'CURRENT' | 'HISTORY') => {
        playSound('CLICK');
        const dateStr = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');

        if (dataScope === 'CURRENT') {
            if (!currentShift) return;
            const rows = currentShift.transactions.map(t => [
                t.time,
                t.category,
                t.description,
                t.type === 'INCOME' ? 'Ingreso' : 'Egreso',
                t.method,
                `$${t.amount}`,
                t.status === 'ANULADO' ? 'ANULADO' : 'Activo'
            ]);

            if (type === 'PDF') {
                exportToPDF(
                    `Caja Diaria - ${dateStr}`,
                    ['Hora', 'Cat', 'Detalle', 'Tipo', 'Metodo', 'Monto', 'Estado'],
                    rows,
                    `Caja_Diaria_${dateStr}`
                );
            } else {
                const excelData = currentShift.transactions.map(t => ({
                    Hora: t.time,
                    Categoria: t.category,
                    Descripcion: t.description,
                    Tipo: t.type,
                    Metodo: t.method,
                    Monto: t.amount,
                    Estado: t.status || 'ACTIVE'
                }));
                exportToExcel(excelData, `Caja_Diaria_${dateStr}`);
            }
        } else {
            // HISTORY EXPORT
            const historyShifts = shifts.filter(s => s.status === 'CLOSED').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const rows = historyShifts.map(s => [
                new Date(s.date).toLocaleDateString('es-AR'),
                s.openedBy,
                s.initialAmount,
                s.finalCash || 0,
                s.finalTransfer || 0,
                `Fudo: ${s.ordersFudo || 0} / PY: ${s.ordersPedidosYa || 0}`
            ]);

            if (type === 'PDF') {
                exportToPDF(
                    'Historial de Cierres de Caja',
                    ['Fecha', 'Apertura', 'Inicio', 'Efec. Final', 'Transf. Final', 'Pedidos'],
                    rows,
                    `Historial_Caja_${dateStr}`
                );
            } else {
                const excelData = historyShifts.map(s => ({
                    Fecha: new Date(s.date).toLocaleDateString('es-AR'),
                    Responsable: s.openedBy,
                    Fondo_Inicial: s.initialAmount,
                    Efectivo_Final: s.finalCash,
                    Transferencia_Final: s.finalTransfer,
                    Pedidos_Fudo: s.ordersFudo,
                    Pedidos_PY: s.ordersPedidosYa
                }));
                exportToExcel(excelData, `Historial_Caja_${dateStr}`);
            }
        }
    };

    const handleCloseShift = (time: string) => {
        if (!currentShift) return;

        // Validation to ensure safe number handling
        const fCash = parseFloat(finalCash) || 0;
        const fTrans = parseFloat(finalTransfer) || 0;
        const fudo = parseInt(ordersFudo) || 0;
        const py = parseInt(ordersPedidosYa) || 0;

        // AUTO SYNC TO WALLET
        if (setTransactions) {
            const totalRevenue = fCash + fTrans;
            if (totalRevenue > 0) {
                const walletTx: WalletTransaction = {
                    id: generateUUID(),
                    date: new Date().toISOString(),
                    time: time,
                    amount: totalRevenue,
                    type: 'INCOME',
                    category: 'Ventas',
                    description: `Cierre Caja ${new Date().toLocaleDateString()} (${currentShift.openedBy})`,
                    createdBy: userName,
                    method: 'EFECTIVO'
                };
                setTransactions(prev => [walletTx, ...prev]);
                // playSound('SUCCESS');
            }
        }

        const updatedShift: CashShift = {
            ...currentShift,
            status: 'CLOSED',
            closedBy: userName,
            closeTime: time,
            finalCash: fCash,
            finalTransfer: fTrans,
            ordersFudo: fudo,
            ordersPedidosYa: py
        };
        setShifts(shifts.map(s => s.id === currentShift.id ? updatedShift : s));
        setFinalCash('');
        setFinalTransfer('');
        setOrdersFudo('');
        setOrdersPedidosYa('');
        setActiveTab('HISTORY');
    };

    const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

    // Calculates PHYSICAL CASH available in drawer
    const calculateCashBalance = () => {
        if (!currentShift) return 0;
        const cashIncome = currentShift.transactions
            .filter(t => t.type === 'INCOME' && t.method === 'CASH' && t.status !== 'ANULADO')
            .reduce((acc, t) => acc + t.amount, 0);

        const cashExpense = currentShift.transactions
            .filter(t => t.type === 'EXPENSE' && t.method === 'CASH' && t.status !== 'ANULADO')
            .reduce((acc, t) => acc + t.amount, 0);

        return currentShift.initialAmount + cashIncome - cashExpense;
    };

    // Calculates Transfers
    const calculateTransferBalance = () => {
        if (!currentShift) return 0;
        const transIncome = currentShift.transactions
            .filter(t => t.type === 'INCOME' && t.method === 'TRANSFER' && t.status !== 'ANULADO')
            .reduce((acc, t) => acc + t.amount, 0);

        const transExpense = currentShift.transactions
            .filter(t => t.type === 'EXPENSE' && t.method === 'TRANSFER' && t.status !== 'ANULADO')
            .reduce((acc, t) => acc + t.amount, 0);

        return transIncome - transExpense;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-sushi-gold" />
                        Caja y Movimientos
                    </h2>
                    <p className="text-gray-500 dark:text-sushi-muted mt-2">Control de apertura, cierre y flujo de caja.</p>
                </div>
                <div className="flex gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('SHIFT')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${activeTab === 'SHIFT' ? 'bg-sushi-gold text-sushi-black' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        <DollarSign className="w-4 h-4" />
                        Caja Actual
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${activeTab === 'HISTORY' ? 'bg-sushi-gold text-sushi-black' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        <History className="w-4 h-4" />
                        Historial
                    </button>
                </div>
            </div>



            <SecurityConfirmationModal
                isOpen={securityModalOpen}
                onClose={() => setSecurityModalOpen(false)}
                onConfirm={executeSecurityAction}
                title={securityAction?.type === 'OPEN' ? '¿Confirmar Apertura de Caja?' : '¿Confirmar Cierre de Caja?'}
                description={securityAction?.type === 'OPEN'
                    ? `Se abrirá la caja con un fondo inicial de ${formatMoney(parseFloat(initialCash) || 0)}. Esta acción quedará registrada.`
                    : `Se cerrará la caja actual. Asegúrese de haber contado todo el dinero físico y validado transferencias. Total Final: ${formatMoney((parseFloat(finalCash) || 0) + (parseFloat(finalTransfer) || 0))}`
                }
                actionType={securityAction?.type === 'OPEN' ? 'info' : 'warning'}
                confirmText={securityAction?.type === 'OPEN' ? 'Abrir Caja' : 'Cerrar Turno'}
            />

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type || 'danger'}
                confirmText={confirmModal.confirmText || 'CONFIRMAR'}
            />

            {
                activeTab === 'SHIFT' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Status Card */}
                        <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm">
                            {currentShift ? (
                                <div className="h-full flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Caja Abierta</h3>
                                            <div className="flex gap-2">
                                                <label className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg cursor-pointer hover:bg-green-100 transition-colors text-xs font-bold border border-green-200 dark:border-green-800">
                                                    <FileDigit className="w-3 h-3" />
                                                    Importar Excel
                                                    <input type="file" onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                                                </label>
                                                <div className="px-3 py-1 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500 text-xs font-bold rounded-full border border-green-200 dark:border-green-500/20 flex items-center gap-1 animate-pulse">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div> ACTIVA
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                                                <span className="text-sm text-gray-500 dark:text-sushi-muted">Fondo Inicial (Efec.)</span>
                                                <span className="font-mono font-bold text-gray-900 dark:text-white">{formatMoney(currentShift.initialAmount)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-white/5">
                                                    <span className="text-xs uppercase text-gray-500 dark:text-sushi-muted block mb-1">Efectivo Cajón</span>
                                                    <span className="font-mono font-bold text-xl text-sushi-gold">
                                                        {formatMoney(calculateCashBalance())}
                                                    </span>
                                                </div>
                                                <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-white/5">
                                                    <span className="text-xs uppercase text-gray-500 dark:text-sushi-muted block mb-1">Digital / Transf.</span>
                                                    <span className="font-mono font-bold text-xl text-blue-500">
                                                        {formatMoney(calculateTransferBalance())}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
                                        <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-sushi-muted mb-4">Cierre de Caja</h4>

                                        <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-lg mb-4">
                                            <label className="text-[10px] uppercase text-gray-500 font-bold mb-2 block flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> Cantidad de Pedidos</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <input
                                                        type="number"
                                                        value={ordersFudo}
                                                        onChange={e => setOrdersFudo(e.target.value)}
                                                        className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white outline-none focus:border-sushi-gold text-center"
                                                        placeholder="Fudo"
                                                    />
                                                    <span className="text-[9px] text-gray-400 block text-center mt-1">Fudo</span>
                                                </div>
                                                <div>
                                                    <input
                                                        type="number"
                                                        value={ordersPedidosYa}
                                                        onChange={e => setOrdersPedidosYa(e.target.value)}
                                                        className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white outline-none focus:border-sushi-gold text-center"
                                                        placeholder="P. Ya"
                                                    />
                                                    <span className="text-[9px] text-gray-400 block text-center mt-1">PedidosYa</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="text-[10px] uppercase text-gray-500 mb-1 block">Efectivo Final (Físico)</label>
                                                <input
                                                    type="number"
                                                    value={finalCash}
                                                    onChange={e => setFinalCash(e.target.value)}
                                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                                    placeholder="$0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase text-gray-500 mb-1 block">Total Transferencias</label>
                                                <input
                                                    type="number"
                                                    value={finalTransfer}
                                                    onChange={e => setFinalTransfer(e.target.value)}
                                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                                    placeholder="$0.00"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => initiateAction('CLOSE')}
                                            disabled={!finalCash || !finalTransfer}
                                            className="w-full bg-gray-900 dark:bg-white/10 hover:bg-sushi-gold hover:text-sushi-black text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Lock className="w-4 h-4" /> Cerrar Caja
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                                        <Wallet className="w-10 h-10 text-gray-400 dark:text-sushi-muted" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Caja Cerrada</h3>
                                    <p className="text-gray-500 dark:text-sushi-muted mb-8 text-sm max-w-xs">
                                        Inicia el turno declarando el dinero en efectivo disponible en el cajón.
                                    </p>

                                    <div className="w-full max-w-xs">
                                        <label className="text-xs uppercase text-gray-500 dark:text-sushi-muted mb-2 block text-left">Fondo Inicial</label>
                                        <input
                                            type="number"
                                            value={initialCash}
                                            onChange={e => setInitialCash(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold mb-4 text-center font-mono text-lg"
                                            placeholder="$0.00"
                                        />
                                        <button
                                            onClick={() => initiateAction('OPEN')}
                                            disabled={!initialCash}
                                            className="w-full bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover transition-colors shadow-lg shadow-sushi-gold/20 flex items-center justify-center gap-2"
                                        >
                                            <Play className="w-4 h-4" /> Abrir Caja
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Transactions Column */}
                        <div className="flex flex-col gap-6">
                            <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Plus className="w-5 h-5 text-sushi-gold" /> Nuevo Movimiento
                                    </h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleExport('EXCEL', 'CURRENT')}
                                            className="p-2 text-xs bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-500 rounded hover:bg-green-200 dark:hover:bg-green-500/20"
                                            title="Exportar a Excel"
                                        >
                                            <TableIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleExport('PDF', 'CURRENT')}
                                            className="p-2 text-xs bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-500 rounded hover:bg-red-200 dark:hover:bg-red-500/20 group relative"
                                            title="Exportar Reporte PDF"
                                        >
                                            <FileText className="w-4 h-4" />
                                            <span className="absolute -top-8 right-0 w-max px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                Recomendado para informes
                                            </span>
                                        </button>
                                    </div>
                                </div>
                                {currentShift ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex rounded-lg bg-gray-100 dark:bg-black/20 p-1">
                                                <button
                                                    onClick={() => setTransType('INCOME')}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-colors ${transType === 'INCOME' ? 'bg-white dark:bg-sushi-dark shadow text-green-600' : 'text-gray-500'}`}
                                                >
                                                    <TrendingUp className="w-3 h-3" /> Ingreso
                                                </button>
                                                <button
                                                    onClick={() => setTransType('EXPENSE')}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-colors ${transType === 'EXPENSE' ? 'bg-white dark:bg-sushi-dark shadow text-red-500' : 'text-gray-500'}`}
                                                >
                                                    <TrendingDown className="w-3 h-3" /> Gasto
                                                </button>
                                            </div>
                                            <div className="flex rounded-lg bg-gray-100 dark:bg-black/20 p-1">
                                                <button
                                                    onClick={() => setTransMethod('CASH')}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-colors ${transMethod === 'CASH' ? 'bg-white dark:bg-sushi-dark shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}
                                                >
                                                    <Banknote className="w-3 h-3" /> Efectivo
                                                </button>
                                                <button
                                                    onClick={() => setTransMethod('TRANSFER')}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-colors ${transMethod === 'TRANSFER' ? 'bg-white dark:bg-sushi-dark shadow text-blue-500' : 'text-gray-500'}`}
                                                >
                                                    <CreditCard className="w-3 h-3" /> Transf.
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase text-gray-500 mb-1 block">Categoría</label>
                                            <select
                                                value={transCategory}
                                                onChange={(e) => setTransCategory(e.target.value as CashCategory)}
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm outline-none focus:border-sushi-gold appearance-none text-gray-900 dark:text-white"
                                            >
                                                <option value="VENTA">Venta</option>
                                                <option value="INSUMOS">Insumos (Mercadería)</option>
                                                <option value="PERSONAL">Personal (Sueldos/Adelantos)</option>
                                                <option value="GASTOS_VARIOS">Gastos Varios</option>
                                                <option value="RETIRO">Retiro de Caja</option>
                                                <option value="OTROS">Otros</option>
                                            </select>
                                        </div>

                                        {/* Enable "From Wallet" only for INCOME */}
                                        {transType === 'INCOME' && (
                                            <div className="flex items-center gap-2 px-1">
                                                <input
                                                    type="checkbox"
                                                    checked={useGlobalWallet}
                                                    onChange={e => setUseGlobalWallet(e.target.checked)}
                                                    className="w-4 h-4 accent-sushi-gold"
                                                    id="useWallet"
                                                />
                                                <label htmlFor="useWallet" className="text-[10px] text-gray-500 cursor-pointer select-none">
                                                    Traer de <span className="font-bold">Billetera Global</span>
                                                </label>
                                            </div>
                                        )}

                                        <div className="flex gap-3 items-end">
                                            <div className="flex-1">
                                                <label className="text-[10px] uppercase text-gray-500 mb-1 block">Descripción</label>
                                                <input
                                                    type="text"
                                                    value={transDesc}
                                                    onChange={e => setTransDesc(e.target.value)}
                                                    placeholder="Detalle..."
                                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm outline-none focus:border-sushi-gold text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="w-28">
                                                <label className="text-[10px] uppercase text-gray-500 mb-1 block">Monto</label>
                                                <input
                                                    type="number"
                                                    value={transAmount}
                                                    onChange={e => setTransAmount(e.target.value)}
                                                    placeholder="$"
                                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm outline-none focus:border-sushi-gold text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <button
                                                onClick={() => initiateAction('TRANSACTION')}
                                                disabled={!transAmount || !transDesc}
                                                className="bg-sushi-gold text-sushi-black p-2 rounded-lg hover:bg-sushi-goldhover disabled:opacity-50 shadow-sm"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 dark:text-sushi-muted italic">Debes abrir la caja para registrar movimientos.</p>
                                )}
                            </div>

                            <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Movimientos del Turno</h3>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                    {currentShift && currentShift.transactions.length > 0 ? (
                                        currentShift.transactions.map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTransaction(t)}
                                                className={`flex justify-between items-center p-3 rounded-lg border relative group cursor-pointer transition-colors ${t.status === 'ANULADO' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 opacity-75' : 'bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${t.method === 'CASH' ? 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-500'}`}>
                                                        {t.method === 'CASH' ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold uppercase bg-gray-200 dark:bg-white/10 px-1.5 rounded text-gray-600 dark:text-sushi-muted">{t.category}</span>
                                                            {t.status === 'ANULADO' && <span className="text-[10px] font-bold uppercase bg-red-100 dark:bg-red-900/50 px-1.5 rounded text-red-600">ANULADO</span>}
                                                            <p className={`text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px] ${t.status === 'ANULADO' ? 'line-through text-gray-500' : ''}`}>{t.description}</p>
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 dark:text-sushi-muted">{t.time} • {t.createdBy}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <span className={`font-mono font-bold ${t.type === 'INCOME' ? 'text-green-500' : 'text-red-500'} ${t.status === 'ANULADO' ? 'line-through opacity-50' : ''}`}>
                                                        {t.type === 'INCOME' ? '+' : '-'}{formatMoney(t.amount)}
                                                    </span>
                                                    {t.status !== 'ANULADO' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t.id); }}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded-full"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-400 dark:text-sushi-muted italic text-center py-8">Sin movimientos registrados.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'HISTORY' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                            <h3 className="font-bold text-gray-900 dark:text-white">Historial de Cierres</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleExport('EXCEL', 'HISTORY')}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-500 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/20"
                                >
                                    <TableIcon className="w-3.5 h-3.5" /> Excel
                                </button>
                                <button
                                    onClick={() => handleExport('PDF', 'HISTORY')}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-500 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 group relative"
                                >
                                    <FileText className="w-3.5 h-3.5" /> PDF
                                    <span className="absolute -top-10 right-0 w-32 p-2 bg-gray-900 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity text-center z-10 pointer-events-none">
                                        Recomendado para informes oficiales
                                    </span>
                                </button>
                            </div>
                        </div>

                        {shifts.filter(s => s.status === 'CLOSED' || s.status === 'ANULADO').length === 0 ? (
                            <div className="p-12 text-center border border-dashed border-gray-300 dark:border-white/10 rounded-xl">
                                <p className="text-gray-500 dark:text-sushi-muted">No hay historial de cierres de caja.</p>
                            </div>
                        ) : (
                            shifts.filter(s => s.status === 'CLOSED' || s.status === 'ANULADO').map(shift => {
                                // Calculate expected cash
                                const cashIncome = shift.transactions.filter(t => t.type === 'INCOME' && t.method === 'CASH' && t.status !== 'ANULADO').reduce((a, b) => a + b.amount, 0);
                                const cashExpense = shift.transactions.filter(t => t.type === 'EXPENSE' && t.method === 'CASH' && t.status !== 'ANULADO').reduce((a, b) => a + b.amount, 0);

                                const expectedCash = shift.initialAmount + cashIncome - cashExpense;
                                const diff = (shift.finalCash || 0) - expectedCash;
                                const isBalanced = Math.abs(diff) < 10; // Tolerance

                                return (
                                    <div key={shift.id} className={`bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm group relative ${shift.status === 'ANULADO' ? 'opacity-60 grayscale' : ''}`}>
                                        {shift.status === 'ANULADO' && (
                                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                                <span className="text-4xl font-black text-red-500/20 rotate-[-15deg] border-4 border-red-500/20 px-4 py-2 rounded-lg">ANULADO</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-white/5 pb-4">
                                            <div>
                                                <h4 className={`font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2 ${shift.status === 'ANULADO' ? 'line-through decoration-red-500' : ''}`}>
                                                    {new Date(shift.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </h4>
                                                <div className="flex gap-4 text-xs text-gray-500 dark:text-sushi-muted mt-1">
                                                    <span>Abierto: {shift.openTime} ({shift.openedBy})</span>
                                                    <span>Cerrado: {shift.closeTime} ({shift.closedBy})</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isBalanced ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500 border-green-200' : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 border-red-200'}`}>
                                                    {isBalanced ? 'BALANCEADO' : `DESCUADRE: ${formatMoney(diff)}`}
                                                </div>
                                                {shift.status !== 'ANULADO' && (
                                                    <button
                                                        onClick={() => deleteShiftHistory(shift.id)}
                                                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Anular Cierre de Caja"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                            <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">Inicio</p>
                                                <p className="font-mono font-bold text-gray-900 dark:text-white">{formatMoney(shift.initialAmount)}</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">Movimientos Efec.</p>
                                                <p className={`font-mono font-bold ${(cashIncome - cashExpense) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {(cashIncome - cashExpense) >= 0 ? '+' : ''}{formatMoney(cashIncome - cashExpense)}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">Efectivo Final</p>
                                                <p className="font-mono font-bold text-gray-900 dark:text-white">{formatMoney(shift.finalCash || 0)}</p>
                                            </div>
                                            <div className="p-3 bg-blue-50 dark:bg-blue-500/5 rounded-lg">
                                                <p className="text-xs text-blue-500 uppercase">Total Transf.</p>
                                                <p className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatMoney(shift.finalTransfer || 0)}</p>
                                            </div>
                                            <div className="p-3 bg-purple-50 dark:bg-purple-500/5 rounded-lg">
                                                <p className="text-xs text-purple-500 uppercase">Pedidos</p>
                                                <p className="font-mono font-bold text-purple-600 dark:text-purple-400 text-[10px]">
                                                    Fudo: {shift.ordersFudo || 0} | PY: {shift.ordersPedidosYa || 0}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )
            }

            {/* Time Selection Modal */}
            {
                showTimeModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-sushi-dark w-full max-w-xs rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in text-center">
                            <div className="w-12 h-12 bg-sushi-gold text-sushi-black rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Registro de Horario</h3>
                            <p className="text-xs text-gray-500 dark:text-sushi-muted mb-4">
                                {pendingAction === 'OPEN' && 'Hora de apertura de caja'}
                                {pendingAction === 'CLOSE' && 'Hora de cierre de caja'}
                                {pendingAction === 'TRANSACTION' && 'Hora del movimiento'}
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => confirmTime(true)}
                                    className="w-full py-3 bg-sushi-gold text-sushi-black font-bold rounded-lg hover:bg-sushi-goldhover transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Ahora Mismo
                                </button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-white/10"></div></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-sushi-dark px-2 text-gray-400">O manual</span></div>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="time"
                                        value={manualTime}
                                        onChange={(e) => setManualTime(e.target.value)}
                                        className="flex-1 bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-center text-gray-900 dark:text-white focus:border-sushi-gold outline-none [color-scheme:light] dark:[color-scheme:dark]"
                                    />
                                    <button
                                        onClick={() => confirmTime(false)}
                                        className="bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white px-4 rounded-lg font-bold"
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setShowTimeModal(false)} className="mt-4 text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white underline">Cancelar</button>
                        </div>
                    </div>
                )
            }
            {/* Transaction Details Modal */}
            {
                selectedTransaction && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTransaction(null)}>
                        <div className="bg-white dark:bg-sushi-dark w-full max-w-md rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in relative text-left" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className={`p-3 rounded-full ${selectedTransaction.type === 'INCOME' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-red-100 dark:bg-red-900/20 text-red-500'}`}>
                                    {selectedTransaction.type === 'INCOME' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-gray-500 dark:text-sushi-muted font-bold">{selectedTransaction.category}</p>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{selectedTransaction.description}</h3>
                                </div>
                            </div>

                            <div className="space-y-4 bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-white/5">
                                    <span className="text-sm text-gray-500">Monto</span>
                                    <span className={`font-mono font-bold text-xl ${selectedTransaction.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                                        {selectedTransaction.type === 'INCOME' ? '+' : '-'}{formatMoney(selectedTransaction.amount)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Método</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        {selectedTransaction.method === 'CASH' ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                                        {selectedTransaction.method === 'CASH' ? 'Efectivo' : 'Transferencia'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Hora</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedTransaction.time}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Usuario</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedTransaction.createdBy}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm text-gray-500">Estado</span>
                                    {selectedTransaction.status === 'ANULADO' ? (
                                        <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded text-xs font-bold">ANULADO</span>
                                    ) : (
                                        <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-xs font-bold">ACTIVO</span>
                                    )}
                                </div>
                                <div className="pt-2">
                                    <p className="text-[10px] text-gray-400 font-mono text-center">ID: {selectedTransaction.id}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                {selectedTransaction.status !== 'ANULADO' && (
                                    <button
                                        onClick={() => { handleDeleteTransaction(selectedTransaction.id); setSelectedTransaction(null); }}
                                        className="w-full bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-red-200 dark:border-red-900/30"
                                    >
                                        <Trash2 className="w-4 h-4" /> Anular Movimiento
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedTransaction(null)}
                                    className="w-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white py-3 rounded-lg font-bold transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
