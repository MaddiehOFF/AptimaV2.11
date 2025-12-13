import React, { useState, useEffect } from 'react';
import { UserPermissions } from '../types';
import {
    Shield, Briefcase, Plus, Trash2, Check, Save,
    Users, Clock, Wallet, Box, Loader2, AlertTriangle,
    ChevronRight, Lock, Grid, Settings, Layout,
    FileText, DollarSign, Building, Banknote, Tag, TrendingUp, Award, BarChart, MessageSquare,
    Truck, BrainCircuit, BookOpen
} from 'lucide-react';

import { playSound } from '../utils/soundUtils';
import { ConfirmationModal } from './common/ConfirmationModal';

interface RoleManagerProps {
    customRoles: string[];
    setCustomRoles: React.Dispatch<React.SetStateAction<string[]>>;
    rolePermissions: Record<string, UserPermissions>;
    onUpdatePermissions: (updated: Record<string, UserPermissions>) => Promise<void>;
}

// Default permissions for a new role
export const DEFAULT_PERMISSIONS: UserPermissions = {
    dashboard_view: false,
    hr_view: false, hr_create: false, hr_edit: false, hr_delete: false, hr_manage: false,
    ops_view: false, ops_edit: false, ops_delete: false, ops_manage: false,
    sanctions_view: false, sanctions_create: false, sanctions_approve: false, sanctions_manage: false,
    files_view: false, files_manage: false,
    cash_view: false, cash_register: false, cash_close: false, cash_delete: false, cash_manage: false,
    office_view: false, office_create: false, office_delete: false,
    payroll_view: false, payroll_manage: false,
    users_view: false, users_manage: false,
    products_view: false, products_manage: false,
    settings_view: false, settings_manage: false,
    finance_view: false, finance_manage: false,
    wallet_view: false, wallet_create: false, wallet_delete: false, wallet_manage: false,
    royalties_view: false, royalties_manage: false,
    stats_view: false,
    inventory_view: false, inventory_manage: false,
    member_view_calendar: true, member_view_team_calendar: false, member_view_files: false,
    member_view_profile: true, // Default to true for backward compat
    member_view_checklist: true, member_view_welfare: true, member_view_sanctions: false,
    superAdmin: false,

    // New Granular Keys
    suppliers_view: false, suppliers_manage: false,
    ai_view: false,
    manual_view: false, manual_manage: false
};

// --- MODULE DEFINITIONS ---
// This configuration drives the entire UI.
// It maps the User's concept of "Modules" to the underlying technical permissions.

interface ModuleAction {
    id: string;
    label: string;
    permKey: keyof UserPermissions;
    description?: string;
    danger?: boolean; // Highlights in red/warning
}

interface ModuleDefinition {
    id: string;
    label: string;
    icon: any;
    description: string;
    // The "Master Switch" permission usually corresponds to 'view' access
    basePermKey?: keyof UserPermissions;
    actions: ModuleAction[];
}

const SYSTEM_MODULES: ModuleDefinition[] = [
    // 1. Panel General (Dashboard)
    {
        id: 'DASHBOARD',
        label: 'Panel General',
        icon: Layout,
        description: 'Dashboard principal.',
        basePermKey: 'dashboard_view',
        actions: [{ id: 'view', label: 'Ver Panel', permKey: 'dashboard_view' }]
    },
    // 2. Empleados
    {
        id: 'HR',
        label: 'Empleados',
        icon: Users,
        description: 'Gestión de personal.',
        basePermKey: 'hr_view',
        actions: [
            { id: 'view', label: 'Ver Empleados', permKey: 'hr_view' },
            { id: 'create', label: 'Crear Empleados', permKey: 'hr_create' },
            { id: 'edit', label: 'Editar Empleados', permKey: 'hr_edit' },
            { id: 'delete', label: 'Eliminar Empleados', permKey: 'hr_delete', danger: true },
            { id: 'manage', label: 'Gestión Total', permKey: 'hr_manage', danger: true },
            { id: 'mem_profile', label: 'Ver Mi Expediente (Portal)', permKey: 'member_view_profile' }
        ]
    },
    // 3. Expedientes
    {
        id: 'FILES',
        label: 'Expedientes',
        icon: FileText,
        description: 'Archivos y documentos.',
        basePermKey: 'files_view',
        actions: [
            { id: 'view', label: 'Ver Expedientes', permKey: 'files_view' },
            { id: 'manage', label: 'Gestionar Archivos', permKey: 'files_manage' },
            { id: 'mem_files', label: 'Ver Otros Legajos (Portal)', permKey: 'member_view_files' }
        ]
    },
    // 4. Calendario (Operativo/Equipo)
    {
        id: 'OPERATIONS',
        label: 'Calendario',
        icon: Clock,
        description: 'Horarios y asistencia.',
        basePermKey: 'ops_view',
        actions: [
            { id: 'view', label: 'Ver Calendario', permKey: 'ops_view' },
            { id: 'edit', label: 'Editar Turnos', permKey: 'ops_edit' },
            { id: 'delete', label: 'Eliminar Turnos', permKey: 'ops_delete', danger: true },
            { id: 'manage', label: 'Administrar', permKey: 'ops_manage' },
            { id: 'mem_check', label: 'Acceso a Check-Lists (Portal)', permKey: 'member_view_checklist' },
            { id: 'mem_cal', label: 'Mi Calendario (Portal)', permKey: 'member_view_calendar' },
            { id: 'mem_team_cal', label: 'Calendario de Equipo (Portal)', permKey: 'member_view_team_calendar' }
        ]
    },
    // 5. Gestión Disciplinaria
    {
        id: 'SANCTIONS',
        label: 'Gestión Disciplinaria',
        icon: AlertTriangle,
        description: 'Sanciones y novedades.',
        basePermKey: 'sanctions_view',
        actions: [
            { id: 'view', label: 'Ver Sanciones', permKey: 'sanctions_view' },
            { id: 'create', label: 'Crear Sanción', permKey: 'sanctions_create' },
            { id: 'approve', label: 'Aprobar/Finalizar', permKey: 'sanctions_approve' },
            { id: 'manage', label: 'Gestión Total', permKey: 'sanctions_manage', danger: true },
            { id: 'mem_sanc', label: 'Ver Mis Sanciones (Portal)', permKey: 'member_view_sanctions' }
        ]
    },
    // 6. Caja / Movimientos (Using generic cash module)
    {
        id: 'CASH',
        label: 'Caja / Movimientos',
        icon: DollarSign,
        description: 'Control de efectivo.',
        basePermKey: 'cash_view',
        actions: [
            { id: 'view', label: 'Ver Caja', permKey: 'cash_view' },
            { id: 'register', label: 'Registrar', permKey: 'cash_register' },
            { id: 'close', label: 'Cerrar Caja', permKey: 'cash_close' },
            { id: 'manage', label: 'Gestión Total', permKey: 'cash_manage', danger: true }
        ]
    },
    // 7. Billetera Global
    {
        id: 'WALLET',
        label: 'Billetera Global',
        icon: Wallet,
        description: 'Gastos y deudas.',
        basePermKey: 'wallet_view',
        actions: [
            { id: 'view', label: 'Ver Billetera', permKey: 'wallet_view' },
            { id: 'create', label: 'Crear Movimiento', permKey: 'wallet_create' },
            { id: 'manage', label: 'Gestión Total', permKey: 'wallet_manage' }
        ]
    },
    // 8. Regalías Socios
    {
        id: 'ROYALTIES',
        label: 'Regalías Socios',
        icon: Award,
        description: 'Utilidades.',
        basePermKey: 'royalties_view',
        actions: [
            { id: 'view', label: 'Ver Regalías', permKey: 'royalties_view' },
            { id: 'manage', label: 'Gestionar', permKey: 'royalties_manage', danger: true }
        ]
    },
    // 9. Pagos y Nómina
    {
        id: 'PAYROLL',
        label: 'Pagos y Nómina',
        icon: Banknote,
        description: 'Sueldos y liquidaciones.',
        basePermKey: 'payroll_view',
        actions: [
            { id: 'view', label: 'Ver Nómina', permKey: 'payroll_view' },
            { id: 'manage', label: 'Procesar', permKey: 'payroll_manage', danger: true }
        ]
    },
    // 10. Calculadora Costos
    {
        id: 'FINANCE',
        label: 'Calculadora Costos',
        icon: TrendingUp,
        description: 'Análisis de costos.',
        basePermKey: 'finance_view',
        actions: [
            { id: 'view', label: 'Ver Calculadora', permKey: 'finance_view' },
            { id: 'manage', label: 'Gestionar', permKey: 'finance_manage' }
        ]
    },
    // 11. Estadísticas
    {
        id: 'STATS',
        label: 'Estadísticas',
        icon: BarChart,
        description: 'Métricas generales.',
        basePermKey: 'stats_view',
        actions: [{ id: 'view', label: 'Ver Estadísticas', permKey: 'stats_view' }]
    },
    // 12. Oficina Admin
    {
        id: 'OFFICE',
        label: 'Oficina Admin',
        icon: Building,
        description: 'Documentos internos.',
        basePermKey: 'office_view',
        actions: [
            { id: 'view', label: 'Ver Oficina', permKey: 'office_view' },
            { id: 'create', label: 'Crear Notas', permKey: 'office_create' },
            { id: 'delete', label: 'Eliminar', permKey: 'office_delete', danger: true }
        ]
    },
    // 13. Inventario (V2)
    {
        id: 'INVENTORY',
        label: 'Inventario (V2)',
        icon: Box,
        description: 'Control de stock.',
        basePermKey: 'inventory_view',
        actions: [
            { id: 'view', label: 'Ver Inventario', permKey: 'inventory_view' },
            { id: 'manage', label: 'Modificar Stock', permKey: 'inventory_manage' }
        ]
    },
    // 14. Insumos (Proveedores)
    {
        id: 'SUPPLIERS',
        label: 'Insumos',
        icon: Truck,
        description: 'Proveedores y compras.',
        basePermKey: 'suppliers_view',
        actions: [
            { id: 'view', label: 'Ver Insumos', permKey: 'suppliers_view' },
            { id: 'manage', label: 'Gestionar', permKey: 'suppliers_manage' }
        ]
    },
    // 15. Usuarios
    {
        id: 'USERS',
        label: 'Usuarios',
        icon: Shield,
        description: 'Administradores.',
        basePermKey: 'users_view',
        actions: [
            { id: 'view', label: 'Ver Usuarios', permKey: 'users_view' },
            { id: 'manage', label: 'Gestionar', permKey: 'users_manage', danger: true }
        ]
    },
    // 16. Productos (Catálogo)
    {
        id: 'PRODUCTS',
        label: 'Productos',
        icon: Tag,
        description: 'Catálogo de venta.',
        basePermKey: 'products_view',
        actions: [
            { id: 'view', label: 'Ver Productos', permKey: 'products_view' },
            { id: 'manage', label: 'Editar', permKey: 'products_manage' }
        ]
    },
    // 17. Configuración
    {
        id: 'SETTINGS',
        label: 'Configuración',
        icon: Settings,
        description: 'Ajustes del sistema.',
        basePermKey: 'settings_view',
        actions: [
            { id: 'view', label: 'Ver Configuración', permKey: 'settings_view' },
            { id: 'manage', label: 'Modificar', permKey: 'settings_manage', danger: true }
        ]
    },
    // 18. Foro Social
    {
        id: 'FORUM',
        label: 'Foro Social',
        icon: MessageSquare,
        description: 'Espacio común.',
        basePermKey: 'member_view_welfare',
        actions: [{ id: 'view', label: 'Acceso al Foro', permKey: 'member_view_welfare' }]
    },
    // 19. Consultor IA
    {
        id: 'AI_REPORT',
        label: 'Consultor IA',
        icon: BrainCircuit, // Need to import if not present, using default icon for now or check imports
        description: 'Asistente inteligente.',
        basePermKey: 'ai_view',
        actions: [{ id: 'view', label: 'Acceso IA', permKey: 'ai_view' }]
    },
    // 20. Manual Operativo
    {
        id: 'MANUAL',
        label: 'Manual Operativo',
        icon: BookOpen, // Need to import
        description: 'Guías y procedimientos.',
        basePermKey: 'manual_view',
        actions: [
            { id: 'view', label: 'Ver Manual', permKey: 'manual_view' },
            { id: 'manage', label: 'Editar Manual', permKey: 'manual_manage' }
        ]
    }
];

export const RoleManager: React.FC<RoleManagerProps> = ({ customRoles, setCustomRoles, rolePermissions, onUpdatePermissions }) => {
    // Selection State
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({
        isOpen: false, title: '', message: '', onConfirm: () => { },
    });

    const SYSTEM_ROLES: string[] = ['ADMIN', 'EMPRESA', 'GERENTE', 'COORDINADOR', 'JEFE_COCINA', 'ADMINISTRATIVO', 'MOSTRADOR', 'COCINA', 'REPARTIDOR'];
    const ALL_ROLES = [...SYSTEM_ROLES, ...customRoles];

    const getRoleLabel = (role: string) => role.replace(/_/g, ' ');

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;
        const formattedName = newRoleName.toUpperCase().replace(/\s+/g, '_');
        if (ALL_ROLES.includes(formattedName)) return alert('El rol ya existe.');

        const updatedCustomRoles = [...customRoles, formattedName];
        setCustomRoles(updatedCustomRoles);
        const updatedPermissions = { ...rolePermissions, [formattedName]: { ...DEFAULT_PERMISSIONS } };
        await onUpdatePermissions(updatedPermissions);
        setNewRoleName(''); setShowCreateInput(false); setSelectedRole(formattedName);
        playSound('SUCCESS');
    };

    const handleDeleteRole = (role: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Rol',
            message: `¿Estás seguro de eliminar el rol "${role}"?`,
            onConfirm: async () => {
                setCustomRoles(customRoles.filter(r => r !== role));
                const updatedPermissions = { ...rolePermissions };
                delete updatedPermissions[role];
                await onUpdatePermissions(updatedPermissions);
                if (selectedRole === role) setSelectedRole(null);
            }
        });
    };

    const togglePermission = async (permKey: keyof UserPermissions) => {
        if (!selectedRole) return;
        const currentPerms = rolePermissions[selectedRole] || { ...DEFAULT_PERMISSIONS };
        const updatedPerms = { ...currentPerms, [permKey]: !currentPerms[permKey] };
        await onUpdatePermissions({ ...rolePermissions, [selectedRole]: updatedPerms });
    };

    // Helper to check if a module is "Enabled" (has at least one permission active)
    const isModuleActive = (role: string, module: ModuleDefinition) => {
        const perms = rolePermissions[role];
        if (!perms) return false;
        if (module.basePermKey && perms[module.basePermKey]) return true;
        // If no base key, check if ANY action is active
        return module.actions.some(a => perms[a.permKey]);
    };

    const currentRolePermissions = selectedRole ? (rolePermissions[selectedRole] || DEFAULT_PERMISSIONS) : null;
    const activeModule = SYSTEM_MODULES.find(m => m.id === selectedModuleId);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-sushi-black dark:text-white">
                        <Shield className="w-6 h-6 text-sushi-gold" />
                        Matriz de Permisos
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Configura el acceso granular por rol.
                    </p>
                </div>
                <button
                    onClick={() => {
                        // Force update wrapper
                        onUpdatePermissions(rolePermissions).then(async () => {
                            playSound('SUCCESS');
                            alert("✅ Permisos actualizados correctamente.\nLos empleados verán los cambios al recargar su sesión.");
                        });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-sushi-gold text-sushi-black font-bold rounded-lg shadow-md hover:shadow-sushi-gold/30 hover:scale-105 transition-all"
                >
                    <Save className="w-4 h-4" />
                    <span>Guardar y Aplicar</span>
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-[700px] animate-fade-in bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                {/* COLUMN 1: ROLES LIST */}
                <div className="w-full lg:w-1/4 bg-white dark:bg-black/40 border-r border-gray-200 dark:border-white/5 flex flex-col">
                    <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-sushi-dark">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-sushi-gold" />
                            Roles
                        </h3>
                        <button onClick={() => setShowCreateInput(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-sushi-gold transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {showCreateInput && (
                        <div className="p-3 bg-gray-50 dark:bg-white/5 animate-slide-in">
                            <form onSubmit={handleCreateRole} className="flex gap-2">
                                <input autoFocus type="text" placeholder="NOMBRE_ROL" className="flex-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold uppercase dark:text-white" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} />
                                <button type="submit" className="p-1.5 bg-sushi-gold text-sushi-black rounded-lg"><Check className="w-4 h-4" /></button>
                            </form>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {ALL_ROLES.map(role => (
                            <div key={role} onClick={() => { setSelectedRole(role); setSelectedModuleId(null); playSound('CLICK'); }}
                                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedRole === role ? 'bg-sushi-gold text-sushi-black shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                <span className="font-bold text-sm">{getRoleLabel(role)}</span>
                                {!SYSTEM_ROLES.includes(role) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                        title="Eliminar Rol"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                {selectedRole === role && <ChevronRight className="w-4 h-4 opacity-50" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* COLUMN 2: MODULE SELECTOR */}
                <div className={`w-full lg:w-1/3 border-r border-gray-200 dark:border-white/5 flex flex-col bg-white dark:bg-sushi-dark transition-opacity duration-300 ${!selectedRole ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <div className="p-6 border-b border-gray-100 dark:border-white/5">
                        <h2 className="text-xl font-serif text-gray-900 dark:text-white flex items-center gap-2">
                            <Layout className="w-5 h-5 text-gray-400" />
                            Módulos Disponibles
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-green-500 mt-1">Selecciona un módulo para configurar sus acciones.</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {selectedRole && SYSTEM_MODULES.map(module => {
                            const isActive = isModuleActive(selectedRole, module);
                            const isSelected = selectedModuleId === module.id;
                            return (
                                <div key={module.id}
                                    onClick={() => { setSelectedModuleId(module.id); playSound('CLICK'); }}
                                    className={`
                                    relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col gap-2 group
                                    ${isSelected
                                            ? 'border-sushi-gold bg-sushi-gold/5 shadow-md'
                                            : 'border-transparent bg-gray-50 dark:bg-white/5 hover:border-gray-200 dark:hover:border-white/10'}
                                `}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isActive ? 'bg-sushi-gold text-sushi-black' : 'bg-gray-200 dark:bg-white/10 text-gray-500'}`}>
                                                <module.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className={`font-bold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{module.label}</h4>
                                            </div>
                                        </div>
                                        {isActive && <div className="bg-green-100 dark:bg-green-900/30 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Habilitado</div>}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 pl-[3.25rem]">{module.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* COLUMN 3: ACTION CONFIGURATOR */}
                <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#0c0c14] relative">
                    {!selectedRole || !selectedModuleId ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-white/20">
                            <Settings className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-sm font-medium">Selecciona un Rol y un Módulo</p>
                        </div>
                    ) : activeModule && currentRolePermissions && (
                        <>
                            <div className="p-6 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-sushi-dark shadow-sm z-10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <activeModule.icon className="w-6 h-6 text-sushi-gold" />
                                            Configurar: {activeModule.label}
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define qué puede hacer <span className="text-sushi-gold font-bold">{getRoleLabel(selectedRole)}</span> en este módulo.</p>
                                    </div>
                                    {/* Master Switch if applicable */}
                                    {activeModule.basePermKey && (
                                        <button
                                            onClick={() => togglePermission(activeModule.basePermKey!)}
                                            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors border ${currentRolePermissions[activeModule.basePermKey]
                                                ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                                                : 'bg-sushi-gold border-sushi-gold text-sushi-black hover:bg-sushi-gold/90'
                                                }`}
                                        >
                                            {currentRolePermissions[activeModule.basePermKey] ? 'Deshabilitar Todo' : 'Habilitar Módulo'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="grid grid-cols-1 gap-4">
                                    {activeModule.actions.map(action => {
                                        const isActive = currentRolePermissions[action.permKey];
                                        const isDanger = action.danger;
                                        return (
                                            <div
                                                key={action.id}
                                                onClick={() => { togglePermission(action.permKey); playSound(isActive ? 'CLICK' : 'SUCCESS'); }}
                                                className={`
                                                relative p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 group
                                                ${isActive
                                                        ? (isDanger ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30')
                                                        : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-sushi-gold/50'}
                                            `}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isActive ? (isDanger ? 'border-red-500 bg-red-500 text-white' : 'border-green-500 bg-green-500 text-white') : 'border-gray-300 dark:border-white/20'}`}>
                                                        {isActive && <Check className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <div>
                                                        <h5 className={`font-bold ${isActive ? (isDanger ? 'text-red-700 dark:text-red-400' : 'text-green-800 dark:text-green-400') : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {action.label}
                                                        </h5>
                                                        {action.description && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{action.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {isDanger && <Shield className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-gray-300'}`} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    type="danger"
                    confirmText="ELIMINAR"
                />
            </div>
        </div>
    );
};
