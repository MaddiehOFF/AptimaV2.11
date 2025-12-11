-- CALENDAR EVENTS
create table calendar_events (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table calendar_events enable row level security;
create policy "Allow public access to calendar_events" on calendar_events for all using (true) with check (true);

alter publication supabase_realtime add table calendar_events;
