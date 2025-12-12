
import React, { useState } from 'react';
import { Task, ChecklistSnapshot } from '../types';
import { CheckCircle2, Circle, ClipboardList, Plus, Trash2, Clock, X, Check, ChevronDown, ChevronUp, AlertCircle, Archive, UserCheck } from 'lucide-react';
import { playSound } from '../utils/soundUtils';
import { ConfirmationModal } from './common/ConfirmationModal';

interface TaskChecklistProps {
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    employeeId: string;
    readOnly?: boolean;
    onFinalize?: (snapshot: ChecklistSnapshot) => void;
    userName?: string; // Who is interacting
}

export const TaskChecklist: React.FC<TaskChecklistProps> = ({ tasks, setTasks, employeeId, readOnly = false, onFinalize, userName }) => {
    const [newTaskText, setNewTaskText] = useState('');
    const [taskToComplete, setTaskToComplete] = useState<string | null>(null);
    const [manualTime, setManualTime] = useState('');
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const [editingDesc, setEditingDesc] = useState<{ id: string, text: string } | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
        confirmText?: string;
        cancelText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { },
    });

    const myTasks = tasks.filter(t => t.employeeId === employeeId);
    const completedCount = myTasks.filter(t => t.status === 'COMPLETED').length;
    const progress = myTasks.length > 0 ? (completedCount / myTasks.length) * 100 : 0;

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;

        const newTask: Task = {
            id: generateUUID(),
            employeeId,
            description: newTaskText,
            status: 'PENDING',
            assignedBy: userName || 'Admin',
            date: new Date().toISOString()
        };
        setTasks([...tasks, newTask]);
        setNewTaskText('');
        playSound('SUCCESS');
    };

    const initiateToggle = (taskId: string, currentStatus: string) => {
        if (readOnly) return;
        if (currentStatus !== 'PENDING') {
            // Reset to pending
            updateTaskStatus(taskId, 'PENDING');
        } else {
            // Open modal to confirm completion
            setManualTime(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
            setTaskToComplete(taskId);
        }
    };

    const confirmCompletion = (useCurrentTime: boolean) => {
        if (taskToComplete) {
            const time = useCurrentTime
                ? new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                : manualTime;

            updateTaskStatus(taskToComplete, 'COMPLETED', time);
            setTaskToComplete(null);
            playSound('SUCCESS');
        }
    };

    const updateTaskStatus = (taskId: string, status: 'PENDING' | 'COMPLETED' | 'SKIPPED', timestamp?: string) => {
        setTasks(tasks.map(t => {
            if (t.id === taskId) {
                return {
                    ...t,
                    status: status,
                    completedAt: status === 'PENDING' ? undefined : timestamp,
                    completedBy: status === 'PENDING' ? undefined : userName
                };
            }
            return t;
        }));
    };

    const deleteTask = (taskId: string) => {
        setConfirmModal({
            isOpen: true,
            title: '¿Borrar tarea?',
            message: 'Eliminar esta tarea de la lista.',
            type: 'danger',
            confirmText: 'SÍ, BORRAR',
            onConfirm: () => {
                setTasks(tasks.filter(t => t.id !== taskId));
                playSound('CLICK');
            }
        });
    };

    const saveDetails = (taskId: string) => {
        if (editingDesc) {
            setTasks(tasks.map(t => t.id === taskId ? { ...t, details: editingDesc.text } : t));
            setEditingDesc(null);
        }
    };

    const handleFinalize = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!onFinalize) {
            console.error("onFinalize callback missing");
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: '¿FINALIZAR CHECK-LIST?',
            message: 'Se guardará en el expediente y se limpiará el tablero para mañana.',
            type: 'warning',
            confirmText: 'FINALIZAR',
            onConfirm: () => {
                const snapshot: ChecklistSnapshot = {
                    id: generateUUID(),
                    date: new Date().toISOString(),
                    finalizedAt: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                    finalizedBy: userName || 'Sistema',
                    employeeId: employeeId,
                    tasks: myTasks
                };

                onFinalize(snapshot);

                // Clean tasks for this employee from the global list
                setTasks(prevTasks => prevTasks.filter(t => t.employeeId !== employeeId));

                playSound('SUCCESS');
            }
        });
    };

    return (
        <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm relative">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h3 className="font-serif text-xl text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-sushi-gold" />
                        Check-List Diario
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-sushi-muted mt-1">
                        Tareas asignadas para la jornada.
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-sushi-gold">{Math.round(progress)}%</span>
                    <span className="text-xs uppercase block text-gray-400">Completado</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full mb-6 overflow-hidden">
                <div
                    className="h-full bg-sushi-gold transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <div className="space-y-3 mb-6">
                {myTasks.length === 0 && (
                    <p className="text-center text-gray-400 dark:text-sushi-muted italic py-4">No hay tareas asignadas para hoy.</p>
                )}
                {myTasks.map(task => {
                    const isCompleted = task.status === 'COMPLETED';
                    const isSkipped = task.status === 'SKIPPED';
                    const isExpanded = expandedTask === task.id;

                    return (
                        <div
                            key={task.id}
                            className={`rounded-lg border transition-all overflow-hidden ${isCompleted ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20' : isSkipped ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/5'}`}
                        >
                            <div className="flex items-center justify-between p-3">
                                <div
                                    onClick={() => initiateToggle(task.id, task.status)}
                                    className={`flex items-center gap-3 cursor-pointer flex-1 ${readOnly ? 'pointer-events-none' : ''}`}
                                >
                                    <div className={`transition-colors ${isCompleted ? 'text-green-500' : isSkipped ? 'text-red-500' : 'text-gray-400 dark:text-sushi-muted'}`}>
                                        {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : isSkipped ? <X className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <span className={`text-sm block ${isCompleted || isSkipped ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white font-medium'}`}>
                                            {task.description}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 block uppercase tracking-wider font-bold mt-0.5">
                                            Asignado por: {task.assignedBy || 'Admin'}
                                        </span>
                                        {task.completedAt && (
                                            <div className="flex gap-2 mt-0.5">
                                                <span className="text-[10px] text-green-600 dark:text-green-500 flex items-center gap-1 font-medium">
                                                    <Clock className="w-3 h-3" /> {task.completedAt}
                                                </span>
                                                {task.completedBy && (
                                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <UserCheck className="w-3 h-3" /> {task.completedBy}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {isSkipped && <span className="text-[10px] text-red-500 font-bold">NO REALIZADO</span>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                                        className="text-gray-400 hover:text-sushi-gold p-2"
                                    >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    {!readOnly && (
                                        <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-500 p-2">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="p-3 pt-0 border-t border-gray-100 dark:border-white/5 mt-1 bg-white/50 dark:bg-black/10">
                                    {editingDesc?.id === task.id ? (
                                        <div className="mt-2">
                                            <textarea
                                                value={editingDesc.text}
                                                onChange={e => setEditingDesc({ ...editingDesc, text: e.target.value })}
                                                className="w-full text-xs p-2 rounded border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white mb-2"
                                                placeholder="Añadir descripción detallada..."
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => saveDetails(task.id)} className="text-xs bg-sushi-gold text-sushi-black px-2 py-1 rounded">Guardar</button>
                                                <button onClick={() => setEditingDesc(null)} className="text-xs text-gray-500 px-2 py-1">Cancelar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-600 dark:text-sushi-muted italic">
                                                {task.details || "Sin descripción detallada."}
                                            </p>
                                            {!readOnly && (
                                                <div className="flex justify-between items-center mt-3">
                                                    <button onClick={() => setEditingDesc({ id: task.id, text: task.details || '' })} className="text-[10px] text-sushi-gold hover:underline">
                                                        {task.details ? 'Editar detalle' : 'Añadir detalle'}
                                                    </button>

                                                    {task.status === 'PENDING' && (
                                                        <button
                                                            onClick={() => updateTaskStatus(task.id, 'SKIPPED')}
                                                            className="text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-2 py-1 rounded border border-red-200 dark:border-red-500/20 flex items-center gap-1"
                                                        >
                                                            <AlertCircle className="w-3 h-3" /> Marcar No Realizado
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {!readOnly && (
                <div className="space-y-4">
                    {/* Add Task Input */}
                    <form onSubmit={handleAddTask} className="flex gap-2">
                        <input
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            placeholder="Agregar nueva tarea..."
                            className="flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold"
                        />
                        <button
                            type="submit"
                            className="bg-gray-900 dark:bg-white/10 hover:bg-sushi-gold hover:text-sushi-black text-white p-2 rounded-lg transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </form>

                    {/* Finalize Button */}
                    {onFinalize && myTasks.length > 0 && (
                        <button
                            type="button"
                            onClick={handleFinalize}
                            className="w-full border border-dashed border-gray-300 dark:border-white/20 text-gray-500 dark:text-sushi-muted hover:border-sushi-gold hover:text-sushi-gold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider group bg-transparent"
                        >
                            <Archive className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            Finalizar y Archivar Check-list
                        </button>
                    )}
                </div>
            )}

            {/* Time Selection Modal */}
            {taskToComplete && (
                <div className="absolute inset-0 bg-white/95 dark:bg-sushi-dark/95 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl p-4 animate-fade-in">
                    <div className="w-full max-w-xs text-center">
                        <div className="w-12 h-12 bg-sushi-gold text-sushi-black rounded-full flex items-center justify-center mx-auto mb-3">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h4 className="text-gray-900 dark:text-white font-bold text-lg mb-1">Registro de Horario</h4>
                        <p className="text-xs text-gray-500 dark:text-sushi-muted mb-4">¿A qué hora completaste esta tarea?</p>

                        <div className="space-y-3">
                            <button
                                onClick={() => confirmCompletion(true)}
                                className="w-full py-3 px-4 bg-sushi-gold text-sushi-black font-bold rounded-lg hover:bg-sushi-goldhover transition-colors flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Ahora Mismo
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white dark:bg-sushi-dark px-2 text-gray-500">O indicar hora</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="time"
                                    value={manualTime}
                                    onChange={(e) => setManualTime(e.target.value)}
                                    className="flex-1 bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-center text-gray-900 dark:text-white focus:border-sushi-gold outline-none [color-scheme:light] dark:[color-scheme:dark]"
                                />
                                <button
                                    onClick={() => confirmCompletion(false)}
                                    className="bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white px-4 rounded-lg font-medium"
                                >
                                    OK
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setTaskToComplete(null)}
                            className="mt-4 text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white underline"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
            />
        </div>
    );
};
