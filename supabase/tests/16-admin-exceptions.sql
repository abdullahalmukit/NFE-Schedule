-- ADM-RT-9: a routine admin posts class exceptions for any section (no CR role needed) and can
-- withdraw them; the section or lab group is notified; admins of other areas cannot post.
do $$
declare adm uuid; other uuid; ex uuid; grp uuid; err text; ev record;
begin
  adm := pg_temp.new_user('rx.routine@example.test');
  other := pg_temp.new_user('rx.rooms@example.test');
  insert into admin_permissions (user_id, areas) values (adm, '{routine}'), (other, '{rooms}');
  update profiles set status = 'active' where id in (adm, other);
  insert into lab_groups (section_id, name) values (pg_temp.id('sec_b'), 'B1') returning id into grp;

  perform pg_temp.login(adm);
  insert into class_exceptions (section_id, date, type, note, created_by)
  values (pg_temp.id('sec_a'), current_date + 2, 'cancelled', 'Teacher away', adm) returning id into ex;
  insert into class_exceptions (section_id, lab_group_id, date, type, course_id, created_by)
  values (pg_temp.id('sec_b'), grp, current_date + 3, 'makeup', pg_temp.id('course'), adm);
  perform pg_temp.logout();

  select * into ev from notification_events where kind = 'class_exception' and data ->> 'id' = ex::text;
  perform pg_temp.ok('a routine admin posts for any section and the section is notified',
    ev.target -> 'section_ids' ? pg_temp.id('sec_a')::text and ev.body = 'Teacher away', coalesce(ev.target::text, 'none'));
  perform pg_temp.ok('a lab-group makeup notifies only that lab group',
    exists (select 1 from notification_events where kind = 'class_exception' and target -> 'lab_group_ids' ? grp::text));

  perform pg_temp.login(adm);
  update class_exceptions set deleted_at = now() where id = ex;
  perform pg_temp.logout();
  perform pg_temp.ok('the admin withdraws an exception', (select deleted_at is not null from class_exceptions where id = ex));

  err := null;
  perform pg_temp.login(other);
  begin
    insert into class_exceptions (section_id, date, type, created_by)
    values (pg_temp.id('sec_a'), current_date + 2, 'cancelled', other);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('admins of other areas cannot post exceptions', err like '%row-level security%', coalesce(err, 'inserted'));
end $$;
