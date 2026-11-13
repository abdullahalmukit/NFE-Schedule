-- A CR of T263-A can insert a class_exceptions row for T263-A and not for T263-B;
-- an ordinary student cannot insert one at all.
do $$
declare cr uuid; st uuid; ok_a boolean := true; err_a text; err_b text; err_st text;
begin
  cr := pg_temp.new_user('cr.a@example.test');
  st := pg_temp.new_user('student.a@example.test');
  update profiles set batch_id = pg_temp.id('batch'), section_id = pg_temp.id('sec_a') where id in (cr, st);
  insert into cr_assignments (section_id, semester_id, user_id, source)
  values (pg_temp.id('sec_a'), pg_temp.id('semester'), cr, 'manual');

  perform pg_temp.login(cr);
  begin
    insert into class_exceptions (section_id, date, type, created_by)
    values (pg_temp.id('sec_a'), current_date + 1, 'cancelled', cr);
  exception when others then ok_a := false; err_a := sqlerrm;
  end;
  begin
    insert into class_exceptions (section_id, date, type, created_by)
    values (pg_temp.id('sec_b'), current_date + 1, 'cancelled', cr);
  exception when others then err_b := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('CR of A can post an exception for A', ok_a, coalesce(err_a, ''));
  perform pg_temp.ok('CR of A cannot post an exception for B', err_b like '%row-level security%', coalesce(err_b, 'inserted'));
  perform pg_temp.ok('the exception created a notification event for section A',
    exists (select 1 from notification_events where kind = 'class_exception'
             and target->'section_ids' ? pg_temp.id('sec_a')::text));

  perform pg_temp.login(st);
  begin
    insert into class_exceptions (section_id, date, type, created_by)
    values (pg_temp.id('sec_a'), current_date + 1, 'cancelled', st);
  exception when others then err_st := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('plain student cannot post an exception', err_st like '%row-level security%', coalesce(err_st, 'inserted'));
end $$;
