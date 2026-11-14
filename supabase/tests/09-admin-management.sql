-- AUTH-4 / AUTH-5 / ADM-ADM-1: only the main admin invites admins, changes their areas,
-- revokes them and hands over the main role; every change is audited; the dashboard
-- gives counts to any admin and nothing to others.
do $$
declare
  main uuid; other uuid; adm uuid; stu uuid; later uuid; err text; r text; d jsonb; n int;
begin
  update admin_permissions set revoked_at = now() where is_main and revoked_at is null;
  main := pg_temp.new_user('main.mgmt@example.test');
  insert into admin_permissions (user_id, is_main, areas) values (main, true, '{}');
  adm := pg_temp.new_user('existing.user@example.test');
  stu := pg_temp.new_user('student.mgmt@example.test');
  update profiles set batch_id = pg_temp.id('batch'), section_id = pg_temp.id('sec_a') where id = stu;

  -- Invite an existing account → granted at once.
  perform pg_temp.login(main);
  r := public.invite_admin('Existing.User@example.test', '{routine,notices}');
  perform pg_temp.logout();
  perform pg_temp.ok('invite existing account → areas granted at once',
    r = 'granted' and (select areas = '{routine,notices}' and revoked_at is null
                         from admin_permissions where user_id = adm), r);

  -- Invite a new email → waits for the first sign-in, then applies.
  perform pg_temp.login(main);
  r := public.invite_admin('later.admin@example.test', '{cr}');
  perform pg_temp.logout();
  later := pg_temp.new_user('later.admin@example.test');
  perform pg_temp.ok('invite new email → applied on first sign-in',
    r = 'invited' and exists (select 1 from admin_permissions where user_id = later and areas = '{cr}'), r);

  -- Validation.
  perform pg_temp.login(main);
  begin perform public.invite_admin('x@example.test', '{}'); exception when others then err := sqlerrm; end;
  perform pg_temp.ok('invite needs at least one area', err like '%at least one area%', coalesce(err, 'accepted'));
  err := null;
  begin perform public.invite_admin('x@example.test', '{everything}'); exception when others then err := sqlerrm; end;
  perform pg_temp.ok('unknown area refused', err like 'Unknown area%', coalesce(err, 'accepted'));
  err := null;
  begin perform public.invite_admin('not-an-email', '{cr}'); exception when others then err := sqlerrm; end;
  perform pg_temp.ok('invalid email refused', err like '%valid email%', coalesce(err, 'accepted'));

  -- Change areas, revoke.
  perform public.set_admin_areas(adm, '{users}');
  perform pg_temp.logout();
  perform pg_temp.ok('areas changed', (select areas from admin_permissions where user_id = adm) = '{users}');
  perform pg_temp.login(adm);
  perform pg_temp.ok('new areas take effect at once',
    public.has_admin_area('users') and not public.has_admin_area('routine'));
  perform pg_temp.logout();

  -- A non-main admin cannot manage admins.
  err := null;
  perform pg_temp.login(adm);
  begin perform public.invite_admin('someone@example.test', '{cr}'); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('ordinary admin cannot invite', err like 'Only the main administrator%', coalesce(err, 'invited'));

  perform pg_temp.login(main);
  perform public.revoke_admin(adm);
  perform pg_temp.logout();
  perform pg_temp.login(adm);
  perform pg_temp.ok('revoked admin loses access at once', not public.is_any_admin());
  perform pg_temp.logout();

  -- Dashboard: counts for admins, refused for students.
  perform pg_temp.login(main);
  d := public.admin_dashboard();
  perform pg_temp.logout();
  perform pg_temp.ok('dashboard counts students per batch',
    exists (select 1 from jsonb_array_elements(d->'students_by_batch') e
             where e->>'batch' = 'T263' and (e->>'students')::int = 1)
    and d->>'semester' is not null, (d->'students_by_batch')::text);
  err := null;
  perform pg_temp.login(stu);
  begin perform public.admin_dashboard(); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('students cannot read the dashboard', err = 'Not allowed', coalesce(err, 'returned'));

  -- Audit log records the admin changes with the actor.
  select count(*) into n from audit_log
   where entity in ('admin_permissions', 'admin_invites') and actor_id = main and at >= now();
  perform pg_temp.ok('admin changes are in the audit log with the actor', n >= 4, format('rows=%s', n));

  -- Handover (AUTH-5).
  err := null;
  perform pg_temp.login(main);
  begin perform public.transfer_main_admin(stu); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('handover works to an active account', err is null, coalesce(err, ''));
  perform pg_temp.ok('new person is the only main admin',
    (select count(*) from admin_permissions where is_main and revoked_at is null) = 1
    and exists (select 1 from admin_permissions where user_id = stu and is_main and revoked_at is null));
  perform pg_temp.ok('old main admin keeps every area as an ordinary admin',
    (select not is_main and areas = public.admin_area_names() from admin_permissions where user_id = main));
  perform pg_temp.ok('main_admin_email follows the handover',
    (select value #>> '{}' from app_settings where key = 'auth.main_admin_email') = 'student.mgmt@example.test');
  err := null;
  perform pg_temp.login(main);
  begin perform public.revoke_admin(stu); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('former main admin cannot manage admins any more', err like 'Only the main%', coalesce(err, 'revoked'));
end $$;
