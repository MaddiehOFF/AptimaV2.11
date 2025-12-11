
import React, { useState } from 'react';
import { InternalMessage, Employee, User } from '../types';
import { Mail, Send, Inbox, Star, Trash2, Reply } from 'lucide-react';

interface InternalMailProps {
    currentUser: Employee | User;
    messages: InternalMessage[];
    setMessages: React.Dispatch<React.SetStateAction<InternalMessage[]>>;
    employees: Employee[];
    users?: User[]; // Added Admins
    recipient?: string | null;
}

export const InternalMail: React.FC<InternalMailProps> = ({ currentUser, messages, setMessages, employees, users = [], recipient }) => {
    const [view, setView] = useState<'INBOX' | 'SENT' | 'COMPOSE'>('INBOX');
    const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null);

    // Compose State
    const [recipientIds, setRecipientIds] = useState<string[]>([]);
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');

    // Handle Pre-selected recipient
    React.useEffect(() => {
        if (recipient) {
            setView('COMPOSE');
            setRecipientIds([recipient]);
        }
    }, [recipient]);

    const myMessages = messages.filter(m => m.recipientIds.includes(currentUser.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sentMessages = messages.filter(m => m.senderId === currentUser.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Merge potential recipients (Employees + Admins)
    const allRecipients = [
        ...employees.map(e => ({ id: e.id, name: e.name, role: e.role })),
        ...users.map(u => ({ id: u.id, name: u.name, role: 'ADMIN' }))
    ];

    const getName = (id: string) => allRecipients.find(r => r.id === id)?.name || 'Desconocido';

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (recipientIds.length === 0 || !subject || !content) return;

        const newMessage: InternalMessage = {
            id: crypto.randomUUID(),
            senderId: currentUser.id,
            recipientIds: recipientIds,
            subject,
            content,
            date: new Date().toISOString(),
            readBy: [],
            priority: 'NORMAL'
        };

        setMessages([newMessage, ...messages]);
        setView('SENT');
        setRecipientIds([]);
        setSubject('');
        setContent('');
    };

    const toggleRecipient = (id: string) => {
        if (recipientIds.includes(id)) {
            setRecipientIds(recipientIds.filter(r => r !== id));
        } else {
            setRecipientIds([...recipientIds, id]);
        }
    };

    const markAsRead = (msg: InternalMessage) => {
        if (!msg.readBy.includes(currentUser.id)) {
            const updated = { ...msg, readBy: [...msg.readBy, currentUser.id] };
            setMessages(messages.map(m => m.id === msg.id ? updated : m));
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="w-full md:w-64 flex flex-col gap-2">
                <button
                    onClick={() => setView('COMPOSE')}
                    className="bg-sushi-gold text-sushi-black font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-4 shadow-lg hover:bg-sushi-goldhover transition-colors"
                >
                    <Send className="w-5 h-5" />
                    Redactar
                </button>

                <button
                    onClick={() => { setView('INBOX'); setSelectedMessage(null); }}
                    className={`p-3 rounded-lg flex items-center justify-between ${view === 'INBOX' ? 'bg-white dark:bg-white/10 font-bold text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                    <div className="flex items-center gap-3">
                        <Inbox className="w-5 h-5" />
                        Bandeja de Entrada
                    </div>
                    {myMessages.filter(m => !m.readBy.includes(currentUser.id)).length > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {myMessages.filter(m => !m.readBy.includes(currentUser.id)).length}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => { setView('SENT'); setSelectedMessage(null); }}
                    className={`p-3 rounded-lg flex items-center gap-3 ${view === 'SENT' ? 'bg-white dark:bg-white/10 font-bold text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                    <Reply className="w-5 h-5 transform rotate-180" />
                    Enviados
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white dark:bg-sushi-dark rounded-xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
                {view === 'COMPOSE' ? (
                    <div className="p-6 overflow-y-auto">
                        <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-6">Nuevo Mensaje</h3>
                        <form onSubmit={handleSend} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-sushi-muted mb-2">Destinatarios</label>
                                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/10 max-h-32 overflow-y-auto">
                                    {allRecipients.filter(r => r.id !== currentUser.id).map(u => (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => toggleRecipient(u.id)}
                                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${recipientIds.includes(u.id) ? 'bg-sushi-gold border-sushi-gold text-sushi-black font-bold' : 'border-gray-300 dark:border-white/20 text-gray-600 dark:text-gray-400'}`}
                                        >
                                            {u.name} <span className="opacity-50 text-[10px]">({u.role})</span>
                                        </button>
                                    ))}
                                </div>

                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-sushi-muted mb-2">Asunto</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 focus:border-sushi-gold focus:outline-none dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-sushi-muted mb-2">Mensaje</label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    rows={8}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 focus:border-sushi-gold focus:outline-none dark:text-white"
                                    required
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="bg-sushi-gold text-sushi-black font-bold py-2 px-6 rounded-lg hover:bg-sushi-goldhover shadow-lg">
                                    Enviar Mensaje
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <>
                        {/* List View */}
                        {!selectedMessage ? (
                            <div className="h-full overflow-y-auto">
                                <div className="p-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-black/20">
                                    <h3 className="font-bold text-gray-700 dark:text-white">{view === 'INBOX' ? 'Bandeja de Entrada' : 'Enviados'}</h3>
                                    <span className="text-xs text-gray-500">{(view === 'INBOX' ? myMessages : sentMessages).length} mensajes</span>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                    {(view === 'INBOX' ? myMessages : sentMessages).map(msg => {
                                        const isUnread = !msg.readBy.includes(currentUser.id) && view === 'INBOX';
                                        return (
                                            <div
                                                key={msg.id}
                                                onClick={() => { setSelectedMessage(msg); if (view === 'INBOX') markAsRead(msg); }}
                                                className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors ${isUnread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className={`text-sm ${isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                                                        {view === 'INBOX' ? getName(msg.senderId) : `Para: ${msg.recipientIds.length} destinatarios`}
                                                    </h4>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                        {new Date(msg.date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className={`text-sm mb-1 ${isUnread ? 'font-bold text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    {msg.subject}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
                                                    {msg.content}
                                                </p>
                                            </div>
                                        );
                                    })}
                                    {(view === 'INBOX' ? myMessages : sentMessages).length === 0 && (
                                        <div className="p-8 text-center text-gray-400 dark:text-gray-600">
                                            No hay mensajes.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Detail View */
                            <div className="h-full flex flex-col">
                                <div className="p-4 border-b border-gray-200 dark:border-white/5 flex items-center gap-4 bg-gray-50 dark:bg-black/20">
                                    <button onClick={() => setSelectedMessage(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full">
                                        <Reply className="w-5 h-5 text-gray-500" />
                                    </button>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">{selectedMessage.subject}</h3>
                                    </div>
                                    <button className="p-2 text-gray-400 hover:text-red-500">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-sushi-gold text-sushi-black flex items-center justify-center font-bold text-lg">
                                                {getName(selectedMessage.senderId).charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{getName(selectedMessage.senderId)}</p>
                                                <p className="text-xs text-gray-500">Para: {selectedMessage.recipientIds.map(id => getName(id)).join(', ')}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {new Date(selectedMessage.date).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-300 whitespace-pre-wrap mb-6">
                                        {selectedMessage.content}
                                    </div>

                                    {/* QUICK REPLY */}
                                    <div className="border-t border-gray-200 dark:border-white/10 pt-4 mt-auto">
                                        <p className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-2">
                                            <Reply className="w-4 h-4" /> Responder rápida
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Escribe tu respuesta..."
                                                className="flex-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-sushi-gold dark:text-white"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.currentTarget.value;
                                                        if (!val.trim()) return;
                                                        const newMessage: InternalMessage = {
                                                            id: crypto.randomUUID(),
                                                            senderId: currentUser.id,
                                                            recipientIds: [selectedMessage.senderId],
                                                            subject: `RE: ${selectedMessage.subject}`,
                                                            content: val,
                                                            date: new Date().toISOString(),
                                                            readBy: [],
                                                            priority: 'NORMAL'
                                                        };
                                                        setMessages([newMessage, ...messages]);
                                                        e.currentTarget.value = '';
                                                        // Optional: Switch to SENT or just show toast
                                                        alert('Respuesta enviada');
                                                    }
                                                }}
                                            />
                                            <button
                                                className="bg-sushi-gold text-sushi-black p-2 rounded-lg hover:bg-sushi-goldhover"
                                                onClick={(e) => {
                                                    const input = e.currentTarget.parentElement?.querySelector('input');
                                                    if (input && input.value.trim()) {
                                                        const newMessage: InternalMessage = {
                                                            id: crypto.randomUUID(),
                                                            senderId: currentUser.id,
                                                            recipientIds: [selectedMessage.senderId],
                                                            subject: `RE: ${selectedMessage.subject}`,
                                                            content: input.value,
                                                            date: new Date().toISOString(),
                                                            readBy: [],
                                                            priority: 'NORMAL'
                                                        };
                                                        setMessages([newMessage, ...messages]);
                                                        input.value = '';
                                                        alert('Respuesta enviada');
                                                    }
                                                }}
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )
                }
            </div >
        </div >
    );
};
