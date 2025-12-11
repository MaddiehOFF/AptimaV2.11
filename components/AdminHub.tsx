
import React, { useState } from 'react';
import { AdminTask, User } from '../types';
import { Command, Plus, Clock, CheckCircle2, Circle, MoreHorizontal, User as UserIcon, Calendar, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { generateUUID } from '../utils/uuid';

interface AdminHubProps {
    adminTasks: AdminTask[];
    setAdminTasks: React.Dispatch<React.SetStateAction<AdminTask[]>>;
    currentUser: User;
    allUsers: User[];
}

export const AdminHub: React.FC<AdminHubProps> = ({ adminTasks, setAdminTasks, currentUser, allUsers }) => {
    const [showModal, setShowModal] = useState(false);
    const [newTask, setNewTask] = useState<Partial<AdminTask>>({
        title: '',
        description: '',
        assignedTo: currentUser.id,
        priority: 'MEDIUM',
        estimatedTime: '',
        status: 'PENDING'
    });

    const admins = allUsers.filter(u => u.permissions.superAdmin || u.role === 'ADMIN' || u.role === 'MANAGER');

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
            dueDate: newTask.dueDate
        };

        setAdminTasks([...adminTasks, task]);
        setShowModal(false);
        setNewTask({ title: '', description: '', assignedTo: currentUser.id, priority: 'MEDIUM', estimatedTime: '', status: 'PENDING' });
    };

    const updateStatus = (taskId: string, status: AdminTask['status'], isVerificationStep = false) => {
        setAdminTasks(adminTasks.map(t => {
            if (t.id === taskId) {
                const updates: Partial<AdminTask> = { status };

                if (status === 'REVIEW') {
                    // User requesting review
                    updates.completedBy = currentUser.id;
                }

                if (status === 'DONE' && isVerificationStep) {
                    // User verifying
                    updates.verifiedBy = currentUser.id;
                    updates.verifiedAt = new Date().toISOString();
                }

                return { ...t, ...updates };
            }
            return t;
        }));
    };

    const deleteTask = (taskId: string) => {
        if (window.confirm("¿Eliminar tarea administrativa?")) {
            setAdminTasks(adminTasks.filter(t => t.id !== taskId));
        }
    };

    const getPriorityColor = (p: string) => {
        if (p === 'HIGH') return 'text-red-500 bg-red-100 dark:bg-red-500/20';
        if (p === 'MEDIUM') return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-500/20';
        return 'text-blue-500 bg-blue-100 dark:bg-blue-500/20';
    };

    const renderColumn = (status: AdminTask['status'], title: string) => {
        const tasks = adminTasks.filter(t => t.status === status);

        return (
            <div className="flex-1 min-w-[300px] bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white uppercase text-xs tracking-wider">{title}</h4>
                    <span className="bg-white dark:bg-white/10 px-2 py-0.5 rounded text-xs font-bold">{tasks.length}</span>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                    {tasks.map(task => {
                        const assignee = allUsers.find(u => u.id === task.assignedTo);
                        const completedBy = allUsers.find(u => u.id === task.completedBy);
                        const isAssignedToMe = task.assignedTo === currentUser.id;
                        const isReviewer = currentUser.id !== task.completedBy; // Can't verify own task

                        return (
                            <div key={task.id} className="bg-white dark:bg-sushi-dark p-4 rounded-lg border border-gray-200 dark:border-white/5 shadow-sm hover:border-sushi-gold/30 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                                        {task.priority === 'HIGH' ? 'ALTA' : task.priority === 'MEDIUM' ? 'MEDIA' : 'BAJA'}
                                    </span>
                                    <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <h5 className="font-bold text-gray-900 dark:text-white text-sm leading-tight mb-1">{task.title}</h5>
                                <p className="text-xs text-gray-500 dark:text-sushi-muted line-clamp-2 mb-3">{task.description}</p>

                                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-sushi-muted border-t border-gray-100 dark:border-white/5 pt-2">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {task.estimatedTime}
                                    </div>
                                    <div className="flex items-center gap-1" title={`Asignado a: ${assignee?.name}`}>
                                        <UserIcon className="w-3 h-3" />
                                        {assignee?.username}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2 mt-3 pt-2">
                                    {status === 'PENDING' && (
                                        <button onClick={() => updateStatus(task.id, 'IN_PROGRESS')} className="w-full text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-500/20 py-1.5 rounded flex items-center justify-center gap-1">
                                            Iniciar <ArrowRight className="w-3 h-3" />
                                        </button>
                                    )}

                                    {status === 'IN_PROGRESS' && (
                                        <button onClick={() => updateStatus(task.id, 'REVIEW')} className="w-full text-xs bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 py-1.5 rounded flex items-center justify-center gap-1">
                                            Solicitar Revisión <ShieldCheck className="w-3 h-3" />
                                        </button>
                                    )}

                                    {status === 'REVIEW' && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-gray-400 italic text-center">
                                                Realizado por: {completedBy?.name || 'Usuario'}
                                            </p>
                                            {isReviewer ? (
                                                <button onClick={() => updateStatus(task.id, 'DONE', true)} className="w-full text-xs bg-green-50 dark:bg-green-500/10 text-green-600 hover:bg-green-100 dark:hover:bg-green-500/20 py-1.5 rounded flex items-center justify-center gap-1 font-bold">
                                                    Verificar y Cerrar <CheckCircle2 className="w-3 h-3" />
                                                </button>
                                            ) : (
                                                <button disabled className="w-full text-xs bg-gray-100 dark:bg-white/5 text-gray-400 py-1.5 rounded flex items-center justify-center gap-1 cursor-not-allowed">
                                                    Esperando Verificación...
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                        <Command className="w-8 h-8 text-sushi-gold" />
                        Central Administrativa
                    </h2>
                    <p className="text-gray-500 dark:text-sushi-muted mt-2">Sincronización de tareas y objetivos para el equipo de gestión.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-sushi-gold text-sushi-black px-4 py-2 rounded-lg font-bold hover:bg-sushi-goldhover transition-colors flex items-center gap-2 shadow-lg shadow-sushi-gold/20"
                >
                    <Plus className="w-5 h-5" /> Nueva Tarea
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-6 overflow-x-auto pb-4 flex-1">
                {renderColumn('PENDING', 'Pendientes')}
                {renderColumn('IN_PROGRESS', 'En Progreso')}
                {renderColumn('REVIEW', 'Revisión (Doble Check)')}
                {renderColumn('DONE', 'Completado')}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-md rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in">
                        <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-4">Nueva Tarea Administrativa</h3>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Título de la tarea"
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                value={newTask.title}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                required
                            />
                            <textarea
                                placeholder="Descripción detallada..."
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold resize-none h-24"
                                value={newTask.description}
                                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-gray-500 dark:text-sushi-muted mb-1 block">Asignar a</label>
                                    <select
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none"
                                        value={newTask.assignedTo}
                                        onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                                    >
                                        {admins.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-gray-500 dark:text-sushi-muted mb-1 block">Prioridad</label>
                                    <select
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none"
                                        value={newTask.priority}
                                        onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                                    >
                                        <option value="LOW">Baja</option>
                                        <option value="MEDIUM">Media</option>
                                        <option value="HIGH">Alta</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-gray-500 dark:text-sushi-muted mb-1 block">Tiempo Est.</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 2 horas"
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                        value={newTask.estimatedTime}
                                        onChange={e => setNewTask({ ...newTask, estimatedTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-gray-500 dark:text-sushi-muted mb-1 block">Fecha Límite</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none focus:border-sushi-gold [color-scheme:light] dark:[color-scheme:dark]"
                                        value={newTask.dueDate}
                                        onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 dark:bg-white/5 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10">Cancelar</button>
                                <button type="submit" className="flex-1 bg-sushi-gold text-sushi-black font-bold py-2 rounded-lg hover:bg-sushi-goldhover">Crear Tarea</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
