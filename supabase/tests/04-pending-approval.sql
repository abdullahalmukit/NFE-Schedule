-- With auto_register = false a new account is pending, cannot read notices or post,
-- and becomes active after review_signup. Invited faculty are active at once.
do $$
declare admin uuid; u uuid; t uuid; n int; err text;
begin
  admin := pg_temp.new_user('admin.users@example.test');   -- created while auto_register is still on
  insert into admin_permissions (user_id, areas) values (admin, '{users,notices}');
  insert into notices (title, body, scope, author_id, author_role)
  values ('Test notice', 'For everyone', 'department', admin, 'admin');

  update app_settings set value = jsonb_set(value, '{auto_register}', 'false') where key = 'auth.signup';
  u := pg_temp.new_user('pending.student@example.test');
  perform pg_temp.ok('new account is pending', (select status from profiles where id = u) = 'pending');

  insert into faculty (initial, full_name, email) values ('TSTP', 'Test Teacher', 'pending.teacher@example.test');
  t := pg_temp.new_user('pending.teacher@example.test');
  perform pg_temp.ok('invited faculty is active at once and linked',
    (select status = 'active' and account_type = 'faculty' and faculty_id is not null from profiles where id = t));

  perform pg_temp.login(u);
  select count(*) into n from notices;
  perform pg_temp.ok('pending: cannot read notices', n = 0, format('visible=%s', n));
  err := null;
  begin
    insert into notices (title, body, scope, section_id, author_id, author_role)
    values ('x', 'x', 'section', pg_temp.id('sec_a'), u, 'cr');
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.ok('pending: cannot post a notice', err like '%row-level security%', coalesce(err, 'inserted'));
  err := null;
  begin
    perform public.apply_for_cr(pg_temp.id('sec_a'));
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.ok('pending: cannot apply for CR', err like '%approved account%', coalesce(err, 'applied'));
  err := null;
  begin
    perform public.review_signup(u, true);   -- approving oneself
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.ok('pending: cannot approve itself', err = 'Not allowed', coalesce(err, 'approved'));
  perform pg_temp.logout();

  perform pg_temp.login(admin);
  perform public.review_signup(u, true);
  perform pg_temp.logout();
  perform pg_temp.ok('review_signup makes it active', (select status from profiles where id = u) = 'active');

  perform pg_temp.login(u);
  select count(*) into n from notices;
  perform pg_temp.logout();
  perform pg_temp.ok('approved: can read notices', n = 1, format('visible=%s', n));
end $$;
