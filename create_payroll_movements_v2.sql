-- Create payroll_movements table for Ledger-Based Payroll
-- Run this in Supabase SQL Editor if the table does not exist

CREATE TABLE IF NOT EXISTS public.payroll_movements (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_id TEXT, -- Optional link to OvertimeRecord
  date DATE NOT NULL,
  type TEXT NOT NULL, -- 'ASISTENCIA', 'SANCION', 'PAGO', 'AJUSTE', 'REINICIO'
  amount NUMERIC NOT NULL, -- Positive (Accrual) or Negative (Deduction/Payment)
  description TEXT,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'ANULADO'
  created_by TEXT,
  meta JSONB, -- Stores breakdown: { officialMinutes, workedMinutes, extraMinutes, holidayFactor, etc. }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns if table already exists (Idempotency)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_movements' AND column_name = 'attendance_id') THEN
        ALTER TABLE public.payroll_movements ADD COLUMN attendance_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_movements' AND column_name = 'status') THEN
        ALTER TABLE public.payroll_movements ADD COLUMN status TEXT DEFAULT 'ACTIVE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_movements' AND column_name = 'created_by') THEN
        ALTER TABLE public.payroll_movements ADD COLUMN created_by TEXT;
    END IF;
END $$;

-- Index for faster payroll queries
CREATE INDEX IF NOT EXISTS idx_payroll_movements_employee_date ON public.payroll_movements(employee_id, date);

-- Enable RLS (Optional, depending on your setup, usually good practice)
ALTER TABLE public.payroll_movements ENABLE ROW LEVEL SECURITY;

-- Allow all users (public/anon) to manage movements since effective auth is handled by App logic
-- Drop existing policy if exists to avoid error
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.payroll_movements;
CREATE POLICY "Enable all access for authenticated users" ON public.payroll_movements
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
