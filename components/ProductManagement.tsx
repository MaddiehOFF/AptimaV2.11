import React, { useState } from 'react';
import { Product } from '../types';
import { Tag, Plus, Pencil, Trash2, Search, DollarSign, Box, Crown, TrendingUp, Upload, Loader2, FileSpreadsheet, FileText, FlaskConical, Settings2, X } from 'lucide-react';
import { parseProductsExcel } from '../utils/excelParser';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ProductManagementProps {
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

const DEFAULT_INGREDIENT_COLUMNS = [
    'Arroz_g',
    'Salmon_g',
    'Queso_g',
    'Palta_g',
    'Langostinos_g',
    'Pan rallado',
    'Kanikama',
    'Vegetales',
    'Algas Yaki X1 LÁMINA',
    'Azúcar Ledesma',
    'Soja',
    'Wasabi Premium',
    'Palmitos CUMANA',
    'Jengibre',
    'PAQUETE DE FIDEOS',
    'Arrolladitos',
    'Palillos',
    'Bandeja HandRoll',
    'Bandejas 30 1/4 COSTILLA',
    'Bandejas 5 P Bisagra',
    'Bandejas alum F75',
    'Bandejas de 15 1/2 Costilla',
    'Bolsas (Peya) N5 X1 U',
    'Papel Hamburguesa',
    'POTE DEGUSTACIÓN 0,55CC'
];

export const ProductManagement: React.FC<ProductManagementProps> = ({ products = [], setProducts }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showIngredientModal, setShowIngredientModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'costs' | 'ingredients'>('costs');

    // Dynamic Columns State
    const [ingredientColumns, setIngredientColumns] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('sushiblack_ingredient_columns');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                        // Filter out nulls, undefined, numbers, or empty strings
                        const clean = parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
                        // Deduplicate
                        return Array.from(new Set(clean));
                    }
                }
            } catch (e) {
                console.error("Error loading columns", e);
            }
        }
        return DEFAULT_INGREDIENT_COLUMNS;
    });

    // Aggressive Sanitization / Healing on Mount
    React.useEffect(() => {
        const saved = localStorage.getItem('sushiblack_ingredient_columns');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    // Check if dirty (nulls, empties, dupes)
                    const clean = Array.from(new Set(parsed.filter(item => typeof item === 'string' && item.trim().length > 0)));

                    // If clean differs from parsed (length or content), update storage and state
                    if (clean.length !== parsed.length || JSON.stringify(clean) !== JSON.stringify(parsed) || JSON.stringify(clean) !== JSON.stringify(ingredientColumns)) {
                        console.warn("ProductManagement: Cleaned corrupted ingredient columns.");
                        localStorage.setItem('sushiblack_ingredient_columns', JSON.stringify(clean));
                        setIngredientColumns(clean);
                    }
                }
            } catch (e) {
                // reset if error
                localStorage.setItem('sushiblack_ingredient_columns', JSON.stringify(DEFAULT_INGREDIENT_COLUMNS));
                setIngredientColumns(DEFAULT_INGREDIENT_COLUMNS);
            }
        }
    }, []);

    const [isManageColumnsMode, setIsManageColumnsMode] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');

    const handleAddColumn = () => {
        if (!newColumnName.trim()) return;
        if (ingredientColumns.includes(newColumnName.trim())) {
            alert('Ya existe esa columna.');
            return;
        }
        const updated = [...ingredientColumns, newColumnName.trim()];
        setIngredientColumns(updated);
        localStorage.setItem('sushiblack_ingredient_columns', JSON.stringify(updated));
        setNewColumnName('');
    };

    const handleRemoveColumn = (col: string) => {
        if (!confirm(`¿Eliminar columna "${col}"? Los datos asociados no se borrarán de los productos pero dejarán de verse.`)) return;
        const updated = ingredientColumns.filter(c => c !== col);
        setIngredientColumns(updated);
        localStorage.setItem('sushiblack_ingredient_columns', JSON.stringify(updated));
    };

    const initialForm = {
        name: '',
        laborCost: 0,
        materialCost: 0,
        royalties: 0,
        profit: 0
    };
    const [formData, setFormData] = useState(initialForm);
    const [ingredientForm, setIngredientForm] = useState<Record<string, number | string>>({});
    const [editingName, setEditingName] = useState(''); // New state for editing name in ingredients tab

    const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    const filteredProducts = (products || []).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // --- BULK ACTIONS ---
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProducts.map(p => p.id));
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`¿Estás seguro de eliminar ${selectedIds.length} productos? Esta acción no se puede deshacer.`)) return;

        setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
        setSelectedIds([]);
        alert('Productos eliminados correctamente.');
    };

    // --- IMPORT LOGIC ---
    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Determine if importing products or ingredients based on active tab
        if (activeTab === 'costs') {
            if (!confirm('¿Seguro que deseas importar estos productos? Se agregarán al catálogo existente.')) return;
            setIsImporting(true);
            try {
                const importedProducts = await parseProductsExcel(file);
                if (importedProducts.length === 0) {
                    alert('No se encontraron productos válidos.');
                    return;
                }
                setProducts(prev => [...prev, ...importedProducts]);
                alert(`¡Éxito! Se importaron ${importedProducts.length} productos.`);
            } catch (error) {
                console.error(error);
                alert('Error al importar productos.');
            } finally {
                setIsImporting(false);
                e.target.value = '';
            }
        } else {
            // Import Ingredients
            if (!confirm('¿Seguro que deseas importar los ingredientes? Esto actualizará los valores de los productos coincidentes por NOMBRE.')) return;
            setIsImporting(true);
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws); // Array of objects

                    let updatedCount = 0;

                    // Logic: Match Row 'Producto vendido' -> Product.name
                    // Update Product.ingredients with the rest of the columns
                    setProducts(prevProducts => {
                        const newProducts = [...prevProducts]; // shallow copy array

                        data.forEach((row: any) => {
                            // Try to find the product name column. User said "Producto vendido" or similar.
                            // We'll look for standard keys or loosely match.
                            const productName = row['Producto vendido'] || row['producto'] || row['Producto'];

                            if (productName) {
                                const prodIndex = newProducts.findIndex(p => p.name.toLowerCase().trim() === String(productName).toLowerCase().trim());

                                if (prodIndex !== -1) {
                                    // Found specific product. Update its ingredients.
                                    const ingredients: Record<string, number> = {};

                                    // Iterate known columns
                                    ingredientColumns.forEach(col => {
                                        if (row[col] !== undefined) {
                                            ingredients[col] = parseFloat(row[col]) || 0;
                                        }
                                    });

                                    newProducts[prodIndex] = {
                                        ...newProducts[prodIndex],
                                        ingredients: {
                                            ...(newProducts[prodIndex].ingredients || {}),
                                            ...ingredients
                                        }
                                    };
                                    updatedCount++;
                                }
                            }
                        });
                        return newProducts;
                    });
                    alert(`¡Éxito! Se actualizaron ingredientes para ${updatedCount} productos.`);

                } catch (err) {
                    console.error("Error parsing ingredients excel", err);
                    alert("Error al procesar el archivo de ingredientes.");
                } finally {
                    setIsImporting(false);
                    e.target.value = '';
                }
            };
            reader.readAsBinaryString(file);
        }
    };

    // --- EXPORT LOGIC ---
    const handleExportXLS = () => {
        if (activeTab === 'ingredients') {
            const data = filteredProducts.map(p => {
                const row: any = { 'Producto vendido': p.name };
                ingredientColumns.forEach(col => {
                    row[col] = p.ingredients?.[col] || 0;
                });
                return row;
            });
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Ingredientes");
            XLSX.writeFile(wb, "catalogo_ingredientes.xlsx");
        }
    };

    const handleExportPDF = () => {
        if (activeTab === 'ingredients') {
            if (filteredProducts.length === 0) {
                alert("No hay datos para exportar.");
                return;
            }

            const doc = new jsPDF('l', 'mm', 'a3'); // Landscape A3 for many columns
            const now = new Date();
            const dateStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

            // Branding Header
            doc.setFontSize(18);
            doc.text("Informe de Ingredientes por Producto", 14, 15);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generado el: ${dateStr} a las ${timeStr}`, 14, 22);
            doc.text("Sushiblack Manager System", 14, 27);

            const tableColumn = ["Producto", ...ingredientColumns.map(c => c.replace(/_/g, ' '))];
            const tableRows: any[] = [];

            filteredProducts.forEach(product => {
                const row = [
                    product.name,
                    ...ingredientColumns.map(col => {
                        const val = product.ingredients?.[col];
                        return val !== undefined && val !== null ? val.toString() : "0";
                    })
                ];
                tableRows.push(row);
            });

            (doc as any).autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 35,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1, valign: 'middle' },
                headStyles: { fillColor: [20, 20, 20], textColor: [255, 215, 0], fontStyle: 'bold' }, // Sushi Gold-like styling
                alternateRowStyles: { fillColor: [245, 245, 245] },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 40 } // Product name column slightly wider
                }
            });

            doc.save(`Informe_Ingredientes_${dateStr.replace(/\//g, '-')}.pdf`);
        }
    };

    // --- CRUD HANDLERS ---
    const handleEdit = (p: Product) => {
        setEditingId(p.id);
        setFormData({
            name: p.name,
            laborCost: p.laborCost,
            materialCost: p.materialCost,
            royalties: p.royalties,
            profit: p.profit
        });
        setShowModal(true);
    };

    const handleEditIngredients = (p: Product) => {
        setEditingId(p.id);
        const currentIngredients: Record<string, number> = {};
        ingredientColumns.forEach(col => {
            currentIngredients[col] = p.ingredients?.[col] || 0;
        });
        setIngredientForm(currentIngredients);
        setEditingName(p.name);
        setShowIngredientModal(true);
    };

    const handleAdd = () => {
        setEditingId(null);
        setFormData(initialForm);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('¿Seguro que deseas eliminar este producto del catálogo? Esta acción afectará tanto a la vista de Costos como a la de Ingredientes.')) {
            setProducts(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Duplicate Check
        const normalizedName = formData.name.toLowerCase().trim();
        const duplicate = products.find(p => p.name.toLowerCase().trim() === normalizedName && p.id !== editingId);
        if (duplicate) {
            alert(`Ya existe un producto con el nombre "${duplicate.name}".`);
            return;
        }

        if (editingId) {
            setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...formData } : p));
        } else {
            setProducts(prev => [...prev, { id: generateUUID(), ...formData }]);
        }
        setShowModal(false);
    };

    const handleIngredientSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            setProducts(prev => prev.map(p => {
                if (p.id === editingId) {
                    return {
                        ...p,
                        name: editingName || p.name, // Update name if changed
                        ingredients: {
                            ...(p.ingredients || {}),
                            ...Object.entries(ingredientForm).reduce((acc, [k, v]) => ({
                                ...acc,
                                // Parse to float, verify isNaN -> 0
                                [k]: (typeof v === 'string' ? parseFloat(v) : v) || 0
                            }), {})
                        }
                    };
                }
                return p;
            }));
            setShowIngredientModal(false);
        }
    };

    const handleIngredientChange = (col: string, value: string) => {
        // Store as string to allow decimals like "1." or empty
        setIngredientForm(prev => ({
            ...prev,
            [col]: value
        }));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* HEADERS & ACTIONS */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                        <Tag className="w-8 h-8 text-sushi-gold" />
                        Catálogo de Productos
                    </h2>
                    <p className="text-gray-500 dark:text-sushi-muted mt-2">Gestiona costos e ingredientes de tu carta.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto items-center">
                    {/* Search Bar */}
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar producto..."
                            className="w-full bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:border-sushi-gold outline-none text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Import Button */}
                    <label className={`cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        {isImporting ? 'Cargando...' : activeTab === 'costs' ? 'Importar Productos' : 'Importar Ingredientes'}
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleImportExcel}
                            disabled={isImporting}
                            className="hidden"
                        />
                    </label>

                    {/* Export Buttons (Only Ingredients Tab) */}
                    {activeTab === 'ingredients' && (
                        <>
                            <button onClick={handleExportXLS} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 shadow-lg" title="Exportar Excel">
                                <FileSpreadsheet className="w-5 h-5" />
                            </button>
                            <button onClick={handleExportPDF} className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 shadow-lg" title="Exportar PDF">
                                <FileText className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    {/* Manage Columns Button */}
                    {activeTab === 'ingredients' && (
                        <button
                            onClick={() => setIsManageColumnsMode(!isManageColumnsMode)}
                            className={`p-2 rounded-lg shadow-lg font-bold transition-colors ${isManageColumnsMode ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-white'}`}
                            title="Gestionar Columnas (Insumos)"
                        >
                            <Settings2 className="w-5 h-5" />
                        </button>
                    )}

                    {/* Bulk Delete Button */}
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg animate-fade-in"
                        >
                            <Trash2 className="w-5 h-5" /> Eliminar ({selectedIds.length})
                        </button>
                    )}

                    {/* New product */}
                    <button
                        onClick={handleAdd}
                        className="bg-sushi-gold text-sushi-black px-4 py-2 rounded-lg font-bold hover:bg-sushi-goldhover transition-colors flex items-center gap-2 shadow-lg shadow-sushi-gold/20"
                    >
                        <Plus className="w-5 h-5" /> Nuevo
                    </button>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-white/5 pb-1">
                <button
                    onClick={() => setActiveTab('costs')}
                    className={`pb-2 px-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'costs' ? 'border-sushi-gold text-sushi-gold' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'}`}
                >
                    <DollarSign className="w-4 h-4" /> Costos
                </button>
                <button
                    onClick={() => setActiveTab('ingredients')}
                    className={`pb-2 px-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'ingredients' ? 'border-sushi-gold text-sushi-gold' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'}`}
                >
                    <FlaskConical className="w-4 h-4" /> Ingredientes
                </button>
            </div>

            {/* MANAGE COLUMNS PANEL */}
            {isManageColumnsMode && activeTab === 'ingredients' && (
                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/20 p-4 rounded-xl animate-fade-in-down mb-4">
                    <h4 className="font-bold text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Gestionar Insumos (Columnas)</h4>
                    <div className="flex gap-2 mb-4">
                        <input
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            placeholder="Nombre Nuevo Insumo..."
                            className="flex-1 p-2 rounded border border-gray-300 dark:border-white/10 dark:bg-black/20 text-sm text-gray-900 dark:text-white"
                        />
                        <button onClick={handleAddColumn} className="bg-purple-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-purple-700">Agregar</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {ingredientColumns.map(col => (
                            <div key={col} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1 rounded-full flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                                {col}
                                <button onClick={() => handleRemoveColumn(col)} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* TABLE CONTENT */}
            <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden shadow-lg max-h-[70vh] flex flex-col">
                <div className="overflow-auto flex-1 relative">

                    {/* COSTS TABLE */}
                    {activeTab === 'costs' && (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-gray-100 dark:bg-sushi-dark border-b-2 border-gray-200 dark:border-white/10 text-[10px] uppercase tracking-wider text-gray-600 dark:text-sushi-muted shadow-sm">
                                    <th className="p-4 w-10 text-center bg-gray-100 dark:bg-sushi-dark">
                                        <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} className="rounded border-gray-300 dark:border-white/10" />
                                    </th>
                                    <th className="p-4 bg-gray-100 dark:bg-sushi-dark">Producto</th>
                                    <th className="p-4 text-right bg-gray-100 dark:bg-sushi-dark">Mano de Obra</th>
                                    <th className="p-4 text-right bg-gray-100 dark:bg-sushi-dark">Materia Prima</th>
                                    <th className="p-4 text-right bg-gray-100 dark:bg-sushi-dark">Ganancia</th>
                                    <th className="p-4 text-right bg-gray-100 dark:bg-sushi-dark">Regalías</th>
                                    <th className="p-4 text-right bg-gray-100 dark:bg-sushi-dark">Total (Ref)</th>
                                    <th className="p-4 text-center bg-gray-100 dark:bg-sushi-dark">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-400 dark:text-sushi-muted italic">
                                            No hay productos registrados.
                                        </td>
                                    </tr>
                                )}
                                {filteredProducts.map(p => {
                                    const total = p.laborCost + p.materialCost + p.royalties + p.profit;
                                    return (
                                        <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group ${selectedIds.includes(p.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                            <td className="p-4 text-center">
                                                <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => handleToggleSelect(p.id)} className="rounded border-gray-300 dark:border-white/10" />
                                            </td>
                                            <td className="p-4 font-bold text-gray-900 dark:text-white">{p.name}</td>
                                            <td className="p-4 text-right text-blue-600 dark:text-blue-400 font-mono">{formatMoney(p.laborCost)}</td>
                                            <td className="p-4 text-right text-gray-600 dark:text-gray-400 font-mono">{formatMoney(p.materialCost)}</td>
                                            <td className="p-4 text-right text-green-600 dark:text-green-500 font-mono font-bold">{formatMoney(p.royalties)}</td>
                                            <td className="p-4 text-right text-purple-600 dark:text-purple-400 font-mono">{formatMoney(p.profit)}</td>
                                            <td className="p-4 text-right text-gray-400 dark:text-gray-600 font-mono italic">{formatMoney(total)}</td>
                                            <td className="p-4 flex justify-center gap-2">
                                                <button onClick={() => handleEdit(p)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-sushi-gold transition-colors" title="Editar Costos">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar Producto">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {/* INGREDIENTS TABLE */}
                    {activeTab === 'ingredients' && (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-gray-100 dark:bg-sushi-dark border-b-2 border-gray-200 dark:border-white/10 text-[10px] uppercase tracking-wider text-gray-600 dark:text-sushi-muted shadow-sm">
                                    <th className="p-4 sticky left-0 bg-gray-100 dark:bg-sushi-dark z-30 min-w-[50px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center">
                                        <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} className="rounded border-gray-300 dark:border-white/10" />
                                    </th>
                                    <th className="p-4 sticky left-[50px] bg-gray-100 dark:bg-sushi-dark z-30 min-w-[150px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Producto</th>
                                    <th className="p-2 text-center border-l border-gray-200 dark:border-white/5 sticky left-[200px] bg-gray-100 dark:bg-sushi-dark z-30 min-w-[100px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Acciones</th>
                                    {ingredientColumns.map(col => (
                                        <th key={col} className="p-2 text-center border-l border-gray-200 dark:border-white/5 whitespace-nowrap min-w-[80px] bg-gray-100 dark:bg-sushi-dark">
                                            {col.replace(/_/g, ' ')}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={ingredientColumns.length + 2} className="p-8 text-center text-gray-400 dark:text-sushi-muted italic">
                                            No hay productos disponibles.
                                        </td>
                                    </tr>
                                )}
                                {filteredProducts.map(p => (
                                    <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors ${selectedIds.includes(p.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                        <td className="p-3 text-center sticky left-0 bg-white dark:bg-sushi-dark border-r border-gray-100 dark:border-white/5 z-10">
                                            <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => handleToggleSelect(p.id)} className="rounded border-gray-300 dark:border-white/10" />
                                        </td>
                                        <td className="p-3 font-bold text-gray-900 dark:text-white sticky left-[50px] bg-white dark:bg-sushi-dark border-r border-gray-100 dark:border-white/5 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                            {p.name}
                                        </td>
                                        <td className="p-2 flex justify-center gap-2 sticky left-[200px] bg-white dark:bg-sushi-dark border-r border-gray-100 dark:border-white/5 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                            <button onClick={() => handleEditIngredients(p)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-sushi-gold transition-colors" title="Editar Ingredientes">
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar Producto">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </td>
                                        {ingredientColumns.map(col => (
                                            <td key={col} className="p-2 text-center text-gray-600 dark:text-gray-400 border-l border-gray-100 dark:border-white/5">
                                                {p.ingredients?.[col] !== undefined ? p.ingredients[col] : '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* PRODUCT EDIT MODAL (Basic Info) */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-lg rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in">
                        <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
                            {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs uppercase text-gray-500 dark:text-sushi-muted mb-1 block">Nombre Producto</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                    placeholder="Ej. Combinado Zen"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-blue-600 dark:text-blue-400 mb-1 block font-bold flex items-center gap-1"><DollarSign className="w-3 h-3" /> Mano Obra</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.laborCost}
                                        onChange={e => setFormData({ ...formData, laborCost: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1 block font-bold flex items-center gap-1"><Box className="w-3 h-3" /> Materia Prima</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.materialCost}
                                        onChange={e => setFormData({ ...formData, materialCost: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-gray-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-green-600 dark:text-green-500 mb-1 block font-bold flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Ganancia</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.royalties}
                                        onChange={e => setFormData({ ...formData, royalties: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-purple-600 dark:text-purple-400 mb-1 block font-bold flex items-center gap-1"><Crown className="w-3 h-3" /> Regalías</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.profit}
                                        onChange={e => setFormData({ ...formData, profit: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 dark:bg-white/5 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 font-bold">Cancelar</button>
                                <button type="submit" className="flex-1 bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* INGREDIENT EDIT MODAL */}
            {showIngredientModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-4xl rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
                            <h3 className="text-xl font-serif text-gray-900 dark:text-white">
                                Editar Ingredientes
                            </h3>
                            <button onClick={() => setShowIngredientModal(false)} className="text-gray-400 hover:text-white">
                                <span className="bg-gray-200 dark:bg-white/10 hover:bg-red-500 hover:text-white rounded-full p-2 block transition-colors">✕</span>
                            </button>
                        </div>

                        <form onSubmit={handleIngredientSubmit} className="flex-1 overflow-hidden flex flex-col">
                            {/* Product Name Editing */}
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5">
                                <label className="text-xs uppercase text-sushi-gold font-bold mb-2 block">Nombre del Producto</label>
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={e => setEditingName(e.target.value)}
                                    className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-lg font-bold text-gray-900 dark:text-white outline-none focus:border-sushi-gold focus:ring-1 focus:ring-sushi-gold"
                                    placeholder="Nombre del producto..."
                                />
                                <p className="text-[10px] text-gray-400 mt-2">
                                    Nota: Si cambias el nombre aquí, se actualizará en todo el sistema (Costos, Inventario, Calculadora).
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
                                    {ingredientColumns.map(col => (
                                        <div key={col}>
                                            <label className="text-[10px] uppercase text-gray-500 dark:text-gray-400 mb-1 block truncate" title={col.replace(/_/g, ' ')}>
                                                {col.replace(/_/g, ' ')}
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                name={col}
                                                id={`ing-${col.replace(/\s+/g, '-')}`}
                                                autoComplete="off"
                                                value={ingredientForm[col] || ''}
                                                onChange={e => handleIngredientChange(col, e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                                placeholder="0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6 mt-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-sushi-dark sticky bottom-0">
                                <button type="button" onClick={() => setShowIngredientModal(false)} className="flex-1 bg-gray-100 dark:bg-white/5 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 font-bold">Cancelar</button>
                                <button type="submit" className="flex-1 bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover shadow-lg shadow-sushi-gold/20">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
