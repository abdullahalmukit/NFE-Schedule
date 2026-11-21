-- ADM-RT-5 / ADM-RT-6: only drafts are edited; routine admins add and rename sections and
-- lab groups without the batches area; an empty draft can be started; one draft per semester.
do $$
declare
  adm uuid; other uuid; v_draft uuid; v_pub uuid; v_empty uuid; ts uuid; slot uuid; sec uuid; grp uuid;
  err text; n int;
begin
  adm := pg_temp.new_user('re.routine@example.test');
  other := pg_temp.new_user('re.courses@example.test');
  insert into admin_permissions (user_id, areas) values (adm, '{routine}'), (other, '{courses}');

  insert into time_slots (semester_id, position, start_time, end_time)
  values (pg_temp.id('semester'), 16, '08:20', '09:50') returning id into ts;
  insert into routine_versions (semester_id, label, source, status)
  values (pg_temp.id('semester'), 'E1', 'import', 'draft') returning id into v_draft;
  insert into class_slots (version_id, section_id, course_id, section_label, day, time_slot_id)
  values (v_draft, pg_temp.id('sec_a'), pg_temp.id('course'), 'A', 0, ts) returning id into slot;

  -- sections and lab groups
  perform pg_temp.login(adm);
  sec := public.ensure_section('t264', 'b');
  grp := public.ensure_lab_group(sec, 'b1');
  perform public.rename_section_or_group('lab_group', grp, 'B2');
  perform pg_temp.logout();
  perform pg_temp.ok('a routine admin adds a batch, section and lab group and renames it',
    exists (select 1 from lab_groups g join sections s on s.id = g.section_id join batches b on b.id = s.batch_id
             where b.code = 'T264' and s.name = 'B' and g.name = 'B2' and g.id = grp));
  perform pg_temp.login(adm);
  perform pg_temp.ok('adding the same section again returns it', public.ensure_section('T264', 'B') = sec);
  perform pg_temp.logout();

  err := null;
  perform pg_temp.login(other);
  begin perform public.ensure_section('T265', 'A'); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('other admins cannot add sections here', err like '%Not allowed%', coalesce(err, 'added'));

  -- edit the draft
  perform pg_temp.login(adm);
  update class_slots set day = 2, section_id = sec, lab_group_id = grp where id = slot;
  insert into class_slots (version_id, section_id, course_id, section_label, day, time_slot_id)
  values (v_draft, sec, pg_temp.id('course'), 'B', 3, ts);
  update class_slots set deleted_at = now() where id = slot;
  perform pg_temp.logout();
  select count(*) into n from class_slots where version_id = v_draft and deleted_at is null;
  perform pg_temp.ok('a draft is edited: move, add and remove', n = 1, format('live=%s', n));

  -- published versions are frozen
  perform pg_temp.login(adm);
  perform public.publish_routine_version(v_draft, null, false);
  v_pub := v_draft;
  err := null;
  begin update class_slots set day = 4 where version_id = v_pub; exception when others then err := sqlerrm; end;
  perform pg_temp.ok('a published version cannot be edited', err like '%Only a draft%', coalesce(err, 'edited'));
  err := null;
  begin
    insert into class_slots (version_id, section_id, course_id, section_label, day, time_slot_id)
    values (v_pub, sec, pg_temp.id('course'), 'B', 4, ts);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.ok('no class can be added to a published version', err like '%Only a draft%', coalesce(err, 'added'));

  -- start from scratch
  v_empty := public.create_empty_draft(pg_temp.id('semester'), 'E2');
  perform pg_temp.ok('an empty draft is created as a manual version',
    (select status = 'draft' and source = 'manual' and parent_version_id = v_pub from routine_versions where id = v_empty)
    and not exists (select 1 from class_slots where version_id = v_empty));
  err := null;
  begin perform public.create_empty_draft(pg_temp.id('semester'), 'E3'); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('still one draft per semester', err like '%draft already exists%', coalesce(err, 'created'));
end $$;
