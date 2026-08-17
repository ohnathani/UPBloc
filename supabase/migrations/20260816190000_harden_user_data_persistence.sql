-- Keep server-managed timestamps consistent for every mutable application row.
-- This migration is additive and does not remove or rewrite user data.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_schedule_entries_updated_at on public.schedule_entries;
create trigger set_schedule_entries_updated_at
before update on public.schedule_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
create trigger set_calendar_events_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

drop trigger if exists set_time_entries_updated_at on public.time_entries;
create trigger set_time_entries_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

-- Reassert the database boundary for private rows. The policies in the
-- initial data migration remain the source of the explicit CRUD rules.
alter table public.tasks enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.calendar_events enable row level security;
alter table public.time_entries enable row level security;
