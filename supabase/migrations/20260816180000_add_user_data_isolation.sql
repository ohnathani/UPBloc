create extension if not exists pgcrypto;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  course text not null default '',
  due_date date,
  due_time text not null default '',
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo'
    check (status in ('todo', 'in-progress', 'completed')),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index tasks_user_id_idx on public.tasks (user_id);

alter table public.tasks enable row level security;

create policy "Users can view their own tasks"
on public.tasks
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own tasks"
on public.tasks
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
on public.tasks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own tasks"
on public.tasks
for delete
to authenticated
using (auth.uid() = user_id);

create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_code text not null default '',
  schedule_group_id text,
  course_code text not null,
  course_title text not null default '',
  section text not null default '',
  instructor text not null default '',
  room text not null default '',
  days text[] not null default '{}',
  start_time text not null default '',
  end_time text not null default '',
  units numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index schedule_entries_user_id_idx on public.schedule_entries (user_id);

alter table public.schedule_entries enable row level security;

create policy "Users can view their own schedule entries"
on public.schedule_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own schedule entries"
on public.schedule_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own schedule entries"
on public.schedule_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own schedule entries"
on public.schedule_entries
for delete
to authenticated
using (auth.uid() = user_id);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  type text not null
    check (type in ('study', 'task', 'exam', 'personal', 'other')),
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  location text not null default '',
  course text not null default '',
  task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (task_id, user_id)
    references public.tasks (id, user_id)
    on delete set null (task_id)
);

create index calendar_events_user_id_idx on public.calendar_events (user_id);
create index calendar_events_task_id_idx on public.calendar_events (task_id);

alter table public.calendar_events enable row level security;

create policy "Users can view their own calendar events"
on public.calendar_events
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own calendar events"
on public.calendar_events
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own calendar events"
on public.calendar_events
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own calendar events"
on public.calendar_events
for delete
to authenticated
using (auth.uid() = user_id);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid,
  event_id uuid,
  project_name text not null default '',
  course text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (task_id, user_id)
    references public.tasks (id, user_id)
    on delete set null (task_id),
  foreign key (event_id, user_id)
    references public.calendar_events (id, user_id)
    on delete set null (event_id)
);

create index time_entries_user_id_idx on public.time_entries (user_id);
create index time_entries_task_id_idx on public.time_entries (task_id);
create index time_entries_event_id_idx on public.time_entries (event_id);

alter table public.time_entries enable row level security;

create policy "Users can view their own time entries"
on public.time_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own time entries"
on public.time_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own time entries"
on public.time_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own time entries"
on public.time_entries
for delete
to authenticated
using (auth.uid() = user_id);

create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index forum_posts_created_at_idx on public.forum_posts (created_at desc);
create index forum_posts_user_id_idx on public.forum_posts (user_id);

alter table public.forum_posts enable row level security;

create policy "Authenticated users can view forum posts"
on public.forum_posts
for select
to authenticated
using (true);

create policy "Users can create their own forum posts"
on public.forum_posts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own forum posts"
on public.forum_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own forum posts"
on public.forum_posts
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete
on public.tasks, public.schedule_entries, public.calendar_events,
   public.time_entries, public.forum_posts
to authenticated;
