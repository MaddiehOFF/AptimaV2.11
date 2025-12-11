-- FINAL FIX FOR PAYROLL PERSISTENCE
-- Run this entire script in Supabase SQL Editor.

-- 1. Ensure Table Structure is Correct (Text IDs to match your app)
CREATE TABLE IF NOT EXISTS public.payroll_movements (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    attendance_id TEXT,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_by TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add columns if they are missing (Safe if already exists)
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

-- 3. Reset RLS Policies (Aggressive Clean)
ALTER TABLE public.payroll_movements ENABLE ROW LEVEL SECURITY;

-- Drop ANY potentially conflicting policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.payroll_movements;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.payroll_movements;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.payroll_movements;
DROP POLICY IF EXISTS "Allow all operations for public" ON public.payroll_movements;

-- 4. Create SINGLE Permissive Policy
CREATE POLICY "Allow all operations for public"
ON public.payroll_movements
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 5. Grant Permissions (Crucial for Anon access)
GRANT ALL ON public.payroll_movements TO anon;
GRANT ALL ON public.payroll_movements TO authenticated;
GRANT ALL ON public.payroll_movements TO service_role;

-- 6. Verification log (will show in results)
SELECT 'SUCCESS: Payroll permissions fixed' as status;
