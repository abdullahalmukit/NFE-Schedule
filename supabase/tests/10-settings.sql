-- ADM-SET-1 / ADM-SET-2: who may change settings, features, texts, semesters, time slots
-- and the calendar; changes reach phones through sync_pull.
do $$
declare
  setadm uuid; routadm uuid; caladm uuid; stu uuid; s2 uuid; n int; m int; err text; r jsonb;
begin
  setadm := pg_temp.new_user('settings.admin@example.test');
  routadm := pg_temp.new_user('routine.admin@example.test');
  caladm := pg_temp.new_user('calendar.admin@example.test');
  stu := pg_temp.new_user('settings.student@example.test');
  insert into admin_permissions (user_id, areas) values
    (setadm, '{settings}'), (routadm, '{routine}'), (caladm, '{calendar}');

  -- app_settings
  perform pg_temp.login(setadm);
  update app_settings set value = '9' where key = 'changed_badge_days';
  get diagnostics n = row_count;
  perform pg_temp.logout();
  perform pg_temp.ok('settings admin changes a setting',
    n = 1 and (select value = '9'::jsonb and updated_by = setadm from app_settings where key = 'changed_badge_days'));

  perform pg_temp.login(routadm);
  update app_settings set value = '1' where key = 'changed_badge_days';
  get diagnostics n = row_count;
  perform pg_temp.logout();
  perform pg_temp.ok('admin without the settings area cannot', n = 0, format('rows=%s', n));

  perform pg_temp.login(stu);
  update app_settings set value = '1' where key = 'changed_badge_days';
  get diagnostics n = row_count;
  update feature_flags set enabled = false where key = 'notes';
  get diagnostics m = row_count;
  n := n + m;
  perform pg_temp.logout();
  perform pg_temp.ok('students cannot change settings or features', n = 0, format('rows=%s', n));

  -- feature flags and text overrides
  perform pg_temp.login(setadm);
  update feature_flags set enabled = false, roles = '{student}' where key = 'notes';
  insert into i18n_overrides (locale, key, value) values ('bn', 'app.tagline', 'পরীক্ষা')
  on conflict (locale, key) do update set value = excluded.value, deleted_at = null;
  perform pg_temp.logout();
  perform pg_temp.ok('settings admin switches a feature',
    (select not enabled and roles = '{student}' from feature_flags where key = 'notes'));
  perform pg_temp.ok('settings admin overrides a text',
    exists (select 1 from i18n_overrides where locale = 'bn' and key = 'app.tagline' and deleted_at is null));

  err := null;
  perform pg_temp.login(stu);
  begin
    insert into i18n_overrides (locale, key, value) values ('en', 'app.name', 'x');
  exception when others then err := sqlerrm;
  end;
  r := public.sync_pull(0);
  perform pg_temp.logout();
  perform pg_temp.ok('students cannot override texts', err like '%row-level security%', coalesce(err, 'inserted'));
  perform pg_temp.ok('phones receive the new text and feature switch on sync',
    exists (select 1 from jsonb_array_elements(r->'i18n_overrides') e where e->>'key' = 'app.tagline')
    and exists (select 1 from jsonb_array_elements(r->'feature_flags') e
                 where e->>'key' = 'notes' and (e->>'enabled')::boolean = false));

  -- semesters and time slots (routine area)
  perform pg_temp.login(routadm);
  insert into semesters (name, starts_on, ends_on) values ('TEST Spring', current_date + 90, current_date + 200)
  returning id into s2;
  insert into time_slots (semester_id, position, start_time, end_time) values
    (s2, 1, '08:30', '10:00'), (s2, 2, '10:00', '11:30');
  perform public.set_active_semester(s2);
  perform pg_temp.logout();
  perform pg_temp.ok('routine admin adds a semester with time slots',
    (select count(*) from time_slots where semester_id = s2 and deleted_at is null) = 2);
  perform pg_temp.ok('set_active_semester leaves exactly one active',
    (select count(*) from semesters where is_active and deleted_at is null) = 1
    and (select is_active from semesters where id = s2));

  err := null;
  perform pg_temp.login(stu);
  begin perform public.set_active_semester(pg_temp.id('semester')); exception when others then err := sqlerrm; end;
  perform pg_temp.logout();
  perform pg_temp.ok('students cannot switch the semester', err = 'Not allowed', coalesce(err, 'switched'));

  err := null;
  perform pg_temp.login(setadm);
  begin
    insert into semesters (name) values ('Not mine');
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('settings admin cannot add semesters (routine area)', err like '%row-level security%', coalesce(err, 'inserted'));

  -- calendar (calendar area)
  perform pg_temp.login(caladm);
  insert into calendar_days (date, end_date, type, title, applies_to)
  values (current_date + 10, current_date + 12, 'holiday', 'Test holiday',
          jsonb_build_object('batch_ids', jsonb_build_array(pg_temp.id('batch'))));
  perform pg_temp.logout();
  perform pg_temp.ok('calendar admin adds a holiday range for one batch',
    exists (select 1 from calendar_days where title = 'Test holiday' and applies_to->'batch_ids' ? pg_temp.id('batch')::text));

  err := null;
  perform pg_temp.login(routadm);
  begin
    insert into calendar_days (date, type, title) values (current_date, 'no_class', 'x');
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('routine admin cannot change the calendar', err like '%row-level security%', coalesce(err, 'inserted'));
end $$;
