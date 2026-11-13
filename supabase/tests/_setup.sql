-- Shared setup for the database checks (docs/DATABASE.md §4).
-- supabase/tests/run.ts wraps each check as: begin; <this file>; <check>; select results; rollback;
-- Everything here is temporary: test users, rows and pg_temp helpers vanish with the rollback.

create temp table _r (n serial, check_name text, ok boolean, detail text);
grant all on _r to anon, authenticated;
grant usage on sequence _r_n_seq to anon, authenticated;

create temp table _ids (k text primary key, id uuid);
grant select on _ids to anon, authenticated;

-- Record one result.
create function pg_temp.ok(p_name text, p_ok boolean, p_detail text default '') returns void
language sql as $$
  insert into _r (check_name, ok, detail) values (p_name, coalesce(p_ok, false), coalesce(p_detail, ''))
$$;

create function pg_temp.id(p_key text) returns uuid
language sql stable as $$ select id from _ids where k = p_key $$;

-- A test account; the on_auth_user_created trigger creates its profile.
create function pg_temp.new_user(p_email text) returns uuid
language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          jsonb_build_object('full_name', 'Test ' || split_part(p_email, '@', 1)), now(), now());
  return v;
end $$;

-- Act as a signed-in user, as a guest, or go back to the owner role.
create function pg_temp.login(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
                     json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.guest() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end $$;

create function pg_temp.logout() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- Test fixture: an active semester, batch T263 with sections A and B, one course.
do $$
declare s uuid; b uuid; a uuid; bb uuid; c uuid;
begin
  update semesters set is_active = false where is_active;
  insert into semesters (name, is_active, starts_on, ends_on)
  values ('TEST semester', true, current_date - 30, current_date + 60) returning id into s;
  insert into batches (code) values ('T263') returning id into b;
  insert into sections (batch_id, name) values (b, 'A') returning id into a;
  insert into sections (batch_id, name) values (b, 'B') returning id into bb;
  insert into courses (code, title) values ('TEST-0001', 'Test course') returning id into c;
  insert into _ids values ('semester', s), ('batch', b), ('sec_a', a), ('sec_b', bb), ('course', c);
end $$;
