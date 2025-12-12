-- DANGEROUS: DROP TABLES TO ENSURE CORRECT SCHEMA
DROP TABLE IF EXISTS emissions CASCADE; -- Legacy
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS absences CASCADE;
DROP TABLE IF EXISTS sanctions CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS checklist_snapshots CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS admin_tasks CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_sessions CASCADE;
DROP TABLE IF EXISTS cash_shifts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS fixed_expenses CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS projections CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS internal_messages CASCADE;
DROP TABLE IF EXISTS employee_notices CASCADE;
DROP TABLE IF EXISTS coordinator_notes CASCADE;
DROP TABLE IF EXISTS royalty_history CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS supplier_products CASCADE;
DROP TABLE IF EXISTS shopping_lists CASCADE;
DROP TABLE IF EXISTS budget_requests CASCADE;
DROP TABLE IF EXISTS user_activity_logs CASCADE;
DROP TABLE IF EXISTS office_documents CASCADE;
DROP TABLE IF EXISTS changelog_entries CASCADE;

-- NOW RECREATE WITH CORRECT STRUCTURE (ID + DATA JSONB)

-- USERS
create table app_users (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table app_users enable row level security;
create policy "Allow public access to app_users" on app_users for all using (true) with check (true);

-- EMPLOYEES
create table employees (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table employees enable row level security;
create policy "Allow public access to employees" on employees for all using (true) with check (true);

-- RECORDS
create table records (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table records enable row level security;
create policy "Allow public access to records" on records for all using (true) with check (true);

-- ABSENCES
create table absences (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table absences enable row level security;
create policy "Allow public access to absences" on absences for all using (true) with check (true);

-- SANCTIONS
create table sanctions (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table sanctions enable row level security;
create policy "Allow public access to sanctions" on sanctions for all using (true) with check (true);

-- TASKS
create table tasks (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table tasks enable row level security;
create policy "Allow public access to tasks" on tasks for all using (true) with check (true);

-- CHECKLIST SNAPSHOTS
create table checklist_snapshots (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table checklist_snapshots enable row level security;
create policy "Allow public access to checklist_snapshots" on checklist_snapshots for all using (true) with check (true);

-- POSTS
create table posts (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table posts enable row level security;
create policy "Allow public access to posts" on posts for all using (true) with check (true);

-- ADMIN TASKS
create table admin_tasks (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table admin_tasks enable row level security;
create policy "Allow public access to admin_tasks" on admin_tasks for all using (true) with check (true);

-- APP SETTINGS
create table app_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table app_settings enable row level security;
create policy "Allow public access to app_settings" on app_settings for all using (true) with check (true);

-- INVENTORY
create table inventory_items (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table inventory_items enable row level security;
create policy "Allow public access to inventory_items" on inventory_items for all using (true) with check (true);

create table inventory_sessions (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table inventory_sessions enable row level security;
create policy "Allow public access to inventory_sessions" on inventory_sessions for all using (true) with check (true);

-- CASH REGISTER
create table cash_shifts (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table cash_shifts enable row level security;
create policy "Allow public access to cash_shifts" on cash_shifts for all using (true) with check (true);

-- PRODUCTS
create table products (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table products enable row level security;
create policy "Allow public access to products" on products for all using (true) with check (true);

-- WALLET
create table wallet_transactions (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table wallet_transactions enable row level security;
create policy "Allow public access to wallet_transactions" on wallet_transactions for all using (true) with check (true);

-- EXPENSES & PARTNERS
create table fixed_expenses (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table fixed_expenses enable row level security;
create policy "Allow public access to fixed_expenses" on fixed_expenses for all using (true) with check (true);

create table partners (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table partners enable row level security;
create policy "Allow public access to partners" on partners for all using (true) with check (true);

create table projections (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table projections enable row level security;
create policy "Allow public access to projections" on projections for all using (true) with check (true);


-- ENABLE REALTIME FOR ALL
alter publication supabase_realtime add table app_users;
alter publication supabase_realtime add table employees;
alter publication supabase_realtime add table records;
alter publication supabase_realtime add table absences;
alter publication supabase_realtime add table sanctions;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table checklist_snapshots;
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table admin_tasks;
alter publication supabase_realtime add table app_settings;
alter publication supabase_realtime add table inventory_items;
alter publication supabase_realtime add table inventory_sessions;
alter publication supabase_realtime add table cash_shifts;
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table wallet_transactions;
alter publication supabase_realtime add table fixed_expenses;
alter publication supabase_realtime add table partners;
alter publication supabase_realtime add table projections;

-- CALENDAR EVENTS
create table if not exists calendar_events (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table calendar_events enable row level security;
drop policy if exists "Allow public access to calendar_events" on calendar_events;
create policy "Allow public access to calendar_events" on calendar_events for all using (true) with check (true);
alter publication supabase_realtime add table calendar_events;

-- COMMUNICATIONS & NOTES
create table internal_messages (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table internal_messages enable row level security;
create policy "Allow public access to internal_messages" on internal_messages for all using (true) with check (true);
alter publication supabase_realtime add table internal_messages;

create table employee_notices (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table employee_notices enable row level security;
create policy "Allow public access to employee_notices" on employee_notices for all using (true) with check (true);
alter publication supabase_realtime add table employee_notices;

create table coordinator_notes (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table coordinator_notes enable row level security;
create policy "Allow public access to coordinator_notes" on coordinator_notes for all using (true) with check (true);
alter publication supabase_realtime add table coordinator_notes;

-- ROYALTY HISTORY
create table if not exists royalty_history (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table royalty_history enable row level security;
drop policy if exists "Allow public access to royalty_history" on royalty_history;
create policy "Allow public access to royalty_history" on royalty_history for all using (true) with check (true);
alter publication supabase_realtime add table royalty_history;


-- DEFAULT ADMIN USER
INSERT INTO app_users (id, data)
VALUES (
  'admin-default-id',
  '{
    "username": "Adminsushiblack",
    "password": "admin",
    "email": "admin@sushiblack.com",
    "role": "ADMIN",
    "name": "Administrador",
    "permissions": {
      "viewHr": true,
      "manageHr": true,
      "viewOps": true,
      "manageOps": true,
      "viewFinance": true,
      "manageFinance": true,
      "viewInventory": true,
      "manageInventory": true,
      "superAdmin": true
    }
  }'::jsonb
);

-- SUPPLIERS MODULE
create table if not exists suppliers (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table suppliers enable row level security;
drop policy if exists "Allow public access to suppliers" on suppliers;
create policy "Allow public access to suppliers" on suppliers for all using (true) with check (true);
alter publication supabase_realtime add table suppliers;

create table if not exists supplier_products (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table supplier_products enable row level security;
drop policy if exists "Allow public access to supplier_products" on supplier_products;
create policy "Allow public access to supplier_products" on supplier_products for all using (true) with check (true);
alter publication supabase_realtime add table supplier_products;

create table if not exists shopping_lists (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table shopping_lists enable row level security;
drop policy if exists "Allow public access to shopping_lists" on shopping_lists;
create policy "Allow public access to shopping_lists" on shopping_lists for all using (true) with check (true);
alter publication supabase_realtime add table shopping_lists;

-- BUDGET REQUESTS (Fixed)
-- Note: schema uses generic jsonb 'data' for most tables, but budget_requests was defined with specific columns in previous scripts.
-- To maintain consistency with recent features, I will use SPECIFIC COLUMNS as per create_table_budget_requests.sql, 
-- OR switch to JSONB. 
-- The user has already created the table with generic columns. I should stick to that to avoid breaking their current data.
-- But wait, schema.sql above uses JSONB for everything.
-- If I want consistency, I should use JSONB.
-- BUT the component `BudgetRequestsView` inserts `id, amount, reason...`.
-- If I change to JSONB here, it might conflict with their running app code if I don't refactor the app code.
-- The user's code uses `useSupabaseCollection`. That hook handles `data` wrapper if generic, OR raw columns if typed?
-- `useSupabaseCollection` implementation:
-- It usually expects `data` column if it spreads it. 
-- Let's check `hooks/useSupabase.ts`? No, let's look at `BudgetRequestsView`.
-- `BudgetRequestsView` creates: `.insert([{ id, amount, ... }])`.
-- So it expects RAW columns.
-- `schema.sql` defines tables with `data` JSONB.
-- This means `BudgetRequestsView` creates a table DIFFERENT from the pattern of others.
-- I will Preserve the Specific Columns for BudgetRequests to match current code.

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
ALTER TABLE budget_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Budget Requests" ON budget_requests;
CREATE POLICY "Public Access Budget Requests" ON budget_requests FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE budget_requests;

-- V2.9 NEW FEATURES (JSONB for flexibility)

-- 1. USER ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Activity Logs" ON user_activity_logs;
CREATE POLICY "Public Access Activity Logs" ON user_activity_logs FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE user_activity_logs;

-- 2. OFFICE DOCUMENTS
CREATE TABLE IF NOT EXISTS office_documents (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
ALTER TABLE office_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Office Documents" ON office_documents;
CREATE POLICY "Public Access Office Documents" ON office_documents FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE office_documents;

-- 3. CHANGELOG ENTRIES
CREATE TABLE IF NOT EXISTS changelog_entries (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Changelog" ON changelog_entries;
CREATE POLICY "Public Access Changelog" ON changelog_entries FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE changelog_entries;

-- 4. WALLET CHAT MESSAGES (AI MEMORY)
CREATE TABLE IF NOT EXISTS wallet_chat_messages (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
ALTER TABLE wallet_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Wallet Chat" ON wallet_chat_messages;
CREATE POLICY "Public Access Wallet Chat" ON wallet_chat_messages FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_chat_messages;
