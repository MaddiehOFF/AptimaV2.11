-- Create coordinator_notes table if it doesn't exist
create table if not exists coordinator_notes (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table coordinator_notes enable row level security;

-- Drop policy if it exists to avoid errors on re-run
drop policy if exists "Allow public access to coordinator_notes" on coordinator_notes;

-- Create policy for public access
create policy "Allow public access to coordinator_notes" on coordinator_notes for all using (true) with check (true);

-- Enable Realtime (idempotent-ish, usually doesn't error if already added, but good to check)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'coordinator_notes') then
    alter publication supabase_realtime add table coordinator_notes;
  end if;
end
$$;
