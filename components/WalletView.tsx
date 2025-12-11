
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, FixedExpense, WalletTransaction, PaymentMethod, BudgetAnalysis, FixedExpenseCategory, User } from '../types';
import { Wallet, TrendingUp, TrendingDown, Clock, Check, Plus, Minus, Search, Sparkles, RefreshCcw, Calendar, Trash2, Banknote, CreditCard, AlertTriangle, Paperclip, Camera, Image as ImageIcon, X, PieChart as PieChartIcon, Zap, ThumbsUp, ThumbsDown, Bell, Ban, ArrowRight, Activity, Shield, Download, Building } from 'lucide-react';
import { generateBudgetAnalysis } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { playSound } from '../utils/soundUtils';

interface WalletViewProps {
    transactions: WalletTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<WalletTransaction[]>>;
    pendingDebt: number; // For AI context
    userName: string;
    fixedExpenses?: FixedExpense[];
    setFixedExpenses?: React.Dispatch<React.SetStateAction<FixedExpense[]>>;
    employees?: Employee[]; // For AI Budgeting
    currentUser?: User | null;
}

export const WalletView: React.FC<WalletViewProps> = ({ transactions = [], setTransactions, pendingDebt, userName, fixedExpenses = [], setFixedExpenses, employees = [], currentUser }) => {
    const [activeTab, setActiveTab] = useState<'MOVEMENTS' | 'FIXED' | 'SIMULATOR' | 'AUDIT'>('MOVEMENTS');

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // Transaction Modal State
    const [showModal, setShowModal] = useState(false);
    const [transType, setTransType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Ventas');
    const [manualTime, setManualTime] = useState('');
    const [useCurrentTime, setUseCurrentTime] = useState(true);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Scheduled Transaction State
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');

    // Fixed Expenses State
    const [showFixedModal, setShowFixedModal] = useState(false);
    const [newExpenseName, setNewExpenseName] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');
    const [newExpenseDate, setNewExpenseDate] = useState('');
    const [newExpenseMethod, setNewExpenseMethod] = useState<PaymentMethod>('TRANSFERENCIA');
    const [newExpenseCategory, setNewExpenseCategory] = useState<FixedExpenseCategory>('OTROS');
    const [newExpenseCbu, setNewExpenseCbu] = useState('');
    const [newExpenseAlias, setNewExpenseAlias] = useState('');
    const [newExpenseBank, setNewExpenseBank] = useState('');

    // Fixed Expense Payment State
    const [payExpenseModal, setPayExpenseModal] = useState<FixedExpense | null>(null);
    const [partialPayAmount, setPartialPayAmount] = useState<number>(0);

    // Simulator State
    const [simName, setSimName] = useState('');
    const [simCost, setSimCost] = useState('');
    const [simResult, setSimResult] = useState<'SAFE' | 'RISKY' | 'DANGEROUS' | null>(null);

    // AI State
    const [aiBudget, setAiBudget] = useState<BudgetAnalysis | null>(null);
    const [loadingBudget, setLoadingBudget] = useState(false);

    // Image View State
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Funds Audit State (Conteo) V2
    const [auditData, setAuditData] = useState<{ id: string, name: string, amount: number }[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('wallet_audit_data_v2');
        if (saved) {
            try {
                setAuditData(JSON.parse(saved));
            } catch (e) {
                setAuditData([]);
            }
        }
    }, []);

    const totalBalance = useMemo(() => {
        return transactions.filter(t => !t.deletedAt && t.status !== 'SCHEDULED').reduce((acc, curr) => {
            return curr.type === 'INCOME' ? acc + curr.amount : acc - curr.amount;
        }, 0);
    }, [transactions]);

    // Notifications State with Persistence
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('wallet_dismissed_notifications');
        if (saved) {
            try {
                setDismissedIds(JSON.parse(saved));
            } catch (e) {
                console.error("Error parsing dismissed notifications", e);
            }
        }
    }, []);

    const handleDismiss = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newDismissed = [...dismissedIds, id];
        setDismissedIds(newDismissed);
        localStorage.setItem('wallet_dismissed_notifications', JSON.stringify(newDismissed));
        playSound('CLICK');
    };

    const notifications = useMemo(() => {
        const alerts: { id: string, title: string, date: string, type: 'CRITICAL' | 'WARNING' }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check Fixed Expenses
        fixedExpenses?.forEach(exp => {
            if (!exp.isPaid) {
                // Determine due date difference
                const due = new Date(exp.dueDate);
                due.setHours(0, 0, 0, 0);
                const diffTime = due.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Generate Unique ID for this specific alert instance
                const alertId = `FIXED_${exp.id}_${exp.dueDate}`;

                if (diffDays < 0) alerts.push({ id: alertId, title: `Vencido: ${exp.name}`, date: exp.dueDate, type: 'CRITICAL' });
                else if (diffDays <= 3) alerts.push({ id: alertId, title: `Vence pronto: ${exp.name}`, date: exp.dueDate, type: 'WARNING' });
            }
        });

        // Check Payroll
        employees?.filter(e => e.active).forEach(emp => {
            if (emp.nextPaymentDate) {
                const due = new Date(emp.nextPaymentDate);
                due.setHours(0, 0, 0, 0);
                const diffTime = due.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                const alertId = `PAYROLL_${emp.id}_${emp.nextPaymentDate}`;

                if (diffDays < 0) alerts.push({ id: alertId, title: `Pago atrasado: ${emp.name}`, date: emp.nextPaymentDate, type: 'CRITICAL' });
                else if (diffDays <= 2) alerts.push({ id: alertId, title: `Pago sueldo: ${emp.name}`, date: emp.nextPaymentDate, type: 'WARNING' });
            }
        });

        // Filter out dismissed notifications
        return alerts
            .filter(a => !dismissedIds.includes(a.id))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [fixedExpenses, employees, dismissedIds]);

    const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImageUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val) return;

        const time = useCurrentTime
            ? new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
            : manualTime;

        const newTrans: WalletTransaction = {
            id: generateUUID(),
            date: new Date().toISOString(),
            amount: val,
            type: transType,
            category,
            description,
            createdBy: userName,
            time,
            imageUrl: imageUrl || undefined,
            status: isScheduled ? 'SCHEDULED' : 'COMPLETED',
            scheduledDate: isScheduled ? scheduledDate : undefined,
        };

        setTransactions([newTrans, ...transactions]);
        setShowModal(false);
        setAmount('');
        setDescription('');
        setCategory('Ventas');
        setImageUrl(null);
        setIsScheduled(false);
        setScheduledDate('');
        playSound('SUCCESS');
    };

    const handleDeleteTransaction = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser?.permissions.manageFinance && !currentUser?.permissions.superAdmin) {
            alert("No tienes permiso para anular movimientos.");
            return;
        }

        if (window.confirm('¿Anular este movimiento? Quedará registrado como tachado.')) {
            setTransactions(prev => prev.map(t =>
                t.id === id ? { ...t, deletedAt: new Date().toISOString(), deletedBy: userName } : t
            ));
            playSound('CLICK');
        }
    };

    const handleAddFixedExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!setFixedExpenses) return;

        const expense: FixedExpense = {
            id: generateUUID(),
            name: newExpenseName,
            amount: parseFloat(newExpenseAmount),
            paidAmount: 0,
            dueDate: newExpenseDate,
            isPaid: false,
            category: newExpenseCategory,
            paymentMethod: newExpenseMethod,
            cbu: newExpenseCbu,
            alias: newExpenseAlias,
            bank: newExpenseBank
        };

        setFixedExpenses([...fixedExpenses, expense]);
        setShowFixedModal(false);
        setNewExpenseName('');
        setNewExpenseAmount('');
        setNewExpenseDate('');
        playSound('SUCCESS');
    };

    const openPayFixedModal = (exp: FixedExpense) => {
        setPayExpenseModal(exp);
        setPartialPayAmount(exp.amount - (exp.paidAmount || 0));
    };

    const confirmPayFixedExpense = () => {
        if (!setFixedExpenses || !fixedExpenses || !payExpenseModal || partialPayAmount <= 0) return;

        // 1. Create Transaction
        const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const newTrans: WalletTransaction = {
            id: generateUUID(),
            date: new Date().toISOString(),
            amount: partialPayAmount,
            type: 'EXPENSE',
            category: payExpenseModal.category === 'MATERIA_PRIMA' ? 'Proveedores' : payExpenseModal.category === 'INFRAESTRUCTURA' ? 'Mantenimiento' : 'Servicios',
            description: `Pago Gasto Fijo: ${payExpenseModal.name} `,
            createdBy: userName,
            time
        };
        setTransactions([newTrans, ...transactions]);

        // 2. Update Expense Status
        const newPaidAmount = (payExpenseModal.paidAmount || 0) + partialPayAmount;
        const isFullyPaid = newPaidAmount >= payExpenseModal.amount;

        setFixedExpenses(fixedExpenses.map(e =>
            e.id === payExpenseModal.id ? {
                ...e,
                paidAmount: newPaidAmount,
                isPaid: isFullyPaid,
                lastPaidDate: isFullyPaid ? new Date().toISOString() : undefined
            } : e
        ));

        setPayExpenseModal(null);
        playSound('SUCCESS');
    };

    const handleDeleteFixedExpense = (id: string) => {
        if (window.confirm("¿Eliminar este gasto fijo?")) {
            setFixedExpenses && setFixedExpenses(fixedExpenses.filter(e => e.id !== id));
            playSound('CLICK');
        }
    };

    const handleGenerateBudget = async () => {
        if (!employees || !fixedExpenses) return;
        setLoadingBudget(true);
        const result = await generateBudgetAnalysis(totalBalance, fixedExpenses, employees, transactions);
        setAiBudget(result);
        setLoadingBudget(false);
        playSound('SUCCESS');
    };

    // PRICE CHECK LOGIC
    const checkPriceDifference = (prodId: string, newPrice: number) => {
        // Implementation would need setProducts from props, but for now we just alert
        // This is a placeholder for the logic described in the plan
        console.log("Checking price for", prodId, newPrice);
    };

    const runSimulation = () => {
        const cost = parseFloat(simCost);
        if (!cost || !employees || !fixedExpenses) return;

        const payroll = employees.filter(e => e.active).reduce((acc, e) => acc + e.monthlySalary, 0);
        const pendingFixed = fixedExpenses.filter(e => !e.isPaid).reduce((acc, e) => acc + (e.amount - (e.paidAmount || 0)), 0);

        const obligations = payroll + pendingFixed;
        const available = totalBalance - obligations;

        if (available >= cost * 1.2) setSimResult('SAFE'); // 20% buffer
        else if (available >= cost) setSimResult('RISKY');
        else setSimResult('DANGEROUS');
        playSound('CLICK');
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                    <button className="absolute top-4 right-4 text-white p-2"><X className="w-8 h-8" /></button>
                    <img src={previewImage} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Comprobante" />
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-4xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                        <Wallet className="w-10 h-10 text-sushi-gold" />
                        Billetera Global
                    </h2>
                    <p className="text-gray-500 dark:text-sushi-muted mt-2">Capital real disponible y flujo de caja histórico.</p>
                </div>

                <div className="flex flex-wrap gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                    <button
                        onClick={() => { setActiveTab('MOVEMENTS'); playSound('CLICK'); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold ${activeTab === 'MOVEMENTS' ? 'bg-sushi-gold text-sushi-black shadow-sm' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white hover:bg-white/5'}`}
                    >
                        <Wallet className="w-4 h-4" />
                        Movimientos
                    </button>
                    <button
                        onClick={() => { setActiveTab('FIXED'); playSound('CLICK'); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold ${activeTab === 'FIXED' ? 'bg-sushi-gold text-sushi-black shadow-sm' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white hover:bg-white/5'}`}
                    >
                        <Calendar className="w-4 h-4" />
                        Gastos Fijos
                    </button>
                    <button
                        onClick={() => { setActiveTab('SIMULATOR'); playSound('CLICK'); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold ${activeTab === 'SIMULATOR' ? 'bg-sushi-gold text-sushi-black shadow-sm' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white hover:bg-white/5'}`}
                    >
                        <Zap className="w-4 h-4" />
                        Simulador
                    </button>
                    <button
                        onClick={() => setActiveTab('AUDIT')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold ${activeTab === 'AUDIT' ? 'bg-sushi-gold text-sushi-black shadow-sm' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white hover:bg-white/5'}`}
                    >
                        <Shield className="w-4 h-4" />
                        CONTEO
                    </button>
                </div>
            </div>

            {/* Balance Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2 bg-gradient-to-br from-gray-900 via-gray-800 to-black dark:from-black dark:to-sushi-dark rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl border border-gray-700 dark:border-white/10 group">
                    <div className="absolute top-0 right-0 p-40 bg-sushi-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-sushi-gold/10 transition-colors duration-500"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                        <div>
                            <p className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-2 flex items-center gap-2">
                                <Building className="w-3 h-3 text-sushi-gold" /> Saldo Total Disponible
                            </p>
                            <h3 className={`text-6xl font-mono font-bold tracking-tight ${totalBalance < 0 ? 'text-red-400' : 'text-white'} drop-shadow-lg`}>{formatMoney(totalBalance)}</h3>
                            <p className="text-gray-400 text-xs mt-4 flex items-center gap-2 ml-1">
                                <Clock className="w-3 h-3" /> Actualizado: {new Date().toLocaleTimeString()}
                            </p>
                        </div>
                        <div className="text-right bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            <p className="text-gray-400 text-xs mb-1 uppercase font-bold">Pasivo Corriente (Deuda)</p>
                            <p className="text-2xl font-mono text-red-300 font-bold tracking-tight">-{formatMoney(pendingDebt)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col min-h-[220px]">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-white/5 pb-3">
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                            <Bell className="w-5 h-5 text-sushi-gold" /> Notificaciones
                        </h4>
                        {notifications.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm animate-pulse">{notifications.length}</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {notifications.length === 0 ? (
                            <p className="text-gray-400 dark:text-sushi-muted text-xs text-center py-8">No hay pagos urgentes pendientes.</p>
                        ) : (
                            notifications.map((notif, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border text-xs flex justify-between items-center ${notif.type === 'CRITICAL' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20'}`}>
                                    <div className="flex flex-col">
                                        <span className={`font-bold ${notif.type === 'CRITICAL' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-500'}`}>{notif.title}</span>
                                        <span className="text-gray-500 dark:text-sushi-muted">{new Date(notif.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                    <button
                                        onClick={(e) => handleDismiss(notif.id, e)}
                                        className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-green-500 transition-colors"
                                        title="Marcar como leída"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* MOVEMENTS TAB */}
            {activeTab === 'MOVEMENTS' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-6">
                        {/* Action Card */}
                        <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Acciones Rápidas</h3>
                            <button
                                onClick={() => { setShowModal(true); setTransType('INCOME'); }}
                                disabled={!currentUser?.permissions.manageFinance}
                                className="w-full bg-sushi-gold text-sushi-black px-6 py-3 rounded-lg font-bold hover:bg-sushi-goldhover shadow-lg shadow-sushi-gold/20 flex items-center justify-center gap-2 mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-5 h-5" /> Registrar Movimiento
                            </button>
                        </div>

                        {/* CFO VIRTUAL */}
                        <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-16 bg-blue-500/5 rounded-full blur-2xl"></div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 relative z-10">
                                <Sparkles className="w-4 h-4 text-blue-500" /> CFO Virtual
                            </h3>

                            {!aiBudget ? (
                                <div className="text-center py-6 relative z-10">
                                    <p className="text-xs text-gray-500 dark:text-sushi-muted mb-4">
                                        Analiza tu salud financiera y obtén un presupuesto inteligente basado en tus gastos fijos y nómina.
                                    </p>
                                    <button
                                        onClick={handleGenerateBudget}
                                        disabled={loadingBudget}
                                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-xs"
                                    >
                                        {loadingBudget ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <PieChartIcon className="w-3 h-3" />}
                                        Generar Presupuesto
                                    </button>
                                </div>
                            ) : (
                                <div className="animate-fade-in relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Activity className={`w - 5 h - 5 ${aiBudget.healthStatus === 'HEALTHY' ? 'text-green-500' : aiBudget.healthStatus === 'WARNING' ? 'text-yellow-500' : 'text-red-500'} `} />
                                            <span className="font-bold text-lg dark:text-white">{aiBudget.healthScore}/100</span>
                                        </div>
                                        <button onClick={() => setAiBudget(null)} className="text-xs text-gray-400 underline">Reiniciar</button>
                                    </div>

                                    <div className="h-40 w-full mb-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={aiBudget.allocations}
                                                    dataKey="amount"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={60}
                                                    paddingAngle={5}
                                                >
                                                    {aiBudget.allocations.map((entry, index) => (
                                                        <Cell key={`cell - ${index} `} fill={entry.color} stroke="none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => formatMoney(value)} contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', color: '#fff', fontSize: '12px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {aiBudget.allocations.map((alloc, i) => (
                                            <div key={i} className="flex justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: alloc.color }}></div>
                                                    <span className="text-gray-600 dark:text-gray-300">{alloc.name}</span>
                                                </div>
                                                <span className="font-mono text-gray-900 dark:text-white">{formatMoney(alloc.amount)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        {aiBudget.actionableTips.map((tip, i) => (
                                            <div key={i} className="bg-gray-50 dark:bg-white/5 p-2 rounded border border-gray-100 dark:border-white/5 text-[10px] text-gray-600 dark:text-sushi-muted italic">
                                                "{tip}"
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* History List */}
                    <div className="md:col-span-2 bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm flex flex-col h-[600px]">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Historial de Movimientos</h3>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {transactions.length === 0 && <p className="text-gray-400 italic text-sm text-center mt-10">Sin movimientos.</p>}
                            {transactions
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(t => {
                                    const isDeleted = !!t.deletedAt;
                                    const isScheduled = t.status === 'SCHEDULED';
                                    const scheduledDate = t.scheduledDate ? new Date(t.scheduledDate) : null;
                                    const isIncome = t.type === 'INCOME';

                                    return (
                                        <div key={t.id} className={`flex justify-between items-center p-3 rounded-lg border transition-colors group ${isDeleted ? 'bg-gray-100 dark:bg-white/5 border-transparent opacity-60' : isScheduled ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-500/30' : 'bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5 hover:border-sushi-gold/30'}`}>
                                            <div className="flex items-center gap-3">
                                                {isDeleted ? (
                                                    <div className="p-2 rounded-full bg-gray-200 dark:bg-white/10 text-gray-500"><Ban className="w-4 h-4" /></div>
                                                ) : isScheduled ? (
                                                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600"><Calendar className="w-4 h-4" /></div>
                                                ) : (
                                                    <div className={`p-2 rounded-full ${t.type === 'INCOME' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-red-100 dark:bg-red-900/20 text-red-500'}`}>
                                                        {t.type === 'INCOME' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className={`text-sm font-bold flex items-center gap-2 ${isDeleted ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                                        {t.category}
                                                        {isScheduled && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 flex items-center gap-1 font-bold whitespace-nowrap"><Clock className="w-3 h-3" /> {scheduledDate?.toLocaleDateString()}</span>}
                                                        {t.imageUrl && !isDeleted && (
                                                            <button
                                                                onClick={() => setPreviewImage(t.imageUrl || null)}
                                                                className="text-gray-400 hover:text-sushi-gold transition-colors"
                                                                title="Ver comprobante"
                                                            >
                                                                <Paperclip className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                        {isDeleted && <span className="text-[10px] text-red-500 font-normal no-underline">ANULADO</span>}
                                                    </p>
                                                    <p className={`text-xs ${isDeleted ? 'text-gray-400' : 'text-gray-500 dark:text-sushi-muted'}`}>
                                                        {new Date(t.date).toLocaleDateString()} {t.time} • {t.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`font-mono font-bold ${isDeleted ? 'text-gray-400 line-through' : t.type === 'INCOME' ? 'text-green-600' : 'text-red-500'} ${isScheduled ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                                                    {t.type === 'INCOME' ? '+' : '-'}{formatMoney(t.amount)}
                                                </span>
                                                {!isDeleted && (currentUser?.permissions.manageFinance || currentUser?.permissions.superAdmin) && (
                                                    <button
                                                        onClick={(e) => handleDeleteTransaction(t.id, e)}
                                                        className="block ml-auto text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                        title="Anular movimiento"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {/* FIXED EXPENSES TAB */}
            {activeTab === 'FIXED' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white">Gastos Recurrentes (Mensuales)</h3>
                        <button
                            onClick={() => setShowFixedModal(true)}
                            className="bg-sushi-gold text-sushi-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors hover:bg-sushi-goldhover"
                        >
                            <Plus className="w-4 h-4" /> Agregar Nuevo
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fixedExpenses?.length === 0 && <p className="text-gray-400 italic text-sm col-span-full text-center py-8">No hay gastos fijos configurados.</p>}

                        {fixedExpenses?.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(exp => {
                            const paidPercent = Math.min(100, (exp.paidAmount || 0) / exp.amount * 100);
                            const due = new Date(exp.dueDate);
                            const isOverdue = !exp.isPaid && due < new Date();
                            const isNear = !exp.isPaid && !isOverdue && (due.getTime() - new Date().getTime()) < (3 * 24 * 60 * 60 * 1000);

                            return (
                                <div key={exp.id} className={`bg-white dark:bg-sushi-dark border rounded-xl p-5 shadow-sm relative group overflow-hidden ${isOverdue ? 'border-red-500/50' : isNear ? 'border-orange-500/50' : 'border-gray-200 dark:border-white/5'}`}>
                                    {exp.isPaid && <div className="absolute top-0 right-0 p-16 bg-green-500/10 rounded-full blur-2xl -mr-8 -mt-8"></div>}

                                    <div className="flex justify-between items-start mb-3 relative z-10">
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{exp.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-sushi-muted uppercase">{exp.category || 'Otros'}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="font-mono font-bold text-gray-900 dark:text-white">{formatMoney(exp.amount)}</span>
                                            {exp.isPaid ? (
                                                <span className="text-[10px] text-green-500 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> PAGADO</span>
                                            ) : (
                                                <span className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : isNear ? 'text-orange-500' : 'text-gray-400'}`}>
                                                    Vence: {new Date(exp.dueDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-100 dark:bg-black/30 h-2 rounded-full mb-2 overflow-hidden">
                                        <div className={`h-full transition-all ${exp.isPaid ? 'bg-green-500' : 'bg-sushi-gold'}`} style={{ width: `${paidPercent}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-4">
                                        <span>Pagado: {formatMoney(exp.paidAmount || 0)}</span>
                                        <span>Resta: {formatMoney(exp.amount - (exp.paidAmount || 0))}</span>
                                    </div>

                                    <div className="flex justify-between items-center relative z-10">
                                        <div className="text-[10px] text-gray-500 dark:text-sushi-muted">
                                            {exp.paymentMethod === 'TRANSFERENCIA' ? <CreditCard className="w-3 h-3 inline mr-1" /> : <Banknote className="w-3 h-3 inline mr-1" />}
                                            {exp.paymentMethod}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDeleteFixedExpense(exp.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                            {!exp.isPaid && (
                                                <button
                                                    onClick={() => openPayFixedModal(exp)}
                                                    className="bg-sushi-gold text-sushi-black px-3 py-1 rounded text-xs font-bold hover:bg-sushi-goldhover shadow-sm"
                                                >
                                                    Pagar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* SIMULATOR TAB */}
            {activeTab === 'SIMULATOR' && (
                <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-8 shadow-sm max-w-2xl mx-auto text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Zap className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-serif text-gray-900 dark:text-white mb-2">Simulador de Inversión</h3>
                    <p className="text-gray-500 dark:text-sushi-muted mb-8">
                        Comprueba si puedes afrontar una compra o gasto extra sin comprometer la nómina ni los pagos fijos.
                    </p>

                    <div className="flex gap-4 mb-8">
                        <input
                            type="text"
                            value={simName}
                            onChange={e => setSimName(e.target.value)}
                            placeholder="Ej. Aire Acondicionado"
                            className="flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-sushi-gold text-gray-900 dark:text-white"
                        />
                        <input
                            type="number"
                            value={simCost}
                            onChange={e => setSimCost(e.target.value)}
                            placeholder="Costo ($)"
                            className="w-32 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-sushi-gold text-gray-900 dark:text-white"
                        />
                    </div>

                    <button
                        onClick={runSimulation}
                        disabled={!simCost}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 mb-8"
                    >
                        Analizar Viabilidad
                    </button>

                    {simResult && (
                        <div className={`p-6 rounded-xl border animate-fade-in ${simResult === 'SAFE' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/20' : simResult === 'RISKY' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-500/20' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/20'}`}>
                            {simResult === 'SAFE' && (
                                <>
                                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-bold text-lg mb-2">
                                        <ThumbsUp className="w-6 h-6" /> VIABLE
                                    </div>
                                    <p className="text-sm text-green-800 dark:text-green-300">
                                        Tienes fondos suficientes. Incluso después del gasto, mantendrás un margen de seguridad del 20% sobre tus obligaciones.
                                    </p>
                                </>
                            )}
                            {simResult === 'RISKY' && (
                                <>
                                    <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400 font-bold text-lg mb-2">
                                        <AlertTriangle className="w-6 h-6" /> ARRIESGADO
                                    </div>
                                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                        Puedes pagarlo, pero quedarás con lo justo para cubrir sueldos y gastos fijos. Se recomienda esperar si no es urgente.
                                    </p>
                                </>
                            )}
                            {simResult === 'DANGEROUS' && (
                                <>
                                    <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-bold text-lg mb-2">
                                        <ThumbsDown className="w-6 h-6" /> NO VIABLE
                                    </div>
                                    <p className="text-sm text-red-800 dark:text-red-300">
                                        No tienes liquidez suficiente. Realizar este gasto comprometería el pago de sueldos o proveedores críticos.
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Transaction Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-md rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in">
                        <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-6">Registrar Movimiento</h3>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="flex bg-gray-100 dark:bg-black/20 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setTransType('INCOME')}
                                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${transType === 'INCOME' ? 'bg-white dark:bg-sushi-dark text-green-600 shadow' : 'text-gray-500'}`}
                                >
                                    Ingreso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTransType('EXPENSE')}
                                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${transType === 'EXPENSE' ? 'bg-white dark:bg-sushi-dark text-red-500 shadow' : 'text-gray-500'}`}
                                >
                                    Gasto
                                </button>
                            </div>

                            <div>
                                <label className="text-xs uppercase text-gray-500 mb-1 block">Monto</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold text-lg font-mono"
                                    placeholder="$0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs uppercase text-gray-500 mb-1 block">Categoría</label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                >
                                    <option value="Ventas">Ventas</option>
                                    <option value="Proveedores">Proveedores</option>
                                    <option value="Sueldos">Sueldos</option>
                                    <option value="Mantenimiento">Mantenimiento</option>
                                    <option value="Servicios">Servicios (Luz/Gas)</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Retiros">Retiros Socios</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs uppercase text-gray-500 mb-1 block">Descripción</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                    placeholder="Detalle del movimiento..."
                                />
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="text-xs uppercase text-gray-500 mb-1 block">Comprobante (Opcional)</label>
                                <div className="flex gap-2">
                                    <label className="flex-1 cursor-pointer bg-gray-50 dark:bg-black/20 border border-dashed border-gray-300 dark:border-white/10 rounded-lg p-3 flex items-center justify-center gap-2 text-gray-500 hover:border-sushi-gold transition-colors">
                                        <Camera className="w-4 h-4" />
                                        <span className="text-xs">{imageUrl ? 'Imagen Cargada' : 'Tomar/Subir Foto'}</span>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                    {imageUrl && (
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200">
                                            <img src={imageUrl} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Scheduled Transaction Checkbox */}
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-500/30">
                                <label className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400 cursor-pointer mb-2">
                                    <input
                                        type="checkbox"
                                        checked={isScheduled}
                                        onChange={() => setIsScheduled(!isScheduled)}
                                        className="accent-blue-600 w-4 h-4"
                                    />
                                    <Calendar className="w-4 h-4" />
                                    Programar Movimiento
                                </label>

                                {isScheduled && (
                                    <div className="animate-fade-in space-y-2">
                                        <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">
                                            Se ejecutará automáticamente en la fecha seleccionada.
                                        </p>
                                        <input
                                            type="date"
                                            value={scheduledDate}
                                            onChange={e => setScheduledDate(e.target.value)}
                                            className="w-full bg-white dark:bg-black/30 border border-blue-200 dark:border-blue-500/30 rounded px-2 py-2 text-sm outline-none focus:ring-2 ring-blue-500/50 [color-scheme:light] dark:[color-scheme:dark]"
                                            required={isScheduled}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Time Selection (Only if not scheduled) */}
                            {!isScheduled && (
                                <div className="flex items-center gap-4 bg-gray-50 dark:bg-black/20 p-3 rounded-lg">
                                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useCurrentTime}
                                            onChange={() => setUseCurrentTime(!useCurrentTime)}
                                            className="accent-sushi-gold w-4 h-4"
                                        />
                                        {useCurrentTime && <Clock className="w-4 h-4 text-gray-400" />}
                                        Hora Actual
                                    </label>
                                    {!useCurrentTime && (
                                        <input
                                            type="time"
                                            value={manualTime}
                                            onChange={e => setManualTime(e.target.value)}
                                            className="bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-sm outline-none"
                                        />
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 dark:bg-white/5 py-3 rounded-lg text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/10">Cancelar</button>
                                <button type="submit" className="flex-1 bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* New Fixed Expense Modal */}
            {showFixedModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-md rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in">
                        <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-6">Nuevo Gasto Fijo</h3>
                        <form onSubmit={handleAddFixedExpense} className="space-y-4">
                            <input type="text" value={newExpenseName} onChange={e => setNewExpenseName(e.target.value)} placeholder="Nombre (Ej. Alquiler)" className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-sushi-gold text-gray-900 dark:text-white font-bold" required />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" value={newExpenseAmount} onChange={e => setNewExpenseAmount(e.target.value)} placeholder="Monto ($)" className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-sushi-gold text-gray-900 dark:text-white font-mono" required />
                                <input type="date" value={newExpenseDate} onChange={e => setNewExpenseDate(e.target.value)} className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-sushi-gold text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]" required />
                            </div>
                            <select value={newExpenseCategory} onChange={e => setNewExpenseCategory(e.target.value as any)} className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-sushi-gold text-gray-900 dark:text-white">
                                <option value="INFRAESTRUCTURA">Infraestructura / Mantenimiento</option>
                                <option value="MATERIA_PRIMA">Materia Prima / Insumos</option>
                                <option value="SUELDOS">Sueldos / RRHH</option>
                                <option value="OTROS">Otros Servicios</option>
                            </select>

                            {/* Payment Details */}
                            <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                                <p className="text-xs uppercase text-gray-500 mb-2 font-bold">Datos de Pago</p>
                                <select value={newExpenseMethod} onChange={e => setNewExpenseMethod(e.target.value as any)} className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-3 mb-3 outline-none text-gray-900 dark:text-white">
                                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                    <option value="EFECTIVO">Efectivo</option>
                                </select>
                                {newExpenseMethod === 'TRANSFERENCIA' && (
                                    <div className="space-y-3">
                                        <input type="text" value={newExpenseBank} onChange={e => setNewExpenseBank(e.target.value)} placeholder="Banco" className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none text-gray-900 dark:text-white" />
                                        <input type="text" value={newExpenseCbu} onChange={e => setNewExpenseCbu(e.target.value)} placeholder="CBU / CVU" className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none text-gray-900 dark:text-white" />
                                        <input type="text" value={newExpenseAlias} onChange={e => setNewExpenseAlias(e.target.value)} placeholder="Alias" className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none text-gray-900 dark:text-white" />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowFixedModal(false)} className="flex-1 bg-gray-100 dark:bg-white/5 py-3 rounded-lg text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/10">Cancelar</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all transform hover:scale-[1.02]">Crear Gasto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CONTEO (AUDIT) TAB */}
            {activeTab === 'AUDIT' && (
                <div className="animate-fade-in max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-2xl p-8 shadow-xl">
                        <div className="text-center mb-8">
                            <h3 className="text-3xl font-serif text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-3">
                                <Shield className="w-8 h-8 text-sushi-gold" />
                                Conteo de Fondos
                            </h3>
                            <p className="text-gray-500 dark:text-sushi-muted">
                                Realiza un arqueo detallado de todas tus cuentas y efectivo.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column: Count Input */}
                            <div className="space-y-6">
                                <div className="bg-gray-50 dark:bg-black/20 p-6 rounded-xl border border-gray-200 dark:border-white/10">
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Plus className="w-4 h-4 text-sushi-gold" />
                                        Agregar Ubicación
                                    </h4>
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const form = e.target as HTMLFormElement;
                                            const nameInput = form.elements.namedItem('locationName') as HTMLInputElement;
                                            const amountInput = form.elements.namedItem('locationAmount') as HTMLInputElement;

                                            const name = nameInput.value.trim();
                                            const amount = parseFloat(amountInput.value);

                                            if (name && !isNaN(amount)) {
                                                const newItem = { id: generateUUID(), name, amount };
                                                const newData = [...(auditData as unknown as { id: string, name: string, amount: number }[]), newItem];
                                                setAuditData(newData as any);
                                                localStorage.setItem('wallet_audit_data_v2', JSON.stringify(newData));

                                                nameInput.value = '';
                                                amountInput.value = '';
                                                nameInput.focus();
                                            }
                                        }}
                                        className="flex gap-2"
                                    >
                                        <input
                                            name="locationName"
                                            type="text"
                                            placeholder="Ej: Caja Fuerte, Bajo Colchón..."
                                            className="flex-1 bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                            required
                                        />
                                        <input
                                            name="locationAmount"
                                            type="number"
                                            placeholder="$0"
                                            className="w-32 bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg p-3 text-sm font-mono text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            className="bg-sushi-gold text-sushi-black p-3 rounded-lg hover:bg-sushi-goldhover transition-colors"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </form>
                                </div>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {(auditData as unknown as { id: string, name: string, amount: number }[]).length === 0 && (
                                        <p className="text-center text-gray-400 dark:text-sushi-muted italic py-8 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-xl">
                                            No hay ubicaciones registradas. <br /> Agrega una arriba para comenzar el conteo.
                                        </p>
                                    )}

                                    {(auditData as unknown as { id: string, name: string, amount: number }[]).map(item => (
                                        <div key={item.id} className="flex justify-between items-center p-4 bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl shadow-sm hover:border-sushi-gold/30 transition-colors group">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono font-bold text-gray-900 dark:text-white text-lg">{formatMoney(item.amount)}</span>
                                                <button
                                                    onClick={() => {
                                                        const newData = (auditData as unknown as { id: string, name: string, amount: number }[]).filter(i => i.id !== item.id);
                                                        setAuditData(newData as any);
                                                        localStorage.setItem('wallet_audit_data_v2', JSON.stringify(newData));
                                                    }}
                                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Column: Results */}
                            <div className="flex flex-col gap-6">
                                <div className="bg-gradient-to-br from-gray-900 via-sushi-black to-black p-8 rounded-2xl flex flex-col justify-center border border-sushi-gold/20 shadow-2xl relative overflow-hidden group min-h-[300px]">
                                    <div className="absolute top-0 right-0 p-32 bg-sushi-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-sushi-gold/10 transition-colors"></div>

                                    <h4 className="text-center text-sm uppercase font-bold text-sushi-gold mb-8 tracking-[0.2em] relative z-10 flex items-center justify-center gap-2">
                                        <Shield className="w-4 h-4" /> Resultado del Arqueo
                                    </h4>

                                    <div className="space-y-6 relative z-10">
                                        <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
                                            <span className="text-gray-300 font-medium">Total Declarado (Real):</span>
                                            <span className="font-mono font-bold text-2xl text-white">
                                                {formatMoney(
                                                    (auditData as unknown as { amount: number }[]).reduce((sum, item) => sum + (item.amount || 0), 0)
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm opacity-80">
                                            <span className="text-gray-400 font-medium">Saldo Sistema (Teórico):</span>
                                            <span className="font-mono text-xl text-gray-400">{formatMoney(totalBalance)}</span>
                                        </div>

                                        <div className="py-6 border-t border-white/10 mt-4">
                                            <div className="flex justify-between items-center bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
                                                <span className="font-bold uppercase text-white tracking-widest text-sm">Diferencia:</span>
                                                <span className={`font-mono font-bold text-4xl ${((auditData as unknown as { amount: number }[]).reduce((sum, item) => sum + (item.amount || 0), 0) - totalBalance) === 0
                                                    ? 'text-sushi-gold drop-shadow-glow'
                                                    : ((auditData as unknown as { amount: number }[]).reduce((sum, item) => sum + (item.amount || 0), 0) - totalBalance) > 0
                                                        ? 'text-green-400' // Sobrante (Green requested by Logic, originally Blue but Green is better for money plus)
                                                        : 'text-red-500' // Faltante
                                                    }`}>
                                                    {formatMoney(
                                                        (auditData as unknown as { amount: number }[]).reduce((sum, item) => sum + (item.amount || 0), 0) - totalBalance
                                                    )}
                                                </span>
                                            </div>
                                            <p className="text-center text-sm mt-4 text-gray-400 font-medium">
                                                {((auditData as unknown as { amount: number }[]).reduce((sum, item) => sum + (item.amount || 0), 0) - totalBalance) === 0
                                                    ? <span className="text-sushi-gold flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Balance Perfecto</span>
                                                    : ((auditData as unknown as { amount: number }[]).reduce((sum, item) => sum + (item.amount || 0), 0) - totalBalance) > 0
                                                        ? 'Existe un sobrante de dinero (Extra).'
                                                        : 'Falta dinero respecto al sistema.'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        const auditTotal = (auditData as unknown as { amount: number }[]).reduce((sum, item) => sum + (item.amount || 0), 0);
                                        const difference = auditTotal - totalBalance;

                                        import('../utils/exportUtils').then(({ exportFinancialReportPDF }) => {
                                            exportFinancialReportPDF({
                                                totalBalance,
                                                auditTotal,
                                                difference,
                                                auditItems: auditData as unknown as { name: string, amount: number }[],
                                                income: 0, // Placeholder
                                                expenses: 0, // Placeholder
                                                transactions: transactions
                                            });
                                        });
                                    }}
                                    className="w-full bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl border border-gray-700 font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Download className="w-5 h-5" />
                                    Exportar Reporte Financiero (PDF)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pay Fixed Expense Modal */}
            {payExpenseModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-sm rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-sushi-gold text-sushi-black rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                                $
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Abonar Gasto Fijo</h3>
                            <p className="text-sm text-gray-500 dark:text-sushi-muted mt-1">
                                {payExpenseModal.name}
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 mb-6 text-center">
                            <p className="text-xs uppercase text-gray-500 mb-1">Monto a Pagar</p>
                            <input
                                type="number"
                                value={partialPayAmount}
                                onChange={(e) => setPartialPayAmount(Number(e.target.value))}
                                className="text-3xl font-mono font-bold text-gray-900 dark:text-white bg-transparent text-center w-full outline-none border-b border-gray-300 dark:border-white/10 focus:border-sushi-gold"
                            />
                            <p className="text-[10px] text-gray-400 mt-2">Restante: {formatMoney(payExpenseModal.amount - (payExpenseModal.paidAmount || 0))}</p>
                        </div>

                        {/* Show payment info if transfer */}
                        {payExpenseModal.paymentMethod === 'TRANSFERENCIA' && (
                            <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg mb-6 text-xs text-blue-800 dark:text-blue-300">
                                <p className="font-bold mb-1">Datos Bancarios:</p>
                                <p>CBU: {payExpenseModal.cbu || 'No registrado'}</p>
                                <p>Alias: {payExpenseModal.alias || 'No registrado'}</p>
                                <p>Banco: {payExpenseModal.bank || 'No registrado'}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setPayExpenseModal(null)}
                                className="flex-1 bg-gray-100 dark:bg-white/5 py-3 rounded-lg text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/10"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmPayFixedExpense}
                                disabled={partialPayAmount <= 0}
                                className="flex-1 bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover shadow-lg shadow-sushi-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
