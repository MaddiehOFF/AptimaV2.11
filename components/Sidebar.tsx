
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Users, Clock, BrainCircuit, AlertTriangle, UserCog, LogOut, Sun, Moon, FolderOpen, ClipboardCheck, CalendarRange, User, Banknote, MessageSquare, Briefcase, Box, LineChart, Sparkles, Command, Wallet, Tag, Crown, BarChart3, Settings, RefreshCcw, GripVertical, Edit3, Calendar, Camera, Upload, Menu, X, Truck, FileText, Zap, Coffee, BookOpen } from 'lucide-react';
import { supabase } from '../supabaseClient';

import { View, User as UserType, Employee, RolePermissions, PermissionKey, UserPermissions } from '../types';
import { playSound } from '../utils/soundUtils';
import { SidebarCustomizer, SidebarItemConfig } from './SidebarCustomizer';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    currentUser: UserType | null;
    currentMember: Employee | null;
    onLogout: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
    rolePermissions: RolePermissions;
    onUpdateUser?: (updated: UserType | Employee) => void;
    isOpen?: boolean;
    onClose?: () => void;
    onProfileClick?: () => void;
}

// --- STATIC DEFINITIONS ---

interface NavItemDef {
    id: string; // View enum or special ID
    label: string;
    icon: any;
    domId: string;
    permKey?: PermissionKey; // For members
    adminPerm?: keyof UserType['permissions'] | 'ALWAYS'; // For admins
}

const MEMBER_NAV_DEF: NavItemDef[] = [
    { id: View.MEMBER_HOME, label: 'Mi Panel', icon: LayoutDashboard, domId: 'mem-home', adminPerm: 'ALWAYS' }, // No perm required for home
    { id: View.MEMBER_FORUM, label: 'Muro Social', icon: MessageSquare, domId: 'mem-forum', permKey: 'canViewForum' },
    { id: View.MEMBER_TASKS, label: 'Mi Check-List', icon: ClipboardCheck, domId: 'mem-tasks', permKey: 'canViewChecklist' },
    { id: View.MEMBER_CALENDAR, label: 'Mi Calendario', icon: CalendarRange, domId: 'mem-calendar', permKey: 'canViewCalendar' },
    { id: View.MEMBER_FILE, label: 'Mi Expediente', icon: User, domId: 'mem-file', permKey: 'canViewProfile' },

    { id: View.INVENTORY, label: 'Inventario Cocina', icon: Box, domId: 'mem-inv', permKey: 'canViewInventory' },
    { id: View.CASH_REGISTER, label: 'Caja / Movimientos', icon: Wallet, domId: 'mem-cash', permKey: 'canViewCash' },
];


const ADMIN_NAV_GROUPS_DEF: { title: string; id: string; items: NavItemDef[] }[] = [
    {
        title: 'Principal',
        id: 'header-main',
        items: [
            { id: View.DASHBOARD, label: 'Panel General', icon: LayoutDashboard, domId: 'nav-dashboard', adminPerm: 'dashboard_view' },
        ]
    },
    {
        title: 'Gestión Operativa',
        id: 'header-ops',
        items: [
            { id: View.EMPLOYEES, label: 'Empleados', icon: Users, domId: 'nav-employees', adminPerm: 'hr_view' },
            { id: View.FILES, label: 'Expedientes', icon: FolderOpen, domId: 'nav-files', adminPerm: 'files_view' },
            { id: View.OVERTIME, label: 'Calendario', icon: Calendar, domId: 'nav-overtime', adminPerm: 'ops_view' },
            { id: View.SANCTIONS, label: 'Gestión Disciplinaria', icon: AlertTriangle, domId: 'nav-sanctions', adminPerm: 'sanctions_view' },
            { id: View.CASH_REGISTER, label: 'Caja / Movimientos', icon: Tag, domId: 'nav-cash', adminPerm: 'cash_view' },
        ]
    },
    {
        title: 'Finanzas',
        id: 'header-finance',
        items: [
            { id: View.WALLET, label: 'Billetera Global', icon: Wallet, domId: 'nav-wallet', adminPerm: 'wallet_view' },
            { id: View.ROYALTIES, label: 'Regalías Socios', icon: Crown, domId: 'nav-royalties', adminPerm: 'royalties_view' },
            { id: View.PAYROLL, label: 'Pagos y Nómina', icon: Banknote, domId: 'nav-payroll', adminPerm: 'payroll_view' },
            { id: View.FINANCE, label: 'Calculadora Costos', icon: LineChart, domId: 'nav-fin', adminPerm: 'finance_view' },
            { id: View.STATISTICS, label: 'Estadísticas', icon: BarChart3, domId: 'nav-stats', adminPerm: 'stats_view' },
        ]
    },
    {
        title: 'Administración',
        id: 'header-admin',
        items: [
            { id: View.OFFICE, label: 'Oficina Admin', icon: FolderOpen, domId: 'nav-office', adminPerm: 'office_view' },
            { id: View.INVENTORY, label: 'Inventario', icon: Box, domId: 'nav-inv', adminPerm: 'inventory_view' },
            { id: View.SUPPLIERS, label: 'Insumos', icon: Truck, domId: 'nav-insumos', adminPerm: 'suppliers_view' }, // Updated from inventory_view
            { id: View.USERS, label: 'Usuarios', icon: UserCog, domId: 'nav-users', adminPerm: 'users_view' },
            { id: View.PRODUCTS, label: 'Productos', icon: Box, domId: 'nav-products', adminPerm: 'products_view' },
            { id: View.SETTINGS, label: 'Configuración', icon: Settings, domId: 'nav-settings', adminPerm: 'settings_view' },
        ]
    },
    {
        title: 'Estratégico',
        id: 'header-strategic',
        items: [
            { id: View.FORUM, label: 'Foro Social', icon: MessageSquare, domId: 'nav-forum', adminPerm: 'member_view_welfare' },
            { id: View.AI_REPORT, label: 'Consultor IA', icon: BrainCircuit, domId: 'nav-ai-report', adminPerm: 'ai_view' }, // Updated from ALWAYS
            { id: View.MANUAL, label: 'Manual Operativo', icon: BookOpen, domId: 'nav-manual', adminPerm: 'manual_view' }, // Added
        ]
    },

];

const DigitalClock = () => {
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="px-6 py-4 mb-2 flex flex-col items-center justify-center border-t border-gray-100 dark:border-white/5 mx-4">
            <span className="text-3xl font-mono font-bold text-gray-800 dark:text-white tracking-tighter leading-none">
                {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-sushi-gold font-bold mt-1">
                {date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, currentUser, currentMember, onLogout, isDarkMode, toggleTheme, rolePermissions, onUpdateUser, isOpen = true, onClose, onProfileClick }) => {

    // File Upload
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 500;
                    const MAX_HEIGHT = 500;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG 70% quality
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                    const target = currentUser || currentMember;
                    if (target && onUpdateUser) {
                        onUpdateUser({ ...target, photoUrl: compressedBase64 });
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const [isCustomizing, setIsCustomizing] = useState(false);

    // --- CONFIGURATION STATE ---
    const [memberConfig, setMemberConfig] = useState<SidebarItemConfig[]>([]);
    const [adminConfig, setAdminConfig] = useState<SidebarItemConfig[]>([]);

    // --- INITIALIZE CONFIG ---
    useEffect(() => {
        if (currentMember) {
            const saved = localStorage.getItem(`sushiblack_sidebar_member_${currentMember.id}`);
            if (saved) {
                setMemberConfig(JSON.parse(saved));
            } else {
                // Default flat list
                const defaults = MEMBER_NAV_DEF.map((item, index) => ({
                    id: item.id,
                    label: item.label,
                    visible: true,
                    order: index,
                    isHeader: false
                }));
                setMemberConfig(defaults);
            }
        } else if (currentUser) {
            const saved = localStorage.getItem(`sushiblack_sidebar_admin_${currentUser.id}`);

            // Generate fresh default flat list from definitions
            let defaultFlat: SidebarItemConfig[] = [];
            let orderCount = 0;
            ADMIN_NAV_GROUPS_DEF.forEach(group => {
                defaultFlat.push({ id: group.id, label: group.title, visible: true, order: orderCount++, isHeader: true });
                group.items.forEach(item => {
                    defaultFlat.push({ id: item.id, label: item.label, visible: true, order: orderCount++, isHeader: false });
                });
            });

            if (saved) {
                let savedConfig: SidebarItemConfig[] = JSON.parse(saved);

                // SYNC: Check for missing items in saved config (e.g. new features like SUPPLIERS)
                const savedIds = new Set(savedConfig.map(i => i.id));
                const missingItems = defaultFlat.filter(def => !savedIds.has(def.id));

                if (missingItems.length > 0) {
                    console.log("Syncing missing sidebar items:", missingItems);
                    // Append missing items at the end
                    const nextOrder = Math.max(...savedConfig.map(i => i.order), 0) + 1;
                    missingItems.forEach((item, idx) => {
                        savedConfig.push({ ...item, order: nextOrder + idx });
                    });
                    // Save updated config immediately to avoid re-sync
                    localStorage.setItem(`sushiblack_sidebar_admin_${currentUser.id}`, JSON.stringify(savedConfig));
                }

                setAdminConfig(savedConfig);
            } else {
                setAdminConfig(defaultFlat);
            }
        }
    }, [currentMember?.id, currentUser?.id]);

    // --- DYNAMIC PERMISSION OVERRIDE LOGIC ---
    // Adds specific admin views to member sidebar if they have granular permissions
    useEffect(() => {
        let role = currentUser?.role || currentMember?.role || 'COCINA';
        if (currentMember) {
            role = role.toUpperCase().replace(/\s+/g, '_');
        }

        const perms = rolePermissions[role];
        if (!perms || memberConfig.length === 0) return;

        let needsUpdate = false;
        let newConfig = [...memberConfig];

        // 1. Definition Map for Dynamic Injection
        // Maps View ID -> Granular Permission Key required
        // 1. Definition Map for Dynamic Injection
        // Maps View ID -> Granular Permission Key required
        const adminViewsToInject = [
            { id: View.STATISTICS, label: 'Estadísticas', perm: 'stats_view', icon: BarChart3 },
            { id: View.WALLET, label: 'Billetera Global', perm: 'wallet_view', icon: Wallet },
            { id: View.INVENTORY, label: 'Inventario Cocina', perm: 'inventory_view', icon: Box },
            { id: View.ROYALTIES, label: 'Regalías y Socios', perm: 'royalties_view', icon: Crown },
            { id: View.SUPPLIERS, label: 'Insumos', perm: 'inventory_view', icon: Truck },
            { id: View.PRODUCTS, label: 'Productos', perm: 'products_view', icon: Tag },
            { id: View.SANCTIONS, label: 'Gestión Disciplinaria', perm: 'sanctions_view', icon: AlertTriangle },
            { id: View.FILES, label: 'Expedientes', perm: 'files_view', icon: FolderOpen },
            { id: View.OVERTIME, label: 'Calendario Equipo', perm: 'ops_view', icon: Calendar }
        ];

        // 2. Iterate and Inject
        adminViewsToInject.forEach(item => {
            let hasAccess = false;
            // Check Granular Perm
            if (perms[item.perm as keyof UserPermissions]) hasAccess = true;

            // Specific overrides (Legacy/Hybrid)
            if (item.id === View.OVERTIME && perms.member_view_team_calendar) hasAccess = true;
            if (item.id === View.FILES && perms.member_view_files) hasAccess = true;
            if (item.id === View.SANCTIONS && (perms.member_view_sanctions || perms.ops_view)) hasAccess = true;

            // If has permission AND not already in config
            if (hasAccess && !newConfig.find(i => i.id === item.id)) {
                newConfig.push({
                    id: item.id,
                    label: item.label,
                    visible: true,
                    order: 90 + newConfig.length // Append at end
                });
                needsUpdate = true;
            }
        });

        // 3. Remove Items if Permission Revoked (Bi-directional sync)
        // We only remove items that are NOT in MEMBER_NAV_DEF (i.e., injected ones)
        const memberDefIds = MEMBER_NAV_DEF.map(m => m.id);
        const injectedItems = newConfig.filter(c => !memberDefIds.includes(c.id));

        injectedItems.forEach(injected => {
            // Re-verify permission. If lost, remove.
            const def = adminViewsToInject.find(i => i.id === injected.id);
            if (def) {
                let stillHasAccess = false;
                // Check Granular Perm
                if (perms[def.perm as keyof UserPermissions]) stillHasAccess = true;

                // Specific overrides re-check
                if (def.id === View.OVERTIME && perms.member_view_team_calendar) stillHasAccess = true;
                if (def.id === View.FILES && perms.member_view_files) stillHasAccess = true;
                if (def.id === View.SANCTIONS && (perms.member_view_sanctions || perms.ops_view)) stillHasAccess = true;

                if (!stillHasAccess) {
                    const idx = newConfig.findIndex(c => c.id === injected.id);
                    if (idx !== -1) {
                        newConfig.splice(idx, 1);
                        needsUpdate = true;
                    }
                }
            }
        });

        if (needsUpdate && setMemberConfig) {
            newConfig.sort((a, b) => a.order - b.order);
            setMemberConfig(newConfig);
        }
    }, [currentUser, currentMember, rolePermissions, memberConfig, setMemberConfig]);

    const handleSaveConfig = (newConfig: SidebarItemConfig[]) => {
        if (currentMember) {
            setMemberConfig(newConfig);
            localStorage.setItem(`sushiblack_sidebar_member_${currentMember.id}`, JSON.stringify(newConfig));
        } else if (currentUser) {
            setAdminConfig(newConfig);
            localStorage.setItem(`sushiblack_sidebar_admin_${currentUser.id}`, JSON.stringify(newConfig));
        }
    };

    // --- RENDER HELPERS ---

    const renderMemberSidebar = () => {
        let myRole = currentMember?.role || 'COCINA';
        if (currentMember) {
            myRole = myRole.toUpperCase().replace(/\s+/g, '_');
        }
        const myPermissions = rolePermissions[myRole];

        const hasPermission = (key: PermissionKey | undefined, adminPerm?: string) => {
            // 1. Native Member Check
            if (key) {
                if (!myPermissions) return false;
                if (myPermissions.superAdmin) return true;
                const pAny = myPermissions as any;
                switch (key) {
                    case 'canViewChecklist': return myPermissions.member_view_checklist ?? false;
                    case 'canViewCalendar': return myPermissions.member_view_calendar ?? false;
                    case 'canViewTeamCalendar': return myPermissions.member_view_team_calendar;
                    case 'canViewOtherFiles': return myPermissions.member_view_files;
                    case 'canViewForum': return myPermissions.member_view_welfare ?? false;
                    case 'canViewInventory': return myPermissions.inventory_view ?? pAny.viewInventory;
                    case 'canViewCash': return myPermissions.cash_view ?? pAny.viewFinance;
                    case 'canViewSanctions': return myPermissions.sanctions_view ?? (pAny.viewOps || myPermissions.member_view_sanctions);
                    case 'canViewProfile': return myPermissions.member_view_profile ?? true; // Default true only for backward compatibility until robust migration
                    default: return false;
                }
            }

            // 2. Admin Perm Check (for injected items)
            if (adminPerm) {
                if (adminPerm === 'ALWAYS') return true;
                if (myPermissions && myPermissions[adminPerm as keyof UserPermissions]) return true;
            }

            return true; // If no key required
        };

        return memberConfig.map(configItem => {
            if (!configItem.visible) return null;

            // 1. Try finding in Member Defs
            let def = MEMBER_NAV_DEF.find(d => d.id === configItem.id);
            let isAdminItem = false;

            // 2. If not found, try finding in Admin Defs (Hybrid Injection)
            if (!def) {
                for (const group of ADMIN_NAV_GROUPS_DEF) {
                    const found = group.items.find(i => i.id === configItem.id);
                    if (found) {
                        def = found;
                        isAdminItem = true;
                        break;
                    }
                }
            }

            if (!def) return null;

            // Permission Check
            // If it's a native member item, use permKey. If injected admin item, use adminPerm.
            if (isAdminItem) {
                if (!hasPermission(undefined, def.adminPerm)) return null;
            } else {
                if (!hasPermission(def.permKey)) return null;
            }

            return (
                <button
                    key={def.id}
                    id={def.domId}
                    onClick={() => { setView(def.id as View); playSound('CLICK'); }}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group ${currentView === def.id ? 'bg-sushi-gold text-sushi-black font-semibold' : 'text-gray-500 dark:text-sushi-muted hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                    <def.icon className="w-5 h-5" />
                    <span>{def.label}</span>
                </button>
            );
        });
    };

    const renderAdminSidebar = () => {
        return adminConfig.map(configItem => {
            if (!configItem.visible) return null;

            if (configItem.isHeader) {
                return (
                    <p key={configItem.id} className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-sushi-muted mt-4 mb-2">
                        {configItem.label}
                    </p>
                );
            }

            // Find definition in groups
            let def: any = null;
            for (const group of ADMIN_NAV_GROUPS_DEF) {
                def = group.items.find(i => i.id === configItem.id);
                if (def) break;
            }
            if (!def) return null;

            // Check Permission
            // [FIX] CRITICAL: Master Key for ADMIN/EMPRESA
            const isSuper = currentUser?.role === 'ADMIN' || currentUser?.role === 'EMPRESA' || currentUser?.permissions?.superAdmin;

            if (!isSuper && def.adminPerm !== 'ALWAYS' && currentUser?.permissions) {
                const permKey = def.adminPerm as keyof typeof currentUser.permissions;
                let allowed = !!currentUser.permissions[permKey];

                // FALLBACK LEGACY
                if (!allowed) {
                    const LEGACY_MAP: any = { 'hr_view': 'viewHr', 'ops_view': 'viewOps', 'finance_view': 'viewFinance', 'inventory_view': 'viewInventory' };
                    if (LEGACY_MAP[permKey] && (currentUser.permissions as any)[LEGACY_MAP[permKey]]) allowed = true;
                }

                // [FIX] Fallback for Granular Member Permissions in Admin View
                if (!allowed) {
                    if (def.id === View.FILES && currentUser.permissions.member_view_files) allowed = true;
                    if (def.id === View.OVERTIME && currentUser.permissions.member_view_team_calendar) allowed = true;
                    if (def.id === View.SANCTIONS && currentUser.permissions.member_view_sanctions) allowed = true;
                }

                if (!allowed) return null;
            }

            const isActive = currentView === def.id;
            return (
                <button
                    key={def.id}
                    id={def.domId}
                    onClick={() => { setView(def.id as View); playSound('CLICK'); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group text-sm ${isActive
                        ? 'bg-sushi-gold text-sushi-black font-bold shadow-md shadow-sushi-gold/20'
                        : 'text-gray-500 dark:text-sushi-muted hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    <def.icon className={`w-4 h-4 ${isActive ? 'text-sushi-black' : 'text-gray-400 dark:text-sushi-muted group-hover:text-gray-900 dark:group-hover:text-white'}`} />
                    <span>{def.label}</span>
                </button>
            );
        });
    }

    const currentConfigForCustomizer = currentMember ? memberConfig : adminConfig;

    // --- ACTIVITY LOGGING ---

    useEffect(() => {
        // Only track if logged in
        if (!currentUser && !currentMember) return;
        const userId = currentUser?.id || currentMember?.id;
        const role = currentUser?.role || currentMember?.role;

        if (!userId) return;

        // On Mount / View Change:
        // 1. Calculate duration of PREVIOUS module (if exists in localStorage)
        // 2. Log it to Supabase
        // 3. Set NEW start time for CURRENT module

        const trackActivity = async () => {
            const now = Date.now();
            const lastModule = localStorage.getItem(`tracking_last_module_${userId}`);
            const lastStart = localStorage.getItem(`tracking_start_time_${userId}`);

            if (lastModule && lastStart) {
                const duration = (now - parseInt(lastStart)) / 1000; // Seconds
                if (duration > 5 && lastModule !== currentView) { // Min 5 seconds to count
                    // Log it
                    try {
                        await supabase.from('user_activity_logs').insert({
                            data: {
                                userId,
                                role,
                                module: lastModule,
                                startTime: new Date(parseInt(lastStart)).toISOString(),
                                endTime: new Date(now).toISOString(),
                                duration: Math.round(duration)
                            }
                        });
                    } catch (e) {
                        console.error("Failed to log activity", e);
                    }
                }
            }

            // Set new session
            localStorage.setItem(`tracking_last_module_${userId}`, currentView);
            localStorage.setItem(`tracking_start_time_${userId}`, now.toString());
        };

        trackActivity();

    }, [currentView, currentUser?.id, currentMember?.id]);
    const triggerProfileUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Mobile Overlay and Sidebar
    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
                    onClick={onClose}
                />
            )}

            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-sushi-dark border-r border-gray-200 dark:border-white/10 flex flex-col h-full transform transition-transform duration-300 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-[-40px] md:hidden bg-white dark:bg-sushi-dark p-2 rounded-r-lg border-y border-r border-gray-200 dark:border-white/10 text-gray-500 dark:text-sushi-muted"
                >
                    <X size={20} />
                </button>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
                {/* Brand Header */}
                <div className="p-8 flex items-center gap-4 border-b border-gray-200 dark:border-white/5">
                    <div className="w-10 h-10 border-2 border-sushi-gold rounded-lg flex items-center justify-center">
                        <span className="font-serif font-bold text-xl text-sushi-gold leading-none pt-1">SB</span>
                    </div>
                    <div>
                        <h1 className="font-serif text-lg font-bold text-gray-900 dark:text-white tracking-wide">Sushiblack</h1>
                        <p className="text-[10px] text-gray-500 dark:text-sushi-muted uppercase tracking-widest font-medium">
                            {currentMember ? 'Portal Miembro' : 'Manager System'}
                        </p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 mt-2 overflow-y-auto">
                    {currentMember && renderMemberSidebar()}
                    {!currentMember && currentUser && renderAdminSidebar()}
                </nav>

                <div className="px-4">
                    <button
                        onClick={() => setIsCustomizing(true)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-400 dark:text-sushi-muted hover:text-sushi-gold dark:hover:text-white transition-colors border border-dashed border-gray-200 dark:border-white/10 rounded-lg hover:border-sushi-gold/30"
                    >
                        <Edit3 className="w-3 h-3" />
                        Personalizar Menú
                    </button>
                </div>

                <DigitalClock />
                <Footer
                    currentUser={currentUser}
                    currentMember={currentMember}
                    onLogout={onLogout}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    onUpdateUser={onUpdateUser}
                    triggerProfileUpload={triggerProfileUpload}
                    onProfileClick={onProfileClick}
                />

                <SidebarCustomizer
                    isOpen={isCustomizing}
                    onClose={() => setIsCustomizing(false)}
                    currentItems={currentConfigForCustomizer}
                    onSave={handleSaveConfig}
                />
            </div>
        </>
    );
};

const Footer = ({ currentUser, currentMember, onLogout, isDarkMode, toggleTheme, onUpdateUser, triggerProfileUpload, onProfileClick }: any) => {
    const userName = currentUser ? currentUser.name : (currentMember ? currentMember.name : 'Invitado');
    const userRole = currentUser ? 'Administración' : 'Miembro';

    const userStatus = currentUser?.status || currentMember?.status || 'active'; // Default to active if undefined

    return (
        <div className="p-4 border-t border-gray-200 dark:border-white/10 space-y-4 bg-gray-50 dark:bg-black/10">

            {/* Status Toggle - ONLY FOR SYSTEM USERS (Not Members) */}
            {currentUser && (
                <div className={`p-2 rounded-lg border flex items-center justify-between transition-colors ${userStatus === 'active'
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                    }`}>
                    <div className="flex items-center gap-2">
                        {userStatus === 'active' ? (
                            <div className="relative">
                                <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            </div>
                        ) : (
                            <Coffee className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                        )}
                        <div className="flex flex-col">
                            <span className={`text-xs font-bold leading-none ${userStatus === 'active' ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
                                {userStatus === 'active' ? 'Modo Activo' : 'En Descanso'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const target = currentUser;
                            if (target && onUpdateUser) {
                                const newStatus = userStatus === 'active' ? 'break' : 'active';
                                onUpdateUser({ ...target, status: newStatus });
                                playSound(newStatus === 'active' ? 'SUCCESS' : 'CLICK');
                            }
                        }}
                        className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider transition-all ${userStatus === 'active'
                            ? 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-100'
                            : 'bg-orange-200 text-orange-800 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-100'
                            }`}
                    >
                        Cambiar
                    </button>
                </div>
            )}

            {/* Theme Toggle */}
            <div id="theme-toggle" className="flex items-center justify-between px-2 py-2 bg-white dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/5">
                <span className="text-xs font-medium text-gray-500 dark:text-sushi-muted px-2">Apariencia</span>
                <button
                    onClick={() => { toggleTheme(); playSound('CLICK'); }}
                    className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md p-1.5 shadow-sm hover:border-sushi-gold/50 transition-colors"
                >
                    {isDarkMode ? (
                        <>
                            <Moon className="w-3 h-3 text-sushi-gold" />
                            <span className="text-[10px] text-white">Oscuro</span>
                        </>
                    ) : (
                        <>
                            <Sun className="w-3 h-3 text-sushi-gold" />
                            <span className="text-[10px] text-gray-900">Claro</span>
                        </>
                    )}
                </button>
            </div>

            {/* Refresh Button */}
            <button
                onClick={() => { playSound('CLICK'); window.location.reload(); }}
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-black/20 text-gray-600 dark:text-sushi-muted border border-gray-200 dark:border-white/5 rounded-lg py-2 text-xs font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                title="Recargar página para ver cambios recientes"
            >
                <RefreshCcw className="w-3 h-3" />
                <span>Recargar Sistema</span>
            </button>

            <div className="flex items-center gap-3 px-2">
                <div
                    className="relative group w-10 h-10 rounded-full cursor-pointer shadow-sm"
                    onClick={() => {
                        const target = currentUser || currentMember;
                        if (target && onUpdateUser && triggerProfileUpload) {
                            triggerProfileUpload();
                        }
                    }}
                    title="Cambiar Foto de Perfil"
                >
                    <div className="w-full h-full rounded-full bg-sushi-gold text-sushi-black flex items-center justify-center font-bold uppercase overflow-hidden border border-sushi-gold/30">
                        {(currentUser?.photoUrl || currentMember?.photoUrl) ? (
                            <img src={currentUser?.photoUrl || currentMember?.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            userName.charAt(0)
                        )}
                    </div>
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Camera className="w-4 h-4 text-white" />
                    </div>
                </div>
                <div
                    className="overflow-hidden cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-2 -ml-2 transition-colors"
                    onClick={() => onProfileClick && onProfileClick()}
                    title="Ver Perfil y Estadísticas"
                >
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{userName}</p>
                    <p className="text-xs text-gray-500 dark:text-sushi-muted truncate">{userRole}</p>
                </div>
            </div>
            <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 text-gray-500 dark:text-sushi-muted hover:text-red-500 dark:hover:text-red-400 text-xs px-2 py-1 transition-colors"
            >
                <LogOut className="w-3 h-3" />
                <span>Cerrar Sesión</span>
            </button>
        </div >
    )
}
