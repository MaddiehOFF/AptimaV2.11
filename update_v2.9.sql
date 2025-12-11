-- UPDATE V2.9: MASSIVE UPDATE FEATURES

-- 1. USER ACTIVITY LOGS (Horas Trabajadas)
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Activity Logs" ON user_activity_logs;
CREATE POLICY "Public Access Activity Logs" ON user_activity_logs FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE user_activity_logs;

-- 2. OFFICE DOCUMENTS (Módulo Oficina)
CREATE TABLE IF NOT EXISTS office_documents (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
ALTER TABLE office_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Office Documents" ON office_documents;
CREATE POLICY "Public Access Office Documents" ON office_documents FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE office_documents;

-- 3. CHANGELOG ENTRIES (Foro de Cambios Admin)
CREATE TABLE IF NOT EXISTS changelog_entries (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Changelog" ON changelog_entries;
CREATE POLICY "Public Access Changelog" ON changelog_entries FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE changelog_entries;

-- 4. APP USERS TAGS (Note: Tags will be stored in 'data' column, no schema change needed)
