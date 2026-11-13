-- Supabase Advisors follow-up (checked by supabase/tests/07-function-privileges.sql).

-- signup_settings() returns the private blocked-email list; only the auth hook and the
-- new-user trigger (both security definer) need it. The apps read the public 'auth.signup'
-- setting directly.
revoke execute on function public.signup_settings() from public, anon, authenticated;
grant execute on function public.signup_settings() to supabase_auth_admin;

-- Trigger functions are never called directly (triggers fire without EXECUTE privilege).
revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.guard_profile_update() from public, anon, authenticated;
revoke execute on function public.guard_faculty_self_update() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_on_post() from public, anon, authenticated;
revoke execute on function public.add_touch_trigger(regclass) from public, anon, authenticated;

-- Fixed search_path for functions that had none.
alter function public.touch_row() set search_path = public;
alter function public.add_touch_trigger(regclass) set search_path = public;
alter function public.can_post_to_section(uuid) set search_path = public;
alter function public.version_in_effect(uuid, date) set search_path = public;
