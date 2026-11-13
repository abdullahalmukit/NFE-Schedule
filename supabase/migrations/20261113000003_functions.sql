-- NFE Schedule — server functions called by the web app, admin panel and phone app.

-- ---------------------------------------------------------------- sign-up
-- Sign-up rules come from app_settings 'auth.signup' (admin: Settings > Sign-in):
--   domain_mode     "restricted" = only allowed_domains (and their subdomains), "any" = every email
--   allowed_domains ["diu.edu.bd"]
--   blocked emails are kept in the private key 'auth.blocked_emails'
--   auto_register   true  = first Google / email-code sign-in creates an active account
--                   false = account is created as 'pending' until an admin approves it
--   google, email_otp  which sign-in buttons the apps show
create or replace function public.signup_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select '{"domain_mode": "restricted", "allowed_domains": ["diu.edu.bd"], "blocked_emails": [],
           "auto_register": true, "google": true, "email_otp": false,
           "message_en": "This email address cannot be used to sign up.",
           "message_bn": "এই ইমেইল দিয়ে নিবন্ধন করা যাবে না।"}'::jsonb
         || coalesce((select value from app_settings where key = 'auth.signup' and deleted_at is null), '{}'::jsonb)
         || jsonb_build_object('blocked_emails', coalesce(
              (select value from app_settings where key = 'auth.blocked_emails' and deleted_at is null), '[]'::jsonb))
$$;

-- Auth hook: enforces the domain rule before an account is created.
-- Enable once in Supabase Dashboard > Authentication > Hooks > "Before User Created".
-- People the admin has invited (admin invite, CR email, faculty email) are always let in.
create or replace function public.hook_before_user_created(event jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  cfg     jsonb := signup_settings();
  v_email text  := lower(event->'user'->>'email');
  invited boolean;
  ok      boolean;
begin
  if exists (select 1 from jsonb_array_elements_text(cfg->'blocked_emails') b where lower(b) = v_email) then
    ok := false;
  else
    select exists (select 1 from admin_invites i where i.email = v_email::citext and i.accepted_at is null)
        or exists (select 1 from cr_assignments c where c.invited_email = v_email::citext and c.revoked_at is null)
        or exists (select 1 from faculty f where f.email = v_email::citext and f.status <> 'left' and f.deleted_at is null)
        or v_email = lower(coalesce((select value #>> '{}' from app_settings where key = 'auth.main_admin_email'), ''))
      into invited;
    ok := invited
       or cfg->>'domain_mode' = 'any'
       or exists (select 1 from jsonb_array_elements_text(cfg->'allowed_domains') d
                   where v_email like '%@' || lower(d) or v_email like '%.' || lower(d));
  end if;
  if ok then return '{}'::jsonb; end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', cfg->>'message_en'));
end $$;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.signup_settings() to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;

-- New auth user -> profile; links main admin, admin invites, faculty and pending CR assignments by email.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_email   citext := new.email;
  v_fac     uuid;
  v_inv     admin_invites%rowtype;
  v_trusted boolean;
begin
  select id into v_fac from faculty
   where email = v_email and status <> 'left' and deleted_at is null limit 1;

  -- Invited people are active at once; others wait for approval when auto_register is off.
  v_trusted := v_fac is not null
    or exists (select 1 from admin_invites where email = v_email and accepted_at is null)
    or exists (select 1 from cr_assignments where invited_email = v_email and revoked_at is null)
    or v_email = (select value #>> '{}' from app_settings where key = 'auth.main_admin_email')::citext;

  insert into profiles (id, email, full_name, avatar_url, account_type, faculty_id, status, locale)
  values (new.id, v_email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.raw_user_meta_data->>'avatar_url',
          case when v_fac is not null then 'faculty'::account_type else 'student'::account_type end,
          v_fac,
          case when v_trusted or coalesce((signup_settings()->>'auto_register')::boolean, true)
               then 'active'::user_status else 'pending'::user_status end,
          -- language for new users: admin setting i18n.default_locale, English otherwise
          coalesce((select value #>> '{}' from app_settings
                     where key = 'i18n.default_locale' and deleted_at is null
                       and value #>> '{}' in ('en', 'bn')), 'en'))
  on conflict (id) do nothing;

  if v_email = (select value #>> '{}' from app_settings where key = 'auth.main_admin_email')::citext
     and not exists (select 1 from admin_permissions where is_main and revoked_at is null) then
    insert into admin_permissions (user_id, is_main, areas) values (new.id, true, '{}');
  end if;

  select * into v_inv from admin_invites where email = v_email and accepted_at is null;
  if found then
    insert into admin_permissions (user_id, areas, granted_by) values (new.id, v_inv.areas, v_inv.invited_by)
    on conflict (user_id) do update set areas = excluded.areas, revoked_at = null;
    update admin_invites set accepted_at = now() where email = v_email;
  end if;

  update cr_assignments set user_id = new.id, invited_email = null
   where invited_email = v_email and user_id is null and revoked_at is null;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin approves or rejects a pending account (when auto_register is off).
create or replace function public.review_signup(p_user uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_admin_area('users') then raise exception 'Not allowed'; end if;
  update profiles set status = case when p_approve then 'active' else 'disabled' end::user_status
   where id = p_user and status = 'pending';
  if not found then raise exception 'Account is not waiting for approval'; end if;
  insert into notification_events (kind, title, body, target, created_by)
  values ('signup_status',
          case when p_approve then 'Your account is approved' else 'Your account was not approved' end,
          '', jsonb_build_object('user_ids', jsonb_build_array(p_user)), auth.uid());
end $$;

-- Student picks batch / section / lab group (validated against the active routine data).
create or replace function public.choose_section(p_section uuid, p_lab_group uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_batch uuid;
begin
  select batch_id into v_batch from sections where id = p_section and status = 'active' and deleted_at is null;
  if v_batch is null then raise exception 'Unknown section'; end if;
  if p_lab_group is not null and not exists (select 1 from lab_groups where id = p_lab_group and section_id = p_section) then
    raise exception 'Lab group does not belong to this section';
  end if;
  update profiles set batch_id = v_batch, section_id = p_section, lab_group_id = p_lab_group,
                      awaiting_routine = false
   where id = auth.uid();
end $$;

-- ---------------------------------------------------------------- class representatives
-- Any student may apply for any batch-section (see docs/REQUIREMENTS.md FR-CR-1).
create or replace function public.apply_for_cr(p_section uuid, p_message text default null, p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_policy jsonb := coalesce((select value from app_settings where key = 'cr.policy'), '{}');
begin
  if not is_active_member() then raise exception 'Sign in with an approved account first'; end if;
  if coalesce((v_policy->>'applications_open')::boolean, true) = false then
    raise exception 'CR applications are closed';
  end if;
  insert into cr_requests (user_id, section_id, semester_id, message, phone)
  values (auth.uid(), p_section, active_semester_id(), p_message, p_phone)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.review_cr_request(p_request uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r cr_requests%rowtype;
  v_max int := coalesce((select (value->>'max_per_section')::int from app_settings where key = 'cr.policy'), 2);
  v_count int;
begin
  if not has_admin_area('cr') then raise exception 'Not allowed'; end if;
  select * into r from cr_requests where id = p_request and status = 'pending' for update;
  if not found then raise exception 'Request not pending'; end if;

  if p_approve then
    select count(*) into v_count from cr_assignments
     where section_id = r.section_id and semester_id = r.semester_id and revoked_at is null;
    if v_count >= v_max then
      raise exception 'Section already has % CRs. Revoke one or raise the limit in Settings.', v_max;
    end if;
    insert into cr_assignments (section_id, semester_id, user_id, source, request_id, assigned_by)
    values (r.section_id, r.semester_id, r.user_id, 'request', r.id, auth.uid());
  end if;

  update cr_requests set status = case when p_approve then 'approved' else 'rejected' end::request_status,
         reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
   where id = p_request;

  insert into notification_events (kind, title, body, data, target, created_by)
  values ('cr_status',
          case when p_approve then 'CR access approved' else 'CR request not approved' end,
          coalesce(p_note, ''), jsonb_build_object('section_id', r.section_id),
          jsonb_build_object('user_ids', jsonb_build_array(r.user_id)), auth.uid());
end $$;

-- Admin assigns a CR directly: an existing user, or an email that will be linked on sign-up.
create or replace function public.assign_cr(p_section uuid, p_user uuid default null, p_email text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_max int := coalesce((select (value->>'max_per_section')::int from app_settings where key = 'cr.policy'), 2);
begin
  if not has_admin_area('cr') then raise exception 'Not allowed'; end if;
  if p_user is null and p_email is null then raise exception 'Choose a user or enter an email'; end if;
  if p_user is null then select id into p_user from profiles where email = p_email::citext; end if;
  if (select count(*) from cr_assignments where section_id = p_section
        and semester_id = active_semester_id() and revoked_at is null) >= v_max then
    raise exception 'Section already has % CRs', v_max;
  end if;
  insert into cr_assignments (section_id, semester_id, user_id, invited_email, source, assigned_by)
  values (p_section, active_semester_id(), p_user, case when p_user is null then p_email end, 'manual', auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.revoke_cr(p_assignment uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_admin_area('cr') then raise exception 'Not allowed'; end if;
  update cr_assignments set revoked_at = now(), revoked_by = auth.uid() where id = p_assignment;
end $$;

-- ---------------------------------------------------------------- routine publishing
-- The web server computes the diff (packages/parser diffRoutines) and passes
-- the affected sections / lab groups; this function makes it live atomically.
create or replace function public.publish_routine_version(
  p_version uuid,
  p_effective_from date,
  p_notify boolean,
  p_affected_section_ids uuid[] default '{}',
  p_affected_lab_group_ids uuid[] default '{}',
  p_summary text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v routine_versions%rowtype;
begin
  if not has_admin_area('routine') then raise exception 'Not allowed'; end if;
  select * into v from routine_versions where id = p_version for update;
  if v.status <> 'draft' then raise exception 'Only a draft can be published'; end if;

  update routine_versions set status = 'published', effective_from = coalesce(p_effective_from, current_date),
         published_by = auth.uid(), published_at = now()
   where id = p_version;

  -- Versions no longer in effect today are archived; a version scheduled
  -- for a future date leaves the current one live until that date.
  perform archive_superseded_versions(v.semester_id);

  if p_notify and (cardinality(p_affected_section_ids) > 0 or cardinality(p_affected_lab_group_ids) > 0) then
    insert into notification_events (kind, title, body, data, target, created_by)
    values ('routine_published', 'Routine updated',
            coalesce(p_summary, 'Your class routine has changed. Tap to see what changed.'),
            jsonb_build_object('version_id', p_version),
            jsonb_build_object('section_ids', to_jsonb(p_affected_section_ids),
                               'lab_group_ids', to_jsonb(p_affected_lab_group_ids)),
            auth.uid());
  end if;

  -- Students who registered before their batch existed: tell them it is live.
  insert into notification_events (kind, title, body, target, created_by)
  select 'routine_ready', 'Your routine is live', 'Pick your section to see your classes.',
         jsonb_build_object('user_ids', jsonb_agg(id)), auth.uid()
    from profiles where awaiting_routine and status = 'active'
  having count(*) > 0;
end $$;

-- Which published version is in effect for a date (scheduled versions are supported).
create or replace function public.version_in_effect(p_semester uuid, p_date date default current_date) returns uuid
language sql stable as $$
  select id from public.routine_versions
   where semester_id = p_semester and status = 'published' and deleted_at is null
     and coalesce(effective_from, '-infinity'::date) <= p_date
   order by effective_from desc nulls last, published_at desc limit 1
$$;

create or replace function public.archive_superseded_versions(p_semester uuid) returns void
language sql security definer set search_path = public as $$
  update routine_versions set status = 'archived'
   where semester_id = p_semester and status = 'published'
     and coalesce(effective_from, '-infinity'::date) <= current_date
     and id is distinct from version_in_effect(p_semester, current_date)
$$;
revoke execute on function public.archive_superseded_versions(uuid) from anon, authenticated, public;

-- Daily job (Vercel cron -> /api/cron/daily): archives superseded versions,
-- expires CR terms when a semester ends, and keeps the free database awake.
create or replace function public.daily_maintenance() returns text
language plpgsql security definer set search_path = public as $$
declare s uuid := active_semester_id();
begin
  if s is not null then
    perform archive_superseded_versions(s);
  end if;
  update cr_assignments a set revoked_at = now()
    from semesters m
   where a.semester_id = m.id and a.revoked_at is null and m.ends_on < current_date
     and coalesce((select (value->>'expire_with_semester')::boolean from app_settings where key = 'cr.policy'), true);
  return 'ok';
end $$;
revoke execute on function public.daily_maintenance() from anon, authenticated, public;
grant execute on function public.daily_maintenance() to service_role;

-- ---------------------------------------------------------------- notifications
-- Recipients of an event (used by the push-dispatch edge function and the in-app bell).
create or replace function public.event_recipients(p_event uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  with e as (select target from notification_events where id = p_event),
  sec as (select (jsonb_array_elements_text(coalesce(target->'section_ids','[]')))::uuid id from e),
  lab as (select (jsonb_array_elements_text(coalesce(target->'lab_group_ids','[]')))::uuid id from e),
  bat as (select (jsonb_array_elements_text(coalesce(target->'batch_ids','[]')))::uuid id from e),
  usr as (select (jsonb_array_elements_text(coalesce(target->'user_ids','[]')))::uuid id from e)
  select p.id from profiles p, e
   where p.status = 'active' and (
         coalesce((e.target->>'all')::boolean, false)
      or p.section_id in (select id from sec)
      or p.lab_group_id in (select id from lab)
      or p.batch_id in (select id from bat)
      or p.id in (select id from usr)
      or exists (select 1 from extra_enrolments x
                  where x.user_id = p.id and x.deleted_at is null
                    and (x.section_id in (select id from sec) or x.lab_group_id in (select id from lab))))
  union
  -- faculty teaching an affected section get section notices too
  select p.id from profiles p join class_slots cs on cs.faculty_id = p.faculty_id
   where p.account_type = 'faculty' and cs.deleted_at is null
     and cs.section_id in (select id from sec)
$$;
revoke execute on function public.event_recipients(uuid) from anon, authenticated, public;

create or replace function public.my_notifications(p_limit int default 50)
returns table (id uuid, kind text, title text, body text, data jsonb, created_at timestamptz, read boolean)
language sql stable security definer set search_path = public as $$
  select e.id, e.kind, e.title, e.body, e.data, e.created_at,
         exists (select 1 from notification_reads r where r.event_id = e.id and r.user_id = auth.uid())
    from notification_events e
   where auth.uid() in (select public.event_recipients(e.id))
   order by e.created_at desc limit p_limit
$$;

-- Class exceptions, notices and academic events create notification events automatically.
create or replace function public.notify_on_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_title text; v_body text; v_target jsonb;
begin
  if tg_table_name = 'class_exceptions' then
    v_title := case new.type when 'cancelled' then 'Class cancelled' when 'makeup' then 'Makeup class'
                             when 'room_change' then 'Room changed' else 'Class rescheduled' end;
    v_body  := coalesce(new.note, to_char(new.date, 'Dy DD Mon'));
    v_target := case when new.lab_group_id is not null
                     then jsonb_build_object('lab_group_ids', jsonb_build_array(new.lab_group_id))
                     else jsonb_build_object('section_ids', jsonb_build_array(new.section_id)) end;
  elsif tg_table_name = 'notices' then
    v_title := new.title; v_body := left(new.body, 140);
    v_target := case new.scope
      when 'department' then '{"all": true}'::jsonb
      when 'batch'      then jsonb_build_object('batch_ids', jsonb_build_array(new.batch_id))
      when 'lab_group'  then jsonb_build_object('lab_group_ids', jsonb_build_array(new.lab_group_id))
      else jsonb_build_object('section_ids', jsonb_build_array(new.section_id)) end;
  else -- academic_events
    v_title := initcap(replace(new.kind::text, '_', ' ')) || ': ' || new.title;
    v_body  := to_char(new.date, 'Dy DD Mon');
    v_target := case when new.lab_group_id is not null
                     then jsonb_build_object('lab_group_ids', jsonb_build_array(new.lab_group_id))
                     else jsonb_build_object('section_ids', jsonb_build_array(new.section_id)) end;
  end if;
  insert into notification_events (kind, title, body, data, target, created_by)
  values (case tg_table_name when 'class_exceptions' then 'class_exception'
                             when 'notices' then 'notice' else 'academic_event' end,
          v_title, v_body, jsonb_build_object('id', new.id, 'table', tg_table_name), v_target, auth.uid());
  return new;
end $$;

create trigger notify_exception after insert on public.class_exceptions for each row execute function public.notify_on_post();
create trigger notify_notice    after insert on public.notices          for each row execute function public.notify_on_post();
create trigger notify_event     after insert on public.academic_events  for each row execute function public.notify_on_post();

-- ---------------------------------------------------------------- offline sync for the phone app
-- Returns every row the caller may read that changed after p_since, including
-- soft-deleted rows (tombstones). RLS applies because this runs as the caller.
create or replace function public.sync_pull(p_since bigint default 0) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  t text;
  rows jsonb;
  result jsonb := jsonb_build_object('server_version', (select last_value from public.sync_seq));
begin
  foreach t in array array[
    'app_settings','feature_flags','i18n_overrides','departments','semesters','time_slots','batches',
    'sections','lab_groups','courses','faculty_directory','buildings','rooms','calendar_days',
    'routine_versions','class_slots','class_exceptions','notices','academic_events','section_crs',
    'app_releases','extra_enrolments','attendance_records','notes'
  ] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.sync_version > $1', t)
      into rows using p_since;
    result := result || jsonb_build_object(t, rows);
  end loop;
  -- own profile always
  result := result || jsonb_build_object('me', (select to_jsonb(p) from profiles p where p.id = auth.uid()));
  return result;
end $$;
grant execute on function public.sync_pull(bigint) to anon, authenticated;

grant usage, select on sequence public.sync_seq to anon, authenticated;
