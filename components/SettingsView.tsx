
import React, { useState } from 'react';
import { RolePermissions, PermissionKey, EmployeeRole, UserRole, UserPermissions } from '../types';
import { Settings, Shield, Plus, Trash2, Box, Wallet, Lock, Save, Briefcase, User, FileText, CheckSquare, Calendar, MessageCircle, Mail, Download, Upload } from 'lucide-react';
import { playSound } from '../utils/soundUtils';
import { supabase } from '../supabaseClient';
import { useSupabaseCollection } from '../hooks/useSupabase';
import { generateUserManual } from '../utils/manualGenerator';

interface SettingsViewProps {
    rolePermissions: RolePermissions;
    setRolePermissions: React.Dispatch<React.SetStateAction<RolePermissions>>;
    customRoles: string[];
    setCustomRoles: React.Dispatch<React.SetStateAction<string[]>>;
    restrictLateralMessaging: boolean;
    setRestrictLateralMessaging: React.Dispatch<React.SetStateAction<boolean>>;
    onExportBackup: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ rolePermissions, setRolePermissions, customRoles, setCustomRoles, restrictLateralMessaging, setRestrictLateralMessaging, onExportBackup }) => {
    const [newRoleName, setNewRoleName] = useState('');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetCode, setResetCode] = useState('');

    const handleHardReset = async () => {
        if (resetCode !== 'CONFIRMAR') return;
        playSound('CLICK');

        try {
            // Tables to WIPE (Order matters for foreign keys if ON DELETE CASCADE isn't set, but usually it is)
            // We'll trust Supabase constraints or delete deeply dependent first.
            const tablesToWipe = [
                'records', 'absences', 'sanctions', 'tasks', 'checklist_snapshots',
                'posts', 'admin_tasks', 'internal_messages', 'employee_notices',
                'coordinator_notes', 'calendar_events', 'inventory_sessions',
                'cash_shifts', 'wallet_transactions', 'fixed_expenses',
                'projections', 'partners', 'employees'
            ];

            // Parallel execution for speed, but sequential might be safer for FKs. 
            // Let's do sequential to be safe.
            for (const table of tablesToWipe) {
                const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
                if (error) console.error(`Error clearing ${table}:`, error);
            }

            // Clear LocalStorage artifacts (except critical ones)
            // We KEEP: sushiblack_role_permissions, sushiblack_custom_roles, sushiblack_theme
            const keysToKeep = ['sushiblack_role_permissions', 'sushiblack_custom_roles', 'sushiblack_theme', 'sb-access-token', 'sb-refresh-token'];

            // Iterate and remove others? Or just leave them?
            // User requested "Reinicio de datos".
            // Let's explicitly clear cached collections if any
            localStorage.removeItem('sushiblack_tour_completed');

            alert('REINICIO COMPLETO. El sistema se recargará.');
            window.location.reload();

        } catch (e) {
            console.error(e);
            alert('Hubo un error al eliminar los datos.');
        }
    };

    const handleImportData = async (data: any) => {
        try {
            // Basic Import Logic - iterating known keys
            const collections = [
                'employees', 'records', 'absences', 'sanctions', 'tasks',
                'checklist_snapshots', 'posts', 'admin_tasks', 'inventory_sessions',
                'cash_shifts', 'wallet_transactions', 'fixed_expenses', 'partners'
            ];

            let count = 0;
            for (const col of collections) {
                if (data[col] && Array.isArray(data[col])) {
                    // Upsert each
                    if (data[col].length > 0) {
                        const { error } = await supabase.from(col).upsert(data[col]);
                        if (error) console.error(`Error importing ${col}`, error);
                        else count += data[col].length;
                    }
                }
            }
            playSound('SUCCESS');
            alert(`Importación completada. Se procesaron registros en ${collections.length} tablas. Recargando...`);
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Error crítico en importación');
        }
    };

    // Default system roles
    const systemRoles: EmployeeRole[] = [
        'EMPRESA', 'GERENTE', 'COORDINADOR', 'JEFE_COCINA', 'ADMINISTRATIVO', 'MOSTRADOR', 'COCINA', 'REPARTIDOR', 'DELIVERY'
    ];

    const userRoles: UserRole[] = ['MANAGER', 'COORDINADOR', 'ENCARGADO', 'CAJERO'];

    // State for User Role Defaults (Persisted in LocalStorage)
    const [userRoleDefaults, setUserRoleDefaults] = useState<Record<UserRole, UserPermissions>>(() => {
        const saved = localStorage.getItem('sushiblack_user_role_defaults');
        if (saved) return JSON.parse(saved);
        // Initial Defaults
        return {
            'MANAGER': { viewHr: true, manageHr: true, createHr: true, editHr: true, deleteHr: true, viewOps: true, manageOps: true, createOps: true, editOps: true, deleteOps: true, viewFinance: true, manageFinance: true, createFinance: true, editFinance: true, deleteFinance: true, viewInventory: true, manageInventory: true, createInventory: true, editInventory: true, deleteInventory: true, superAdmin: false },
            'COORDINADOR': { viewHr: true, manageHr: false, viewOps: true, manageOps: false, viewFinance: false, manageFinance: false, viewInventory: true, manageInventory: true, superAdmin: false },
            'ENCARGADO': { viewHr: false, manageHr: false, viewOps: true, manageOps: false, viewFinance: false, manageFinance: false, viewInventory: true, manageInventory: true, superAdmin: false },
            'CAJERO': { viewHr: false, manageHr: false, viewOps: false, manageOps: false, viewFinance: true, manageFinance: false, viewInventory: true, manageInventory: false, superAdmin: false },
            'ADMIN': { viewHr: true, manageHr: true, superAdmin: true, viewOps: true, manageOps: true, viewFinance: true, manageFinance: true, viewInventory: true, manageInventory: true } // Usually unused as ADMIN is hardcoded check
        };
    });

    const toggleUserPermission = (role: UserRole, key: keyof UserPermissions) => {
        const newDefaults = { ...userRoleDefaults, [role]: { ...userRoleDefaults[role], [key]: !userRoleDefaults[role][key] } };
        setUserRoleDefaults(newDefaults);
        localStorage.setItem('sushiblack_user_role_defaults', JSON.stringify(newDefaults));
        playSound('CLICK');
    };

    const allRoles = [...systemRoles, ...customRoles];

    const permissionModules: { id: PermissionKey; label: string; icon: any }[] = [
        { id: 'canViewInventory', label: 'Inventario', icon: Box },
        { id: 'canViewCash', label: 'Caja / Movimientos', icon: Wallet },
        { id: 'canViewFinancials', label: 'Finanzas (Sueldo)', icon: Save },
        { id: 'canViewChecklist', label: 'Tareas / Checklist', icon: CheckSquare },
        { id: 'canViewProfile', label: 'Perfil / Contrato', icon: User },
        { id: 'canViewCalendar', label: 'Calendario', icon: Calendar },
        { id: 'canViewForum', label: 'Foro Staff', icon: MessageCircle },
        { id: 'canViewCommunication', label: 'Comunicación', icon: Mail },
    ];

    const togglePermission = (role: string, permission: PermissionKey) => {
        const currentPermissions = rolePermissions[role] || [];
        const hasPermission = currentPermissions.includes(permission);

        let newPermissions;
        if (hasPermission) {
            newPermissions = currentPermissions.filter(p => p !== permission);
        } else {
            newPermissions = [...currentPermissions, permission];
        }

        setRolePermissions({ ...rolePermissions, [role]: newPermissions });
        playSound('CLICK');
    };

    const handleAddRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;
        const formattedName = newRoleName.toUpperCase().replace(/\s+/g, '_');

        if (allRoles.includes(formattedName)) {
            alert('Este rol ya existe.');
            return;
        }

        setCustomRoles([...customRoles, formattedName]);
        setNewRoleName('');
        playSound('SUCCESS');
    };

    const handleDeleteRole = (role: string) => {
        if (window.confirm(`¿Eliminar rol personalizado ${role}?`)) {
            setCustomRoles(customRoles.filter(r => r !== role));
            // Clean up permissions
            const newPermissions = { ...rolePermissions };
            delete newPermissions[role];
            setRolePermissions(newPermissions);
            playSound('CLICK');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div>
                <h2 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                    <Settings className="w-8 h-8 text-sushi-gold" />
                    Configuración del Sistema
                </h2>
                <div className="flex justify-between items-end">
                    <p className="text-gray-500 dark:text-sushi-muted mt-2">Personaliza roles, permisos y funciones.</p>
                </div>
            </div>

            {/* Messaging Restrictions */}
            <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                            <Mail className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Restringir Mensajería Lateral</h3>
                            <p className="text-sm text-gray-500 dark:text-sushi-muted">
                                Si se activa, los empleados generales (Mozo, Cocina, etc.) SOLO podrán enviar mensajes a Coordinadores y Administradores.
                                <br />Los Coordinadores y Administradores aún podrán escribirle a cualquiera.
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={restrictLateralMessaging}
                            onChange={(e) => {
                                setRestrictLateralMessaging(e.target.checked);
                                playSound(e.target.checked ? 'SUCCESS' : 'CLICK');
                            }}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500 group-hover:ring-2 ring-red-500/20"></div>
                    </label>
                </div>
            </div>


            {/* Role Permissions Matrix */}
            <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 mb-6">
                    <Shield className="w-6 h-6 text-blue-500" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Matriz de Permisos (Miembros)</h3>
                </div>

                <p className="text-sm text-gray-500 dark:text-sushi-muted mb-6">
                    Control total sobre qué puede ver y hacer cada empleado desde su portal personal.
                </p>

                <div className="overflow-x-auto pb-4">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-black/20 text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted">
                                <th className="p-4 rounded-tl-lg sticky left-0 bg-gray-50 dark:bg-black/20 z-10 shadow-sm">Rol / Jerarquía</th>
                                {permissionModules.map(mod => (
                                    <th key={mod.id} className="p-4 text-center min-w-[100px]">
                                        <div className="flex flex-col items-center gap-1">
                                            <mod.icon className="w-4 h-4 text-gray-400" />
                                            <span className="text-[10px] leading-tight">{mod.label}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {allRoles.map(role => (
                                <tr key={role} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                    <td className="p-4 font-bold text-gray-900 dark:text-white flex items-center gap-2 sticky left-0 bg-white dark:bg-sushi-dark z-10 border-r border-gray-100 dark:border-white/5">
                                        {customRoles.includes(role) ? <Briefcase className="w-4 h-4 text-sushi-gold" /> : <Shield className="w-4 h-4 text-gray-400" />}
                                        {role.replace(/_/g, ' ')}
                                    </td>
                                    {permissionModules.map(mod => {
                                        const hasAccess = (rolePermissions[role] || []).includes(mod.id);
                                        return (
                                            <td key={mod.id} className="p-4 text-center">
                                                <label className="relative inline-flex items-center cursor-pointer justify-center group">
                                                    <input
                                                        type="checkbox"
                                                        checked={hasAccess}
                                                        onChange={() => togglePermission(role, mod.id)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:bg-sushi-gold after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white group-hover:ring-2 ring-sushi-gold/20"></div>
                                                </label>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Granular User Permissions Matrix */}
            <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm overflow-hidden mt-8">
                <div className="flex items-center gap-2 mb-6">
                    <User className="w-6 h-6 text-indigo-500" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Matriz de Permisos (Usuarios de Sistema)</h3>
                </div>

                <p className="text-sm text-gray-500 dark:text-sushi-muted mb-6">
                    Definición granular de permisos para los roles de usuario que acceden al panel de administración.
                </p>

                <div className="overflow-x-auto pb-4">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-black/20 text-[10px] uppercase tracking-wider text-gray-500 dark:text-sushi-muted">
                                <th className="p-4 rounded-tl-lg sticky left-0 bg-gray-50 dark:bg-black/20 z-10 shadow-sm w-40">Rol de Usuario</th>
                                {/* Module Headers */}
                                <th className="p-2 text-center border-l border-gray-200 dark:border-white/5" colSpan={5}>Recursos Humanos</th>
                                <th className="p-2 text-center border-l border-gray-200 dark:border-white/5" colSpan={6}>Operaciones</th>
                                <th className="p-2 text-center border-l border-gray-200 dark:border-white/5" colSpan={6}>Finanzas</th>
                                <th className="p-2 text-center border-l border-gray-200 dark:border-white/5" colSpan={5}>Inventario</th>
                            </tr>
                            <tr className="bg-gray-50 dark:bg-black/20 text-[9px] uppercase tracking-wider text-gray-400 dark:text-sushi-muted/70">
                                <th className="sticky left-0 bg-gray-50 dark:bg-black/20 z-10"></th>
                                {/* HR */}
                                <th className="text-center p-1">Ver</th><th className="text-center p-1">Crear</th><th className="text-center p-1">Editar</th><th className="text-center p-1">Borrar</th><th className="text-center p-1 border-r border-gray-100 dark:border-white/5">Full</th>
                                {/* Ops */}
                                <th className="text-center p-1">Ver</th><th className="text-center p-1">Crear</th><th className="text-center p-1">Editar</th><th className="text-center p-1">Borrar</th><th className="text-center p-1">Aprobar</th><th className="text-center p-1 border-r border-gray-100 dark:border-white/5">Full</th>
                                {/* Fin */}
                                <th className="text-center p-1">Ver</th><th className="text-center p-1">Crear</th><th className="text-center p-1">Editar</th><th className="text-center p-1">Borrar</th><th className="text-center p-1">Aprobar</th><th className="text-center p-1 border-r border-gray-100 dark:border-white/5">Full</th>
                                {/* Inv */}
                                <th className="text-center p-1">Ver</th><th className="text-center p-1">Crear</th><th className="text-center p-1">Editar</th><th className="text-center p-1">Borrar</th><th className="text-center p-1">Full</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {userRoles.map(role => (
                                <tr key={role} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                    <td className="p-4 font-bold text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-sushi-dark z-10 border-r border-gray-100 dark:border-white/5">
                                        {role}
                                    </td>

                                    {/* HR */}
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.viewHr} onChange={() => toggleUserPermission(role, 'viewHr')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.createHr} onChange={() => toggleUserPermission(role, 'createHr')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.editHr} onChange={() => toggleUserPermission(role, 'editHr')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.deleteHr} onChange={() => toggleUserPermission(role, 'deleteHr')} className="accent-sushi-gold" /></td>
                                    <td className="text-center border-r border-gray-100 dark:border-white/5"><input type="checkbox" checked={!!userRoleDefaults[role]?.manageHr} onChange={() => toggleUserPermission(role, 'manageHr')} className="accent-blue-500" /></td>

                                    {/* Ops */}
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.viewOps} onChange={() => toggleUserPermission(role, 'viewOps')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.createOps} onChange={() => toggleUserPermission(role, 'createOps')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.editOps} onChange={() => toggleUserPermission(role, 'editOps')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.deleteOps} onChange={() => toggleUserPermission(role, 'deleteOps')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.approveOps} onChange={() => toggleUserPermission(role, 'approveOps')} className="accent-purple-500" /></td>
                                    <td className="text-center border-r border-gray-100 dark:border-white/5"><input type="checkbox" checked={!!userRoleDefaults[role]?.manageOps} onChange={() => toggleUserPermission(role, 'manageOps')} className="accent-blue-500" /></td>

                                    {/* Finance */}
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.viewFinance} onChange={() => toggleUserPermission(role, 'viewFinance')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.createFinance} onChange={() => toggleUserPermission(role, 'createFinance')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.editFinance} onChange={() => toggleUserPermission(role, 'editFinance')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.deleteFinance} onChange={() => toggleUserPermission(role, 'deleteFinance')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.approveFinance} onChange={() => toggleUserPermission(role, 'approveFinance')} className="accent-purple-500" /></td>
                                    <td className="text-center border-r border-gray-100 dark:border-white/5"><input type="checkbox" checked={!!userRoleDefaults[role]?.manageFinance} onChange={() => toggleUserPermission(role, 'manageFinance')} className="accent-blue-500" /></td>

                                    {/* Inventory */}
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.viewInventory} onChange={() => toggleUserPermission(role, 'viewInventory')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.createInventory} onChange={() => toggleUserPermission(role, 'createInventory')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.editInventory} onChange={() => toggleUserPermission(role, 'editInventory')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.deleteInventory} onChange={() => toggleUserPermission(role, 'deleteInventory')} className="accent-sushi-gold" /></td>
                                    <td className="text-center"><input type="checkbox" checked={!!userRoleDefaults[role]?.manageInventory} onChange={() => toggleUserPermission(role, 'manageInventory')} className="accent-blue-500" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Role Creator */}
            <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Briefcase className="w-6 h-6 text-purple-500" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Roles Personalizados</h3>
                </div>

                <div className="flex gap-4 mb-6">
                    <form onSubmit={handleAddRole} className="flex-1 flex gap-2">
                        <input
                            type="text"
                            value={newRoleName}
                            onChange={e => setNewRoleName(e.target.value)}
                            placeholder="Nombre del nuevo rol (Ej. Supervisor Limpieza)"
                            className="flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 outline-none focus:border-sushi-gold dark:text-white"
                        />
                        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Crear
                        </button>
                    </form>
                </div>

                <div className="flex flex-wrap gap-3">
                    {customRoles.length === 0 && <p className="text-gray-400 dark:text-sushi-muted text-sm italic">No hay roles personalizados creados.</p>}
                    {customRoles.map(role => (
                        <div key={role} className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10">
                            <span className="font-bold text-gray-700 dark:text-white text-sm">{role.replace(/_/g, ' ')}</span>
                            <button onClick={() => handleDeleteRole(role)} className="text-gray-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Data Security Section */}
            <div className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-sushi-gold/10 rounded-lg">
                        <Save className="w-5 h-5 text-sushi-gold" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Seguridad de Datos</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-center justify-between p-4 bg-gray-50 dark:bg-black/40 rounded-lg border border-gray-200 dark:border-white/5">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white mb-1">Copia de Seguridad Local</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Exporta o importa un archivo JSON con la información del sistema.</p>
                    </div>
                    <div className="flex gap-3">
                        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer">
                            <Upload className="w-4 h-4" />
                            Importar Datos
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = async (ev) => {
                                        try {
                                            const json = JSON.parse(ev.target?.result as string);
                                            if (window.confirm(`¿Estás seguro de IMPORTAR datos? Esto sobrescribirá los datos existentes detectados en el archivo. Se encontraron ${Object.keys(json).length} colecciones.`)) {
                                                // Handle Import Logic Here or pass prop
                                                // Ideally we pass a prop onImportData. For now let's just alert strictly.
                                                // User instructions said "Add Configuration Import".
                                                // I will propagate it up or implement basic logic here if I have access to supabase. I do.
                                                await handleImportData(json);
                                            }
                                        } catch (err) {
                                            alert('Archivo inválido');
                                        }
                                    };
                                    reader.readAsText(file);
                                }}
                            />
                        </label>
                        <button
                            onClick={() => { playSound('CLICK'); onExportBackup(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-sushi-gold text-sushi-black font-bold rounded-lg hover:bg-yellow-400 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Exportar Datos
                        </button>
                    </div>
                </div>
            </div>

            {/* DANGER ZONE - Factory Reset */}
            < div className="bg-white dark:bg-black/20 border border-red-200 dark:border-red-900/30 rounded-xl p-6 relative overflow-hidden" >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trash2 className="w-32 h-32 text-red-500" />
                </div>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Zona de Peligro</h2>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                    <div className="flex-1">
                        <h3 className="font-bold text-red-800 dark:text-red-400 mb-1">Reinicio de Fábrica</h3>
                        <p className="text-sm text-red-600/80 dark:text-red-400/70">
                            Elimina todos los datos operativos (Empleados, Ventas, Finanzas, Tareas, Chat).
                            <br /><span className="font-bold">Mantiene:</span> Usuarios de Login, Catálogo de Productos y Roles.
                        </p>
                    </div>

                    {!showResetConfirm ? (
                        <button
                            onClick={() => { playSound('CLICK'); setShowResetConfirm(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-black/40 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm whitespace-nowrap"
                        >
                            <Trash2 className="w-4 h-4" />
                            Iniciar Reinicio
                        </button>
                    ) : (
                        <div className="flex flex-col gap-2 w-full md:w-auto animate-fade-in">
                            <input
                                type="text"
                                placeholder="Escribe CONFIRMAR"
                                value={resetCode}
                                onChange={(e) => setResetCode(e.target.value)}
                                className="px-3 py-2 text-sm border border-red-300 dark:border-red-500/30 rounded bg-white dark:bg-black/40 text-red-700 dark:text-red-300 focus:outline-none focus:ring-2 ring-red-500"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowResetConfirm(false); setResetCode(''); }}
                                    className="px-3 py-1 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleHardReset}
                                    disabled={resetCode !== 'CONFIRMAR'}
                                    className="flex-1 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    BORRAR TODO
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MANUAL DE CAPACITACIÓN */}
            <div className="bg-white dark:bg-sushi-dark rounded-xl p-6 shadow-sm border border-gray-100 dark:border-white/5 mt-6">
                <h3 className="text-sm font-bold text-gray-500 dark:text-sushi-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Capacitación
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-sushi-muted">
                        <p>Descarga un manual en PDF con los pasos básicos para utilizar el sistema.</p>
                    </div>
                    <button
                        onClick={generateUserManual}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/30"
                    >
                        <Download className="w-5 h-5" />
                        Descargar Manual PDF
                    </button>
                </div>
            </div>
        </div>
    );
};
