
import React, { useState, useMemo } from 'react';
import { AdminTask, User } from '../types';
import {
    Command, Plus, Clock, CheckCircle2, Circle, MoreHorizontal,
    User as UserIcon, Calendar, Trash2, ArrowRight, ShieldCheck,
    MessageSquare, Filter, Search, X, Send
} from 'lucide-react';
import { generateUUID } from '../utils/uuid';
import { ConfirmationModal } from './common/ConfirmationModal';

interface AdminHubProps {
    adminTasks: AdminTask[];
    setAdminTasks: React.Dispatch<React.SetStateAction<AdminTask[]>>;
    currentUser: User;
    allUsers: User[];
}

export const AdminHub: React.FC<AdminHubProps> = ({ adminTasks, setAdminTasks, currentUser, allUsers }) => {
    // UI State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'MINE' | 'HIGH_PRIORITY' | 'DUE_SOON'>('ALL');

    // Form State
    const [newTask, setNewTask] = useState<Partial<AdminTask>>({
        title: '',
        description: '',
        assignedTo: currentUser.id,
        priority: 'MEDIUM',
        estimatedTime: '',
        status: 'PENDING',
        tags: []
    });

    // Comment State
    const [newComment, setNewComment] = useState('');

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

    const admins = allUsers.filter(u => u.permissions.superAdmin || u.role === 'ADMIN' || u.role === 'MANAGER' || u.id === currentUser.id);

    // --- Actions ---

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.title) return;

        const task: AdminTask = {
            id: generateUUID(),
            title: newTask.title || '',
            description: newTask.description || '',
            assignedTo: newTask.assignedTo || currentUser.id,
            createdBy: currentUser.id,
            status: 'PENDING',
            priority: newTask.priority as any,
            estimatedTime: newTask.estimatedTime || 'N/A',
            dueDate: newTask.dueDate,
            tags: newTask.tags || [],
            comments: []
        };

        setAdminTasks([...adminTasks, task]);
        setShowCreateModal(false);
        setNewTask({ title: '', description: '', assignedTo: currentUser.id, priority: 'MEDIUM', estimatedTime: '', status: 'PENDING', tags: [] });
    };

    const updateStatus = (taskId: string, status: AdminTask['status'], isVerificationStep = false) => {
        setAdminTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                const updates: Partial<AdminTask> = { status };

                if (status === 'REVIEW') {
                    updates.completedBy = currentUser.id;
                }

                if (status === 'DONE' && isVerificationStep) {
                    updates.verifiedBy = currentUser.id;
                    updates.verifiedAt = new Date().toISOString();
                }

                return { ...t, ...updates };
            }
            return t;
        }));
    };

    const deleteTask = (taskId: string) => {
        setConfirmModal({
            isOpen: true,
            title: '¿Eliminar Tarea?',
            message: "¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.",
            onConfirm: () => {
                setAdminTasks(prev => prev.filter(t => t.id !== taskId));
                setSelectedTask(null);
            }
        });
    };

    const addComment = (taskId: string) => {
        if (!newComment.trim()) return;

        const comment = {
            id: generateUUID(),
            userId: currentUser.id,
            text: newComment,
            date: new Date().toISOString()
        };

        setAdminTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                return { ...t, comments: [...(t.comments || []), comment] };
            }
            return t;
        }));

        // Update selected task immediately for UI
        if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask(prev => prev ? ({ ...prev, comments: [...(prev.comments || []), comment] }) : null);
        }

        setNewComment('');
    };

    // --- Helpers ---

    const getPriorityColor = (p: string) => {
        if (p === 'HIGH') return 'text-red-600 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
        if (p === 'MEDIUM') return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
        return 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20';
    };

    const getUserName = (id: string) => {
        const u = allUsers.find(user => user.id === id);
        return u ? (u.username || u.name) : 'Desconocido';
    };

    // --- Filtering ---

    const filteredTasks = useMemo(() => {
        return adminTasks.filter(task => {
            // Search Text
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                if (!task.title.toLowerCase().includes(query) && !task.description.toLowerCase().includes(query)) {
                    return false;
                }
            }

            // Tabs
            if (activeFilter === 'MINE') return task.assignedTo === currentUser.id;
            if (activeFilter === 'HIGH_PRIORITY') return task.priority === 'HIGH';
            if (activeFilter === 'DUE_SOON') {
                if (!task.dueDate) return false;
                const days = (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                return days <= 3 && days >= -1;
            }

            return true;
        });
    }, [adminTasks, searchQuery, activeFilter, currentUser.id]);

    const renderColumn = (status: AdminTask['status'], title: string, colorClass: string) => {
        const tasks = filteredTasks.filter(t => t.status === status);

        return (
            <div className="flex-1 min-w-[320px] max-w-[400px] flex flex-col h-full">
                <div className={`flex justify-between items-center mb-4 px-1 ${colorClass}`}>
                    <h4 className="font-bold text-sm tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-current opacity-60"></span>
                        {title}
                    </h4>
                    <span className="bg-white dark:bg-white/10 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm">
                        {tasks.length}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4">
                    {tasks.map(task => {
                        const assignee = allUsers.find(u => u.id === task.assignedTo);
                        const isAssignedToMe = task.assignedTo === currentUser.id;
                        const commentsCount = task.comments?.length || 0;
                        const hasDueDate = !!task.dueDate;
                        const isOverdue = hasDueDate && new Date(task.dueDate!) < new Date();

                        return (
                            <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className={`
                                    bg-white dark:bg-sushi-dark rounded-xl p-4 border transition-all cursor-pointer group relative
                                    ${selectedTask?.id === task.id ? 'border-sushi-gold shadow-md shadow-sushi-gold/10' : 'border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 hover:shadow-lg hover:-translate-y-0.5'}
                                `}
                            >
                                {/* Header Tags */}
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                                        {task.priority === 'HIGH' ? 'ALTA' : task.priority === 'MEDIUM' ? 'MEDIA' : 'BAJA'}
                                    </span>
                                    {isAssignedToMe && (
                                        <span className="bg-sushi-gold/20 text-sushi-gold-dark text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            MÍA
                                        </span>
                                    )}
                                </div>

                                <h5 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug mb-2 line-clamp-2">
                                    {task.title}
                                </h5>

                                {/* Meta Info */}
                                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                                    <div className="flex items-center gap-1.5" title="Responsable">
                                        {assignee?.photoUrl ? (
                                            <img src={assignee.photoUrl} alt="" className="w-4 h-4 rounded-full" />
                                        ) : (
                                            <UserIcon className="w-3.5 h-3.5" />
                                        )}
                                        <span className="truncate max-w-[80px]">{assignee?.name.split(' ')[0]}</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                                        <Calendar className="w-3.5 h-3.5" />
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Sin fecha'}
                                    </div>
                                </div>

                                {/* Footer & Actions */}
                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-3 mt-1">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                                            <MessageSquare className="w-3 h-3" />
                                            {commentsCount}
                                        </div>
                                    </div>

                                    {/* Quick Status Action (Only for assigned or admins) */}
                                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                        {status === 'PENDING' && (
                                            <button
                                                onClick={() => updateStatus(task.id, 'IN_PROGRESS')}
                                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors"
                                                title="Comenzar"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        )}
                                        {status === 'IN_PROGRESS' && (
                                            <button
                                                onClick={() => updateStatus(task.id, 'REVIEW')}
                                                className="p-1.5 hover:bg-yellow-50 text-yellow-600 rounded-md transition-colors"
                                                title="Enviar a Revisión"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                            </button>
                                        )}
                                        {status === 'REVIEW' && currentUser.id !== task.completedBy && (
                                            <button
                                                onClick={() => updateStatus(task.id, 'DONE', true)}
                                                className="p-1.5 hover:bg-green-50 text-green-600 rounded-md transition-colors"
                                                title="Aprobar"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {tasks.length === 0 && (
                        <div className="text-center py-10 opacity-30">
                            <div className="w-12 h-12 bg-gray-200 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Circle className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium">Sin taréas</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50 dark:bg-black/20 rounded-3xl overflow-hidden backdrop-blur-sm border border-white/20">
            {/* Top Bar / Header */}
            <div className="bg-white/80 dark:bg-sushi-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 p-6 flex flex-col gap-6 sticky top-0 z-20">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-sushi-gold/20 rounded-xl">
                                <Command className="w-6 h-6 text-sushi-gold" />
                            </div>
                            Central Administrativa
                        </h2>
                        <p className="text-gray-500 dark:text-sushi-muted mt-2 ml-14">
                            Gestión, seguimiento y sincronización del equipo directivo.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-sushi-black dark:bg-sushi-gold text-white dark:text-sushi-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-xl shadow-sushi-gold/10 transform hover:scale-105"
                    >
                        <Plus className="w-5 h-5" /> Nueva Tarea
                    </button>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex bg-gray-100 dark:bg-black/40 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                        <button
                            onClick={() => setActiveFilter('ALL')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeFilter === 'ALL' ? 'bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setActiveFilter('MINE')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeFilter === 'MINE' ? 'bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                        >
                            <UserIcon className="w-3 h-3" /> Mis Tareas
                        </button>
                        <button
                            onClick={() => setActiveFilter('HIGH_PRIORITY')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeFilter === 'HIGH_PRIORITY' ? 'bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500"></span> Alta Prioridad
                        </button>
                        <button
                            onClick={() => setActiveFilter('DUE_SOON')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeFilter === 'DUE_SOON' ? 'bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                        >
                            <Clock className="w-3 h-3" /> Por Vencer
                        </button>
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar tareas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-sushi-gold transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Board Content */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <div className="flex gap-8 h-full min-w-max">
                    {renderColumn('PENDING', 'PENDIENTES', 'text-gray-500 dark:text-gray-400')}
                    {renderColumn('IN_PROGRESS', 'EN PROGRESO', 'text-blue-500')}
                    {renderColumn('REVIEW', 'EN REVISIÓN', 'text-amber-500')}
                    {renderColumn('DONE', 'COMPLETADAS', 'text-green-500')}
                </div>
            </div>

            {/* Create Task Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-serif dark:text-white">Nueva Tarea</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTask} className="space-y-5">
                            <input
                                type="text"
                                placeholder="Título de la tarea"
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-lg font-medium text-gray-900 dark:text-white outline-none focus:border-sushi-gold transition-colors"
                                value={newTask.title}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                autoFocus
                                required
                            />

                            <textarea
                                placeholder="Descripción detallada..."
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-gray-900 dark:text-white outline-none focus:border-sushi-gold resize-none h-32 transition-colors"
                                value={newTask.description}
                                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase font-bold text-gray-400 mb-2 block">Asignar a</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none appearance-none"
                                            value={newTask.assignedTo}
                                            onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                                        >
                                            {admins.map(u => (
                                                <option key={u.id} value={u.id} className="text-black">{u.name || u.username}</option>
                                            ))}
                                        </select>
                                        <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs uppercase font-bold text-gray-400 mb-2 block">Prioridad</label>
                                    <div className="flex p-1 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/10">
                                        {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setNewTask({ ...newTask, priority: p })}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newTask.priority === p ?
                                                    (p === 'HIGH' ? 'bg-red-500 text-white' : p === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white')
                                                    : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-white/5'}`}
                                            >
                                                {p === 'HIGH' ? 'Alta' : p === 'MEDIUM' ? 'Media' : 'Baja'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase font-bold text-gray-400 mb-2 block">Tiempo Estimado</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 2 horas"
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                        value={newTask.estimatedTime}
                                        onChange={e => setNewTask({ ...newTask, estimatedTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase font-bold text-gray-400 mb-2 block">Fecha Límite</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                        value={newTask.dueDate}
                                        onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button type="submit" className="w-full bg-sushi-gold text-sushi-black font-bold py-3.5 rounded-xl hover:bg-sushi-goldhover transform active:scale-95 transition-all">
                                    Crear Tarea
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Task Details Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end">
                    <div
                        className="w-full md:w-[500px] h-full bg-white dark:bg-sushi-dark border-l border-gray-200 dark:border-white/10 shadow-2xl flex flex-col animate-slide-in-right"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-start">
                            <div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mb-3 inline-block ${getPriorityColor(selectedTask.priority)}`}>
                                    {selectedTask.priority === 'HIGH' ? 'PRIORIDAD ALTA' : selectedTask.priority === 'MEDIUM' ? 'PRIORIDAD MEDIA' : 'PRIORIDAD BAJA'}
                                </span>
                                <h3 className="text-2xl font-bold font-serif text-gray-900 dark:text-white leading-tight">
                                    {selectedTask.title}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Status Bar */}
                        <div className="px-6 py-4 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-500">Estado:</span>
                                <select
                                    value={selectedTask.status}
                                    onChange={(e) => updateStatus(selectedTask.id, e.target.value as any)}
                                    className="bg-white dark:bg-white/10 border-none rounded-lg text-sm font-bold px-3 py-1 outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-white/20 transition-colors"
                                >
                                    <option value="PENDING" className="text-black">PENDIENTE</option>
                                    <option value="IN_PROGRESS" className="text-black">EN PROGRESO</option>
                                    <option value="REVIEW" className="text-black">EN REVISIÓN</option>
                                    <option value="DONE" className="text-black">COMPLETADA</option>
                                </select>
                            </div>
                            <button
                                onClick={() => deleteTask(selectedTask.id)}
                                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Meta Info Grid */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Asignado a</label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-sushi-gold/20 flex items-center justify-center text-sushi-gold font-bold text-xs">
                                            {getUserName(selectedTask.assignedTo).substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-sm">{getUserName(selectedTask.assignedTo)}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Fecha Límite</label>
                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                        <Calendar className="w-4 h-4 opacity-50" />
                                        <span className="font-medium text-sm">
                                            {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'Sin fecha'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Descripción</label>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-black/20 p-4 rounded-xl text-sm">
                                    {selectedTask.description || 'Sin descripción.'}
                                </p>
                            </div>

                            {/* Comments Section */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3" />
                                    Actividad y Comentarios
                                </label>

                                <div className="space-y-4 mb-6">
                                    {selectedTask.comments?.map(comment => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                {getUserName(comment.userId).substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl rounded-tl-none flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white">{getUserName(comment.userId)}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(comment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-300">{comment.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                                        <p className="text-center text-xs text-gray-400 italic py-4">No hay comentarios aún.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer Input */}
                        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-sushi-dark">
                            <div className="relative flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Escribe un comentario..."
                                    className="w-full bg-gray-100 dark:bg-black/30 border-none rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sushi-gold/50 transition-all"
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') addComment(selectedTask.id);
                                    }}
                                />
                                <button
                                    onClick={() => addComment(selectedTask.id)}
                                    disabled={!newComment.trim()}
                                    className="bg-sushi-gold text-sushi-black p-2 rounded-full hover:bg-sushi-goldhover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Confirmation */}
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
