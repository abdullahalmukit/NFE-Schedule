-- AUTH-3 follow-up: the main admin is normally created at first sign-in. If
-- auth.main_admin_email is set or corrected after that person already signed up,
-- they claim the role here (the apps call it after sign-in). Only while no main
-- admin exists, and only for the matching, active account.
create or replace function public.claim_main_admin() returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_email citext := (select value #>> '{}' from app_settings where key = 'auth.main_admin_email');
begin
  if auth.uid() is null or v_email is null then return false; end if;
  if exists (select 1 from admin_permissions where is_main and revoked_at is null) then return false; end if;
  if not exists (select 1 from profiles
                  where id = auth.uid() and email = v_email and status = 'active' and deleted_at is null) then
    return false;
  end if;
  insert into admin_permissions (user_id, is_main, areas, granted_at, revoked_at)
  values (auth.uid(), true, '{}', now(), null)
  on conflict (user_id) do update set is_main = true, areas = '{}', granted_at = now(), revoked_at = null;
  return true;
end $$;

revoke execute on function public.claim_main_admin() from public, anon;
grant execute on function public.claim_main_admin() to authenticated;
