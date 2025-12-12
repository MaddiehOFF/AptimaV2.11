
import React, { useState } from 'react';
import { Employee, SanctionRecord, SanctionType, User } from '../types';
import { AlertTriangle, Gavel, Trash2, FileWarning, DollarSign, FolderOpen, ScrollText, Calendar, UserCheck, ArchiveRestore, Ban } from 'lucide-react';
import { ConfirmationModal } from './common/ConfirmationModal';

interface SanctionsLogProps {
  employees: Employee[];
  sanctions: SanctionRecord[];
  setSanctions: React.Dispatch<React.SetStateAction<SanctionRecord[]>>;
  currentUser?: User | null;
  addEmployeeNotice?: (notice: any) => Promise<void>;
}

type ViewMode = 'LIST' | 'FILES';

export const SanctionsLog: React.FC<SanctionsLogProps> = ({ employees, sanctions, setSanctions, currentUser, addEmployeeNotice }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<SanctionType>('APERCIBIMIENTO');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [fileEmployeeId, setFileEmployeeId] = useState<string | null>(null);
  const [dischargeText, setDischargeText] = useState('');

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

  // Filter out deleted sanctions for stats calculations
  const activeSanctions = sanctions.filter(s => !s.deletedAt);

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleAddSanction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !description) return;

    const isCoordinator = currentUser?.role === 'COORDINADOR';
    const isStrike = type === 'STRIKE';

    // Coordinator requesting Strike -> Pending
    const needsApproval = isCoordinator && isStrike;

    const newSanction: SanctionRecord = {
      id: generateUUID(),
      employeeId: selectedEmpId,
      date,
      type,
      description,
      amount: (type === 'DESCUENTO' || type === 'SUSPENSION') ? amount : undefined,
      createdBy: currentUser?.name || 'Administración',
      status: needsApproval ? 'PENDING_APPROVAL' : 'APPROVED',
      approvals: needsApproval ? [] : [currentUser?.id || 'admin']
    };

    setSanctions([newSanction, ...sanctions]);

    // Notify Admins if Strike Requested
    if (needsApproval && addEmployeeNotice) {
      const empName = employees.find(e => e.id === selectedEmpId)?.name || 'Empleado';
      await addEmployeeNotice({
        id: generateUUID(),
        date: new Date().toISOString(),
        type: 'URGENT', // Use URGENT or create a new type if supported, ALERT handles generic
        employeeId: selectedEmpId,
        content: `Solicitud de STRIKE para ${empName}: "${description}". Requiere aprobación.`,
        readBy: []
      });
    }

    setDescription('');
    setAmount(0);
    alert(needsApproval ? 'Solicitud de Strike enviada a aprobación y notificada a la administración.' : 'Sanción registrada correctamente.');
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Borrar Sanción?',
      message: '¿Borrar esta sanción? Se mantendrá un registro visual pero no contará para estadísticas.',
      onConfirm: () => {
        setSanctions(sanctions.map(s =>
          s.id === id
            ? { ...s, deletedAt: new Date().toISOString(), deletedBy: currentUser?.name || 'Admin' }
            : s
        ));
      }
    });
  };

  const getSanctionColor = (t: SanctionType, isDeleted: boolean = false) => {
    if (isDeleted) return 'text-gray-400 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-60';

    switch (t) {
      case 'STRIKE': return 'text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
      case 'SUSPENSION': return 'text-orange-600 dark:text-orange-500 bg-orange-100 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20';
      case 'DESCUENTO': return 'text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20';
      default: return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-400/10 border-blue-200 dark:border-blue-400/20';
    }
  };

  const getEmployeeStats = (id: string) => {
    const empSanctions = activeSanctions.filter(s => s.employeeId === id);
    return {
      total: empSanctions.length,
      strikes: empSanctions.filter(s => s.type === 'STRIKE').length,
      discounts: empSanctions.reduce((acc, curr) => acc + (curr.amount || 0), 0)
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-4">
        <div>
          <h2 className="text-3xl font-serif text-gray-900 dark:text-white">Gestión Disciplinaria</h2>
          <p className="text-gray-500 dark:text-sushi-muted mt-1">Control de comportamiento y expedientes del personal.</p>
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('LIST')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${viewMode === 'LIST' ? 'bg-sushi-gold text-sushi-black' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white'}`}
          >
            <ScrollText className="w-4 h-4" />
            Novedades Diarias
          </button>
          <button
            onClick={() => setViewMode('FILES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${viewMode === 'FILES' ? 'bg-sushi-gold text-sushi-black' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white'}`}
          >
            <FolderOpen className="w-4 h-4" />
            Expedientes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area (List or Files) */}
        <div className="lg:col-span-2">

          {/* VIEW MODE: LIST */}
          {viewMode === 'LIST' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Últimos Registros</h3>
              {sanctions.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-gray-300 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-transparent">
                  <p className="text-gray-500 dark:text-sushi-muted">No hay novedades registradas.</p>
                </div>
              ) : (
                sanctions.map(item => {
                  const emp = employees.find(e => e.id === item.employeeId);
                  const isDeleted = !!item.deletedAt;
                  const style = getSanctionColor(item.type, isDeleted);

                  return (
                    <div key={item.id} className={`p-4 rounded-xl border flex gap-4 ${style.split(' ')[2]} bg-white dark:bg-sushi-dark border-gray-200 dark:border-white/5 shadow-sm relative group transition-all`}>
                      {isDeleted && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center pointer-events-none">
                          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded -rotate-12 border-2 border-white dark:border-sushi-dark shadow-lg">ANULADO</span>
                        </div>
                      )}

                      <div className={`p-3 rounded-full h-fit ${style.split(' ')[1]}`}>
                        {isDeleted ? <Ban className="w-6 h-6" /> : <AlertTriangle className={`w-6 h-6 ${style.split(' ')[0]}`} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`font-bold text-lg ${isDeleted ? 'text-gray-400 line-through decoration-red-500' : 'text-gray-900 dark:text-white'}`}>{emp?.name || 'Desconocido'}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${style} inline-block`}>
                                {item.type}
                              </span>
                              {item.status === 'PENDING_APPROVAL' && (
                                <span className="text-[10px] font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded border border-yellow-200 animate-pulse">
                                  PENDIENTE DE APROBACIÓN
                                </span>
                              )}
                              {item.createdBy && (
                                <span className="text-[10px] text-gray-500 dark:text-sushi-muted flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" /> Por: {item.createdBy}
                                </span>
                              )}
                              {isDeleted && (
                                <span className="text-[10px] text-red-500 flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" /> Borrado por: {item.deletedBy}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-sushi-muted">{item.date}</span>
                        </div>
                        <p className={`mt-2 text-sm bg-gray-50 dark:bg-black/20 p-2 rounded border border-gray-200 dark:border-white/5 italic ${isDeleted ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-sushi-text'}`}>
                          "{item.description}"
                        </p>
                        {item.amount && item.amount > 0 && (
                          <div className={`mt-2 font-mono text-sm flex items-center gap-1 ${isDeleted ? 'text-gray-400' : 'text-sushi-red'}`}>
                            <DollarSign className="w-4 h-4" />
                            <span>Descuento aplicado: ${item.amount}</span>
                          </div>
                        )}

                        {/* Approval Controls */}
                        {!isDeleted && item.status === 'PENDING_APPROVAL' && ((currentUser?.role as string) === 'ADMIN' || (currentUser?.role as string) === 'GERENTE') && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-white/10">
                            <button
                              onClick={() => {
                                setSanctions(prev => prev.map(s => s.id === item.id ? { ...s, status: 'APPROVED', approvals: [currentUser.id] } : s));
                                alert('Sanción aprobada.');
                              }}
                              className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded shadow hover:bg-green-600 transition-colors"
                            >
                              Aprobar Strike
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)} // Rejecting essentially deletes/cancels it
                              className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded shadow hover:bg-red-600 transition-colors"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                      {!isDeleted && (
                        <button onClick={() => handleDelete(item.id)} className="text-gray-400 dark:text-sushi-muted hover:text-red-500 h-fit z-20 relative">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* VIEW MODE: FILES (Expedientes) */}
          {viewMode === 'FILES' && (
            <div className="space-y-6">
              {!fileEmployeeId ? (
                // Grid of employees to select
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {employees.map(emp => {
                    const stats = getEmployeeStats(emp.id);
                    return (
                      <button
                        key={emp.id}
                        onClick={() => setFileEmployeeId(emp.id)}
                        className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 p-6 rounded-xl text-left hover:border-sushi-gold/30 transition-all group relative overflow-hidden shadow-sm hover:shadow-lg dark:shadow-none"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                            {emp.photoUrl ? <img src={emp.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-sushi-gold/20" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-sushi-gold transition-colors">{emp.name}</h4>
                            <p className="text-xs text-gray-500 dark:text-sushi-muted">{emp.position}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {stats.strikes > 0 && (
                            <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 px-2 py-0.5 rounded border border-red-200 dark:border-red-500/20 font-bold">
                              {stats.strikes} STRIKES
                            </span>
                          )}
                          {stats.discounts > 0 && (
                            <span className="text-[10px] bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 px-2 py-0.5 rounded border border-yellow-200 dark:border-yellow-500/20 font-bold">
                              -${stats.discounts}
                            </span>
                          )}
                          {stats.total === 0 && <span className="text-[10px] text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-500/10 px-2 py-0.5 rounded">Sin Novedades</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Specific Employee File View
                <div className="animate-fade-in">
                  <button onClick={() => setFileEmployeeId(null)} className="mb-4 text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white text-sm flex items-center gap-1">
                    ← Volver a la lista
                  </button>

                  {(() => {
                    const emp = employees.find(e => e.id === fileEmployeeId);
                    // Show all (including deleted) for history, but marked
                    const empSanctions = sanctions.filter(s => s.employeeId === fileEmployeeId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    const stats = emp ? getEmployeeStats(emp.id) : { strikes: 0, discounts: 0 };

                    return (
                      <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-lg">
                        <div className="p-8 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/20 flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-white dark:bg-white/10 overflow-hidden border-2 border-sushi-gold/20">
                              {emp?.photoUrl && <img src={emp.photoUrl} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                              <h2 className="text-2xl font-serif text-gray-900 dark:text-white">{emp?.name}</h2>
                              <p className="text-gray-500 dark:text-sushi-muted">{emp?.position}</p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-3xl font-bold text-red-600 dark:text-red-500">{stats.strikes}</div>
                            <div className="text-xs uppercase tracking-wider text-red-500 dark:text-red-400">Strikes Activos</div>
                          </div>
                        </div>

                        <div className="p-8">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-sushi-gold" />
                            Historial de Sucesos
                          </h3>

                          <div className="relative border-l-2 border-gray-200 dark:border-white/10 ml-3 space-y-8">
                            {empSanctions.length === 0 && (
                              <p className="ml-6 text-gray-400 dark:text-sushi-muted italic">Este empleado tiene un expediente limpio.</p>
                            )}
                            {empSanctions.map(s => {
                              const isDeleted = !!s.deletedAt;
                              const style = getSanctionColor(s.type, isDeleted);

                              return (
                                <div key={s.id} className="relative ml-6">
                                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white dark:border-sushi-black ${isDeleted ? 'bg-gray-400' : s.type === 'STRIKE' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                  <div className={`bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 p-4 rounded-lg hover:border-sushi-gold/20 transition-colors ${isDeleted ? 'opacity-60 grayscale' : ''}`}>
                                    <div className="flex justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${style}`}>{s.type}</span>
                                        {s.createdBy && <span className="text-[10px] text-gray-500 dark:text-sushi-muted">({s.createdBy})</span>}
                                        {isDeleted && <span className="text-[10px] text-red-500 font-bold ml-2">ANULADO</span>}
                                      </div>
                                      <span className="text-xs text-gray-500 dark:text-sushi-muted">{s.date}</span>
                                    </div>
                                    <p className={`text-sm ${isDeleted ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-white'}`}>{s.description}</p>
                                    {s.amount && <p className="text-red-500 dark:text-red-400 text-sm mt-1 font-mono">-${s.amount} ARS</p>}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 p-6 rounded-xl sticky top-8 shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <Gavel className="w-6 h-6 text-sushi-red" />
              <h3 className="text-xl font-serif text-gray-900 dark:text-white">Aplicar Sanción</h3>
            </div>

            <form onSubmit={handleAddSanction} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Empleado</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors appearance-none"
                  required
                >
                  <option value="" disabled>Seleccionar Personal...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="dark:bg-sushi-dark text-gray-900 dark:text-white">
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Tipo de Novedad</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as SanctionType)}
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors appearance-none"
                >
                  <option value="APERCIBIMIENTO">Apercibimiento (Leve)</option>
                  <option value="SUSPENSION">Suspensión</option>
                  <option value="DESCUENTO">Descuento Monetario</option>
                  <option value="STRIKE">Strike (Grave)</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                  required
                />
              </div>

              {(type === 'DESCUENTO' || type === 'SUSPENSION') && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Monto a Descontar (ARS)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Detalle de lo ocurrido</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors"
                  placeholder="Describa el incidente con detalle..."
                  required
                />
              </div>

              {/* This is the "discharge (descargo)" textarea, assuming it's being added here */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Escribir Descargo</label>
                <textarea
                  value={dischargeText}
                  onChange={e => setDischargeText(e.target.value)}
                  placeholder="Escribe tu respuesta o descargo aquí..."
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm focus:border-sushi-gold outline-none dark:text-white"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                className={`w-full font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 mt-4 ${currentUser?.role === 'COORDINADOR' && type === 'STRIKE' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-sushi-red/80 hover:bg-sushi-red text-white'}`}
              >
                <FileWarning className="w-5 h-5" />
                {currentUser?.role === 'COORDINADOR' && type === 'STRIKE' ? 'Solicitar Aprobación de Strike' : 'Registrar Sanción'}
              </button>
            </form>
          </div>
        </div>
      </div>
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type="danger"
        confirmText="BORRAR"
      />
    </div>
  );
};
