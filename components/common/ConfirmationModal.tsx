
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-red-50 dark:bg-red-900/10',
            iconBg: 'bg-red-100 dark:bg-red-900/30',
            iconColor: 'text-red-600 dark:text-red-400',
            confirmBtn: 'bg-red-600 hover:bg-red-700 text-white'
        },
        warning: {
            bg: 'bg-yellow-50 dark:bg-yellow-900/10',
            iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
            iconColor: 'text-yellow-600 dark:text-yellow-400',
            confirmBtn: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        },
        info: {
            bg: 'bg-blue-50 dark:bg-blue-900/10',
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600 dark:text-blue-400',
            confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
    };

    const color = colors[type];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1a1a24] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-scale-in">
                <div className="p-6 text-center">
                    <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${color.iconBg} ${color.iconColor}`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed bg-black/5 dark:bg-white/5 p-3 rounded-lg">
                        {message}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 font-bold text-sm transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${color.confirmBtn} shadow-lg shadow-red-900/20`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
