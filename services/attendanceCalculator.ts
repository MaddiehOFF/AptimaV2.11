
// SERVICE: Centralized Attendance Calculator
// Single Source of Truth for all attendance math (Widget, Calendar, Payroll)

// 1. Strict Sanitization
export function parseSalaryToNumber(raw: any): number {
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
        let cleaned = raw.replace(/[^\d,.-]/g, "");
        cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
        const num = Number(cleaned);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

export interface AttendanceCalcInput {
    salaryAmount: any;
    salaryPeriod: "monthly" | "biweekly" | "weekly" | "daily"; // Added 'daily'
    officialStart: string; // "HH:mm"
    officialEnd: string;   // "HH:mm"
    workedStart: string;   // "HH:mm"
    workedEnd: string;     // "HH:mm"
    // New Params
    isHoliday?: boolean;
    holidayFactor?: number; // Default 2
    overtimeFactor?: number; // Default 1.0 (Linear)
}

export interface AttendanceCalcResult {
    dailyBase: number;
    officialMinutes: number;
    workedMinutes: number;
    minuteValue: number;
    amount: number;
    // Breakdown
    baseMinutes: number;
    extraMinutes: number;
    baseAmount: number;
    extraAmount: number;
    isHoliday: boolean;
    holidayFactor: number;
}

// 2. Helper: Real Minutes
export function getMinutesDiff(hhmmStart: string, hhmmEnd: string): number {
    if (!hhmmStart || !hhmmEnd) return 0;
    const [sh, sm] = hhmmStart.split(":").map(Number);
    const [eh, em] = hhmmEnd.split(":").map(Number);

    const start = sh * 60 + sm;
    let end = eh * 60 + em;

    if (end < start) {
        end += 24 * 60;
    }

    return end - start;
}

// 3. STRICT CALCULATION FUNCTION (Refined v2)
export function calculateAttendanceAmount(input: AttendanceCalcInput): AttendanceCalcResult {
    const { salaryPeriod, officialStart, officialEnd, workedStart, workedEnd, isHoliday = false, holidayFactor = 2, overtimeFactor = 1.0 } = input;

    // Step 1: Parse Salary
    const baseVal = parseSalaryToNumber(input.salaryAmount);

    // Step 2: Daily Base
    let dailyBase: number;
    if (salaryPeriod === "monthly") {
        dailyBase = baseVal / 30;
    } else if (salaryPeriod === "biweekly") {
        dailyBase = baseVal / 15;
    } else if (salaryPeriod === "weekly") {
        dailyBase = baseVal / 7;
    } else {
        dailyBase = baseVal; // daily
    }

    // Step 3: Minutes
    const officialMinutes = getMinutesDiff(officialStart, officialEnd);
    const workedMinutes = getMinutesDiff(workedStart, workedEnd);

    // Basic Validation
    if (officialMinutes <= 0 || workedMinutes <= 0) {
        return {
            dailyBase,
            officialMinutes: officialMinutes > 0 ? officialMinutes : 0,
            workedMinutes: workedMinutes > 0 ? workedMinutes : 0,
            minuteValue: 0,
            amount: 0,
            baseMinutes: 0,
            extraMinutes: 0,
            baseAmount: 0,
            extraAmount: 0,
            isHoliday,
            holidayFactor
        };
    }

    // Step 4: Logic
    // Valor por minuto = ValorDia / MinutosOficiales
    const minuteValue = dailyBase / officialMinutes;

    // Minutos Base (capped at official) vs Extras
    const baseMinutes = Math.min(workedMinutes, officialMinutes);
    const extraMinutes = Math.max(workedMinutes - officialMinutes, 0);

    const baseAmount = baseMinutes * minuteValue;
    const extraAmount = extraMinutes * minuteValue * overtimeFactor;

    let finalAmount = baseAmount + extraAmount;

    // Holiday Application
    if (isHoliday) {
        finalAmount = finalAmount * holidayFactor;
    }

    // Step 6: NO CAPS (Removed "min(amount, dailyBase)")

    return {
        dailyBase,
        officialMinutes,
        workedMinutes,
        minuteValue,
        amount: Math.round(finalAmount),
        baseMinutes,
        extraMinutes,
        baseAmount,
        extraAmount,
        isHoliday,
        holidayFactor
    };
}
