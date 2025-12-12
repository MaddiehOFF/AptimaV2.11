import React, { useState } from 'react';
import { Employee, PaymentMethod, WalletTransaction, User, CalendarEvent, OvertimeRecord, AbsenceRecord, SanctionRecord, PayrollMovement } from '../types'; // Import PayrollMovement
import { Calendar, Search, Filter, Download, Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, DollarSign, Clock, AlertTriangle, FileText, Banknote, Info, User as UserIcon, Calculator, ArrowRight, List, Wallet, CreditCard, History as HistoryIcon, HandCoins, AlertCircle, RefreshCcw } from 'lucide-react';
import { playSound } from '../utils/soundUtils';
import { exportPayrollReceiptPDF } from '../utils/exportUtils';
import { calculateAccruedSalary, getLedgerAccrual, parseSalaryToNumber } from '../utils/payrollUtils';

// ... (rest of imports/code)

// FIX USAGES of UserIcon and HistoryIcon in the render method (I can't replace the whole file, so I will target specific blocks).
// This tool call is ONLY for Imports. I will do logic later.

import { supabase } from '../supabaseClient';
import { SecurityConfirmationModal } from './SecurityConfirmationModal';
import { ConfirmationModal } from './common/ConfirmationModal';

interface PayrollManagementProps {
    employees: Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    transactions?: WalletTransaction[]; // Need to access wallet history
    setTransactions?: React.Dispatch<React.SetStateAction<WalletTransaction[]>>;
    currentUser?: User | null;
    records?: OvertimeRecord[]; // Overtime/Attendance records
    calendarEvents?: CalendarEvent[]; // Add calendarEvents prop
    absences?: AbsenceRecord[];
    products?: any[]; // For product discounts
    sanctions?: SanctionRecord[]; // Add Sanctions prop
    payrollMovements?: PayrollMovement[];
    setPayrollMovements?: React.Dispatch<React.SetStateAction<PayrollMovement[]>>;
    setRecords?: React.Dispatch<React.SetStateAction<OvertimeRecord[]>>;
}

const PayrollTutorial = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-fade-in">
        <div className="bg-white dark:bg-black w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-scale-in">
            <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Banknote className="w-6 h-6 text-sushi-gold" />
                    Guía de Referencia
                </h3>
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                        <p className="font-bold text-gray-900 dark:text-white mb-1">El Saldo (Balance)</p>
                        <p>Es el acumulado histórico. Si es <span className="text-red-500 font-bold">negativo</span>, el empleado debe a la empresa (Adelantos). Si es <span className="text-sushi-500 font-bold">positivo</span>, la empresa debe al empleado.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-sushi-50 dark:bg-sushi-500/10 p-4 rounded-xl border border-sushi-100 dark:border-sushi-500/20">
                            <p className="font-bold text-sushi-600 dark:text-sushi-400 mb-1">Abonar</p>
                            <p className="text-xs">Suma dinero al empleado (Pago de sueldo, Bonos). Reduce la deuda o aumenta el saldo a favor.</p>
                        </div>
                        <div className="flex-1 bg-red-50 dark:bg-red-500/10 p-4 rounded-xl border border-red-100 dark:border-red-500/20">
                            <p className="font-bold text-red-600 dark:text-red-500 mb-1">Descontar</p>
                            <p className="text-xs">Resta dinero (Adelantos, Sanciones, Consumos). Aumenta la deuda o reduce el saldo a favor.</p>
                        </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">Tip Pro: Abonar Todo</p>
                            <p className="text-xs">Al seleccionar "Abonar", usa la opción "Abonar todo" para pagar automáticamente el total pendiente calculado por el sistema.</p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-white/20"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    </div>
);

export const PayrollManagement: React.FC<PayrollManagementProps> = ({ employees, setEmployees, transactions = [], setTransactions, currentUser, records = [], calendarEvents = [], absences = [], products = [], sanctions = [], payrollMovements = [], setPayrollMovements, setRecords }) => {
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFERENCIA');
    const [paymentDescription, setPaymentDescription] = useState('');
    const [modalMode, setModalMode] = useState<'PAYMENT' | 'DISCOUNT' | 'BONUS'>('PAYMENT'); // Renamed ADVANCE to DISCOUNT

    // Discount Reason State
    const [discountReason, setDiscountReason] = useState<'ADELANTO' | 'CONSUMO' | 'SANCION' | 'OTRO'>('ADELANTO');

    const [resetCycle, setResetCycle] = useState(true); // Default to true for Payments

    // Product Discount State
    const [selectedDiscountProducts, setSelectedDiscountProducts] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
    const [showProductSelector, setShowProductSelector] = useState(false);

    // Detail Modal State
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);

    // Security Modal State
    const [securityModalOpen, setSecurityModalOpen] = useState(false);

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

    // Filter Logical State
    const [showTutorial, setShowTutorial] = useState(false);

    // History Note Detail State
    const [selectedNote, setSelectedNote] = useState<{ text: string; date: string } | null>(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

    // Filter out 'DIARIO' employees as they are paid daily
    const activeEmployees = employees.filter(e => e.active && e.paymentModality !== 'DIARIO');

    const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    // Current View Date (Defaults to Today for now)
    const [currentDate, setCurrentDate] = useState(new Date());
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Concretar Nómina State
    const [showConcretarModal, setShowConcretarModal] = useState(false);
    const [newCycleStartDate, setNewCycleStartDate] = useState(new Date().toISOString().split('T')[0]);

    // Export PDF State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState(new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]);
    const [exportEndDate, setExportEndDate] = useState(new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]);
    const [employeeToExport, setEmployeeToExport] = useState<Employee | null>(null);

    // --- HISTORY MODAL STATE ---
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);
    const [selectedMovement, setSelectedMovement] = useState<any>(null);
    const [sortOrder, setSortOrder] = useState<'NAME_ASC' | 'NAME_DESC' | 'SALARY_ASC' | 'SALARY_DESC' | 'BALANCE_ASC' | 'BALANCE_DESC'>('NAME_ASC');

    const handleSort = (criteria: 'NAME' | 'SALARY' | 'BALANCE') => {
        if (criteria === 'NAME') setSortOrder(prev => prev === 'NAME_ASC' ? 'NAME_DESC' : 'NAME_ASC');
        if (criteria === 'SALARY') setSortOrder(prev => prev === 'SALARY_ASC' ? 'SALARY_DESC' : 'SALARY_ASC');
        if (criteria === 'BALANCE') setSortOrder(prev => prev === 'BALANCE_ASC' ? 'BALANCE_DESC' : 'BALANCE_ASC');
    };

    const handleViewHistory = (emp: Employee) => {
        setHistoryEmployee(emp);
        setHistoryModalOpen(true);
    };

    // Helper: Update Payment Date
    const handleUpdatePaymentDate = async (empId: string, date: string) => {
        // Optimistic Update
        setEmployees(employees.map(e => e.id === empId ? { ...e, nextPaymentDate: date } : e));

        // Supabase Update
        const emp = employees.find(e => e.id === empId);
        if (emp) {
            const { id, ...rest } = emp;
            const updatedData = { ...rest, nextPaymentDate: date };
            await supabase.from('employees').update({ data: updatedData }).eq('id', empId);
        }
    };



    const totalEstimated = activeEmployees.reduce((acc, curr) => acc + curr.monthlySalary, 0);
    // Use Ledger for Total Accrued
    // Use Ledger for Total Accrued

    // Polyfill for UUID to prevent browser compatibility issues
    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const totalAccrued = activeEmployees.reduce((acc, curr) => {
        // Use Dynamic Calculation for visual consistency
        const dynamicCalc = calculateAccruedSalary(curr, records, calendarEvents, absences, sanctions);
        return acc + (dynamicCalc.accruedAmount - dynamicCalc.sanctionDeduction);
    }, 0);

    const updateEmployeePayment = (id: string, field: 'nextPaymentDate' | 'nextPaymentMethod', value: string) => {
        setEmployees(employees.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const getDaysUntilPayment = (dateStr?: string) => {
        if (!dateStr) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const paymentDate = new Date(dateStr);
        paymentDate.setHours(0, 0, 0, 0);

        const diffTime = paymentDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    const openPaymentModal = (emp: Employee, mode: 'PAYMENT' | 'DISCOUNT' | 'BONUS') => {
        setSelectedEmployee(emp);
        setModalMode(mode);
        setSelectedDiscountProducts([]); // Reset discounts
        const accrual = calculateAccruedSalary(emp, records, calendarEvents, absences);
        const currentBalance = emp.balance || 0;

        if (mode === 'PAYMENT') {
            // For Payment: Suggest Accrued + Balance (Total Debt)
            // If Balance is negative (Advance), it reduces payment.
            const totalOwed = Math.max(0, accrual.accruedAmount + currentBalance);
            setPaymentAmount(totalOwed);
            setPaymentDescription(`Pago Nómina: ${emp.name}`);
            setResetCycle(false); // Default to FALSE to avoid accidental resets
        } else if (mode === 'DISCOUNT') {
            // For Advance: Default to 0, user inputs amount
            setPaymentAmount(0);
            setPaymentDescription(`Adelanto Sueldo: ${emp.name}`);
            setResetCycle(false); // Advances don't reset cycle
        } else if (mode === 'BONUS') {
            setPaymentAmount(0);
            setPaymentDescription(`Bonificación: ${emp.name}`);
            setResetCycle(false);
        }

        setPaymentMethod(emp.nextPaymentMethod || 'TRANSFERENCIA');
        setPaymentModalOpen(true);
    };

    const addProductToDiscount = (prodId: string) => {
        if (!products) return;
        const prod = products.find(p => p.id === prodId);
        if (!prod) return;

        // Cost or Price? User said "consumed products", usually handled at cost or price depending on policy. 
        // Assuming Price for deduction as standard, or maybe Cost? Let's use Price as "Value to company".
        // Actually, for internal consumption usually it's Cost, but user said "descontarselo", implies paying for it.
        // Let's use 'price' or 'laborCost + materialCost' if price not avail? 
        // The 'Product' interface has laborCost, materialCost, royalties, profit.
        // Let's approximate Price = laborCost + materialCost + royalties + profit (if profit is per unit).
        // Or simpler: let's assume 'products' passed has a 'price' or calculate it.
        // Re-checking Product interface in types.ts -> it has costs and profit.
        // Price = laborCost + materialCost + royalties + profit.

        // Wait, prop passed is `products?: any[]`. I need to cast or calculate.
        const unitPrice = (prod.laborCost || 0) + (prod.materialCost || 0) + (prod.royalties || 0) + (prod.profit || 0);

        setSelectedDiscountProducts(prev => {
            const existing = prev.find(p => p.id === prodId);
            if (existing) {
                return prev.map(p => p.id === prodId ? { ...p, qty: p.qty + 1 } : p);
            }
            return [...prev, { id: prod.id, name: prod.name, price: unitPrice, qty: 1 }];
        });
    };

    const removeProductFromDiscount = (prodId: string) => {
        setSelectedDiscountProducts(prev => prev.filter(p => p.id !== prodId));
    };

    const totalProductDiscount = selectedDiscountProducts.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

    // Effect to update payment amount when discount changes? 
    // Usually, discount is subtracted from "Amount to Pay in Cash/Transfer".
    // Or is it just recorded? 
    // User: "que tambien se pueda elegir en seleccionar productos que el empleado consumio y eso haga un total para realizar el descuento."
    // If I calculate Total Owed = 1000. Employee ate 200. I pay 800 cash + 200 product. 
    // So Payment Amount (Cash) should effectively be reduced, OR we record it as a separate part of the transaction?
    // Let's assume the user enters the TOTAL value they want to settle (e.g. 1000), and we split it? 
    // Or user enters Cash Amount, and we add Discount for a total settlement?

    // Simpler: The "Monto a Pagar" input is the money leaving the wallet. 
    // The "Descuento" is extra modification to the Balance.
    // If I pay 800 and discount 200. New Balance = Old - 800 - 200.
    // Let's treat Discount as a separate deduction.

    const handleConfirmPayment = () => {
        if (!selectedEmployee || !setTransactions || !currentUser) return;

        const effectivePayment = paymentAmount; // Money Transfer
        const discountAmount = totalProductDiscount; // Non-monetary deduction

        // 1. Transaction for Money
        // For BONUS, NO money leaves wallet yet (it just adds to balance debt).
        if (effectivePayment > 0 && modalMode !== 'BONUS') {
            const newTx: WalletTransaction = {
                id: generateUUID(),
                date: new Date().toISOString(),
                time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                amount: effectivePayment,
                type: 'EXPENSE',
                category: modalMode === 'PAYMENT' ? 'SUELDOS' : 'Adelantos',
                description: paymentDescription + (discountAmount > 0 ? ` (+ $${discountAmount} consumo: ${selectedDiscountProducts.map(p => p.name).join(', ')})` : ''),
                createdBy: currentUser.name,
                method: paymentMethod,
                relatedUserId: selectedEmployee.id,
                relatedUser: selectedEmployee.name
            };
            setTransactions(prev => [newTx, ...(prev || [])]);
        }

        // 2. Transaction line for "Consumo Interno" (Optional? Or maybe just reduce balance?)
        // If we want to track it in wallet, it's technically "Income" (Product Sales) matched by "Expense" (Salary)?
        // For now, let's just handle the Payroll Balance Logic.

        const accrual = calculateAccruedSalary(selectedEmployee, records, calendarEvents, absences, sanctions);
        const currentBalance = selectedEmployee.balance || 0;
        let newBalance = currentBalance;
        let newLastPaymentDate = selectedEmployee.lastPaymentDate;

        if (modalMode === 'DISCOUNT') {
            newBalance = currentBalance - effectivePayment - discountAmount;
        } else if (modalMode === 'BONUS') {
            // Money PROMISED (Bonus) -> Increases Balance (increases debt to employee)
            newBalance = currentBalance + effectivePayment;
        } else {
            // PAYMENT
            if (resetCycle) {
                const totalDebt = currentBalance + accrual.accruedAmount;
                newBalance = totalDebt - effectivePayment - discountAmount;
                newLastPaymentDate = new Date().toISOString();

                // AUTOMATICALLY MARK RECORDS AS PAID
                if (setRecords) {
                    const cutoffDate = new Date().toISOString();
                    // Create list of updated records
                    const updatedRecords = records.map(r => {
                        if (r.employeeId === selectedEmployee.id && !r.paid && r.date <= cutoffDate) {
                            return { ...r, paid: true };
                        }
                        return r;
                    });

                    // Filter only the changed ones for DB update
                    const recordsToUpdate = updatedRecords.filter(r => {
                        const original = records.find(or => or.id === r.id);
                        return original && !original.paid && r.paid;
                    });

                    // Batch update DB
                    recordsToUpdate.forEach(r => {
                        supabase.from('overtime_records').update({ data: r }).eq('id', r.id).then();
                    });

                    setRecords(updatedRecords);
                }
            } else {
                newBalance = currentBalance - effectivePayment - discountAmount;
            }
        }

        // --- NEW: Insert Payroll Movement for History Log ---
        // Map mode to DB Type
        let moveType: 'PAGO' | 'DESCUENTO' | 'AJUSTE' = 'PAGO'; // Removed BONO from literal type to avoid conflict
        if (modalMode === 'DISCOUNT') moveType = 'DESCUENTO';
        if (modalMode === 'BONUS') moveType = 'AJUSTE'; // Mapped BONUS to AJUSTE to match types.ts

        const description = (modalMode === 'BONUS' ? 'Bonificación/Bono: ' : '') + paymentDescription + (discountAmount > 0 ? ` (+ $${discountAmount} consumo)` : '');

        // Determine signed amount: PAGO and DESCUENTO are deductions (negative), BONO is addition (positive)
        const rawAmount = effectivePayment + discountAmount;
        const signedAmount = (moveType === 'PAGO' || moveType === 'DESCUENTO') ? -Math.abs(rawAmount) : Math.abs(rawAmount);

        const newMovement: PayrollMovement = {
            id: generateUUID(),
            employee_id: selectedEmployee.id,
            type: moveType as any, // Cast to any to avoid import issues
            amount: signedAmount,
            date: new Date().toISOString().split('T')[0],
            description: description,
            created_by: currentUser.name,
            created_at: new Date().toISOString(),
            status: 'ACTIVE'
        };

        // 1. Save to DB
        supabase.from('payroll_movements').insert([newMovement]).then(({ error }) => {
            if (error) console.error("Error saving payroll movement:", error);
        });

        // 2. Update Local State (if available)
        if (setPayrollMovements) {
            setPayrollMovements(prev => [newMovement, ...prev]);
        }

        setEmployees(prev => prev.map(e => e.id === selectedEmployee.id ? {
            ...e,
            lastPaymentDate: newLastPaymentDate,
            payrollStartDate: resetCycle ? newLastPaymentDate : e.payrollStartDate,
            nextPaymentDate: resetCycle ? '' : e.nextPaymentDate,
            balance: newBalance
        } : e));

        playSound('SUCCESS');
        setPaymentModalOpen(false);
        setSecurityModalOpen(false); // Close security modal
    };

    const handleGenerateReceipt = (emp: Employee, startDate?: string, endDate?: string) => {
        let periodStr = '';
        let startFilter: Date;
        let endFilter: Date;

        if (startDate && endDate) {
            startFilter = new Date(startDate);
            endFilter = new Date(endDate);
            periodStr = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
        } else {
            const now = new Date();
            const monthName = now.toLocaleString('es-AR', { month: 'long' });
            periodStr = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${now.getFullYear()}`;
            startFilter = new Date(now.getFullYear(), now.getMonth(), 1);
            endFilter = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        // 1. Ledger-based Logic (Source of Truth)
        const relevantMovements = (payrollMovements || []).filter(m => {
            // Filter by date range strictly
            return m.employee_id === emp.id &&
                m.status !== 'ANULADO' &&
                m.type !== 'REINICIO' &&
                m.date >= startFilter.toISOString().split('T')[0] &&
                m.date <= endFilter.toISOString().split('T')[0];
        });

        // Filter Sanctions (Deductions)
        const relevantSanctions = (sanctions || []).filter(s => {
            return s.employeeId === emp.id &&
                s.type === 'DESCUENTO' &&
                !s.deletedAt &&
                s.date >= startFilter.toISOString().split('T')[0] &&
                s.date <= endFilter.toISOString().split('T')[0];
        });

        // Calculate Totals from Ledger items
        const ledgerGross = relevantMovements.reduce((sum, m) => sum + m.amount, 0);
        const totalSanctions = relevantSanctions.reduce((sum, s) => sum + (s.amount || 0), 0);

        // Calculate Days Worked based on Movements
        const daysWorked = new Set(relevantMovements.filter(m => m.type === 'ASISTENCIA' || m.type === 'FERIADO').map(m => m.date)).size;

        const netAccrued = ledgerGross - totalSanctions;
        const currentBalance = emp.balance || 0;

        // Construct Detailed Items for PDF
        const pdfDetails: { label: string; amount: number; type: 'INCOME' | 'DEDUCTION' | 'NEUTRAL' }[] = [];

        // Add Movements Breakdown
        relevantMovements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(m => {
            const dateStr = new Date(m.date + 'T00:00:00').toLocaleDateString();
            const label = `${m.type} (${dateStr})`;
            let desc = label;
            if (m.meta?.extraAmount > 0) desc += ` + Extras`;

            pdfDetails.push({
                label: desc,
                amount: m.amount,
                type: 'INCOME'
            });
        });

        // Add Sanctions Breakdown
        relevantSanctions.forEach(s => {
            pdfDetails.push({
                label: `Sanción: ${s.description}`,
                amount: s.amount || 0,
                type: 'DEDUCTION'
            });
        });

        if (currentBalance !== 0) {
            pdfDetails.push({
                label: 'Saldo Acumulado (Total)',
                amount: currentBalance,
                type: currentBalance > 0 ? 'INCOME' : 'DEDUCTION'
            });
        }

        exportPayrollReceiptPDF({
            employeeName: emp.name,
            dni: emp.dni || '',
            period: periodStr,
            baseSalary: emp.monthlySalary || 0,
            discounts: totalSanctions,
            daysWorked: daysWorked,
            accruedAmount: ledgerGross,
            netPay: Math.max(0, netAccrued + currentBalance), // Total Payable
            paymentDate: new Date().toLocaleDateString('es-AR'),
            previousBalance: currentBalance,
            details: pdfDetails
        });
        playSound('CLICK');
    };

    const isPaidRecently = (dateStr?: string) => {
        if (!dateStr) return false;
        const paymentDate = new Date(dateStr);
        const today = new Date();
        return paymentDate.getMonth() === today.getMonth() && paymentDate.getFullYear() === today.getFullYear();
    };

    const handleResetCycle = async () => {
        if (!detailEmployee) return;

        // Use selected date from Modal
        const newStartDate = newCycleStartDate;
        const empId = detailEmployee.id;

        const employee = employees.find(e => e.id === empId);
        if (!employee) return;

        // 1. Calculate final state before reset
        // Use Ledger for final numbers
        const ledgerGross = getLedgerAccrual(employee, payrollMovements || [], new Date(currentYear, currentMonth, 1));
        // Use End of Month as Target Date to include ALL records (even if "future" relative to today)
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const dynamicDetails = calculateAccruedSalary(employee, records, calendarEvents, absences, sanctions, endOfMonth);
        const finalAccrued = ledgerGross - dynamicDetails.sanctionDeduction;
        const currentBalance = finalAccrued + (employee.balance || 0);

        // 2. Create Closing Record (Info Only)
        if (setTransactions) {
            const closingRecord: WalletTransaction = {
                id: generateUUID(),
                type: 'EXPENSE',
                category: 'PAGO_NOMINA',
                time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                amount: 0,
                description: `CONCRETAR NÓMINA: Saldo Cierre $${formatMoney(currentBalance)} (Devengado: $${formatMoney(finalAccrued)}). Nuevo ciclo desde ${newStartDate}.`,
                date: new Date().toISOString(),
                method: 'TRANSFERENCIA',
                relatedUserId: employee.id,
                createdBy: currentUser?.id || 'sys'
            };
            setTransactions(prev => [closingRecord, ...prev]);
        }

        // 3. Create Payroll Movement for Reset (Marker)
        if (setPayrollMovements) {
            const resetMovement: PayrollMovement = {
                id: generateUUID(),
                employee_id: empId,
                type: 'REINICIO',
                amount: 0,
                date: newStartDate,
                description: `Nómina Concretada (Nuevo ciclo: ${newStartDate})`,
                created_by: currentUser?.name || 'Admin',
                created_at: new Date().toISOString()
            };
            setPayrollMovements(prev => [resetMovement, ...prev]);
        }

        // 4. Reset Employee in DB (Local & Remote)
        const targetEmployee = employees.find(e => e.id === empId);
        if (targetEmployee) {
            const { id, ...rest } = targetEmployee;
            const updatedData = {
                ...rest,
                payrollStartDate: newStartDate,
                balance: 0,
                lastPaymentDate: null
            };

            const { error } = await supabase
                .from('employees')
                .update({
                    data: updatedData
                })
                .eq('id', empId);

            if (error) {
                console.error("Error resetting cycle in DB:", error);
                alert("Error al guardar el reinicio de ciclo en la base de datos.");
                return;
            }
        }



        // 5. Mark Records as PAID directly
        if (setRecords) {
            const updatedRecords = records.map(r => {
                if (r.employeeId === empId && !r.paid && r.date < newStartDate) {
                    return { ...r, paid: true };
                }
                return r;
            });

            // Filter only the changed ones for DB update
            const recordsToUpdate = updatedRecords.filter(r => {
                const original = records.find(or => or.id === r.id);
                return original && !original.paid && r.paid;
            });

            // Batch update DB
            recordsToUpdate.forEach(r => {
                supabase.from('overtime_records').update({ data: r }).eq('id', r.id).then();
            });

            setRecords(updatedRecords);
        }

        setEmployees(prev => prev.map(e => e.id === empId ? {
            ...e,
            payrollStartDate: newStartDate,
            balance: 0,
            lastPaymentDate: undefined
        } : e));

        playSound('CLICK');
        setShowConcretarModal(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-2">
                        Pagos y Nómina: {activeTab === 'ACTIVE' ? 'Personal Activo' : 'Historial'}
                        <button
                            onClick={() => setShowTutorial(true)}
                            className="p-1.5 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                            title="Ver Guía de Referencia"
                        >
                            <Info className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Gestión de sueldos, adelantos y bonificaciones.</p>

                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
                    <div className="bg-white dark:bg-sushi-dark px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 flex items-center gap-3 shadow-sm">
                        <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs uppercase font-bold text-gray-500 dark:text-sushi-muted">Total Devengado</p>
                            <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                                {formatMoney(totalAccrued)}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-sushi-dark px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 flex items-center gap-3 shadow-sm">
                        <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs uppercase font-bold text-gray-500 dark:text-sushi-muted">Adelantos / Saldos</p>
                            <p className={`text-lg font-mono font-bold ${activeEmployees.reduce((acc, curr) => acc + (curr.balance || 0), 0) < 0 ? 'text-red-500' : 'text-green-500'
                                }`}>
                                {formatMoney(activeEmployees.reduce((acc, curr) => acc + (curr.balance || 0), 0))}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-sushi-dark px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 flex items-center gap-3 shadow-sm">
                        <div className="p-2 bg-sushi-gold/20 text-yellow-700 dark:text-sushi-gold rounded-full">
                            <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs uppercase font-bold text-gray-500 dark:text-sushi-muted">Total Nómina (Est.)</p>
                            <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                                {formatMoney(totalEstimated)}
                            </p>
                        </div>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg self-center">
                        <button
                            onClick={() => { setActiveTab('ACTIVE'); playSound('CLICK'); }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'ACTIVE' ? 'bg-sushi-gold text-sushi-black' : 'text-gray-500 dark:text-sushi-muted'}`}
                        >
                            Activos
                        </button>
                        <button
                            onClick={() => { setActiveTab('HISTORY'); playSound('CLICK'); }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-sushi-gold text-sushi-black' : 'text-gray-500 dark:text-sushi-muted'}`}
                        >
                            Historial Pagos
                        </button>
                    </div>
                </div>
            </div >

            {activeTab === 'ACTIVE' ? (
                <div className="bg-white dark:bg-sushi-dark rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-sm text-gray-400 border-b border-gray-200 dark:border-white/5 uppercase bg-gray-50/50 dark:bg-white/5">
                                    <th
                                        className="p-4 font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors select-none"
                                        onClick={() => handleSort('NAME')}
                                    >
                                        Empleado {sortOrder === 'NAME_ASC' ? '↑' : sortOrder === 'NAME_DESC' ? '↓' : ''}
                                    </th>
                                    <th
                                        className="p-4 font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors select-none"
                                        onClick={() => handleSort('BALANCE')}
                                    >
                                        Billetera / Saldo {sortOrder === 'BALANCE_ASC' ? '↑' : sortOrder === 'BALANCE_DESC' ? '↓' : ''}
                                    </th>
                                    <th
                                        className="p-4 font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors select-none"
                                        onClick={() => handleSort('SALARY')}
                                    >
                                        Sueldo Base {sortOrder === 'SALARY_ASC' ? '↑' : sortOrder === 'SALARY_DESC' ? '↓' : ''}
                                    </th>
                                    <th className="p-4 text-center font-bold">Acciones Rápidas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...activeEmployees].sort((a, b) => { // Sort Copy
                                    if (sortOrder === 'NAME_ASC') return a.name.localeCompare(b.name);
                                    if (sortOrder === 'NAME_DESC') return b.name.localeCompare(a.name);

                                    const salaryA = parseSalaryToNumber(a.monthlySalary);
                                    const salaryB = parseSalaryToNumber(b.monthlySalary);
                                    if (sortOrder === 'SALARY_ASC') return salaryA - salaryB;
                                    if (sortOrder === 'SALARY_DESC') return salaryB - salaryA;

                                    // Calc Balance for Sort
                                    const getBalance = (emp: Employee) => {
                                        const accrual = calculateAccruedSalary(emp, records, calendarEvents, absences, sanctions);
                                        const ledger = getLedgerAccrual(emp, payrollMovements || [], new Date(currentYear, currentMonth, 1));
                                        return (ledger - accrual.sanctionDeduction) + (emp.balance || 0);
                                    };
                                    const balanceA = getBalance(a);
                                    const balanceB = getBalance(b);

                                    if (sortOrder === 'BALANCE_ASC') return balanceA - balanceB;
                                    if (sortOrder === 'BALANCE_DESC') return balanceB - balanceA;

                                    return 0;
                                }).map((emp) => {
                                    // Ledger is Source of Truth for Amount
                                    const netAccrued = getLedgerAccrual(emp, payrollMovements || []);
                                    // Use dynamic calculation for Progress Bar only
                                    const dynamicStats = calculateAccruedSalary(emp, records, calendarEvents, absences, sanctions);
                                    const totalToPay = (netAccrued + (emp.balance || 0));

                                    // Helper for initials
                                    const getNameInitials = (name: string) => {
                                        const parts = name.trim().split(' ');
                                        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                                        return name.slice(0, 2).toUpperCase();
                                    };

                                    // Wallet Logic: Total = Real-time Accrued (Predicted) + Balance (Historical)
                                    // Fix: Use dynamicStats.accruedAmount instead of netAccrued (Ledger) for live progress
                                    const walletValue = (dynamicStats.accruedAmount + (emp.balance || 0));
                                    // Progress: (CurrentWallet / MonthlySalary) * 100
                                    const walletProgress = Math.max(0, Math.min((walletValue / (emp.monthlySalary || 1)) * 100, 100));

                                    return (
                                        <tr key={emp.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-sushi-200 dark:bg-sushi-400 flex items-center justify-center text-sushi-600 dark:text-sushi-900 font-bold border-2 border-white dark:border-sushi-400 shadow-sm overflow-hidden">
                                                        {emp.photoUrl ? (
                                                            <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span>{getNameInitials(emp.name)}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white">{emp.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{emp.position}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div
                                                    className="flex flex-col gap-1 cursor-pointer group"
                                                    onClick={() => handleViewHistory(emp)}
                                                    title="Ver Historial de Saldo"
                                                >
                                                    <span className={`font-mono font-bold group-hover:underline ${walletValue < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                                        {formatMoney(walletValue)}
                                                    </span>
                                                    {/* Wallet Progress Bar */}
                                                    <div className="w-24 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${walletValue < 0 ? 'bg-red-500' : 'bg-sushi-500'
                                                                }`}
                                                            style={{ width: `${walletProgress}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                        {dynamicStats.daysWorked} días regist.
                                                    </span>
                                                </div>
                                            </td>
                                            {/* Removed Saldo and Total Columns */}
                                            <td className="p-4 font-mono text-gray-500 dark:text-gray-300">
                                                {formatMoney(emp.monthlySalary || 0)}
                                            </td>
                                            {/* Removed Method Column Body */}
                                            <td className="p-4 text-center">

                                                <div className="flex justify-center gap-2 items-center">
                                                    {/* Payment Date Picker */}
                                                    <div className="relative group">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                                            <Calendar className={`w-4 h-4 ${emp.nextPaymentDate ? 'text-blue-500' : 'text-gray-400'}`} />
                                                        </div>
                                                        {/* Date Input Overlay */}
                                                        <input
                                                            type="date"
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            value={emp.nextPaymentDate || ''}
                                                            onChange={(e) => handleUpdatePaymentDate(emp.id, e.target.value)}
                                                        />
                                                        {/* Tooltip date */}
                                                        {emp.nextPaymentDate && (
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                Pago: {(() => {
                                                                    const [y, m, d] = emp.nextPaymentDate.split('-');
                                                                    return `${d}/${m}/${y}`;
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            setSelectedEmployee(emp);
                                                            setPaymentAmount(0); // Reset amount first
                                                            setResetCycle(false); // Default OFF per request
                                                            setPaymentDescription(`Pago Haberes ${new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' })}`);
                                                            setSelectedDiscountProducts([]);
                                                            setShowProductSelector(false);
                                                            setModalMode('PAYMENT'); // Set mode BEFORE opening logic
                                                            setPaymentModalOpen(true);
                                                            playSound('CLICK');
                                                        }}
                                                        className="p-2 bg-sushi-gold text-sushi-black rounded-lg hover:bg-sushi-goldhover transition-colors font-bold text-xs"
                                                    >
                                                        ABONAR
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedEmployee(emp);
                                                            setPaymentAmount(0);
                                                            setResetCycle(false);
                                                            setDiscountReason('ADELANTO');
                                                            setPaymentDescription('Descuento / Adelanto');
                                                            setSelectedDiscountProducts([]);
                                                            setShowProductSelector(false);
                                                            setModalMode('DISCOUNT');
                                                            setPaymentModalOpen(true);
                                                            playSound('CLICK');
                                                        }}
                                                        className="p-2 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors font-bold text-xs"
                                                    >
                                                        DESCONTAR
                                                    </button>

                                                    {/* Export Receipt Button */}
                                                    <button
                                                        onClick={() => {
                                                            setEmployeeToExport(emp);
                                                            setExportModalOpen(true);
                                                        }}
                                                        className="p-2 bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                                        title="Exportar Recibo"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div >
                </div >
            ) : (
                <div className="bg-white dark:bg-sushi-dark rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-lg p-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <HistoryIcon className="w-5 h-5 text-sushi-gold" /> Historial de Pagos Realizados
                    </h3>
                    <div className="space-y-2">
                        {transactions
                            .filter(t => t.type === 'EXPENSE' && (t.category === 'Sueldos' || t.category === 'Personal' || t.category === 'Adelantos'))
                            .length === 0 ? (
                            <p className="text-gray-400 italic text-sm text-center py-8">No hay registros históricos de pagos de sueldo.</p>
                        ) : (
                            transactions
                                .filter(t => t.type === 'EXPENSE' && (t.category === 'Sueldos' || t.category === 'Personal' || t.category === 'Adelantos'))
                                .map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-white/5">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">{t.description}</p>
                                            <div className="flex gap-2 text-xs text-gray-500 dark:text-sushi-muted">
                                                <span>{new Date(t.date).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>{t.time}</span>
                                                <span>•</span>
                                                <span className={`uppercase ${t.category === 'Adelantos' ? 'text-red-400 font-bold' : ''}`}>{t.category}</span>
                                                <span>•</span>
                                                <span className="uppercase">{t.method}</span>
                                            </div>
                                        </div>
                                        <p className="font-mono font-bold text-red-500 dark:text-red-400">-{formatMoney(t.amount)}</p>
                                    </div>
                                ))
                        )
                        }
                    </div>
                </div>
            )
            }

            {/* Payment Modal */}
            {
                paymentModalOpen && selectedEmployee && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-sushi-dark w-full max-w-md rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in">
                            <div className="text-center mb-6">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl ${modalMode === 'DISCOUNT' ? 'bg-red-500 text-white' : 'bg-sushi-gold text-sushi-black'}`}>
                                    $
                                </div>
                                <h3 className="text-xl font-serif text-gray-900 dark:text-white">
                                    {modalMode === 'PAYMENT' ? 'Registrar Pago' : modalMode === 'BONUS' ? 'Registrar Bonificación' : 'Registrar Descuento'}
                                </h3>
                                <button
                                    onClick={() => setPaymentModalOpen(false)}
                                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                                >
                                    <span className="text-2xl">&times;</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Discount Reason Selector (Only in DISCOUNT mode) */}
                                {/* Discount Type Selector (ADELANTO vs DESCUENTO) */}
                                {modalMode === 'DISCOUNT' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">
                                                Tipo de Movimiento
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDiscountReason('ADELANTO');
                                                        setPaymentDescription('Adelanto de Sueldo');
                                                        setShowProductSelector(false);
                                                    }}
                                                    className={`flex-1 px-3 py-3 rounded-lg text-sm font-bold border transition-colors ${discountReason === 'ADELANTO'
                                                        ? 'bg-sushi-gold text-sushi-black border-sushi-gold'
                                                        : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-500 hover:border-sushi-gold/50'
                                                        }`}
                                                >
                                                    ADELANTO
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDiscountReason('OTRO'); // Default for 'Descuento' category
                                                        setPaymentDescription('Descuento Varios');
                                                        setShowProductSelector(false);
                                                    }}
                                                    className={`flex-1 px-3 py-3 rounded-lg text-sm font-bold border transition-colors ${discountReason !== 'ADELANTO'
                                                        ? 'bg-red-500 text-white border-red-500'
                                                        : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-500 hover:border-red-500/50'
                                                        }`}
                                                >
                                                    DESCUENTO
                                                </button>
                                            </div>
                                        </div>

                                        {/* Consumption Checkbox (Only if DESCUENTO is selected) */}
                                        {discountReason !== 'ADELANTO' && (
                                            <div className="flex items-center gap-2 p-3">
                                                <input
                                                    id="chk-consumo"
                                                    type="checkbox"
                                                    checked={discountReason === 'CONSUMO'}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setDiscountReason('CONSUMO');
                                                            setPaymentDescription('Descuento por Consumo');
                                                            setShowProductSelector(true);
                                                        } else {
                                                            setDiscountReason('OTRO');
                                                            setPaymentDescription('Descuento Varios');
                                                            setShowProductSelector(false);
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-sushi-gold focus:ring-sushi-gold"
                                                />
                                                <label htmlFor="chk-consumo" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                                                    Consumo de Productos
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">
                                        Monto ({modalMode === 'PAYMENT' ? 'a Abonar' : 'a Descontar'})
                                    </label>
                                    <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 text-center relative">
                                        <input
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                            className="text-3xl font-mono font-bold text-gray-900 dark:text-white bg-transparent text-center w-full outline-none border-b border-gray-300 dark:border-white/10 focus:border-sushi-gold"
                                        />

                                        {modalMode === 'PAYMENT' && (
                                            <>
                                                <div className="flex items-center justify-center mt-3 gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="payFullAmount"
                                                        className="w-4 h-4 text-sushi-gold rounded border-gray-300 focus:ring-sushi-gold cursor-pointer"
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                const ledgerGross = getLedgerAccrual(selectedEmployee, payrollMovements || [], new Date(currentYear, currentMonth, 1));
                                                                const dynamicStats = calculateAccruedSalary(selectedEmployee, records, calendarEvents, absences, sanctions);
                                                                const totalPending = Math.max(0, (ledgerGross - dynamicStats.sanctionDeduction) + (selectedEmployee.balance || 0));
                                                                setPaymentAmount(totalPending);
                                                            } else {
                                                                setPaymentAmount(0);
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor="payFullAmount" className="text-xs font-bold text-sushi-gold cursor-pointer select-none">
                                                        ABONAR TODO
                                                    </label>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-2">
                                                    Total Pendiente: {formatMoney(Math.max(0, (getLedgerAccrual(selectedEmployee, payrollMovements || [], new Date(currentYear, currentMonth, 1)) - calculateAccruedSalary(selectedEmployee, records, calendarEvents, absences, sanctions).sanctionDeduction) + (selectedEmployee.balance || 0)))}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs uppercase text-gray-500 mb-1 block">Descripción Transacción</label>
                                    <input
                                        type="text"
                                        value={paymentDescription}
                                        onChange={e => setPaymentDescription(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                        placeholder="Detalle..."
                                    />
                                </div>

                                {/* Product Discount Section */}
                                {/* Product Discount Section */}
                                {(modalMode === 'PAYMENT' || (modalMode === 'DISCOUNT' && showProductSelector)) && (
                                    <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                                        {modalMode === 'PAYMENT' && (
                                            <button
                                                type="button"
                                                onClick={() => setShowProductSelector(!showProductSelector)}
                                                className="text-xs font-bold text-red-500 flex items-center gap-1 hover:text-red-400 mb-2"
                                            >
                                                <HandCoins className="w-4 h-4" />
                                                {showProductSelector ? 'Ocultar Productos' : 'Descontar Consumo / Productos'}
                                            </button>
                                        )}

                                        {showProductSelector && (
                                            <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-3 border border-gray-200 dark:border-white/5">
                                                <div className="mb-3">
                                                    <select
                                                        className="w-full p-2 rounded text-sm bg-white dark:bg-black border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                addProductToDiscount(e.target.value);
                                                                e.target.value = ''; // Reset select
                                                            }
                                                        }}
                                                    >
                                                        <option value="">+ Agregar Producto al Descuento</option>
                                                        {(products || []).map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name} (${((p.laborCost || 0) + (p.materialCost || 0) + (p.royalties || 0) + (p.profit || 0)).toLocaleString()})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {selectedDiscountProducts.length > 0 && (
                                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                                        {selectedDiscountProducts.map(p => (
                                                            <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-black rounded border border-gray-100 dark:border-white/5">
                                                                <div>
                                                                    <span className="font-bold text-gray-900 dark:text-white">{p.name}</span>
                                                                    <span className="text-gray-500">x{p.qty}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-red-500 font-mono">-${(p.price * p.qty).toLocaleString()}</span>
                                                                    <button onClick={() => removeProductFromDiscount(p.id)} className="text-gray-400 hover:text-red-500 px-1">x</button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="flex justify-between items-start pt-2 border-t border-gray-200 dark:border-white/10 font-bold text-xs">
                                                            <span className="text-gray-500">Total Descuento:</span>
                                                            <span className="text-red-500">-${totalProductDiscount.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {modalMode === 'PAYMENT' && (
                                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
                                        <input
                                            id="resetCycleCheck"
                                            type="checkbox"
                                            checked={resetCycle}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setConfirmModal({
                                                        isOpen: true,
                                                        title: '¿REINICIAR CICLO DE PAGO?',
                                                        message: "Esto pondrá el 'Devengado' a 0 y marcará el inicio de un nuevo periodo desde hoy. Solo usa esto si estás pagando la totalidad del periodo.",
                                                        type: 'warning',
                                                        confirmText: 'SÍ, REINICIAR',
                                                        onConfirm: () => setResetCycle(true)
                                                    });
                                                } else {
                                                    setResetCycle(false);
                                                }
                                            }}
                                            className="mt-1"
                                        />
                                        <label htmlFor="resetCycleCheck" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                                            <span className="font-bold block">Reiniciar Ciclo / Días Trabajados</span>
                                            <span className="text-xs opacity-75">
                                                Si marcas esto, el devengado volverá a 0 a partir de hoy. Úsalo al cerrar la semana, quincena o mes.
                                                Si NO lo marcas, el pago se tomará como un pago parcial y los días seguirán contando.
                                            </span>
                                        </label>
                                    </div>
                                )}

                                <div>
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

                                {modalMode === 'PAYMENT' && (
                                    <div className="text-right text-xs text-gray-500 mt-2">
                                        Total Final: <span className="font-bold text-gray-900 dark:text-white">
                                            {formatMoney(Math.max(0, paymentAmount - totalProductDiscount))}
                                        </span>
                                    </div>
                                )}

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setPaymentModalOpen(false)}
                                        className="flex-1 px-4 py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => setSecurityModalOpen(true)}
                                        disabled={modalMode === 'PAYMENT' && (paymentAmount <= 0 && totalProductDiscount <= 0)} // Disable if trying to pay 0
                                        className={`flex-1 px-4 py-3 bg-sushi-gold text-sushi-black font-bold rounded-xl hover:shadow-lg hover:shadow-sushi-gold/20 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${modalMode === 'DISCOUNT' ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' : 'bg-sushi-gold hover:bg-sushi-goldhover text-sushi-black shadow-sushi-gold/20'}`}
                                    >
                                        Confirmar {modalMode === 'DISCOUNT' ? 'Descuento' : 'Pago'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Detailed Employee Modal */}
            {
                detailModalOpen && detailEmployee && (() => {
                    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
                    const dynamicStats = calculateAccruedSalary(detailEmployee, records, calendarEvents, absences, sanctions, endOfMonth);
                    const ledgerGross = getLedgerAccrual(detailEmployee, payrollMovements || [], new Date(currentYear, currentMonth, 1));

                    // Merged List Logic
                    const ledgerMoves = (payrollMovements || []).filter(m =>
                        m.employee_id === detailEmployee.id &&
                        // m.status !== 'ANULADO' && // Allow ANULADO (Voided) records to show
                        m.type !== 'REINICIO' &&
                        (!detailEmployee.payrollStartDate || m.date >= detailEmployee.payrollStartDate)
                    );

                    const pendingDynamic = dynamicStats.breakdown.filter(d => {
                        const dDate = d.date.split('T')[0];
                        // Map dynamic type to ledger type for comparison
                        let targetType = d.type as string;
                        if (d.type === 'WORKED') targetType = 'ASISTENCIA';
                        if (d.type === 'HOLIDAY') targetType = 'ASISTENCIA';
                        if (d.type === 'SANCTION') targetType = 'DESCUENTO';

                        // Check if ALREADY in ledger with the MAPPED type
                        return !ledgerMoves.some(l => l.date.split('T')[0] === dDate && l.type === targetType);
                    });

                    const displayedMovements = [
                        ...ledgerMoves,
                        ...pendingDynamic.map(d => {
                            let displayType = d.type as string;
                            if (d.type === 'WORKED' || d.type === 'HOLIDAY') displayType = 'ASISTENCIA';
                            if (d.type === 'SANCTION') displayType = 'DESCUENTO';

                            return {
                                id: `dyn-${d.date}-${d.type}`,
                                date: d.date,
                                type: displayType,
                                description: d.description, // e.g. "Jornada trabajada"
                                amount: d.amount,
                                status: 'PENDIENTE',
                                employee_id: detailEmployee.id,
                                created_at: new Date().toISOString(),
                                created_by: 'SISTEMA',
                                meta: d.meta
                            } as any;
                        })
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    const totalCalculated = dynamicStats.accruedAmount + (detailEmployee.balance || 0);

                    return (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                            <div className="bg-white dark:bg-sushi-dark w-full max-w-2xl rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                                            {detailEmployee.photoUrl ? <img src={detailEmployee.photoUrl} className="w-full h-full object-cover" /> : null}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-serif text-gray-900 dark:text-white">{detailEmployee.name}</h3>
                                            <p className="text-sushi-gold font-bold text-sm uppercase">{detailEmployee.position}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setDetailModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
                                        <span className="text-2xl">&times;</span>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 text-center flex flex-col justify-between">
                                            <div>
                                                <p className="text-xs uppercase text-gray-500 mb-1">Cierre Ciclo</p>
                                                <p className="font-bold text-gray-900 dark:text-white mb-2">
                                                    {detailEmployee.payrollStartDate ? new Date(detailEmployee.payrollStartDate).toLocaleDateString() : 'Inicio'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setNewCycleStartDate(new Date().toISOString().split('T')[0]);
                                                    setShowConcretarModal(true);
                                                }}
                                                className="text-xs bg-sushi-gold text-sushi-black px-2 py-1.5 rounded-lg font-bold hover:bg-sushi-gold/90 transition-colors w-full"
                                            >
                                                Concretar Nómina
                                            </button>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                            <p className="text-xs uppercase text-gray-500 mb-1">Sueldo Base</p>
                                            <p className="font-bold text-gray-900 dark:text-white">{formatMoney(detailEmployee.monthlySalary)}</p>
                                        </div>
                                        <div className="p-4 bg-sushi-gold/10 rounded-xl border border-sushi-gold/20">
                                            <p className="text-xs uppercase text-sushi-gold/80 mb-1">Devengado (Proy.)</p>
                                            <p className="font-bold text-sushi-gold">
                                                {formatMoney(dynamicStats.accruedAmount)}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                            <p className="text-xs uppercase text-blue-500 mb-1">Saldo Total</p>
                                            <p className="font-bold text-blue-600 dark:text-blue-400">
                                                {formatMoney(totalCalculated)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 38.5 Detailed Ledger of Pending Movements (Attendance & Sanctions) */}
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-gray-400" />
                                            Detalle de Movimientos Pendientes
                                        </h4>
                                        <div className="bg-white dark:bg-black/20 rounded-lg border border-gray-100 dark:border-white/5 overflow-hidden">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                                                    <tr>
                                                        <th className="p-3 text-gray-500 font-bold uppercase">Fecha</th>
                                                        <th className="p-3 text-gray-500 font-bold uppercase">Concepto</th>
                                                        <th className="p-3 text-gray-500 font-bold uppercase text-right">Monto</th>
                                                        <th className="p-3 text-gray-500 font-bold uppercase text-center">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                    {displayedMovements.map(m => {
                                                        const meta = m.meta || {};
                                                        const isHoliday = meta.isHoliday || false;
                                                        const hasExtras = meta.extraAmount > 0;
                                                        const isPending = m.status === 'PENDIENTE' || !m.status;
                                                        const isVoid = m.status === 'ANULADO';

                                                        return (
                                                            <tr key={m.id} className={`hover:bg-gray-50 dark:hover:bg-white/5 ${isVoid ? 'opacity-60 grayscale' : ''}`}>
                                                                <td className={`p-3 text-gray-900 dark:text-white ${isVoid ? 'line-through decoration-gray-400' : ''}`}>{new Date(m.date + 'T00:00:00').toLocaleDateString()}</td>
                                                                <td className="p-3">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-gray-700 dark:text-gray-300">
                                                                            {m.type} {isHoliday ? ' (FERIADO)' : ''}
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-400">{m.description}</span>
                                                                        {meta.baseAmount !== undefined && (
                                                                            <div className="flex gap-2 text-[9px] text-gray-500 mt-0.5">
                                                                                <span>Base: ${formatMoney(Math.round(meta.baseAmount))}</span>
                                                                                {hasExtras && (
                                                                                    <span className="text-orange-600 font-bold">
                                                                                        Extras (+{(meta.extraMinutes / 60).toFixed(1)}h): ${formatMoney(Math.round(meta.extraAmount))}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-right font-mono text-gray-900 dark:text-white">
                                                                    {formatMoney(m.amount)}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-900/30">
                                                                        {isPending ? 'PENDIENTE' : m.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                    }
                                                    {displayedMovements.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="p-6 text-center text-gray-400 italic">No hay movimientos pendientes para este periodo.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Recent Transactions (Simulated or Real if linked) */}
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                            <HistoryIcon className="w-4 h-4 text-gray-400" />
                                            Últimos Movimientos
                                        </h4>
                                        {transactions && transactions.length > 0 ? (
                                            <div className="space-y-2">
                                                {transactions
                                                    .filter(t => t.description.includes(detailEmployee.name)) // Simple filter by name
                                                    .slice(0, 5)
                                                    .map(t => (
                                                        <div key={t.id} className="flex justify-between items-center p-3 bg-white dark:bg-black/20 rounded-lg border border-gray-100 dark:border-white/5 text-sm">
                                                            <div>
                                                                <p className="font-bold text-gray-900 dark:text-white">{t.category}</p>
                                                                <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()} - {t.description}</p>
                                                            </div>
                                                            <span className="font-mono font-bold text-red-500">-{formatMoney(t.amount)}</span>
                                                        </div>
                                                    ))}
                                                {transactions.filter(t => t.description.includes(detailEmployee.name)).length === 0 && (
                                                    <p className="text-sm text-gray-400 italic">No hay transacciones recientes registradas con este nombre.</p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400">No hay historial disponible.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/10 flex justify-end">
                                    <button
                                        onClick={() => setDetailModalOpen(false)}
                                        className="px-6 py-2 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-white/20"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div >
                    );
                })()
            }

            {/* Concretar Nómina Modal */}
            {
                showConcretarModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                        <div className="bg-white dark:bg-black w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-scale-in">
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Concretar Nómina</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Al concretar, se guardará el estado actual y se iniciará un nuevo ciclo de cálculo.
                                    Las asistencias anteriores a la fecha seleccionada dejarán de contar para el "Devengado" activo.
                                </p>

                                <div className="mb-6">
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2">
                                        Fecha Inicio Nuevo Ciclo
                                    </label>
                                    <input
                                        type="date"
                                        value={newCycleStartDate}
                                        onChange={(e) => setNewCycleStartDate(e.target.value)}
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                    />
                                    <p className="text-xs text-gray-400 mt-2">
                                        Generalmente "Hoy" o el "1ro del Mes".
                                    </p>
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setShowConcretarModal(false)}
                                        className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleResetCycle}
                                        className="px-6 py-2 bg-sushi-gold text-sushi-black font-bold rounded-lg hover:bg-sushi-gold/90 shadow-lg shadow-sushi-gold/20"
                                    >
                                        Concretar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Export Receipt Modal */}
            {
                exportModalOpen && employeeToExport && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
                        <div className="bg-white dark:bg-black w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-scale-in">
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-sushi-gold" />
                                    Generar Recibo de Nómina
                                </h3>
                                <p className="text-sm text-gray-500 mb-6 font-bold">
                                    Empleado: <span className="text-gray-900 dark:text-white">{employeeToExport.name}</span>
                                </p>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Desde</label>
                                        <input
                                            type="date"
                                            value={exportStartDate}
                                            onChange={(e) => setExportStartDate(e.target.value)}
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Hasta</label>
                                        <input
                                            type="date"
                                            value={exportEndDate}
                                            onChange={(e) => setExportEndDate(e.target.value)}
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:border-sushi-gold"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setExportModalOpen(false)}
                                        className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleGenerateReceipt(employeeToExport, exportStartDate, exportEndDate);
                                            setExportModalOpen(false);
                                        }}
                                        className="px-6 py-2 bg-sushi-gold text-sushi-black font-bold rounded-lg hover:bg-sushi-gold/90 shadow-lg shadow-sushi-gold/20 flex items-center gap-2"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Descargar PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {historyModalOpen && historyEmployee && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
                    <div className="bg-white dark:bg-black w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-sushi-500" />
                                    Historial de Saldo
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {historyEmployee.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setHistoryModalOpen(false)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-0 overflow-y-auto flex-1">
                            {(() => {
                                // Use End of Month to capture ALL records (including future ones)
                                // This ensures that records for 13/12 appear even if today is 11/12 (Simulation Mode)
                                const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
                                const accrualData = calculateAccruedSalary(historyEmployee, records, calendarEvents, absences, sanctions, endOfMonth);

                                // 1. Breakdown of Current Month (Accrued)
                                const breakdownMoves = (accrualData.breakdown || []).map(item => ({
                                    id: `breakdown-${item.date}-${item.type}`,
                                    date: item.date,
                                    type: item.type,
                                    description: item.description,
                                    amount: item.amount,
                                    time: item.time, // Pass through
                                    meta: item.meta, // Pass through
                                    created_at: undefined, // Dynamic items don't have DB creation time
                                    isBreakdown: true
                                }));

                                // 2. Ledger Movements (History)
                                const ledgerMoves = payrollMovements
                                    .filter(m => m.employee_id === historyEmployee.id)
                                    .filter(m => {
                                        // DEDUPLICATION:
                                        // If this movement is already projected in "breakdownMoves" (Calculated Pending),
                                        // we should not show it again here, as that causes visual double counting
                                        // and forces a confusing "REINICIO" adjustment.
                                        // We assume "breakdownMoves" (Dynamic) is the preferred detailed view for current period.
                                        const isDuplicateInfo = breakdownMoves.some(b => {
                                            const bDate = b.date.split('T')[0];
                                            const mDate = m.date.split('T')[0];
                                            if (bDate !== mDate) return false;

                                            // Map b.type to Ledger Type for comparison
                                            let targetType = b.type as string;
                                            if (b.type === 'WORKED') targetType = 'ASISTENCIA';
                                            if (b.type === 'HOLIDAY') targetType = 'ASISTENCIA'; // Generally stored as ASISTENCIA + meta.isHoliday
                                            if (b.type === 'SANCTION') targetType = 'DESCUENTO';

                                            // Check strict equality of mapped type
                                            // We use loose comparison for amount to handle float diffs
                                            return targetType === m.type && Math.abs(b.amount - m.amount) < 1;
                                        });
                                        return !isDuplicateInfo;
                                    })
                                    .map(item => {
                                        let timeStr = '00:00';
                                        if (item.meta && item.meta.checkIn) {
                                            timeStr = item.meta.checkIn;
                                        } else if (item.created_at) {
                                            const d = new Date(item.created_at);
                                            if (!isNaN(d.getTime())) {
                                                timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            }
                                        }

                                        return {
                                            id: item.id,
                                            date: item.date,
                                            type: item.type,
                                            description: item.description,
                                            amount: item.amount,
                                            status: item.status, // Pass status for rendering (e.g. ANULADO)
                                            time: timeStr,
                                            created_at: item.created_at, // Pass creation date for display
                                            meta: { createdBy: item.created_by, origin: 'LEDGER', ...item.meta },
                                            isBreakdown: false
                                        };
                                    });

                                // 3. Calculate "Initial Balance" (Ghost Row)
                                // Standard Logic: Balance = Initial + Sum(Movements)
                                // So: Initial = Balance - Sum(Movements)
                                // Note: We only care about matching the "Histórico (Ledger)" card.
                                const currentLedgerSum = ledgerMoves.reduce((sum, m) => sum + m.amount, 0);
                                const expectedLedgerBalance = historyEmployee.balance || 0;
                                const initialDiff = expectedLedgerBalance - currentLedgerSum;

                                if (Math.abs(initialDiff) > 0.01) {
                                    ledgerMoves.push({
                                        id: 'initial-balance-ghost',
                                        date: '---', // Sort at bottom
                                        type: 'REINICIO',
                                        description: 'Saldo Inicial / Arrastre anterior',
                                        amount: initialDiff,
                                        time: '',
                                        status: 'ACTIVE',
                                        created_at: '', // Ghost row
                                        meta: { origin: 'SYSTEM_CALCULATION' },
                                        isBreakdown: false
                                    });
                                }

                                const allMovements = [...breakdownMoves, ...ledgerMoves].sort((a, b) => {
                                    if (a.date === '---') return 1;
                                    if (b.date === '---') return -1;
                                    // STRICT AUDIT SORTING: Use created_at if available (Ledger), else date (Dynamic)
                                    // This puts the most RECENTLY CREATED items at the top, regardless of their effective date.
                                    const timeA = (a as any).created_at ? new Date((a as any).created_at).getTime() : new Date(a.date).getTime();
                                    const timeB = (b as any).created_at ? new Date((b as any).created_at).getTime() : new Date(b.date).getTime();
                                    return timeB - timeA;
                                });

                                const grandTotal = allMovements.reduce((sum, m) => sum + m.amount, 0);

                                return (
                                    <>
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-3 gap-4 p-6 bg-gray-100/50 dark:bg-white/5">
                                            <div className="p-4 rounded-xl bg-gray-900 dark:bg-white/10 border border-gray-800 dark:border-white/10 shadow-sm">
                                                <p className="text-xs uppercase text-gray-400 font-bold mb-1">Acumulado Mes</p>
                                                <p className="text-lg font-mono font-bold text-white">
                                                    {formatMoney(accrualData.accruedAmount)}
                                                </p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-white/10 shadow-sm">
                                                <p className="text-xs uppercase text-gray-500 font-bold mb-1">Histórico (Ledger)</p>
                                                <p className={`text-lg font-mono font-bold ${historyEmployee.balance && historyEmployee.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                                    {formatMoney(historyEmployee.balance || 0)}
                                                </p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-sushi-500 text-white shadow-lg shadow-sushi-500/20">
                                                <p className="text-xs uppercase text-white/80 font-bold mb-1">Saldo Total</p>
                                                <p className="text-lg font-mono font-bold">
                                                    {formatMoney(grandTotal)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Movements Table */}
                                        <div className="p-6">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <List className="w-4 h-4" />
                                                Movimientos Registrados (Desglose Completo)
                                            </h4>
                                            <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                                                        <tr>
                                                            <th className="p-3 text-left font-bold text-gray-500">Fecha / Hora</th>
                                                            <th className="p-3 text-left font-bold text-gray-500">Tipo</th>
                                                            <th className="p-3 text-left font-bold text-gray-500">Nota (Click + Info)</th>
                                                            <th className="p-3 text-right font-bold text-gray-500">Monto</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                        {/* TOTAL HEADER ROW */}
                                                        <tr className="bg-gray-900 border-b-2 border-gray-800 font-bold">
                                                            <td colSpan={3} className="p-3 text-right text-white uppercase text-xs">
                                                                Saldo Total (Calculado):
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-white text-lg">
                                                                {formatMoney(grandTotal)}
                                                            </td>
                                                        </tr>

                                                        {allMovements.map((move) => (
                                                            <tr
                                                                key={move.id}
                                                                className={`hover:bg-gray-50/50 dark:hover:bg-white/5 group transition-colors cursor-pointer border-b border-gray-50 dark:border-white/5 ${(move as any).status === 'ANULADO' ? 'opacity-60 grayscale' : ''}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Ensure clean event
                                                                    setSelectedMovement(move);
                                                                }}
                                                            >
                                                                <td className="p-3 whitespace-nowrap">
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-gray-900 dark:text-white font-medium ${(move as any).status === 'ANULADO' ? 'line-through decoration-gray-400' : ''}`}>
                                                                            {/* Display Creation Date if available (Ledger), else Effective Date (Dynamic) */}
                                                                            {move.date === '---' ? 'Inicio' :
                                                                                ((move as any).created_at ? new Date((move as any).created_at).toLocaleDateString() : new Date(move.date).toLocaleDateString())
                                                                            }
                                                                        </span>
                                                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                            <Clock className="w-3 h-3" />
                                                                            {move.time || '00:00'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${['WORKED', 'BONO', 'HOLIDAY', 'ABSENCE'].includes(move.type) ? 'bg-green-100 text-green-700 border-green-200' :
                                                                        ['SANCTION', 'DESCUENTO', 'PAGO', 'ADELANTO'].includes(move.type) ? 'bg-red-100 text-red-700 border-red-200' :
                                                                            'bg-gray-100 text-gray-700 border-gray-200'
                                                                        }`}>
                                                                        {move.type === 'WORKED' ? 'ASISTENCIA' : move.type}
                                                                    </span>
                                                                </td>
                                                                <td
                                                                    className="p-3 text-gray-600 dark:text-gray-400 max-w-[200px] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                                                    title="Click para ver nota completa"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedNote({ text: move.description, date: move.date });
                                                                        setIsNoteModalOpen(true);
                                                                    }}
                                                                >
                                                                    <div className="flex items-center gap-1 group/note">
                                                                        <span className="truncate group-hover/note:underline decoration-dotted underline-offset-2">{move.description || '-'}</span>
                                                                        <Info className="w-3 h-3 opacity-0 group-hover/note:opacity-50 text-blue-500" />
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-right font-mono font-bold">
                                                                    <span className={`px-2 py-1 rounded text-xs text-white shadow-sm ${move.amount > 0 ? 'bg-sushi-500' : 'bg-red-500'
                                                                        }`}>
                                                                        {move.amount > 0 ? '+' : ''}{formatMoney(move.amount)}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {allMovements.length === 0 && (
                                                            <tr>
                                                                <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                                                                    No hay movimientos registrados
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Note Detail Modal */}
            {isNoteModalOpen && selectedNote && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-scale-in">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-sushi-gold" />
                                Detalle de la Nota
                            </h3>
                            <p className="text-xs text-gray-400 mb-2 uppercase font-bold">
                                Correspondiente al registro del: <span className="text-gray-900 dark:text-white">{new Date(selectedNote.date + 'T00:00:00').toLocaleDateString()}</span>
                            </p>
                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5 max-h-[60vh] overflow-y-auto">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                    {selectedNote.text}
                                </p>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setIsNoteModalOpen(false)}
                                    className="px-6 py-2 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                    autoFocus
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showTutorial && <PayrollTutorial onClose={() => setShowTutorial(false)} />}
            <SecurityConfirmationModal
                isOpen={securityModalOpen}
                onClose={() => setSecurityModalOpen(false)}
                onConfirm={handleConfirmPayment}
                title={modalMode === 'DISCOUNT' ? '¿Confirmar Sanción/Descuento?' : '¿Confirmar Pago de Nómina?'}
                description={modalMode === 'DISCOUNT'
                    ? `Se registrará un descuento de ${formatMoney(Math.abs(paymentAmount))} al empleado ${selectedEmployee?.name}. Motivo: ${paymentDescription || 'Sin motivo'}`
                    : `Se registrará un pago de ${formatMoney(paymentAmount)} a ${selectedEmployee?.name}. ${resetCycle ? 'Se REINICIARÁ el ciclo de pago (Devengado a 0).' : 'Es un pago parcial o adelanto.'}`
                }
                actionType={modalMode === 'DISCOUNT' ? 'danger' : 'warning'}
                confirmText={modalMode === 'DISCOUNT' ? 'Aplicar Descuento' : 'Registrar Pago'}
            />

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
