-- Manual routine editor (ADM-RT-5, ADM-RT-6; docs/ROUTINE_IMPORT.md §5).

-- Only a draft's classes change. Published and archived versions are history:
-- students' phones and the version diff rely on them staying as they were.
create or replace function public.guard_class_slot_edit() returns trigger
language plpgsql set search_path = public as $$
declare v_status version_status;
begin
  select status into v_status from routine_versions
   where id = case when tg_op = 'DELETE' then old.version_id else new.version_id end;
  if v_status is distinct from 'draft' then
    raise exception 'Only a draft version can be edited' using errcode = '55000';
  end if;
  if tg_op = 'UPDATE' and new.version_id <> old.version_id then
    raise exception 'A class cannot move to another version';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke execute on function public.guard_class_slot_edit() from public, anon, authenticated;

create trigger guard_class_slot_edit before insert or update or delete on public.class_slots
  for each row execute function public.guard_class_slot_edit();

-- Sections and lab groups from the editor. They belong to the batches area, so a
-- routine admin adds them through these functions (routine area checked here).
create or replace function public.ensure_section(p_batch text, p_section text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_batch uuid; v_section uuid;
  v_code text := upper(trim(p_batch)); v_name text := upper(trim(p_section));
begin
  if not has_admin_area('routine') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v_code !~ '^[0-9A-Z]{2,6}$' or v_name !~ '^[A-Z]{1,2}$' then raise exception 'Bad batch or section'; end if;
  insert into batches (code) values (v_code) on conflict (code) do nothing;
  select id into v_batch from batches where code = v_code;
  update batches set status = 'active', graduated_at = null where id = v_batch and status = 'graduated';
  insert into sections (batch_id, name) values (v_batch, v_name) on conflict (batch_id, name) do nothing;
  select id into v_section from sections where batch_id = v_batch and name = v_name;
  update sections set deleted_at = null, status = 'active' where id = v_section and (deleted_at is not null or status <> 'active');
  return v_section;
end $$;

create or replace function public.ensure_lab_group(p_section uuid, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text := upper(trim(p_name));
begin
  if not has_admin_area('routine') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v_name !~ '^[A-Z]{1,2}[0-9]{1,2}$' then raise exception 'Bad lab group'; end if;
  if not exists (select 1 from sections where id = p_section and deleted_at is null) then
    raise exception 'Unknown section';
  end if;
  insert into lab_groups (section_id, name) values (p_section, v_name) on conflict (section_id, name) do nothing;
  select id into v_id from lab_groups where section_id = p_section and name = v_name;
  update lab_groups set deleted_at = null, status = 'active' where id = v_id and (deleted_at is not null or status <> 'active');
  return v_id;
end $$;

-- Rename a section or lab group everywhere (students keep their membership).
create or replace function public.rename_section_or_group(p_kind text, p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text := upper(trim(p_name));
begin
  if not has_admin_area('routine') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_kind = 'section' then
    if v_name !~ '^[A-Z]{1,2}$' then raise exception 'Bad section'; end if;
    update sections set name = v_name where id = p_id;
  elsif p_kind = 'lab_group' then
    if v_name !~ '^[A-Z]{1,2}[0-9]{1,2}$' then raise exception 'Bad lab group'; end if;
    update lab_groups set name = v_name where id = p_id;
  else
    raise exception 'Unknown kind';
  end if;
  if not found then raise exception 'Unknown %', p_kind; end if;
end $$;

-- ADM-RT-6: an empty draft to build a routine without a file.
create or replace function public.create_empty_draft(p_semester uuid, p_label text) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_label text := nullif(trim(p_label), '');
begin
  if not has_admin_area('routine') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v_label is null then raise exception 'Version label is required'; end if;
  if not exists (select 1 from semesters where id = p_semester and deleted_at is null) then
    raise exception 'Unknown semester';
  end if;
  if exists (select 1 from routine_versions where semester_id = p_semester and label = v_label) then
    raise exception 'Version % already exists in this semester', v_label using errcode = '23505';
  end if;
  if exists (select 1 from routine_versions
             where semester_id = p_semester and status = 'draft' and deleted_at is null) then
    raise exception 'A draft already exists for this semester' using errcode = '55006';
  end if;
  insert into routine_versions (semester_id, label, source, parent_version_id, status, created_by)
  values (p_semester, v_label, 'manual', version_in_effect(p_semester, current_date), 'draft', auth.uid())
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.ensure_section(text, text) from public, anon;
revoke execute on function public.ensure_lab_group(uuid, text) from public, anon;
revoke execute on function public.rename_section_or_group(text, uuid, text) from public, anon;
revoke execute on function public.create_empty_draft(uuid, text) from public, anon;
grant execute on function public.ensure_section(text, text) to authenticated;
grant execute on function public.ensure_lab_group(uuid, text) to authenticated;
grant execute on function public.rename_section_or_group(text, uuid, text) to authenticated;
grant execute on function public.create_empty_draft(uuid, text) to authenticated;
