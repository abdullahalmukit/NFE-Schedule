-- apply_for_cr works for a section other than one's own;
-- review_cr_request refuses approval above cr.policy.max_per_section.
do $$
declare admin uuid; s uuid; x uuid; y uuid; req uuid; err text; refused boolean := false; approved boolean := true;
begin
  admin := pg_temp.new_user('admin.cr@example.test');
  insert into admin_permissions (user_id, areas) values (admin, '{cr}');
  s := pg_temp.new_user('applicant@example.test');
  update profiles set batch_id = pg_temp.id('batch'), section_id = pg_temp.id('sec_a') where id = s;

  perform pg_temp.login(s);
  begin
    req := public.apply_for_cr(pg_temp.id('sec_b'), 'I can help', '01700000000');
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('student of A can apply for B', req is not null, coalesce(err, ''));
  perform pg_temp.ok('request stored as pending for B',
    (select status = 'pending' and section_id = pg_temp.id('sec_b') from cr_requests where id = req));

  update app_settings set value = jsonb_set(value, '{max_per_section}', '2') where key = 'cr.policy';
  x := pg_temp.new_user('cr.b1@example.test');
  y := pg_temp.new_user('cr.b2@example.test');
  insert into cr_assignments (section_id, semester_id, user_id, source)
  values (pg_temp.id('sec_b'), pg_temp.id('semester'), x, 'manual'),
         (pg_temp.id('sec_b'), pg_temp.id('semester'), y, 'manual');

  perform pg_temp.login(admin);
  begin
    perform public.review_cr_request(req, true);
  exception when others then refused := true; err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('approval refused when B already has 2 CRs', refused and err like '%already has 2 CRs%', coalesce(err, ''));
  perform pg_temp.ok('request still pending after refusal',
    (select status from cr_requests where id = req) = 'pending');

  update cr_assignments set revoked_at = now() where user_id = y;
  err := null;
  perform pg_temp.login(admin);
  begin
    perform public.review_cr_request(req, true);
  exception when others then approved := false; err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('approval works below the limit', approved, coalesce(err, ''));
  perform pg_temp.ok('applicant is now CR of B',
    exists (select 1 from cr_assignments where user_id = s and section_id = pg_temp.id('sec_b') and revoked_at is null));
end $$;
