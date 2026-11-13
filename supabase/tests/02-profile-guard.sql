-- A student cannot `update profiles set account_type = 'faculty'` on themselves,
-- nor change status or email, nor touch anyone else's profile; the language can be changed (ME-7).
do $$
declare u uuid; other uuid; p profiles; n int;
begin
  u := pg_temp.new_user('guard1@example.test');
  other := pg_temp.new_user('guard2@example.test');
  perform pg_temp.ok('new profile: student, active, locale en',
    (select account_type = 'student' and status = 'active' and locale = 'en' from profiles where id = u));

  perform pg_temp.login(u);
  update profiles set account_type = 'faculty', status = 'alumni', email = 'changed@example.test', locale = 'bn'
   where id = u;
  update profiles set full_name = 'hacked' where id = other;
  get diagnostics n = row_count;
  perform pg_temp.logout();

  select * into p from profiles where id = u;
  perform pg_temp.ok('student cannot become faculty', p.account_type = 'student', p.account_type::text);
  perform pg_temp.ok('student cannot change own status', p.status = 'active', p.status::text);
  perform pg_temp.ok('student cannot change own email', p.email = 'guard1@example.test', p.email::text);
  perform pg_temp.ok('student can change own language', p.locale = 'bn', p.locale);
  perform pg_temp.ok('student cannot update another profile', n = 0
    and (select full_name from profiles where id = other) is distinct from 'hacked', format('rows=%s', n));
end $$;
