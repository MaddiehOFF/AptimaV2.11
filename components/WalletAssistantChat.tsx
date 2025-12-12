import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User as UserIcon, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { WalletChatMessage, WalletTransaction, FixedExpense, Partner, RoyaltyHistoryItem } from '../types';
import { chatWithFinancialAdvisor } from '../services/geminiService';
import { supabase } from '../supabaseClient';
import { playSound } from '../utils/soundUtils';
import ReactMarkdown from 'react-markdown';
import { ConfirmationModal } from './common/ConfirmationModal';

interface WalletAssistantChatProps {
    isOpen: boolean;
    onClose: () => void;
    context: {
        balance: number;
        expenses: FixedExpense[];
        transactions: WalletTransaction[];
        pendingDebt: number;
        userName: string;
        partners?: Partner[]; // New Context
        royaltyPool?: number; // New Context
        royaltyHistory?: RoyaltyHistoryItem[]; // New Context
        auditData?: { id: string, name: string, amount: number }[]; // New Context: Conteo
    };
    defaultMinimized?: boolean;
    isMinimizedOverride?: boolean;
    onMinimizeChange?: (minimized: boolean) => void;
}

export const WalletAssistantChat: React.FC<WalletAssistantChatProps> = ({ isOpen, onClose, context, defaultMinimized = false, isMinimizedOverride, onMinimizeChange }) => {
    const [messages, setMessages] = useState<WalletChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [internalMinimized, setInternalMinimized] = useState(defaultMinimized);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

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

    const isMinimized = isMinimizedOverride !== undefined ? isMinimizedOverride : internalMinimized;

    const handleMinimizeToggle = () => {
        const newState = !isMinimized;
        setInternalMinimized(newState);
        onMinimizeChange?.(newState);
    };
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load History
    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    // Scroll to bottom
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [messages, isOpen, isMinimized]);

    const fetchHistory = async () => {
        const { data, error } = await supabase
            .from('wallet_chat_messages')
            .select('*')
            .order('updated_at', { ascending: true }); // We created updated_at, using it as date

        if (error) {
            console.error('Error fetching chat history:', error);
            // Fallback for demo if no backend yet
            if (messages.length === 0) {
                setMessages([
                    { id: 'welcome', role: 'assistant', content: `¡Hola ${context.userName}! Soy Fran, tu Asesor Financiero. ¿En qué puedo ayudarte hoy?`, date: new Date().toISOString() }
                ]);
            }
        } else if (data) {
            // Map structure
            const mapped: WalletChatMessage[] = data.map((d: any) => ({
                id: d.id,
                role: d.data.role,
                content: d.data.content,
                date: d.updated_at
            }));

            if (mapped.length === 0) {
                setMessages([
                    { id: 'welcome', role: 'assistant', content: `¡Hola ${context.userName}! Soy Fran, tu Asesor Financiero. ¿En qué puedo ayudarte hoy?`, date: new Date().toISOString() }
                ]);
            } else {
                setMessages(mapped);
            }
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsgText = input;
        setInput('');

        // 1. Add User Message to UI
        const tempId = crypto.randomUUID();
        const newMessage: WalletChatMessage = {
            id: tempId,
            role: 'user',
            content: userMsgText,
            date: new Date().toISOString()
        };

        const newHistory = [...messages, newMessage];
        setMessages(newHistory);
        setIsLoading(true);
        playSound('CLICK');

        // 2. Save User Message to DB
        await supabase.from('wallet_chat_messages').insert([{
            id: tempId,
            data: { role: 'user', content: userMsgText }
        }]);

        // 3. Call AI
        // Convert history for API (excluding the just added one to avoid dupes if logic changes, but here we pass simplified history)
        const apiHistory = messages.map(m => ({ role: m.role, content: m.content }));

        const responseText = await chatWithFinancialAdvisor(
            userMsgText,
            apiHistory,
            {
                ...context,
                partners: context.partners || [],
                royaltyPool: context.royaltyPool || 0,
                royaltyHistory: context.royaltyHistory || [],
                auditData: context.auditData || []
            }
        );

        // 4. Add AI Response to UI
        const aiMsgId = crypto.randomUUID();
        const aiMessage: WalletChatMessage = {
            id: aiMsgId,
            role: 'assistant',
            content: responseText,
            date: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        playSound('SUCCESS');

        // 5. Save AI Response to DB
        await supabase.from('wallet_chat_messages').insert([{
            id: aiMsgId,
            data: { role: 'assistant', content: responseText }
        }]);
    };

    const handleClearHistory = async () => {
        setConfirmModal({
            isOpen: true,
            title: '¿Reiniciar Memoria?',
            message: '¿Borrar toda la memoria de la conversación? Esto no se puede deshacer.',
            onConfirm: async () => {
                await supabase.from('wallet_chat_messages').delete().neq('id', '0'); // Delete all
                setMessages([
                    { id: 'welcome', role: 'assistant', content: '¡Memoria borrada! Empecemos de nuevo.', date: new Date().toISOString() }
                ]);
                playSound('CLICK');
            }
        });
    };

    if (!isOpen) return null;

    if (isMinimized) {
        return (
            <div className="fixed bottom-6 left-6 z-50 animate-fade-in">
                <button
                    onClick={() => {
                        setInternalMinimized(false);
                        onMinimizeChange?.(false);
                    }}
                    className="bg-sushi-gold text-sushi-black font-bold py-3 px-6 rounded-full shadow-2xl flex items-center gap-2 hover:bg-sushi-goldhover transition-all transform hover:scale-105"
                >
                    <Bot className="w-6 h-6" /> Asistente
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 w-full h-[600px] bg-white dark:bg-sushi-dark border-t border-gray-200 dark:border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-50 flex flex-col overflow-hidden animate-slide-up relative">

            {/* Confirmation Overlay */}
            {showConfirmClose && (
                <div className="absolute inset-0 z-50 bg-white/95 dark:bg-sushi-dark/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in backdrop-blur-sm">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                        <X className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">¿Cerrar Chat?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Si cierras el chat, perderás el contexto inmediato, aunque guardaremos tu historial.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => setShowConfirmClose(false)}
                            className="flex-1 py-2 px-4 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                        >
                            Sí, cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-sushi-gold p-4 flex justify-between items-center text-sushi-black">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-black/10 rounded-full">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold font-serif leading-none">Fran</h3>
                        <p className="text-[10px] opacity-80 uppercase tracking-wide font-bold">Finanzas & Estrategia</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={handleClearHistory} className="p-1.5 hover:bg-black/10 rounded-lg transition-colors text-black/60 hover:text-red-600 flex items-center gap-1" title="Reiniciar chat">
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase hidden sm:inline">Reiniciar</span>
                    </button>
                    <button onClick={() => setShowConfirmClose(true)} className="p-1.5 hover:bg-black/10 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black/20">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-sushi-gold/20 flex items-center justify-center mr-2 flex-shrink-0 border border-sushi-gold/30">
                                <Bot className="w-4 h-4 text-sushi-gold" />
                            </div>
                        )}

                        <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-white/10 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-white/5'
                            }`}>
                            <div className="markdown-content">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            <span className={`text-[10px] block mt-1 opacity-60 ${msg.role === 'user' ? 'text-blue-100 text-right' : 'text-gray-400'}`}>
                                {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center ml-2 flex-shrink-0">
                                <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="w-8 h-8 rounded-full bg-sushi-gold/20 flex items-center justify-center mr-2 border border-sushi-gold/30">
                            <Bot className="w-4 h-4 text-sushi-gold" />
                        </div>
                        <div className="bg-white dark:bg-white/10 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                            <div className="w-2 h-2 bg-sushi-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-sushi-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-sushi-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-sushi-dark border-t border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/30 rounded-xl p-2 border border-transparent focus-within:border-sushi-gold transition-colors">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pregunta sobre finanzas..."
                        className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white px-2"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-2 bg-sushi-gold text-sushi-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sushi-goldhover transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type="danger"
                confirmText="BORRAR"
            />
        </div>
    );
};
