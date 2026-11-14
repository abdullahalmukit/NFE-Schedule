-- Faculty and course import (ADM-MD-1, ADM-MD-2; docs/MASTER_DATA_IMPORT.md).
-- The web route validates the file and builds the plan; this function writes it
-- in one transaction. Security invoker: row-level security decides (faculty area
-- for teachers and departments, courses area for courses) and the audit
-- triggers record the admin as the actor.
--
-- p_plan = {
--   "departments": ["CSE"],                      -- codes to create (faculty only)
--   "rows": [ {"id": null, "values": {...}},      -- new record: every value
--             {"id": "<uuid>", "values": {...}} ] -- update: only changed values
-- }
-- Values use the import field names; "department" / "offering_department" are codes.
create or replace function public.apply_master_import(p_run uuid, p_plan jsonb)
returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  v_kind     import_kind;
  v_status   import_status;
  v_row      jsonb;
  v_vals     jsonb;
  v_id       uuid;
  v_dept     uuid;
  v_n        int;
  v_inserted int := 0;
  v_updated  int := 0;
  v_depts    int := 0;
  v_code     text;
begin
  select kind, status into v_kind, v_status from import_runs where id = p_run for update;
  if not found then raise exception 'Unknown import' using errcode = '42501'; end if;
  if v_kind not in ('faculty', 'courses') then raise exception 'Not a faculty or course import'; end if;
  if v_status not in ('uploaded', 'parsed') then
    raise exception 'Import already applied or cancelled' using errcode = '55000';
  end if;

  if v_kind = 'faculty' then
    for v_code in select jsonb_array_elements_text(coalesce(p_plan -> 'departments', '[]'))
    loop
      insert into departments (code) values (upper(v_code)) on conflict (code) do nothing;
      get diagnostics v_n = row_count;
      v_depts := v_depts + v_n;
    end loop;
  end if;

  for v_row in select jsonb_array_elements(coalesce(p_plan -> 'rows', '[]'))
  loop
    v_vals := v_row -> 'values';
    v_id := nullif(v_row ->> 'id', '')::uuid;

    if v_kind = 'faculty' then
      v_dept := null;
      if v_vals ? 'department' and v_vals ->> 'department' is not null then
        select id into v_dept from departments where code = v_vals ->> 'department';
      end if;
      if v_id is null then
        insert into faculty (initial, department_id, full_name, designation, email, phone,
                             office_room, consultation_hours, status, is_guest)
        values (upper(v_vals ->> 'initial'), v_dept, v_vals ->> 'full_name', v_vals ->> 'designation',
                v_vals ->> 'email', v_vals ->> 'phone', v_vals ->> 'office_room',
                v_vals ->> 'consultation_hours',
                coalesce((v_vals ->> 'status')::faculty_status, 'active'),
                coalesce((v_vals ->> 'is_guest')::boolean, false));
        v_inserted := v_inserted + 1;
      else
        update faculty set
          full_name          = case when v_vals ? 'full_name' then v_vals ->> 'full_name' else full_name end,
          designation        = case when v_vals ? 'designation' then v_vals ->> 'designation' else designation end,
          email              = case when v_vals ? 'email' then v_vals ->> 'email' else email end,
          phone              = case when v_vals ? 'phone' then v_vals ->> 'phone' else phone end,
          office_room        = case when v_vals ? 'office_room' then v_vals ->> 'office_room' else office_room end,
          consultation_hours = case when v_vals ? 'consultation_hours' then v_vals ->> 'consultation_hours'
                                    else consultation_hours end,
          status             = case when v_vals ->> 'status' is not null
                                    then (v_vals ->> 'status')::faculty_status else status end,
          is_guest           = case when v_vals ->> 'is_guest' is not null
                                    then (v_vals ->> 'is_guest')::boolean else is_guest end
        where id = v_id and deleted_at is null;
        get diagnostics v_n = row_count;
        if v_n = 0 then raise exception 'Record changed since the preview' using errcode = '40001'; end if;
        v_updated := v_updated + 1;
      end if;

    else -- courses
      v_dept := null;
      if v_vals ->> 'offering_department' is not null then
        select id into v_dept from departments where code = v_vals ->> 'offering_department';
        if v_dept is null then raise exception 'Unknown department %', v_vals ->> 'offering_department'; end if;
      end if;
      if v_id is null then
        insert into courses (code, title, title_bn, credit, type, offering_department_id)
        values (v_vals ->> 'code', v_vals ->> 'title', v_vals ->> 'title_bn',
                (v_vals ->> 'credit')::numeric,
                coalesce((v_vals ->> 'type')::course_type, 'theory'), v_dept);
        v_inserted := v_inserted + 1;
      else
        update courses set
          title    = case when v_vals ? 'title' then v_vals ->> 'title' else title end,
          title_bn = case when v_vals ? 'title_bn' then v_vals ->> 'title_bn' else title_bn end,
          credit   = case when v_vals ? 'credit' then (v_vals ->> 'credit')::numeric else credit end,
          type     = case when v_vals ->> 'type' is not null
                          then (v_vals ->> 'type')::course_type else type end,
          offering_department_id = case when v_vals ? 'offering_department' then v_dept
                                        else offering_department_id end
        where id = v_id and deleted_at is null;
        get diagnostics v_n = row_count;
        if v_n = 0 then raise exception 'Record changed since the preview' using errcode = '40001'; end if;
        v_updated := v_updated + 1;
      end if;
    end if;
  end loop;

  update import_runs
     set status = 'applied',
         applied_at = now(),
         result = coalesce(result, '{}') || jsonb_build_object('applied', jsonb_build_object(
           'inserted', v_inserted, 'updated', v_updated, 'departments', v_depts))
   where id = p_run;

  return jsonb_build_object('inserted', v_inserted, 'updated', v_updated, 'departments', v_depts);
end $$;

revoke execute on function public.apply_master_import(uuid, jsonb) from public, anon;
grant execute on function public.apply_master_import(uuid, jsonb) to authenticated;
