-- Read-only UPBloc database verification.
--
-- Run this after applying migrations. Every row should have status = PASS.
-- This script only reads PostgreSQL catalog views; it does not create, alter,
-- delete, or update anything.

with
expected_tables(table_name) as (
  values
    ('profiles'),
    ('tasks'),
    ('schedule_entries'),
    ('calendar_events'),
    ('time_entries'),
    ('forum_posts')
),
expected_columns(table_name, column_name, udt_name, is_nullable) as (
  values
    ('profiles', 'id', 'uuid', 'NO'),
    ('profiles', 'full_name', 'text', 'YES'),
    ('profiles', 'username', 'text', 'YES'),
    ('profiles', 'avatar_url', 'text', 'YES'),
    ('profiles', 'created_at', 'timestamptz', 'YES'),
    ('profiles', 'updated_at', 'timestamptz', 'YES'),

    ('tasks', 'id', 'uuid', 'NO'),
    ('tasks', 'user_id', 'uuid', 'NO'),
    ('tasks', 'title', 'text', 'NO'),
    ('tasks', 'description', 'text', 'NO'),
    ('tasks', 'course', 'text', 'NO'),
    ('tasks', 'due_date', 'date', 'YES'),
    ('tasks', 'due_time', 'text', 'NO'),
    ('tasks', 'priority', 'text', 'NO'),
    ('tasks', 'status', 'text', 'NO'),
    ('tasks', 'completed', 'bool', 'NO'),
    ('tasks', 'created_at', 'timestamptz', 'NO'),
    ('tasks', 'updated_at', 'timestamptz', 'NO'),

    ('schedule_entries', 'id', 'uuid', 'NO'),
    ('schedule_entries', 'user_id', 'uuid', 'NO'),
    ('schedule_entries', 'class_code', 'text', 'NO'),
    ('schedule_entries', 'schedule_group_id', 'text', 'YES'),
    ('schedule_entries', 'course_code', 'text', 'NO'),
    ('schedule_entries', 'course_title', 'text', 'NO'),
    ('schedule_entries', 'section', 'text', 'NO'),
    ('schedule_entries', 'instructor', 'text', 'NO'),
    ('schedule_entries', 'room', 'text', 'NO'),
    ('schedule_entries', 'days', '_text', 'NO'),
    ('schedule_entries', 'start_time', 'text', 'NO'),
    ('schedule_entries', 'end_time', 'text', 'NO'),
    ('schedule_entries', 'units', 'numeric', 'YES'),
    ('schedule_entries', 'created_at', 'timestamptz', 'NO'),
    ('schedule_entries', 'updated_at', 'timestamptz', 'NO'),

    ('calendar_events', 'id', 'uuid', 'NO'),
    ('calendar_events', 'user_id', 'uuid', 'NO'),
    ('calendar_events', 'title', 'text', 'NO'),
    ('calendar_events', 'description', 'text', 'NO'),
    ('calendar_events', 'type', 'text', 'NO'),
    ('calendar_events', 'start_datetime', 'timestamptz', 'NO'),
    ('calendar_events', 'end_datetime', 'timestamptz', 'NO'),
    ('calendar_events', 'location', 'text', 'NO'),
    ('calendar_events', 'course', 'text', 'NO'),
    ('calendar_events', 'task_id', 'uuid', 'YES'),
    ('calendar_events', 'created_at', 'timestamptz', 'NO'),
    ('calendar_events', 'updated_at', 'timestamptz', 'NO'),

    ('time_entries', 'id', 'uuid', 'NO'),
    ('time_entries', 'user_id', 'uuid', 'NO'),
    ('time_entries', 'task_id', 'uuid', 'YES'),
    ('time_entries', 'event_id', 'uuid', 'YES'),
    ('time_entries', 'project_name', 'text', 'NO'),
    ('time_entries', 'course', 'text', 'NO'),
    ('time_entries', 'start_at', 'timestamptz', 'NO'),
    ('time_entries', 'end_at', 'timestamptz', 'NO'),
    ('time_entries', 'duration_seconds', 'int4', 'NO'),
    ('time_entries', 'notes', 'text', 'NO'),
    ('time_entries', 'created_at', 'timestamptz', 'NO'),
    ('time_entries', 'updated_at', 'timestamptz', 'NO'),

    ('forum_posts', 'id', 'uuid', 'NO'),
    ('forum_posts', 'user_id', 'uuid', 'NO'),
    ('forum_posts', 'title', 'text', 'NO'),
    ('forum_posts', 'content', 'text', 'NO'),
    ('forum_posts', 'created_at', 'timestamptz', 'NO'),
    ('forum_posts', 'updated_at', 'timestamptz', 'NO')
),
expected_primary_keys(table_name) as (
  values
    ('profiles'),
    ('tasks'),
    ('schedule_entries'),
    ('calendar_events'),
    ('time_entries'),
    ('forum_posts')
),
expected_foreign_keys(
  child_table,
  child_column,
  parent_schema,
  parent_table,
  parent_column,
  delete_action,
  is_composite
) as (
  values
    ('profiles', 'id', 'auth', 'users', 'id', 'c', false),
    ('tasks', 'user_id', 'auth', 'users', 'id', 'c', false),
    ('schedule_entries', 'user_id', 'auth', 'users', 'id', 'c', false),
    ('calendar_events', 'user_id', 'auth', 'users', 'id', 'c', false),
    ('calendar_events', 'task_id', 'public', 'tasks', 'id', 'n', true),
    ('time_entries', 'user_id', 'auth', 'users', 'id', 'c', false),
    ('time_entries', 'task_id', 'public', 'tasks', 'id', 'n', true),
    ('time_entries', 'event_id', 'public', 'calendar_events', 'id', 'n', true),
    ('forum_posts', 'user_id', 'auth', 'users', 'id', 'c', false)
),
expected_policies(table_name, policy_name, command, owner_column) as (
  values
    ('profiles', 'Users can view their own profile', 'SELECT', 'id'),
    ('profiles', 'Users can create their own profile', 'INSERT', 'id'),
    ('profiles', 'Users can update their own profile', 'UPDATE', 'id'),
    ('profiles', 'Users can delete their own profile', 'DELETE', 'id'),
    ('tasks', 'Users can view their own tasks', 'SELECT', 'user_id'),
    ('tasks', 'Users can create their own tasks', 'INSERT', 'user_id'),
    ('tasks', 'Users can update their own tasks', 'UPDATE', 'user_id'),
    ('tasks', 'Users can delete their own tasks', 'DELETE', 'user_id'),
    ('schedule_entries', 'Users can view their own schedule entries', 'SELECT', 'user_id'),
    ('schedule_entries', 'Users can create their own schedule entries', 'INSERT', 'user_id'),
    ('schedule_entries', 'Users can update their own schedule entries', 'UPDATE', 'user_id'),
    ('schedule_entries', 'Users can delete their own schedule entries', 'DELETE', 'user_id'),
    ('calendar_events', 'Users can view their own calendar events', 'SELECT', 'user_id'),
    ('calendar_events', 'Users can create their own calendar events', 'INSERT', 'user_id'),
    ('calendar_events', 'Users can update their own calendar events', 'UPDATE', 'user_id'),
    ('calendar_events', 'Users can delete their own calendar events', 'DELETE', 'user_id'),
    ('time_entries', 'Users can view their own time entries', 'SELECT', 'user_id'),
    ('time_entries', 'Users can create their own time entries', 'INSERT', 'user_id'),
    ('time_entries', 'Users can update their own time entries', 'UPDATE', 'user_id'),
    ('time_entries', 'Users can delete their own time entries', 'DELETE', 'user_id'),
    ('forum_posts', 'Authenticated users can view forum posts', 'SELECT', null),
    ('forum_posts', 'Users can create their own forum posts', 'INSERT', 'user_id'),
    ('forum_posts', 'Users can update their own forum posts', 'UPDATE', 'user_id'),
    ('forum_posts', 'Users can delete their own forum posts', 'DELETE', 'user_id')
),
checks as (
  select
    'table'::text as check_group,
    e.table_name as check_name,
    case when t.table_name is not null then 'PASS' else 'FAIL' end as status,
    case when t.table_name is not null
      then 'Table exists'
      else 'Missing public table'
    end as details
  from expected_tables e
  left join information_schema.tables t
    on t.table_schema = 'public'
   and t.table_name = e.table_name

  union all

  select
    'column',
    e.table_name || '.' || e.column_name,
    case when c.column_name is not null then 'PASS' else 'FAIL' end,
    case when c.column_name is not null
      then 'Column, type, and nullability match'
      else 'Missing column or incorrect type/nullability'
    end
  from expected_columns e
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = e.table_name
   and c.column_name = e.column_name
   and c.udt_name = e.udt_name
   and c.is_nullable = e.is_nullable

  union all

  select
    'primary key',
    e.table_name,
    case when exists (
      select 1
      from pg_constraint c
      join pg_class r on r.oid = c.conrelid
      join pg_namespace n on n.oid = r.relnamespace
      where c.contype = 'p'
        and n.nspname = 'public'
        and r.relname = e.table_name
    ) then 'PASS' else 'FAIL' end,
    'Primary key exists'
  from expected_primary_keys e

  union all

  select
    'foreign key',
    e.child_table || '.' || e.child_column || ' -> ' ||
      e.parent_schema || '.' || e.parent_table || '.' || e.parent_column,
    case when exists (
      select 1
      from pg_constraint fk
      join pg_class child on child.oid = fk.conrelid
      join pg_namespace child_ns on child_ns.oid = child.relnamespace
      join pg_class parent on parent.oid = fk.confrelid
      join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
      join lateral unnest(fk.conkey) with ordinality child_key(attnum, position)
        on true
      join lateral unnest(fk.confkey) with ordinality parent_key(attnum, position)
        on parent_key.position = child_key.position
      join pg_attribute child_column
        on child_column.attrelid = child.oid
       and child_column.attnum = child_key.attnum
      join pg_attribute parent_column
        on parent_column.attrelid = parent.oid
       and parent_column.attnum = parent_key.attnum
      where fk.contype = 'f'
        and child_ns.nspname = 'public'
        and child.relname = e.child_table
        and child_column.attname = e.child_column
        and parent_ns.nspname = e.parent_schema
        and parent.relname = e.parent_table
        and parent_column.attname = e.parent_column
        and fk.confdeltype = e.delete_action
        and (not e.is_composite or cardinality(fk.conkey) >= 2)
    ) then 'PASS' else 'FAIL' end,
    'Foreign key and delete behavior match'
  from expected_foreign_keys e

  union all

  select
    'rls',
    e.table_name,
    case when exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = e.table_name
        and c.relrowsecurity
    ) then 'PASS' else 'FAIL' end,
    case when exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = e.table_name
        and c.relrowsecurity
    )
      then 'Row Level Security is enabled'
      else 'Row Level Security is disabled'
    end
  from expected_tables e

  union all

  select
    'policy',
    e.table_name || ': ' || e.policy_name,
    case when p.policyname is not null
      and 'authenticated' = any(p.roles)
      and (
        (e.owner_column is null
          and lower(coalesce(p.qual, '')) like '%true%')
        or (e.command = 'SELECT'
          and lower(coalesce(p.qual, '')) like '%auth.uid()%'
          and lower(coalesce(p.qual, '')) like '%' || lower(e.owner_column) || '%')
        or (e.command = 'INSERT'
          and lower(coalesce(p.with_check, '')) like '%auth.uid()%'
          and lower(coalesce(p.with_check, '')) like '%' || lower(e.owner_column) || '%')
        or (e.command = 'UPDATE'
          and lower(coalesce(p.qual, '')) like '%auth.uid()%'
          and lower(coalesce(p.with_check, '')) like '%auth.uid()%'
          and lower(coalesce(p.qual, '')) like '%' || lower(e.owner_column) || '%'
          and lower(coalesce(p.with_check, '')) like '%' || lower(e.owner_column) || '%')
        or (e.command = 'DELETE'
          and lower(coalesce(p.qual, '')) like '%auth.uid()%'
          and lower(coalesce(p.qual, '')) like '%' || lower(e.owner_column) || '%')
      ) then 'PASS' else 'FAIL' end,
    case when p.policyname is null
      then 'Missing policy'
      when not ('authenticated' = any(p.roles))
      then 'Policy does not target authenticated role'
      else 'Policy exists with an ownership check'
    end
  from (
    select table_name, policy_name, command, owner_column
    from expected_policies
  ) e
  left join pg_policies p
    on p.schemaname = 'public'
   and p.tablename = e.table_name
   and p.policyname = e.policy_name
   and p.cmd = e.command
)
select check_group, check_name, status, details
from checks
order by
  case when status = 'FAIL' then 0 else 1 end,
  check_group,
  check_name;
