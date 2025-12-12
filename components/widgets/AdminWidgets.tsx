
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { View, CashShift, InventorySession, SanctionRecord, Employee, OvertimeRecord, User, EmployeeNotice, ChecklistSnapshot, BudgetRequest } from '../../types';
import { Users, DollarSign, Wallet, TrendingUp, Plus, Clock, Box, AlertTriangle, Mail, Bell, Calendar as CalIcon, Trash2, CheckCircle2, X, Eye, ThumbsUp, ThumbsDown, FileText } from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper'; // Added AlertTriangle, CheckCircle2

export { CalendarWidget } from './CalendarWidget';

// Reusable Stat Card (internal)
const StatCard = ({ title, value, sub, icon: Icon, colorClass }: any) => (
    <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 hover:border-sushi-gold/30 transition-all shadow-sm h-full">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-gray-500 dark:text-sushi-muted text-xs font-bold uppercase tracking-wider">{title}</p>
                <h3 className="text-3xl font-serif text-gray-900 dark:text-white mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg bg-gray-50 dark:bg-white/5 ${colorClass}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-sushi-muted">{sub}</p>
    </div>
);

export const StaffWidget = ({ count }: { count: number }) => (
    <WidgetWrapper>
        <StatCard title="Staff Activo" value={count} sub="Empleados en nómina" icon={Users} colorClass="text-blue-500" />
    </WidgetWrapper>
);



export const CashWidget = ({ openCashShift, cashBalance, formatMoney }: { openCashShift?: CashShift, cashBalance: number, formatMoney: (v: number) => string }) => (
    <WidgetWrapper>
        <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 hover:border-sushi-gold/30 transition-all shadow-sm relative overflow-hidden h-full">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-gray-500 dark:text-sushi-muted text-xs font-bold uppercase tracking-wider">Caja Activa (Efectivo)</p>
                        {openCashShift && (
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                        )}
                    </div>
                    <h3 className="text-3xl font-serif text-gray-900 dark:text-white mt-1">
                        {openCashShift ? formatMoney(cashBalance) : 'CERRADA'}
                    </h3>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 text-yellow-500">
                    <Wallet className="w-6 h-6" />
                </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-sushi-muted relative z-10">
                {openCashShift ? 'Turno en curso' : 'Requiere Apertura'}
            </p>
            {openCashShift && <div className="absolute inset-0 bg-green-500/5 z-0 pointer-events-none"></div>}
        </div>
    </WidgetWrapper>
);

export const KitchenWidget = ({ openInventory }: { openInventory?: InventorySession }) => (
    <WidgetWrapper>
        <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm relative overflow-hidden group h-full">
            <div className={`absolute top-0 right-0 p-20 rounded-full blur-3xl -mr-10 -mt-10 transition-colors ${openInventory ? 'bg-green-500/10' : 'bg-red-500/10'}`}></div>
            <div className="relative z-10">
                <p className="text-gray-500 dark:text-sushi-muted text-xs font-bold uppercase tracking-wider">Estado Cocina</p>
                <h3 className="text-xl font-serif text-gray-900 dark:text-white mt-2 flex items-center gap-2">
                    {openInventory ? (
                        <>
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            Inventario Abierto
                        </>
                    ) : (
                        <>
                            <span className="w-3 h-3 rounded-full bg-red-500"></span>
                            Turno Cerrado
                        </>
                    )}
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                    {openInventory
                        ? `Apertura: ${openInventory.startTime} (${openInventory.openedBy})`
                        : 'No hay servicio activo registrado.'}
                </p>
            </div>
        </div>
    </WidgetWrapper>
);

const QuickAction = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 p-4 rounded-xl hover:border-sushi-gold hover:shadow-lg hover:shadow-sushi-gold/10 transition-all group"
    >
        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-full text-gray-500 dark:text-sushi-muted group-hover:bg-sushi-gold group-hover:text-sushi-black transition-colors">
            <Icon className="w-6 h-6" />
        </div>
        <span className="text-xs font-bold text-gray-700 dark:text-white uppercase tracking-wide group-hover:text-sushi-gold">{label}</span>
    </button>
);

export const QuickActionsWidget = ({ setView }: { setView: (v: View) => void }) => (
    <WidgetWrapper title="Accesos Rápidos">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <QuickAction icon={Plus} label="Nuevo Empleado" onClick={() => setView(View.EMPLOYEES)} />
            <QuickAction icon={Clock} label="Registrar Turno" onClick={() => setView(View.OVERTIME)} />
            <QuickAction icon={Box} label="Inventario" onClick={() => setView(View.INVENTORY)} />
            <QuickAction icon={AlertTriangle} label="Nueva Sanción" onClick={() => setView(View.SANCTIONS)} />
        </div>
    </WidgetWrapper>
);



// Helper type for unified feed
type FeedItem = {
    id: string;
    type: 'SANCTION' | 'MESSAGE' | 'SYSTEM' | 'ALERT';
    date: Date;
    title: string;
    subtitle: string;
    user?: string;
    isUnread?: boolean;
    icon?: any;
    colorClass?: string;
    rawItem?: any; // To pass to handlers
    status?: string; // For Sanctions
}

export const ActivityFeedWidget = ({ recentSanctions, employees, setView, currentUser, messages = [], cashShifts = [], inventory = [], checklistSnapshots = [], notices = [], onMarkNoticeSeen, onApproveSanction, budgetRequests = [], sharedDocs = [], onViewDoc }: { recentSanctions: SanctionRecord[], employees: Employee[], setView: (v: View) => void, currentUser: User | null, messages?: any[], cashShifts?: CashShift[], inventory?: InventorySession[], checklistSnapshots?: ChecklistSnapshot[], notices?: EmployeeNotice[], onMarkNoticeSeen?: (id: string) => void, onApproveSanction?: (id: string, approved: boolean) => void, budgetRequests?: BudgetRequest[], sharedDocs?: any[], onViewDoc?: (doc: any) => void }) => {
    const [selectedItem, setSelectedItem] = React.useState<FeedItem | null>(null);

    // Combine and sort feed items
    const feedItems: FeedItem[] = React.useMemo(() => {
        const fmt = (v: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
        const items: FeedItem[] = [];

        // -1. Shared Docs (High Priority for visibility)
        sharedDocs.forEach((doc: any) => {
            const isUnread = !doc.readBy?.includes(currentUser?.id || '');
            if (isUnread) {
                items.push({
                    id: `doc-${doc.id}`,
                    type: 'SYSTEM', // Using SYSTEM but with File Icon
                    date: new Date(doc.updatedAt),
                    title: 'Documento Compartido',
                    subtitle: `${doc.title} - Compartido contigo.`,
                    user: 'Oficina',
                    icon: FileText, // Needs import
                    colorClass: 'bg-sushi-gold text-sushi-black border-sushi-gold animate-pulse',
                    isUnread: true,
                    rawItem: doc
                });
            }
        });

        // 0. BUDGET REQUESTS (URGENT)
        const pendingBudgets = budgetRequests.filter(r => r.status === 'PENDING');
        pendingBudgets.forEach(r => {
            const isMine = currentUser && r.requestedBy === currentUser.id;
            const canApprove = currentUser && (currentUser.permissions?.approveFinance || currentUser.permissions?.superAdmin);

            if (isMine || canApprove) {
                items.push({
                    id: r.id,
                    type: 'ALERT', // Reusing ALERT to signify urgency
                    date: new Date(r.requestedAt),
                    title: isMine ? 'SOLICITUD ENVIADA' : 'SOLICITUD DE DINERO',
                    subtitle: `${fmt(r.amount)} - ${r.reason}. ${isMine ? 'Esperando aprobación.' : 'Requiere Aprobación.'}`,
                    user: 'Finanzas',
                    icon: DollarSign,
                    colorClass: isMine ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-red-600 animate-pulse text-white',
                    isUnread: true,
                    rawItem: r
                });
            }
        });

        // 1. Sanctions
        recentSanctions.forEach(s => {
            const emp = employees.find(e => e.id === s.employeeId);
            // Show if not deleted. Show PENDING ones too.
            // If PENDING, show as interactive?
            const isPending = s.status === 'PENDING_APPROVAL';

            items.push({
                id: s.id,
                type: 'SANCTION',
                date: new Date(s.date),
                title: isPending ? `SOLICITUD: ${s.type}` : emp?.name || 'Desconocido',
                subtitle: s.description,
                user: emp?.name,
                colorClass: s.type === 'STRIKE' ? 'bg-red-500' : 'bg-blue-500',
                isUnread: isPending, // Treat pending as unread/actionable
                rawItem: s,
                status: s.status
            });
        });

        // 2. Unread/Recent Messages
        // Filter for messages where I am a recipient
        const myMessages = messages.filter(m => m.recipientIds.includes(currentUser?.id || ''));
        myMessages.forEach(m => {
            const isUnread = !m.readBy?.includes(currentUser?.id || '');
            // Only show recent or unread AND NOT IN FUTURE
            const isFuture = new Date(m.date).getTime() > Date.now() + 60000; // 1 min buffer
            if ((isUnread || new Date(m.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) && !isFuture) {
                items.push({
                    id: m.id,
                    type: 'MESSAGE',
                    date: new Date(m.date),
                    title: m.subject,
                    subtitle: m.content,
                    user: 'Mensajería', // Sender name would be better if available
                    icon: Mail,
                    colorClass: 'bg-indigo-500',
                    isUnread: isUnread
                });
            }
        });

        // 3. System Events (Cash Shifts)
        // 3. System Events (Cash Shifts)
        cashShifts.forEach(shift => {
            // Open event
            const openDate = new Date(`${shift.date}T${shift.openTime}`);
            items.push({
                id: `open-${shift.id}`,
                type: 'SYSTEM',
                date: isNaN(openDate.getTime()) ? new Date(shift.date) : openDate,
                title: 'Caja Diaria Abierta',
                subtitle: `Apertura por ${shift.openedBy}`,
                user: 'Sistema',
                icon: Box,
                colorClass: 'bg-green-500',
                isUnread: false
            });

            // Close event (if closed)
            if (shift.closeTime) {
                const closeDate = new Date(`${shift.date}T${shift.closeTime}`);
                items.push({
                    id: `close-${shift.id}`,
                    type: 'SYSTEM',
                    date: isNaN(closeDate.getTime()) ? new Date(shift.date) : closeDate,
                    title: 'Caja Diaria Cerrada',
                    subtitle: `Cierre con $${shift.finalCash || 0}`,
                    user: 'Sistema',
                    icon: Box,
                    colorClass: 'bg-gray-500',
                    isUnread: false
                });
            }
        });

        // 4. Inventory Events
        inventory.forEach(inv => {
            const openDate = new Date(`${inv.date}T${inv.startTime || '00:00'}`);
            items.push({
                id: `open-inv-${inv.id}`,
                type: 'SYSTEM',
                date: isNaN(openDate.getTime()) ? new Date(inv.date) : openDate,
                title: 'Inventario Abierto',
                subtitle: `Iniciado por ${inv.openedBy}`,
                user: 'Sistema',
                icon: Box,
                colorClass: 'bg-orange-500',
                isUnread: false
            });

            if (inv.status === 'CLOSED' && inv.endTime) {
                const closeDate = new Date(`${inv.date}T${inv.endTime}`);
                items.push({
                    id: `close-inv-${inv.id}`,
                    type: 'SYSTEM',
                    date: isNaN(closeDate.getTime()) ? new Date(inv.date) : closeDate,
                    title: 'Inventario Cerrado',
                    subtitle: `Cerrado por ${inv.closedBy || 'Sistema'}`,
                    user: 'Sistema',
                    icon: Box,
                    colorClass: 'bg-gray-500',
                    isUnread: false
                });
            }
        });

        // 5. Employee Alerts
        // 5. Employee Alerts
        notices.forEach(notice => {
            const emp = employees.find(e => e.id === notice.employeeId);
            const isUnread = currentUser ? (!notice.readBy || !notice.readBy.includes(currentUser.id)) : false;
            const typeLabel = notice.type === 'LATE' ? 'Llegada Tarde' : notice.type === 'ABSENCE' ? 'Falta' : 'Urgencia';

            items.push({
                id: notice.id,
                type: 'ALERT',
                date: new Date(notice.date),
                title: `ALERTA: ${typeLabel}`,
                subtitle: `${emp?.name || 'Empleado'}: ${notice.content}`,
                user: emp?.name,
                icon: AlertTriangle,
                colorClass: 'bg-red-500',
                isUnread: isUnread,
                rawItem: notice
            });
        });

        // 6. Checklist Completions
        checklistSnapshots.forEach(snap => {
            const emp = employees.find(e => e.id === snap.employeeId);
            const snapDate = new Date(`${snap.date}T${snap.finalizedAt}`);
            if (!isNaN(snapDate.getTime()) && (new Date().getTime() - snapDate.getTime() < 48 * 60 * 60 * 1000)) {
                items.push({
                    id: `checklist-${snap.id}`,
                    type: 'SYSTEM',
                    date: snapDate,
                    title: 'Checklist Finalizada',
                    subtitle: `Completada por ${emp?.name || snap.finalizedBy}`,
                    user: 'Sistema',
                    icon: CheckCircle2,
                    colorClass: 'bg-sushi-gold',
                    isUnread: false
                });
            }
        });

        // Helper to safely parse dates
        const parseSafely = (d: any): number => {
            if (d instanceof Date) return d.getTime();
            if (typeof d === 'string') {
                const t = new Date(d).getTime();
                if (!isNaN(t)) return t;
                const parts = d.split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts.map(Number);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        return new Date(year, month - 1, day).getTime();
                    }
                }
            }
            return 0;
        };

        // Deduplicate items by ID
        const uniqueItems = Array.from(new Map(items.map(item => [item.id, item])).values());

        // Sort items by date descending (Newest first)
        return uniqueItems.filter(item => {
            const t = parseSafely(item.date);
            return t <= Date.now() + 60000;
        }).sort((a, b) => {
            const timeA = parseSafely(a.date);
            const timeB = parseSafely(b.date);
            return timeB - timeA;
        }).slice(0, 15);
    }, [recentSanctions, messages, cashShifts, inventory, notices, checklistSnapshots, currentUser, employees, budgetRequests]);

    const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    const handleItemClick = (item: FeedItem) => {
        setSelectedItem(item);
        if (item.type === 'ALERT' && item.title === 'SOLICITUD DE DINERO') {
            setView(View.BUDGET_REQUESTS);
        } else if (item.title === 'Documento Compartido' && onViewDoc) {
            onViewDoc(item.rawItem);
        }
    };

    return (
        <WidgetWrapper>
            <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm h-[600px] flex flex-col relative">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                    <span>Últimas Novedades</span>
                    <button onClick={() => setView(View.SANCTIONS)} className="text-xs text-sushi-gold hover:underline">Ver todo</button>
                </h3>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                    {feedItems.length === 0 && <p className="text-sm text-gray-500 dark:text-sushi-muted italic">No hay actividad reciente.</p>}

                    {feedItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className={`flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 ${item.isUnread ? 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-500/20' : 'border-b border-gray-100 dark:border-white/5 last:border-0'}`}
                        >
                            {/* Icon Logic */}
                            {item.type === 'SANCTION' || item.type === 'SYSTEM' ? (
                                <div className={`mt-1.5 w-2 h-2 rounded-full min-w-[8px] ${item.colorClass}`}></div>
                            ) : (
                                <div className={`mt-1 p-1 rounded-md ${item.colorClass} text-white ${item.type === 'ALERT' ? 'animate-pulse' : ''}`}>
                                    {item.icon && <item.icon className="w-3 h-3" />}
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <p className={`text-sm font-bold truncate ${item.isUnread ? 'text-yellow-800 dark:text-yellow-500' : 'text-gray-900 dark:text-white'}`}>
                                        {item.title}
                                    </p>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                        {item.date.toLocaleDateString()} {item.date.getHours()}:{String(item.date.getMinutes()).padStart(2, '0')}
                                    </span>
                                </div>
                                <p className={`text-xs ${item.isUnread ? 'text-yellow-700 dark:text-yellow-400 font-medium' : 'text-gray-500 dark:text-sushi-muted'} line-clamp-2`}>
                                    {item.subtitle}
                                </p>
                                {item.status === 'PENDING_APPROVAL' && (
                                    <span className="inline-block mt-1 text-[9px] bg-yellow-100 text-yellow-800 px-1.5 rounded font-bold">REQUISITOS APROBACIÓN</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* DETAIL MODAL */}
                {
                    selectedItem && (
                        <div className="absolute inset-0 z-50 bg-white dark:bg-sushi-dark flex flex-col p-6 rounded-xl animate-fade-in-up">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{selectedItem.title}</h3>
                                <button onClick={(e) => { e.stopPropagation(); setSelectedItem(null); }} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {selectedItem.date.toLocaleString()}
                                    {selectedItem.user && <span className="font-bold text-sushi-gold">• {selectedItem.user}</span>}
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-white/5">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedItem.subtitle}</p>
                                </div>

                                {/* ACTIONS */}
                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                    {selectedItem.type === 'ALERT' && selectedItem.isUnread && onMarkNoticeSeen && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onMarkNoticeSeen(selectedItem.id); setSelectedItem(null); }}
                                            className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            <Eye className="w-4 h-4" /> Marcar como Visto
                                        </button>
                                    )}
                                    {selectedItem.type === 'SANCTION' && selectedItem.status === 'PENDING_APPROVAL' && onApproveSanction && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onApproveSanction(selectedItem.id, true); setSelectedItem(null); }}
                                                className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                <ThumbsUp className="w-4 h-4" /> Aprobar
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onApproveSanction(selectedItem.id, false); setSelectedItem(null); }}
                                                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                <ThumbsDown className="w-4 h-4" /> Rechazar
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </WidgetWrapper>
    );
}

export const CommWidget = ({ setView, handleOpenEventModal }: { setView: (v: View) => void, handleOpenEventModal: () => void }) => (
    <WidgetWrapper>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
            <button
                onClick={() => setView(View.INTERNAL_MAIL)}
                className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/5 hover:border-sushi-gold hover:bg-white dark:hover:bg-white/10 transition-all text-left group"
            >
                <div className="flex justify-between items-center mb-4">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:bg-sushi-gold group-hover:text-sushi-black transition-colors">
                        <Mail className="w-5 h-5" />
                    </div>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">Mensajería</h3>
                <p className="text-xs text-gray-500 mt-1">Correo Interno</p>
            </button>

            <button
                onClick={() => setView(View.NOTICES)}
                className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/5 hover:border-sushi-gold hover:bg-white dark:hover:bg-white/10 transition-all text-left group"
            >
                <div className="flex justify-between items-center mb-4">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400 group-hover:bg-sushi-gold group-hover:text-sushi-black transition-colors">
                        <Bell className="w-5 h-5" />
                    </div>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">Gestión disciplinaria</h3>
                <p className="text-xs text-gray-500 mt-1">Avisos de Personal</p>
            </button>

            <button
                onClick={handleOpenEventModal}
                className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/5 hover:border-sushi-gold hover:bg-white dark:hover:bg-white/10 transition-all text-left group"
            >
                <div className="flex justify-between items-center mb-4">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400 group-hover:bg-sushi-gold group-hover:text-sushi-black transition-colors">
                        <CalIcon className="w-5 h-5" />
                    </div>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">Agenda</h3>
                <p className="text-xs text-gray-500 mt-1">Eventos & Calendario</p>
            </button>
        </div>
    </WidgetWrapper>
);
