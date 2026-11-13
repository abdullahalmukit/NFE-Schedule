-- NFE Schedule — access rules
-- Roles: guest (anon), student, CR (student with an active cr_assignment),
-- faculty, admin (areas granted by the main admin), main admin.
-- Rules are enforced here, on the server, not only hidden in the UI.

-- ---------------------------------------------------------------- helper functions
create or replace function public.active_semester_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from semesters where is_active and deleted_at is null limit 1
$$;

create or replace function public.is_main_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_permissions
                 where user_id = auth.uid() and is_main and revoked_at is null)
$$;

create or replace function public.has_admin_area(area text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_permissions
                 where user_id = auth.uid() and revoked_at is null
                   and (is_main or area = any(areas)))
$$;

create or replace function public.is_any_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_permissions where user_id = auth.uid() and revoked_at is null)
$$;

-- Signed in with an active (approved, not alumni / disabled) account.
create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active')
$$;

create or replace function public.is_cr_of(p_section uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cr_assignments
                 where user_id = auth.uid() and section_id = p_section
                   and semester_id = active_semester_id() and revoked_at is null and deleted_at is null)
$$;

create or replace function public.my_faculty_id() returns uuid
language sql stable security definer set search_path = public as $$
  select faculty_id from profiles where id = auth.uid() and account_type = 'faculty'
$$;

-- Published versions of the active semester (any of them may be in effect).
create or replace function public.teaches_section(p_section uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_slots cs
    join routine_versions v on v.id = cs.version_id
    where cs.section_id = p_section and cs.deleted_at is null
      and cs.faculty_id = my_faculty_id()
      and v.status = 'published' and v.semester_id = active_semester_id())
$$;

-- Who may post to a section (notices, events, exceptions).
create or replace function public.can_post_to_section(p_section uuid) returns boolean
language sql stable as $$
  select public.is_active_member() and (public.is_cr_of(p_section) or public.teaches_section(p_section)
      or public.has_admin_area('notices') or public.has_admin_area('routine'))
$$;

-- ---------------------------------------------------------------- public views
-- Guests see initials, names and designations only.
create or replace view public.faculty_public as
  select f.id, f.initial, d.code as department, f.full_name, f.designation, f.is_guest,
         f.status, f.photo_path, f.updated_at, f.deleted_at, f.sync_version
  from public.faculty f left join public.departments d on d.id = f.department_id;

-- Signed-in members also see the contacts each teacher chose to show.
create or replace view public.faculty_directory as
  select f.id, f.initial, d.code as department, f.full_name, f.designation, f.is_guest,
         f.status, f.photo_path,
         case when public.is_active_member() and (f.contact_visibility->>'email')::boolean       then f.email end       as email,
         case when public.is_active_member() and (f.contact_visibility->>'phone')::boolean       then f.phone end       as phone,
         case when public.is_active_member() and (f.contact_visibility->>'office_room')::boolean then f.office_room end as office_room,
         case when public.is_active_member() then f.consultation_hours end as consultation_hours,
         f.updated_at, f.deleted_at, f.sync_version
  from public.faculty f left join public.departments d on d.id = f.department_id;

-- CR names per section (no emails).
create or replace view public.section_crs as
  select a.section_id, a.semester_id, p.id as user_id, p.full_name, a.updated_at, a.deleted_at, a.sync_version
  from public.cr_assignments a join public.profiles p on p.id = a.user_id
  where a.revoked_at is null;

grant select on public.faculty_public, public.faculty_directory to anon, authenticated;
grant select on public.section_crs to authenticated;

-- ---------------------------------------------------------------- enable RLS everywhere
do $$
declare t text;
begin
  foreach t in array array[
    'app_settings','feature_flags','i18n_overrides','departments','semesters','time_slots','batches',
    'sections','lab_groups','courses','faculty','buildings','rooms','calendar_days','profiles',
    'section_changes','admin_permissions','admin_invites','routine_versions','class_slots',
    'class_exceptions','extra_enrolments','import_runs','import_mapping_presets','cr_requests',
    'cr_assignments','notices','academic_events','notification_events','notification_reads',
    'push_tokens','attendance_records','notes','issue_reports','app_releases','audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- public reference data: read for all, write for the right admin area
do $$
declare r record;
begin
  for r in select * from (values
    ('departments','faculty'), ('semesters','routine'), ('time_slots','routine'),
    ('batches','batches'), ('sections','batches'), ('lab_groups','batches'),
    ('courses','courses'), ('buildings','rooms'), ('rooms','rooms'),
    ('calendar_days','calendar'), ('feature_flags','settings'), ('i18n_overrides','settings'),
    ('app_releases','releases')
  ) as x(tbl, area) loop
    execute format('create policy "%1$s read" on public.%1$I for select to anon, authenticated using (true)', r.tbl);
    execute format('create policy "%1$s admin write" on public.%1$I for all to authenticated
                    using (public.has_admin_area(%2$L)) with check (public.has_admin_area(%2$L))', r.tbl, r.area);
  end loop;
end $$;

create policy "settings read public" on public.app_settings for select to anon, authenticated
  using (is_public or public.has_admin_area('settings'));
create policy "settings admin write" on public.app_settings for all to authenticated
  using (public.has_admin_area('settings')) with check (public.has_admin_area('settings'));

-- Faculty base table: admins only (everyone else reads the views above).
create policy "faculty admin" on public.faculty for all to authenticated
  using (public.has_admin_area('faculty')) with check (public.has_admin_area('faculty'));
-- A teacher edits own contact details and consultation hours (column guard in trigger below).
create policy "faculty self update" on public.faculty for update to authenticated
  using (id = public.my_faculty_id()) with check (id = public.my_faculty_id());

-- ---------------------------------------------------------------- routine
create policy "versions read published" on public.routine_versions for select to anon, authenticated
  using (status = 'published' or public.has_admin_area('routine'));
create policy "versions admin" on public.routine_versions for all to authenticated
  using (public.has_admin_area('routine')) with check (public.has_admin_area('routine'));

create policy "slots read published" on public.class_slots for select to anon, authenticated
  using (exists (select 1 from public.routine_versions v where v.id = version_id and v.status = 'published')
         or public.has_admin_area('routine'));
create policy "slots admin" on public.class_slots for all to authenticated
  using (public.has_admin_area('routine')) with check (public.has_admin_area('routine'));

create policy "exceptions read" on public.class_exceptions for select to anon, authenticated using (true);
create policy "exceptions write" on public.class_exceptions for insert to authenticated
  with check (public.can_post_to_section(section_id) and created_by = auth.uid());
create policy "exceptions edit" on public.class_exceptions for update to authenticated
  using (public.can_post_to_section(section_id)) with check (public.can_post_to_section(section_id));

-- ---------------------------------------------------------------- profiles
create policy "profile self read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_admin_area('users') or public.has_admin_area('cr'));
create policy "profile self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profile admin" on public.profiles for update to authenticated
  using (public.has_admin_area('users')) with check (public.has_admin_area('users'));

create policy "section changes own" on public.section_changes for select to authenticated
  using (user_id = auth.uid() or public.has_admin_area('users'));

-- Students may not change their own account type, status, faculty link.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not has_admin_area('users') then
    new.account_type := old.account_type;
    new.status       := old.status;
    new.faculty_id   := old.faculty_id;
    new.email        := old.email;
  end if;
  if new.section_id is distinct from old.section_id or new.lab_group_id is distinct from old.lab_group_id then
    insert into section_changes (user_id, from_section, to_section, from_lab, to_lab, changed_by)
    values (new.id, old.section_id, new.section_id, old.lab_group_id, new.lab_group_id, auth.uid());
  end if;
  return new;
end $$;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Teachers may only change contact fields of their own record.
create or replace function public.guard_faculty_self_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not has_admin_area('faculty') then
    new.initial := old.initial; new.department_id := old.department_id; new.full_name := old.full_name;
    new.designation := old.designation; new.status := old.status; new.is_guest := old.is_guest;
    new.joined_on := old.joined_on; new.left_on := old.left_on;
  end if;
  return new;
end $$;
create trigger guard_faculty_self_update before update on public.faculty
  for each row execute function public.guard_faculty_self_update();

-- ---------------------------------------------------------------- admin
create policy "admin perms read" on public.admin_permissions for select to authenticated
  using (user_id = auth.uid() or public.is_main_admin());
create policy "admin perms main" on public.admin_permissions for all to authenticated
  using (public.is_main_admin()) with check (public.is_main_admin());
create policy "admin invites main" on public.admin_invites for all to authenticated
  using (public.is_main_admin()) with check (public.is_main_admin());

create policy "imports admin" on public.import_runs for all to authenticated
  using (public.has_admin_area(case kind when 'routine' then 'routine' when 'faculty' then 'faculty' else 'courses' end))
  with check (public.has_admin_area(case kind when 'routine' then 'routine' when 'faculty' then 'faculty' else 'courses' end));
create policy "presets admin" on public.import_mapping_presets for all to authenticated
  using (public.is_any_admin()) with check (public.is_any_admin());

create policy "audit main read" on public.audit_log for select to authenticated using (public.is_main_admin());

-- ---------------------------------------------------------------- CR
create policy "cr req own read" on public.cr_requests for select to authenticated
  using (user_id = auth.uid() or public.has_admin_area('cr'));
create policy "cr req apply" on public.cr_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and public.is_active_member());
create policy "cr req withdraw" on public.cr_requests for update to authenticated
  using (user_id = auth.uid() and status = 'pending') with check (user_id = auth.uid() and status in ('pending','withdrawn'));
create policy "cr req admin" on public.cr_requests for update to authenticated
  using (public.has_admin_area('cr')) with check (public.has_admin_area('cr'));

create policy "cr assign read" on public.cr_assignments for select to authenticated
  using (user_id = auth.uid() or public.has_admin_area('cr'));
create policy "cr assign admin" on public.cr_assignments for all to authenticated
  using (public.has_admin_area('cr')) with check (public.has_admin_area('cr'));

-- ---------------------------------------------------------------- notices and academic events
create policy "notices read" on public.notices for select to authenticated
  using (public.is_active_member() and (deleted_at is null or author_id = auth.uid()));
create policy "notices post" on public.notices for insert to authenticated with check (
  author_id = auth.uid() and (
    (scope = 'department' and public.has_admin_area('notices')) or
    (scope = 'batch'      and public.has_admin_area('notices')) or
    (scope in ('section','lab_group','course') and section_id is not null and public.can_post_to_section(section_id))
  ));
create policy "notices edit own" on public.notices for update to authenticated
  using (author_id = auth.uid() or public.has_admin_area('notices'))
  with check (author_id = auth.uid() or public.has_admin_area('notices'));

create policy "events read" on public.academic_events for select to authenticated using (public.is_active_member());
create policy "events post" on public.academic_events for insert to authenticated
  with check (created_by = auth.uid() and public.can_post_to_section(section_id));
create policy "events edit" on public.academic_events for update to authenticated
  using (public.can_post_to_section(section_id)) with check (public.can_post_to_section(section_id));

-- ---------------------------------------------------------------- notifications
create policy "notif events admin" on public.notification_events for select to authenticated using (public.is_any_admin());
create policy "notif reads own" on public.notification_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push tokens own" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- personal data (private to the student, not even admins)
create policy "extra own" on public.extra_enrolments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "attendance own" on public.attendance_records for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notes own" on public.notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "reports own" on public.issue_reports for insert to authenticated with check (user_id = auth.uid());
create policy "reports read" on public.issue_reports for select to authenticated
  using (user_id = auth.uid() or public.has_admin_area('reports'));
create policy "reports admin" on public.issue_reports for update to authenticated
  using (public.has_admin_area('reports')) with check (public.has_admin_area('reports'));

-- ---------------------------------------------------------------- audit triggers on admin-managed tables
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor_id, action, entity, entity_id, before, after)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id',
                   (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'key',
                   (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'user_id'),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'app_settings','feature_flags','departments','semesters','time_slots','batches','sections','lab_groups',
    'courses','faculty','buildings','rooms','calendar_days','admin_permissions','admin_invites',
    'routine_versions','class_slots','class_exceptions','cr_requests','cr_assignments','notices',
    'academic_events','app_releases','issue_reports'
  ] loop
    execute format('create trigger audit_row after insert or update or delete on public.%I
                    for each row execute function public.audit_row()', t);
  end loop;
end $$;
