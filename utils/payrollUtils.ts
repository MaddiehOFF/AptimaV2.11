import { Employee, OvertimeRecord, CalendarEvent, AbsenceRecord, PayrollMovement } from '../types';
import { calculateAttendanceAmount, AttendanceCalcInput, AttendanceCalcResult, parseSalaryToNumber, getMinutesDiff } from '../services/attendanceCalculator';

export { calculateAttendanceAmount, parseSalaryToNumber, getMinutesDiff };
export type { AttendanceCalcInput, AttendanceCalcResult };

// 36.4 HIROSHI TEST (STRICT)
export function runHiroshiTest() {
    console.log("--- RUNNING HIROSHI TEST (PHASE 36 STRICT) ---");

    // Data from User Request
    const result = calculateAttendanceAmount({
        salaryAmount: 800000,
        salaryPeriod: "monthly",
        officialStart: "16:00",
        officialEnd: "23:00", // 7h = 420m
        workedStart: "17:00",
        workedEnd: "23:00"    // 6h = 360m
    });

    console.log("TEST_HIROSHI", result);

    // Verification Log
    if (result.officialMinutes !== 420) console.error("HIROSHI FAIL: Official Minutes != 420");
    if (result.workedMinutes !== 360) console.error("HIROSHI FAIL: Worked Minutes != 360");
    if (result.amount > 10000) console.error("HIROSHI FAIL: Amount Absurdly High (>10k)");
}

export const calculateAccruedSalary = (
    employee: Employee,
    records: OvertimeRecord[],
    calendarEvents: CalendarEvent[],
    absences: AbsenceRecord[] = [],
    sanctions: string | any[] = [],
    targetDate: Date = new Date()
): { daysWorked: number; accruedAmount: number; progress: number; sanctionDeduction: number; realMinutes: number; officialMinutes: number; breakdown: { date: string; type: 'WORKED' | 'HOLIDAY' | 'ABSENCE' | 'SANCTION'; description: string; amount: number; time?: string; meta?: any }[] } => {

    const monthlySalary = parseSalaryToNumber(employee.monthlySalary || 0);
    if (monthlySalary === 0) return { daysWorked: 0, accruedAmount: 0, progress: 0, sanctionDeduction: 0, realMinutes: 0, officialMinutes: 0, breakdown: [] };

    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);

    // Start Date Logic
    let effectiveStartDate = startOfMonth;
    let inclusiveStart = true; // Default to inclusive for start of month

    if (employee.payrollStartDate) {
        effectiveStartDate = new Date(employee.payrollStartDate);
        inclusiveStart = true;
    } else if (employee.lastPaymentDate) {
        effectiveStartDate = new Date(employee.lastPaymentDate);
        inclusiveStart = false; // Last payment date implies "paid until this date", so start AFTER
    }

    const effectiveStartStr = effectiveStartDate.toISOString().split('T')[0];
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    const isRevelant = (dateStr: string) => {
        if (inclusiveStart) return dateStr >= effectiveStartStr && dateStr <= toDateStr(targetDate);
        return dateStr > effectiveStartStr && dateStr <= toDateStr(targetDate);
    };

    // 1. ATTENDANCE
    const monthlyAttendance = records.filter(r => {
        if (r.employeeId !== employee.id) return false;
        if (r.status === 'SCHEDULED') return false; // Phase 32 Anti-Cheat
        return isRevelant(r.date);
    });

    // 2. HOLIDAYS/CLOSED
    const monthlyHolidays = calendarEvents.filter(e => {
        if (e.type !== 'HOLIDAY' && e.type !== 'CLOSED' && e.type !== 'DESCANSO') return false;
        if (!isRevelant(e.date)) return false;
        const hasRecord = monthlyAttendance.some(r => r.date === e.date);
        return !hasRecord;
    });

    // 3. ABSENCES
    const monthlyJustifiedAbsences = absences.filter(a => {
        if (a.employeeId !== employee.id) return false;
        if (!a.justified) return false;
        return isRevelant(a.date);
    });

    // 4. SANCTIONS
    const monthlySanctions = (sanctions as any[]).filter(s => {
        if (s.employeeId !== employee.id) return false;
        if (s.type !== 'DESCUENTO') return false;
        if (s.deletedAt) return false;
        return isRevelant(s.date);
    });
    const sanctionDeduction = monthlySanctions.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const effectiveDays = monthlyAttendance.length + monthlyHolidays.length + monthlyJustifiedAbsences.length;

    // 5. CALCULATE PAY using NEW FUNCTION
    let totalAccrued = 0;
    let realMinutesTotal = 0;
    let officialMinutesTotal = 0;

    // Calculate Daily Base for fallback (Holidays/Absences) using parsed salary
    let dailyBaseFallback = 0;
    if (employee.paymentModality === 'QUINCENAL') dailyBaseFallback = monthlySalary / 15;
    else if (employee.paymentModality === 'SEMANAL') dailyBaseFallback = monthlySalary / 7;
    else dailyBaseFallback = monthlySalary / 30;

    // Breakdown Array for History Modal
    const breakdown: { date: string; type: 'WORKED' | 'HOLIDAY' | 'ABSENCE' | 'SANCTION'; description: string; amount: number; time?: string; meta?: any }[] = [];

    // process ATTENDANCE with STRICT LOGIC
    monthlyAttendance.forEach(r => {
        // Validate Inputs
        if (!r.checkIn || !r.checkOut) return; // Skip invalid records

        // Use Employee schedule or default if missing
        const offStart = employee.scheduleStart || "09:00";
        const offEnd = employee.scheduleEnd || "17:00";

        // Prepare Input for New Function
        const input: AttendanceCalcInput = {
            salaryAmount: monthlySalary,
            salaryPeriod: (employee.paymentModality === 'MENSUAL' || !employee.paymentModality) ? 'monthly' : (employee.paymentModality === 'QUINCENAL' ? 'biweekly' : 'weekly'),
            officialStart: offStart,
            officialEnd: offEnd,
            workedStart: r.checkIn,
            workedEnd: r.checkOut,
            isHoliday: calendarEvents.some(e => e.date === r.date && e.type === 'HOLIDAY'), // Detect Holiday
            holidayFactor: 2,
            overtimeFactor: 1.0
        };

        const result = calculateAttendanceAmount(input);

        // Accumulate
        totalAccrued += result.amount;
        realMinutesTotal += result.workedMinutes;
        officialMinutesTotal += result.officialMinutes;

        // Add to Breakdown
        breakdown.push({
            date: r.date,
            type: 'WORKED',
            description: `Jornada trabajada (${r.checkIn} - ${r.checkOut})`,
            amount: result.amount,
            time: r.checkIn,
            meta: {
                checkIn: r.checkIn,
                checkOut: r.checkOut,
                calcResult: result,
                origin: 'SYSTEM_ATTENDANCE'
            }
        });
    });

    // process HOLIDAYS & JUSTIFIED ABSENCES (Full Pay)
    const otherPaidDays = monthlyHolidays.length + monthlyJustifiedAbsences.length;
    totalAccrued += (otherPaidDays * dailyBaseFallback);

    // Add Holidays to Breakdown
    monthlyHolidays.forEach(h => {
        breakdown.push({
            date: h.date,
            type: 'HOLIDAY',
            description: `Feriado / Día Cerrado (${h.title || 'N/A'})`,
            amount: dailyBaseFallback,
            time: '00:00',
            meta: {
                title: h.title,
                origin: 'CALENDAR'
            }
        });
    });

    // Add Absences to Breakdown
    monthlyJustifiedAbsences.forEach(a => {
        breakdown.push({
            date: a.date,
            type: 'ABSENCE',
            description: `Ausencia Justificada (${a.reason || 'N/A'})`,
            amount: dailyBaseFallback,
            time: '00:00',
            meta: {
                reason: a.reason,
                origin: 'ABSENCE_RECORD'
            }
        });
    });

    // For metrics, assume standard shift (or employee's schedule) for holidays
    if (employee.scheduleStart && employee.scheduleEnd) {
        const offMins = getMinutesDiff(employee.scheduleStart, employee.scheduleEnd);
        officialMinutesTotal += (otherPaidDays * offMins);
    } else {
        officialMinutesTotal += (otherPaidDays * 480); // Default 8h
    }

    // 6. DEDUCTIONS & FINAL
    monthlySanctions.forEach(s => {
        breakdown.push({
            date: s.date,
            type: 'SANCTION',
            description: `Sanción / Descuento (${s.type || 'N/A'})`,
            amount: -(s.amount || 0),
            time: '00:00',
            meta: {
                reason: s.description,
                origin: 'DISCIPLINARY',
                createdBy: s.createdBy
            }
        });
    });

    totalAccrued -= sanctionDeduction;
    if (totalAccrued < 0) totalAccrued = 0;

    const progress = Math.min((totalAccrued / monthlySalary) * 100, 100);

    return {
        daysWorked: effectiveDays,
        accruedAmount: Math.round(totalAccrued),
        progress,
        sanctionDeduction,
        realMinutes: realMinutesTotal,
        officialMinutes: officialMinutesTotal,
        breakdown // Return the detailed breakdown
    };
};

/**
 * Calculates the total accrued amount based on ACTUAL payroll movements (Ledger).
 * This is the "Source of Truth" for what has been officially recorded.
 */
export const getLedgerAccrual = (
    employee: Employee,
    allMovements: PayrollMovement[],
    targetDate: Date = new Date()
): number => {
    if (!allMovements || allMovements.length === 0) return 0;

    // Determine relevant period (Month of targetDate)
    // Use manual string construction to avoid Timezone offsets shifting the date
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed

    let startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    // RESPECT PAYROLL START DATE
    // If employee has a specific start date (e.g. from "Concretar Nómina"), and it's within/after the view month, use it.
    if (employee.payrollStartDate) {
        if (employee.payrollStartDate > startStr) {
            startStr = employee.payrollStartDate;
        }
    }

    // Filter relevant movements
    const relevantMovements = allMovements.filter(m =>
        m.employee_id === employee.id &&
        m.date >= startStr &&
        m.date <= endStr &&
        m.status !== 'ANULADO' &&
        // Include positive accruals
        ['ASISTENCIA', 'AJUSTE', 'BONO', 'REINICIO'].includes(m.type)
    );

    return relevantMovements.reduce((sum, m) => sum + Number(m.amount), 0);
};
