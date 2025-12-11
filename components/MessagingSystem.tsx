import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Mail, X, Send, Inbox, Plus, Search, ChevronRight, User, AlertCircle, Check, Trash2, Reply, ThumbsUp, Paperclip } from 'lucide-react';
import { InternalMessage, User as UserType, Employee, EmployeeRole } from '../types';
import { playSound } from '../utils/soundUtils';
import { generateUUID } from '../utils/uuid';

interface MessagingSystemProps {
    currentUser: UserType | null;
    currentMember: Employee | null;
    messages: InternalMessage[];
    setMessages: (messages: InternalMessage[]) => void;
    users: UserType[];
    employees: Employee[];
    restrictLateralMessaging: boolean;
}

export const MessagingSystem: React.FC<MessagingSystemProps> = ({
    currentUser,
    currentMember,
    messages,
    setMessages,
    users,
    employees,
    restrictLateralMessaging
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'INBOX' | 'SENT' | 'COMPOSE' | 'READ'>('INBOX');
    const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeContent, setComposeContent] = useState('');
    const [composeRecipients, setComposeRecipients] = useState<string[]>([]);
    const [composeAttachments, setComposeAttachments] = useState<string[]>([]);

    // Derived User Info
    const myId = currentUser?.id || currentMember?.id;
    const myName = currentUser?.name || currentMember?.name || 'Usuario';
    const myRole = currentUser ? 'ADMIN' : (currentMember?.role || 'EMPLEADO');

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    // Helpers
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
    };

    const getSenderName = (id: string) => {
        const u = users.find(x => x.id === id);
        if (u) return u.name;
        const e = employees.find(x => x.id === id);
        return e ? e.name : 'Desconocido';
    };

    const getRecipientNames = (idList: string[]) => {
        return idList.map(id => getSenderName(id)).join(', ');
    };

    // Filtered Lists
    const myInbox = useMemo(() => {
        if (!myId) return [];
        return messages.filter(m => m.recipientIds.includes(myId)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [messages, myId]);

    const myMessages = myInbox;

    const mySent = useMemo(() => {
        if (!myId) return [];
        return messages.filter(m => m.senderId === myId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [messages, myId]);

    const unreadCount = useMemo(() => {
        if (!myId) return 0;
        return myInbox.filter(m => !m.readBy.includes(myId)).length;
    }, [myInbox, myId]);

    const allRecipients = useMemo(() => {
        let list: { id: string, name: string, role: string }[] = [];
        users.forEach(u => list.push({ id: u.id, name: u.name, role: 'ADMIN' }));
        employees.forEach(e => list.push({ id: e.id, name: e.name, role: e.role }));

        // Remove self
        list = list.filter(u => u.id !== myId);

        // Apply Restriction
        if (restrictLateralMessaging) {
            const isSuperior = ['ADMIN', 'GERENTE', 'EMPRESA', 'COORDINADOR'].includes(myRole);
            if (!isSuperior) {
                // Only allow messaging superiors
                return list.filter(u => ['ADMIN', 'GERENTE', 'EMPRESA', 'COORDINADOR'].includes(u.role));
            }
        }
        return list;
    }, [users, employees, myId, myRole, restrictLateralMessaging]);

    const filteredRecipients = useMemo(() => {
        return allRecipients.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allRecipients, searchTerm]);


    // Handlers
    const toggleRecipient = (id: string) => {
        setComposeRecipients(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSendMessage = () => {
        if (!composeSubject.trim() || !composeContent.trim() || composeRecipients.length === 0 || !myId) return;

        const newMessage: InternalMessage = {
            id: generateUUID(),
            senderId: myId,
            recipientIds: composeRecipients,
            subject: composeSubject,
            content: composeContent,
            date: new Date().toISOString(),
            readBy: [],
            reactions: [],
            attachments: composeAttachments
        };

        setMessages([...messages, newMessage]);
        setComposeSubject('');
        setComposeContent('');
        setComposeRecipients([]);
        setComposeAttachments([]);
        setActiveTab('SENT');
        playSound('SUCCESS');
    };

    const handleReaction = (msg: InternalMessage, emoji: string) => {
        if (!myId) return;
        const msgIndex = messages.findIndex(m => m.id === msg.id);
        if (msgIndex === -1) return;

        const currentReactions = msg.reactions || [];
        const hasReacted = currentReactions.some(r => r.userId === myId && r.emoji === emoji);

        let newReactions;
        if (hasReacted) {
            newReactions = currentReactions.filter(r => !(r.userId === myId && r.emoji === emoji));
        } else {
            newReactions = [...currentReactions, { userId: myId, emoji }];
            playSound('SUCCESS');
        }

        const updatedMsg = { ...msg, reactions: newReactions };
        const newMessages = [...messages];
        newMessages[msgIndex] = updatedMsg;
        setMessages(newMessages);

        // Optimistic UI Update for Selected Message
        if (selectedMessage && selectedMessage.id === msg.id) {
            setSelectedMessage(updatedMsg);
        }
    };

    const handleReadMessage = (msg: InternalMessage) => {
        if (!myId) return;
        setSelectedMessage(msg);
        setActiveTab('READ');

        if (!msg.readBy.includes(myId)) {
            const updatedMsg = { ...msg, readBy: [...msg.readBy, myId] };
            const newMessages = messages.map(m => m.id === msg.id ? updatedMsg : m);
            setMessages(newMessages);
        }
    };

    // Auto Mark Read
    useEffect(() => {
        if (activeTab === 'READ' && selectedMessage && myId && !selectedMessage.readBy.includes(myId)) {
            const updatedMsg = {
                ...selectedMessage,
                readBy: [...selectedMessage.readBy, myId]
            };
            const newMessages = messages.map(m => m.id === selectedMessage.id ? updatedMsg : m);
            setMessages(newMessages);
        }
    }, [activeTab, selectedMessage, myId]);

    if (!myId) return null;

    return (
        <>
            {/* FLOATING ACTION BUTTON */}
            {!isOpen && (
                <button
                    onClick={handleOpen}
                    className="fixed bottom-8 right-24 z-[9000] w-14 h-14 bg-sushi-black border-2 border-sushi-gold rounded-full shadow-xl flex items-center justify-center text-sushi-gold hover:scale-105 transition-transform group"
                >
                    <Mail className="w-6 h-6" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-sushi-black animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                    <span className="absolute right-full mr-3 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Correo Interno
                    </span>
                </button>
            )}

            {/* MESSAGING PANEL (PORTAL) */}
            {isOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[9999] flex items-end sm:items-center justify-center sm:justify-end sm:p-6">
                    <div className="bg-white dark:bg-sushi-dark w-full sm:w-[500px] h-[90vh] sm:h-[600px] sm:rounded-2xl shadow-2xl flex flex-col animate-slide-up-fade border border-gray-200 dark:border-white/10 overflow-hidden">

                        {/* HEADER */}
                        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sushi-gold/20 rounded-lg">
                                    <Mail className="w-5 h-5 text-sushi-gold" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Mensajería Interna</h3>
                                    <p className="text-xs text-gray-500 dark:text-sushi-muted">{myName}</p>
                                </div>
                            </div>
                            <button onClick={handleClose} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-hidden flex flex-col relative">

                            {/* TABBED INBOX / SENT */}
                            {(activeTab === 'INBOX' || activeTab === 'SENT') && (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="p-4 border-b border-gray-200 dark:border-white/10 flex flex-col gap-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-gray-700 dark:text-white flex items-center gap-2">
                                                <Inbox className="w-4 h-4" /> Mis Mensajes
                                            </h4>
                                            <button
                                                onClick={() => setActiveTab('COMPOSE')}
                                                className="bg-sushi-black text-sushi-gold text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-black/80 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" /> Redactar
                                            </button>
                                        </div>

                                        {/* View Toggles */}
                                        <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1">
                                            <button
                                                onClick={() => setActiveTab('INBOX')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'INBOX' ? 'bg-white dark:bg-black shadow text-sushi-gold' : 'text-gray-500 dark:text-gray-400'}`}
                                            >
                                                Recibidos
                                                {unreadCount > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full">{unreadCount}</span>}
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('SENT')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'SENT' ? 'bg-white dark:bg-black shadow text-sushi-gold' : 'text-gray-500 dark:text-gray-400'}`}
                                            >
                                                Enviados
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                        {activeTab === 'INBOX' ? (
                                            myInbox.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-sushi-muted pb-10">
                                                    <Inbox className="w-12 h-12 mb-2 opacity-50" />
                                                    <p className="text-sm">No tienes mensajes recibidos.</p>
                                                </div>
                                            ) : (
                                                myInbox.map(msg => {
                                                    const isRead = msg.readBy.includes(myId!);
                                                    return (
                                                        <div
                                                            key={msg.id}
                                                            onClick={() => handleReadMessage(msg)}
                                                            className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-sushi-gold/50 ${isRead
                                                                ? 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-300'
                                                                : 'bg-sushi-gold/5 border-sushi-gold/20 text-gray-900 dark:text-white font-medium'
                                                                }`}
                                                        >
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-xs font-bold text-sushi-gold truncate max-w-[150px]">
                                                                    {getSenderName(msg.senderId)}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400">
                                                                    {formatDate(msg.date)}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm truncate mb-1">{msg.subject}</p>
                                                            <p className="text-xs text-gray-400 dark:text-sushi-muted line-clamp-1 font-normal">
                                                                {msg.content}
                                                            </p>

                                                            {/* Reaction Indicator in List */}
                                                            {msg.reactions && msg.reactions.length > 0 && (
                                                                <div className="mt-1 flex justify-end">
                                                                    <span className="text-[10px] bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-full text-gray-500 flex items-center gap-1">
                                                                        👍 {msg.reactions.length}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )
                                        ) : (
                                            /* SENT MESSAGES LIST */
                                            mySent.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-sushi-muted pb-10">
                                                    <Send className="w-12 h-12 mb-2 opacity-50" />
                                                    <p className="text-sm">No has enviado mensajes aún.</p>
                                                </div>
                                            ) : (
                                                mySent.map(msg => (
                                                    <div
                                                        key={msg.id}
                                                        onClick={() => handleReadMessage(msg)}
                                                        className="p-3 rounded-lg border bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-300 cursor-pointer hover:border-sushi-gold/50 transition-all"
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Para:</span>
                                                                <span className="text-xs font-bold text-sushi-gold truncate max-w-[150px]">
                                                                    {getRecipientNames(msg.recipientIds)}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-gray-400">
                                                                {formatDate(msg.date)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm truncate mb-1">{msg.subject}</p>
                                                        <p className="text-xs text-gray-400 dark:text-sushi-muted line-clamp-1 font-normal">
                                                            {msg.content}
                                                        </p>
                                                        <div className="mt-2 flex justify-between items-center">
                                                            {/* Reaction Indicator Sent */}
                                                            <div>
                                                                {msg.reactions && msg.reactions.length > 0 && (
                                                                    <span className="text-[10px] bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-full text-gray-500 flex items-center gap-1">
                                                                        👍 {msg.reactions.length}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                {msg.readBy.length > 0 ? (
                                                                    <><Check className="w-3 h-3 text-sushi-gold" /> Leído por {msg.readBy.length}</>
                                                                ) : (
                                                                    <><Check className="w-3 h-3" /> No leído</>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* COMPOSE VIEW */}
                            {activeTab === 'COMPOSE' && (
                                <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-black/10">
                                    <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center gap-2">
                                        <button onClick={() => setActiveTab('INBOX')} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                                            <Reply className="w-5 h-5" />
                                        </button>
                                        <h4 className="font-bold text-gray-900 dark:text-white">Nuevo Mensaje</h4>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {/* Recipients */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Para:</label>
                                            <div className="relative mb-2">
                                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar destinatario..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:border-sushi-gold outline-none dark:text-white"
                                                />
                                            </div>
                                            <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-black/20 divide-y divide-gray-100 dark:divide-white/5">
                                                {filteredRecipients.map(recipient => (
                                                    <div
                                                        key={recipient.id}
                                                        onClick={() => toggleRecipient(recipient.id)}
                                                        className={`p-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 ${composeRecipients.includes(recipient.id) ? 'bg-sushi-gold/10' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${composeRecipients.includes(recipient.id) ? 'bg-sushi-gold border-sushi-gold text-white' : 'border-gray-300 dark:border-white/20 bg-white dark:bg-white/5'}`}>
                                                                {composeRecipients.includes(recipient.id) && <Check className="w-3 h-3" />}
                                                            </div>
                                                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                                                {recipient.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{recipient.name}</p>
                                                                <p className="text-[10px] text-gray-500">{recipient.role}</p>
                                                            </div>
                                                        </div>
                                                        {composeRecipients.includes(recipient.id) && <Check className="w-4 h-4 text-sushi-gold" />}
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-right text-gray-400 mt-1">
                                                {composeRecipients.length} seleccionados
                                            </p>
                                        </div>

                                        {/* Subject */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Asunto:</label>
                                            <input
                                                type="text"
                                                placeholder="Escribe el asunto del mensaje..."
                                                value={composeSubject}
                                                onChange={(e) => setComposeSubject(e.target.value)}
                                                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3 text-sm font-bold focus:border-sushi-gold outline-none dark:text-white"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 flex flex-col gap-2">
                                            <textarea
                                                placeholder="Escribe tu mensaje aquí..."
                                                value={composeContent}
                                                onChange={(e) => setComposeContent(e.target.value)}
                                                className="w-full h-full bg-transparent border-none resize-none outline-none text-sm dark:text-white flex-1 p-2"
                                            ></textarea>

                                            {/* ATTACHMENT PREVIEW */}
                                            {composeAttachments.length > 0 && (
                                                <div className="flex gap-2 overflow-x-auto p-2 border-t border-gray-100 dark:border-white/5">
                                                    {composeAttachments.map((att, idx) => (
                                                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 group flex-shrink-0">
                                                            <img src={att} className="w-full h-full object-cover" />
                                                            <button
                                                                onClick={() => setComposeAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                                className="absolute top-0 right-0 p-0.5 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 flex gap-4">
                                        <label className="p-3 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                            <Paperclip className="w-4 h-4" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (ev) => {
                                                            if (ev.target?.result) {
                                                                setComposeAttachments(prev => [...prev, ev.target!.result as string]);
                                                            }
                                                        };
                                                        reader.readAsDataURL(file);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </label>
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={composeRecipients.length === 0 || !composeSubject.trim() || !composeContent.trim()}
                                            className="flex-1 bg-sushi-gold text-sushi-black py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-sushi-goldhover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Send className="w-4 h-4" /> Enviar Mensaje
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'READ' && selectedMessage && (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center gap-2 bg-gray-50 dark:bg-black/20">
                                        <button onClick={() => setActiveTab(selectedMessage.senderId === myId ? 'SENT' : 'INBOX')} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                                            <Reply className="w-5 h-5" />
                                        </button>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 dark:text-white truncate">{selectedMessage.subject}</h4>
                                            <p className="text-[10px] text-gray-500">{formatDate(selectedMessage.date)}</p>
                                        </div>
                                    </div>

                                    <div className="p-6 overflow-y-auto flex-1 text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap flex flex-col">
                                        <div className="flex-1">
                                            {selectedMessage.content}
                                        </div>

                                        {/* ATTACHMENTS */}
                                        {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                                    <Paperclip className="w-3 h-3" /> Adjuntos ({selectedMessage.attachments.length})
                                                </p>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {selectedMessage.attachments.map((att, idx) => (
                                                        <div key={idx} className="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 cursor-pointer">
                                                            <img
                                                                src={att}
                                                                className="w-full h-32 object-cover hover:scale-105 transition-transform"
                                                                onClick={() => {
                                                                    const w = window.open('');
                                                                    w?.document.write(`<img src="${att}" style="max-width:100%"/>`);
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Reactions Section */}
                                        <div className="mt-8 flex items-center gap-2">
                                            {/* Reaction Button (Only for recipients) */}
                                            {selectedMessage.recipientIds.includes(myId!) && (
                                                <button
                                                    onClick={() => handleReaction(selectedMessage, '👍')}
                                                    className={`p-2 rounded-full transition-all border ${(selectedMessage.reactions || []).some(r => r.userId === myId && r.emoji === '👍')
                                                        ? 'bg-sushi-gold text-white border-sushi-gold'
                                                        : 'bg-gray-100 dark:bg-white/10 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20 border-transparent'
                                                        }`}
                                                    title="Marcar como Leído/Entendido"
                                                >
                                                    <ThumbsUp className="w-5 h-5" />
                                                </button>
                                            )}

                                            {/* Display Reactions */}
                                            {selectedMessage.reactions && selectedMessage.reactions.length > 0 && (
                                                <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-full px-3 py-1">
                                                    <span className="text-sm">👍</span>
                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                                        {selectedMessage.reactions.length}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex flex-col gap-4">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="text-xs font-bold text-gray-600 dark:text-sushi-muted">
                                                {selectedMessage.senderId === myId
                                                    ? `Para: ${getRecipientNames(selectedMessage.recipientIds)}`
                                                    : `De: ${getSenderName(selectedMessage.senderId)}`
                                                }
                                            </span>
                                        </div>

                                        {/* QUICK REPLY (Only if I am NOT the sender) */}
                                        {selectedMessage.senderId !== myId && (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Respuesta rápida..."
                                                    className="flex-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-sushi-gold dark:text-white"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = e.currentTarget.value;
                                                            if (!val.trim()) return;
                                                            const newMessage: InternalMessage = {
                                                                id: generateUUID(),
                                                                senderId: myId!,
                                                                recipientIds: [selectedMessage.senderId],
                                                                subject: `RE: ${selectedMessage.subject}`,
                                                                content: val,
                                                                date: new Date().toISOString(),
                                                                readBy: [],
                                                                priority: 'NORMAL'
                                                            };
                                                            setMessages([newMessage, ...messages]);
                                                            e.currentTarget.value = '';
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
                                                                id: generateUUID(),
                                                                senderId: myId!,
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
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
