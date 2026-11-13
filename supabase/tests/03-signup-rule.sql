-- Sign-up rule (hook_before_user_created): with domain_mode = restricted a gmail.com sign-up is
-- refused and a diu.edu.bd one accepted; with any both are accepted; an invited faculty email
-- is accepted in both modes; a blocked email is refused in both modes.
create function pg_temp.allowed(p_email text) returns boolean
language sql as $$
  select not (public.hook_before_user_created(jsonb_build_object('user', jsonb_build_object('email', p_email))) ? 'error')
$$;

create function pg_temp.set_mode(p_mode text) returns void
language sql as $$
  update app_settings set value = jsonb_set(value, '{domain_mode}', to_jsonb(p_mode)) where key = 'auth.signup'
$$;

do $$
begin
  insert into faculty (initial, full_name, email) values ('TSTF', 'Test Teacher', 'invited.teacher@gmail.com');
  update app_settings set value = '["blocked.person@diu.edu.bd"]' where key = 'auth.blocked_emails';
  update app_settings set value = jsonb_set(value, '{allowed_domains}', '["diu.edu.bd"]') where key = 'auth.signup';

  perform pg_temp.set_mode('restricted');
  perform pg_temp.ok('restricted: gmail.com refused', not pg_temp.allowed('someone@gmail.com'));
  perform pg_temp.ok('restricted: diu.edu.bd accepted', pg_temp.allowed('student@diu.edu.bd'));
  perform pg_temp.ok('restricted: subdomain accepted', pg_temp.allowed('student@s.diu.edu.bd'));
  perform pg_temp.ok('restricted: look-alike domain refused',
    not pg_temp.allowed('x@notdiu.edu.bd') and not pg_temp.allowed('x@diu.edu.bd.example.com'));
  perform pg_temp.ok('restricted: upper-case email handled', pg_temp.allowed('Student@DIU.EDU.BD'));
  perform pg_temp.ok('restricted: invited faculty email accepted', pg_temp.allowed('invited.teacher@gmail.com'));
  perform pg_temp.ok('restricted: blocked email refused', not pg_temp.allowed('blocked.person@diu.edu.bd'));
  perform pg_temp.ok('refusal carries the admin message',
    public.hook_before_user_created('{"user": {"email": "someone@gmail.com"}}')->'error'->>'message'
      = (select value->>'message_en' from app_settings where key = 'auth.signup'));

  perform pg_temp.set_mode('any');
  perform pg_temp.ok('any: gmail.com accepted', pg_temp.allowed('someone@gmail.com'));
  perform pg_temp.ok('any: diu.edu.bd accepted', pg_temp.allowed('student@diu.edu.bd'));
  perform pg_temp.ok('any: invited faculty email accepted', pg_temp.allowed('invited.teacher@gmail.com'));
  perform pg_temp.ok('any: blocked email refused', not pg_temp.allowed('blocked.person@diu.edu.bd'));

  -- Only the auth service may call the hook.
  perform pg_temp.ok('hook not callable by signed-in users',
    not has_function_privilege('authenticated', 'public.hook_before_user_created(jsonb)', 'execute')
    and not has_function_privilege('anon', 'public.hook_before_user_created(jsonb)', 'execute'));
  perform pg_temp.ok('hook callable by supabase_auth_admin',
    has_function_privilege('supabase_auth_admin', 'public.hook_before_user_created(jsonb)', 'execute'));
end $$;
