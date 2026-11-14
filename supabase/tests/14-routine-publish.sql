-- ADM-RT-4 / ADM-RT-7 / ADM-RT-10: publish a draft (now or later), graduate chosen batches,
-- notify only the affected sections, copy any version to a new draft, count affected students.
do $$
declare
  adm uuid; other uuid; stu_a uuid; stu_old uuid; v1 uuid; v2 uuid; v3 uuid; old_batch uuid; old_sec uuid;
  ts uuid; n int; err text; ev record;
begin
  adm := pg_temp.new_user('rp.routine@example.test');
  other := pg_temp.new_user('rp.notices@example.test');
  stu_a := pg_temp.new_user('rp.student.a@example.test');
  stu_old := pg_temp.new_user('rp.student.old@example.test');
  insert into admin_permissions (user_id, areas) values (adm, '{routine}'), (other, '{notices}');

  insert into batches (code) values ('T201') returning id into old_batch;
  insert into sections (batch_id, name) values (old_batch, 'A') returning id into old_sec;
  update profiles set status = 'active', section_id = pg_temp.id('sec_a') where id = stu_a;
  update profiles set status = 'active', batch_id = old_batch, section_id = old_sec where id = stu_old;

  insert into time_slots (semester_id, position, start_time, end_time)
  values (pg_temp.id('semester'), 17, '08:20', '09:50') returning id into ts;
  insert into routine_versions (semester_id, label, source, status) values (pg_temp.id('semester'), 'P1', 'import', 'draft')
  returning id into v1;
  insert into class_slots (version_id, section_id, course_id, section_label, day, time_slot_id)
  values (v1, pg_temp.id('sec_a'), pg_temp.id('course'), 'A', 0, ts);

  -- counting and publishing need the routine area
  perform pg_temp.login(other);
  select public.count_affected_students(array[pg_temp.id('sec_a')], '{}') into n;
  err := null;
  begin perform public.publish_routine_version(v1, null, true); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('other admins get no count and cannot publish', n is null and err like '%Not allowed%', coalesce(err, 'published'));

  perform pg_temp.login(adm);
  select public.count_affected_students(array[pg_temp.id('sec_a')], '{}') into n;
  perform pg_temp.ok('the publish dialog counts affected students', n >= 1, format('n=%s', n));
  perform public.publish_routine_version(v1, null, true, array[pg_temp.id('sec_a')], '{}', '', array['T201']);
  perform pg_temp.logout();

  perform pg_temp.ok('the draft is published today by the admin',
    (select status = 'published' and effective_from = current_date and published_by = adm from routine_versions where id = v1));
  perform pg_temp.ok('a graduating batch is closed and its students become alumni',
    (select status = 'graduated' and graduated_at is not null from batches where id = old_batch)
    and (select status = 'alumni' from profiles where id = stu_old)
    and (select status = 'active' from profiles where id = stu_a));
  select * into ev from notification_events where kind = 'routine_published' and data ->> 'version_id' = v1::text;
  perform pg_temp.ok('only the affected sections are notified, with the default text for an empty summary',
    ev.target -> 'section_ids' = to_jsonb(array[pg_temp.id('sec_a')]) and ev.body like 'Your class routine%', coalesce(ev.target::text, 'none'));

  -- students still cannot change their own status
  perform pg_temp.login(stu_a);
  update profiles set status = 'alumni' where id = stu_a;
  perform pg_temp.logout();
  perform pg_temp.ok('the profile guard still protects status', (select status = 'active' from profiles where id = stu_a));

  -- restore: copy to a new draft
  perform pg_temp.login(adm);
  v2 := public.copy_version_to_draft(v1, 'P1.1', 'rollback');
  perform pg_temp.ok('a version is copied to a new draft with all its classes',
    (select status = 'draft' and source = 'rollback' and parent_version_id = v1 from routine_versions where id = v2)
    and (select count(*) = 1 from class_slots where version_id = v2));
  err := null;
  begin perform public.copy_version_to_draft(v1, 'P1.2', 'rollback'); exception when others then err := sqlerrm; end;
  perform pg_temp.ok('only one draft per semester', err like '%draft already exists%', coalesce(err, 'copied'));

  -- a future date keeps the current version in effect
  perform public.publish_routine_version(v2, current_date + 7, false);
  perform pg_temp.logout();
  perform pg_temp.ok('a version for a later date leaves the current one in effect',
    public.version_in_effect(pg_temp.id('semester'), current_date) = v1
    and public.version_in_effect(pg_temp.id('semester'), current_date + 7) = v2
    and not exists (select 1 from notification_events where data ->> 'version_id' = v2::text and kind = 'routine_published'));

  perform pg_temp.login(adm);
  insert into routine_versions (semester_id, label, source, status) values (pg_temp.id('semester'), 'P3', 'manual', 'draft')
  returning id into v3;
  err := null;
  begin perform public.publish_routine_version(v3, current_date - 1, false); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('the effective date cannot be in the past', err like '%past%', coalesce(err, 'published'));
end $$;
