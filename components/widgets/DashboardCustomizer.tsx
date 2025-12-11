
import React, { useState, useEffect } from 'react';
import { DashboardWidget } from '../../types';
import { X, Eye, EyeOff, ArrowUp, ArrowDown, Save, RefreshCw } from 'lucide-react';

interface DashboardCustomizerProps {
    isOpen: boolean;
    onClose: () => void;
    currentWidgets: DashboardWidget[];
    onSave: (newWidgets: DashboardWidget[]) => void;
}

export const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({ isOpen, onClose, currentWidgets, onSave }) => {
    const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>([]);

    useEffect(() => {
        if (isOpen) {
            setLocalWidgets([...currentWidgets].sort((a, b) => a.order - b.order));
        }
    }, [isOpen, currentWidgets]);

    const handleToggleVisibility = (id: string) => {
        setLocalWidgets(prev => prev.map(w =>
            w.id === id ? { ...w, visible: !w.visible } : w
        ));
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === localWidgets.length - 1) return;

        const newWidgets = [...localWidgets];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        [newWidgets[index], newWidgets[swapIndex]] = [newWidgets[swapIndex], newWidgets[index]];

        // Update order property
        const reordered = newWidgets.map((w, i) => ({ ...w, order: i }));
        setLocalWidgets(reordered);
    };

    const handleSave = () => {
        onSave(localWidgets);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-sushi-dark w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 animate-fade-in sm:max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-sushi-gold" />
                        Personalizar Panel
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    <p className="text-sm text-gray-500 mb-4 dark:text-sushi-muted">
                        Activa los elementos que deseas ver y ordénalos según tu preferencia.
                    </p>
                    <div className="space-y-3">
                        {localWidgets.map((widget, index) => (
                            <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-white/5 transition-colors hover:border-sushi-gold/30">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleToggleVisibility(widget.id)}
                                        className={`p-2 rounded-lg transition-colors ${widget.visible ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-white/5 dark:text-gray-500'}`}
                                        title={widget.visible ? "Visible" : "Oculto"}
                                    >
                                        {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                    <span className={`font-medium ${widget.visible ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-sushi-muted decoration-dashed line-through'}`}>
                                        {widget.title}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleMove(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleMove(index, 'down')}
                                        disabled={index === localWidgets.length - 1}
                                        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-white/10bg-gray-50 dark:bg-black/20 flex justify-end gap-3 rounded-b-xl">
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
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};
