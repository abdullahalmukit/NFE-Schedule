-- select public.sync_pull(0) as anon returns public tables only (no profiles, no attendance);
-- a signed-in student gets only their own profile and private rows.
do $$
declare u1 uuid; u2 uuid; r jsonb;
begin
  u1 := pg_temp.new_user('sync1@example.test');
  u2 := pg_temp.new_user('sync2@example.test');
  insert into attendance_records (user_id, course_id, date, status)
  values (u1, pg_temp.id('course'), current_date, 'attended'),
         (u2, pg_temp.id('course'), current_date, 'missed');
  insert into notes (user_id, course_id, body) values (u1, pg_temp.id('course'), 'private note');

  perform pg_temp.guest();
  begin
    r := public.sync_pull(0);
    perform pg_temp.ok('anon: sync_pull(0) runs', true);
    perform pg_temp.ok('anon: no own profile (me is null)', jsonb_typeof(r->'me') = 'null', r->>'me');
    perform pg_temp.ok('anon: no profiles table in the result', not r ? 'profiles');
    perform pg_temp.ok('anon: no attendance, notes or extra courses',
      jsonb_array_length(r->'attendance_records') = 0 and jsonb_array_length(r->'notes') = 0
      and jsonb_array_length(r->'extra_enrolments') = 0,
      format('attendance=%s notes=%s', jsonb_array_length(r->'attendance_records'), jsonb_array_length(r->'notes')));
    perform pg_temp.ok('anon: private settings hidden',
      not exists (select 1 from jsonb_array_elements(r->'app_settings') e
                   where e->>'key' in ('auth.main_admin_email', 'auth.blocked_emails', 'parser.routine')));
    perform pg_temp.ok('anon: public reference data visible',
      exists (select 1 from jsonb_array_elements(r->'batches') e where e->>'code' = 'T263'));
  exception when others then
    perform pg_temp.ok('anon: sync_pull(0) runs', false, sqlerrm);
  end;
  perform pg_temp.logout();

  perform pg_temp.login(u1);
  begin
    r := public.sync_pull(0);
    perform pg_temp.ok('student: me = own profile', (r->'me'->>'id')::uuid = u1, r->'me'->>'email');
    perform pg_temp.ok('student: only own attendance',
      jsonb_array_length(r->'attendance_records') = 1
      and (r->'attendance_records'->0->>'user_id')::uuid = u1,
      format('rows=%s', jsonb_array_length(r->'attendance_records')));
    perform pg_temp.ok('student: own notes', jsonb_array_length(r->'notes') = 1);
  exception when others then
    perform pg_temp.ok('student: sync_pull(0) runs', false, sqlerrm);
  end;
  perform pg_temp.logout();
end $$;
