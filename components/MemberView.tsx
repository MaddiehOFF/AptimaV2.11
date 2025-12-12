
import React, { useState, useEffect } from 'react';
import { Employee, OvertimeRecord, AbsenceRecord, Task, SanctionRecord, View, ForumPost, ChecklistSnapshot, CalendarEvent, DashboardWidget, RolePermissions, PermissionKey, EmployeeNotice, CashShift, InventorySession, WalletTransaction, PayrollMovement, MeritType, AssignedMerit } from '../types';
import { supabase } from '../supabaseClient';
import { TaskChecklist } from './TaskChecklist';
import { Clock, Wallet, AlertTriangle, Calendar, User as UserIcon, Bell, CreditCard, ChevronLeft, ChevronRight, Hash, Phone, MapPin, Building, Briefcase, CheckCircle2, UserCheck, X, Eye, EyeOff, Box, ArrowRight, Settings2, Megaphone, Siren, Trophy } from 'lucide-react';
import { AIReport } from './AIReport';
import { RankBadge } from './EmployeeManagement';
import { ForumBoard } from './ForumBoard';
import { ChecklistWidget, InventoryWidget, QuickProfileWidget, PendingPaymentWidget, NextPaymentWidget } from './widgets/MemberWidgets';
import { ActivityFeedWidget, CalendarWidget } from './widgets/AdminWidgets';
import { DashboardCustomizer } from './widgets/DashboardCustomizer';
import { calculateAccruedSalary, getLedgerAccrual } from '../utils/payrollUtils';
import { MeritIcon } from './MeritIcon';

interface MemberViewProps {
    currentView: View;
    member: Employee;
    records: OvertimeRecord[];
    absences: AbsenceRecord[];
    sanctions: SanctionRecord[];
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    posts?: ForumPost[];
    setPosts?: React.Dispatch<React.SetStateAction<ForumPost[]>>;
    setView?: (view: View) => void;
    setChecklistSnapshots?: React.Dispatch<React.SetStateAction<ChecklistSnapshot[]>>;
    checklistSnapshots?: ChecklistSnapshot[];
    holidays?: string[];
    onUpdateSanction?: (sanction: SanctionRecord) => void;
    calendarEvents?: CalendarEvent[];
    rolePermissions: RolePermissions;
    onAlert?: (notice: EmployeeNotice) => void;
    // Props for ActivityFeedWidget (Coordinator)
    employees?: Employee[];
    notices?: EmployeeNotice[];
    onMarkNoticeSeen?: (id: string) => void;
    onApproveSanction?: (id: string, approved: boolean) => void;
    cashShifts?: CashShift[];
    inventory?: InventorySession[];
    messages?: any[];
    transactions?: WalletTransaction[];
    payrollMovements?: PayrollMovement[];
}

// Reuse InfoItem for consistency
const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value?: string | number }) => (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/5">
        <div className="p-2 bg-white dark:bg-white/5 rounded-full text-gray-400 dark:text-sushi-muted">
            <Icon className="w-4 h-4" />
        </div>
        <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-sushi-muted font-bold">{label}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{value || '-'}</p>
        </div>
    </div>
);

const DEFAULT_MEMBER_WIDGETS: DashboardWidget[] = [
    { id: 'checklist', title: 'Checklist de Tareas', visible: true, order: 0 },
    // { id: 'merits', title: 'Mis Logros', visible: true, order: 1 }, // REMOVED BY REQUEST
    { id: 'inventory', title: 'Acceso a Inventario', visible: true, order: 2 },
    { id: 'profile', title: 'Perfil Rápido', visible: true, order: 3 },
    { id: 'pending_payment', title: 'Pendiente de Cobro', visible: true, order: 4 },
    { id: 'next_payment', title: 'Próximo Pago', visible: true, order: 5 },
];

export const MemberView: React.FC<MemberViewProps> = ({ currentView, member, records, absences, sanctions, tasks, setTasks, posts, setPosts, setView, setChecklistSnapshots, checklistSnapshots, holidays = [], onUpdateSanction, calendarEvents = [], rolePermissions, onAlert, employees, notices, onMarkNoticeSeen, onApproveSanction, cashShifts, inventory, messages, transactions = [], payrollMovements = [] }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationsLastSeenCount, setNotificationsLastSeenCount] = useState(() => {
        if (typeof window !== 'undefined') {
            return parseInt(localStorage.getItem(`sushiblack_notif_seen_count_${member.id}`) || '0');
        }
        return 0;
    });
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);

    // Alert State
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertType, setAlertType] = useState<'LATE' | 'ABSENCE' | 'OTHER'>('LATE');
    const [alertContent, setAlertContent] = useState('');

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // Merits State
    const [meritTypes, setMeritTypes] = useState<MeritType[]>([]);
    const [viewingMerit, setViewingMerit] = useState<{ assigned: AssignedMerit, type: MeritType } | null>(null);

    useEffect(() => {
        const loadMeritTypes = async () => {
            const { data } = await supabase.from('app_settings').select('data').eq('id', 'merit_types').single();
            if (data && data.data && data.data.types) {
                setMeritTypes(data.data.types);
            }
        };
        loadMeritTypes();
    }, []);

    const handleSendAlert = () => {
        if (!onAlert) return;
        if (!alertContent.trim()) {
            alert('Por favor describe la situación.');
            return;
        }

        const newNotice: EmployeeNotice = {
            id: generateUUID(),
            employeeId: member.id,
            type: alertType,
            content: alertContent,
            date: new Date().toISOString(),
            status: 'PENDING',
            readBy: []
        };

        onAlert(newNotice);
        setIsAlertModalOpen(false);
        setAlertContent('');
        setAlertType('LATE');
        alert('Alerta enviada correctamente.');
    };


    // Sanction Response State
    const [selectedSanction, setSelectedSanction] = useState<SanctionRecord | null>(null);
    const [sanctionResponse, setSanctionResponse] = useState('');

    const myRecords = records.filter(r => r.employeeId === member.id);
    const myAbsences = absences.filter(a => a.employeeId === member.id);
    const mySanctions = sanctions.filter(s => s.employeeId === member.id);

    const myPendingTasks = tasks.filter(t => t.employeeId === member.id && t.status === 'PENDING');
    const pendingTasksCount = myPendingTasks.length;

    // Notifications Logic
    const [locallyReadNotices, setLocallyReadNotices] = useState<string[]>([]);
    const unreadNotices = notices ? notices.filter(n => !n.readBy.includes(member.id) && !locallyReadNotices.includes(n.id)) : [];
    const newTasksCount = Math.max(0, pendingTasksCount - notificationsLastSeenCount);
    const totalBadgeCount = unreadNotices.length + newTasksCount;

    const handleBellClick = () => {
        const newState = !showNotifications;
        setShowNotifications(newState);

        if (newState) {
            // Mark Tasks as "Seen" (locally)
            setNotificationsLastSeenCount(pendingTasksCount);
            localStorage.setItem(`sushiblack_notif_seen_count_${member.id}`, pendingTasksCount.toString());

            // Mark Notices as "Read" (server/persisted + local optimisitic)
            if (unreadNotices.length > 0) {
                const ids = unreadNotices.map(n => n.id);
                setLocallyReadNotices(prev => [...prev, ...ids]);

                if (onMarkNoticeSeen) {
                    ids.forEach(id => onMarkNoticeSeen(id));
                }
            }
        }
    };

    // Correctly calculate Pending Payment using Payroll Logic (Accrual + Balance)
    // Use Ledger if available, otherwise fallback to dynamic (though ledger should be primary now)
    const accrual = calculateAccruedSalary(member, records, calendarEvents, absences, sanctions);

    // Ledger Logic
    const ledgerGross = payrollMovements ? getLedgerAccrual(member, payrollMovements) : accrual.accruedAmount;
    // Note: sanctions are NOT yet in payroll movements, so we subtract them dynamically
    const finalAccrued = ledgerGross - accrual.sanctionDeduction;

    // Pending = Accrued Amount + Previous Balance
    const totalPending = Math.max(0, finalAccrued + (member.balance || 0));

    // Override accrual object for widget display consistency
    accrual.accruedAmount = ledgerGross;

    const formatMoney = (val: number) => {
        if (isPrivacyMode) return '****';
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
    };

    const safeDisplay = (val: string | undefined) => {
        if (!val) return 'N/A';
        if (isPrivacyMode) return '****';
        return val;
    };

    const handleSanctionClick = (s: SanctionRecord) => {
        setSelectedSanction(s);
        setSanctionResponse(s.employeeResponse || '');
    };

    const submitSanctionResponse = () => {
        if (selectedSanction && onUpdateSanction) {
            onUpdateSanction({
                ...selectedSanction,
                employeeResponse: sanctionResponse,
                responseDate: new Date().toISOString()
            });
            setSelectedSanction(null);
            setSanctionResponse('');
            alert('Descargo enviado correctamente via sistema.');
        }
    };

    // Calendar Logic for Member View
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const renderCalendar = () => {
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
        const startDay = firstDay === 0 ? 6 : firstDay - 1;

        return (
            <div className="grid grid-cols-7 gap-2">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => (
                    <div key={d} className="text-gray-400 dark:text-sushi-muted text-xs font-bold uppercase text-center mb-2">{d}</div>
                ))}
                {Array.from({ length: startDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-20" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const dateStr = dateObj.toISOString().split('T')[0];
                    const rec = myRecords.find(r => r.date === dateStr);
                    const abs = myAbsences.find(a => a.date === dateStr);
                    const sanc = mySanctions.find(s => s.date === dateStr && (s.type === 'DESCUENTO' || s.type === 'SUSPENSION' || s.type === 'LLEGADA_TARDE' || s.type === 'STRIKE'));
                    const isHoliday = holidays.includes(dateStr);

                    // Assigned Days Logic
                    const dayMap = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                    const dayName = dayMap[dateObj.getDay()];
                    const isAssigned = member.assignedDays?.includes(dayName);

                    let cellClass = "bg-gray-50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5";
                    let statusText = "";
                    let statusColor = "text-gray-400";

                    if (isHoliday) {
                        cellClass = "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20";
                        statusText = "Feriado";
                        statusColor = "text-blue-500 font-bold";
                    } else if (rec) {
                        if (rec.paid) {
                            cellClass = "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20";
                            statusText = "Pagado";
                            statusColor = "text-green-600 dark:text-green-500";
                        } else {
                            cellClass = "bg-yellow-50 dark:bg-yellow-500/5 border-yellow-200 dark:border-yellow-500/20";
                            statusText = "Asistió";
                            statusColor = "text-yellow-600 dark:text-sushi-gold";
                        }
                    } else if (abs) {
                        if (abs.type === 'FRANCO') {
                            cellClass = "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20";
                            statusText = "Franco";
                            statusColor = "text-teal-600 dark:text-teal-400 font-bold";
                        } else {
                            cellClass = "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20";
                            statusText = "Falta";
                            statusColor = "text-red-500";
                        }
                    } else if (sanc) {
                        cellClass = "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20";
                        statusText = sanc.type.replace('_', ' ');
                        statusColor = "text-purple-500";
                    } else if (isAssigned) {
                        // Highlight if it's an assigned day with no record
                        cellClass = "bg-white dark:bg-white/5 border-dashed border-gray-300 dark:border-white/20";
                        statusText = "Tu Turno";
                        statusColor = "text-gray-400 dark:text-sushi-muted";
                    }

                    // Event Logic
                    const isAuth = ['ADMIN', 'MANAGER', 'COORDINADOR', 'GERENTE', 'EMPRESA'].includes(member.role || '');
                    const event = calendarEvents.find(e => e.date === dateStr && (
                        e.visibility === 'ALL' ||
                        (e.visibility === 'ADMIN' && isAuth)
                    ));
                    if (event) {
                        if (!isHoliday && !rec && !abs && !sanc) {
                            cellClass = "bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-500/20";
                            statusText = event.title;
                            statusColor = "text-purple-600 dark:text-purple-400 font-bold";
                        }
                    }

                    return (
                        <div key={day} className={`h-20 border rounded-lg p-2 flex flex-col justify-between ${cellClass} relative transition-all hover:scale-[1.02]`}>
                            <div className="flex justify-between items-start">
                                <span className={`text-sm font-bold ${statusColor}`}>{day}</span>
                                {isAssigned && (
                                    <div className="text-[10px] bg-gray-100 dark:bg-white/10 px-1 rounded text-gray-500" title="Día Asignado">
                                        <Box className="w-3 h-3 inline mr-0.5" />
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                {rec && rec.overtimeAmount > 0 && <span className={`block text-[10px] font-bold ${statusColor}`}>{formatMoney(rec.overtimeAmount)}</span>}
                                <span className={`text-[9px] uppercase font-medium ${statusColor} block truncate`} title={event ? event.title : statusText}>{event ? event.title : statusText}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        );
    };

    const handleFinalizeChecklist = (snapshot: ChecklistSnapshot) => {
        if (setChecklistSnapshots && checklistSnapshots) {
            setChecklistSnapshots([snapshot, ...checklistSnapshots]);
        }
    };

    // WIDGET STATE
    const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_MEMBER_WIDGETS);
    const [isCustomizing, setIsCustomizing] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(`sushiblack_dashboard_layout_${member.id}`);
        if (saved) {
            try { setWidgets(JSON.parse(saved)); } catch (e) { console.error(e); }
        }
    }, [member.id]);

    const handleSaveLayout = (newWidgets: DashboardWidget[]) => {
        setWidgets(newWidgets);
        localStorage.setItem(`sushiblack_dashboard_layout_${member.id}`, JSON.stringify(newWidgets));
    };

    // Permission Check Helper
    const myRole = member.role || 'COCINA';
    const myPermissions = rolePermissions[myRole] || [];
    // Helper for granular permissions
    const hasPermission = (key: PermissionKey): boolean => {
        const perms = rolePermissions[member.role];
        if (!perms) return false;
        if (perms.superAdmin) return true;

        switch (key) {
            case 'canViewHR': return perms.viewHr;
            case 'canViewOvertime': return perms.viewOps;
            case 'canViewChecklist': return perms.memberViewChecklist; // Updated
            case 'canViewFinance': return perms.viewFinance;
            case 'canViewCash': return perms.viewFinance;
            case 'canViewBudgetRequests': return perms.approveFinance || perms.viewFinance;
            case 'canViewInventory': return perms.viewInventory;
            case 'canViewSuppliers': return perms.viewInventory;
            case 'canViewProfile': return true;
            case 'canViewCalendar': return perms.memberViewMyCalendar; // Updated
            case 'canViewMyCalendar': return perms.memberViewMyCalendar; // New
            case 'canViewTeamCalendar': return perms.memberViewTeamCalendar; // New
            case 'canViewOtherFiles': return perms.memberViewAllFiles; // New
            case 'canViewWelfare': return perms.memberViewWelfare; // New
            case 'canViewForum': return perms.memberViewWelfare; // Forum is part of Welfare
            case 'canViewCommunication': return true;
            default: return false;
        }
    }; const renderWidget = (widget: DashboardWidget) => {
        if (!widget.visible) return null;

        switch (widget.id) {
            case 'checklist':
                if (!hasPermission('canViewChecklist')) return null;
                return <div key={widget.id} className="col-span-1 lg:col-span-2"><ChecklistWidget tasks={tasks} setTasks={setTasks} employeeId={member.id} onFinalize={handleFinalizeChecklist} userName={member.name} /></div>;
            case 'inventory':
                if (!hasPermission('canViewInventory')) return null;
                return <div key={widget.id} className="col-span-1"><InventoryWidget setView={setView!} /></div>;
            case 'profile':
                if (!hasPermission('canViewProfile')) return null;
                return <div key={widget.id} className="col-span-1"><QuickProfileWidget member={member} formatMoney={formatMoney} /></div>;
            case 'pending_payment':
                if (isPrivacyMode || !hasPermission('canViewFinancials') || member.paymentModality === 'DIARIO') return null;
                // Filter transactions for this member
                const myTransactions = transactions.filter(t => t.relatedUserId === member.id || t.relatedUser === member.name);
                // Filter payroll movements for this member
                const myPayrollMovements = payrollMovements.filter(m => m.employee_id === member.id);
                return <div key={widget.id} className="col-span-1"><PendingPaymentWidget totalPending={totalPending} formatMoney={formatMoney} transactions={myTransactions} accrual={accrual} payrollMovements={myPayrollMovements} /></div>;
            case 'next_payment':
                if (isPrivacyMode || !hasPermission('canViewFinancials') || member.paymentModality === 'DIARIO') return null; // Added Permission Check & DIARIO check
                return <div key={widget.id} className="col-span-1 lg:col-span-2"><NextPaymentWidget member={member} safeDisplay={safeDisplay} isPrivacyMode={isPrivacyMode} /></div>;
            case 'merits':
                if (!member.merits || member.merits.length === 0) return null;
                if (!hasPermission('canViewWelfare')) return null; // Check Permission
                return (
                    <div key={widget.id} className="col-span-1 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-xl p-4 border border-yellow-200 dark:border-yellow-500/20 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <h3 className="font-bold text-yellow-800 dark:text-yellow-500 flex items-center gap-2">
                                <Trophy className="w-4 h-4" /> Mis Logros
                            </h3>
                            <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{member.merits.length}</span>
                        </div>
                        <div className="flex gap-2 relative z-10">
                            {member.merits.slice(-3).reverse().map((m, idx) => {
                                const type = meritTypes.find(t => t.id === m.meritTypeId);
                                if (!type) return null;
                                return (
                                    <div key={idx} className="w-8 h-8 rounded-full bg-white dark:bg-black/20 flex items-center justify-center text-lg shadow-sm border border-yellow-100 dark:border-yellow-500/10" title={type.title}>
                                        <MeritIcon iconName={type.icon} className="w-4 h-4" color={type.color} />
                                    </div>
                                );
                            })}
                            {member.merits.length > 3 && (
                                <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center text-[10px] font-bold text-yellow-700 dark:text-yellow-500">
                                    +{member.merits.length - 3}
                                </div>
                            )}
                        </div>
                        <Trophy className="absolute -right-2 -bottom-2 w-16 h-16 text-yellow-500/10 rotate-12 group-hover:rotate-0 transition-transform" />
                    </div>
                );
            default: return null;
        }
    }

    if (currentView === View.MEMBER_HOME) {
        return (
            <>
                <div className="space-y-8 animate-fade-in relative pb-10">
                    {/* Header with Privacy Toggle & Notification */}
                    <div className="flex justify-between items-center bg-white dark:bg-sushi-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 dark:border-white/10">
                                {member.photoUrl ? <img src={member.photoUrl} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-gray-300" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-serif text-gray-900 dark:text-white flex items-center gap-2">
                                    Hola, {member.name.split(' ')[0]}
                                    <RankBadge role={member.role} />
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-sushi-muted uppercase tracking-wider mb-1">{member.position}</p>

                                {/* Merits in Header */}
                                {member.merits && member.merits.length > 0 && (
                                    <div className="flex gap-1">
                                        {member.merits.slice(-5).reverse().map((m, idx) => {
                                            const type = meritTypes.find(t => t.id === m.meritTypeId);
                                            if (!type) return null;
                                            return (
                                                <button
                                                    key={idx}
                                                    title={type.title}
                                                    onClick={() => setViewingMerit({ assigned: m, type })}
                                                    className="hover:scale-110 transition-transform cursor-pointer"
                                                >
                                                    <MeritIcon iconName={type.icon} className="w-4 h-4" color={type.color} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 relative">
                            {/* Alert Button */}
                            <button
                                onClick={() => {
                                    console.log('Alert button clicked');
                                    setIsAlertModalOpen(true);
                                }}
                                className="p-2 rounded-lg transition-colors border border-red-200 bg-red-50 hover:bg-red-100 text-red-500 animate-pulse z-50"
                                title="Emitir Alerta Urgente"
                            >
                                <AlertTriangle className="w-6 h-6" />
                            </button>

                            {/* Customize Button */}
                            <button
                                onClick={() => setIsCustomizing(true)}
                                className="p-2 rounded-lg transition-colors border border-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 dark:text-sushi-muted"
                                title="Personalizar Panel"
                            >
                                <Settings2 className="w-6 h-6" />
                            </button>

                            {/* Privacy Toggle */}
                            <button
                                id="privacy-toggle"
                                onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                className={`p-2 rounded-lg transition-colors border ${isPrivacyMode ? 'bg-sushi-gold/20 text-sushi-gold border-sushi-gold/50' : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-sushi-muted border-transparent'}`}
                                title={isPrivacyMode ? "Mostrar datos sensibles" : "Ocultar datos sensibles"}
                            >
                                {isPrivacyMode ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                            </button>

                            {/* Notifications */}
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/5"
                            >
                                <Bell className="w-6 h-6 text-gray-400 dark:text-sushi-muted" />
                                {totalBadgeCount > 0 && (
                                    <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white dark:border-sushi-dark animate-pulse">
                                        {totalBadgeCount}
                                    </div>
                                )}
                            </button>

                            {/* Dropdown Notifications */}
                            {showNotifications && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-sushi-dark rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 z-50 overflow-hidden animate-fade-in">
                                    <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/20">
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                                            <Bell className="w-4 h-4 text-sushi-gold" /> Notificaciones
                                        </h4>
                                        <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto p-2">
                                        {totalBadgeCount === 0 && myPendingTasks.length === 0 ? (
                                            <div className="p-6 text-center text-gray-500 dark:text-sushi-muted text-sm flex flex-col items-center gap-2">
                                                <CheckCircle2 className="w-8 h-8 text-green-500/50" />
                                                <p>¡Estás al día!</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {/* Notices First */}
                                                {unreadNotices.map(n => (
                                                    <div key={n.id} className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{n.content}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(n.date).toLocaleString()}</p>
                                                        <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">NOVEDAD</span>
                                                    </div>
                                                ))}
                                                {/* Tasks Second */}
                                                {myPendingTasks.map(t => (
                                                    <div key={t.id} className="p-3 bg-white dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5 hover:border-sushi-gold/30 transition-colors">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{t.description}</p>
                                                        <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">PENDIENTE</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Customizable Dashboard Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Main Widget Area */}
                        <div className={`space-y-4 ${member.role === 'COORDINADOR' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                            <div className={`grid grid-cols-1 md:grid-cols-2 ${member.role === 'COORDINADOR' ? '' : 'lg:grid-cols-3'} gap-4`}>
                                {widgets
                                    .filter(w => w.visible)
                                    // Remove Checklist for Coordinator
                                    .filter(w => member.role !== 'COORDINADOR' || w.id !== 'checklist')
                                    .sort((a, b) => a.order - b.order)
                                    .map(w => renderWidget(w))
                                }
                            </div>

                            {/* Calendar Section for Coordinator */}
                            {member.role === 'COORDINADOR' && hasPermission('canViewTeamCalendar') && (
                                <div className="mt-4">
                                    <CalendarWidget
                                        events={calendarEvents.filter(e => e.visibility === 'ALL' || e.visibility === 'ADMIN')}
                                        records={records}
                                        absences={absences}
                                        cashShifts={cashShifts || []}
                                        holidays={holidays}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Coordinator Sidebar (Activity Feed) */}
                        {member.role === 'COORDINADOR' && (
                            <div className="space-y-4">
                                <ActivityFeedWidget
                                    recentSanctions={sanctions} // Using 'sanctions' prop
                                    employees={employees || []}
                                    notices={notices || []}
                                    messages={messages || []}
                                    cashShifts={cashShifts || []}
                                    inventory={inventory || []}
                                    checklistSnapshots={checklistSnapshots || []}
                                    setView={setView!}
                                    onMarkNoticeSeen={onMarkNoticeSeen}
                                    onApproveSanction={onApproveSanction}
                                    currentUser={{
                                        id: member.id,
                                        name: member.name,
                                        role: member.role,
                                        email: '',
                                        username: member.name,
                                        password: '', // Mock
                                        permissions: rolePermissions[member.role] || [] as any
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <DashboardCustomizer
                        isOpen={isCustomizing}
                        onClose={() => setIsCustomizing(false)}
                        currentWidgets={widgets}
                        onSave={handleSaveLayout}
                    />
                </div>

                {/* MERIT DETAIL MODAL */}
                {viewingMerit && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-sushi-dark rounded-xl shadow-2xl max-w-sm w-full relative overflow-hidden border border-sushi-gold/30">
                            {/* Header Gradient */}
                            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-sushi-gold/20 to-transparent pointer-events-none" />

                            <button
                                onClick={() => setViewingMerit(null)}
                                className="absolute top-3 right-3 p-1 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-10"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>

                            <div className="p-8 flex flex-col items-center text-center relative z-0">
                                <div
                                    className="w-20 h-20 rounded-full bg-white dark:bg-black/30 flex items-center justify-center text-4xl shadow-lg border-2 border-sushi-gold/20 mb-4"
                                    style={{ boxShadow: `0 0 20px ${viewingMerit.type.color}40`, borderColor: viewingMerit.type.color }}
                                >
                                    <MeritIcon iconName={viewingMerit.type.icon} className="w-10 h-10" color={viewingMerit.type.color} />
                                </div>

                                <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2" style={{ color: viewingMerit.type.color }}>
                                    {viewingMerit.type.title}
                                </h3>

                                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-sushi-muted mb-4 border border-gray-200 dark:border-white/10 px-2 py-0.5 rounded-full">
                                    {new Date(viewingMerit.assigned.assignedAt).toLocaleDateString()}
                                </span>

                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {viewingMerit.type.description}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ALERT MODAL */}
                {isAlertModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-sushi-dark rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-white/10">
                            <div className="p-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-500/20 flex justify-between items-center">
                                <h3 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" /> Nueva Alerta
                                </h3>
                                <button onClick={() => setIsAlertModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Tipo de Alerta</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'LATE', label: 'Llegada Tarde' },
                                            { id: 'ABSENCE', label: 'Falta' },
                                            { id: 'OTHER', label: 'Otro' },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setAlertType(opt.id as any)}
                                                className={`p-2 rounded text-xs font-bold border transition-all ${alertType === opt.id ? 'bg-red-500 text-white border-red-600 shadow-md' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Mensaje / Detalle</label>
                                    <textarea
                                        value={alertContent}
                                        onChange={e => setAlertContent(e.target.value)}
                                        className="w-full p-3 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none h-24 dark:text-white"
                                        placeholder="Describe brevemente la situación..."
                                    />
                                </div>
                                <button
                                    onClick={handleSendAlert}
                                    className="w-full py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Enviar Alerta Urgente
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    if (currentView === View.MEMBER_FORUM && posts && setPosts) {
        if (!hasPermission('canViewWelfare')) return <div className="p-10 text-center text-gray-500">Esta función no está habilitada para tu rol.</div>;
        return (
            <ForumBoard
                posts={posts}
                setPosts={setPosts}
                currentUser={null}
                currentMember={member}
            />
        );
    }

    if (currentView === View.MEMBER_TASKS) {
        if (!hasPermission('canViewChecklist')) return <div className="p-10 text-center text-gray-500">Esta función no está habilitada para tu rol.</div>;
        return (
            <div className="max-w-2xl mx-auto pt-10 animate-fade-in">
                <TaskChecklist
                    tasks={tasks}
                    setTasks={setTasks}
                    employeeId={member.id}
                    onFinalize={handleFinalizeChecklist}
                    userName={member.name}
                />
            </div>
        )
    }

    if (currentView === View.MEMBER_CALENDAR) {
        if (!hasPermission('canViewMyCalendar')) return <div className="p-10 text-center text-gray-500">Esta función no está habilitada para tu rol.</div>;
        return (
            <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif text-xl text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-sushi-gold" />
                        Historial Visual
                    </h3>
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-black/20 p-2 rounded-lg">
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"><ChevronLeft className="w-5 h-5 text-gray-600 dark:text-white" /></button>
                        <span className="font-bold text-gray-900 dark:text-white w-32 text-center capitalize">
                            {currentMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"><ChevronRight className="w-5 h-5 text-gray-600 dark:text-white" /></button>
                    </div>
                </div>

                {renderCalendar()}

                <div className="mt-6 flex gap-4 text-xs justify-center flex-wrap">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-gray-500 dark:text-sushi-muted">Pagado</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-sushi-gold rounded-full"></div><span className="text-gray-500 dark:text-sushi-muted">Asistió</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span className="text-gray-500 dark:text-sushi-muted">Falta</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-500 rounded-full"></div><span className="text-gray-500 dark:text-sushi-muted">Sanción</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-gray-500 dark:text-sushi-muted">Feriado</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-teal-500 rounded-full"></div><span className="text-gray-500 dark:text-sushi-muted">Franco</span></div>
                </div>
            </div>
        )
    }

    if (currentView === View.MEMBER_FILE) {
        return (
            <div className="space-y-8 animate-fade-in relative">
                <button
                    onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                    className={`absolute top-4 right-4 z-10 p-2 rounded-lg border ${isPrivacyMode ? 'bg-sushi-gold/20 text-sushi-gold border-sushi-gold' : 'bg-gray-100 dark:bg-white/5 border-transparent text-gray-500'}`}
                >
                    {isPrivacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>

                <div className="bg-white dark:bg-sushi-dark p-8 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-6 mb-8 border-b border-gray-200 dark:border-white/10 pb-6">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-sushi-gold/20">
                            {member.photoUrl ? <img src={member.photoUrl} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-6 text-gray-300 dark:text-sushi-muted" />}
                        </div>
                        <div>
                            <h2 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-2">
                                {member.name}
                                <RankBadge role={member.role} />
                            </h2>
                            <p className="text-sushi-gold font-bold uppercase tracking-widest">{member.position}</p>
                        </div>
                    </div>



                    {/* MERITS SECTION */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-6 mb-8 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="font-bold text-yellow-800 dark:text-yellow-500 flex items-center gap-2 mb-4">
                                <Trophy className="w-5 h-5" />
                                Mis Méritos y Reconocimientos
                            </h3>

                            {!member.merits || member.merits.length === 0 ? (
                                <p className="text-sm text-yellow-700/60 dark:text-yellow-500/50 italic">Aún no has recibido reconocimientos.</p>
                            ) : (
                                <div className="flex flex-wrap gap-4">
                                    {member.merits.map((m, idx) => {
                                        const type = meritTypes.find(t => t.id === m.meritTypeId);
                                        if (!type) return null;
                                        return (
                                            <div key={idx} className="group relative bg-white dark:bg-black/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-500/10 hover:scale-105 transition-transform cursor-help">
                                                <div className="flex justify-center mb-1 text-3xl" style={{ color: type.color }}>
                                                    <MeritIcon iconName={type.icon} className="w-8 h-8" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-sushi-muted">{new Date(m.assignedAt).toLocaleDateString()}</p>
                                                </div>

                                                {/* Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                                    <p className="font-bold text-sushi-gold mb-1" style={{ color: type.color }}>{type.title}</p>
                                                    <p>{type.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <Trophy className="absolute -right-4 -bottom-4 w-32 h-32 text-yellow-500/5 rotate-12" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-2">Información Personal</h4>
                            <InfoItem icon={UserIcon} label="DNI" value={safeDisplay(member.dni)} />
                            <InfoItem icon={Hash} label="CUIL" value={safeDisplay(member.cuil)} />
                            <InfoItem icon={Phone} label="Teléfono" value={safeDisplay(member.phone)} />
                            <InfoItem icon={MapPin} label="Dirección" value={safeDisplay(member.address)} />
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-2">Datos Bancarios</h4>
                            <InfoItem icon={Building} label="Banco" value={safeDisplay(member.bankName)} />
                            <InfoItem icon={CreditCard} label="CBU / CVU" value={safeDisplay(member.cbu)} />
                            <InfoItem icon={Hash} label="Alias" value={safeDisplay(member.alias)} />
                            <InfoItem icon={CreditCard} label="Nro Cuenta" value={safeDisplay(member.bankAccountNumber)} />
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-2">Contrato</h4>
                            <InfoItem icon={Calendar} label="Fecha Ingreso" value={member.startDate} />
                            <InfoItem icon={CheckCircle2} label="Modalidad" value={member.paymentModality} />
                            <InfoItem icon={UserCheck} label="Entrevistador" value={member.interviewer} />
                            {member.paymentModality !== 'DIARIO' && (
                                <InfoItem icon={Briefcase} label="Sueldo Base" value={formatMoney(member.monthlySalary)} />
                            )}
                        </div>
                    </div>
                </div>



                {/* SANCTIONS HISTORY SECTION */}
                {
                    mySanctions.length > 0 && (
                        <div className="bg-white dark:bg-sushi-dark p-8 rounded-xl border border-red-200/50 dark:border-red-500/10 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Historial de Sanciones/Avisos
                            </h3>
                            <div className="space-y-4">
                                {mySanctions.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => handleSanctionClick(s)}
                                        className="p-4 border border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 rounded-lg flex justify-between items-center cursor-pointer hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors group"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-red-700 dark:text-red-400">{s.type.replace('_', ' ')}</span>
                                                <span className="text-xs text-gray-500 dark:text-sushi-muted">{new Date(s.date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{s.description}</p>
                                            {s.employeeResponse && (
                                                <p className="text-xs text-green-600 dark:text-green-500 mt-2 font-medium flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Descargo enviado: "{s.employeeResponse.substring(0, 30)}..."
                                                </p>
                                            )}
                                            {!s.employeeResponse && (
                                                <p className="text-xs text-sushi-gold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Clic para añadir descargo
                                                </p>
                                            )}
                                        </div>
                                        {s.amount && <span className="font-mono text-red-600 font-bold">-{formatMoney(s.amount)}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* SANCTION DESCAGO MODAL */}
                {
                    selectedSanction && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-sushi-dark w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10 animate-fade-in-up">
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Descargo de Sanción</h3>
                                    <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-lg mb-4">
                                        <p className="text-xs text-gray-500 uppercase font-bold text-red-500">{selectedSanction.type}</p>
                                        <p className="text-gray-800 dark:text-gray-200 text-sm mt-1">{selectedSanction.description}</p>
                                        <p className="text-xs text-gray-400 mt-2">{selectedSanction.date}</p>
                                    </div>

                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tu respuesta / Descargo
                                    </label>
                                    <textarea
                                        value={sanctionResponse}
                                        onChange={(e) => setSanctionResponse(e.target.value)}
                                        className="w-full h-32 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-sushi-gold resize-none"
                                        placeholder="Escribe aquí tu descargo..."
                                    />
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-black/40 flex justify-end gap-3">
                                    <button
                                        onClick={() => setSelectedSanction(null)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={submitSanctionResponse}
                                        className="px-4 py-2 bg-sushi-gold text-sushi-black font-medium rounded-lg hover:bg-sushi-goldhover transition-colors"
                                    >
                                        Enviar Descargo
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                <AIReport employees={[member]} records={myRecords} sanctions={mySanctions} />


            </div >
        )
    }

    return null;
};
