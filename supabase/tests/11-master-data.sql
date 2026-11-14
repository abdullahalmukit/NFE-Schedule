-- ADM-MD-4 / ADM-MD-5: each area admin manages only their own master data; students
-- cannot; guests never see teacher contacts; contact visibility is honoured; only the
-- faculty area may upload teacher photos.
do $$
declare
  courses_adm uuid; faculty_adm uuid; batches_adm uuid; rooms_adm uuid; stu uuid;
  dept uuid; fac uuid; bld uuid; err text; n int; row_dir record; anon_email text;
begin
  courses_adm := pg_temp.new_user('courses.adm@example.test');
  faculty_adm := pg_temp.new_user('faculty.adm@example.test');
  batches_adm := pg_temp.new_user('batches.adm@example.test');
  rooms_adm := pg_temp.new_user('rooms.adm@example.test');
  stu := pg_temp.new_user('md.student@example.test');
  insert into admin_permissions (user_id, areas) values
    (courses_adm, '{courses}'), (faculty_adm, '{faculty}'), (batches_adm, '{batches}'), (rooms_adm, '{rooms}');

  -- courses
  perform pg_temp.login(courses_adm);
  insert into courses (code, title, credit, type) values ('TEST-0002', 'Test lab', 1.5, 'lab');
  update courses set status = 'archived' where code = 'TEST-0002';
  perform pg_temp.logout();
  perform pg_temp.ok('courses admin adds and archives a course',
    (select status = 'archived' from courses where code = 'TEST-0002'));

  err := null;
  perform pg_temp.login(courses_adm);
  begin insert into faculty (initial) values ('XX'); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('courses admin cannot add teachers', err like '%row-level security%', coalesce(err, 'inserted'));

  -- faculty and departments
  perform pg_temp.login(faculty_adm);
  insert into departments (code, name) values ('TST', 'Test department') returning id into dept;
  insert into faculty (initial, full_name, department_id, email, phone, office_room, contact_visibility)
  values ('TSTV', 'Visible Teacher', dept, 'visible.teacher@example.test', '01700000000', 'AB-1 101',
          '{"email": true, "phone": false, "office_room": true}')
  returning id into fac;
  perform pg_temp.logout();
  perform pg_temp.ok('faculty admin adds a department and a teacher', fac is not null and dept is not null);

  err := null;
  perform pg_temp.login(faculty_adm);
  begin
    insert into faculty (initial, department_id) values ('TSTV', dept);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('an initial is unique among active teachers of a department',
    err like '%faculty_active_initial%', coalesce(err, 'inserted'));

  -- contact visibility
  update profiles set status = 'active' where id = stu;
  perform pg_temp.login(stu);
  select email, phone, office_room into row_dir from faculty_directory where id = fac;
  select count(*) into n from faculty where id = fac;
  perform pg_temp.logout();
  perform pg_temp.ok('signed-in student sees only the contacts the teacher shows',
    row_dir.email = 'visible.teacher@example.test' and row_dir.phone is null and row_dir.office_room = 'AB-1 101');
  perform pg_temp.ok('students cannot read the faculty table itself', n = 0, format('rows=%s', n));

  perform pg_temp.guest();
  select email into anon_email from faculty_directory where id = fac;
  select count(*) into n from faculty_public where id = fac and full_name = 'Visible Teacher';
  perform pg_temp.logout();
  perform pg_temp.ok('guests see the name but never contacts', n = 1 and anon_email is null);

  -- batches, sections, lab groups
  perform pg_temp.login(batches_adm);
  insert into sections (batch_id, name) values (pg_temp.id('batch'), 'C');
  insert into lab_groups (section_id, name) values ((select id from sections where batch_id = pg_temp.id('batch') and name = 'C'), 'C1');
  update batches set status = 'graduated', graduated_at = now() where id = pg_temp.id('batch');
  perform pg_temp.logout();
  perform pg_temp.ok('batches admin adds a section, a lab group and graduates a batch',
    exists (select 1 from lab_groups where name = 'C1')
    and (select status = 'graduated' from batches where id = pg_temp.id('batch')));

  -- buildings and rooms
  perform pg_temp.login(rooms_adm);
  insert into buildings (code, name) values ('TB-1', 'Test building') returning id into bld;
  insert into rooms (building_id, number, floor, type, capacity) values (bld, '304', 3, 'lab', 40);
  update rooms set is_active = false where building_id = bld;
  perform pg_temp.logout();
  perform pg_temp.ok('rooms admin adds a building and a room',
    exists (select 1 from rooms where building_id = bld and number = '304' and not is_active));

  err := null;
  perform pg_temp.login(rooms_adm);
  begin insert into sections (batch_id, name) values (pg_temp.id('batch'), 'Z'); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('rooms admin cannot add sections', err like '%row-level security%', coalesce(err, 'inserted'));

  -- students
  perform pg_temp.login(stu);
  update courses set title = 'hacked' where code = 'TEST-0002';
  get diagnostics n = row_count;
  perform pg_temp.logout();
  perform pg_temp.ok('students cannot change courses', n = 0, format('rows=%s', n));

  -- teacher photos (storage bucket faculty-photos)
  perform pg_temp.login(faculty_adm);
  insert into storage.objects (bucket_id, name) values ('faculty-photos', fac || '.jpg');
  perform pg_temp.logout();
  perform pg_temp.ok('faculty admin uploads a teacher photo',
    exists (select 1 from storage.objects where bucket_id = 'faculty-photos' and name = fac || '.jpg'));

  err := null;
  perform pg_temp.login(courses_adm);
  begin insert into storage.objects (bucket_id, name) values ('faculty-photos', 'x.jpg'); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('other admins cannot upload teacher photos', err like '%row-level security%', coalesce(err, 'inserted'));
end $$;
