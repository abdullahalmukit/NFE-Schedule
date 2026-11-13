-- NFE Schedule — storage buckets and default settings.
-- Everything below is editable later from Admin > Settings; these are only starting values.

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values
  ('imports',        'imports',        false),  -- uploaded routine / faculty / course files
  ('routine-files',  'routine-files',  false),  -- the source file of every published version
  ('faculty-photos', 'faculty-photos', true),
  ('app-releases',   'app-releases',   true),   -- pilot APK files
  ('branding',       'branding',       true)    -- logo variants the admin uploads
on conflict (id) do nothing;

create policy "imports admin rw" on storage.objects for all to authenticated
  using (bucket_id in ('imports', 'routine-files') and public.is_any_admin())
  with check (bucket_id in ('imports', 'routine-files') and public.is_any_admin());

create policy "public buckets read" on storage.objects for select to anon, authenticated
  using (bucket_id in ('faculty-photos', 'app-releases', 'branding'));

create policy "faculty photos write" on storage.objects for all to authenticated
  using (bucket_id = 'faculty-photos' and public.has_admin_area('faculty'))
  with check (bucket_id = 'faculty-photos' and public.has_admin_area('faculty'));

create policy "releases write" on storage.objects for all to authenticated
  using (bucket_id = 'app-releases' and public.has_admin_area('releases'))
  with check (bucket_id = 'app-releases' and public.has_admin_area('releases'));

create policy "branding write" on storage.objects for all to authenticated
  using (bucket_id = 'branding' and public.has_admin_area('settings'))
  with check (bucket_id = 'branding' and public.has_admin_area('settings'));

-- ---------------------------------------------------------------- default settings
insert into public.app_settings (key, value, is_public, description) values
  ('department',                '{"code": "NFE", "name_en": "Nutrition and Food Engineering", "name_bn": "নিউট্রিশন অ্যান্ড ফুড ইঞ্জিনিয়ারিং", "university": "Daffodil International University"}', true, 'Department shown across the app'),
  ('branding',                  '{"app_name": "NFE Schedule", "logo_path": null, "accent_dark": "#3DDC97", "accent_light": "#2FA35A"}', true, 'App name, logo and accent colours'),
  ('auth.signup',               '{"domain_mode": "restricted", "allowed_domains": ["diu.edu.bd"], "auto_register": true, "google": true, "email_otp": false, "message_en": "This email address cannot be used to sign up.", "message_bn": "এই ইমেইল দিয়ে নিবন্ধন করা যাবে না।"}', true, 'Who can sign up and how: domain rule (restricted / any), auto registration, sign-in methods'),
  ('auth.blocked_emails',       '[]', false, 'Emails that may never sign up (private)'),
  ('auth.main_admin_email',     '"REPLACE_WITH_MAIN_ADMIN_EMAIL"', false, 'First sign-in with this email becomes main administrator'),
  ('i18n.default_locale',       '"en"', true, 'Language for new users and guests'),
  ('week',                      '{"start_day": 0, "working_days": [0,1,2,3,4,5], "day_names_en": ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"], "day_names_bn": ["শনিবার","রবিবার","সোমবার","মঙ্গলবার","বুধবার","বৃহস্পতিবার","শুক্রবার"]}', true, 'Week layout; 0 = Saturday'),
  ('parser.routine',            '{"use_defaults": true}', false, 'Routine file format rules; see packages/parser DEFAULT_ROUTINE_RULES'),
  ('cr.policy',                 '{"max_per_section": 2, "applications_open": true, "allow_any_section": true, "expire_with_semester": true, "require_message": false}', true, 'Class Representative rules'),
  ('guest.access',              '{"routine": true, "faculty_names": true, "rooms": true}', true, 'What visitors can see without signing in'),
  ('reminders',                 '{"options_minutes": [10, 15, 30], "default_minutes": 15}', true, 'Class reminder choices'),
  ('changed_badge_days',        '7', true, 'How long a changed class keeps its badge'),
  ('room.floor_rule',           '{"mode": "first_digit"}', true, 'How the floor is worked out from a room number'),
  ('notifications.templates',   '{"routine_published": {"en": "Your class routine has changed. Tap to see what changed.", "bn": "আপনার ক্লাস রুটিন পরিবর্তন হয়েছে। কী বদলেছে দেখতে ট্যাপ করুন।"}}', true, 'Push notification texts'),
  ('nav.tabs',                  '["home","routine","academics","rooms","menu"]', true, 'Bottom tabs and their order'),
  ('home.cards',                '["next_class","today","exams","deadlines","version_banner"]', true, 'Cards on the Home tab and their order'),
  ('sync',                      '{"background_minutes": 60}', true, 'Phone background refresh interval'),
  ('support',                   '{"contact_email": null, "report_issue_enabled": true}', true, 'Help and reporting')
on conflict (key) do nothing;

insert into public.feature_flags (key, enabled, description) values
  ('attendance_tracker', true, 'Personal attendance log'),
  ('notes',              true, 'Personal notes'),
  ('calendar_export',    true, 'Add routine to Google / phone calendar'),
  ('home_widget',        true, 'Android home screen widget'),
  ('share_whatsapp',     true, 'Share routine as image'),
  ('empty_rooms',        true, 'Empty room finder'),
  ('extra_courses',      true, 'Retake / improvement classes'),
  ('faculty_quick_alert',true, 'Teachers send cancel / late alerts'),
  ('report_issue',       true, 'Report wrong information'),
  ('guest_view',         true, 'Routine without signing in'),
  ('cr_apply',           true, 'Students can apply to be CR')
on conflict (key) do nothing;

insert into public.departments (code, name, is_home) values
  ('NFE', 'Nutrition and Food Engineering', true)
on conflict (code) do nothing;
