-- Create Payroll Movements Table
CREATE TABLE IF NOT EXISTS public.payroll_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL, -- Link to Employee
    attendance_id UUID, -- Link to Attendance/OvertimeRecord (Nullable, as adjustments/payments won't have it)
    type TEXT NOT NULL, -- 'ASISTENCIA', 'PAGO', 'DESCUENTO', 'REINICIO', 'AJUSTE'
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL, -- YYYY-MM-DD
    description TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'ANULADO' (Soft Delete logic)
    
    -- Optional: Enforce uniqueness for attendance to avoid duplicates
    CONSTRAINT unique_attendance_movement UNIQUE (attendance_id)
);

-- Index for faster query by employee and date
CREATE INDEX IF NOT EXISTS idx_payroll_emp_date ON public.payroll_movements (employee_id, date);
