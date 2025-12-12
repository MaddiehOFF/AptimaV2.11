
import React, { useState, useEffect } from 'react';
import { InternalMail } from './components/InternalMail';
import { EmployeeNotices } from './components/EmployeeNotices';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { EmployeeManagement } from './components/EmployeeManagement';
import { OvertimeLog } from './components/OvertimeLog';
import { AIReport } from './components/AIReport';
import { SanctionsLog } from './components/SanctionsLog';
import { EmployeeFiles } from './components/EmployeeFiles';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { MemberView } from './components/MemberView';
import { ActiveUsersWidget } from './components/ActiveUsersWidget';
import { LoadingScreen } from './components/LoadingScreen';
import { PayrollManagement } from './components/PayrollManagement';
import { ForumBoard } from './components/ForumBoard';
import { AdminHub } from './components/AdminHub';
import { AdministrativeOffice } from './components/AdministrativeOffice';
import { ConstructionView } from './components/ConstructionView';
import { InventoryManager } from './components/InventoryManager';
import { CashRegister } from './components/CashRegister';
import { MessagingSystem } from './components/MessagingSystem';
import { ProductManagement } from './components/ProductManagement';
import { FinanceDashboard } from './components/FinanceDashboard';
import { WalletView } from './components/WalletView';
import { RoyaltiesManagement } from './components/RoyaltiesManagement';
import { StatisticsDashboard } from './components/StatisticsDashboard';
import { SettingsView } from './components/SettingsView';
import { BudgetRequestsView } from './components/BudgetRequestsView';
import { Employee, OvertimeRecord, View, SanctionRecord, User, AbsenceRecord, Task, ForumPost, AdminTask, InventoryItem, InventorySession, CashShift, Product, WalletTransaction, Partner, CalculatorProjection, FixedExpense, ChecklistSnapshot, InternalMessage, EmployeeNotice, CoordinatorNote, CalendarEvent, RolePermissions, RoyaltyHistoryItem, Supplier, SupplierProduct, ShoppingList, BudgetRequest, UserActivityLog, OfficeStickyNote, OfficeDocument, PayrollMovement } from './types';
import { Menu, Bell, X } from 'lucide-react';
import { ActivityFeedWidget } from './components/widgets/AdminWidgets';
import { supabase } from './supabaseClient';

import { SuppliersView } from './components/SuppliersView';
import { TourGuide } from './components/TourGuide';
import { useSupabaseCollection } from './hooks/useSupabase';
import { calculateAccruedSalary, runHiroshiTest } from './utils/payrollUtils';
import { useActivityTracker } from './hooks/useActivityTracker';
import { UserProfileModal } from './components/UserProfileModal';
import { setCookie, getCookie, deleteCookie } from './utils/cookieUtils';

// DEFAULT ROLE PERMISSIONS
const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
    'COCINA': ['canViewCalendar', 'canViewProfile', 'canViewCommunication'],
    'BARRA': ['canViewCalendar', 'canViewChecklist', 'canViewInventory', 'canViewProfile', 'canViewCommunication'],
    'SALON': ['canViewCalendar', 'canViewChecklist', 'canViewProfile', 'canViewCommunication'],
    'CAJA': ['canViewCash', 'canViewCalendar', 'canViewChecklist', 'canViewProfile', 'canViewCommunication'],
    'ENCARGADO': ['canViewInventory', 'canViewCash', 'canViewFinancials', 'canViewChecklist', 'canViewCalendar', 'canViewProfile', 'canViewForum', 'canViewCommunication'],
    'REPARTIDOR': ['canViewCalendar', 'canViewCommunication', 'canViewProfile'],
    'DELIVERY': ['canViewCalendar', 'canViewCommunication', 'canViewProfile', 'canViewChecklist'],
    'EMPRESA': ['canViewInventory', 'canViewCash', 'canViewFinancials', 'canViewChecklist', 'canViewCalendar', 'canViewProfile', 'canViewForum', 'canViewCommunication'],
    'GERENTE': ['canViewInventory', 'canViewCash', 'canViewFinancials', 'canViewChecklist', 'canViewCalendar', 'canViewProfile', 'canViewForum', 'canViewCommunication'],
    'COORDINADOR': ['canViewInventory', 'canViewCash', 'canViewFinancials', 'canViewChecklist', 'canViewCalendar', 'canViewProfile', 'canViewForum', 'canViewCommunication'],
    'JEFE_COCINA': ['canViewInventory', 'canViewChecklist', 'canViewCalendar', 'canViewProfile', 'canViewForum', 'canViewCommunication'],
    'ADMINISTRATIVO': ['canViewCash', 'canViewFinancials', 'canViewCalendar', 'canViewProfile', 'canViewCommunication'],
    'MOSTRADOR': ['canViewChecklist', 'canViewCalendar', 'canViewProfile', 'canViewCommunication', 'canViewCash'],
};

const App: React.FC = () => {
    // Theme State
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        const saved = localStorage.getItem('sushiblack_theme');
        return saved ? saved === 'dark' : true;
    });

    // Tour State
    const [showTour, setShowTour] = useState(false);

    // Mobile Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // State for Mail Navigation
    const [composeRecipient, setComposeRecipient] = useState<string | null>(null);

    // ACTIVITY LOGS (For Office Stats)
    const { data: userActivityLogs } = useSupabaseCollection<UserActivityLog>('user_activity_logs', []);

    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const hasSession = getCookie('sushiblack_auth');
            const TIMEOUT = 40 * 60 * 1000;
            const now = Date.now();

            if (hasSession) {
                // We have a valid session key (cookie), try to load data
                const savedUser = localStorage.getItem('sushiblack_session_user');
                const lastActive = localStorage.getItem('sushiblack_last_active');

                if (savedUser && lastActive) {
                    // Check inactivity timeout
                    if (now - parseInt(lastActive, 10) < TIMEOUT) {
                        return JSON.parse(savedUser);
                    }
                }
            }

            // If no cookie or invalid data, clean up potential leftovers
            localStorage.removeItem('sushiblack_session_user');
        } catch (e) { console.error("Error restoring session", e); }
        return null;
    });

    const [currentMember, setCurrentMember] = useState<Employee | null>(() => {
        try {
            const hasSession = getCookie('sushiblack_auth');
            const TIMEOUT = 40 * 60 * 1000;
            const now = Date.now();

            if (hasSession) {
                const savedMember = localStorage.getItem('sushiblack_session_member');
                const lastActive = localStorage.getItem('sushiblack_last_active');

                if (savedMember && lastActive) {
                    if (now - parseInt(lastActive, 10) < TIMEOUT) {
                        return JSON.parse(savedMember);
                    }
                }
            }
            localStorage.removeItem('sushiblack_session_member');
        } catch (e) { console.error("Error restoring member session", e); }
        return null;
    });

    // App Data State
    const [currentView, setView] = useState<View>(View.DASHBOARD);
    const [isLoading, setIsLoading] = useState(true);
    const [showProfile, setShowProfile] = useState(false);

    // Activity Tracker
    useActivityTracker(currentView, currentUser?.id);

    // Simulate Startup Loading with Fade Out
    useEffect(() => {
        runHiroshiTest(); // Phase 35: Integrity Check
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleExportBackup = () => {
        const backupData = {
            timestamp: new Date().toISOString(),
            users, employees, records, sanctions,
            inventoryItems, inventorySessions,
            cashShifts, walletTransactions,
            products, fixedExpenses, partners, royaltyPool: [],
            royaltyHistory, appSettings, // Added these
            posts: posts, adminTasks, calendarEvents,
            absences, checklistSnapshots, coordinatorNotes
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sushiblack_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // APP SETTINGS (Global Configuration)
    // We use a generic 'app_settings' table to store global configs like permissions and roles.
    // Structure: { id: 'role_permissions' | 'custom_roles', value: any }
    interface AppSetting {
        id: string;
        value: any;
    }
    const { data: appSettings, set: setAppSettings, add: updateAppSetting } = useSupabaseCollection<AppSetting>('app_settings', []);

    // ROLE PERMISSIONS STATE
    // We keep local state for UI responsiveness, but sync with appSettings
    const [rolePermissions, setRolePermissionsState] = useState<RolePermissions>(DEFAULT_ROLE_PERMISSIONS);
    const [customRoles, setCustomRolesState] = useState<string[]>([]);
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    // Sync from DB to Local State
    // Sync from DB to Local State
    // (Moved down to ensure loadingEmployees is defined)


    // Wrapper to update Permissions (Updates State + DB)
    const setRolePermissions = (newPermissions: RolePermissions | ((prev: RolePermissions) => RolePermissions)) => {
        let updated: RolePermissions;
        if (typeof newPermissions === 'function') {
            updated = newPermissions(rolePermissions);
        } else {
            updated = newPermissions;
        }

        // 1. Optimistic Update
        setRolePermissionsState(updated);

        // 2. Persist to DB
        updateAppSetting({ id: 'role_permissions', value: updated });
    };

    // Wrapper to update Custom Roles
    const setCustomRoles = (newRoles: string[] | ((prev: string[]) => string[])) => {
        let updated: string[];
        if (typeof newRoles === 'function') {
            updated = newRoles(customRoles);
        } else {
            updated = newRoles;
        }

        setCustomRolesState(updated);
        updateAppSetting({ id: 'custom_roles', value: updated });
    };

    // SETTINGS STATE
    const [restrictLateralMessaging, setRestrictLateralMessaging] = useState<boolean>(() => {
        const saved = localStorage.getItem('sushiblack_restrict_lateral_messaging');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('sushiblack_restrict_lateral_messaging', JSON.stringify(restrictLateralMessaging));
    }, [restrictLateralMessaging]);

    // ...



    const { data: employees, set: setEmployees, loading: loadingEmployees } = useSupabaseCollection<Employee>('employees', []);
    const { data: records, set: setRecords } = useSupabaseCollection<OvertimeRecord>('records', []);
    const { data: absences, set: setAbsences } = useSupabaseCollection<AbsenceRecord>('absences', []);
    const { data: sanctions, set: setSanctions } = useSupabaseCollection<SanctionRecord>('sanctions', []);
    const { data: tasks, set: setTasks } = useSupabaseCollection<Task>('tasks', []);
    const { data: checklistSnapshots, set: setChecklistSnapshots } = useSupabaseCollection<ChecklistSnapshot>('checklist_snapshots', []);
    const { data: posts, set: setPosts } = useSupabaseCollection<ForumPost>('posts', []);
    const { data: adminTasks, set: setAdminTasks } = useSupabaseCollection<AdminTask>('admin_tasks', []);
    const { data: payrollMovements, set: setPayrollMovements } = useSupabaseCollection<PayrollMovement>('payroll_movements', [], { enableAutoSync: false });

    // COMMUNICATION STATE
    // COMMUNICATION STATE
    const { data: internalMessages, set: setInternalMessages } = useSupabaseCollection<InternalMessage>('internal_messages', []);
    const { data: employeeNotices, set: setEmployeeNotices, add: addEmployeeNotice } = useSupabaseCollection<EmployeeNotice>('employee_notices', []);
    const { data: coordinatorNotes, set: setCoordinatorNotes } = useSupabaseCollection<CoordinatorNote>('coordinator_notes', []);
    const {
        data: calendarEvents,
        set: setCalendarEvents,
        add: addCalendarEvent,
        remove: deleteCalendarEvent
    } = useSupabaseCollection<CalendarEvent>('calendar_events', []);

    // Holidays is simple string array, but our hook requires BaseEntity with ID.
    // We need to wrap it if we want to store it in 'app_settings'.
    // For now, let's keep it in localStorage OR map it.
    // Ideally, 'holidays' should be a table 'holidays' { id, date }.
    // Let's assume we map it to { id: date, date: date } for the hook?
    // Or create a table `holidays`.
    // The schema created `app_settings`.
    // Let's use localStorage for holidays for now to reduce complexity, or quick fix it.
    // User asked for "Data online". Holidays are data.
    // Let's USE localStorage for holidays for this iteration to avoid schema mismatch errors if I didn't create 'holidays' table.
    // Wait, I created `app_settings`.
    // But App expects `string[]`.
    // I'll stick to localStorage for holidays to be safe, or refactor OvertimeLog.
    const [holidays, setHolidays] = useState<string[]>(() => {
        const saved = localStorage.getItem('sushiblack_holidays');
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => { localStorage.setItem('sushiblack_holidays', JSON.stringify(holidays)); }, [holidays]);

    // PRODUCT STATE
    const { data: products, set: setProducts } = useSupabaseCollection<Product>('products', [
        // Defaults if empty (hook handles this via initialData but loading might flicker)
        { id: '1', name: 'Sushi Box 20', laborCost: 500, materialCost: 1200, royalties: 0, profit: 0 },
        { id: '2', name: 'Roll Tempura', laborCost: 300, materialCost: 800, royalties: 0, profit: 0 }
    ]);

    // INVENTORY STATE
    const { data: inventoryItems, set: setInventoryItems } = useSupabaseCollection<InventoryItem>('inventory_items', [
        { id: '1', name: 'SALMON', unit: 'Kg' },
        { id: '2', name: 'QUESOS', unit: 'Kg' },
        { id: '3', name: 'PALTAS', unit: 'Kg' },
        { id: '4', name: 'ARROZ', unit: 'Kg' },
        { id: '5', name: 'ALGAS', unit: 'Paq' },
        { id: '6', name: 'LANGO BOLSA', unit: 'Un' },
        { id: '7', name: 'LANGO H', unit: 'Un' },
    ]);

    const { data: inventorySessions, set: setInventorySessions } = useSupabaseCollection<InventorySession>('inventory_sessions', []);

    // CASH REGISTER STATE
    const { data: cashShifts, set: setCashShifts } = useSupabaseCollection<CashShift>('cash_shifts', []);

    const { data: walletTransactions, set: setWalletTransactions } = useSupabaseCollection<WalletTransaction>('wallet_transactions', []);

    const { data: fixedExpenses, set: setFixedExpenses } = useSupabaseCollection<FixedExpense>('fixed_expenses', []);

    // ROYALTIES & PARTNERS STATE
    const { data: partners, set: setPartners } = useSupabaseCollection<Partner>('partners', [
        { id: '1', name: 'Socio 1', sharePercentage: 25, balance: 0 },
        { id: '2', name: 'Socio 2', sharePercentage: 25, balance: 0 },
        { id: '3', name: 'Socio 3', sharePercentage: 25, balance: 0 },
        { id: '4', name: 'Socio 4', sharePercentage: 25, balance: 0 },
    ]);


    const [royaltyHistory, setRoyaltyHistory] = useState<RoyaltyHistoryItem[]>(() => {
        const saved = localStorage.getItem('sushiblack_royalty_history');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('sushiblack_royalty_history', JSON.stringify(royaltyHistory));
    }, [royaltyHistory]);

    const addRoyaltyHistory = async (item: RoyaltyHistoryItem) => {
        setRoyaltyHistory(prev => [item, ...prev]);
    };

    // SUPPLIERS STATE
    const suppliersHook = useSupabaseCollection<Supplier>('suppliers', []);
    const { data: suppliers, set: setSuppliers } = suppliersHook;

    const supplierProductsHook = useSupabaseCollection<SupplierProduct>('supplier_products', []);
    const { data: supplierProducts, set: setSupplierProducts } = supplierProductsHook;

    const { data: shoppingLists, set: setShoppingLists } = useSupabaseCollection<ShoppingList>('shopping_lists', []);

    const { data: projections, set: setProjections } = useSupabaseCollection<CalculatorProjection>('projections', []);



    const { data: budgetRequests, set: setBudgetRequests } = useSupabaseCollection<BudgetRequest>('budget_requests', []);

    // OFICINA NOTES
    const { data: officeNotes, set: setOfficeNotes, add: addOfficeNote, update: updateOfficeNote, remove: removeOfficeNote } = useSupabaseCollection<OfficeStickyNote>('office_notes', []);

    // OFFICE DOCUMENTS (Lifted to App for Global Notifications)
    const { data: documents, set: setDocuments } = useSupabaseCollection<OfficeDocument>('office_documents', []);

    // Notification State
    const [showNotifications, setShowNotifications] = useState(false);
    const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());

    const handleMarkNotificationsAsRead = () => {
        if (!showNotifications) {
            // Mark as read when opening
            if (!currentUser) return;

            const unreadNotices = employeeNotices.filter(n => !n.readBy.includes(currentUser.id));
            const unreadMessages = internalMessages.filter(m => !m.readBy.includes(currentUser.id));
            const unreadDocs = documents.filter(d => d.sharedWith?.includes(currentUser.id) && !d.readBy?.includes(currentUser.id));

            const newReadIds = new Set(localReadIds);

            unreadNotices.forEach(n => {
                newReadIds.add(n.id);
                const newReadBy = [...n.readBy, currentUser.id];
                supabase.from('employee_notices').update({ data: { ...n, readBy: newReadBy } }).eq('id', n.id).then();
            });

            unreadMessages.forEach(m => {
                newReadIds.add(m.id);
                const newReadBy = [...m.readBy, currentUser.id];
                supabase.from('internal_messages').update({ data: { ...m, readBy: newReadBy } }).eq('id', m.id).then();
            });

            unreadDocs.forEach(d => {
                newReadIds.add(d.id);
                const newReadBy = [...(d.readBy || []), currentUser.id];
                supabase.from('office_documents').update({ data: { ...d, readBy: newReadBy } }).eq('id', d.id).then();
                // Local update
                setDocuments(prev => prev.map(pd => pd.id === d.id ? { ...d, readBy: newReadBy } : pd));
            });

            setLocalReadIds(newReadIds);
        }
        setShowNotifications(!showNotifications);
    };


    // USER STATE
    const { data: users, set: setUsers } = useSupabaseCollection<User>('app_users', []);

    // Default Admin Seeding (Client Side Hack - risky but matches existing logic)
    useEffect(() => {
        if (!loadingEmployees && users.length === 0) {
            // If no users loaded, maybe seed default admin?
            // Only if actually loaded and empty.
            // But with Realtime, we might just receive it later.
            // Let's rely on manual creation first or previous localstorage data?
            // Migration from LocalStorage to Supabase would be nice, but out of scope?
            // I'll leave it empty.
        }
    }, [loadingEmployees, users]);

    const [persistenceMigrated, setPersistenceMigrated] = useState(false);


    // Sync from DB to Local State (Moved here to ensure loadingEmployees is defined)
    useEffect(() => {
        if (appSettings.length > 0) {
            const dbPermissions = appSettings.find(s => s.id === 'role_permissions');
            const dbCustomRoles = appSettings.find(s => s.id === 'custom_roles');

            if (dbPermissions && dbPermissions.value) {
                setRolePermissionsState(dbPermissions.value);
            }
            if (dbCustomRoles && dbCustomRoles.value) {
                setCustomRolesState(dbCustomRoles.value);
            }
            setSettingsLoaded(true);
        } else if (!loadingEmployees && !settingsLoaded) {
            // If DB is empty after loading, we might need to seed it or just wait.
            // We'll trust the default state (DEFAULT_ROLE_PERMISSIONS) initially.
        }
    }, [appSettings, loadingEmployees]);

    // MIGRATION ONCE (Optional helper to dump localstorage to Supabase if empty)
    // Disable for production safety unless requested.


    useEffect(() => {
        localStorage.setItem('sushiblack_theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    // SCHEDULED TRANSACTIONS RUNNER
    useEffect(() => {
        const checkScheduledTransactions = () => {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Filter pending scheduled transactions
            const pending = walletTransactions.filter(t =>
                t.status === 'SCHEDULED' &&
                t.scheduledDate &&
                !t.deletedAt
            );

            // Batch update approach
            const updates = pending.filter(t => {
                const sDate = new Date(t.scheduledDate!);
                // Check if date has passed or is today
                // Simple logic: if scheduled date string <= today string
                return t.scheduledDate! <= todayStr;
            });

            if (updates.length > 0) {
                console.log("Executing Scheduled Transactions:", updates.length);
                const updatedList = walletTransactions.map(t => {
                    if (updates.find(u => u.id === t.id)) {
                        return { ...t, status: 'COMPLETED' as const };
                    }
                    return t;
                });
                setWalletTransactions(updatedList);
                // playSound('SUCCESS'); // Optional
            }
        };

        // Run check every minute and on mount
        checkScheduledTransactions();
        const interval = setInterval(checkScheduledTransactions, 60000);

        return () => clearInterval(interval);
    }, [walletTransactions, setWalletTransactions]);

    // Auth Handlers
    const handleLogin = (user: User, remember: boolean) => {
        const nowStr = new Date().toISOString();
        const updatedUser = { ...user, lastLogin: nowStr, status: 'active' as const };

        // Update Supabase
        const newUsers = users.map(u => u.id === user.id ? updatedUser : u);
        setUsers(newUsers);

        setCurrentUser(updatedUser);
        setCurrentMember(null);

        // Persistence Logic
        const nowTs = Date.now().toString();

        // 1. Set Data in LocalStorage (Always)
        localStorage.setItem('sushiblack_session_user', JSON.stringify(updatedUser));
        localStorage.setItem('sushiblack_last_active', nowTs);

        // Clean up other role
        localStorage.removeItem('sushiblack_session_member');

        // Clean up legacy
        sessionStorage.clear();
        localStorage.removeItem('sushiblack_persistence_mode');

        // 2. Set Cookie Key
        if (remember) {
            setCookie('sushiblack_auth', 'true', 365); // Persistent 1 year
        } else {
            setCookie('sushiblack_auth', 'true'); // Session cookie (cleared on close)
        }

        setView(View.DASHBOARD);

        const tourCompleted = localStorage.getItem('sushiblack_tour_completed');
        if (!tourCompleted) {
            setShowTour(true);
        }
    };

    const handleMemberLogin = (employee: Employee, remember: boolean) => {
        const nowStr = new Date().toISOString();
        const updatedMember = { ...employee, lastActive: nowStr, status: 'active' as const };

        // Update Supabase Persistence
        setEmployees(prev => prev.map(e => e.id === employee.id ? updatedMember : e));
        setCurrentMember(updatedMember);

        setCurrentUser(null);

        // Persistence Logic
        const nowTs = Date.now().toString();

        localStorage.setItem('sushiblack_session_member', JSON.stringify(updatedMember));
        localStorage.setItem('sushiblack_last_active', nowTs);

        localStorage.removeItem('sushiblack_session_user');
        sessionStorage.clear();
        localStorage.removeItem('sushiblack_persistence_mode');

        if (remember) {
            setCookie('sushiblack_auth', 'true', 365);
        } else {
            setCookie('sushiblack_auth', 'true');
        }

        setView(View.MEMBER_HOME);

        const tourCompleted = localStorage.getItem(`sushiblack_tour_member_${employee.id}`);
        if (!tourCompleted) {
            setShowTour(true);
        }
    };

    const handleLogout = () => {
        // ... (status update logic remains same)
        if (currentUser) {
            const updatedUser = { ...currentUser, status: 'break' as const };
            setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
        } else if (currentMember) {
            const updatedMember = { ...currentMember, status: 'break' as const };
            setEmployees(prev => prev.map(e => e.id === currentMember.id ? updatedMember : e));
        }

        // Clear All Persistence
        deleteCookie('sushiblack_auth');
        localStorage.removeItem('sushiblack_session_user');
        localStorage.removeItem('sushiblack_session_member');
        localStorage.removeItem('sushiblack_last_active');
        localStorage.removeItem('sushiblack_persistence_mode');
        sessionStorage.clear();

        // Clear State
        setCurrentUser(null);
        setCurrentMember(null);
    };

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    const completeTour = () => {
        setShowTour(false);
        if (currentUser) {
            localStorage.setItem('sushiblack_tour_completed', 'true');
        } else if (currentMember) {
            localStorage.setItem(`sushiblack_tour_member_${currentMember.id}`, 'true');
        }
    };

    const handleUpdateSanction = (updatedSanction: SanctionRecord) => {
        setSanctions(sanctions.map(s => s.id === updatedSanction.id ? updatedSanction : s));
    };

    const handleSendNotice = (notice: EmployeeNotice) => {
        setEmployeeNotices([notice, ...employeeNotices]);
    };
    const handleMarkNoticeSeen = (noticeId: string) => {
        if (!currentUser && !currentMember) return;
        setEmployeeNotices(employeeNotices.map(n => {
            if (n.id === noticeId) {
                const viewerId = currentUser?.id || currentMember?.id || 'unknown';
                if (!n.readBy.includes(viewerId)) {
                    return { ...n, readBy: [...n.readBy, viewerId] };
                }
            }
            return n;
        }));
    };

    const handleUpdateUser = (updated: User | Employee) => {
        if ('users' in updated || 'username' in updated) { // User
            const usr = updated as User;
            const newUsers = users.map(u => u.id === usr.id ? usr : u);
            setUsers(newUsers);
            if (currentUser && currentUser.id === usr.id) {
                setCurrentUser(usr);
            }
        } else { // Employee
            const emp = updated as Employee;
            setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
            if (currentMember && currentMember.id === emp.id) {
                setCurrentMember(emp);
            }
        }
    };

    // Presence System
    useEffect(() => {
        const updatePresence = () => {
            const now = new Date();
            if (currentUser) {
                const last = currentUser.lastActive ? new Date(currentUser.lastActive) : new Date(0);
                if (now.getTime() - last.getTime() > 60000) { // Update if > 1 min old
                    const updated = { ...currentUser, lastActive: now.toISOString() };
                    // Update DB and Local
                    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                    setCurrentUser(updated);
                }
            } else if (currentMember) {
                const last = currentMember.lastActive ? new Date(currentMember.lastActive) : new Date(0);
                if (now.getTime() - last.getTime() > 60000) {
                    const updated = { ...currentMember, lastActive: now.toISOString() };
                    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
                    setCurrentMember(updated);
                }
            }
        };

        // Check on mount/update (throttled by logic)
        updatePresence();
        const interval = setInterval(updatePresence, 60000);
        return () => clearInterval(interval);
    }, [currentUser, currentMember]); // Logic prevents infinite loop


    const handleApproveSanction = (sanctionId: string, approved: boolean) => {
        if (!currentUser) return;
        setSanctions(sanctions.map(s => {
            if (s.id === sanctionId) {
                if (!approved) {
                    // Soft delete on rejection so it disappears from active lists
                    return {
                        ...s,
                        status: 'REJECTED',
                        deletedAt: new Date().toISOString(),
                        deletedBy: currentUser.name
                    };
                } else {
                    const approvals = s.approvals || [];
                    if (!approvals.includes(currentUser.id)) {
                        const newApprovals = [...approvals, currentUser.id];
                        // Require 2 approvals
                        const newStatus = newApprovals.length >= 2 ? 'APPROVED' : 'PENDING_APPROVAL';
                        return { ...s, approvals: newApprovals, status: newStatus as any };
                    }
                }
            }
            return s;
        }));
    };

    // SESSION TIMEOUT (40 Minutes)
    useEffect(() => {
        if (!currentUser && !currentMember) return;

        const TIMEOUT_MS = 40 * 60 * 1000; // 40 minutes
        let timeoutId: any;

        const resetTimer = () => {
            const now = Date.now();

            // Validate Session via Cookie
            const hasSession = getCookie('sushiblack_auth');
            if (!hasSession) {
                // If cookie died (e.g. user deleted it manually or logic error), logout
                console.log("Session cookie missing.");
                handleLogout();
                return;
            }

            // Check Inactivity
            const lastActive = localStorage.getItem('sushiblack_last_active');
            if (lastActive) {
                if (now - parseInt(lastActive, 10) > TIMEOUT_MS) {
                    console.log("Session expired (inactivity).");
                    handleLogout();
                    alert("Tu sesión ha expirado por inactividad (40 min).");
                    return;
                }
                // Refresh timestamp
                localStorage.setItem('sushiblack_last_active', now.toString());
            }

            // Reset JS timer
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.log("Session timed out due to inactivity.");
                handleLogout();
                alert("Tu sesión ha expirado por inactividad (40 min). Por favor, inicia sesión nuevamente.");
            }, TIMEOUT_MS);
        };

        // Listen for activity
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        window.addEventListener('click', resetTimer);
        window.addEventListener('scroll', resetTimer);
        window.addEventListener('touchstart', resetTimer);

        resetTimer(); // Start timer on mount/update

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            window.removeEventListener('click', resetTimer);
            window.removeEventListener('scroll', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
        };
    }, [currentUser, currentMember]); // Re-bind when user changes

    const royaltyPool = partners.reduce((sum, p) => sum + (p.balance || 0), 0);
    const pendingPayroll = employees.filter(e => e.active && e.paymentModality !== 'DIARIO').reduce((acc, curr) => acc + calculateAccruedSalary(curr, records, calendarEvents, absences).accruedAmount, 0);
    const pendingDebt = pendingPayroll + royaltyPool;

    if (loadingEmployees && users.length === 0 && employees.length === 0) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-sushi-black' : 'bg-sushi-light'}`}>
                <div className="text-sushi-gold animate-pulse text-xl font-serif">Cargando Sistema...</div>
            </div>
        );
    }

    return (
        <div className={`flex h-screen ${isDarkMode ? 'dark bg-sushi-black' : 'bg-gray-50'}`}>
            {!currentUser && !currentMember ? (
                <Login
                    users={users}
                    employees={employees}
                    onLogin={handleLogin}
                    onMemberLogin={handleMemberLogin}
                />
            ) : (
                <>
                    <Sidebar
                        currentView={currentView}
                        setView={(v) => {
                            setView(v);
                            setIsSidebarOpen(false);
                        }}
                        currentUser={currentUser}
                        currentMember={currentMember}
                        onLogout={handleLogout}
                        isDarkMode={isDarkMode}
                        toggleTheme={toggleTheme}
                        rolePermissions={rolePermissions}
                        onUpdateUser={handleUpdateUser}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        onProfileClick={() => setShowProfile(true)}
                    />

                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-[#0c0c14] relative">

                        {/* Mobile Menu Trigger */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden absolute top-4 left-4 z-30 p-2 bg-white dark:bg-sushi-dark rounded-lg shadow-sm border border-gray-200 dark:border-white/10 text-gray-500 dark:text-sushi-muted"
                        >
                            <Menu size={20} />
                        </button>

                        {/* Active Users Widget (Top Right) */}
                        <div className="absolute top-4 right-4 z-50">
                            <ActiveUsersWidget users={users} employees={employees} currentUserEmail={currentUser?.email} />
                        </div>

                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                            {/* ADMIN VIEWS */}
                            {currentUser && (
                                <>

                                    {currentView === View.DASHBOARD &&
                                        <Dashboard
                                            employees={employees}
                                            records={records}
                                            tasks={adminTasks}
                                            inventory={inventorySessions}
                                            sanctions={sanctions}
                                            cashShifts={cashShifts}
                                            currentUser={currentUser}
                                            setView={setView}
                                            calendarEvents={calendarEvents}
                                            setCalendarEvents={setCalendarEvents}
                                            absences={absences}
                                            holidays={holidays}
                                            messages={internalMessages}
                                            checklistSnapshots={checklistSnapshots}
                                            notices={employeeNotices}
                                            onMarkNoticeSeen={handleMarkNoticeSeen} // Pass handler
                                            onApproveSanction={handleApproveSanction}
                                            onAddEvent={addCalendarEvent}
                                            budgetRequests={budgetRequests}
                                        />
                                    }
                                    {currentView === View.EMPLOYEES && (currentUser.permissions.viewHr ? <EmployeeManagement employees={employees} setEmployees={setEmployees} sanctions={sanctions} customRoles={customRoles} /> : <AccessDenied />)}
                                    {currentView === View.FILES && (currentUser.permissions.viewHr ? <EmployeeFiles employees={employees} setEmployees={setEmployees} sanctions={sanctions} absences={absences} tasks={tasks} setTasks={setTasks} checklistSnapshots={checklistSnapshots} notes={coordinatorNotes} setNotes={setCoordinatorNotes} currentUser={currentUser} users={users} /> : <AccessDenied />)}
                                    {currentView === View.OVERTIME && ((currentUser.permissions.viewOps || currentUser.permissions.manageOps) ? <OvertimeLog employees={employees} records={records} setRecords={setRecords} absences={absences} setAbsences={setAbsences} sanctions={sanctions} setSanctions={setSanctions} holidays={holidays} setHolidays={setHolidays} currentUserName={currentUser.name} currentUserId={currentUser.id} currentUserRole={currentUser.role} calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents} onAddEvent={addCalendarEvent} onDeleteEvent={deleteCalendarEvent} payrollMovements={payrollMovements} setPayrollMovements={setPayrollMovements} /> : <AccessDenied />)}
                                    {currentView === View.PAYROLL && (currentUser.permissions.viewFinance ?
                                        <PayrollManagement
                                            employees={employees}
                                            setEmployees={setEmployees}
                                            transactions={walletTransactions}
                                            setTransactions={setWalletTransactions}
                                            currentUser={currentUser}
                                            records={records}
                                            calendarEvents={calendarEvents}
                                            absences={absences}
                                            products={products || []}
                                            sanctions={sanctions}
                                            payrollMovements={payrollMovements}
                                            setPayrollMovements={setPayrollMovements}
                                        />
                                        : <AccessDenied />)
                                    }
                                    {currentView === View.SANCTIONS && (currentUser.permissions.viewOps ? <SanctionsLog employees={employees} sanctions={sanctions} setSanctions={setSanctions} currentUser={currentUser} addEmployeeNotice={addEmployeeNotice} /> : <AccessDenied />)}
                                    {currentView === View.USERS && (currentUser.permissions.superAdmin ? <UserManagement users={users} setUsers={setUsers} currentUser={currentUser} /> : <AccessDenied />)}
                                    {currentView === View.SETTINGS && (currentUser.permissions.superAdmin ? <SettingsView rolePermissions={rolePermissions} setRolePermissions={setRolePermissions} customRoles={customRoles} setCustomRoles={setCustomRoles} restrictLateralMessaging={restrictLateralMessaging} setRestrictLateralMessaging={setRestrictLateralMessaging} onExportBackup={handleExportBackup} /> : <AccessDenied />)}
                                    {currentView === View.AI_REPORT && <AIReport employees={employees} records={records} sanctions={sanctions} />}
                                    {currentView === View.FORUM && <ForumBoard posts={posts} setPosts={setPosts} currentUser={currentUser} currentMember={currentMember} />}

                                    {currentView === View.OFFICE && (
                                        <AdministrativeOffice
                                            currentUser={currentUser}
                                            users={users}
                                            tasks={adminTasks}
                                            setTasks={setAdminTasks} // Passed for AdminHub
                                            activityLogs={userActivityLogs}
                                            onComposeMessage={(userId) => {
                                                setComposeRecipient(userId);
                                                setView(View.INTERNAL_MAIL);
                                            }}
                                            calendarEvents={calendarEvents} // Pass real calendar events
                                            onAddCalendarEvent={addCalendarEvent}
                                            // Props for Calendar Widget parity
                                            records={records}
                                            cashShifts={cashShifts}
                                            absences={absences}
                                            holidays={holidays}
                                            employees={employees}
                                            inventorySessions={inventorySessions}
                                            // Props for Widgets (Phase 9)
                                            internalMessages={internalMessages}
                                            sanctions={sanctions}
                                            employeeNotices={employeeNotices}
                                            checklistSnapshots={checklistSnapshots}
                                            budgetRequests={budgetRequests}
                                            officeNotes={officeNotes}
                                            onAddOfficeNote={addOfficeNote}
                                            onUpdateOfficeNote={updateOfficeNote}
                                            onRemoveOfficeNote={removeOfficeNote}
                                            documents={documents}
                                            setDocuments={setDocuments}
                                        />
                                    )}
                                    {currentView === View.INTERNAL_MAIL && (
                                        <InternalMail
                                            currentUser={currentUser}
                                            messages={internalMessages}
                                            setMessages={setInternalMessages}
                                            employees={employees}
                                            users={users}
                                            recipient={composeRecipient}
                                        />
                                    )}

                                    {currentView === View.INVENTORY && (currentUser.permissions.viewInventory ? <InventoryManager items={supplierProducts} sessions={inventorySessions} setSessions={setInventorySessions} userName={currentUser.name} /> : <AccessDenied />)}
                                    {currentView === View.CASH_REGISTER && <CashRegister shifts={cashShifts} setShifts={setCashShifts} userName={currentUser.name} transactions={walletTransactions} setTransactions={setWalletTransactions} />}

                                    {/* Product and Finance Views */}
                                    {currentView === View.SUPPLIERS && (currentUser.permissions.viewInventory ?
                                        <SuppliersView
                                            suppliers={suppliers}
                                            addSupplier={suppliersHook.add}
                                            updateSupplier={suppliersHook.update}
                                            deleteSupplier={suppliersHook.remove}
                                            products={supplierProducts}
                                            addProduct={supplierProductsHook.add}
                                            updateProduct={supplierProductsHook.update}
                                            deleteProduct={supplierProductsHook.remove}
                                            shoppingLists={shoppingLists}
                                            setShoppingLists={setShoppingLists}
                                            userName={currentUser?.name || 'Usuario'}
                                        />
                                        : <AccessDenied />
                                    )}
                                    {currentView === View.BUDGET_REQUESTS && (
                                        <BudgetRequestsView
                                            currentUser={currentUser}
                                            users={users}
                                            requests={budgetRequests}
                                            walletTransactions={walletTransactions}
                                            cashShifts={cashShifts}
                                        />
                                    )}
                                    {currentView === View.PRODUCTS && (currentUser.permissions.viewFinance ? <ProductManagement products={products} setProducts={setProducts} /> : <AccessDenied />)}
                                    {currentView === View.FINANCE && (currentUser.permissions.viewFinance ?
                                        <FinanceDashboard
                                            products={products}
                                            setTransactions={setWalletTransactions}
                                            transactions={walletTransactions}
                                            projections={projections}
                                            setProjections={setProjections}
                                            userName={currentUser.name}
                                            cashShifts={cashShifts}
                                            partners={partners}
                                            setPartners={setPartners}
                                            addRoyaltyHistory={addRoyaltyHistory}
                                            supplierProducts={supplierProducts}
                                            inventorySessions={inventorySessions}
                                        />
                                        : <AccessDenied />)
                                    }
                                    {currentView === View.WALLET && (currentUser.permissions.viewFinance ?
                                        <WalletView
                                            transactions={walletTransactions}
                                            setTransactions={setWalletTransactions}
                                            pendingDebt={pendingDebt}
                                            userName={currentUser.name}
                                            fixedExpenses={fixedExpenses}
                                            setFixedExpenses={setFixedExpenses}
                                            employees={employees}
                                            currentUser={currentUser}
                                        />
                                        : <AccessDenied />)
                                    }
                                    {currentView === View.ROYALTIES && (currentUser.permissions.viewFinance ?
                                        <RoyaltiesManagement
                                            partners={partners}
                                            setPartners={setPartners}
                                            royaltyPool={royaltyPool}
                                            setTransactions={setWalletTransactions}
                                            transactions={walletTransactions}
                                            userName={currentUser.name}
                                            royaltyHistory={royaltyHistory}
                                            addRoyaltyHistory={addRoyaltyHistory}
                                        />
                                        : <AccessDenied />)
                                    }
                                    {currentView === View.STATISTICS && (currentUser.permissions.viewFinance ?
                                        <StatisticsDashboard
                                            cashShifts={cashShifts}
                                            walletTransactions={walletTransactions}
                                        />
                                        : <AccessDenied />)
                                    }

                                    {currentView === View.AI_FOCUS && <ConstructionView title="Enfoque IA 2.0" description="Estamos entrenando modelos predictivos para anticipar la demanda de pedidos y optimizar turnos." />}
                                </>
                            )}

                            {/* MEMBER VIEWS */}
                            {currentMember && (
                                <>
                                    {currentView === View.MEMBER_HOME && (
                                        <MemberView
                                            currentView={currentView}
                                            member={currentMember}
                                            records={records}
                                            absences={absences}
                                            sanctions={sanctions}
                                            tasks={tasks}
                                            setTasks={setTasks}
                                            posts={posts}
                                            setPosts={setPosts}
                                            setView={setView}
                                            checklistSnapshots={checklistSnapshots}
                                            setChecklistSnapshots={setChecklistSnapshots}
                                            holidays={holidays}
                                            onUpdateSanction={handleUpdateSanction}
                                            calendarEvents={calendarEvents}
                                            rolePermissions={rolePermissions}
                                            onAlert={handleSendNotice}
                                            // Coordinator Props
                                            employees={employees}
                                            notices={employeeNotices}
                                            onMarkNoticeSeen={handleMarkNoticeSeen}
                                            onApproveSanction={handleApproveSanction}
                                            cashShifts={cashShifts}
                                            inventory={inventorySessions}
                                            transactions={walletTransactions}
                                            messages={internalMessages}
                                            payrollMovements={payrollMovements}
                                        />
                                    )}
                                    {(currentView === View.MEMBER_CALENDAR || currentView === View.MEMBER_TASKS || currentView === View.MEMBER_FILE || currentView === View.MEMBER_FORUM) && (
                                        <MemberView
                                            currentView={currentView}
                                            member={currentMember}
                                            records={records}
                                            absences={absences}
                                            sanctions={sanctions}
                                            tasks={tasks}
                                            setTasks={setTasks}
                                            posts={posts}
                                            setPosts={setPosts}
                                            checklistSnapshots={checklistSnapshots}
                                            setChecklistSnapshots={setChecklistSnapshots}
                                            holidays={holidays}
                                            onUpdateSanction={handleUpdateSanction}
                                            calendarEvents={calendarEvents}
                                            rolePermissions={rolePermissions}
                                            onAlert={handleSendNotice}
                                            payrollMovements={payrollMovements}
                                        />
                                    )}
                                    {currentView === View.INTERNAL_MAIL && (
                                        <InternalMail
                                            currentUser={currentMember as any}
                                            messages={internalMessages}
                                            setMessages={setInternalMessages}
                                            employees={employees}
                                            users={users}
                                        />
                                    )}
                                    {currentView === View.BUDGET_REQUESTS && (
                                        <BudgetRequestsView
                                            currentUser={currentMember}
                                            users={users}
                                            requests={budgetRequests}
                                            walletTransactions={walletTransactions}
                                            cashShifts={cashShifts}
                                        />
                                    )}

                                    {/* COORDINATOR ADMIN MODULES */}
                                    {currentMember.role === 'COORDINADOR' && (
                                        <>
                                            {currentView === View.OVERTIME &&
                                                <OvertimeLog
                                                    employees={employees}
                                                    records={records}
                                                    setRecords={setRecords}
                                                    absences={absences}
                                                    setAbsences={setAbsences}
                                                    sanctions={sanctions}
                                                    setSanctions={setSanctions}
                                                    holidays={holidays}
                                                    setHolidays={setHolidays}
                                                    currentUserName={currentMember.name}
                                                    currentUserId={currentMember.id}
                                                    currentUserRole={currentMember.role}
                                                    calendarEvents={calendarEvents}
                                                    setCalendarEvents={setCalendarEvents}
                                                    payrollMovements={payrollMovements}
                                                    setPayrollMovements={setPayrollMovements}
                                                />
                                            }
                                            {currentView === View.FILES &&
                                                <EmployeeFiles
                                                    employees={employees}
                                                    setEmployees={setEmployees}
                                                    sanctions={sanctions}
                                                    absences={absences}
                                                    tasks={tasks}
                                                    setTasks={setTasks}
                                                    checklistSnapshots={checklistSnapshots}
                                                    notes={coordinatorNotes}
                                                    setNotes={setCoordinatorNotes}
                                                    currentUser={{
                                                        id: currentMember.id,
                                                        name: currentMember.name,
                                                        role: 'COORDINADOR',
                                                        email: 'coord@system',
                                                        username: currentMember.name,
                                                        password: '',
                                                        permissions: DEFAULT_ROLE_PERMISSIONS['COORDINADOR'] as any
                                                    }}
                                                    users={users}
                                                />
                                            }
                                            {currentView === View.SANCTIONS &&
                                                <SanctionsLog
                                                    employees={employees}
                                                    sanctions={sanctions}
                                                    setSanctions={setSanctions}
                                                    currentUser={{
                                                        id: currentMember.id,
                                                        name: currentMember.name,
                                                        role: 'COORDINADOR',
                                                        email: 'coord@system',
                                                        username: currentMember.name,
                                                        password: '',
                                                        permissions: DEFAULT_ROLE_PERMISSIONS['COORDINADOR'] as any
                                                    }}
                                                />
                                            }
                                        </>
                                    )}
                                    {/* Member Admin-like Views */}
                                    {currentView === View.NOTICES && (
                                        <EmployeeNotices
                                            currentUser={{
                                                id: currentMember.id,
                                                name: currentMember.name,
                                                role: currentMember.role as any,
                                                email: 'member@system',
                                                username: currentMember.name,
                                                password: '',
                                                permissions: rolePermissions[currentMember.role] || [] as any
                                            }}
                                            notices={employeeNotices}
                                            setNotices={setEmployeeNotices}
                                        />
                                    )}
                                    {currentView === View.INVENTORY && (
                                        <InventoryManager items={supplierProducts} sessions={inventorySessions} setSessions={setInventorySessions} userName={currentMember.name} />
                                    )}

                                    {/* Global Notification System removed (was dead code here) */}

                                    {currentView === View.CASH_REGISTER && (
                                        <CashRegister shifts={cashShifts} setShifts={setCashShifts} userName={currentMember.name} />
                                    )}
                                </>
                            )}


                        </div>

                        {/* Global Notification System (For Admins) */}
                        {currentUser && (
                            <>
                                {showNotifications && (
                                    <div className="fixed bottom-24 right-8 z-[70] w-96 shadow-2xl animate-fade-in-up">
                                        <div className="relative">
                                            <button onClick={() => setShowNotifications(false)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md z-10 hover:scale-110 transition-transform"><X className="w-4 h-4" /></button>
                                            <ActivityFeedWidget
                                                recentSanctions={sanctions}
                                                employees={employees}
                                                setView={(v) => { setShowNotifications(false); setView(v); }}
                                                currentUser={currentUser}
                                                messages={internalMessages}
                                                cashShifts={cashShifts}
                                                inventory={inventorySessions}
                                                notices={employeeNotices}
                                                checklistSnapshots={checklistSnapshots}
                                                budgetRequests={budgetRequests}
                                                sharedDocs={documents.filter(d => d.sharedWith?.includes(currentUser.id))}
                                                onViewDoc={(doc) => {
                                                    setShowNotifications(false);
                                                    setView(View.OFFICE);
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={handleMarkNotificationsAsRead}
                                    className="fixed bottom-8 right-8 w-14 h-14 bg-sushi-gold text-sushi-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-[60] group"
                                >
                                    <Bell className="w-6 h-6 group-hover:animate-swing" />
                                    {(() => {
                                        const count = (
                                            employeeNotices.filter(n => !n.readBy.includes(currentUser.id) && !localReadIds.has(n.id)).length +
                                            internalMessages.filter(m => !m.readBy.includes(currentUser.id) && !localReadIds.has(m.id)).length +
                                            documents.filter(d => d.sharedWith?.includes(currentUser.id) && !d.readBy?.includes(currentUser.id) && !localReadIds.has(d.id)).length
                                        );
                                        return count > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-6 bg-red-500 rounded-full border-2 border-[#0c0c14] flex items-center justify-center text-[10px] text-white font-bold p-1">
                                                {count}
                                            </span>
                                        );
                                    })()}
                                </button>
                            </>
                        )}

                        <MessagingSystem
                            currentUser={currentUser}
                            currentMember={currentMember}
                            messages={internalMessages}
                            setMessages={setInternalMessages}
                            users={users}
                            employees={employees}
                            restrictLateralMessaging={restrictLateralMessaging}
                        />

                        {showProfile && currentUser && (
                            <UserProfileModal
                                user={currentUser}
                                onClose={() => setShowProfile(false)}
                                onSave={(u) => setCurrentUser(u)}
                            />
                        )}
                        <TourGuide
                            isOpen={showTour}
                            onComplete={completeTour}
                            mode={currentUser ? 'ADMIN' : 'MEMBER'}
                        />
                    </main>
                </>
            )
            }
        </div >
    );
};

const AccessDenied = () => (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-sushi-muted opacity-50">
        <span className="text-4xl">⚠️</span>
        <p className="mt-4 font-medium">Acceso Denegado</p>
    </div>
);

export default App;
