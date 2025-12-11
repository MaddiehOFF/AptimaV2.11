import React, { useState, useMemo, useRef } from 'react';
import { CashShift, WalletTransaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Calendar, Banknote, CreditCard, ShoppingBag, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface StatisticsDashboardProps {
    cashShifts: CashShift[];
    walletTransactions: WalletTransaction[];
}

type Period = 'DAILY' | 'WEEK' | 'MONTH' | 'YEAR';

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ cashShifts, walletTransactions }) => {
    const [period, setPeriod] = useState<Period>('WEEK');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const chartRef = useRef<HTMLDivElement>(null);

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Date Range Calculation Helper
    const getDateRange = () => {
        const now = new Date();
        let end = new Date(now);
        end.setHours(23, 59, 59, 999);

        let start = new Date(now);
        start.setHours(0, 0, 0, 0);

        if (period === 'DAILY') {
            const [y, m, d] = selectedDate.split('-').map(Number);
            start = new Date(y, m - 1, d);
            end.setFullYear(y, m - 1, d);
        } else if (period === 'WEEK') {
            start.setDate(now.getDate() - 7);
        } else if (period === 'MONTH') {
            const y = selectedYear;
            const m = selectedMonth;
            start = new Date(y, m, 1);
            end = new Date(y, m + 1, 0);
            end.setHours(23, 59, 59, 999);
        } else if (period === 'YEAR') {
            const y = selectedYear;
            start = new Date(y, 0, 1);
            end = new Date(y, 11, 31);
            end.setHours(23, 59, 59, 999);
        }

        return { start, end };
    };

    // Filter Shifts based on Period
    const filteredShifts = useMemo(() => {
        const { start, end } = getDateRange();

        return cashShifts.filter(s => {
            if (s.status !== 'CLOSED') return false;
            // Parse YYYY-MM-DD safely to local time
            const [y, m, d] = s.date.split('-').map(Number);
            const shiftDate = new Date(y, m - 1, d);
            return shiftDate >= start && shiftDate <= end;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [cashShifts, period, selectedDate, selectedMonth, selectedYear]);

    // Aggregate Data for KPIs
    const stats = useMemo(() => {
        let totalFudo = 0;
        let totalPy = 0;
        let totalIncome = 0;
        let totalExpenses = 0;

        filteredShifts.forEach(shift => {
            totalFudo += shift.ordersFudo || 0;
            totalPy += shift.ordersPedidosYa || 0;

            shift.transactions.forEach(t => {
                if (t.type === 'INCOME') totalIncome += t.amount;
                if (t.type === 'EXPENSE') totalExpenses += t.amount;
            });
        });

        const totalOrders = totalFudo + totalPy;
        const avgTicket = totalOrders > 0 ? totalIncome / totalOrders : 0;

        return { totalFudo, totalPy, totalOrders, totalIncome, totalExpenses, avgTicket };
    }, [filteredShifts]);

    // Chart Data: Revenue vs Expense per Day
    const barData = useMemo(() => {
        return filteredShifts.map(s => {
            const income = s.transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
            const expense = s.transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
            return {
                name: new Date(s.date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
                ingresos: income,
                gastos: expense
            };
        });
    }, [filteredShifts]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const { start, end } = getDateRange();
        const dateRangeStr = period === 'DAILY'
            ? new Date(start).toLocaleDateString()
            : `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;

        // Header
        doc.setFillColor(26, 26, 26); // Sushi Black
        doc.rect(0, 0, 210, 40, 'F');

        doc.setFontSize(22);
        doc.setTextColor(212, 175, 55); // Sushi Gold
        doc.text('MANIPLEX - Reporte Financiero', 10, 25);

        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(`Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 150, 20);
        doc.text(`Período: ${dateRangeStr}`, 150, 26);

        // Check for empty data
        if (filteredShifts.length === 0) {
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.text('No hay datos disponibles para el período seleccionado.', 10, 50);
            doc.save(`Reporte_Financiero_${period}_${new Date().toISOString().split('T')[0]}.pdf`);
            return;
        }

        // KPI Summary
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text('Resumen General', 10, 50);

        (doc as any).autoTable({
            startY: 55,
            head: [['Indicador', 'Valor']],
            body: [
                ['Ingresos Totales', formatMoney(stats.totalIncome)],
                ['Gastos Operativos', formatMoney(stats.totalExpenses)],
                ['Beneficio Neto', formatMoney(stats.totalIncome - stats.totalExpenses)],
                ['Pedidos Totales', stats.totalOrders.toString()],
                ['Ticket Promedio', formatMoney(stats.avgTicket)],
                ['Turnos Analizados', filteredShifts.length.toString()],
            ],
            theme: 'grid',
            headStyles: { fillColor: [26, 26, 26], textColor: [212, 175, 55] },
            styles: { fontSize: 10 }
        });

        // Detailed Shifts Table
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.text('Detalle por Turno', 10, finalY);

        const tableBody = filteredShifts.map(s => {
            const income = s.transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
            const expense = s.transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
            return [
                s.date,
                formatMoney(income),
                formatMoney(expense),
                formatMoney(income - expense)
            ];
        });

        (doc as any).autoTable({
            startY: finalY + 5,
            head: [['Fecha', 'Ingresos', 'Gastos', 'Neto']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
            styles: { fontSize: 9 }
        });

        doc.save(`Reporte_Financiero_${period}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Chart Data: Payment Methods & Orders
    const pieDataMethods = useMemo(() => {
        let cash = 0;
        let transfer = 0;
        filteredShifts.forEach(s => {
            s.transactions.filter(t => t.type === 'INCOME').forEach(t => {
                if (t.method === 'CASH') cash += t.amount;
                else transfer += t.amount;
            });
        });
        return [
            { name: 'Efectivo', value: cash, color: '#22c55e' },
            { name: 'Transferencia', value: transfer, color: '#3b82f6' }
        ].filter(d => d.value > 0);
    }, [filteredShifts]);

    const pieDataOrders = useMemo(() => {
        return [
            { name: 'Fudo', value: stats.totalFudo, color: '#eab308' },
            { name: 'PedidosYa', value: stats.totalPy, color: '#ef4444' }
        ].filter(d => d.value > 0);
    }, [stats]);

    const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-6 animate-fade-in" ref={chartRef}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-serif text-gray-900 dark:text-white flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-sushi-gold" />
                        Estadísticas Comerciales
                    </h2>
                    <p className="text-gray-500 dark:text-sushi-muted mt-2">Métricas de facturación, pedidos y gastos.</p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-bold mr-2"
                    >
                        <ShoppingBag className="w-4 h-4" /> Exportar PDF
                    </button>

                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                        {(['DAILY', 'WEEK', 'MONTH', 'YEAR'] as Period[]).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${period === p ? 'bg-sushi-gold text-sushi-black' : 'text-gray-500 dark:text-sushi-muted hover:text-white'}`}
                            >
                                {p === 'DAILY' ? 'Diario' : p === 'WEEK' ? 'Semana' : p === 'MONTH' ? 'Mes' : 'Año'}
                            </button>
                        ))}
                    </div>

                    {period === 'DAILY' && (
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-gray-100 dark:bg-white/10 border-none rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 ring-sushi-gold"
                        />
                    )}

                    {period === 'MONTH' && (
                        <>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="bg-gray-100 dark:bg-white/10 border-none rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 ring-sushi-gold cursor-pointer"
                            >
                                {months.map((m, i) => <option key={i} value={i} className="bg-white text-black">{m}</option>)}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-gray-100 dark:bg-white/10 border-none rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 ring-sushi-gold cursor-pointer"
                            >
                                {years.map(y => <option key={y} value={y} className="bg-white text-black">{y}</option>)}
                            </select>
                        </>
                    )}

                    {period === 'YEAR' && (
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-gray-100 dark:bg-white/10 border-none rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 ring-sushi-gold cursor-pointer"
                        >
                            {years.map(y => <option key={y} value={y} className="bg-white text-black">{y}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs uppercase text-gray-500 font-bold mb-1">Facturado Bruto</p>
                            <h3 className="text-2xl font-mono font-bold text-gray-900 dark:text-white">{formatMoney(stats.totalIncome)}</h3>
                        </div>
                        <div className="p-2 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-lg">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs uppercase text-gray-500 font-bold mb-1">Gastos Operativos</p>
                            <h3 className="text-2xl font-mono font-bold text-red-500">{formatMoney(stats.totalExpenses)}</h3>
                        </div>
                        <div className="p-2 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-lg">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs uppercase text-gray-500 font-bold mb-1">Pedidos Totales</p>
                            <h3 className="text-2xl font-mono font-bold text-blue-500">{stats.totalOrders}</h3>
                            <p className="text-[10px] text-gray-400 mt-1">Fudo: {stats.totalFudo} | PY: {stats.totalPy}</p>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-lg">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs uppercase text-gray-500 font-bold mb-1">Ticket Promedio</p>
                            <h3 className="text-2xl font-mono font-bold text-purple-500">{formatMoney(stats.avgTicket)}</h3>
                        </div>
                        <div className="p-2 bg-purple-100 dark:bg-purple-500/20 text-purple-600 rounded-lg">
                            <Banknote className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Bar Chart: Income vs Expense */}
                <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm h-[350px]">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-6">Flujo de Caja (Diario)</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                            <XAxis dataKey="name" fontSize={12} stroke="#888" axisLine={false} tickLine={false} />
                            <YAxis fontSize={12} stroke="#888" axisLine={false} tickLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                                formatter={(value: number) => formatMoney(value)}
                            />
                            <Legend />
                            <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Charts Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[350px]">

                    {/* Orders Pie */}
                    <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm flex flex-col items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2 w-full text-left">Origen Pedidos</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieDataOrders}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieDataOrders.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => value} contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', color: '#fff' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Methods Pie */}
                    <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm flex flex-col items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2 w-full text-left">Medios de Pago</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieDataMethods}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieDataMethods.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatMoney(value)} contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', color: '#fff' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};