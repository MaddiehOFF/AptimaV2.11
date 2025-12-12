
import React, { useState, useEffect } from 'react';
import { UserPermissions, UserRole } from '../types';
import {
    Shield, Briefcase, Plus, Trash2, Check, Save,
    Users, Clock, Wallet, Box, Loader2, AlertTriangle,
    ChevronRight, Lock
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { playSound } from '../utils/soundUtils';
import { ConfirmationModal } from './common/ConfirmationModal';

interface RoleManagerProps {
    customRoles: string[];
    setCustomRoles: React.Dispatch<React.SetStateAction<string[]>>;
    rolePermissions: Record<string, UserPermissions>;
    onUpdatePermissions: (updated: Record<string, UserPermissions>) => Promise<void>;
}
// Default permissions for a new role (all false)
const DEFAULT_PERMISSIONS: UserPermissions = {
    // HR
    viewHr: false, manageHr: false, createHr: false, editHr: false, deleteHr: false,

    // Operations
    viewOps: false, manageOps: false, createOps: false, editOps: false, deleteOps: false, approveOps: false,

    // Finance
    viewFinance: false, manageFinance: false, createFinance: false, editFinance: false, deleteFinance: false, approveFinance: false,

    // Inventory
    viewInventory: false, manageInventory: false, createInventory: false, editInventory: false, deleteInventory: false,

    // System
    superAdmin: false,

    // Member Portal
    memberViewMyCalendar: true, // Default true
    memberViewTeamCalendar: false,
    memberViewAllFiles: false,
    memberViewChecklist: true, // Default true
    memberViewWelfare: true, // Default true
    memberViewSanctions: false // Default false for new roles
};

export const RoleManager: React.FC<RoleManagerProps> = ({ customRoles, setCustomRoles, rolePermissions, onUpdatePermissions }) => {
    // State
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [showCreateInput, setShowCreateInput] = useState(false);

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

    // System Roles that cannot be deleted
    // MATCHES EmployeeManagement & UserManagement
    const SYSTEM_ROLES: string[] = ['ADMIN', 'EMPRESA', 'GERENTE', 'COORDINADOR', 'JEFE_COCINA', 'ADMINISTRATIVO', 'MOSTRADOR', 'COCINA', 'REPARTIDOR'];

    const ROLE_LABELS: Record<string, string> = {
        'ADMIN': 'Administrador del Sistema',
        'EMPRESA': 'Dueño / Empresa',
        'GERENTE': 'Gerente',
        'COORDINADOR': 'Coordinador',
        'JEFE_COCINA': 'Jefe de Cocina',
        'ADMINISTRATIVO': 'Administrativo',
        'MOSTRADOR': 'Mostrador',
        'COCINA': 'Cocina',
        'REPARTIDOR': 'Delivery / Repartidor'
    };

    const getRoleLabel = (role: string) => ROLE_LABELS[role] || role.replace(/_/g, ' ');
    const ALL_ROLES = [...SYSTEM_ROLES, ...customRoles];

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;

        const formattedName = newRoleName.toUpperCase().replace(/\s+/g, '_');
        if (ALL_ROLES.includes(formattedName)) {
            alert('El rol ya existe.');
            return;
        }

        // Update Custom Roles List
        const updatedCustomRoles = [...customRoles, formattedName];
        setCustomRoles(updatedCustomRoles);

        // Define default permissions for new role
        const updatedPermissions = {
            ...rolePermissions,
            [formattedName]: { ...DEFAULT_PERMISSIONS }
        };

        await onUpdatePermissions(updatedPermissions);

        setNewRoleName('');
        setShowCreateInput(false);
        setSelectedRole(formattedName);
        playSound('SUCCESS');
    };

    const handleDeleteRole = (role: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Rol',
            message: `¿Estás seguro de eliminar el rol "${role}"? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                const updatedCustomRoles = customRoles.filter(r => r !== role);
                setCustomRoles(updatedCustomRoles);

                const updatedPermissions = { ...rolePermissions };
                delete updatedPermissions[role];

                await onUpdatePermissions(updatedPermissions);

                if (selectedRole === role) setSelectedRole(null);
            }
        });
    };

    const togglePermission = async (key: keyof UserPermissions) => {
        if (!selectedRole) return;

        const currentRolePerms = rolePermissions[selectedRole] || { ...DEFAULT_PERMISSIONS };
        const updatedRolePerms = {
            ...currentRolePerms,
            [key]: !currentRolePerms[key]
        };

        const updatedPermissions = {
            ...rolePermissions,
            [selectedRole]: updatedRolePerms
        };

        await onUpdatePermissions(updatedPermissions);
    };

    const getPermissionForRole = (role: string, key: keyof UserPermissions): boolean => {
        return rolePermissions[role]?.[key] || false;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[600px] animate-fade-in bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">

            {/* Sidebar: Role List */}
            <div className="w-full lg:w-1/3 bg-white dark:bg-black/40 border-r border-gray-200 dark:border-white/5 flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-sushi-dark">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-sushi-gold" />
                        Roles
                    </h3>
                    <button
                        onClick={() => setShowCreateInput(true)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-sushi-gold transition-colors"
                        title="Crear Nuevo Rol"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Create Role Input */}
                {showCreateInput && (
                    <div className="p-3 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 animate-slide-in">
                        <form onSubmit={handleCreateRole} className="flex gap-2">
                            <input
                                autoFocus
                                type="text"
                                placeholder="NOMBRE_ROL"
                                className="flex-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold uppercase"
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                            />
                            <button type="submit" className="p-1.5 bg-sushi-gold text-sushi-black rounded-lg">
                                <Check className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {ALL_ROLES.map(role => (
                        <div
                            key={role}
                            onClick={() => setSelectedRole(role)}
                            className={`
                                group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all
                                ${selectedRole === role ? 'bg-sushi-gold text-sushi-black shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                {SYSTEM_ROLES.includes(role) ? <Shield className="w-4 h-4 opacity-70" /> : <Users className="w-4 h-4 opacity-70" />}
                                <span className="font-bold text-sm">{getRoleLabel(role)}</span>
                            </div>

                            {!SYSTEM_ROLES.includes(role) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                                    className={`p-1.5 rounded-md hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all ${selectedRole === role ? 'text-sushi-black/50 hover:text-white' : 'text-gray-400'}`}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {selectedRole === role && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Area: Matrix */}
            <div className="flex-1 flex flex-col bg-white dark:bg-sushi-dark">
                {selectedRole ? (
                    <>
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
                            <div>
                                <h2 className="text-2xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                                    <span className="p-2 bg-sushi-gold/20 rounded-lg"><Lock className="w-6 h-6 text-sushi-gold" /></span>
                                    Permisos: {getRoleLabel(selectedRole)}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-sushi-muted ml-12 mt-1">Configura el acceso detallado para este rol.</p>
                            </div>
                            <button
                                onClick={() => onUpdatePermissions(rolePermissions)}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-sushi-gold text-sushi-black font-bold rounded-xl hover:bg-sushi-goldhover transform active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Cambios
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* HR Module */}
                            <PermissionGroup
                                title="Recursos Humanos"
                                icon={Users}
                                role={selectedRole}
                                permissions={rolePermissions[selectedRole] || DEFAULT_PERMISSIONS} // Fallback to avoid crash
                                toggle={togglePermission}
                                keys={{ view: 'viewHr', create: 'createHr', edit: 'editHr', delete: 'deleteHr', manage: 'manageHr' }}
                            />

                            {/* Operations Module */}
                            <PermissionGroup
                                title="Operaciones"
                                icon={Clock}
                                role={selectedRole}
                                permissions={rolePermissions[selectedRole] || DEFAULT_PERMISSIONS}
                                toggle={togglePermission}
                                keys={{ view: 'viewOps', create: 'createOps', edit: 'editOps', delete: 'deleteOps', approve: 'approveOps', manage: 'manageOps' }}
                            />

                            {/* Finance Module */}
                            <PermissionGroup
                                title="Finanzas"
                                icon={Wallet}
                                role={selectedRole}
                                permissions={rolePermissions[selectedRole] || DEFAULT_PERMISSIONS}
                                toggle={togglePermission}
                                keys={{ view: 'viewFinance', create: 'createFinance', edit: 'editFinance', delete: 'deleteFinance', approve: 'approveFinance', manage: 'manageFinance' }}
                            />

                            {/* Inventory Module */}
                            <PermissionGroup
                                title="Inventario"
                                icon={Box}
                                role={selectedRole}
                                permissions={rolePermissions[selectedRole] || DEFAULT_PERMISSIONS}
                                toggle={togglePermission}
                                keys={{ view: 'viewInventory', create: 'createInventory', edit: 'editInventory', delete: 'deleteInventory', manage: 'manageInventory' }}
                            />

                            {/* Member Portal Module */}
                            <MemberPermissionGroup
                                role={selectedRole}
                                permissions={rolePermissions[selectedRole] || DEFAULT_PERMISSIONS}
                                toggle={togglePermission}
                            />

                            {/* Super Admin - Careful */}
                            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-900 dark:text-red-400">Super Administrador</h4>
                                            <p className="text-xs text-red-700 dark:text-red-300">Otorga control total sobre el sistema, incluyendo gestión de usuarios y configuraciones.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={getPermissionForRole(selectedRole, 'superAdmin')}
                                            onChange={() => togglePermission('superAdmin')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <Shield className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-medium text-lg">Selecciona un rol para editar sus permisos</p>
                    </div>
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
    );
};

// Helper Component for Permission Groups
const PermissionGroup = ({ title, icon: Icon, role, permissions, toggle, keys }: any) => {
    return (
        <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-white/5 pb-2">
                <Icon className="w-4 h-4 text-sushi-gold" />
                {title}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <PermissionToggle label="Ver / Listar" active={permissions[keys.view]} onClick={() => toggle(keys.view)} />
                {keys.create && <PermissionToggle label="Crear" active={permissions[keys.create]} onClick={() => toggle(keys.create)} />}
                {keys.edit && <PermissionToggle label="Editar / Actualizar" active={permissions[keys.edit]} onClick={() => toggle(keys.edit)} />}
                {keys.delete && <PermissionToggle label="Eliminar" active={permissions[keys.delete]} onClick={() => toggle(keys.delete)} />}
                {keys.approve && <PermissionToggle label="Aprobar" active={permissions[keys.approve]} onClick={() => toggle(keys.approve)} />}
                {keys.manage && <PermissionToggle label="Control Total (Legacy)" active={permissions[keys.manage]} onClick={() => toggle(keys.manage)} highlight />}
            </div>
        </div>
    );
};

// Specialized Group for Member Portal because it doesn't follow CRUD pattern
const MemberPermissionGroup = ({ role, permissions, toggle }: any) => {
    return (
        <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-white/5 pb-2">
                <Briefcase className="w-4 h-4 text-sushi-gold" />
                Portal de Empleado
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <PermissionToggle label="Ver Mi Calendario" active={permissions.memberViewMyCalendar} onClick={() => toggle('memberViewMyCalendar')} />
                <PermissionToggle label="Ver Calendario Equipo" active={permissions.memberViewTeamCalendar} onClick={() => toggle('memberViewTeamCalendar')} highlight />
                <PermissionToggle label="Ver Otros Expedientes" active={permissions.memberViewAllFiles} onClick={() => toggle('memberViewAllFiles')} highlight />
                <PermissionToggle label="Gestión Disciplinaria (Novedades)" active={permissions.memberViewSanctions} onClick={() => toggle('memberViewSanctions')} highlight />
                <PermissionToggle label="Usar Check-List" active={permissions.memberViewChecklist} onClick={() => toggle('memberViewChecklist')} />
                <PermissionToggle label="Ver Muro Social" active={permissions.memberViewWelfare} onClick={() => toggle('memberViewWelfare')} />
            </div>
        </div>
    );
};

const PermissionToggle = ({ label, active, onClick, highlight }: any) => (
    <div
        onClick={onClick}
        className={`
            flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all
            ${active
                ? (highlight ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-500/30' : 'bg-sushi-gold/10 border-sushi-gold/50')
                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20'
            }
        `}
    >
        <div className={`
            w-5 h-5 rounded-full flex items-center justify-center border transition-colors
            ${active
                ? (highlight ? 'bg-blue-500 border-blue-500 text-white' : 'bg-sushi-gold border-sushi-gold text-sushi-black')
                : 'border-gray-300 dark:border-white/30 text-transparent'
            }
        `}>
            {active && <Check className="w-3 h-3" />}
        </div>
        <span className={`text-sm font-medium ${active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {label}
        </span>
    </div>
);
