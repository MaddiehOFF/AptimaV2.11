import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MeritType } from '../types';
import { Plus, Trash2, Edit2, Save, X, Trophy, AlertTriangle, Check } from 'lucide-react';
import { generateUUID } from '../utils/uuid';
import { playSound } from '../utils/soundUtils';
import { MeritIcon, VALID_ICONS } from './MeritIcon';

export const MeritSettings: React.FC = () => {
    const [merits, setMerits] = useState<MeritType[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [form, setForm] = useState<Partial<MeritType>>({
        title: '',
        description: '',
        icon: '🏆',
        color: '#fbbf24', // Default gold
        value: 1
    });

    useEffect(() => {
        loadMerits();
    }, []);

    const loadMerits = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('app_settings')
                .select('data')
                .eq('id', 'merit_types')
                .single();

            if (data && data.data && Array.isArray(data.data.types)) {
                setMerits(data.data.types);
            } else {
                setMerits([]);
            }
        } catch (err) {
            console.error('Error loading merit types:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveMerits = async (newMerits: MeritType[]) => {
        try {
            const { error } = await supabase.from('app_settings').upsert({
                id: 'merit_types',
                data: { types: newMerits }
            });

            if (error) throw error;
            setMerits(newMerits);
            playSound('SUCCESS');
        } catch (err) {
            console.error('Error saving merits:', err);
            alert('Error al guardar configuración de méritos');
        }
    };

    const handleAdd = async () => {
        if (!form.title || !form.description) return;

        const newMerit: MeritType = {
            id: generateUUID(),
            title: form.title,
            description: form.description,
            icon: form.icon || '🏆',
            color: form.color || '#fbbf24',
            value: form.value || 1
        };

        await saveMerits([...merits, newMerit]);
        setForm({ title: '', description: '', icon: '🏆', color: '#fbbf24', value: 1 });
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar este tipo de mérito? Los empleados que ya lo tengan asignado lo conservarán, pero no se verá el detalle.')) {
            await saveMerits(merits.filter(m => m.id !== id));
        }
    };

    const handleUpdate = async () => {
        if (!editingId || !form.title) return;

        const updated = merits.map(m => m.id === editingId ? { ...m, ...form } as MeritType : m);
        await saveMerits(updated);
        setEditingId(null);
        setForm({ title: '', description: '', icon: '🏆', color: '#fbbf24', value: 1 });
    };

    const startEdit = (merit: MeritType) => {
        setEditingId(merit.id);
        setForm(merit);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({ title: '', description: '', icon: '🏆', color: '#fbbf24', value: 1 });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form Card */}
                <div className="md:col-span-1 bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/10 h-fit">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        {editingId ? <Edit2 className="w-4 h-4 text-sushi-gold" /> : <Plus className="w-4 h-4 text-sushi-gold" />}
                        {editingId ? 'Editar Mérito' : 'Nuevo Mérito'}
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs uppercase font-bold text-gray-500 dark:text-sushi-muted">Título</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder="Ej. Asistencia Perfecta"
                                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded p-2 text-sm text-gray-900 dark:text-white focus:border-sushi-gold outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs uppercase font-bold text-gray-500 dark:text-sushi-muted">Descripción</label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="Ej. Ingresar 30 días sin faltas"
                                rows={2}
                                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded p-2 text-sm text-gray-900 dark:text-white focus:border-sushi-gold outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs uppercase font-bold text-gray-500 dark:text-sushi-muted mb-2 block">Icono</label>
                                <div className="grid grid-cols-5 gap-3 bg-gray-50 dark:bg-black/40 p-3 rounded-xl border border-gray-200 dark:border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                                    {VALID_ICONS.map(iconName => (
                                        <button
                                            key={iconName}
                                            onClick={() => setForm({ ...form, icon: iconName })}
                                            className={`
                                                aspect-square rounded-xl flex items-center justify-center transition-all duration-200
                                                ${form.icon === iconName
                                                    ? 'bg-sushi-gold text-white shadow-lg shadow-sushi-gold/20 scale-110 ring-2 ring-sushi-gold ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900'
                                                    : 'bg-white dark:bg-white/5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-sushi-gold dark:hover:text-white hover:scale-105'}
                                            `}
                                            title={iconName}
                                        >
                                            <MeritIcon
                                                iconName={iconName}
                                                className="w-5 h-5"
                                                strokeWidth={form.icon === iconName ? 2.5 : 2}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs uppercase font-bold text-gray-500 dark:text-sushi-muted">Color</label>
                                <input
                                    type="color"
                                    value={form.color}
                                    onChange={e => setForm({ ...form, color: e.target.value })}
                                    className="w-full h-10 rounded cursor-pointer"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs uppercase font-bold text-gray-500 dark:text-sushi-muted">Importancia (1-5)</label>
                            <input
                                type="range"
                                min="1"
                                max="5"
                                step="1"
                                value={form.value}
                                onChange={e => setForm({ ...form, value: parseInt(e.target.value) })}
                                className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Baja</span>
                                <span>Alta</span>
                            </div>
                        </div>

                        <div className="pt-2 flex gap-2">
                            {editingId && (
                                <button
                                    onClick={cancelEdit}
                                    className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-white/20 transition-colors text-sm font-bold"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                onClick={editingId ? handleUpdate : handleAdd}
                                className="flex-1 px-4 py-2 bg-sushi-gold text-sushi-black rounded hover:bg-sushi-goldhover transition-colors text-sm font-bold flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {editingId ? 'Actualizar' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="md:col-span-2">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-sushi-gold" />
                        Méritos Disponibles
                    </h3>

                    {loading ? (
                        <p className="text-gray-500 italic">Cargando...</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {merits.length === 0 && <p className="text-gray-500 italic col-span-2">No hay méritos configurados.</p>}
                            {merits.map(m => (
                                <div key={m.id} className="relative group bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/10 p-4 rounded-xl flex items-start gap-3 hover:border-sushi-gold/50 transition-all shadow-sm">
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner"
                                        style={{ backgroundColor: `${m.color}20`, color: m.color }}
                                    >
                                        <MeritIcon iconName={m.icon} className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-900 dark:text-white truncate">{m.title}</h4>
                                        <p className="text-xs text-gray-500 dark:text-sushi-muted line-clamp-2">{m.description}</p>
                                        <div className="mt-2 flex gap-1">
                                            {[...Array(m.value)].map((_, i) => (
                                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-sushi-gold"></div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEdit(m)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-blue-500">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(m.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
