-- Private settings must not leak through functions, and definer helpers have a fixed search_path
-- (Supabase Advisors: anon_security_definer_function_executable, function_search_path_mutable).
do $$
declare err text; leaked jsonb;
begin
  update app_settings set value = '["secret.blocked@example.test"]' where key = 'auth.blocked_emails';

  perform pg_temp.guest();
  begin
    leaked := public.signup_settings();
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.logout();
  perform pg_temp.ok('anon cannot read signup_settings() (has blocked emails)',
    leaked is null, coalesce(err, 'returned ' || coalesce(leaked->>'blocked_emails', 'null')));

  perform pg_temp.ok('signed-in users cannot call signup_settings()',
    not has_function_privilege('authenticated', 'public.signup_settings()', 'execute'));
  perform pg_temp.ok('auth service can still call signup_settings()',
    has_function_privilege('supabase_auth_admin', 'public.signup_settings()', 'execute'));

  perform pg_temp.ok('helper functions have a fixed search_path',
    not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public'
                   and p.proname in ('touch_row', 'add_touch_trigger', 'can_post_to_section', 'version_in_effect')
                   and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
    (select string_agg(p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('touch_row', 'add_touch_trigger', 'can_post_to_section', 'version_in_effect')
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')));
end $$;
