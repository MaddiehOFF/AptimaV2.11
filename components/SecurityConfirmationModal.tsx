import React from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface SecurityConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    actionType?: 'warning' | 'danger' | 'info';
    confirmText?: string;
    cancelText?: string;
}

export const SecurityConfirmationModal: React.FC<SecurityConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    actionType = 'warning',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar'
}) => {
    if (!isOpen) return null;

    const colors = {
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            border: 'border-amber-100 dark:border-amber-500/20',
            icon: 'text-amber-500',
            button: 'bg-amber-500 hover:bg-amber-600 text-white'
        },
        danger: {
            bg: 'bg-red-50 dark:bg-red-500/10',
            border: 'border-red-100 dark:border-red-500/20',
            icon: 'text-red-500',
            button: 'bg-red-500 hover:bg-red-600 text-white'
        },
        info: {
            bg: 'bg-blue-50 dark:bg-blue-500/10',
            border: 'border-blue-100 dark:border-blue-500/20',
            icon: 'text-blue-500',
            button: 'bg-blue-500 hover:bg-blue-600 text-white'
        }
    };

    const scheme = colors[actionType];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className={`w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border ${scheme.border} overflow-hidden animate-scale-in`}>
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${scheme.bg} shrink-0`}>
                            {actionType === 'danger' ? <AlertTriangle className={`w-6 h-6 ${scheme.icon}`} /> : <ShieldCheck className={`w-6 h-6 ${scheme.icon}`} />}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                                {title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                                {description}
                            </p>

                            {/* Security Notice */}
                            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-100 dark:border-white/5 mb-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <ShieldCheck className="w-3 h-3" />
                                    Esta acción será registrada en el log de seguridad.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`px-4 py-2 text-sm font-bold rounded-lg shadow-sm transition-all active:scale-95 ${scheme.button}`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
