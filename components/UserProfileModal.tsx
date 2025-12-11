import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';
import { X, Clock, Award, Calendar, User as UserIcon, BarChart3, Mail } from 'lucide-react';

interface UserProfileModalProps {
    user: User;
    onClose: () => void;
    onSave?: (updatedUser: User) => void;
    readOnly?: boolean;
    onMessage?: () => void;
}

interface ActivityStat {
    module: string;
    duration: number;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose, onSave, readOnly = false, onMessage }) => {
    const [stats, setStats] = useState<ActivityStat[]>([]);
    const [totalSeconds, setTotalSeconds] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'INFO' | 'ACTIVITY'>('INFO');

    // Editable Fields
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email || '');
    const [password, setPassword] = useState(''); // Only if changing

    const [lastLogin, setLastLogin] = useState<string | null>(null);

    useEffect(() => {
        loadActivity();
    }, [user.id]);

    const loadActivity = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_activity_logs')
                .select('*')
                .eq('data->>userId', user.id)
                .order('created_at', { ascending: false }); // Get latest first

            if (error) throw error;

            if (data && data.length > 0) {
                // Set Last Login
                const last = data[0];
                setLastLogin(last.created_at || last.data?.startTime || new Date().toISOString());

                // Calculate Stats (limit to last 7 days for chart/stats if needed, or use all?)
                // Previous logic used a filter in query .gte('updated_at'). 
                // Let's bring back the filter for stats but keep full query for last login?
                // Or just query once with limit?
                // Actually the previous query had .gte(...)
                // Let's do two things or just one query without filter and process in memory (if not too many logs)?
                // Better: Keep the query simple (latest 50?) or stick to the date filter.

                // If I filter by date, I might miss the last login if it was > 7 days ago.
                // But generally active users valid. 
                // Let's stick to the previous filter logic BUT sort by date to get the true last one in that range.
                // If no activity in 7 days, "Hace más de 7 días".

                const recentLogs = data.filter((row: any) => new Date(row.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

                const modStats: Record<string, number> = {};
                let total = 0;
                recentLogs.forEach((row: any) => {
                    const d = row.data;
                    const dur = d.duration || 0;
                    modStats[d.module] = (modStats[d.module] || 0) + dur;
                    total += dur;
                });

                const statArray = Object.entries(modStats)
                    .map(([module, duration]) => ({ module, duration }))
                    .sort((a, b) => b.duration - a.duration);

                setStats(statArray);
                setTotalSeconds(total);
            }
        } catch (err) {
            console.error("Error loading activity", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const updates: any = {
                name,
                email,
            };
            if (password) updates.password = password;

            const { error } = await supabase
                .from('app_users')
                .update({
                    data: {
                        ...user, // preserve other fields inside data
                        ...updates
                    }
                })
                .eq('id', user.id);

            if (error) throw error;

            if (onSave) {
                onSave({ ...user, ...updates });
            }
            alert('Perfil actualizado correctamente');
            onClose();
        } catch (err) {
            alert('Error al actualizar perfil');
        }
    };

    const MODULE_NAMES_ES: Record<string, string> = {
        'OFFICE': 'Oficina',
        'DASHBOARD': 'Panel General',
        'EMPLOYEES': 'Empleados',
        'SETTINGS': 'Configuración',
        'ADMIN_HUB': 'Central Administrativa',
        'PAYROLL': 'Pagos y Nómina',
        'SUPPLIERS': 'Insumos / Proveedores',
        'FINANCE': 'Finanzas',
        'OVERTIME': 'Horas Extra',
        'FILES': 'Legajos / Archivos',
        'SANCTIONS': 'Sanciones',
        'USERS': 'Usuarios',
        'FORUM': 'Foro',
        'INTERNAL_MAIL': 'Mensajería',
        'AI_REPORT': 'Informe IA',
        'MEMBER_CALENDAR': 'Mi Agenda',
        'MEMBER_TASKS': 'Mis Tareas',
        'MEMBER_FILE': 'Mi Legajo',
        'MEMBER_FORUM': 'Foro Equipo',
        'INVENTORY': 'Inventario',
        'CASH_REGISTER': 'Caja'
    };

    const formatDuration = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return `${h}h ${m}m`;
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-sushi-dark w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-gradient-to-r from-sushi-dark to-gray-900 p-6 flex justify-between items-start text-white">
                    <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 bg-sushi-gold rounded-full flex items-center justify-center text-sushi-black font-bold text-2xl shadow-lg border-2 border-white/20 overflow-hidden">
                            {user.photoUrl ? (
                                <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user.name.charAt(0)
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold font-serif">{user.name}</h2>
                            <div className="flex flex-col gap-1">
                                <p className="opacity-70 text-sm flex items-center gap-1"><UserIcon className="w-3 h-3" /> {user.role || 'Usuario'}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit uppercase border ${user.status === 'break' ? 'bg-orange-500/20 text-orange-200 border-orange-500/30' : 'bg-green-500/20 text-green-200 border-green-500/30'}`}>
                                        {user.status === 'break' ? 'En Descanso' : 'Activo'}
                                    </span>
                                    {lastLogin && (
                                        <span className="text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                                            <Clock className="w-3 h-3" /> {new Date(lastLogin).toLocaleDateString()} {new Date(lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
                    <button
                        onClick={() => setActiveTab('INFO')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'INFO' ? 'border-b-2 border-sushi-gold text-sushi-gold bg-sushi-gold/5' : 'text-gray-500 dark:text-sushi-muted'}`}
                    >
                        Información Personal
                    </button>
                    <button
                        onClick={() => setActiveTab('ACTIVITY')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'ACTIVITY' ? 'border-b-2 border-sushi-gold text-sushi-gold bg-sushi-gold/5' : 'text-gray-500 dark:text-sushi-muted'}`}
                    >
                        Actividad (7 Días)
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-sushi-dark">
                    {activeTab === 'INFO' ? (
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 dark:text-sushi-muted mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        disabled={readOnly}
                                        className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-sushi-gold dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 dark:text-sushi-muted mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        disabled={readOnly}
                                        className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-sushi-gold dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>
                                {!readOnly && (
                                    <div className="col-span-2">
                                        <label className="block text-xs uppercase font-bold text-gray-500 dark:text-sushi-muted mb-1">Cambiar Contraseña</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Dejar vacío para mantener la actual"
                                            className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-sushi-gold dark:text-white"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3">
                                {onMessage && (
                                    <button
                                        type="button"
                                        onClick={onMessage}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
                                    >
                                        <Mail className="w-5 h-5" /> Enviar Mensaje
                                    </button>
                                )}
                                {!readOnly && (
                                    <button type="submit" className="bg-sushi-gold text-sushi-black px-6 py-2 rounded-lg font-bold hover:bg-sushi-goldhover transition-colors shadow-lg">
                                        Guardar Cambios
                                    </button>
                                )}
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-500/10">
                                    <p className="text-xs uppercase font-bold text-blue-500">Tiempo Total (Semanal)</p>
                                    <p className="text-3xl font-mono text-blue-700 dark:text-blue-400 font-bold mt-1">
                                        {formatDuration(totalSeconds)}
                                    </p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-500/10">
                                    <p className="text-xs uppercase font-bold text-purple-500">Módulo Favorito</p>
                                    <p className="text-xl text-purple-700 dark:text-purple-400 font-bold mt-1 truncate">
                                        {stats.length > 0 ? (MODULE_NAMES_ES[stats[0].module] || stats[0].module) : 'Sin actividad'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Desglose por Módulo</h4>
                                {loading ? (
                                    <div className="text-center py-10 text-gray-400 animate-pulse">Cargando actividad...</div>
                                ) : stats.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 italic">No hay actividad registrada esta semana.</div>
                                ) : (
                                    stats.map((stat, idx) => (
                                        <div key={idx} className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-gray-200 dark:bg-white/10 p-2 rounded text-gray-500 dark:text-gray-300">
                                                    <BarChart3 className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium text-gray-700 dark:text-gray-200 capitalize">{MODULE_NAMES_ES[stat.module] || stat.module}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono font-bold text-gray-900 dark:text-white">{formatDuration(stat.duration)}</span>
                                                <div className="w-24 h-1 bg-gray-200 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className="h-full bg-sushi-gold"
                                                        style={{ width: `${Math.min(100, (stat.duration / totalSeconds) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
