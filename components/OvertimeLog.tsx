import React, { useState, useMemo, useEffect } from 'react';
import { calculateAttendanceAmount } from '../services/attendanceCalculator';
import { AbsenceRecord, Employee, OvertimeRecord, SanctionRecord, CalendarEvent, PayrollMovement } from '../types';
import { AlignLeft, Save, Trash2, ChevronLeft, ChevronRight, Clock, Info, CheckCircle2, Circle, XCircle, CalendarX, Check, Filter, Wallet, AlertOctagon, CalendarPlus, Sparkles, Calendar as CalIcon } from 'lucide-react';
import { usePayrollMovements } from '../hooks/usePayrollMovements'; // Added Hook
interface OvertimeLogProps {
    employees: Employee[];
    records: OvertimeRecord[];
    setRecords: React.Dispatch<React.SetStateAction<OvertimeRecord[]>>;
    absences: AbsenceRecord[];
    setAbsences: React.Dispatch<React.SetStateAction<AbsenceRecord[]>>;
    sanctions: SanctionRecord[];
    setSanctions: React.Dispatch<React.SetStateAction<SanctionRecord[]>>;
    holidays?: string[]; // Array of ISO Date Strings
    setHolidays?: React.Dispatch<React.SetStateAction<string[]>>;
    currentUserName: string;
    currentUserId: string; // Added prop for Private Event filtering
    currentUserRole: string; // Added prop for permission check
    calendarEvents?: CalendarEvent[];
    setCalendarEvents?: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
    onAddEvent?: (event: CalendarEvent) => void;
    onDeleteEvent?: (id: string) => void;
    payrollMovements?: PayrollMovement[];
    setPayrollMovements?: React.Dispatch<React.SetStateAction<PayrollMovement[]>>;
}
type TabMode = 'ATTENDANCE' | 'ABSENCE' | 'FRANCO' | 'EVENT';

export const OvertimeLog: React.FC<OvertimeLogProps> = ({ employees, records, setRecords, absences, setAbsences, sanctions, setSanctions, holidays = [], setHolidays, currentUserName, currentUserId, currentUserRole, calendarEvents = [], setCalendarEvents, onAddEvent, onDeleteEvent, payrollMovements = [], setPayrollMovements }) => {
    const { addMovement, deleteMovementByAttendanceId } = usePayrollMovements(payrollMovements, setPayrollMovements || (() => { })); // Hook Init

    const [selectedEmpId, setSelectedEmpId] = useState('');
    const [filterEmpId, setFilterEmpId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Toggle for Admin Holiday Management
    const [isHolidayMode, setIsHolidayMode] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetOptions, setResetOptions] = useState({ events: false, attendance: false, holidays: false, reminders: false });
    const [isCalcExpanded, setIsCalcExpanded] = useState(false); // 38.1 Collapsible Detail State

    // Event State
    const [eventTitle, setEventTitle] = useState('');
    const [eventVisibility, setEventVisibility] = useState<'ALL' | 'ADMIN'>('ALL');

    // Attendance State
    const [actualCheckIn, setActualCheckIn] = useState('');
    const [actualCheckOut, setActualCheckOut] = useState('');
    const [reason, setReason] = useState('');

    // Absence State
    const [absenceReason, setAbsenceReason] = useState('');
    const [isJustified, setIsJustified] = useState(false);

    // UI State
    const [mode, setMode] = useState<TabMode>('ATTENDANCE');
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [newEventData, setNewEventData] = useState({ title: '', date: new Date().toISOString().split('T')[0], type: 'EVENT' as 'EVENT' | 'HOLIDAY' | 'CLOSED', description: '' });

    // Sync form selection with filter
    useEffect(() => {
        if (filterEmpId) {
            setSelectedEmpId(filterEmpId);
        }
    }, [filterEmpId]);

    // Auto-confirm scheduled records
    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const scheduledToConfirm = records.filter(r => r.status === 'SCHEDULED' && r.date <= todayStr);

        if (scheduledToConfirm.length > 0) {
            console.log(`Confirming ${scheduledToConfirm.length} scheduled records.`);
            setRecords(prev => prev.map(r => {
                if (r.status === 'SCHEDULED' && r.date <= todayStr) {
                    return { ...r, status: 'CONFIRMED' };
                }
                return r;
            }));
        }
    }, [records, setRecords]);

    const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    const timeToMinutes = (time: string) => {
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const calculateDurationMinutes = (start: string, end: string) => {
        let startMin = timeToMinutes(start);
        let endMin = timeToMinutes(end);
        if (endMin < startMin) endMin += 24 * 60; // Crosses midnight
        return endMin - startMin;
    };

    const isHoliday = (d: string) => holidays.includes(d);

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

    // Helper to parse YYYY-MM-DD as Local Date (fixes timezone shift issues)
    const parseLocalDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };



    const calculationPreview = useMemo(() => {
        if (!selectedEmpId || !actualCheckIn || !actualCheckOut) return null;

        const emp = employees.find(e => e.id === selectedEmpId);
        if (!emp) return null;

        const isHolidayDate = isHoliday(date);

        // Use new service for calculation
        const result = calculateAttendanceAmount({
            salaryAmount: emp.monthlySalary,
            salaryPeriod: (emp.paymentModality === 'MENSUAL' || !emp.paymentModality) ? 'monthly' : (emp.paymentModality === 'QUINCENAL' ? 'biweekly' : (emp.paymentModality === 'SEMANAL' ? 'weekly' : 'daily')),
            officialStart: emp.scheduleStart || "09:00",
            officialEnd: emp.scheduleEnd || "17:00",
            workedStart: actualCheckIn,
            workedEnd: actualCheckOut,
            isHoliday: isHolidayDate,
            holidayFactor: 2,
            overtimeFactor: 1.0
        });

        // Basic derivations for UI
        const workedHoursStr = (result.workedMinutes / 60).toFixed(2);
        const standardHoursStr = (result.officialMinutes / 60).toFixed(2);
        const overtimeMin = result.workedMinutes - result.officialMinutes;
        const overtimeHours = Math.max(0, overtimeMin / 60);

        // Lateness check
        const scheduledStartMin = timeToMinutes(emp.scheduleStart || "09:00");
        const actualStartMin = timeToMinutes(actualCheckIn);
        const isLate = (actualStartMin > scheduledStartMin + 10) && (actualStartMin < scheduledStartMin + 240);


        return {
            workedHours: workedHoursStr,
            standardHours: standardHoursStr,
            overtimeHours: overtimeHours.toFixed(2),
            rate: result.minuteValue,
            amount: result.amount,
            isOvertime: overtimeMin > 0,
            isUndertime: overtimeMin < 0,
            isHoliday: isHolidayDate,
            isLate: isLate,
            // Pass full result for logging if needed
            fullResult: result
        };
    }, [selectedEmpId, actualCheckIn, actualCheckOut, employees, date, holidays]);

    // Financial Summary for Selected Employee in Current Month
    const employeeMonthSummary = useMemo(() => {
        if (!filterEmpId) return null;

        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        // Convert to YYYY-MM-DD for strict string comparison
        const offset = startOfMonth.getTimezoneOffset();
        const startStr = new Date(startOfMonth.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
        const endStr = new Date(endOfMonth.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

        const monthRecords = records.filter(r => {
            return r.employeeId === filterEmpId && r.date >= startStr && r.date <= endStr;
        });

        const monthAbsences = absences.filter(a => {
            return a.employeeId === filterEmpId && a.date >= startStr && a.date <= endStr;
        });

        return {
            totalDebt: monthRecords.filter(r => !r.paid).reduce((acc, curr) => acc + curr.overtimeAmount, 0),
            totalPaid: monthRecords.filter(r => r.paid).reduce((acc, curr) => acc + curr.overtimeAmount, 0),
            totalHours: monthRecords.reduce((acc, curr) => acc + curr.overtimeHours, 0),
            absences: monthAbsences.length
        };

    }, [filterEmpId, currentMonth, records, absences]);


    const handleAddRecord = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Employee is required for everything except EVENTS
        if (!date) {
            alert("Por favor seleccione una fecha.");
            return;
        }

        if (mode !== 'EVENT' && !selectedEmpId) {
            alert("Por favor seleccione un empleado.");
            return;
        }

        if (mode === 'FRANCO') {
            const newAbsence: AbsenceRecord = {
                id: generateUUID(),
                employeeId: selectedEmpId,
                date: date,
                reason: 'Día de Descanso',
                justified: true,
                type: 'FRANCO',
                createdBy: currentUserName
            };
            setAbsences(prev => [newAbsence, ...prev]);
            alert('Día de Descanso registrado correctamente.');
            // Do not clear selectedEmpId if filtering
            if (!filterEmpId) setSelectedEmpId('');
            return;
        }

        if (mode === 'EVENT') {
            if (!eventTitle) {
                alert("Por favor ingrese un título para el recordatorio.");
                return;
            }
            // Persistence: Use onAddEvent if available (for App-level sync), otherwise fallback to local set
            const newEvent: CalendarEvent = {
                id: generateUUID(),
                title: eventTitle,
                date: date,
                createdBy: currentUserName,
                visibility: eventVisibility
            };

            if (onAddEvent) {
                onAddEvent(newEvent);
            } else if (setCalendarEvents) {
                setCalendarEvents(prev => [newEvent, ...prev]);
            }

            setEventTitle('');
            alert('Recordatorio creado correctamente.');
            return;
        }

        if (mode === 'ATTENDANCE') {
            if (!actualCheckIn || !actualCheckOut) {
                alert("Por favor ingrese hora de entrada y salida.");
                return;
            }

            const calc = calculationPreview;
            if (!calc) {
                alert("Error: No se pudo calcular la asistencia. Verifique que los horarios sean válidos.");
                return;
            }

            // 37.6 Logging de seguridad + 39.1 Date Check
            const empForLog = employees.find(e => e.id === selectedEmpId);
            console.log("[CALENDAR_ENTRY]", {
                action: "CREATE_ATTENDANCE",
                targetDate: date,
                employee: empForLog?.name,
                officialStart: empForLog?.scheduleStart,
                officialEnd: empForLog?.scheduleEnd,
                workedStart: actualCheckIn,
                workedEnd: actualCheckOut,
                calcResult: calc
            });

            const todayStr = new Date().toISOString().split('T')[0];
            const isFuture = date > todayStr;

            const newRecord: OvertimeRecord = {
                id: generateUUID(),
                employeeId: selectedEmpId,
                date: date,
                checkIn: actualCheckIn,
                checkOut: actualCheckOut,
                overtimeHours: parseFloat(calc.overtimeHours),
                overtimeAmount: calc.amount, // Derived from strict service
                reason: reason || (calc.isOvertime ? 'Horas Extras' : 'Turno Regular'),
                paid: false,
                isHoliday: calc.isHoliday,
                createdBy: currentUserName,
                status: isFuture ? 'SCHEDULED' : 'CONFIRMED'
            };

            if (isFuture) {
                alert(`Asistencia programada para ${parseLocalDate(date).toLocaleDateString()}. Se registrará como oficial automáticamente el día correspondiente.`);
            } else {
                // Only create sanctions for current/past records
                // Auto Sanction for Lateness
                if (calc.isLate) {
                    const newSanction: SanctionRecord = {
                        id: generateUUID(),
                        employeeId: selectedEmpId,
                        date: date,
                        type: 'LLEGADA_TARDE',
                        description: `Llegada tarde detectada automáticamente (>10min). Ingreso: ${actualCheckIn}`,
                        amount: 0,
                        createdBy: 'SYSTEM',
                        status: 'APPROVED'
                    };
                    if (setSanctions) {
                        setSanctions(prev => [newSanction, ...prev]);
                        alert('Atención: Se ha generado automáticamente una sanción por llegada tarde.');
                    }
                }
            }

            setRecords([newRecord, ...records]);

            // [INTEGRATION] Create Payroll Movement (Ledger)
            // IF employee is NOT 'DIARIO' (Daily paid employees don't accrue debt in this system, they are paid on spot or handled differently)
            const empModality = employees.find(e => e.id === selectedEmpId)?.paymentModality;
            if (empModality !== 'DIARIO' && !isFuture) { // Future events don't generate financial movements yet
                const newMovement: PayrollMovement = {
                    id: generateUUID(),
                    employee_id: selectedEmpId,
                    attendance_id: newRecord.id, // Link to Attendance
                    type: 'ASISTENCIA',
                    amount: calc.amount, // Explicit Daily Value
                    date: date,
                    description: `Jornada trabajada ${parseLocalDate(date).toLocaleDateString()} (${actualCheckIn} - ${actualCheckOut})`,
                    created_by: currentUserName,
                    created_at: new Date().toISOString(),
                    meta: calc.fullResult
                };
                if (setPayrollMovements) {
                    addMovement(newMovement);
                    console.log("[PAYROLL] Movement created:", newMovement);
                }
            }

            setReason('');
            setActualCheckIn('');
            setActualCheckOut('');
            alert("Asistencia registrada correctamente.");
        } else {
            // Absence Mode, defaulting to 'ABSENCE' as 'FRANCO' is handled earlier
            if (!absenceReason) {
                alert("Por favor ingrese el motivo de la falta.");
                return;
            }

            const newAbsence: AbsenceRecord = {
                id: generateUUID(),
                employeeId: selectedEmpId,
                date: date,
                reason: absenceReason,
                justified: isJustified,
                type: isJustified ? 'SICK' : 'UNJUSTIFIED', // Mapped to valid types
                createdBy: currentUserName
            };

            setAbsences([newAbsence, ...absences]);
            setAbsenceReason('');
            setIsJustified(false);
            alert("Ausencia registrada correctamente.");
        }

        // Do not clear selectedEmpId if filtering
        if (!filterEmpId) setSelectedEmpId('');
    };

    const handleDeleteEvent = (id: string) => {
        if (window.confirm('¿Eliminar registro?')) {
            if (onDeleteEvent) {
                onDeleteEvent(id);
            } else if (setCalendarEvents) {
                setCalendarEvents(prev => prev.filter(e => e.id !== id));
            }
        }
    };

    const handleDeleteRecord = (id: string) => {
        if (window.confirm('¿Eliminar registro?')) {
            const recordToDelete = records.find(r => r.id === id);
            setRecords(records.filter(r => r.id !== id));

            // [INTEGRATION] Delete Payroll Movement
            if (recordToDelete && setPayrollMovements) {
                deleteMovementByAttendanceId(id);
                console.log("[PAYROLL] Movement deleted for attendance:", id);
            }
        }
    };

    const handleDeleteAbsence = (id: string) => {
        if (window.confirm('¿Eliminar falta?')) {
            setAbsences(absences.filter(a => a.id !== id));
        }
    };



    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateStr = newDate.toISOString().split('T')[0];

        if (isHolidayMode && setHolidays) {
            if (holidays.includes(dateStr)) {
                setHolidays(holidays.filter(h => h !== dateStr));
            } else {
                setHolidays([...holidays, dateStr]);
            }
        } else {
            setDate(dateStr);
        }
    };

    const handleSaveNewEvent = () => {
        if (!newEventData.title || !newEventData.date) return;

        const newEvent: CalendarEvent = {
            id: generateUUID(),
            title: newEventData.title,
            date: newEventData.date,
            type: newEventData.type,
            description: newEventData.description,
            createdBy: currentUserName,
            visibility: 'ALL'
        };

        if (onAddEvent) {
            onAddEvent(newEvent);
        } else if (setCalendarEvents) {
            setCalendarEvents(prev => [...prev, newEvent]);
        }

        setIsAddEventModalOpen(false);
        setNewEventData({ title: '', date: new Date().toISOString().split('T')[0], type: 'EVENT', description: '' });
        alert('Evento agregado correctamente');
    };

    const changeMonth = (delta: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
    };

    const getDayRecords = (d: string) => {
        return records.filter(r => r.date === d && (!filterEmpId || r.employeeId === filterEmpId));
    };

    const getDayAbsences = (d: string) => {
        return absences.filter(a => a.date === d && (!filterEmpId || a.employeeId === filterEmpId));
    };

    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.id === id);
        return emp ? emp.name.split(' ')[0] : 'Ex-Staff';
    };

    const handleResetCalendar = () => {
        if (!window.confirm('¿ESTÁS SEGURO? Esta acción es irreversible.')) return;

        let deletedCount = 0;

        // 1. Delete Events (Regular & Holidays)
        if (resetOptions.events || resetOptions.holidays || resetOptions.reminders) {
            // Filter out events that match the selected types to be deleted
            const typesToDelete = [];
            if (resetOptions.events) typesToDelete.push('EVENT');
            if (resetOptions.holidays) typesToDelete.push('HOLIDAY', 'CLOSED', 'DESCANSO');
            // Reminders are basically events in this system currently, unless we distinguish them
            // Assuming 'EVENT' covers Reminders for now as per current create logic

            if (setCalendarEvents) {
                setCalendarEvents(prev => prev.filter(e => !typesToDelete.includes(e.type || 'EVENT')));
                deletedCount++;
            }
        }

        // 2. Delete Attendance (Records)
        if (resetOptions.attendance) {
            setRecords([]);
            setAbsences([]); // Usually part of attendance history
            setSanctions([]); // Usually part of attendance history
            deletedCount++;
        }

        setIsResetModalOpen(false);
        setResetOptions({ events: false, attendance: false, holidays: false, reminders: false });
        alert('Calendario reiniciado según las opciones seleccionadas.');
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-full">
            {/* Left: Calendar & List */}
            <div className="xl:col-span-2 flex flex-col gap-6">

                {/* Calendar Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-sushi-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <button onClick={() => changeMonth(-1)} className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white"><ChevronLeft className="w-5 h-5" /></button>
                            <button onClick={() => changeMonth(1)} className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white"><ChevronRight className="w-5 h-5" /></button>
                            <button
                                onClick={() => setIsAddEventModalOpen(true)}
                                className="px-3 py-2 bg-sushi-gold text-sushi-black rounded-lg text-sm font-bold hover:bg-sushi-goldhover transition-colors flex items-center gap-1 shadow-sm"
                            >
                                + Evento
                            </button>
                        </div>
                        <h3 className="text-xl font-serif text-gray-900 dark:text-white capitalize min-w-[150px]">
                            {currentMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                        </h3>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* Holiday Toggle */}
                        {setHolidays && (
                            <button
                                onClick={() => setIsHolidayMode(!isHolidayMode)}
                                className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${isHolidayMode ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-sushi-muted hover:text-purple-500'}`}
                            >
                                <CalendarPlus className="w-4 h-4" />
                                {isHolidayMode ? 'Terminar Edición' : 'Gestionar Feriados'}
                            </button>
                        )}

                        {/* Admin Reset Button */}
                        {currentUserRole === 'ADMIN' && (
                            <button
                                onClick={() => setIsResetModalOpen(true)}
                                className="p-2 rounded-lg bg-red-100 dark:bg-white/5 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                                title="Reiniciar Calendario"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}

                        {/* Bulk Day Off - Only in FRANCO mode */}
                        {mode === 'FRANCO' && (
                            <button
                                onClick={() => {
                                    if (window.confirm(`¿Asignar "Día de Descanso" a TODOS los empleados activos (${employees.filter(e => e.active).length}) para el día ${parseLocalDate(date).toLocaleDateString()}?`)) {
                                        const activeEmps = employees.filter(e => e.active);
                                        const newAbsences = activeEmps.map(emp => ({
                                            id: generateUUID(),
                                            employeeId: emp.id,
                                            date: date,
                                            reason: 'Día de Descanso General',
                                            justified: true,
                                            type: 'FRANCO' as const
                                        }));
                                        setAbsences(prev => [...newAbsences, ...prev]);
                                        alert('Descanso General asignado correctamente.');
                                    }
                                }}
                                className="px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 hover:bg-blue-200"
                                title="Asignar Descanso a Todos"
                            >
                                <Sparkles className="w-4 h-4" /> Asignar a Todos
                            </button>
                        )}

                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400 dark:text-sushi-muted" />
                            <select
                                value={filterEmpId}
                                onChange={(e) => setFilterEmpId(e.target.value)}
                                className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold"
                            >
                                <option value="">Ver Todos</option>
                                {employees.filter(e => e.active).map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Employee Summary Card */}
                {filterEmpId && employeeMonthSummary && (
                    <div className="grid grid-cols-3 gap-4 animate-fade-in">
                        <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                            <div className="p-3 rounded-full bg-sushi-gold/10 text-yellow-700 dark:text-sushi-gold">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs uppercase text-gray-500 dark:text-sushi-muted font-bold">Deuda Pendiente</p>
                                <p className="text-xl font-mono font-bold text-yellow-700 dark:text-sushi-gold">{formatMoney(employeeMonthSummary.totalDebt)}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                            <div className="p-3 rounded-full bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs uppercase text-gray-500 dark:text-sushi-muted font-bold">Total Abonado</p>
                                <p className="text-xl font-mono font-bold text-green-600 dark:text-green-500">{formatMoney(employeeMonthSummary.totalPaid)}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                            <div className="p-3 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500">
                                <AlertOctagon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs uppercase text-gray-500 dark:text-sushi-muted font-bold">Faltas Mes</p>
                                <p className="text-xl font-mono font-bold text-red-600 dark:text-red-500">{employeeMonthSummary.absences}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Calendar Grid */}
                <div className={`bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm transition-all duration-300 ${isHolidayMode ? 'ring-2 ring-purple-500' : ''}`}>

                    {isHolidayMode && (
                        <div className="mb-4 text-center">
                            <span className="text-xs font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                                Modo Edición de Feriados Activado
                            </span>
                            <p className="text-xs text-gray-400 mt-2">Haz clic en los días para marcarlos/desmarcarlos como feriados oficiales (Pago Doble).</p>
                        </div>
                    )}

                    <div className="grid grid-cols-7 gap-2 mb-4 text-center">
                        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => (
                            <div key={d} className="text-gray-400 dark:text-sushi-muted text-xs font-bold uppercase">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: startDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-24" />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0];
                            const dayRecs = getDayRecords(dateStr);
                            const dayAbsences = getDayAbsences(dateStr);
                            const hasRecords = dayRecs.length > 0;
                            const hasAbsences = dayAbsences.length > 0;
                            const isSelected = date === dateStr;
                            const isToday = dateStr === new Date().toISOString().split('T')[0];
                            const isDayHoliday = holidays.includes(dateStr);
                            const hasUnpaid = dayRecs.some(r => !r.paid);

                            const hasFranco = dayAbsences.some(a => a.type === 'FRANCO');

                            // Visual styles based on filter and mode
                            let cellBg = 'bg-gray-50 dark:bg-white/[0.02]';

                            if (isDayHoliday) cellBg = 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-500/30';
                            else if (hasFranco && !isHolidayMode) cellBg = 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-500/30'; // Celeste for Franco
                            else if (hasAbsences) cellBg = 'bg-red-50 dark:bg-red-900/10';

                            if (isSelected && !isHolidayMode) cellBg = 'bg-sushi-gold/5 dark:bg-sushi-gold/10';

                            return (
                                <div
                                    key={day}
                                    onClick={() => handleDateClick(day)}
                                    className={`h-24 border rounded-lg p-2 cursor-pointer transition-all relative flex flex-col justify-between ${cellBg} ${isSelected && !isHolidayMode ? 'border-sushi-gold' : 'border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-sm font-medium ${isToday ? 'text-sushi-gold' : isDayHoliday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-sushi-text'}`}>{day}</span>

                                        <div className="flex gap-1">
                                            {isDayHoliday && <Sparkles className="w-3 h-3 text-purple-500 fill-purple-500" />}
                                            {hasRecords && !isHolidayMode && <div className={`w-2 h-2 rounded-full ${hasUnpaid ? 'bg-sushi-gold' : 'bg-green-500'}`} />}
                                            {hasAbsences && !isHolidayMode && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                        </div>
                                    </div>

                                    {!isHolidayMode && (
                                        <div className="flex flex-col gap-1 overflow-hidden">
                                            {dayAbsences.map(a => (
                                                <div key={a.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 border ${a.type === 'FRANCO' ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 border-red-200 dark:border-red-500/20'}`}>
                                                    {a.type === 'FRANCO' ? <Sparkles className="w-2 h-2" /> : <XCircle className="w-2 h-2" />}
                                                    {filterEmpId ? (a.type === 'FRANCO' ? 'DESCANSO' : 'AUSENTE') : getEmployeeName(a.employeeId)}
                                                </div>
                                            ))}
                                            {dayRecs.slice(0, 2 - Math.min(2, dayAbsences.length)).map(r => (
                                                <div key={r.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 ${r.paid ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-sushi-gold/20 text-sushi-gold-dark dark:text-sushi-gold'}`}>
                                                    {filterEmpId ? (
                                                        <div className="flex justify-between w-full">
                                                            <span>{r.overtimeAmount > 0 ? formatMoney(r.overtimeAmount) : 'Regular'}</span>
                                                            {r.paid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                        </div>
                                                    ) : (
                                                        getEmployeeName(r.employeeId)
                                                    )}
                                                </div>
                                            ))}
                                            {/* Events */}
                                            {calendarEvents
                                                .filter(e => e.date === dateStr && (e.visibility === 'ALL' || (e.visibility === 'ADMIN' && currentUserRole === 'ADMIN')))
                                                .slice(0, 1).map(ev => (
                                                    <div key={ev.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 ${ev.visibility === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                                                        <CalIcon className="w-2 h-2" />
                                                        {ev.title}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Day Details (Hidden in Holiday Mode) */}
                {!isHolidayMode && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-white/10 pb-2">
                            <h4 className="text-gray-900 dark:text-white font-serif text-lg">
                                Registros del {parseLocalDate(date).toLocaleDateString('es-AR', { dateStyle: 'full' })}
                            </h4>
                            {isHoliday(date) && (
                                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    FERIADO OFICIAL
                                </span>
                            )}
                        </div>

                        {getDayRecords(date).length === 0 && getDayAbsences(date).length === 0 && calendarEvents.filter(e => e.date === date).length === 0 ? (
                            <p className="text-gray-500 dark:text-sushi-muted italic text-sm">No hay actividad registrada para este día.</p>
                        ) : (
                            <div className="grid gap-3">
                                {/* Events List for Selected Day */}
                                {calendarEvents.filter(e => e.date === date && (e.visibility === 'ALL' || (e.visibility === 'ADMIN' && currentUserRole === 'ADMIN'))).map(ev => (
                                    <div key={ev.id} className={`p-4 rounded-lg flex items-center justify-between group ${ev.visibility === 'ADMIN' ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30' : 'bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-900/30'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${ev.visibility === 'ADMIN' ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'}`}>
                                                <CalIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-gray-900 dark:text-white font-bold flex items-center gap-2">
                                                    {ev.title}
                                                    {ev.visibility === 'ADMIN' && <span className="text-[10px] bg-red-100 text-red-800 px-1 rounded border border-red-200">PRIVADO</span>}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-sushi-muted">
                                                    Creado por: {ev.createdBy}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteEvent(ev.id)} className="text-gray-400 dark:text-sushi-muted hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                {/* Absences List */}
                                {getDayAbsences(date).map(abs => {
                                    const empName = employees.find(e => e.id === abs.employeeId)?.name || 'Desconocido (Ex-Staff)';
                                    return (
                                        <div key={abs.id} className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 p-4 rounded-lg flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500">
                                                    <CalendarX className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-gray-900 dark:text-white font-bold">{empName}</p>
                                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">FALTA REGISTRADA</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-gray-600 dark:text-sushi-muted italic">"{abs.reason}" <span className="not-italic text-[10px] text-gray-400">({abs.createdBy || 'Sistema'})</span></span>
                                                <button onClick={() => handleDeleteAbsence(abs.id)} className="text-gray-400 dark:text-sushi-muted hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Attendance List */}
                                {getDayRecords(date).map(rec => {
                                    const isOvertime = rec.overtimeAmount > 0;
                                    const empName = employees.find(e => e.id === rec.employeeId)?.name || 'Desconocido (Ex-Staff)';
                                    return (
                                        <div key={rec.id} className={`bg-white dark:bg-sushi-dark border p-4 rounded-lg flex items-center justify-between group transition-all ${rec.paid ? 'border-green-500/20 bg-green-50 dark:bg-green-500/5' : 'border-gray-200 dark:border-white/5 hover:border-sushi-gold/30'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-full ${rec.paid ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500' : 'bg-sushi-gold/10 text-sushi-gold'}`}>
                                                    {rec.paid ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-gray-900 dark:text-white font-bold">{empName}</p>
                                                        {rec.paid && <span className="text-[10px] text-green-600 dark:text-green-500 border border-green-200 dark:border-green-500/30 px-1 rounded uppercase tracking-wider">Pagado</span>}
                                                        {rec.isHoliday && <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 px-1 rounded uppercase tracking-wider font-bold">2x Feriado</span>}
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-sushi-muted">
                                                        Entrada: {rec.checkIn} | Salida: {rec.checkOut} | Por: {rec.createdBy || 'Sistema'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    {isOvertime ? (
                                                        <>
                                                            <p className={`${rec.paid ? 'text-green-600 dark:text-green-500' : 'text-sushi-gold'} font-bold text-lg`}>{formatMoney(rec.overtimeAmount)}</p>
                                                            <p className="text-xs text-gray-500 dark:text-sushi-muted">+{rec.overtimeHours.toFixed(2)} hrs extras</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-gray-400 dark:text-sushi-muted font-bold text-lg">$0,00</p>
                                                            <p className="text-xs text-gray-400 dark:text-sushi-muted">Turno Regular</p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">

                                                    <button onClick={() => handleDeleteRecord(rec.id)} className="text-gray-400 dark:text-sushi-muted hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Add Form (Hidden in Holiday Mode) */}
            {!isHolidayMode && (
                <div className="xl:col-span-1">
                    <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 p-6 rounded-xl sticky top-8 shadow-xl">
                        <div className="flex items-center gap-2 mb-6">
                            <h3 className="text-xl font-serif text-gray-900 dark:text-white">Libro de Actas</h3>
                            <span className="text-xs bg-sushi-gold text-sushi-black px-2 py-0.5 rounded font-bold">DIARIO</span>
                        </div>

                        <div className="flex border-b border-gray-200 dark:border-white/10 mb-6 rounded-xl overflow-hidden shadow-sm">
                            <button
                                onClick={() => setMode('ATTENDANCE')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'ATTENDANCE' ? 'bg-sushi-gold text-sushi-black' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-sushi-gold/20'}`}
                            >
                                <Clock className="w-4 h-4" /> Registrar Turno
                            </button>
                            <button
                                onClick={() => setMode('ABSENCE')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'ABSENCE' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-red-100'}`}
                            >
                                <AlertOctagon className="w-4 h-4" /> Registrar Ausencia
                            </button>
                            <button
                                onClick={() => setMode('EVENT')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'EVENT' ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-purple-100'}`}
                            >
                                <CalIcon className="w-4 h-4" /> Recordatorio
                            </button>
                        </div>

                        <form onSubmit={handleAddRecord} className="space-y-5">
                            {mode !== 'EVENT' && (
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Empleado</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedEmpId}
                                            onChange={(e) => setSelectedEmpId(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors appearance-none"
                                            required={mode !== 'FRANCO' || !selectedEmpId} // Required unless using bulk action (handled separately)
                                        >
                                            <option value="" disabled>Seleccionar Personal...</option>
                                            {employees.filter(e => e.active).map(emp => (
                                                <option key={emp.id} value={emp.id} className="dark:bg-sushi-dark">
                                                    {emp.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {selectedEmpId && mode === 'ATTENDANCE' && (
                                <div className="bg-blue-50 dark:bg-white/5 p-3 rounded-lg border border-blue-100 dark:border-white/10 flex gap-2 text-xs text-gray-600 dark:text-sushi-muted mb-2">
                                    <Info className="w-4 h-4 text-blue-500 dark:text-sushi-gold" />
                                    <span>Horario Oficial: <strong className="text-gray-900 dark:text-white">{employees.find(e => e.id === selectedEmpId)?.scheduleStart} - {employees.find(e => e.id === selectedEmpId)?.scheduleEnd}</strong></span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Fecha Registro</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                                    required
                                />
                            </div>

                            {/* 38.3 Daily Pay Warning */}
                            {selectedEmpId && employees.find(e => e.id === selectedEmpId)?.paymentModality === 'DIARIO' && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30 flex gap-2 text-xs text-orange-700 dark:text-orange-400 mb-2">
                                    <Info className="w-4 h-4 shrink-0" />
                                    <span>
                                        <strong>Pago Diario:</strong> Este registro no genera saldo en nómina (solo control de asistencia).
                                    </span>
                                </div>
                            )}

                            {mode === 'ATTENDANCE' && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Hora Real Ingreso</label>
                                            <input
                                                type="time"
                                                value={actualCheckIn}
                                                onChange={(e) => setActualCheckIn(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-2 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold [color-scheme:light] dark:[color-scheme:dark]"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Hora Real Salida</label>
                                            <input
                                                type="time"
                                                value={actualCheckOut}
                                                onChange={(e) => setActualCheckOut(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-2 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold [color-scheme:light] dark:[color-scheme:dark]"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Motivo / Notas</label>
                                        <div className="relative">
                                            <AlignLeft className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-sushi-muted" />
                                            <input
                                                type="text"
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                placeholder="Ej. Turno regular"
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 pl-10 pr-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Live Calculation Result */}
                                    {calculationPreview && (
                                        <div className={`rounded-lg border transition-colors overflow-hidden ${calculationPreview.isOvertime ? 'bg-sushi-gold/10 border-sushi-gold/30' : 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'}`}>
                                            {/* Header / Click to Expand */}
                                            <div
                                                className="p-4 flex justify-between items-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                                onClick={() => setIsCalcExpanded(!isCalcExpanded)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${calculationPreview.isOvertime ? 'bg-sushi-gold text-sushi-black' : 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500'}`}>
                                                        {calculationPreview.isOvertime ? <Sparkles className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-bold text-sm ${calculationPreview.isOvertime ? 'text-yellow-800 dark:text-sushi-gold' : 'text-green-700 dark:text-green-500'}`}>
                                                            {calculationPreview.isOvertime ? 'Horas Extras Detectadas' : 'Turno Regular'}
                                                        </h4>
                                                        {!isCalcExpanded && (
                                                            <p className="text-xs text-gray-500 dark:text-sushi-muted mt-0.5">
                                                                Monto: {formatMoney(calculationPreview.amount)} {employees.find(e => e.id === selectedEmpId)?.paymentModality === 'DIARIO' && '(No acreditable)'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-gray-400">
                                                    {isCalcExpanded ? <ChevronLeft className="w-5 h-5 -rotate-90" /> : <ChevronRight className="w-5 h-5 rotate-90" />}
                                                </div>
                                            </div>

                                            {/* Collapsible Content */}
                                            {isCalcExpanded && (
                                                <div className="px-4 pb-4 border-t border-gray-200 dark:border-white/10 pt-3 animate-fade-in">
                                                    {/* Detail Rows */}
                                                    <div className="space-y-2 text-xs mb-3 text-gray-600 dark:text-sushi-muted">
                                                        <div className="flex justify-between">
                                                            <span>Valor Día ({formatMoney(calculationPreview.fullResult.dailyBase)})</span>
                                                            <span className="font-mono">{((calculationPreview.fullResult.dailyBase)).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Minutos Oficiales</span>
                                                            <span className="font-mono">{calculationPreview.fullResult.officialMinutes}m ({calculationPreview.standardHours}h)</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Minutos Trabajados</span>
                                                            <span className="font-mono font-bold">{calculationPreview.fullResult.workedMinutes}m ({calculationPreview.workedHours}h)</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Valor Minuto</span>
                                                            <span className="font-mono">{calculationPreview.fullResult.minuteValue.toFixed(2)} $/m</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-end border-t border-gray-300 dark:border-white/10 pt-2 mt-1">
                                                        <span className="text-yellow-700 dark:text-sushi-gold font-bold uppercase text-xs">Monto Final Asistencia</span>
                                                        <span className="text-yellow-700 dark:text-sushi-gold font-bold text-xl">{formatMoney(calculationPreview.amount)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleAddRecord}
                                        className="w-full bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover transition-colors flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sushi-gold/20"
                                    >
                                        <Save className="w-5 h-5" />
                                        Registrar en Actas
                                    </button>
                                </>
                            )}

                            {(mode === 'ABSENCE' || mode === 'FRANCO') && (
                                // ABSENCE FORM
                                <>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Motivo de la Falta</label>
                                        <textarea
                                            value={absenceReason}
                                            onChange={(e) => setAbsenceReason(e.target.value)}
                                            placeholder="Ej. Enfermedad sin aviso..."
                                            rows={3}
                                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-red-500 transition-colors"
                                            required
                                        />
                                    </div>

                                    {mode === 'ABSENCE' && (
                                        <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer mb-2" onClick={() => setIsJustified(!isJustified)}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isJustified ? 'bg-sushi-gold border-sushi-gold text-sushi-black' : 'border-gray-400 dark:border-white/30'}`}>
                                                {isJustified && <Check className="w-3 h-3" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white select-none">Falta Justificada</p>
                                                <p className="text-xs text-gray-500 dark:text-sushi-muted select-none">Se contará como asistencia para el cálculo de haberes.</p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleAddRecord}
                                        className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors flex justify-center items-center gap-2 mt-2 shadow-lg shadow-red-600/20"
                                    >
                                        <CalendarX className="w-5 h-5" />
                                        Registrar {mode === 'FRANCO' ? 'Descanso' : 'Ausencia'}
                                    </button>
                                </>
                            )}

                            {mode === 'EVENT' && (
                                <>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Título del Recordatorio</label>
                                        <input
                                            type="text"
                                            value={eventTitle}
                                            onChange={(e) => setEventTitle(e.target.value)}
                                            placeholder="Ej. Reunión de Staff, Limpieza Profunda..."
                                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Visibilidad</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setEventVisibility('ALL')}
                                                className={`p-3 rounded-lg border text-xs font-bold transition-all ${eventVisibility === 'ALL' ? 'bg-purple-500 text-white border-purple-600' : 'bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10'}`}
                                            >
                                                Todo el Staff
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEventVisibility('ADMIN')}
                                                className={`p-3 rounded-lg border text-xs font-bold transition-all ${eventVisibility === 'ADMIN' ? 'bg-red-500 text-white border-red-600' : 'bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10'}`}
                                            >
                                                Solo Admins/Coord
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleAddRecord}
                                        className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-colors flex justify-center items-center gap-2 mt-2 shadow-lg shadow-purple-600/20"
                                    >
                                        <CalIcon className="w-5 h-5" />
                                        Crear Recordatorio
                                    </button>
                                </>
                            )}

                        </form>
                    </div>
                </div>
            )}
            {/* Add Event Modal */}
            {isAddEventModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-sushi-dark rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-white/10">
                        <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-4">Nuevo Evento / Feriado</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 dark:text-sushi-muted mb-1">Título</label>
                                <input
                                    type="text"
                                    value={newEventData.title}
                                    onChange={e => setNewEventData({ ...newEventData, title: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white"
                                    placeholder="Ej. Feriado Nacional"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 dark:text-sushi-muted mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={newEventData.date}
                                        onChange={e => setNewEventData({ ...newEventData, date: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 dark:text-sushi-muted mb-1">Tipo</label>
                                    <select
                                        value={newEventData.type}
                                        onChange={e => setNewEventData({ ...newEventData, type: e.target.value as any })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white"
                                    >
                                        <option value="EVENT">Evento Regular</option>
                                        <option value="DESCANSO">Día de Descanso (Pago General)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-500 dark:text-sushi-muted mb-1">Descripción (Opcional)</label>
                                <textarea
                                    value={newEventData.description}
                                    onChange={e => setNewEventData({ ...newEventData, description: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white h-20 resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                                <button
                                    onClick={() => setIsAddEventModalOpen(false)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveNewEvent}
                                    className="px-4 py-2 bg-sushi-gold text-sushi-black font-bold rounded-lg hover:bg-sushi-goldhover transition-colors shadow-lg shadow-sushi-gold/20"
                                >
                                    Guardar Evento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Reset Modal */}
            {isResetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-sushi-dark rounded-xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-white/10">
                        <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-500">
                            <AlertOctagon className="w-8 h-8" />
                            <h3 className="text-xl font-bold">Reiniciar Calendario</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-sushi-muted mb-6">
                            Selecciona los elementos que deseas <span className="font-bold text-red-500">ELIMINAR PERMANENTEMENTE</span>. Esta acción no se puede deshacer.
                        </p>

                        <div className="space-y-3 mb-6">
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={resetOptions.attendance}
                                    onChange={e => setResetOptions({ ...resetOptions, attendance: e.target.checked })}
                                    className="w-5 h-5 accent-red-600 rounded"
                                />
                                <div>
                                    <span className="font-bold text-gray-900 dark:text-white block">Asistencias y Fichadas</span>
                                    <span className="text-xs text-gray-500">Incluye horas extras, faltas y sanciones.</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={resetOptions.events} // Mapping 'Events' to general reminders
                                    onChange={e => setResetOptions({ ...resetOptions, events: e.target.checked })}
                                    className="w-5 h-5 accent-red-600 rounded"
                                />
                                <span className="font-bold text-gray-900 dark:text-white">Eventos y Recordatorios</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={resetOptions.holidays}
                                    onChange={e => setResetOptions({ ...resetOptions, holidays: e.target.checked })}
                                    className="w-5 h-5 accent-red-600 rounded"
                                />
                                <div>
                                    <span className="font-bold text-gray-900 dark:text-white block">Feriados y Descansos</span>
                                    <span className="text-xs text-gray-500">Días marcados como feriado o descanso general.</span>
                                </div>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsResetModalOpen(false)}
                                className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleResetCalendar}
                                disabled={!Object.values(resetOptions).some(Boolean)}
                                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Eliminar Datos
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
