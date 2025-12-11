
import React, { useState } from 'react';
import { ShoppingList, Supplier, SupplierProduct } from '../types';
import { Search, Plus, Truck, Package, ShoppingCart, Trash2, Edit, Camera, Sparkles } from 'lucide-react';
import { ShoppingListGenerator } from './ShoppingListGenerator';
import { analyzeProductImage } from '../services/geminiService';

interface SuppliersViewProps {
    suppliers: Supplier[];
    addSupplier: (item: Supplier) => Promise<void>;
    updateSupplier: (item: Supplier) => Promise<void>;
    deleteSupplier: (id: string) => Promise<void>;
    products: SupplierProduct[];
    addProduct: (item: SupplierProduct) => Promise<void>;
    updateProduct: (item: SupplierProduct) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    shoppingLists: ShoppingList[];
    setShoppingLists: React.Dispatch<React.SetStateAction<ShoppingList[]>>;
    userName: string;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({ suppliers, addSupplier, updateSupplier, deleteSupplier, products, addProduct, updateProduct, deleteProduct, shoppingLists, setShoppingLists, userName }) => {
    const [activeTab, setActiveTab] = useState<'SUPPLIERS' | 'PRODUCTS' | 'PROCURO'>('SUPPLIERS');

    // Supplier State
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({});

    // Product State
    // Product State
    const [showProductModal, setShowProductModal] = useState(false);
    const [productForm, setProductForm] = useState<Partial<SupplierProduct>>({});
    const [isScanning, setIsScanning] = useState(false);
    const [isDragging, setIsDragging] = useState(false); // Drag state
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // BULK DELETE
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    const handleToggleSelectProduct = (id: string) => {
        setSelectedProductIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAllProducts = () => {
        if (selectedProductIds.length === products.length) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(products.map(p => p.id));
        }
    };

    const handleBulkDeleteProducts = async () => {
        if (selectedProductIds.length === 0) return;
        if (!confirm(`¿Eliminar ${selectedProductIds.length} productos seleccionados?`)) return;

        for (const id of selectedProductIds) {
            await deleteProduct(id);
        }
        setSelectedProductIds([]);
        alert('Productos eliminados correctamente.');
    };

    // AI SCAN HANDLER
    // AI SCAN HANDLER
    const processImageFile = (file: File) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Por favor, sube un archivo de imagen válido.');
            return;
        }

        setIsScanning(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const base64 = event.target?.result as string;
                const result = await analyzeProductImage(base64);

                if (result) {
                    if (Array.isArray(result) && result.length > 1) {
                        setBatchCandidates(result);
                        setShowBatchModal(true);
                        setShowProductModal(false);
                    } else {
                        const item = Array.isArray(result) ? result[0] : result;
                        setProductForm(prev => ({
                            ...prev,
                            name: item.name || prev.name,
                            brand: item.brand || prev.brand,
                            unit: item.unit || prev.unit || 'un',
                            price: item.price || prev.price,
                            category: item.category || prev.category
                        }));
                    }
                } else {
                    alert("No se pudo analizar la imagen.");
                }
            } catch (err: any) {
                console.error("Error processing image:", err);
                alert("Error al procesar la imagen: " + err.message);
            } finally {
                setIsScanning(false);
            }
        };
        reader.onerror = () => {
            alert("Error al leer el archivo.");
            setIsScanning(false);
        };
        reader.readAsDataURL(file);
    };

    // BATCH IMPORT STATE
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchCandidates, setBatchCandidates] = useState<any[]>([]);

    const handleConfirmBatch = async () => {
        if (batchCandidates.length === 0) return;
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processImageFile(file);
    };

    // DRAG AND DROP HANDLERS
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processImageFile(file);
    };

    // UTILS
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // HANDLERS
    const handleSaveSupplier = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Guardando proveedor...", supplierForm);
        if (!supplierForm.name) {
            alert("Falta el nombre de la empresa");
            return;
        }

        // Duplicate Check
        const normalizedName = supplierForm.name.toLowerCase().trim();
        const duplicate = suppliers.find(s => s.name.toLowerCase().trim() === normalizedName && s.id !== supplierForm.id);
        if (duplicate) {
            alert(`Ya existe un proveedor con el nombre "${duplicate.name}".`);
            return;
        }

        try {
            if (supplierForm.id) {
                // Update
                console.log("Actualizando ID:", supplierForm.id);
                updateSupplier({
                    ...supplierForm,
                    updatedBy: userName,
                    updatedAt: new Date().toISOString()
                } as Supplier);
            } else {
                // Create
                console.log("Creando nuevo proveedor");
                const newSupplier: Supplier = {
                    id: generateUUID(),
                    name: supplierForm.name,
                    category: supplierForm.category || 'Otros',
                    contact: supplierForm.contact,
                    phone: supplierForm.phone,
                    email: supplierForm.email,
                    cbu: supplierForm.cbu,
                    alias: supplierForm.alias,
                    bank: supplierForm.bank,
                    notes: supplierForm.notes,
                    updatedAt: new Date().toISOString(),
                    createdBy: userName, // Audit
                    updatedBy: userName  // Audit
                };
                console.log("Objeto a guardar:", newSupplier);
                addSupplier(newSupplier);
            }
            setShowSupplierModal(false);
            setSupplierForm({});
        } catch (error) {
            console.error("Error al guardar proveedor:", error);
            alert("Error al guardar: " + error);
        }
    };

    const handleDeleteSupplier = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('¿Eliminar proveedor? Se borrarán sus productos asociados.')) {
            deleteSupplier(id);
            // Cascade delete (mock logic, real db should cascade via FK or trigger)
            const supplierProds = products.filter(p => p.supplierId === id);
            supplierProds.forEach(p => deleteProduct(p.id));
        }
    };

    const handleSaveProduct = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Guardando producto...", productForm);
        // Validation fixed previously
        if (!productForm.price || !productForm.unit || !productForm.supplierId) {
            alert("Faltan campos obligatorios (Proveedor, Precio, Unidad)");
            return;
        }

        // Duplicate Check
        const normalizedName = (productForm.name || '').toLowerCase().trim();
        const duplicate = products.find(p => p.name.toLowerCase().trim() === normalizedName && p.id !== productForm.id);
        if (duplicate) {
            alert(`Ya existe un producto con el nombre "${duplicate.name}".`);
            return;
        }

        try {
            if (productForm.id) {
                console.log("Actualizando producto ID:", productForm.id);
                updateProduct({
                    ...productForm,
                    lastPriceUpdate: new Date().toISOString(),
                    updatedBy: userName,
                    updatedAt: new Date().toISOString()
                } as SupplierProduct);
            } else {
                console.log("Creando nuevo producto");
                const newProduct: SupplierProduct = {
                    id: generateUUID(),
                    supplierId: productForm.supplierId,
                    name: productForm.name || 'Producto',
                    brand: productForm.brand,
                    unit: productForm.unit || 'un',
                    price: Number(productForm.price) || 0,
                    category: productForm.category,
                    minQuantity: Number(productForm.minQuantity),
                    lastPriceUpdate: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: userName, // Audit
                    updatedBy: userName  // Audit
                };
                console.log("Objeto producto a guardar:", newProduct);
                addProduct(newProduct);
            }
            setShowProductModal(false);
            setProductForm({});
        } catch (error) {
            console.error("Error al guardar producto:", error);
            alert("Error al guardar producto: " + error);
        }
    };

    const handleDeleteProduct = (id: string) => {
        if (confirm('¿Eliminar producto?')) {
            deleteProduct(id);
        }
    };

    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Desconocido';

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                    <Truck className="w-8 h-8 text-sushi-gold" />
                    Gestión de Insumos
                </h1>
                <p className="text-gray-500 dark:text-sushi-muted">Administra tus distribuidores, costos y compras.</p>
            </div>

            {/* Navigation */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-white/10 pb-1">
                <button
                    onClick={() => setActiveTab('SUPPLIERS')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors ${activeTab === 'SUPPLIERS' ? 'bg-white dark:bg-sushi-dark border-b-2 border-sushi-gold text-sushi-gold' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                >
                    <Truck className="w-4 h-4" /> Proveedores
                </button>
                <button
                    onClick={() => setActiveTab('PRODUCTS')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors ${activeTab === 'PRODUCTS' ? 'bg-white dark:bg-sushi-dark border-b-2 border-sushi-gold text-sushi-gold' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                >
                    <Package className="w-4 h-4" /> Lista de Insumos
                </button>
                <button
                    onClick={() => setActiveTab('PROCURO')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors ${activeTab === 'PROCURO' ? 'bg-white dark:bg-sushi-dark border-b-2 border-sushi-gold text-sushi-gold' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                >
                    <ShoppingCart className="w-4 h-4" /> Compras / Pedidos
                </button>
            </div>

            {/* CONTENT */}

            {/* SUPPLIERS TAB */}
            {activeTab === 'SUPPLIERS' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <div className="relative">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar proveedor..."
                                className="pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 ring-sushi-gold/50 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={() => { setSupplierForm({}); setShowSupplierModal(true); }}
                            className="bg-sushi-gold text-sushi-black px-4 py-2 rounded-lg font-bold hover:bg-sushi-goldhover flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" /> Nuevo Proveedor
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {suppliers.map(s => (
                            <div
                                key={s.id}
                                onClick={() => { setSupplierForm(s); setShowSupplierModal(true); }}
                                className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-lg dark:text-white">{s.name}</h3>
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-gray-600 dark:text-gray-300">{s.category}</span>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600 dark:text-sushi-muted mb-4">
                                    <p>📞 {s.phone || 'Sin teléfono'}</p>
                                    <p>✉️ {s.email || 'Sin email'}</p>
                                    <p>👤 {s.contact || 'Sin contacto'}</p>
                                </div>

                                <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                    <div className="text-xs text-gray-400">
                                        {products.filter(p => p.supplierId === s.id).length} productos
                                    </div>
                                    <button onClick={(e) => handleDeleteSupplier(s.id, e)} className="text-gray-300 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === 'PRODUCTS' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-4">
                            <div className="relative">
                                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto..."
                                    className="pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 ring-sushi-gold/50 dark:text-white"
                                />
                            </div>
                            {selectedProductIds.length > 0 && (
                                <button
                                    onClick={handleBulkDeleteProducts}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg animate-fade-in"
                                >
                                    <Trash2 className="w-5 h-5" /> Eliminar ({selectedProductIds.length})
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => { setProductForm({}); setShowProductModal(true); }}
                            className="bg-sushi-gold text-sushi-black px-4 py-2 rounded-lg font-bold hover:bg-sushi-goldhover flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" /> Nuevo Producto
                        </button>
                    </div>

                    <div className="bg-white dark:bg-sushi-dark rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-black/20 text-xs uppercase text-gray-500 font-bold">
                                <tr>
                                    <th className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedProductIds.length === products.length && products.length > 0}
                                            onChange={handleSelectAllProducts}
                                            className="rounded border-gray-300 dark:border-white/10"
                                        />
                                    </th>
                                    <th className="p-4">Producto</th>
                                    <th className="p-4">Proveedor</th>
                                    <th className="p-4">Precio</th>
                                    <th className="p-4">Última Act.</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {products.map(p => (
                                    <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${selectedProductIds.includes(p.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedProductIds.includes(p.id)}
                                                onChange={() => handleToggleSelectProduct(p.id)}
                                                className="rounded border-gray-300 dark:border-white/10"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold dark:text-white">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.brand} ({p.unit})</p>
                                        </td>
                                        <td className="p-4 text-sm dark:text-gray-300">{getSupplierName(p.supplierId)}</td>
                                        <td className="p-4 font-mono font-bold text-sushi-gold">${p.price}</td>
                                        <td className="p-4 text-xs text-gray-500">
                                            {p.updatedBy && <div>Ult. act: {p.updatedBy}</div>}
                                            {new Date(p.lastPriceUpdate).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => { setProductForm(p); setShowProductModal(true); }}
                                                className="text-blue-500 hover:text-blue-600 mr-2"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteProduct(p.id)} className="text-gray-400 hover:text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div >
                </div >
            )}

            {/* SHOPPING LIST TAB */}
            {
                activeTab === 'PROCURO' && (
                    <div className="animate-fade-in">
                        <ShoppingListGenerator
                            lists={shoppingLists}
                            setLists={setShoppingLists}
                            suppliers={suppliers}
                            products={products}
                            userName={userName}
                        />
                    </div>
                )
            }

            {/* MODALS */}
            {/* Supplier Modal */}
            {
                showSupplierModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-sushi-dark w-full max-w-lg rounded-xl p-6 shadow-2xl animate-fade-in-up">
                            <h3 className="text-xl font-bold dark:text-white mb-4">{supplierForm.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                            <form onSubmit={handleSaveSupplier} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Empresa</label>
                                    <input type="text" value={supplierForm.name || ''} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Categoría</label>
                                        <select value={supplierForm.category || ''} onChange={e => setSupplierForm({ ...supplierForm, category: e.target.value })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white">
                                            <option value="Materia Prima">Materia Prima</option>
                                            <option value="Bebidas">Bebidas</option>
                                            <option value="Packaging">Packaging</option>
                                            <option value="Limpieza">Limpieza</option>
                                            <option value="Servicios">Servicios</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Contacto</label>
                                        <input type="text" value={supplierForm.contact || ''} onChange={e => setSupplierForm({ ...supplierForm, contact: e.target.value })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Nombre vendedor" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Teléfono</label>
                                        <input type="text" value={supplierForm.phone || ''} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                                        <input type="email" value={supplierForm.email || ''} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" />
                                    </div>
                                </div>
                                <fieldset className="border border-gray-200 dark:border-white/10 p-3 rounded">
                                    <legend className="text-xs font-bold text-gray-500 px-1">Datos Bancarios</legend>
                                    <div className="space-y-2">
                                        <input type="text" placeholder="Banco" value={supplierForm.bank || ''} onChange={e => setSupplierForm({ ...supplierForm, bank: e.target.value })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white text-xs" />
                                        <input type="text" placeholder="CBU / CVU" value={supplierForm.cbu || ''} onChange={e => setSupplierForm({ ...supplierForm, cbu: e.target.value })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white text-xs" />
                                        <input type="text" placeholder="Alias" value={supplierForm.alias || ''} onChange={e => setSupplierForm({ ...supplierForm, alias: e.target.value })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white text-xs" />
                                    </div>
                                </fieldset>
                                <div className="flex gap-2 justify-end mt-4">
                                    <button type="button" onClick={() => setShowSupplierModal(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-sushi-gold text-sushi-black font-bold rounded">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Product Modal */}
            {
                showProductModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-sushi-dark w-full max-w-md rounded-xl p-6 shadow-2xl animate-fade-in-up">
                            <h3 className="text-xl font-bold dark:text-white mb-4">{productForm.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                            <form onSubmit={handleSaveProduct} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Proveedores (Obligatorio)</label>
                                    <select
                                        value={productForm.supplierId || ''}
                                        onChange={e => setProductForm({ ...productForm, supplierId: e.target.value })}
                                        className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white"
                                        required
                                    >
                                        <option value="">Seleccionar Proveedor...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                {/* Removed duplicate supplier select that was here */}

                                {/* AI SCANNER BUTTON - DRAG & DROP AREA */}
                                <div
                                    className={`flex items-center gap-4 p-4 rounded-lg border-2 border-dashed transition-all cursor-pointer ${isDragging ? 'border-sushi-gold bg-sushi-gold/10' : 'border-blue-100 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/20'}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-full text-blue-600 dark:text-blue-400">
                                        {isScanning ? <Sparkles className="w-6 h-6 animate-pulse" /> : <Camera className="w-6 h-6" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                            {isDragging ? '¡Suelta la imagen aquí!' : 'Escanear Producto (Click o Arrastrar)'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {isScanning ? 'Analizando imagen...' : 'Sube una foto y la IA completará los datos.'}
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Producto {productForm.name && <span className="text-green-500 text-[10px] ml-2">(Detectado)</span>}</label>
                                    <input type="text" value={productForm.name || ''} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Ej. Queso Tybo (Confirmar datos)" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Marca / Detalle</label>
                                        <input type="text" value={productForm.brand || ''} onChange={e => setProductForm({ ...productForm, brand: e.target.value })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Unidad (Obligatorio)</label>
                                        <select value={productForm.unit || 'un'} onChange={e => setProductForm({ ...productForm, unit: e.target.value })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" required>
                                            <option value="un">Unidad</option>
                                            <option value="kg">Kilogramo</option>
                                            <option value="gr">Gramos</option>
                                            <option value="lt">Litro</option>
                                            <option value="caja">Caja</option>
                                            <option value="paq">Paquete</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Precio Actual ($) (Obligatorio)</label>
                                        <input type="number" value={productForm.price || ''} onChange={e => setProductForm({ ...productForm, price: Number(e.target.value) })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white font-mono" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Stock Mínimo</label>
                                        <input type="number" value={productForm.minQuantity || ''} onChange={e => setProductForm({ ...productForm, minQuantity: Number(e.target.value) })} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end mt-4">
                                    <button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-sushi-gold text-sushi-black font-bold rounded">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* BATCH IMPORT MODAL */}
            {showBatchModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-4xl h-[80vh] rounded-2xl flex flex-col shadow-2xl animate-fade-in-up border border-white/10">
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                                    <Sparkles className="text-sushi-gold" /> Importación Masiva
                                </h3>
                                <p className="text-gray-500 text-sm">Se detectaron {batchCandidates.length} productos. Revisa y confirma.</p>
                            </div>
                            <button onClick={() => setShowBatchModal(false)} className="p-2 hover:bg-white/10 rounded-full"><Trash2 className="w-5 h-5 text-gray-400" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-black/30 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 text-xs uppercase text-gray-500">Producto</th>
                                        <th className="p-3 text-xs uppercase text-gray-500">Marca/Detalle</th>
                                        <th className="p-3 text-xs uppercase text-gray-500">Unidad</th>
                                        <th className="p-3 text-xs uppercase text-gray-500">Precio</th>
                                        <th className="p-3 text-xs uppercase text-gray-500">Proveedor</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                    {batchCandidates.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 group">
                                            <td className="p-3">
                                                <input
                                                    value={item.name || ''}
                                                    onChange={(e) => {
                                                        const copy = [...batchCandidates];
                                                        copy[idx].name = e.target.value;
                                                        setBatchCandidates(copy);
                                                    }}
                                                    className="bg-transparent border-none focus:ring-0 w-full font-medium dark:text-white placeholder-gray-600"
                                                    placeholder="Nombre..."
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    value={item.brand || ''}
                                                    onChange={(e) => {
                                                        const copy = [...batchCandidates];
                                                        copy[idx].brand = e.target.value;
                                                        setBatchCandidates(copy);
                                                    }}
                                                    className="bg-transparent border-none focus:ring-0 w-full text-sm text-gray-400"
                                                    placeholder="Marca..."
                                                />
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    value={item.unit || 'un'}
                                                    onChange={(e) => {
                                                        const copy = [...batchCandidates];
                                                        copy[idx].unit = e.target.value;
                                                        setBatchCandidates(copy);
                                                    }}
                                                    className="bg-transparent border-none focus:ring-0 text-sm text-sushi-gold font-mono"
                                                >
                                                    <option value="un">un</option>
                                                    <option value="kg">kg</option>
                                                    <option value="lt">lt</option>
                                                    <option value="paq">paq</option>
                                                    <option value="caja">caja</option>
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    value={item.price || 0}
                                                    onChange={(e) => {
                                                        const copy = [...batchCandidates];
                                                        copy[idx].price = Number(e.target.value);
                                                        setBatchCandidates(copy);
                                                    }}
                                                    className="bg-transparent border-none focus:ring-0 w-24 font-bold text-white text-right"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    value={item.supplierId || ''}
                                                    onChange={(e) => {
                                                        const copy = [...batchCandidates];
                                                        copy[idx].supplierId = e.target.value;
                                                        setBatchCandidates(copy);
                                                    }}
                                                    className="bg-transparent border border-white/10 rounded p-1 text-xs text-gray-300 w-32"
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => {
                                                        const copy = batchCandidates.filter((_, i) => i !== idx);
                                                        setBatchCandidates(copy);
                                                    }}
                                                    className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-between bg-gray-50 dark:bg-black/20 rounded-b-2xl">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-400 text-sm">Masivo:</span>
                                <select
                                    className="bg-white dark:bg-black/40 border border-white/10 rounded p-2 text-sm dark:text-white"
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        const copy = batchCandidates.map(c => ({ ...c, supplierId: e.target.value }));
                                        setBatchCandidates(copy);
                                    }}
                                >
                                    <option value="">Asignar Proveedor a TODOS...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setShowBatchModal(false)} className="px-6 py-3 rounded-lg text-gray-500 font-bold hover:bg-white/5">Cancelar</button>
                                <button
                                    onClick={async () => {
                                        if (batchCandidates.length === 0) return;
                                        // Validate
                                        const invalid = batchCandidates.filter(c => !c.name || !c.price || !c.supplierId);
                                        if (invalid.length > 0) {
                                            alert(`Hay ${invalid.length} productos sin Nombre, Precio o Proveedor. Por favor completa los datos.`);
                                            return;
                                        }

                                        // Add or Update
                                        let created = 0;
                                        let updated = 0;

                                        for (const item of batchCandidates) {
                                            // 1. Normalize Name
                                            const normalizedName = item.name.trim().toLowerCase();

                                            // 2. Check Existence (Exact match on Name + Supplier, or just Name? Let's do Name + Supplier for safety, or just Name if unique global)
                                            // Requirement said "Prevent duplicate supply entries based on normalized names". 
                                            // Let's check if this product exists for ANY supplier? No, usually distinct per supplier. 
                                            // actually, if I import a list, I assign a supplier.

                                            const existing = products.find(p =>
                                                p.name.trim().toLowerCase() === normalizedName &&
                                                p.supplierId === item.supplierId
                                            );

                                            if (existing) {
                                                // 3. Update
                                                await updateProduct({
                                                    ...existing,
                                                    price: Number(item.price),
                                                    lastPriceUpdate: new Date().toISOString(),
                                                    updatedBy: userName,
                                                    updatedAt: new Date().toISOString()
                                                });
                                                updated++;
                                            } else {
                                                // 4. Create
                                                await addProduct({
                                                    id: generateUUID(),
                                                    supplierId: item.supplierId,
                                                    name: item.name,
                                                    brand: item.brand || '',
                                                    unit: item.unit || 'un',
                                                    price: Number(item.price),
                                                    category: item.category || 'Materia Prima',
                                                    lastPriceUpdate: new Date().toISOString(),
                                                    createdBy: userName,
                                                    updatedBy: userName,
                                                    minQuantity: 0,
                                                    updatedAt: new Date().toISOString()
                                                });
                                                created++;
                                            }
                                        }
                                        setShowBatchModal(false);
                                        setBatchCandidates([]);
                                        alert(`Proceso finalizado:\n- Nuevos: ${created}\n- Actualizados: ${updated}`);
                                    }}
                                    className="px-8 py-3 bg-sushi-gold text-sushi-black font-bold rounded-lg shadow-lg shadow-sushi-gold/20 hover:scale-105 transition-transform flex items-center gap-2"
                                >
                                    <Sparkles className="w-5 h-5" /> Confirmar Importación ({batchCandidates.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
