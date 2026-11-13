-- AUTH-3: the first sign-in with auth.main_admin_email becomes main admin (only if none exists).
-- AUTH-6: an email matching an active faculty record becomes a linked faculty account;
--         a users-area admin can link / unlink manually; a student cannot link themselves.
-- AUTH-8: invited people (admin invite, CR email, faculty email, main admin) are active at once
--         even when auto registration is off.
do $$
declare
  main_email text := 'main.admin.test@example.test';
  m1 uuid; m2 uuid; f uuid; fac uuid; admin uuid; s uuid; inv uuid; cr uuid; n int;
begin
  -- Pretend no main admin exists yet, for this transaction only.
  update admin_permissions set revoked_at = now() where is_main and revoked_at is null;
  update app_settings set value = to_jsonb(main_email) where key = 'auth.main_admin_email';
  update app_settings set value = jsonb_set(value, '{auto_register}', 'false') where key = 'auth.signup';

  m1 := pg_temp.new_user(main_email);
  perform pg_temp.ok('main admin email becomes main admin',
    exists (select 1 from admin_permissions where user_id = m1 and is_main and revoked_at is null));
  perform pg_temp.ok('main admin is active even with auto registration off',
    (select status from profiles where id = m1) = 'active');

  -- A second account can never take the main role by email once one exists.
  update app_settings set value = to_jsonb('second.main@example.test'::text) where key = 'auth.main_admin_email';
  m2 := pg_temp.new_user('second.main@example.test');
  perform pg_temp.ok('no second main admin',
    not exists (select 1 from admin_permissions where user_id = m2 and is_main));

  -- AUTH-6 automatic link.
  insert into faculty (initial, full_name, email) values ('TSTL', 'Linked Teacher', 'linked.teacher@example.test')
  returning id into fac;
  f := pg_temp.new_user('Linked.Teacher@example.test');
  perform pg_temp.ok('faculty email (any case) → faculty account linked to the record',
    (select account_type = 'faculty' and faculty_id = fac and status = 'active' from profiles where id = f));

  -- A student cannot link themselves to a faculty record.
  s := pg_temp.new_user('plain.student@example.test');
  update profiles set status = 'active' where id = s;
  perform pg_temp.login(s);
  update profiles set faculty_id = fac, account_type = 'faculty' where id = s;
  perform pg_temp.logout();
  perform pg_temp.ok('student cannot link own account to a teacher',
    (select faculty_id is null and account_type = 'student' from profiles where id = s));

  -- Admin with the users area links and unlinks manually.
  admin := pg_temp.new_user('users.admin@example.test');
  insert into admin_permissions (user_id, areas) values (admin, '{users}');
  perform pg_temp.login(admin);
  update profiles set faculty_id = fac, account_type = 'faculty' where id = s;
  get diagnostics n = row_count;
  perform pg_temp.logout();
  perform pg_temp.ok('users admin can link a teacher manually',
    n = 1 and (select faculty_id = fac and account_type = 'faculty' from profiles where id = s));
  perform pg_temp.login(admin);
  update profiles set faculty_id = null, account_type = 'student' where id = s;
  perform pg_temp.logout();
  perform pg_temp.ok('users admin can unlink',
    (select faculty_id is null and account_type = 'student' from profiles where id = s));

  -- AUTH-8: invited by admin or as CR → active at once; the invite is applied.
  insert into admin_invites (email, areas) values ('invited.admin@example.test', '{notices}');
  inv := pg_temp.new_user('invited.admin@example.test');
  perform pg_temp.ok('admin invite: active at once with its areas',
    (select status from profiles where id = inv) = 'active'
    and exists (select 1 from admin_permissions where user_id = inv and areas = '{notices}')
    and (select accepted_at is not null from admin_invites where email = 'invited.admin@example.test'));

  insert into cr_assignments (section_id, semester_id, invited_email, source)
  values (pg_temp.id('sec_a'), pg_temp.id('semester'), 'invited.cr@example.test', 'manual');
  cr := pg_temp.new_user('invited.cr@example.test');
  perform pg_temp.ok('CR email: active at once and linked to the CR assignment',
    (select status from profiles where id = cr) = 'active'
    and exists (select 1 from cr_assignments where user_id = cr and section_id = pg_temp.id('sec_a')));

  inv := pg_temp.new_user('ordinary.person@example.test');
  perform pg_temp.ok('ordinary new account is pending (auto registration off)',
    (select status from profiles where id = inv) = 'pending');
end $$;
