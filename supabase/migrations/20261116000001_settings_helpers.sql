-- Settings and semesters (ADM-SET-1, ADM-SET-2).

-- Switch the active semester in one step (the unique index allows only one active).
create or replace function public.set_active_semester(p_semester uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_admin_area('routine') then raise exception 'Not allowed'; end if;
  if not exists (select 1 from semesters where id = p_semester and deleted_at is null) then
    raise exception 'Unknown semester';
  end if;
  update semesters set is_active = false where is_active and id <> p_semester;
  update semesters set is_active = true where id = p_semester;
end $$;

revoke execute on function public.set_active_semester(uuid) from public, anon;
grant execute on function public.set_active_semester(uuid) to authenticated;

-- Who last changed a setting (shown on the settings pages; history is in the audit log).
create or replace function public.set_updated_by() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_by := auth.uid();
  return new;
end $$;

revoke execute on function public.set_updated_by() from public, anon, authenticated;

create trigger set_updated_by before insert or update on public.app_settings
  for each row execute function public.set_updated_by();
