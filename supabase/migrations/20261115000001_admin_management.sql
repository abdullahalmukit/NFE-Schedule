-- Admin management (AUTH-4, AUTH-5, ADM-ADM-1) and the admin dashboard counts (A-0).
-- Every function checks the caller itself; all writes go through the audit triggers.

create or replace function public.admin_area_names() returns text[]
language sql immutable set search_path = public as $$
  select array['routine','courses','faculty','batches','rooms','notices','cr','calendar',
               'settings','releases','users','reports']::text[]
$$;

create or replace function public.check_admin_areas(p_areas text[]) returns void
language plpgsql immutable set search_path = public as $$
begin
  if p_areas is null or cardinality(p_areas) = 0 then
    raise exception 'Tick at least one area';
  end if;
  if not (p_areas <@ public.admin_area_names()) then
    raise exception 'Unknown area in %', p_areas;
  end if;
end $$;

-- Invite by email: an existing account gets the areas at once; otherwise the
-- invite waits for the first sign-in (handle_new_user applies it). Returns
-- 'granted' or 'invited'.
create or replace function public.invite_admin(p_email text, p_areas text[]) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_email citext := lower(trim(p_email));
  v_user  uuid;
begin
  if not is_main_admin() then raise exception 'Only the main administrator can manage admins'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address';
  end if;
  perform check_admin_areas(p_areas);

  select id into v_user from profiles where email = v_email and deleted_at is null;
  if v_user is not null then
    if exists (select 1 from admin_permissions where user_id = v_user and is_main and revoked_at is null) then
      raise exception 'This person is the main administrator';
    end if;
    insert into admin_permissions (user_id, is_main, areas, granted_by, granted_at, revoked_at)
    values (v_user, false, p_areas, auth.uid(), now(), null)
    on conflict (user_id) do update
      set is_main = false, areas = excluded.areas, granted_by = excluded.granted_by,
          granted_at = now(), revoked_at = null;
    return 'granted';
  end if;

  insert into admin_invites (email, areas, invited_by, invited_at, accepted_at)
  values (v_email, p_areas, auth.uid(), now(), null)
  on conflict (email) do update
    set areas = excluded.areas, invited_by = excluded.invited_by, invited_at = now(), accepted_at = null;
  return 'invited';
end $$;

-- Change an admin's areas (takes effect on their next request).
create or replace function public.set_admin_areas(p_user uuid, p_areas text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_main_admin() then raise exception 'Only the main administrator can manage admins'; end if;
  perform check_admin_areas(p_areas);
  update admin_permissions set areas = p_areas
   where user_id = p_user and not is_main and revoked_at is null;
  if not found then raise exception 'Not an active admin'; end if;
end $$;

-- Remove admin access at once (the row is kept for the record).
create or replace function public.revoke_admin(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_main_admin() then raise exception 'Only the main administrator can manage admins'; end if;
  update admin_permissions set revoked_at = now()
   where user_id = p_user and not is_main and revoked_at is null;
  if not found then raise exception 'Not an active admin'; end if;
end $$;

create or replace function public.cancel_admin_invite(p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_main_admin() then raise exception 'Only the main administrator can manage admins'; end if;
  delete from admin_invites where email = lower(trim(p_email))::citext and accepted_at is null;
  if not found then raise exception 'No open invite for this email'; end if;
end $$;

-- Handover (AUTH-5): the new person becomes main administrator; the old one
-- stays an ordinary admin with every area until the new main admin changes that.
create or replace function public.transfer_main_admin(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if not is_main_admin() then raise exception 'Only the main administrator can transfer the role'; end if;
  if p_user = auth.uid() then raise exception 'You are already the main administrator'; end if;
  select email::text into v_email from profiles
   where id = p_user and status = 'active' and deleted_at is null;
  if v_email is null then raise exception 'Choose a signed-up, active account'; end if;

  update admin_permissions set is_main = false, areas = admin_area_names()
   where user_id = auth.uid() and is_main and revoked_at is null;
  insert into admin_permissions (user_id, is_main, areas, granted_by, granted_at, revoked_at)
  values (p_user, true, '{}', auth.uid(), now(), null)
  on conflict (user_id) do update
    set is_main = true, areas = '{}', granted_by = excluded.granted_by, granted_at = now(), revoked_at = null;
  -- Keep the bootstrap email in step so the role can never be re-claimed by the old address.
  update app_settings set value = to_jsonb(v_email) where key = 'auth.main_admin_email';
end $$;

-- A-0 dashboard: counts only, no personal data. Any admin may call it.
create or replace function public.admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s uuid := active_semester_id();
  v uuid;
begin
  if not is_any_admin() then raise exception 'Not allowed'; end if;
  if s is not null then v := version_in_effect(s, current_date); end if;
  return jsonb_build_object(
    'semester', (select jsonb_build_object('id', id, 'name', name) from semesters where id = s),
    'version', (select jsonb_build_object('id', id, 'label', label, 'effective_from', effective_from)
                  from routine_versions where id = v),
    'students_by_batch', coalesce((
      select jsonb_agg(jsonb_build_object('batch', b.code, 'students', n) order by b.code desc)
        from (select batch_id, count(*) n from profiles
               where account_type = 'student' and status = 'active' and batch_id is not null
                 and deleted_at is null group by batch_id) c
        join batches b on b.id = c.batch_id), '[]'::jsonb),
    'students_without_section', (select count(*) from profiles
                                  where account_type = 'student' and status = 'active'
                                    and section_id is null and deleted_at is null),
    'pending_signups', (select count(*) from profiles where status = 'pending' and deleted_at is null),
    'pending_cr_requests', (select count(*) from cr_requests where status = 'pending'),
    'open_reports', (select count(*) from issue_reports where status = 'open'),
    'admins', (select count(*) from admin_permissions where revoked_at is null)
  );
end $$;

-- Only signed-in callers; each function checks the role itself.
revoke execute on function public.invite_admin(text, text[]) from public, anon;
revoke execute on function public.set_admin_areas(uuid, text[]) from public, anon;
revoke execute on function public.revoke_admin(uuid) from public, anon;
revoke execute on function public.cancel_admin_invite(text) from public, anon;
revoke execute on function public.transfer_main_admin(uuid) from public, anon;
revoke execute on function public.admin_dashboard() from public, anon;
grant execute on function public.invite_admin(text, text[]) to authenticated;
grant execute on function public.set_admin_areas(uuid, text[]) to authenticated;
grant execute on function public.revoke_admin(uuid) to authenticated;
grant execute on function public.cancel_admin_invite(text) to authenticated;
grant execute on function public.transfer_main_admin(uuid) to authenticated;
grant execute on function public.admin_dashboard() to authenticated;
