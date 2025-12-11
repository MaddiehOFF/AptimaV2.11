
import React, { useMemo, useState, useEffect } from 'react';
import { AdminTask, Employee, InventorySession, OvertimeRecord, SanctionRecord, User, View, CashShift, CalendarEvent, DashboardWidget, AbsenceRecord, InternalMessage, ChecklistSnapshot, EmployeeNotice, BudgetRequest } from '../types';
import { Plus, Calendar as CalIcon, Trash2, Settings2, Move } from 'lucide-react';
import { StaffWidget, CashWidget, KitchenWidget, QuickActionsWidget, ActivityFeedWidget, CalendarWidget } from './widgets/AdminWidgets';
import { DashboardCustomizer } from './widgets/DashboardCustomizer';

interface DashboardProps {
    employees: Employee[];
    records: OvertimeRecord[];
    tasks: AdminTask[];
    inventory: InventorySession[];
    sanctions: SanctionRecord[];
    cashShifts?: CashShift[];
    currentUser: User | null;
    setView: (view: View) => void;
    calendarEvents: CalendarEvent[];
    setCalendarEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
    absences: AbsenceRecord[];
    holidays: string[];
    messages: InternalMessage[];
    checklistSnapshots?: ChecklistSnapshot[];
    notices?: EmployeeNotice[];
    onMarkNoticeSeen?: (id: string) => void;
    onApproveSanction?: (id: string, approved: boolean) => void;
    onAddEvent?: (event: CalendarEvent) => void;
    budgetRequests?: BudgetRequest[];
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
    { id: 'staff', title: 'Staff Activo', visible: true, order: 0 },
    { id: 'cash', title: 'Caja Activa', visible: true, order: 2 },
    { id: 'kitchen', title: 'Estado Cocina', visible: true, order: 3 },
    { id: 'quick_actions', title: 'Accesos Rápidos', visible: true, order: 4 },
    { id: 'activity', title: 'Últimas Novedades', visible: true, order: 6 },
    { id: 'calendar', title: 'Calendario Dinámico', visible: true, order: 7 },
];

export const Dashboard: React.FC<DashboardProps> = ({ employees, records, tasks, inventory, sanctions, cashShifts = [], currentUser, setView, calendarEvents, setCalendarEvents, absences, holidays = [], messages = [], checklistSnapshots = [], notices = [], onMarkNoticeSeen, onApproveSanction, onAddEvent, budgetRequests = [] }) => {
    // 1. DATA CALCULATION (Keep existing logic)
    const activeEmployeesCount = useMemo(() => employees.filter(e => e.active).length, [employees]);
    const openInventory = useMemo(() => inventory.find(s => s.status === 'OPEN'), [inventory]);
    const openCashShift = useMemo(() => cashShifts.find(s => s.status === 'OPEN'), [cashShifts]);

    const cashBalance = useMemo(() => {
        if (!openCashShift) return 0;
        const cashIncome = openCashShift.transactions.filter(t => t.type === 'INCOME' && t.method === 'CASH').reduce((acc, t) => acc + t.amount, 0);
        const cashExpenses = openCashShift.transactions.filter(t => t.type === 'EXPENSE' && t.method === 'CASH').reduce((acc, t) => acc + t.amount, 0);
        return openCashShift.initialAmount + cashIncome - cashExpenses;
    }, [openCashShift]);

    const recentSanctions = useMemo(() => {
        return [...sanctions].filter(s => !s.deletedAt).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
    }, [sanctions]);

    const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    // 2. CALENDAR EVENT STATE
    const [showEventModal, setShowEventModal] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventVisibility, setNewEventVisibility] = useState<'ADMIN' | 'ALL'>('ALL');

    const handleAddEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEventTitle || !newEventDate) return;
        const newEvent: CalendarEvent = {
            id: crypto.randomUUID(),
            title: newEventTitle,
            date: newEventDate,
            createdBy: currentUser?.name || 'Admin',
            visibility: newEventVisibility
        }
        setCalendarEvents([newEvent, ...calendarEvents]);
        setNewEventTitle('');
        setNewEventDate('');
        alert('Evento creado correctamente');
    };

    const handleDeleteEvent = (id: string) => {
        if (confirm('¿Eliminar evento?')) {
            setCalendarEvents(calendarEvents.filter(e => e.id !== id));
        }
    };

    // 3. WIDGET STATE
    const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [isEditingLayout, setIsEditingLayout] = useState(false); // New Edit Mode State
    const [widgetSizes, setWidgetSizes] = useState<Record<string, '1' | '2' | '3'>>({}); // '1': 1 col, '2': 2cols, '3': full width

    const toggleWidgetSize = (id: string) => {
        setWidgetSizes(prev => {
            const current = prev[id] || '1';
            const next = current === '1' ? '2' : current === '2' ? '3' : '1';
            return { ...prev, [id]: next };
        });
    };

    useEffect(() => {
        const saved = localStorage.getItem(`sushiblack_dashboard_layout_${currentUser?.id || 'admin'}`);
        if (saved) {
            try {
                // Merge with default to ensure new widgets appear if added in code later
                const parsed: DashboardWidget[] = JSON.parse(saved);

                // Find widgets that are in DEFAULT but not in parsed (by ID)
                const missing = DEFAULT_WIDGETS.filter(d => !parsed.find(p => p.id === d.id));

                if (missing.length > 0) {
                    setWidgets([...parsed, ...missing]);
                } else {
                    setWidgets(parsed);
                }
            } catch (e) { console.error("Error loading layout", e); }
        }
    }, [currentUser]);

    const handleSaveLayout = (newWidgets: DashboardWidget[]) => {
        setWidgets(newWidgets);
        localStorage.setItem(`sushiblack_dashboard_layout_${currentUser?.id || 'admin'}`, JSON.stringify(newWidgets));
    };

    // DnD Handlers
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const onDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Optional: Hide drag image or set custom
    };

    const onDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (draggedIndex === null || draggedIndex === index) return;

        const newWidgets = [...widgets];
        const draggedItem = newWidgets[draggedIndex];
        newWidgets.splice(draggedIndex, 1);
        newWidgets.splice(index, 0, draggedItem);

        setWidgets(newWidgets);
        setDraggedIndex(index);
    };

    const onDragEnd = () => {
        setDraggedIndex(null);
        // Sync order property with array index
        const reordered = widgets.map((w, i) => ({ ...w, order: i }));
        handleSaveLayout(reordered);
    };

    // Calendar Resizing Logic
    const [calendarHeight, setCalendarHeight] = useState(() => {
        const saved = localStorage.getItem(`sushiblack_dashboard_calendar_height_${currentUser?.id || 'admin'}`);
        return saved ? parseInt(saved) : 500;
    });

    const handleResizeCalendar = (e: React.MouseEvent) => {
        const startY = e.clientY;
        const startHeight = calendarHeight;

        const doDrag = (ev: MouseEvent) => {
            const newHeight = startHeight + (ev.clientY - startY);
            if (newHeight > 300 && newHeight < 1200) {
                setCalendarHeight(newHeight);
            }
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
            localStorage.setItem(`sushiblack_dashboard_calendar_height_${currentUser?.id || 'admin'}`, calendarHeight.toString());
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    };

    const getWidgetSpan = (id: string) => {
        const size = widgetSizes[id] || '1';
        // Force specific widgets to behave well if needed, or just respect size
        // If user manually resized, respect it.
        if (widgetSizes[id]) {
            switch (size) {
                case '2': return 'md:col-span-2';
                case '3': return 'md:col-span-4'; // Full width in 4-col grid
                default: return 'col-span-1';
            }
        }

        // Defaults if not resized
        switch (id) {
            case 'quick_actions':
            case 'chart': return 'col-span-1 lg:col-span-2';
            case 'activity': return 'col-span-1 lg:col-span-1 row-span-2';
            case 'calendar': return 'col-span-1 lg:col-span-4'; // Auto height via style
            default: return 'col-span-1';
        }
    };

    // 4. RENDER HELPERS
    const renderWidget = (widget: DashboardWidget, index: number) => {
        if (!widget.visible) return null;

        let content = null;
        switch (widget.id) {
            case 'staff':
                content = (
                    <div onClick={() => !isEditingLayout && setView(View.EMPLOYEES)} className={!isEditingLayout ? "cursor-pointer h-full" : "h-full"}>
                        <StaffWidget count={activeEmployeesCount} />
                    </div>
                );
                break;
            case 'cash':
                content = (
                    <div onClick={() => !isEditingLayout && setView(View.CASH_REGISTER)} className={!isEditingLayout ? "cursor-pointer h-full" : "h-full"}>
                        <CashWidget openCashShift={openCashShift} cashBalance={cashBalance} formatMoney={formatMoney} />
                    </div>
                );
                break;
            case 'kitchen':
                content = (
                    <div onClick={() => !isEditingLayout && setView(View.INVENTORY)} className={!isEditingLayout ? "cursor-pointer h-full" : "h-full"}>
                        <KitchenWidget openInventory={openInventory} />
                    </div>
                );
                break;

            case 'quick_actions': content = <QuickActionsWidget setView={setView} />; break;

            case 'activity': content = <ActivityFeedWidget
                recentSanctions={recentSanctions}
                employees={employees}
                setView={setView}
                currentUser={currentUser}
                messages={messages}
                cashShifts={cashShifts}
                inventory={inventory}
                checklistSnapshots={checklistSnapshots}
                notices={notices}
                onMarkNoticeSeen={onMarkNoticeSeen}
                onApproveSanction={onApproveSanction}
                budgetRequests={budgetRequests}
            />; break;

            case 'calendar':
                const canViewPrivate = ['ADMIN', 'MANAGER', 'COORDINADOR', 'GERENTE'].includes(currentUser?.role || '');
                // Resizable Calendar Logic
                content = (
                    <div className="flex flex-col relative h-full bg-white dark:bg-sushi-dark rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-white/5" style={{ height: widgetSizes['calendar'] ? 'auto' : `${calendarHeight}px` }}> {/* Allow auto height if grid logic changes, but for now fixed height or custom */}
                        <div className="flex-1 overflow-hidden relative">
                            <CalendarWidget
                                events={calendarEvents.filter(e =>
                                    e.visibility === 'ALL' ||
                                    (e.visibility === 'ADMIN' && canViewPrivate)
                                )}
                                records={records}
                                cashShifts={cashShifts}
                                absences={absences.filter(a => a.type !== 'FRANCO')}
                                daysOff={absences.filter(a => a.type === 'FRANCO')}
                                holidays={holidays}
                                employees={employees}
                                onAddEvent={onAddEvent}
                            />
                        </div>
                        {/* Resizer Handle */}
                        {!isEditingLayout && (
                            <div
                                className="w-full h-4 absolute -bottom-2 cursor-ns-resize flex items-center justify-center group z-20 hover:h-6 transition-all"
                                onMouseDown={handleResizeCalendar}
                            >
                                <div className="w-20 h-1 bg-gray-300 dark:bg-white/20 rounded-full group-hover:bg-sushi-gold transition-colors shadow-sm"></div>
                            </div>
                        )}
                    </div>
                );
                break;

            default: return null;
        }

        const isDraggable = isEditingLayout;

        return (
            <div
                key={widget.id}
                draggable={isDraggable}
                onDragStart={(e) => isDraggable && onDragStart(e, index)}
                onDragOver={(e) => isDraggable && onDragOver(e, index)}
                onDragEnd={onDragEnd}
                className={`${getWidgetSpan(widget.id)} relative group transition-all duration-300 ease-in-out bg-transparent rounded-2xl
                    ${draggedIndex === index ? 'opacity-40 scale-95 ring-2 ring-sushi-gold border-dashed' : ''}
                    ${isEditingLayout ? 'border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-sushi-gold cursor-grab animate-pulse-slow' : 'hover:scale-[1.01] hover:shadow-lg'}
                `}
            >
                {/* Drag Handle - Only Visible in Edit Mode */}
                {/* Drag Handle - Only Visible in Edit Mode */}
                {isEditingLayout && (
                    <div className="absolute inset-x-0 top-0 h-10 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-t-2xl cursor-grab active:cursor-grabbing group-hover:bg-black/20 transition-colors">
                        <div className="bg-sushi-black text-sushi-gold p-1 rounded-full shadow-xl transform group-hover:scale-110 transition-transform flex items-center gap-2 px-3">
                            <Move size={16} />
                            <div className="h-4 w-px bg-white/20"></div>
                            {/* Resize Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleWidgetSize(widget.id); }}
                                className="text-xs font-bold text-white hover:text-sushi-gold px-2 py-1 bg-white/10 rounded uppercase"
                            >
                                {widgetSizes[widget.id] === '2' ? '2x' : widgetSizes[widget.id] === '3' ? 'Full' : '1x'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Content Overlay in Edit Mode to prevent clicks */}
                <div className={isEditingLayout ? 'pointer-events-none opacity-80 blur-[1px] transition-all' : ''}>
                    {content}
                </div>
            </div>
        );
    };

    const date = useMemo(() => new Date(), []);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-serif text-gray-900 dark:text-white">
                        Hola, {currentUser?.name?.split(' ')[0]} <span className="text-xs text-sushi-gold font-mono font-bold tracking-wide border border-sushi-gold/30 bg-sushi-gold/10 px-1.5 py-0.5 rounded">(v2.11)</span>
                    </h1>
                    <p className="text-gray-500 dark:text-sushi-muted text-sm">{date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCustomizing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-bold hover:border-sushi-gold transition-colors text-gray-700 dark:text-gray-300"
                    >
                        <Settings2 className="w-4 h-4" />
                        Personalizar
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-500 uppercase">Online</span>
                    </div>
                </div>
            </div>

            {/* Edit Mode Toggle Bar */}
            <div className="flex justify-end gap-2">
                <button
                    onClick={() => setIsEditingLayout(!isEditingLayout)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${isEditingLayout ? 'bg-sushi-gold text-sushi-black border-sushi-gold shadow-lg scale-105' : 'bg-transparent text-gray-500 dark:text-gray-400 border-dashed border-gray-300 dark:border-white/20 hover:text-sushi-gold hover:border-sushi-gold'}`}
                >
                    <Move size={16} />
                    {isEditingLayout ? 'Terminar Edición' : 'Organizar Widgets'}
                </button>
            </div>

            {/* Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-min pb-20 grid-flow-dense">
                {widgets.filter(w => w.visible).map((widget, index) => renderWidget(widget, index))}
            </div>

            {/* Customizer Modal */}
            <DashboardCustomizer
                isOpen={isCustomizing}
                onClose={() => setIsCustomizing(false)}
                currentWidgets={widgets}
                onSave={handleSaveLayout}
            />

            {/* Event Modal (Legacy) */}
            {showEventModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col max-h-[90vh] animate-fade-in-up">
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <CalIcon className="w-5 h-5 text-sushi-gold" />
                                Gestión de Eventos
                            </h3>
                            <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-red-500"><Plus className="w-6 h-6 rotate-45" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleAddEvent} className="space-y-4 mb-8 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">Nuevo Evento</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Fecha</label>
                                        <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Visibilidad</label>
                                        <select
                                            value={newEventVisibility}
                                            onChange={(e) => setNewEventVisibility(e.target.value as 'ALL' | 'ADMIN')}
                                            className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white"
                                        >
                                            <option value="ALL">Todo el Staff</option>
                                            <option value="ADMIN">Solo Admins/Coord</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Título</label>
                                    <input type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Ej. Reunión General" required />
                                </div>
                                <button type="submit" className="w-full bg-sushi-gold text-sushi-black font-bold py-2 rounded hover:bg-sushi-goldhover transition-colors">Crear Evento</button>
                            </form>
                            <div>
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">Próximos Eventos</h4>
                                <div className="space-y-2">
                                    {calendarEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(ev => (
                                        <div key={ev.id} className={`flex justify-between items-center p-3 border rounded ${ev.visibility === 'ADMIN' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                                            <div>
                                                <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                                    {ev.title}
                                                    {ev.visibility === 'ADMIN' && <span className="text-[10px] bg-red-100 text-red-800 px-1 rounded border border-red-200">PRIVADO</span>}
                                                </p>
                                                <p className="text-xs text-gray-500">{new Date(ev.date).toLocaleDateString()} • {ev.visibility === 'ALL' ? 'Visible para todos' : 'Solo Admins y Coordinadores'}</p>
                                            </div>
                                            <button onClick={() => handleDeleteEvent(ev.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {calendarEvents.length === 0 && <p className="text-xs text-gray-400 italic">No hay eventos registrados.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
