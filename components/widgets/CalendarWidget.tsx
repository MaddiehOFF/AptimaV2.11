import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, MapPin, Clock, X, Info } from 'lucide-react';
import { CalendarEvent, OvertimeRecord, CashShift, AbsenceRecord, Employee } from '../../types';
import { calculateAttendanceAmount, AttendanceCalcInput } from '../../services/attendanceCalculator';
import { generateUUID } from '../../utils/uuid';

interface CalendarWidgetProps {
    events: CalendarEvent[];
    records: OvertimeRecord[];
    cashShifts: CashShift[];
    absences: AbsenceRecord[];
    daysOff?: AbsenceRecord[];
    holidays: string[];
    employees?: Employee[];
    onDayClick?: (date: string) => void;
    onAddEvent?: (event: CalendarEvent) => void;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ events = [], records = [], cashShifts = [], absences = [], daysOff = [], holidays = [], employees = [], onDayClick, onAddEvent }) => {
    const [currentDate, setCurrentDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [selectedDateDetails, setSelectedDateDetails] = useState<{ date: Date, events: CalendarEvent[], records: OvertimeRecord[], absences: AbsenceRecord[], daysOff: AbsenceRecord[], isHoliday: boolean } | null>(null);

    // Generate week days (Mon-Sun) based on currentDate
    const weekDays = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        startOfWeek.setDate(diff);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            days.push(d);
        }
        return days;
    }, [currentDate]);

    // Helper to get local YYYY-MM-DD
    const getLocalISOString = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const getDayData = (date: Date) => {
        // Use local YYYY-MM-DD construction to match App.tsx/OvertimeLog logic
        // This avoids timezone shifts that happen with .toISOString()
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const dayEvents = events.filter(e => e.date === dateStr);
        const dayRecords = records.filter(r => r.date === dateStr);
        const dayAbsences = absences.filter(a => a.date === dateStr);
        const dayDaysOff = daysOff.filter(a => a.date === dateStr);
        const isHoliday = holidays.includes(dateStr);
        return { dayEvents, dayRecords, dayAbsences, dayDaysOff, isHoliday };
    };

    const handleDayClick = (date: Date) => {
        const data = getDayData(date);
        setSelectedDateDetails({ date, events: data.dayEvents, records: data.dayRecords, absences: data.dayAbsences, daysOff: data.dayDaysOff, isHoliday: data.isHoliday });
        if (onDayClick) onDayClick(date.toISOString().split('T')[0]);
    };

    const getMonthName = () => {
        return weekDays[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    };

    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.id === id);
        return emp ? emp.name.split(' ')[0] : `Staff #${id.substring(0, 4)}`;
    };

    const [showAddEventModal, setShowAddEventModal] = useState(false);
    const [newEventData, setNewEventData] = useState<{ title: string; description: string; type: 'EVENT' | 'HOLIDAY' | 'CLOSED'; visibility: 'ADMIN' | 'ALL' | 'PRIVATE' }>({
        title: '',
        description: '',
        type: 'EVENT',
        visibility: 'PRIVATE' // Default to PRIVATE
    });
    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

    return (
        <div className="bg-white dark:bg-sushi-dark rounded-xl border border-gray-200 dark:border-white/5 shadow-sm h-full flex flex-col overflow-hidden relative">
            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalIcon className="w-5 h-5 text-sushi-gold" />
                    <h3 className="font-bold text-gray-900 dark:text-white capitalize">
                        {getMonthName()}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    {onAddEvent && (
                        <button
                            onClick={() => setShowAddEventModal(true)}
                            className="text-xs bg-sushi-gold text-sushi-black px-2 py-1 rounded font-bold hover:bg-sushi-goldhover"
                        >
                            + Evento
                        </button>
                    )}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-lg p-1">
                        <button
                            onClick={handlePrevWeek}
                            className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-md transition-colors text-gray-600 dark:text-gray-400"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleNextWeek}
                            className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-md transition-colors text-gray-600 dark:text-gray-400"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div >

            {/* Calendar Grid */}
            < div className="flex-1 overflow-x-auto" >
                <div className="min-w-[600px] h-full flex flex-col">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b border-gray-100 dark:border-white/5">
                        {weekDays.map((day, i) => (
                            <div key={i} className={`p-3 text-center border-r border-gray-100 dark:border-white/5 last:border-r-0 ${isToday(day) ? 'bg-sushi-gold/5' : ''}`}>
                                <p className="text-xs uppercase text-gray-500 dark:text-sushi-muted mb-1 font-bold">
                                    {day.toLocaleDateString('es-ES', { weekday: 'long' })}
                                </p>
                                <p className={`text-sm font-bold ${isToday(day) ? 'text-sushi-gold' : 'text-gray-900 dark:text-white'}`}>
                                    {day.getDate()}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 flex-1">
                        {weekDays.map((day, i) => {
                            const { dayEvents, dayRecords, dayAbsences, dayDaysOff, isHoliday } = getDayData(day);
                            const attendanceCount = new Set(dayRecords.map(r => r.employeeId)).size;

                            // Check for CLOSED or HOLIDAY events specifically
                            const isClosed = dayEvents.some(e => e.type === 'CLOSED');
                            const isHolidayEvent = dayEvents.some(e => e.type === 'HOLIDAY');
                            const effectivelyHoliday = isHoliday || isHolidayEvent;

                            return (
                                <div
                                    key={i}
                                    onClick={() => handleDayClick(day)}
                                    className={`
                                        border-r border-gray-100 dark:border-white/5 last:border-r-0 p-2 relative group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex flex-col gap-1
                                        ${isToday(day) ? 'bg-sushi-gold/5' : ''}
                                        ${effectivelyHoliday ? 'bg-purple-50 dark:bg-purple-500/10' : ''}
                                        ${isClosed && !effectivelyHoliday ? 'bg-gray-100 dark:bg-white/10' : ''}
                                        ${dayDaysOff.length > 0 && !effectivelyHoliday && !isClosed ? 'bg-cyan-50 dark:bg-cyan-500/10' : ''} 
                                    `}
                                >

                                    {effectivelyHoliday && (
                                        <div className="absolute top-1 right-1">
                                            <span className="flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                            </span>
                                        </div>
                                    )}

                                    {isClosed && (
                                        <div className="absolute top-1 right-1">
                                            <div className="text-[9px] font-bold bg-gray-800 text-white px-1 rounded uppercase">CERRADO</div>
                                        </div>
                                    )}

                                    {/* Attendance Marker */}
                                    {attendanceCount > 0 && (
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/10 px-1.5 py-0.5 rounded w-fit">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                {attendanceCount} presentes
                                            </div>
                                            {dayRecords.reduce((sum, r) => sum + r.overtimeAmount, 0) > 0 && (
                                                <div className="text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 px-1.5 py-0.5 rounded w-fit border border-orange-200 dark:border-orange-500/20">
                                                    +${Math.round(dayRecords.reduce((sum, r) => sum + r.overtimeAmount, 0)).toLocaleString()} Extras
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Days Off Marker */}
                                    {dayDaysOff.length > 0 && (
                                        <div className="flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-500/10 px-1.5 py-0.5 rounded w-fit">
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                            {dayDaysOff.length} descansos
                                        </div>
                                    )}

                                    {/* Absences Marker */}
                                    {dayAbsences.length > 0 && (
                                        <div className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 px-1.5 py-0.5 rounded w-fit">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                            {dayAbsences.length} ausentes
                                        </div>
                                    )}

                                    {/* Events */}
                                    <div className="flex-1 space-y-1">
                                        {dayEvents.map(event => (
                                            <div
                                                key={event.id}
                                                className={`text-[10px] p-1.5 rounded border truncate font-medium
                                                    ${event.type === 'HOLIDAY' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                        event.type === 'CLOSED' ? 'bg-gray-200 text-gray-700 border-gray-300' :
                                                            'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-300'}
                                                `}
                                                title={event.title}
                                            >
                                                {event.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div >

            {/* Details Modal / Popover */}
            {
                selectedDateDetails && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-sushi-dark/95 backdrop-blur-sm z-20 animate-fade-in p-6 overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-2xl font-serif text-gray-900 dark:text-white capitalize">
                                    {selectedDateDetails.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h4>
                                {selectedDateDetails.isHoliday && (
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300">
                                        FERIADO OFICIAL
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedDateDetails(null); }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Events Section */}
                            <div>
                                <h5 className="text-xs font-bold uppercase text-gray-400 dark:text-sushi-muted mb-3 flex items-center gap-2">
                                    <CalIcon className="w-3 h-3" /> Eventos
                                </h5>
                                {selectedDateDetails.events.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedDateDetails.events.map(e => (
                                            <div key={e.id} className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                                                <div className="flex justify-between">
                                                    <p className="font-bold text-blue-900 dark:text-blue-100 text-sm">{e.title}</p>
                                                    {e.type && <span className="text-[10px] font-bold px-1 rounded bg-white/50">{e.type}</span>}
                                                </div>
                                                {e.description && <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{e.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No hay eventos programados.</p>
                                )}
                            </div>

                            {/* Days Off Section */}
                            {selectedDateDetails.daysOff.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-bold uppercase text-gray-400 dark:text-sushi-muted mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                        Días de Descanso ({selectedDateDetails.daysOff.length})
                                    </h5>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                        {selectedDateDetails.daysOff.map(a => (
                                            <div key={a.id} className="bg-cyan-50 dark:bg-cyan-900/10 p-2 rounded border border-cyan-100 dark:border-cyan-500/10 flex justify-between items-center">
                                                <span className="text-xs font-medium text-gray-900 dark:text-white truncate">{getEmployeeName(a.employeeId)}</span>
                                                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium whitespace-nowrap ml-2">Descanso</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                {/* Attendance Section */}
                                <div>
                                    <h5 className="text-xs font-bold uppercase text-gray-400 dark:text-sushi-muted mb-3 flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> Asistencia ({new Set(selectedDateDetails.records.map(r => r.employeeId)).size})
                                    </h5>
                                    {selectedDateDetails.records.length > 0 ? (
                                        <div className="space-y-2">
                                            {Array.from(new Set(selectedDateDetails.records.map(r => r.employeeId))).map(empId => {
                                                const record = selectedDateDetails.records.find(r => r.employeeId === empId);
                                                const emp = employees.find(e => e.id === empId);

                                                let debugInfo = null;
                                                const isHolidayEvent = selectedDateDetails.events.some(e => e.type === 'HOLIDAY');
                                                const effectivelyHoliday = selectedDateDetails.isHoliday || isHolidayEvent;

                                                if (emp && record?.checkIn && record?.checkOut) {
                                                    debugInfo = calculateAttendanceAmount({
                                                        salaryAmount: emp.monthlySalary,
                                                        salaryPeriod: (emp.paymentModality === 'MENSUAL' || !emp.paymentModality) ? 'monthly' : (emp.paymentModality === 'QUINCENAL' ? 'biweekly' : (emp.paymentModality === 'SEMANAL' ? 'weekly' : 'daily')),
                                                        officialStart: emp.scheduleStart || "09:00",
                                                        officialEnd: emp.scheduleEnd || "17:00",
                                                        workedStart: record.checkIn,
                                                        workedEnd: record.checkOut,
                                                        isHoliday: effectivelyHoliday,
                                                        holidayFactor: 2, // Standard
                                                        overtimeFactor: 1.5 // Standard
                                                    });
                                                }

                                                return (
                                                    <div key={empId} className="flex flex-col gap-1 p-2 rounded bg-green-50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-center">
                                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                                        {getEmployeeName(empId)}
                                                                    </p>
                                                                    {debugInfo && debugInfo.extraAmount > 0 && (
                                                                        <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1 rounded">
                                                                            +{Math.round(debugInfo.extraMinutes / 60 * 100) / 100} hrs extras
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-gray-500">
                                                                    {record?.checkIn} - {record?.checkOut}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {debugInfo && (
                                                            <div className="mt-1 p-2 bg-white dark:bg-black/20 rounded border border-gray-200 dark:border-white/5 text-[10px] font-mono text-gray-600 dark:text-gray-400 space-y-1">
                                                                <p className="font-bold border-b border-gray-100 dark:border-white/5 mb-1 pb-1">Detalle cálculo {effectivelyHoliday ? '(FERIADO x2)' : ''}:</p>
                                                                <div className="grid grid-cols-2 gap-x-2">
                                                                    <span>Mins Oficiales:</span> <span className="text-right">{debugInfo.officialMinutes}</span>
                                                                    <span>Mins Trabajados:</span> <span className="text-right">{debugInfo.workedMinutes}</span>
                                                                    {debugInfo.extraMinutes > 0 && (
                                                                        <>
                                                                            <span className="text-orange-600 font-bold">Mins Extras:</span> <span className="text-right text-orange-600 font-bold">{debugInfo.extraMinutes}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className="border-t border-gray-100 dark:border-white/5 pt-1 mt-1 grid grid-cols-2 gap-x-2">
                                                                    <span>Base:</span> <span className="text-right">${Math.round(debugInfo.baseAmount).toLocaleString()}</span>
                                                                    {debugInfo.extraAmount > 0 && (
                                                                        <>
                                                                            <span className="text-orange-600">Extras:</span> <span className="text-right text-orange-600">+${Math.round(debugInfo.extraAmount).toLocaleString()}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className="border-t border-gray-100 dark:border-white/5 pt-1 mt-1 flex justify-between font-bold text-green-700 dark:text-green-400">
                                                                    <span>Monto Final:</span>
                                                                    <span>${debugInfo.amount.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">Sin registros.</p>
                                    )}
                                </div>

                                {/* Absences Section */}
                                <div>
                                    <h5 className="text-xs font-bold uppercase text-gray-400 dark:text-sushi-muted mb-3 flex items-center gap-2">
                                        <MapPin className="w-3 h-3" /> Ausencias ({selectedDateDetails.absences.length})
                                    </h5>
                                    {selectedDateDetails.absences.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedDateDetails.absences.map(a => (
                                                <div key={a.id} className="flex items-center gap-2 p-2 rounded bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10">
                                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                            {getEmployeeName(a.employeeId)}
                                                        </p>
                                                        <p className="text-[10px] text-red-500 line-clamp-1">
                                                            {a.reason}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">Sin ausencias.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ADD EVENT MODAL */}
            {
                showAddEventModal && (
                    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-sushi-dark rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-white/10">
                            <h3 className="text-lg font-bold mb-4 dark:text-white">Nuevo Evento</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Título</label>
                                    <input
                                        value={newEventData.title}
                                        onChange={e => setNewEventData({ ...newEventData, title: e.target.value })}
                                        className="w-full p-2 rounded border bg-gray-50 dark:bg-black/20 dark:border-white/10 dark:text-white"
                                        placeholder="Ej. Feriado Nacional"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={eventDate}
                                        onChange={e => {
                                            setEventDate(e.target.value);
                                            // Also update internal state if we were using it, but we'll use eventDate ref in submit
                                        }}
                                        className="w-full p-2 rounded border bg-gray-50 dark:bg-black/20 dark:border-white/10 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Tipo</label>
                                    <select
                                        value={newEventData.type}
                                        onChange={e => setNewEventData({ ...newEventData, type: e.target.value as any })}
                                        className="w-full p-2 rounded border bg-gray-50 dark:bg-black/20 dark:border-white/10 dark:text-white"
                                    >
                                        <option value="EVENT">Evento General</option>
                                        <option value="CLOSED">Cierre / Franco Local (Cuenta como asistencia)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Privacidad</label>
                                    <div className="flex bg-gray-50 dark:bg-black/20 rounded p-1 border border-gray-200 dark:border-white/10">
                                        <button
                                            onClick={() => setNewEventData({ ...newEventData, visibility: 'PRIVATE' })}
                                            className={`flex-1 text-xs py-1.5 rounded font-bold transition-colors ${newEventData.visibility === 'PRIVATE' ? 'bg-sushi-gold text-sushi-black' : 'text-gray-500 dark:text-gray-400'}`}
                                        >
                                            Solo Mío
                                        </button>
                                        <button
                                            onClick={() => setNewEventData({ ...newEventData, visibility: 'ALL' })}
                                            className={`flex-1 text-xs py-1.5 rounded font-bold transition-colors ${newEventData.visibility === 'ALL' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                                        >
                                            Público
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Descripción</label>
                                    <textarea
                                        value={newEventData.description}
                                        onChange={e => setNewEventData({ ...newEventData, description: e.target.value })}
                                        className="w-full p-2 rounded border bg-gray-50 dark:bg-black/20 dark:border-white/10 dark:text-white h-20 resize-none"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setShowAddEventModal(false)} className="flex-1 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold">Cancelar</button>
                                    <button
                                        onClick={() => {
                                            if (onAddEvent) {
                                                onAddEvent({
                                                    id: generateUUID(),
                                                    title: newEventData.title,
                                                    description: newEventData.description,
                                                    date: eventDate,
                                                    createdBy: 'Admin',
                                                    visibility: newEventData.visibility,
                                                    type: newEventData.type
                                                });
                                                setShowAddEventModal(false);
                                                setNewEventData({ title: '', description: '', type: 'EVENT', visibility: 'ALL' });
                                            }
                                        }}
                                        className="flex-1 py-2 rounded bg-sushi-gold text-sushi-black font-bold hover:bg-sushi-goldhover"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
