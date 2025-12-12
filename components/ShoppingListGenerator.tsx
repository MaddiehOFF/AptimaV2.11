
import React, { useState, useMemo } from 'react';
import { ShoppingList, ShoppingListItem, Supplier, SupplierProduct } from '../types';
import { Plus, Trash2, Printer, Check, Search, AlertCircle, ShoppingCart } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConfirmationModal } from './common/ConfirmationModal';

interface ShoppingListGeneratorProps {
    lists: ShoppingList[];
    setLists: React.Dispatch<React.SetStateAction<ShoppingList[]>>;
    suppliers: Supplier[];
    products: SupplierProduct[];
    userName: string;
}

export const ShoppingListGenerator: React.FC<ShoppingListGeneratorProps> = ({ lists, setLists, suppliers, products, userName }) => {
    const [view, setView] = useState<'LIST' | 'CREATE' | 'DETAILS'>('LIST');
    const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    // Create State
    const [newListTitle, setNewListTitle] = useState('');
    const [newItems, setNewItems] = useState<ShoppingListItem[]>([]);

    // Item Addition State
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [customProductName, setCustomProductName] = useState('');
    const [quantity, setQuantity] = useState(1);

    const activeProducts = useMemo(() => {
        if (!selectedSupplierId) return [];
        return products.filter(p => p.supplierId === selectedSupplierId);
    }, [selectedSupplierId, products]);

    // UTILS
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const handleAddItem = () => {
        if ((!selectedProductId && !customProductName)) return;

        let newItem: ShoppingListItem;

        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            const supplier = suppliers.find(s => s.id === selectedSupplierId);
            if (!product) return;

            newItem = {
                productId: product.id,
                productName: product.name + (product.brand ? ` (${product.brand})` : ''),
                quantity: quantity,
                unit: product.unit,
                supplierId: product.supplierId,
                supplierName: supplier?.name,
                estimatedCost: product.price * quantity,
                checked: false
            };
        } else {
            // Custom Item
            newItem = {
                productId: generateUUID(),
                productName: customProductName,
                quantity: quantity,
                unit: 'un',
                checked: false,
                estimatedCost: 0
            };
        }

        setNewItems([...newItems, newItem]);
        setCustomProductName('');
        setSelectedProductId('');
        setQuantity(1);
    };

    const handleRemoveItem = (index: number) => {
        const updated = [...newItems];
        updated.splice(index, 1);
        setNewItems(updated);
    };

    const handleSaveList = () => {
        console.log("Intentando guardar lista...");
        if (!newListTitle || newItems.length === 0) {
            alert("La lista debe tener un título y al menos un producto.");
            return;
        }

        try {
            const total = newItems.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);

            const list: ShoppingList = {
                id: generateUUID(),
                title: newListTitle,
                createdAt: new Date().toISOString(),
                status: 'PENDING',
                items: newItems,
                totalEstimated: total
            };

            console.log("Guardando lista:", list);
            setLists([list, ...lists]);
            setNewListTitle('');
            setNewItems([]);
            setView('LIST');
        } catch (error) {
            console.error("Error al guardar lista:", error);
            alert("Error al guardar lista: " + error);
        }
    };



    const generatePDF = (list: ShoppingList) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(220, 168, 26); // Sushi Goldish
        doc.text("Sushi Black - Lista de Compras", 14, 20);

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Lista: ${list.title}`, 14, 30);
        doc.text(`Fecha: ${new Date(list.createdAt).toLocaleDateString()}`, 14, 36);
        doc.text(`Estado: ${list.status}`, 14, 42);

        // Group items by Supplier
        const grouped: Record<string, ShoppingListItem[]> = {};
        list.items.forEach(item => {
            const supplier = item.supplierName || 'Varios / Sin Asignar';
            if (!grouped[supplier]) grouped[supplier] = [];
            grouped[supplier].push(item);
        });

        let yPos = 55;

        Object.keys(grouped).forEach(supplierName => {
            // Check page break
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'bold');
            doc.text(supplierName, 14, yPos);
            yPos += 5;

            const tableData = grouped[supplierName].map(item => [
                item.quantity + ' ' + item.unit,
                item.productName,
                item.estimatedCost ? `$${item.estimatedCost}` : '-'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Cant', 'Producto', 'Est. Costo']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [40, 40, 40] },
                margin: { left: 14 },
                didDrawPage: (data) => {
                    // Update yPos for next loop if needed, though autoTable handles it mostly
                }
            });

            // access finalY from autoTable state
            const finalY = (doc as any).lastAutoTable.finalY || yPos;
            yPos = finalY + 15;
        });

        // Totals
        if (yPos > 260) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Estimado: $${list.totalEstimated}`, 14, yPos);

        doc.save(`Lista_${list.title.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDeleteList = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: '¿Borrar lista?',
            message: '¿Estás seguro de que deseas eliminar esta lista de compras?',
            onConfirm: () => {
                setLists(lists.filter(l => l.id !== id));
            }
        });
    }

    return (
        <div className="bg-white dark:bg-sushi-dark rounded-xl border border-gray-200 dark:border-white/5 shadow-sm min-h-[600px] flex flex-col">
            {view === 'LIST' && (
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ShoppingCart className="w-6 h-6 text-sushi-gold" />
                            Listas de Compras
                        </h3>
                        <button
                            onClick={() => setView('CREATE')}
                            className="bg-sushi-gold text-sushi-black px-4 py-2 rounded-lg font-bold hover:bg-sushi-goldhover"
                        >
                            <Plus className="w-5 h-5 inline mr-1" /> Nueva Lista
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lists.map(list => (
                            <div
                                key={list.id}
                                onClick={() => { setSelectedList(list); setView('DETAILS'); }}
                                className="border border-gray-200 dark:border-white/10 rounded-lg p-4 hover:border-sushi-gold cursor-pointer transition-colors group relative bg-gray-50 dark:bg-black/20"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-lg dark:text-white">{list.title}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${list.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {list.status}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-4">{new Date(list.createdAt).toLocaleDateString()} • {list.items.length} items</p>
                                <div className="flex justify-between items-center">
                                    <span className="font-mono font-bold dark:text-sushi-gold">${list.totalEstimated}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); generatePDF(list); }}
                                            className="p-1.5 bg-white dark:bg-white/10 rounded-md text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white shadow-sm"
                                            title="Exportar PDF"
                                        >
                                            <Printer className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteList(list.id, e)}
                                            className="p-1.5 bg-red-50 dark:bg-red-900/10 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'CREATE' && (
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => setView('LIST')} className="text-gray-400 hover:text-white">Atrás</button>
                        <h3 className="text-xl font-bold dark:text-white">Nueva Lista de Compras</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                        {/* INPUTS */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Título de la Lista</label>
                                <input
                                    type="text"
                                    value={newListTitle}
                                    onChange={e => setNewListTitle(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-sushi-gold dark:text-white"
                                    placeholder="Ej. Compras Semanales - Lunes"
                                />
                            </div>

                            <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-lg border border-gray-200 dark:border-white/10 space-y-4">
                                <h4 className="font-bold text-sm dark:text-white">Agregar Items</h4>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Proveedor (Opcional)</label>
                                    <select
                                        value={selectedSupplierId}
                                        onChange={e => { setSelectedSupplierId(e.target.value); setSelectedProductId(''); }}
                                        className="w-full p-2 rounded border dark:bg-black/40 dark:border-white/10 dark:text-white"
                                    >
                                        <option value="">Seleccionar Proveedor...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                {selectedSupplierId ? (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Producto</label>
                                        <select
                                            value={selectedProductId}
                                            onChange={e => setSelectedProductId(e.target.value)}
                                            className="w-full p-2 rounded border dark:bg-black/40 dark:border-white/10 dark:text-white"
                                        >
                                            <option value="">Seleccionar Producto...</option>
                                            {activeProducts.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price})</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Producto Personalizado</label>
                                        <input
                                            type="text"
                                            value={customProductName}
                                            onChange={e => setCustomProductName(e.target.value)}
                                            className="w-full p-2 rounded border dark:bg-black/40 dark:border-white/10 dark:text-white"
                                            placeholder="Nombre del producto..."
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Cantidad</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={e => setQuantity(Number(e.target.value))}
                                            className="w-24 p-2 rounded border dark:bg-black/40 dark:border-white/10 dark:text-white"
                                            min="1"
                                        />
                                        <button
                                            onClick={handleAddItem}
                                            disabled={!selectedProductId && !customProductName}
                                            className="flex-1 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            Agregar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PREVIEW */}
                        <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/10 rounded-xl p-6 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold dark:text-white">Vista Previa</h4>
                                <span className="text-xs text-gray-500">{newItems.length} items</span>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                                {newItems.length === 0 && <p className="text-center text-gray-400 italic mt-10">Lista vacía</p>}
                                {newItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-white/5 rounded border border-gray-100 dark:border-white/5">
                                        <div>
                                            <p className="font-bold text-sm dark:text-white">{item.productName}</p>
                                            <p className="text-xs text-gray-500">{item.quantity} {item.unit} • {item.supplierName || 'Manual'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs dark:text-gray-300">
                                                {item.estimatedCost ? `$${item.estimatedCost}` : '-'}
                                            </span>
                                            <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                                <div className="flex justify-between items-center mb-4 text-xl">
                                    <span className="font-bold dark:text-white">Total Estimado:</span>
                                    <span className="font-mono font-bold text-sushi-gold">
                                        ${newItems.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0)}
                                    </span>
                                </div>
                                <button
                                    onClick={handleSaveList}
                                    disabled={newItems.length === 0 || !newListTitle}
                                    className="w-full bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover disabled:opacity-50"
                                >
                                    Guardar Lista
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'DETAILS' && selectedList && (
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setView('LIST')} className="text-gray-400 hover:text-white">Atrás</button>
                            <h3 className="text-2xl font-bold dark:text-white">{selectedList.title}</h3>
                        </div>
                        <button
                            onClick={() => generatePDF(selectedList)}
                            className="bg-white dark:bg-white/10 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-100 dark:hover:bg-white/20 flex items-center gap-2"
                        >
                            <Printer className="w-5 h-5" /> Exportar PDF
                        </button>
                    </div>

                    <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-6">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-500 text-xs uppercase border-b border-gray-200 dark:border-white/10">
                                    <th className="pb-3 pl-2">Producto</th>
                                    <th className="pb-3">Cantidad</th>
                                    <th className="pb-3">Proveedor</th>
                                    <th className="pb-3 text-right">Costo Est.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {selectedList.items.map((item, i) => (
                                    <tr key={i} className="text-sm dark:text-gray-300">
                                        <td className="py-3 pl-2 font-medium">{item.productName}</td>
                                        <td className="py-3">{item.quantity} {item.unit}</td>
                                        <td className="py-3 text-gray-500">{item.supplierName || '-'}</td>
                                        <td className="py-3 text-right px-2">{item.estimatedCost ? `$${item.estimatedCost}` : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type="danger"
                confirmText="ELIMINAR"
            />
        </div>
    );
};
