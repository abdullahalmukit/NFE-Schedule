-- Publish, graduation, copies and affected students (ADM-RT-3, ADM-RT-4, ADM-RT-7, ADM-RT-10).

-- Profile status changes are kept to the users area by guard_profile_update. A
-- routine publish that graduates a batch turns its students into alumni, so the
-- guard lets a system step through when the publishing function has said so
-- for this transaction (the flag cannot be set through the API).
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not has_admin_area('users') and coalesce(current_setting('nfe.system_update', true), '') <> 'on' then
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
revoke execute on function public.guard_profile_update() from public, anon, authenticated;

-- publish_routine_version gains p_graduate: batch codes the admin chose on the
-- import review ("Mark graduated when published"). The old signature is dropped
-- so calls are not ambiguous; the body is otherwise unchanged.
drop function if exists public.publish_routine_version(uuid, date, boolean, uuid[], uuid[], text);

create function public.publish_routine_version(
  p_version uuid,
  p_effective_from date,
  p_notify boolean,
  p_affected_section_ids uuid[] default '{}',
  p_affected_lab_group_ids uuid[] default '{}',
  p_summary text default null,
  p_graduate text[] default '{}'
) returns void language plpgsql security definer set search_path = public as $$
declare v routine_versions%rowtype;
begin
  if not has_admin_area('routine') then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into v from routine_versions where id = p_version and deleted_at is null for update;
  if not found then raise exception 'Unknown version'; end if;
  if v.status <> 'draft' then raise exception 'Only a draft can be published'; end if;
  if p_effective_from is not null and p_effective_from < current_date then
    raise exception 'The effective date cannot be in the past';
  end if;

  update routine_versions set status = 'published', effective_from = coalesce(p_effective_from, current_date),
         published_by = auth.uid(), published_at = now()
   where id = p_version;

  -- Versions no longer in effect today are archived; a version scheduled
  -- for a future date leaves the current one live until that date.
  perform archive_superseded_versions(v.semester_id);

  -- Graduating batches (ADM-RT-10): the batch is closed and its students become alumni.
  if cardinality(p_graduate) > 0 then
    perform set_config('nfe.system_update', 'on', true);
    update profiles p set status = 'alumni'
      from batches b
     where b.code = any(p_graduate) and b.status = 'active' and b.deleted_at is null
       and p.status = 'active' and p.account_type = 'student'
       and (p.batch_id = b.id or p.section_id in (select s.id from sections s where s.batch_id = b.id));
    perform set_config('nfe.system_update', 'off', true);
    update batches set status = 'graduated', graduated_at = now()
     where code = any(p_graduate) and status = 'active' and deleted_at is null;
  end if;

  if p_notify and (cardinality(p_affected_section_ids) > 0 or cardinality(p_affected_lab_group_ids) > 0) then
    insert into notification_events (kind, title, body, data, target, created_by)
    values ('routine_published', 'Routine updated',
            coalesce(nullif(trim(p_summary), ''), 'Your class routine has changed. Tap to see what changed.'),
            jsonb_build_object('version_id', p_version, 'effective_from', coalesce(p_effective_from, current_date)),
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

revoke execute on function public.publish_routine_version(uuid, date, boolean, uuid[], uuid[], text, text[]) from public, anon;
grant execute on function public.publish_routine_version(uuid, date, boolean, uuid[], uuid[], text, text[]) to authenticated;

-- A new draft copied from any version: "Restore" (source rollback) now, the
-- manual editor (source manual) later. One draft per semester; labels unique.
create or replace function public.copy_version_to_draft(p_from uuid, p_label text, p_source version_source)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare v routine_versions%rowtype; v_new uuid; v_label text := nullif(trim(p_label), '');
begin
  if not has_admin_area('routine') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_source = 'import' then raise exception 'Imports create their own drafts'; end if;
  select * into v from routine_versions where id = p_from and deleted_at is null;
  if not found then raise exception 'Unknown version'; end if;
  if v_label is null then raise exception 'Version label is required'; end if;
  if exists (select 1 from routine_versions where semester_id = v.semester_id and label = v_label) then
    raise exception 'Version % already exists in this semester', v_label using errcode = '23505';
  end if;
  if exists (select 1 from routine_versions
             where semester_id = v.semester_id and status = 'draft' and deleted_at is null) then
    raise exception 'A draft already exists for this semester' using errcode = '55006';
  end if;

  insert into routine_versions (semester_id, label, source, parent_version_id, source_file_path, status, created_by,
                                notes)
  values (v.semester_id, v_label, p_source, coalesce(version_in_effect(v.semester_id, current_date), v.id),
          v.source_file_path, 'draft', auth.uid(),
          case when p_source = 'rollback' then 'Restored from version ' || v.label end)
  returning id into v_new;

  insert into class_slots (version_id, section_id, lab_group_id, course_id, section_label, faculty_id, room_id,
                           day, time_slot_id, span, raw_text, note)
  select v_new, section_id, lab_group_id, course_id, section_label, faculty_id, room_id,
         day, time_slot_id, span, raw_text, note
    from class_slots where version_id = p_from and deleted_at is null;

  return v_new;
end $$;

revoke execute on function public.copy_version_to_draft(uuid, text, version_source) from public, anon;
grant execute on function public.copy_version_to_draft(uuid, text, version_source) to authenticated;

-- Publish dialog (A-3): how many students a publish will notify. Profiles are
-- private to the users area, so the routine admin gets only the number.
create or replace function public.count_affected_students(p_sections uuid[], p_lab_groups uuid[])
returns integer
language sql stable security definer set search_path = public as $$
  select case when not has_admin_area('routine') then null else (
    select count(*)::int from profiles
     where status = 'active' and account_type = 'student' and deleted_at is null
       and (section_id = any(p_sections) or lab_group_id = any(p_lab_groups)))
  end
$$;

revoke execute on function public.count_affected_students(uuid[], uuid[]) from public, anon;
grant execute on function public.count_affected_students(uuid[], uuid[]) to authenticated;
