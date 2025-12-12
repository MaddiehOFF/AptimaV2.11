import React, { useState } from 'react';
import { Partner, RoyaltyPayment, WalletTransaction, PaymentMethod, RoyaltyHistoryItem } from '../types';
import { Crown, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, DollarSign, ArrowRight, X, Clock, Banknote, CreditCard, Minus } from 'lucide-react';
import { ConfirmationModal } from './common/ConfirmationModal';

interface RoyaltiesManagementProps {
    partners: Partner[];
    setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
    royaltyPool: number; // Accumulated Royalties sum (derived in App)
    setTransactions: React.Dispatch<React.SetStateAction<WalletTransaction[]>>;
    transactions: WalletTransaction[];
    userName: string;
    royaltyHistory: RoyaltyHistoryItem[];
    addRoyaltyHistory: (item: RoyaltyHistoryItem) => Promise<void>;
}

export const RoyaltiesManagement: React.FC<RoyaltiesManagementProps> = ({ partners, setPartners, royaltyPool, setTransactions, transactions, userName, royaltyHistory, addRoyaltyHistory }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

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

    // Partner Detail Modal State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentPartner, setPaymentPartner] = useState<Partner | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFERENCIA');

    // Injection Modal State
    const [showInjectModal, setShowInjectModal] = useState(false);
    const [injectAmount, setInjectAmount] = useState('');
    const [deductFromWallet, setDeductFromWallet] = useState(false);

    const [formName, setFormName] = useState('');
    const [formShare, setFormShare] = useState('25'); // Default 25% for 4 partners
    const [formCbu, setFormCbu] = useState('');
    const [formBank, setFormBank] = useState('');


    // History State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    // History is now passed via props

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const addToHistory = (item: Omit<RoyaltyHistoryItem, 'id' | 'date'>) => {
        const newItem: RoyaltyHistoryItem = {
            id: generateUUID(),
            date: new Date().toISOString(),
            ...item
        };
        addRoyaltyHistory(newItem);
    };



    // Remove Money Options
    const [isRemoval, setIsRemoval] = useState(false);

    const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    const openModal = (partner?: Partner) => {
        if (partner) {
            setEditingId(partner.id);
            setFormName(partner.name);
            setFormShare(partner.sharePercentage.toString());
            setFormCbu(partner.cbu || '');
            setFormBank(partner.bank || '');
        } else {
            setEditingId(null);
            setFormName('');
            setFormShare('25');
            setFormCbu('');
            setFormBank('');
        }
        setShowModal(true);
    };

    const handleSavePartner = (e: React.FormEvent) => {
        e.preventDefault();
        const share = parseFloat(formShare) || 0;

        const partnerData: Partner = {
            id: editingId || generateUUID(),
            name: formName,
            sharePercentage: share,
            balance: editingId ? partners.find(p => p.id === editingId)?.balance || 0 : 0, // Preserve balance or init 0
            cbu: formCbu,
            bank: formBank
        };

        if (editingId) {
            setPartners(partners.map(p => p.id === editingId ? partnerData : p));
        } else {
            setPartners([...partners, partnerData]);
        }
        setShowModal(false);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: '¿Eliminar socio?',
            message: 'Eliminarás al socio permanentemente del sistema.',
            type: 'danger',
            confirmText: 'SÍ, ELIMINAR',
            onConfirm: () => setPartners(partners.filter(p => p.id !== id))
        });
    };

    const handleInjectFunds = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(injectAmount);
        if (!amount || amount <= 0) return;

        if (isRemoval && amount > royaltyPool) {
            alert('No puedes retirar más dinero del que hay en el pozo acumulado.');
            return;
        }

        // 1. Distribute to Partners (Add or Subtract)
        const updatedPartners = partners.map(p => ({
            ...p,
            balance: isRemoval
                ? Math.max(0, (p.balance || 0) - (amount * (p.sharePercentage / 100)))
                : (p.balance || 0) + (amount * (p.sharePercentage / 100))
        }));
        setPartners(updatedPartners);

        // 2. Create Wallet Expense/Income (Optional)
        if (deductFromWallet) {
            const transaction: WalletTransaction = {
                id: generateUUID(),
                date: new Date().toISOString(),
                time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                amount: amount,
                type: isRemoval ? 'INCOME' : 'EXPENSE', // If removing from royalties, it goes back to wallet as Income? Or just vanishes? 
                // Request says "Quitar dinero" for correction. Usually implies reverse operation.
                // Let's assume if "Descontar de Billetera" was checked during injection, we should "Refund to Wallet" during removal.
                category: 'Regalías',
                description: isRemoval ? 'Devolución desde Pozo Regalías' : 'Ingreso al Pozo de Regalías',
                createdBy: userName
            };
            setTransactions(prev => [transaction, ...prev]);
        }

        // 3. Log History
        addToHistory({
            type: isRemoval ? 'EXPENSE' : 'INCOME',
            amount: amount,
            description: isRemoval ? 'Corrección / Retiro de Fondos' : 'Ingreso de Capital al Pozo',
            user: userName
        });

        setShowInjectModal(false);
        setInjectAmount('');
        setDeductFromWallet(false);
        setIsRemoval(false);
    };

    const initiatePayment = (partner: Partner) => {
        setPaymentPartner(partner);
        // Default to full balance payment
        setPaymentAmount(partner.balance || 0);
        setPaymentMethod('TRANSFERENCIA');
        setShowPaymentModal(true);
    };

    const confirmPayment = () => {
        if (!paymentPartner || paymentAmount <= 0) return;

        // 1. Create Wallet Expense
        const transaction: WalletTransaction = {
            id: generateUUID(),
            date: new Date().toISOString(),
            time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            amount: paymentAmount,
            type: 'EXPENSE',
            category: 'Regalías',
            description: `Pago regalías a ${paymentPartner.name}`,
            createdBy: userName,
            method: paymentMethod
        };

        setTransactions(prev => [transaction, ...prev]);

        // 2. Reduce Partner Balance
        setPartners(partners.map(p =>
            p.id === paymentPartner.id
                ? { ...p, balance: Math.max(0, (p.balance || 0) - paymentAmount) }
                : p
        ));

        // 3. Log History
        addToHistory({
            type: 'PAYMENT',
            amount: paymentAmount,
            description: `Pago a socio: ${paymentPartner.name}`,
            user: userName
        });

        setShowPaymentModal(false);
        setPaymentPartner(null);
    };

    const viewPartnerDetails = (partner: Partner) => {
        setSelectedPartner(partner);
        setShowDetailModal(true);
    };

    // Filter transactions for specific partner
    const getPartnerHistory = (partnerName: string) => {
        return transactions.filter(t =>
            t.category === 'Regalías' &&
            t.type === 'EXPENSE' &&
            t.description.toLowerCase().includes(partnerName.toLowerCase())
        );
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                        <Crown className="w-8 h-8 text-sushi-gold" />
                        Gestión de Regalías
                    </h2>
                    <p className="text-gray-500 dark:text-sushi-muted mt-2">Distribución de dividendos y gestión de socios.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-white hover:text-sushi-gold hover:border-sushi-gold px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                    >
                        <Clock className="w-5 h-5" /> Historial
                    </button>
                    <button
                        onClick={() => { setIsRemoval(false); setShowInjectModal(true); }}
                        className="bg-sushi-black dark:bg-black/40 border border-sushi-gold/30 text-sushi-gold hover:bg-sushi-gold hover:text-sushi-black px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                    >
                        <DollarSign className="w-5 h-5" /> Ingresar dinero
                    </button>
                    <button
                        onClick={() => { setIsRemoval(true); setShowInjectModal(true); }}
                        className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 hover:border-red-400 px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                        title="Corregir o Retirar dinero"
                    >
                        <Minus className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => openModal()}
                        className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/10 px-4 py-2 rounded-lg font-bold hover:border-sushi-gold transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Nuevo Socio
                    </button>
                </div>
            </div>

            {/* Pool Card */}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-8 rounded-2xl shadow-xl border border-purple-500/30 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <p className="uppercase tracking-widest text-xs font-bold text-purple-200 mb-2">Pozo Acumulado a Distribuir</p>
                    <h3 className="text-5xl font-mono font-bold">{formatMoney(royaltyPool)}</h3>
                    <p className="text-xs text-purple-300 mt-4 opacity-80">Suma total de los saldos pendientes de los socios.</p>
                </div>
            </div>

            {/* Partners List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {partners.map(p => {
                    const balance = p.balance || 0;

                    return (
                        <div
                            key={p.id}
                            className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm hover:border-sushi-gold/30 transition-all group relative cursor-pointer"
                            onClick={() => viewPartnerDetails(p)}
                        >
                            <div className="absolute top-4 right-4 flex gap-2 z-20">
                                <button onClick={(e) => { e.stopPropagation(); openModal(p); }} className="text-gray-400 hover:text-sushi-gold p-1"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={(e) => handleDelete(p.id, e)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center font-bold text-lg text-gray-700 dark:text-white border border-gray-200 dark:border-white/10">
                                    {p.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">{p.name}</h4>
                                    <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded font-bold">{p.sharePercentage}% Part.</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-3 text-xs space-y-1 mb-6 text-gray-500 dark:text-sushi-muted">
                                <p><span className="font-bold">Banco:</span> {p.bank || '-'}</p>
                                <p><span className="font-bold">CBU:</span> {p.cbu || '-'}</p>
                            </div>

                            <div className="flex justify-between items-center border-t border-gray-100 dark:border-white/5 pt-4">
                                <div>
                                    <p className="text-[10px] uppercase text-gray-400 font-bold">Saldo Pendiente</p>
                                    <p className="text-xl font-mono font-bold text-purple-500 dark:text-purple-400">{formatMoney(balance)}</p>
                                </div>
                                {balance > 0 ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); initiatePayment(p); }}
                                        className="bg-sushi-gold text-sushi-black px-4 py-2 rounded-lg font-bold text-xs hover:bg-sushi-goldhover transition-colors flex items-center gap-1 z-20 relative"
                                    >
                                        Abonar <ArrowRight className="w-3 h-3" />
                                    </button>
                                ) : (
                                    <span className="text-xs font-bold text-green-500 bg-green-100 dark:bg-green-500/10 px-2 py-1 rounded flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Al día
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

                <button
                    onClick={() => openModal()}
                    className="bg-gray-50 dark:bg-white/[0.02] border border-dashed border-gray-300 dark:border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-sushi-muted hover:border-sushi-gold hover:text-sushi-gold transition-colors min-h-[250px]"
                >
                    <Plus className="w-8 h-8" />
                    <span>Agregar Socio</span>
                </button>
            </div>

            {/* Injection Modal */}
            {showInjectModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-sm rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in">
                        <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <DollarSign className="w-6 h-6 text-sushi-gold" />
                            {isRemoval ? 'Retirar / Corregir Dinero' : 'Ingresar al Pozo'}
                        </h3>
                        <form onSubmit={handleInjectFunds} className="space-y-6">
                            <div>
                                <label className="text-xs uppercase text-gray-500 mb-1 block font-bold">Monto a Distribuir</label>
                                <input
                                    type="number"
                                    value={injectAmount}
                                    onChange={e => setInjectAmount(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-4 text-2xl font-mono text-center font-bold text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                    placeholder="$0"
                                    required
                                />
                                <p className="text-center text-xs text-gray-400 mt-2">
                                    Se {isRemoval ? 'descontará' : 'repartirá'} automáticamente según el % de cada socio.
                                </p>
                            </div>

                            <label className={`flex items - center gap - 3 p - 3 rounded - lg cursor - pointer transition - colors ${isRemoval ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100' : 'bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5'} `}>
                                <input
                                    type="checkbox"
                                    checked={deductFromWallet}
                                    onChange={e => setDeductFromWallet(e.target.checked)}
                                    className="w-5 h-5 accent-sushi-gold rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {isRemoval ? 'Devolver a' : 'Descontar de'} <span className="font-bold">Billetera Global</span>
                                </span>
                            </label>

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowInjectModal(false)} className="flex-1 bg-gray-100 dark:bg-white/5 py-3 rounded-lg text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/10">Cancelar</button>
                                <button type="submit" className={`flex - 1 font - bold py - 3 rounded - lg shadow - lg ${isRemoval ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20' : 'bg-sushi-gold text-sushi-black hover:bg-sushi-goldhover'} `}>
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Partner Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-md rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in">
                        <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-6">Datos del Socio</h3>
                        <form onSubmit={handleSavePartner} className="space-y-4">
                            <div>
                                <label className="text-xs uppercase text-gray-500 mb-1 block">Nombre Completo</label>
                                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold" required />
                            </div>
                            <div>
                                <label className="text-xs uppercase text-gray-500 mb-1 block">Participación (%)</label>
                                <input type="number" value={formShare} onChange={e => setFormShare(e.target.value)} className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-gray-500 mb-1 block">Banco</label>
                                    <input type="text" value={formBank} onChange={e => setFormBank(e.target.value)} className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold" />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-gray-500 mb-1 block">CBU / Alias</label>
                                    <input type="text" value={formCbu} onChange={e => setFormCbu(e.target.value)} className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 dark:bg-white/5 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 font-bold">Cancelar</button>
                                <button type="submit" className="flex-1 bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Confirmation Modal */}
            {showPaymentModal && paymentPartner && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-sm rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-sushi-gold text-sushi-black rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                                $
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Abonar Regalías</h3>
                            <p className="text-sm text-gray-500 dark:text-sushi-muted mt-1">
                                Socio: <span className="text-sushi-gold font-bold">{paymentPartner.name}</span>
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 mb-6 text-center">
                            <p className="text-xs uppercase text-gray-500 mb-1">Monto a Pagar</p>
                            <input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                className="text-3xl font-mono font-bold text-gray-900 dark:text-white bg-transparent text-center w-full outline-none border-b border-gray-300 dark:border-white/10 focus:border-sushi-gold"
                            />
                            <p className="text-[10px] text-gray-400 mt-2">Saldo disponible: {formatMoney(paymentPartner.balance || 0)}</p>
                        </div>

                        <div className="mb-6">
                            <label className="text-xs uppercase text-gray-500 mb-2 block font-bold">Método de Pago</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPaymentMethod('TRANSFERENCIA')}
                                    className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'TRANSFERENCIA' ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500'}`}
                                >
                                    <CreditCard className="w-5 h-5" />
                                    <span className="text-xs font-bold">Transferencia</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('EFECTIVO')}
                                    className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'EFECTIVO' ? 'bg-green-50 dark:bg-green-500/10 border-green-500 text-green-600 dark:text-green-400' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500'}`}
                                >
                                    <Banknote className="w-5 h-5" />
                                    <span className="text-xs font-bold">Efectivo</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 bg-gray-100 dark:bg-white/5 py-3 rounded-lg text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/10"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmPayment}
                                disabled={paymentAmount <= 0 || paymentAmount > (paymentPartner.balance || 0)}
                                className="flex-1 bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover shadow-lg shadow-sushi-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Partner Details / History Modal */}
            {showDetailModal && selectedPartner && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/20 rounded-t-2xl">
                            <div>
                                <h3 className="text-2xl font-serif text-gray-900 dark:text-white">{selectedPartner.name}</h3>
                                <p className="text-gray-500 dark:text-sushi-muted text-sm">Historial de Pagos y Dividendos</p>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="flex gap-4 mb-6">
                                <div className="bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg border border-purple-200 dark:border-purple-500/20">
                                    <p className="text-xs uppercase font-bold">Participación</p>
                                    <p className="text-lg font-mono font-bold">{selectedPartner.sharePercentage}%</p>
                                </div>
                                <div className="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-sushi-muted px-4 py-2 rounded-lg flex-1 border border-gray-200 dark:border-white/10">
                                    <p className="text-xs uppercase font-bold">Datos Bancarios</p>
                                    <p className="text-sm font-mono">{selectedPartner.bank} - {selectedPartner.cbu}</p>
                                </div>
                            </div>

                            <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-sushi-gold" /> Últimos Pagos
                            </h4>

                            <div className="space-y-3">
                                {getPartnerHistory(selectedPartner.name).length === 0 ? (
                                    <p className="text-center text-gray-400 dark:text-sushi-muted italic py-4 border border-dashed border-gray-200 dark:border-white/10 rounded-lg">
                                        No hay registros de pagos para este socio.
                                    </p>
                                ) : (
                                    getPartnerHistory(selectedPartner.name).map(t => (
                                        <div key={t.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-lg">
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{t.description}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-sushi-muted">
                                                    <span>{new Date(t.date).toLocaleDateString()} {t.time}</span>
                                                    <span>•</span>
                                                    <span className="uppercase font-bold">{t.method || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <p className="font-mono font-bold text-red-500 dark:text-red-400">-{formatMoney(t.amount)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/20 rounded-t-2xl">
                            <h3 className="text-xl font-serif text-gray-900 dark:text-white flex items-center gap-2">
                                <Clock className="w-6 h-6 text-gray-400" />
                                Historial de Movimientos
                            </h3>
                            <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-0 overflow-y-auto">
                            {royaltyHistory.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 dark:text-sushi-muted italic">
                                    No hay movimientos registrados aún.
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 dark:bg-black/40 text-xs uppercase text-gray-500 sticky top-0">
                                        <tr>
                                            <th className="p-4 font-bold">Fecha / Usuario</th>
                                            <th className="p-4 font-bold">Descripción</th>
                                            <th className="p-4 font-bold text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {royaltyHistory.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                                <td className="p-4">
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{new Date(item.date).toLocaleDateString()}</p>
                                                    <p className="text-xs text-gray-400">{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.user}</p>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px - 2 py - 0.5 rounded text - [10px] font - bold border mb - 1 inline - block ${item.type === 'INCOME' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 border-green-200' :
                                                        item.type === 'PAYMENT' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 border-blue-200' :
                                                            'bg-red-100 dark:bg-red-500/10 text-red-600 border-red-200'
                                                        }`}>
                                                        {item.type === 'INCOME' ? 'INGRESO' : item.type === 'PAYMENT' ? 'PAGO' : 'EGRESO/RETIRO'}
                                                    </span>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                                                    {formatMoney(item.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
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
