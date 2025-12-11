import React, { useState } from 'react';
import { Employee, EmployeeNotice, User } from '../types';
import { Megaphone, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface EmployeeNoticesProps {
    currentUser: Employee | User;
    notices: EmployeeNotice[];
    setNotices: React.Dispatch<React.SetStateAction<EmployeeNotice[]>>;
}

export const EmployeeNotices: React.FC<EmployeeNoticesProps> = ({ currentUser, notices, setNotices }) => {
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'LATE' | 'ABSENCE' | 'OTHER'>('LATE');

    const myNotices = notices.filter(n => n.employeeId === currentUser.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message) return;

        const newNotice: EmployeeNotice = {
            id: crypto.randomUUID(),
            employeeId: currentUser.id,
            type,
            content: message,
            date: new Date().toISOString(),
            status: 'PENDING',
            readByAdmin: false
        };

        setNotices([newNotice, ...notices]);
        setMessage('');
        alert('Aviso enviado correctamente.');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'text-green-500 bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/20';
            case 'REJECTED': return 'text-red-500 bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
            default: return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle className="w-5 h-5" />;
            case 'REJECTED': return <AlertTriangle className="w-5 h-5" />;
            default: return <Clock className="w-5 h-5" />;
        }
    };

    return (
        <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-sushi-gold/20 text-sushi-gold-dark dark:text-sushi-gold rounded-full">
                        <Megaphone className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-serif text-gray-900 dark:text-white">Dar Aviso</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-sushi-muted mb-2">Tipo de Aviso</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['LATE', 'ABSENCE', 'OTHER'] as const).map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${type === t ? 'bg-sushi-gold text-sushi-black border-sushi-gold' : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                >
                                    {t === 'LATE' ? 'Tardanza' : t === 'ABSENCE' ? 'Ausencia' : 'Otro'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-sushi-muted mb-2">Mensaje / Motivo</label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder={type === 'LATE' ? "Ej. Llego 15 mins tarde por tráfico..." : "Ej. No podré asistir mañana por turno médico..."}
                            rows={4}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 focus:border-sushi-gold focus:outline-none dark:text-white"
                            required
                        />
                    </div>

                    <button type="submit" className="w-full bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover shadow-lg flex justify-center items-center gap-2">
                        <Send className="w-5 h-5" />
                        Enviar Aviso
                    </button>
                </form>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Importante</p>
                    <p>Los avisos de llegada tarde o ausencia no justifican automáticamente la falta. Deben ser aprobados por un administrador.</p>
                </div>
            </div>

            {/* History Section */}
            <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm overflow-hidden flex flex-col">
                <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-6">Mis Avisos Recientes</h3>
                <div className="overflow-y-auto flex-1 space-y-3">
                    {myNotices.length === 0 ? (
                        <p className="text-center text-gray-400 dark:text-sushi-muted py-8 italic">No has enviado avisos aún.</p>
                    ) : (
                        myNotices.map(notice => (
                            <div key={notice.id} className="p-4 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide ${notice.type === 'ABSENCE' ? 'text-red-500 bg-red-100/50' : 'text-yellow-600 bg-yellow-100/50'}`}>
                                        {notice.type === 'LATE' ? 'Tardanza' : notice.type === 'ABSENCE' ? 'Ausencia' : 'Consulta'}
                                    </span>
                                    <span className="text-xs text-gray-400">{new Date(notice.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-gray-800 dark:text-gray-300 mb-3">{notice.content}</p>
                                <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded ${getStatusColor(notice.status)}`}>
                                    {getStatusIcon(notice.status)}
                                    <span>
                                        {notice.status === 'PENDING' ? 'Pendiente de Revisión' : notice.status === 'APPROVED' ? 'Aviso Recibido/Aprobado' : 'Rechazado'}
                                    </span>
                                </div>
                                {notice.adminResponse && (
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 border-l-2 border-gray-300 pl-2">
                                        Admin: "{notice.adminResponse}"
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
