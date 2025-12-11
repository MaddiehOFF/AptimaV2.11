
import React from 'react';
import { Employee, Task, ChecklistSnapshot, View, WalletTransaction, PayrollMovement } from '../../types';
import { WidgetWrapper } from './WidgetWrapper';
import { TaskChecklist } from '../TaskChecklist';
import { Box, User as UserIcon, Wallet, CreditCard, X, ChevronRight, TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';
import { RankBadge } from '../EmployeeManagement';

export const ChecklistWidget = ({ tasks, setTasks, employeeId, onFinalize, userName }: { tasks: Task[], setTasks: React.Dispatch<React.SetStateAction<Task[]>>, employeeId: string, onFinalize: (s: ChecklistSnapshot) => void, userName: string }) => (
    <WidgetWrapper className="h-full">
        <TaskChecklist
            tasks={tasks}
            setTasks={setTasks}
            employeeId={employeeId}
            onFinalize={onFinalize}
            userName={userName}
        />
    </WidgetWrapper>
);

export const InventoryWidget = ({ setView }: { setView: (v: View) => void }) => (
    <WidgetWrapper>
        <button
            onClick={() => setView(View.INVENTORY)}
            className="w-full bg-gradient-to-br from-gray-900 to-black dark:from-white/5 dark:to-white/[0.02] border border-gray-200 dark:border-white/10 p-6 rounded-xl text-left hover:border-sushi-gold/50 hover:shadow-lg transition-all group relative overflow-hidden h-full"
        >
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                <Box className="w-24 h-24 text-white" />
            </div>
            <div className="relative z-10">
                <div className="p-3 bg-sushi-gold rounded-lg w-fit mb-3 text-sushi-black">
                    <Box className="w-6 h-6" />
                </div>
                <h3 className="text-white font-bold text-lg group-hover:text-sushi-gold transition-colors">Inventario</h3>
                <p className="text-gray-400 text-xs mt-1">Registrar Stock Inicial/Final</p>
            </div>
        </button>
    </WidgetWrapper>
);

export const QuickProfileWidget = ({ member, formatMoney }: { member: Employee, formatMoney: (v: number) => string }) => (
    <WidgetWrapper>
        <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm h-full">
            <h3 className="font-serif text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-sushi-gold" />
                Mi Perfil Rápido
            </h3>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-500 dark:text-sushi-muted">Rango</span>
                    <RankBadge role={member.role} />
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-500 dark:text-sushi-muted">Horario</span>
                    <span className="text-gray-900 dark:text-white font-medium">{member.scheduleStart} - {member.scheduleEnd}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-500 dark:text-sushi-muted">Sueldo Base</span>
                    <span className="text-gray-900 dark:text-white font-medium">{formatMoney(member.monthlySalary)}</span>
                </div>
            </div>
        </div>
    </WidgetWrapper>
);

export const PendingPaymentWidget = ({ totalPending, formatMoney, transactions = [], accrual, payrollMovements = [] }: { totalPending: number, formatMoney: (v: number) => string, transactions?: WalletTransaction[], accrual?: any, payrollMovements?: PayrollMovement[] }) => {
    const isDebt = totalPending < 0;
    const absValue = Math.abs(totalPending);
    const [isOpen, setIsOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'SUMMARY' | 'HISTORY'>('SUMMARY');

    // Filter relevant transactions (income vs expense from user perspective)
    // Wallet "EXPENSE" (Company pays user) = User INCOME
    // Wallet "INCOME" (User pays company/debt) = User EXPENSE
    // Category 'Sueldos' is payment. 'Descuentos' is deduction.

    return (
        <>
            <WidgetWrapper>
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full text-left bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm h-full hover:border-sushi-gold/50 transition-colors group"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className={`text-xs uppercase font-bold mb-1 flex items-center gap-1 ${isDebt ? 'text-red-500' : 'text-gray-500 dark:text-sushi-muted'}`}>
                                {isDebt ? "Adelantos / Deuda" : "Mi Saldo (A cobrar)"}
                                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            <h3 className={`text-2xl font-mono font-bold mt-1 ${isDebt ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                {isDebt ? '-' : ''}{formatMoney(absValue)}
                            </h3>
                        </div>
                        <div className={`p-3 rounded-lg ${isDebt ? 'bg-red-100 dark:bg-red-500/10 text-red-600' : 'bg-green-100 dark:bg-green-500/10 text-green-600'}`}>
                            <Wallet className="w-6 h-6" />
                        </div>
                    </div>
                </button>
            </WidgetWrapper>

            {/* DETAILED BALANCE MODAL */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/[0.02]">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-sushi-gold" />
                                    Detalle de Cuenta
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-sushi-muted mt-1">Movimientos y liquidación del período actual</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-white/10">
                            <button
                                onClick={() => setActiveTab('SUMMARY')}
                                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'SUMMARY' ? 'border-sushi-gold text-sushi-gold' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                            >
                                Resumen del Mes
                            </button>
                            <button
                                onClick={() => setActiveTab('HISTORY')}
                                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-sushi-gold text-sushi-gold' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                            >
                                Historial de Movimientos
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {activeTab === 'SUMMARY' && accrual && (
                                <div className="space-y-6">
                                    {/* Big Total */}
                                    <div className="text-center p-6 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-dashed border-gray-300 dark:border-white/10">
                                        <p className="text-sm font-bold text-gray-500 dark:text-sushi-muted uppercase">Saldo Actual</p>
                                        <h2 className={`text-4xl font-mono font-bold mt-2 ${totalPending < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                            {totalPending < 0 ? '-' : ''}{formatMoney(Math.abs(totalPending))}
                                        </h2>
                                    </div>

                                    {/* Breakdown: Could add mini-summary here if needed, but keeping simple for now */}
                                    <div className="text-xs text-center text-gray-500 dark:text-sushi-muted">
                                        * Este saldo incluye el devengado hasta la fecha.
                                    </div>

                                </div>
                            )}

                            {activeTab === 'HISTORY' && (
                                <div className="space-y-4">
                                    {payrollMovements.filter(m => m.status !== 'ANULADO' && m.type !== 'REINICIO').length === 0 ? (
                                        <div className="text-center py-10 text-gray-400">
                                            <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p>No hay movimientos registrados recientes.</p>
                                        </div>
                                    ) : (
                                        payrollMovements
                                            .filter(m => m.status !== 'ANULADO' && m.type !== 'REINICIO')
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((m, idx) => {
                                                const isPayment = m.type === 'PAGO' || (m.type === 'AJUSTE' && m.amount > 0);
                                                // In DB, PAGO is negative (Debt Reduction), but visual logic might vary. 
                                                // If logic says PAGO decreases Balance (which is debt to employee), 
                                                // typically PAGO means Employee Received Money.
                                                // Let's assume PAGO is "Green" (Money In Hand) or "Red" (Debt Reduced)?
                                                // Logic in Widget: Green = Received Money. Red = Deduction/Debt Increase?
                                                // Standard: PAGO = Green (Received). DESCUENTO = Red.

                                                // Check Type:
                                                // PAGO (Amount is negative in DB usually). Visual = Positive received.
                                                // DESCUENTO (Negative in DB). Visual = Negative deduction.

                                                const visualAmount = Math.abs(m.amount);
                                                const isPositiveContext = m.type === 'PAGO' || m.type === 'BONO';

                                                return (
                                                    <div key={idx} className="flex gap-4 items-start p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg border border-gray-100 dark:border-white/5">
                                                        <div className={`p-2 rounded-full ${isPositiveContext ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                            {isPositiveContext ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <h5 className="text-sm font-bold text-gray-900 dark:text-white capitalize">{m.type}</h5>
                                                                <span className={`font-mono text-sm font-bold ${isPositiveContext ? 'text-green-600' : 'text-red-500'}`}>
                                                                    {isPositiveContext ? '+' : '-'}{formatMoney(visualAmount)}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.description}</p>
                                                            <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                                                                <Calendar className="w-3 h-3" />
                                                                {(() => {
                                                                    const [y, mm, d] = m.date.split('-');
                                                                    return `${d}/${mm}/${y}`;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export const NextPaymentWidget = ({ member, safeDisplay, isPrivacyMode }: { member: Employee, safeDisplay: (v?: string) => string, isPrivacyMode: boolean }) => (
    <WidgetWrapper>
        <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm md:col-span-2 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-serif text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-sushi-gold" />
                        Próximo Pago
                    </h3>
                    {member.nextPaymentDate ? (
                        <div className="mt-3">
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                {new Date(member.nextPaymentDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-sushi-muted mt-1">
                                Modalidad: <span className="font-bold text-sushi-gold">{member.nextPaymentMethod}</span>
                            </p>
                        </div>
                    ) : (
                        <p className="text-gray-400 dark:text-sushi-muted mt-2 italic">Fecha aún no asignada.</p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-xs uppercase text-gray-500 dark:text-sushi-muted font-bold">Cuenta Destino</p>
                    <p className="font-mono text-gray-900 dark:text-white mt-1">{safeDisplay(member.bankName)}</p>
                    <p className="text-xs text-gray-400 dark:text-sushi-muted font-mono">{member.cbu ? (isPrivacyMode ? '****' : `*${member.cbu.slice(-4)}`) : '***'}</p>
                </div>
            </div>
        </div>
    </WidgetWrapper>
);
