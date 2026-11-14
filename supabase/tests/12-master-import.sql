-- ADM-MD-1 / ADM-MD-2: apply_master_import writes a faculty or course import in one
-- step, only for the admin of that area, only once, and only the values it is given.
do $$
declare
  faculty_adm uuid; courses_adm uuid; stu uuid;
  run_f uuid; run_c uuid; fac uuid; res jsonb; err text; r record;
begin
  faculty_adm := pg_temp.new_user('import.faculty@example.test');
  courses_adm := pg_temp.new_user('import.courses@example.test');
  stu := pg_temp.new_user('import.student@example.test');
  insert into admin_permissions (user_id, areas) values
    (faculty_adm, '{faculty}'), (courses_adm, '{courses}');
  update profiles set status = 'active' where id = stu;

  insert into faculty (initial, full_name, email, phone) values ('TSTA', 'Old Name', 'old@example.test', '0170')
  returning id into fac;

  -- faculty import
  perform pg_temp.login(faculty_adm);
  insert into import_runs (kind, file_path, file_name, file_type, status)
  values ('faculty', 'imports/x/faculty.csv', 'faculty.csv', 'csv', 'parsed') returning id into run_f;
  res := public.apply_master_import(run_f, jsonb_build_object(
    'departments', jsonb_build_array('TSTD'),
    'rows', jsonb_build_array(
      jsonb_build_object('id', null, 'values', jsonb_build_object(
        'initial', 'TSTB', 'department', 'TSTD', 'full_name', 'New Guest', 'is_guest', true)),
      jsonb_build_object('id', fac, 'values', jsonb_build_object('full_name', 'New Name', 'email', null))
    )));
  perform pg_temp.logout();

  perform pg_temp.ok('faculty import reports what it wrote',
    res = '{"inserted": 1, "updated": 1, "departments": 1}'::jsonb, res::text);
  select f.full_name, f.is_guest, d.code into r
    from faculty f join departments d on d.id = f.department_id where f.initial = 'TSTB';
  perform pg_temp.ok('a new teacher is added with a new department',
    r.full_name = 'New Guest' and r.is_guest and r.code = 'TSTD');
  select full_name, email, phone into r from faculty where id = fac;
  perform pg_temp.ok('an update writes only the given values (null clears)',
    r.full_name = 'New Name' and r.email is null and r.phone = '0170', row_to_json(r)::text);
  perform pg_temp.ok('the run is marked applied',
    (select status = 'applied' and applied_at is not null and result -> 'applied' is not null
       from import_runs where id = run_f));
  perform pg_temp.ok('the import is in the audit log',
    exists (select 1 from audit_log where entity = 'faculty' and entity_id = fac::text and actor_id = faculty_adm));

  err := null;
  perform pg_temp.login(faculty_adm);
  begin perform public.apply_master_import(run_f, '{"rows": []}'); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('a run is applied only once', err like '%already applied%', coalesce(err, 'applied twice'));

  -- other areas and students
  err := null;
  perform pg_temp.login(courses_adm);
  begin perform public.apply_master_import(run_f, '{"rows": []}'); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('a courses admin cannot apply a faculty import', err like '%Unknown import%', coalesce(err, 'applied'));

  -- course import
  perform pg_temp.login(courses_adm);
  insert into import_runs (kind, file_path, file_name, file_type)
  values ('courses', 'imports/y/courses.xlsx', 'courses.xlsx', 'xlsx') returning id into run_c;
  err := null;
  begin
    perform public.apply_master_import(run_c, jsonb_build_object('rows', jsonb_build_array(
      jsonb_build_object('id', null, 'values', jsonb_build_object('code', 'TEST-0009', 'credit', 1.5, 'type', 'lab')),
      jsonb_build_object('id', null, 'values', jsonb_build_object('initial', 'TSTC')))));
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('a bad row rolls back the whole course import',
    err is not null and not exists (select 1 from courses where code = 'TEST-0009'), coalesce(err, 'no error'));

  perform pg_temp.login(courses_adm);
  res := public.apply_master_import(run_c, jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('id', null, 'values', jsonb_build_object('code', 'TEST-0009', 'credit', 1.5, 'type', 'lab')),
    jsonb_build_object('id', pg_temp.id('course'), 'values', jsonb_build_object('title', 'Renamed')))));
  perform pg_temp.logout();
  perform pg_temp.ok('courses admin imports courses',
    res ->> 'inserted' = '1' and res ->> 'updated' = '1'
    and (select type = 'lab' and credit = 1.5 from courses where code = 'TEST-0009')
    and (select title = 'Renamed' from courses where id = pg_temp.id('course')), res::text);

  err := null;
  perform pg_temp.login(stu);
  begin perform public.apply_master_import(run_c, '{"rows": []}'); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('students cannot apply imports', err is not null, coalesce(err, 'applied'));
end $$;
