
CREATE TABLE IF NOT EXISTS office_notes (
    id UUID PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE office_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to office_notes" ON office_notes FOR ALL USING (true) WITH CHECK (true);
