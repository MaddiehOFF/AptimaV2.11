import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Eye, EyeOff, ArrowUp, ArrowDown, Save, RefreshCw, GripVertical } from 'lucide-react';

export interface SidebarItemConfig {
    id: string; // View enum or unique ID
    label: string;
    visible: boolean;
    order: number;
    isHeader?: boolean; // For Admin Groups
}

interface SidebarCustomizerProps {
    isOpen: boolean;
    onClose: () => void;
    currentItems: SidebarItemConfig[];
    onSave: (newItems: SidebarItemConfig[]) => void;
}

export const SidebarCustomizer: React.FC<SidebarCustomizerProps> = ({ isOpen, onClose, currentItems, onSave }) => {
    const [localItems, setLocalItems] = useState<SidebarItemConfig[]>([]);
    const [draggedItem, setDraggedItem] = useState<SidebarItemConfig | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLocalItems([...currentItems].sort((a, b) => a.order - b.order));
        }
    }, [isOpen, currentItems]);

    const handleToggleVisibility = (id: string) => {
        setLocalItems(prev => prev.map(item =>
            item.id === id ? { ...item, visible: !item.visible } : item
        ));
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === localItems.length - 1) return;

        const newItems = [...localItems];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];

        // Update order property
        const reordered = newItems.map((item, i) => ({ ...item, order: i }));
        setLocalItems(reordered);
    };

    const onDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItem(localItems[index]);
        e.dataTransfer.effectAllowed = "move";
        // Hack to remove the default ghost image if we wanted custom, but default is fine for now
    };

    const onDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        // e.dataTransfer.dropEffect = "move";
        if (!draggedItem) return;

        const draggedOverItem = localItems[index];
        if (draggedItem.id === draggedOverItem.id) return;

        // Remove dragged item from list
        let items = localItems.filter(i => i.id !== draggedItem.id);

        // Insert at new index
        items.splice(index, 0, draggedItem);

        setLocalItems(items);
    };

    const onDragEnd = () => {
        setDraggedItem(null);
        // Correct orders
        const reordered = localItems.map((item, i) => ({ ...item, order: i }));
        setLocalItems(reordered);
    };

    const handleSave = () => {
        onSave(localItems);
        onClose();
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-sushi-dark w-full max-w-md rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 animate-fade-in sm:max-h-[80vh] flex flex-col relative z-[10000]">
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-sushi-gold" />
                        Organizar Menú
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    <p className="text-sm text-gray-500 mb-4 dark:text-sushi-muted">
                        Ordena las pestañas y oculta las que no utilices.
                        {localItems.some(i => i.isHeader) && <span className="block mt-1 text-xs text-sushi-gold">Puedes mover los "Encabezados" para reagrupar secciones.</span>}
                    </p>
                    <div className="space-y-2">
                        {localItems.map((item, index) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, index)}
                                onDragOver={(e) => onDragOver(e, index)}
                                onDragEnd={onDragEnd}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-move
                                    ${item.isHeader
                                        ? 'bg-sushi-gold/10 border-sushi-gold/30'
                                        : 'bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5 hover:border-sushi-gold/30'
                                    }
                                    ${draggedItem?.id === item.id ? 'opacity-50 scale-95 border-dashed border-2 border-sushi-gold' : ''}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-gray-400 cursor-move active:text-sushi-gold">
                                        <GripVertical size={16} />
                                    </div>
                                    <button
                                        onClick={() => handleToggleVisibility(item.id)}
                                        className={`p-2 rounded-lg transition-colors ${item.visible
                                            ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                                            : 'bg-gray-200 text-gray-500 dark:bg-white/5 dark:text-gray-500'
                                            }`}
                                        title={item.visible ? "Visible" : "Oculto"}
                                    >
                                        {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                    <span className={`font-medium ${item.visible ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-sushi-muted decoration-dashed line-through'} ${item.isHeader ? 'uppercase tracking-widest text-xs font-bold' : ''}`}>
                                        {item.label} {item.isHeader && <span className="ml-2 text-[10px] text-gray-400 font-normal px-1 border border-gray-200 rounded">SECCIÓN</span>}
                                    </span>
                                </div>
                                {/* Removed Arrow Buttons in favor of Drag and Drop, but keeping visibility toggle */}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-sushi-gold text-sushi-black font-bold rounded-lg hover:bg-sushi-goldhover transition-colors flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Guardar Orden
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
