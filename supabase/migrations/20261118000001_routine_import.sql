-- Routine import → draft version (ADM-RT-1, ADM-RT-2; docs/ROUTINE_IMPORT.md, ARCHITECTURE.md §3.1).
-- The web route parses the file, builds the review and, once the admin has decided
-- every warning, sends the plan (codes only) here. One transaction creates what the
-- routine needs (departments of guest teachers, courses, teachers, batches, sections,
-- lab groups, buildings, rooms, the semester's time slots) and a DRAFT version with
-- its class slots. Students see nothing until the version is published.
--
-- Security definer: a routine admin may create the batches, rooms, courses and
-- teachers the file uses without holding those areas; the function checks the
-- routine area itself. auth.uid() is still the admin, so the audit triggers name them.
create or replace function public.apply_routine_import(p_run uuid, p_plan jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_run       import_runs%rowtype;
  v_semester  uuid := (p_plan ->> 'semester_id')::uuid;
  v_label     text := nullif(trim(p_plan ->> 'label'), '');
  v_home      uuid;
  v_parent    uuid;
  v_version   uuid;
  v_classes   int;
  v_expected  int := jsonb_array_length(coalesce(p_plan -> 'classes', '[]'));
begin
  if not has_admin_area('routine') then raise exception 'Not allowed' using errcode = '42501'; end if;

  select * into v_run from import_runs where id = p_run for update;
  if not found or v_run.kind <> 'routine' then raise exception 'Unknown import' using errcode = '42501'; end if;
  if v_run.status not in ('uploaded', 'parsed') then
    raise exception 'Import already applied or cancelled' using errcode = '55000';
  end if;
  if v_label is null then raise exception 'Version label is required'; end if;
  if not exists (select 1 from semesters where id = v_semester and deleted_at is null) then
    raise exception 'Unknown semester';
  end if;
  if exists (select 1 from routine_versions where semester_id = v_semester and label = v_label) then
    raise exception 'Version % already exists in this semester', v_label using errcode = '23505';
  end if;
  if exists (select 1 from routine_versions
             where semester_id = v_semester and status = 'draft' and deleted_at is null) then
    raise exception 'A draft already exists for this semester' using errcode = '55006';
  end if;

  -- Time slots of the semester (none yet, or the admin chose the file's times).
  if jsonb_typeof(p_plan -> 'time_slots') = 'array' then
    insert into time_slots (semester_id, position, start_time, end_time, label)
    select v_semester, s.position, s.start::time, s."end"::time, s.label
      from jsonb_to_recordset(p_plan -> 'time_slots')
           as s(position smallint, start text, "end" text, label text)
    on conflict (semester_id, position) do update
      set start_time = excluded.start_time, end_time = excluded.end_time,
          label = excluded.label, deleted_at = null;
  end if;

  -- Reference data the file uses.
  insert into departments (code)
  select upper(d) from jsonb_array_elements_text(coalesce(p_plan -> 'departments', '[]')) d
  on conflict (code) do nothing;
  select id into v_home from departments where is_home and deleted_at is null limit 1;

  insert into courses (code, prefix, type)
  select c.code, c.prefix, c.type::course_type
    from jsonb_to_recordset(coalesce(p_plan -> 'courses', '[]')) as c(code text, prefix text, type text)
  on conflict (code) do nothing;

  insert into faculty (initial, department_id, is_guest)
  select upper(f.initial), coalesce(d.id, v_home), d.id is not null and d.id is distinct from v_home
    from jsonb_to_recordset(coalesce(p_plan -> 'faculty', '[]')) as f(initial text, department text)
    left join departments d on d.code = f.department
   where not exists (
     select 1 from faculty x
      where x.initial = upper(f.initial) and x.status <> 'left' and x.deleted_at is null
        and coalesce(x.department_id, v_home) is not distinct from coalesce(d.id, v_home));

  insert into batches (code)
  select b from jsonb_array_elements_text(coalesce(p_plan -> 'batches', '[]')) b
  on conflict (code) do nothing;
  -- A graduated batch that appears again becomes active.
  update batches set status = 'active', graduated_at = null
   where status = 'graduated' and deleted_at is null
     and code in (select distinct c ->> 'batch' from jsonb_array_elements(coalesce(p_plan -> 'classes', '[]')) c);

  insert into sections (batch_id, name)
  select b.id, s.name
    from jsonb_to_recordset(coalesce(p_plan -> 'sections', '[]')) as s(batch text, name text)
    join batches b on b.code = s.batch
  on conflict (batch_id, name) do nothing;

  insert into lab_groups (section_id, name)
  select sc.id, g.name
    from jsonb_to_recordset(coalesce(p_plan -> 'lab_groups', '[]')) as g(batch text, section text, name text)
    join batches b on b.code = g.batch
    join sections sc on sc.batch_id = b.id and sc.name = g.section
  on conflict (section_id, name) do nothing;

  insert into buildings (code)
  select b from jsonb_array_elements_text(coalesce(p_plan -> 'buildings', '[]')) b
  on conflict (code) do nothing;

  insert into rooms (building_id, number, floor, type)
  select bl.id, r.number, r.floor, r.type::room_type
    from jsonb_to_recordset(coalesce(p_plan -> 'rooms', '[]'))
         as r(building text, number text, floor smallint, type text)
    join buildings bl on bl.code = r.building
  on conflict (building_id, number) do nothing;

  -- The draft version.
  select id into v_parent from routine_versions
   where semester_id = v_semester and status = 'published' and deleted_at is null
   order by published_at desc nulls last limit 1;

  insert into routine_versions (semester_id, label, source, parent_version_id, source_file_path,
                                status, created_by)
  values (v_semester, v_label, 'import', v_parent, p_plan ->> 'source_file_path', 'draft', auth.uid())
  returning id into v_version;

  insert into class_slots (version_id, section_id, lab_group_id, course_id, section_label,
                           faculty_id, room_id, day, time_slot_id, span, raw_text)
  select v_version, sc.id, lg.id, co.id, c.section_label,
         (select f.id from faculty f
           where f.initial = upper(c.initial) and f.status <> 'left' and f.deleted_at is null
             and coalesce(f.department_id, v_home) is not distinct from coalesce(d.id, v_home)
           order by f.status = 'active' desc limit 1),
         rm.id, c.day, ts.id, greatest(c.span, 1),
         array(select jsonb_array_elements_text(c.raw))
    from jsonb_to_recordset(p_plan -> 'classes') as c(
           batch text, section text, lab_group text, course text, section_label text,
           initial text, department text, building text, room text,
           day smallint, position smallint, span smallint, raw jsonb)
    join batches b      on b.code = c.batch and b.deleted_at is null
    join sections sc    on sc.batch_id = b.id and sc.name = c.section
    left join lab_groups lg on lg.section_id = sc.id and lg.name = c.lab_group
    join courses co     on co.code = c.course
    join time_slots ts  on ts.semester_id = v_semester and ts.position = c.position and ts.deleted_at is null
    left join departments d on d.code = c.department
    left join buildings bl  on bl.code = c.building
    left join rooms rm      on rm.building_id = bl.id and rm.number = c.room
   where c.lab_group is null or lg.id is not null;
  get diagnostics v_classes = row_count;
  if v_classes <> v_expected then
    raise exception 'Only % of % classes could be placed', v_classes, v_expected;
  end if;

  update import_runs
     set status = 'applied', applied_at = now(), semester_id = v_semester,
         version_label = v_label, version_id = v_version
   where id = p_run;

  return jsonb_build_object('version_id', v_version, 'classes', v_classes);
end $$;

revoke execute on function public.apply_routine_import(uuid, jsonb) from public, anon;
grant execute on function public.apply_routine_import(uuid, jsonb) to authenticated;

-- Settings → Routine format (ADM-RT-11): routine or settings admins save the file
-- format rules. The web form validates the value (packages/core routine/parser-rules.ts).
create or replace function public.set_routine_rules(p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (has_admin_area('routine') or has_admin_area('settings')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_value) <> 'object' then raise exception 'Rules must be an object'; end if;
  update app_settings set value = p_value where key = 'parser.routine';
  if not found then
    insert into app_settings (key, value, is_public) values ('parser.routine', p_value, false);
  end if;
end $$;

revoke execute on function public.set_routine_rules(jsonb) from public, anon;
grant execute on function public.set_routine_rules(jsonb) to authenticated;
