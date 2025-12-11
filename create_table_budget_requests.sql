-- Create budget_requests table
CREATE TABLE IF NOT EXISTS budget_requests (
    id TEXT PRIMARY KEY,
    amount NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    "supplierName" TEXT,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP WITH TIME ZONE,
    "rejectionReason" TEXT
);

-- Enable RLS
ALTER TABLE budget_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (or adjust as needed)
-- DROP POLICY IF EXISTS "Public Access Budget Requests" ON budget_requests; -- Optional if re-running
CREATE POLICY "Public Access Budget Requests" ON budget_requests FOR ALL USING (true) WITH CHECK (true);

-- ENABLE REALTIME (Critical for "Últimas Novedades")
alter publication supabase_realtime add table budget_requests;
