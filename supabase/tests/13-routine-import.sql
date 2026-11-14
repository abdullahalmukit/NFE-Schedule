-- ADM-RT-1 / ADM-RT-2: apply_routine_import creates what the file needs and a DRAFT
-- version in one step; only the routine area; one draft per semester; labels are unique.
do $$
declare
  routine_adm uuid; courses_adm uuid; stu uuid; run_a uuid; run_b uuid; res jsonb; err text;
  v uuid; plan jsonb; n int;
begin
  routine_adm := pg_temp.new_user('rt.import@example.test');
  courses_adm := pg_temp.new_user('rt.courses@example.test');
  stu := pg_temp.new_user('rt.student@example.test');
  insert into admin_permissions (user_id, areas) values (routine_adm, '{routine}'), (courses_adm, '{courses}');
  update profiles set status = 'active' where id = stu;

  plan := jsonb_build_object(
    'semester_id', pg_temp.id('semester'),
    'label', 'T9',
    'source_file_path', null,
    'time_slots', jsonb_build_array(
      jsonb_build_object('position', 18, 'start', '08:20', 'end', '09:50', 'label', '8:20-09:50'),
      jsonb_build_object('position', 19, 'start', '09:50', 'end', '11:20', 'label', '09:50-11:20')),
    'departments', jsonb_build_array('TQD'),
    'courses', jsonb_build_array(jsonb_build_object('code', 'TEST-1104', 'prefix', null, 'type', 'lab')),
    'faculty', jsonb_build_array(
      jsonb_build_object('initial', 'TQA', 'department', null),
      jsonb_build_object('initial', 'TQG', 'department', 'TQD')),
    'batches', jsonb_build_array('T999'),
    'sections', jsonb_build_array(jsonb_build_object('batch', 'T999', 'name', 'A'),
                                  jsonb_build_object('batch', 'T263', 'name', 'C')),
    'lab_groups', jsonb_build_array(jsonb_build_object('batch', 'T999', 'section', 'A', 'name', 'A1')),
    'buildings', jsonb_build_array('TQB'),
    'rooms', jsonb_build_array(jsonb_build_object('building', 'TQB', 'number', '304', 'floor', 3, 'type', 'lab')),
    'classes', jsonb_build_array(
      jsonb_build_object('batch', 'T999', 'section', 'A', 'lab_group', 'A1', 'course', 'TEST-1104',
        'section_label', 'A', 'initial', 'TQA', 'department', null, 'building', 'TQB', 'room', '304',
        'day', 0, 'position', 18, 'span', 1, 'raw', jsonb_build_array('TEST-1104-A1', 'TQA', 'TQB: 304')),
      jsonb_build_object('batch', 'T263', 'section', 'C', 'lab_group', null, 'course', 'TEST-0001',
        'section_label', 'C', 'initial', 'TQG', 'department', 'TQD', 'building', 'TQB', 'room', '304',
        'day', 1, 'position', 19, 'span', 1, 'raw', jsonb_build_array('TEST-0001-C', 'TQG(TQD)', 'TQB: 304'))));

  -- a courses admin cannot
  perform pg_temp.login(courses_adm);
  err := null;
  begin
    insert into import_runs (kind, file_path, file_name, file_type) values ('routine', 'x/r.docx', 'r.docx', 'docx');
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('only the routine area starts a routine import', err like '%row-level security%', coalesce(err, 'inserted'));

  perform pg_temp.login(routine_adm);
  insert into import_runs (kind, file_path, file_name, file_type, status)
  values ('routine', 'a/r.docx', 'r.docx', 'docx', 'parsed') returning id into run_a;
  res := public.apply_routine_import(run_a, plan);
  perform pg_temp.logout();
  v := (res ->> 'version_id')::uuid;

  perform pg_temp.ok('a routine admin saves the import as a draft',
    res ->> 'classes' = '2' and (select status = 'draft' and source = 'import' and label = 'T9'
                                   and created_by = routine_adm from routine_versions where id = v), res::text);
  perform pg_temp.ok('the run points at the draft',
    (select status = 'applied' and version_id = v from import_runs where id = run_a));
  perform pg_temp.ok('batches, sections, lab groups, rooms and courses are created without those areas',
    exists (select 1 from lab_groups g join sections s on s.id = g.section_id join batches b on b.id = s.batch_id
             where b.code = 'T999' and s.name = 'A' and g.name = 'A1')
    and exists (select 1 from rooms r join buildings b on b.id = r.building_id
                 where b.code = 'TQB' and r.number = '304' and r.floor = 3 and r.type = 'lab')
    and exists (select 1 from courses where code = 'TEST-1104' and type = 'lab'));
  perform pg_temp.ok('a guest teacher gets their department',
    exists (select 1 from faculty f join departments d on d.id = f.department_id
             where f.initial = 'TQG' and d.code = 'TQD' and f.is_guest));
  select count(*) into n from class_slots cs join time_slots ts on ts.id = cs.time_slot_id
   where cs.version_id = v and cs.faculty_id is not null and cs.room_id is not null and ts.position in (18, 19);
  perform pg_temp.ok('every class is placed with teacher, room and time slot', n = 2, format('placed=%s', n));
  perform pg_temp.ok('the semester gets the time slots', exists (
    select 1 from time_slots where semester_id = pg_temp.id('semester') and position = 18 and start_time = '08:20'));

  perform pg_temp.login(stu);
  select count(*) into n from routine_versions where id = v;
  perform pg_temp.logout();
  perform pg_temp.ok('students cannot see a draft', n = 0, format('rows=%s', n));

  -- second import while the draft exists
  perform pg_temp.login(routine_adm);
  insert into import_runs (kind, file_path, file_name, file_type, status)
  values ('routine', 'b/r.docx', 'r.docx', 'docx', 'parsed') returning id into run_b;
  err := null;
  begin perform public.apply_routine_import(run_b, plan || '{"label": "T10"}'); exception when others then err := sqlerrm; end;
  perform pg_temp.ok('one draft per semester', err like '%draft already exists%', coalesce(err, 'applied'));
  update routine_versions set deleted_at = now() where id = v;
  err := null;
  begin perform public.apply_routine_import(run_b, plan); exception when others then err := sqlerrm; end;
  perform pg_temp.ok('a version label is used once per semester', err like '%already exists%', coalesce(err, 'applied'));
  err := null;
  begin perform public.apply_routine_import(run_a, plan || '{"label": "T11"}'); exception when others then err := sqlerrm; end;
  perform pg_temp.ok('a run is applied only once', err like '%already applied%', coalesce(err, 'applied'));
  err := null;
  begin
    perform public.apply_routine_import(run_b, jsonb_set(plan || '{"label": "T12"}', '{classes,0,course}', '"NOPE-0000"'));
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('a class that cannot be placed rolls everything back',
    err like '%could be placed%' and not exists (select 1 from routine_versions where label = 'T12'), coalesce(err, 'applied'));

  perform pg_temp.login(courses_adm);
  err := null;
  begin perform public.apply_routine_import(run_b, plan || '{"label": "T13"}'); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('other admins cannot apply', err like '%Not allowed%', coalesce(err, 'applied'));
end $$;
