
import React, { useState } from 'react';
import { RolePermissions, PermissionKey, EmployeeRole, UserRole, UserPermissions } from '../types';
import { Settings, Shield, Plus, Trash2, Box, Wallet, Lock, Save, Briefcase, User, FileText, CheckSquare, Calendar, MessageCircle, Mail, Download, Upload, ChevronDown, ChevronUp, Clock, Truck, DollarSign, Trophy } from 'lucide-react';
import { playSound } from '../utils/soundUtils';
import { supabase } from '../supabaseClient';
import { useSupabaseCollection } from '../hooks/useSupabase';
import { generateUserManual } from '../utils/manualGenerator';
import { changelogData } from './changelogData';
import { exportChangelogPDF } from '../utils/changelogExporter';
import { ConfirmationModal } from './common/ConfirmationModal';
import { MeritSettings } from './MeritSettings';
import { RoleManager } from './RoleManager';

interface SettingsViewProps {
    rolePermissions: RolePermissions;
    setRolePermissions: (p: RolePermissions) => void;
    customRoles: string[];
    setCustomRoles: (roles: string[]) => void;
    restrictLateralMessaging: boolean;
    setRestrictLateralMessaging: (v: boolean) => void;
    onExportBackup: () => void;
}

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = false, danger = false }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className={`bg-white dark:bg-sushi-dark border ${danger ? 'border-red-200 dark:border-red-900/30' : 'border-gray-200 dark:border-white/5'} rounded-xl shadow-sm overflow-hidden mb-6 transition-all`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-6 ${danger ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20' : 'bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10'} transition-colors cursor-pointer outline-none`}
            >
                <div className="flex items-center gap-3">
                    {Icon && <div className={`p-2 rounded-lg ${danger ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : 'bg-gray-100 dark:bg-white/10 text-sushi-gold'}`}>
                        <Icon className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-sushi-gold'}`} />
                    </div>}
                    <h3 className={`text-lg font-bold ${danger ? 'text-red-800 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{title}</h3>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {isOpen && <div className="p-6 border-t border-gray-100 dark:border-white/5 animate-fade-in">{children}</div>}
        </div>
    );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ rolePermissions, setRolePermissions, customRoles, setCustomRoles, restrictLateralMessaging, setRestrictLateralMessaging, onExportBackup }) => {
    const [newRoleName, setNewRoleName] = useState('');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetCode, setResetCode] = useState('');

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

    const sortedChangelog = [...changelogData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-4 animate-fade-in pb-10">
            <div className="mb-8">
                <h2 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                    <Settings className="w-8 h-8 text-sushi-gold" />
                    Configuración del Sistema
                </h2>
                <div className="flex justify-between items-end">
                    <p className="text-gray-500 dark:text-sushi-muted mt-2">Personaliza roles, permisos y funciones.</p>
                </div>
            </div>

            {/* Gamification Settings */}
            <CollapsibleSection title="Gamificación y Méritos" icon={Trophy} defaultOpen={false}>
                <p className="text-sm text-gray-500 dark:text-sushi-muted mb-6">
                    Define los tipos de méritos y reconocimientos disponibles para los empleados.
                </p>
                <MeritSettings />
            </CollapsibleSection>

            {/* Messaging Restrictions */}
            {/* Messaging Restrictions */}
            <CollapsibleSection title="Restricciones de Mensajería" icon={Mail} defaultOpen={false}>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Restringir Mensajería Lateral</h3>
                        <p className="text-sm text-gray-500 dark:text-sushi-muted">
                            Si se activa, los empleados generales (Mozo, Cocina, etc.) SOLO podrán enviar mensajes a Coordinadores y Administradores.
                            <br />Los Coordinadores y Administradores aún podrán escribirle a cualquiera.
                        </p>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sushi-gold group-hover:ring-2 ring-sushi-gold/20"></div>
                    </label>
                </div>
            </CollapsibleSection>


            {/* Role Manager (Unified Permissions & Roles) */}
            <CollapsibleSection title="Gestión de Roles y Permisos" icon={Shield} defaultOpen={true}>
                <p className="text-sm text-gray-500 dark:text-sushi-muted mb-6">
                    Define los roles del sistema y personaliza en detalle a qué módulos y acciones tiene acceso cada uno.
                </p>
                <RoleManager
                    customRoles={customRoles}
                    setCustomRoles={setCustomRoles}
                    rolePermissions={rolePermissions}
                    onUpdatePermissions={async (updated) => setRolePermissions(updated)}
                />
            </CollapsibleSection>

            {/* Data Security Section */}
            <CollapsibleSection title="Seguridad de Datos" icon={Save} defaultOpen={false}>
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
                                            setConfirmModal({
                                                isOpen: true,
                                                title: '¿Importar Datos?',
                                                message: `¿Estás seguro de IMPORTAR datos? Esto sobrescribirá los datos existentes. Se encontraron ${Object.keys(json).length} colecciones.`,
                                                onConfirm: async () => {
                                                    await handleImportData(json);
                                                }
                                            });
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
            </CollapsibleSection>

            {/* DANGER ZONE - Factory Reset */}
            <CollapsibleSection title="Zona de Peligro" icon={Lock} defaultOpen={false} danger={true}>
                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center justify-between p-4 rounded-lg">
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
            </CollapsibleSection>

            {/* MANUAL DE CAPACITACIÓN */}
            <CollapsibleSection title="Capacitación" icon={Briefcase} defaultOpen={false}>
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
            </CollapsibleSection>

            {/* CHANGELOG - Historial de Actualizaciones */}
            <CollapsibleSection title="Historial de Actualizaciones" icon={Clock} defaultOpen={true}>
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => { playSound('CLICK'); exportChangelogPDF(sortedChangelog); }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Exportar PDF
                    </button>
                </div>
                <div className="space-y-6">
                    {sortedChangelog.map((log, index) => (
                        <div key={index} className="relative pl-6 border-l-2 border-gray-200 dark:border-white/10 pb-2 last:pb-0">
                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${index === 0 ? 'bg-sushi-gold border-sushi-gold' : 'bg-gray-100 dark:bg-white/10 border-gray-300 dark:border-white/20'}`}></div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                <span className="text-lg font-bold text-gray-800 dark:text-white">v{log.version}</span>
                                <span className="text-sm text-gray-500 dark:text-sushi-muted">{log.date}</span>
                                {index === 0 && <span className="text-xs bg-sushi-gold text-sushi-black px-2 py-0.5 rounded-full font-bold">LATEST</span>}
                            </div>
                            <ul className="list-disc leading-relaxed pl-4 space-y-1">
                                {log.changes.map((change, i) => (
                                    <li key={i} className="text-sm text-gray-600 dark:text-gray-300">
                                        {change}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type="danger"
                confirmText="CONFIRMAR"
            />
        </div>
    );
};
