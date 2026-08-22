-- The linked project contains empty, manually-created placeholder tables with
-- only id bigint and created_at timestamptz. Preserve those placeholders under
-- legacy names so the tracked schema migrations can create the real tables.
--
-- This migration intentionally aborts if a table contains rows or has any
-- unexpected shape. It never deletes or rewrites data.
do $$
declare
  target_table_name text;
  legacy_table_name text;
  row_count bigint;
  column_count integer;
begin
  foreach target_table_name in array array[
    'profiles',
    'tasks',
    'schedule_entries',
    'calendar_events',
    'time_entries',
    'forum_posts'
  ] loop
    if to_regclass(format('public.%I', target_table_name)) is null then
      continue;
    end if;

    execute format('select count(*) from public.%I', target_table_name)
      into row_count;

    if row_count <> 0 then
      raise exception
        'Refusing to reconcile public.%: it contains % row(s). Review and migrate that data explicitly first.',
        target_table_name,
        row_count;
    end if;

    select count(*)
      into column_count
    from information_schema.columns
    where table_schema = 'public'
      and information_schema.columns.table_name = target_table_name;

    if column_count <> 2
      or not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and information_schema.columns.table_name = target_table_name
          and column_name = 'id'
          and udt_name = 'int8'
      )
      or not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and information_schema.columns.table_name = target_table_name
          and column_name = 'created_at'
          and udt_name = 'timestamptz'
      ) then
      raise exception
        'Refusing to reconcile public.%; its schema is not the known empty placeholder shape.',
        target_table_name;
    end if;

    legacy_table_name := '_upbloc_legacy_' || target_table_name || '_placeholder';
    if to_regclass(format('public.%I', legacy_table_name)) is not null then
      raise exception
        'Refusing to overwrite existing legacy table public.%.',
        legacy_table_name;
    end if;

    execute format(
      'alter table public.%I rename to %I',
      target_table_name,
      legacy_table_name
    );
  end loop;
end
$$;
