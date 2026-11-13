-- NFE Schedule — initial schema
-- Applied to the cloud Supabase project with: supabase db push
-- Every table the phone keeps offline carries updated_at, deleted_at and
-- sync_version. Rows are soft-deleted (deleted_at) so phones see tombstones.

create extension if not exists pgcrypto;
create extension if not exists citext;

create sequence if not exists public.sync_seq;

-- ---------------------------------------------------------------- enums
create type public.account_type      as enum ('student', 'faculty', 'staff');
create type public.user_status       as enum ('pending', 'active', 'alumni', 'disabled');  -- pending = waiting for admin approval
create type public.batch_status      as enum ('active', 'graduated');
create type public.record_status     as enum ('active', 'inactive', 'archived');
create type public.faculty_status    as enum ('active', 'on_leave', 'left');
create type public.course_type       as enum ('theory', 'lab', 'other');
create type public.room_type         as enum ('classroom', 'lab', 'gym', 'other');
create type public.version_status    as enum ('draft', 'published', 'archived');
create type public.version_source    as enum ('import', 'manual', 'rollback');
create type public.exception_type    as enum ('cancelled', 'rescheduled', 'room_change', 'makeup');
create type public.notice_scope      as enum ('department', 'batch', 'section', 'lab_group', 'course');
create type public.event_kind        as enum ('quiz', 'lab_exam', 'mid', 'final', 'assignment', 'presentation', 'other');
create type public.request_status    as enum ('pending', 'approved', 'rejected', 'withdrawn');
create type public.attendance_status as enum ('attended', 'missed', 'cancelled');
create type public.calendar_day_type as enum ('holiday', 'exam_week', 'no_class', 'special');
create type public.import_kind       as enum ('routine', 'faculty', 'courses');
create type public.import_status     as enum ('uploaded', 'parsed', 'applied', 'failed', 'cancelled');
create type public.release_platform  as enum ('android', 'ios', 'web');

-- ---------------------------------------------------------------- helpers
create or replace function public.touch_row() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.sync_version := nextval('public.sync_seq');
  return new;
end $$;

-- Adds the trigger to a table that has updated_at + sync_version.
create or replace function public.add_touch_trigger(tbl regclass) returns void
language plpgsql as $$
begin
  execute format('create trigger touch_row before update on %s for each row execute function public.touch_row()', tbl);
end $$;

-- ---------------------------------------------------------------- settings (admin-customisable, see docs/ADMIN_CUSTOMIZATION.md)
create table public.app_settings (
  key          text primary key,
  value        jsonb not null,
  is_public    boolean not null default true,   -- readable by guests and the app
  description  text,
  updated_by   uuid,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  sync_version bigint not null default nextval('public.sync_seq')
);

create table public.feature_flags (
  key              text primary key,
  enabled          boolean not null default true,
  roles            text[] not null default '{guest,student,cr,faculty,admin}',
  min_app_version  text,               -- hide on older builds that lack the code
  description      text,
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  sync_version     bigint not null default nextval('public.sync_seq')
);

create table public.i18n_overrides (
  locale       text not null check (locale in ('en', 'bn')),
  key          text not null,
  value        text not null,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  sync_version bigint not null default nextval('public.sync_seq'),
  primary key (locale, key)
);

-- ---------------------------------------------------------------- reference data
create table public.departments (
  id           uuid primary key default gen_random_uuid(),
  code         citext not null unique,          -- NFE, ITM ...
  name         text,
  is_home      boolean not null default false,  -- true for NFE
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  sync_version bigint not null default nextval('public.sync_seq')
);

create table public.semesters (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,            -- "Fall 2026"
  starts_on    date,
  ends_on      date,
  is_active    boolean not null default false,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  sync_version bigint not null default nextval('public.sync_seq')
);
create unique index semesters_one_active on public.semesters (is_active) where is_active and deleted_at is null;

create table public.time_slots (
  id           uuid primary key default gen_random_uuid(),
  semester_id  uuid not null references public.semesters(id),
  position     smallint not null check (position between 1 and 20),
  start_time   time not null,
  end_time     time not null check (end_time > start_time),
  label        text,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  sync_version bigint not null default nextval('public.sync_seq'),
  unique (semester_id, position)
);

create table public.batches (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,        -- "263"
  intake_semester  text,
  status           public.batch_status not null default 'active',
  graduated_at     timestamptz,
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  sync_version     bigint not null default nextval('public.sync_seq')
);

create table public.sections (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references public.batches(id),
  name         text not null,                   -- "A"
  status       public.record_status not null default 'active',
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  sync_version bigint not null default nextval('public.sync_seq'),
  unique (batch_id, name)
);

create table public.lab_groups (
  id           uuid primary key default gen_random_uuid(),
  section_id   uuid not null references public.sections(id),
  name         text not null,                   -- "A1"
  status       public.record_status not null default 'active',
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  sync_version bigint not null default nextval('public.sync_seq'),
  unique (section_id, name)
);

create table public.courses (
  id                      uuid primary key default gen_random_uuid(),
  code                    citext not null unique,   -- "0531-1103", "AOL 0223-111"
  prefix                  text,
  title                   text,
  title_bn                text,
  credit                  numeric(3,1),
  type                    public.course_type not null default 'theory',
  offering_department_id  uuid references public.departments(id),
  status                  public.record_status not null default 'active',
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz,
  sync_version            bigint not null default nextval('public.sync_seq')
);

create table public.faculty (
  id                  uuid primary key default gen_random_uuid(),  -- identity is NOT the initial
  initial             citext not null,
  department_id       uuid references public.departments(id),
  full_name           text,
  designation         text,
  email               citext,
  phone               text,
  office_room         text,
  consultation_hours  text,
  photo_path          text,                     -- storage: faculty-photos/<id>.jpg
  contact_visibility  jsonb not null default '{"email": true, "phone": false, "office_room": true}',
  is_guest            boolean not null default false,
  status              public.faculty_status not null default 'active',
  joined_on           date,
  left_on             date,
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  sync_version        bigint not null default nextval('public.sync_seq')
);
-- An initial is unique only among active faculty of one department.
create unique index faculty_active_initial
  on public.faculty (initial, coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status <> 'left' and deleted_at is null;

create table public.buildings (
  id           uuid primary key default gen_random_uuid(),
  code         citext not null unique,          -- "AB-1", "Gym"
  name         text,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  sync_version bigint not null default nextval('public.sync_seq')
);

create table public.rooms (
  id           uuid primary key default gen_random_uuid(),
  building_id  uuid not null references public.buildings(id),
  number       text not null,                   -- "304"
  floor        smallint,                        -- derived on import, editable
  type         public.room_type not null default 'classroom',
  capacity     integer,
  is_active    boolean not null default true,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  sync_version bigint not null default nextval('public.sync_seq'),
  unique (building_id, number)
);

create table public.calendar_days (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  end_date     date,                            -- for ranges such as exam week
  type         public.calendar_day_type not null,
  title        text,
  applies_to   jsonb,                           -- null = everyone; {"batch_ids": [...]} otherwise
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  sync_version bigint not null default nextval('public.sync_seq')
);

-- ---------------------------------------------------------------- users
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         citext not null unique,
  full_name     text,
  avatar_url    text,
  account_type  public.account_type not null default 'student',
  status        public.user_status not null default 'active',
  batch_id      uuid references public.batches(id),
  section_id    uuid references public.sections(id),
  lab_group_id  uuid references public.lab_groups(id),
  faculty_id    uuid references public.faculty(id),
  locale        text not null default 'bn' check (locale in ('en', 'bn')),
  awaiting_routine boolean not null default false, -- signed up before own batch was published
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  sync_version  bigint not null default nextval('public.sync_seq')
);

create table public.section_changes (           -- every change of section / lab group is logged
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id),
  from_section  uuid references public.sections(id),
  to_section    uuid references public.sections(id),
  from_lab      uuid references public.lab_groups(id),
  to_lab        uuid references public.lab_groups(id),
  changed_by    uuid,
  changed_at    timestamptz not null default now()
);

create table public.admin_permissions (
  user_id      uuid primary key references public.profiles(id),
  is_main      boolean not null default false,
  areas        text[] not null default '{}',
  granted_by   uuid references public.profiles(id),
  granted_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  constraint areas_known check (areas <@ array[
    'routine','courses','faculty','batches','rooms','notices','cr','calendar',
    'settings','releases','users','reports'
  ]::text[])
);
create unique index one_main_admin on public.admin_permissions (is_main) where is_main and revoked_at is null;

create table public.admin_invites (            -- invite by email before the person signs up
  email        citext primary key,
  areas        text[] not null default '{}',
  invited_by   uuid references public.profiles(id),
  invited_at   timestamptz not null default now(),
  accepted_at  timestamptz
);

-- ---------------------------------------------------------------- routine
create table public.routine_versions (
  id                uuid primary key default gen_random_uuid(),
  semester_id       uuid not null references public.semesters(id),
  label             text not null,              -- "5", "5.1"
  source            public.version_source not null,
  parent_version_id uuid references public.routine_versions(id),
  source_file_path  text,                       -- storage: routine-files/<semester>/<label>.docx
  status            public.version_status not null default 'draft',
  effective_from    date,
  notes             text,
  created_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  published_by      uuid references public.profiles(id),
  published_at      timestamptz,
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  sync_version      bigint not null default nextval('public.sync_seq'),
  unique (semester_id, label)
);

create table public.class_slots (
  id            uuid primary key default gen_random_uuid(),
  version_id    uuid not null references public.routine_versions(id) on delete cascade,
  section_id    uuid not null references public.sections(id),
  lab_group_id  uuid references public.lab_groups(id),
  course_id     uuid not null references public.courses(id),
  section_label text not null,                  -- letter written after the code
  faculty_id    uuid references public.faculty(id),
  room_id       uuid references public.rooms(id),
  day           smallint not null check (day between 0 and 6),   -- 0 = Saturday
  time_slot_id  uuid not null references public.time_slots(id),
  span          smallint not null default 1 check (span between 1 and 6),
  raw_text      text[],
  note          text,
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  sync_version  bigint not null default nextval('public.sync_seq')
);
create index class_slots_version_section on public.class_slots (version_id, section_id);
create index class_slots_version_faculty on public.class_slots (version_id, faculty_id);
create index class_slots_version_room    on public.class_slots (version_id, room_id, day);

create table public.class_exceptions (          -- one class on one date; never edits the routine
  id               uuid primary key default gen_random_uuid(),
  class_slot_id    uuid references public.class_slots(id),   -- null for a makeup class
  section_id       uuid not null references public.sections(id),
  lab_group_id     uuid references public.lab_groups(id),
  date             date not null,
  type             public.exception_type not null,
  course_id        uuid references public.courses(id),
  faculty_id       uuid references public.faculty(id),
  new_date         date,
  new_time_slot_id uuid references public.time_slots(id),
  new_start        time,                        -- for makeup outside the slot grid
  new_end          time,
  new_room_id      uuid references public.rooms(id),
  note             text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  sync_version     bigint not null default nextval('public.sync_seq'),
  constraint makeup_has_course check (type <> 'makeup' or course_id is not null)
);
create index class_exceptions_section_date on public.class_exceptions (section_id, date);

create table public.extra_enrolments (          -- retake / improvement classes from other sections
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id),
  semester_id   uuid not null references public.semesters(id),
  course_id     uuid not null references public.courses(id),
  section_id    uuid not null references public.sections(id),
  lab_group_id  uuid references public.lab_groups(id),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  sync_version  bigint not null default nextval('public.sync_seq')
);
create unique index extra_enrolments_unique
  on public.extra_enrolments (user_id, semester_id, course_id, section_id) where deleted_at is null;

-- ---------------------------------------------------------------- imports (routine, faculty, courses)
create table public.import_runs (
  id            uuid primary key default gen_random_uuid(),
  kind          public.import_kind not null,
  file_path     text not null,                  -- storage: imports/<id>/<filename>
  file_name     text not null,
  file_type     text not null,                  -- docx, doc, pdf, csv, xlsx, json
  status        public.import_status not null default 'uploaded',
  semester_id   uuid references public.semesters(id),
  version_label text,
  mapping       jsonb,                          -- column mapping chosen by the admin
  result        jsonb,                          -- parsed output, stats, issues, diff
  version_id    uuid references public.routine_versions(id),
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  applied_at    timestamptz
);

create table public.import_mapping_presets (
  id          uuid primary key default gen_random_uuid(),
  kind        public.import_kind not null,
  name        text not null,
  mapping     jsonb not null,                   -- {"full_name": "Name", "initial": "Short Name", ...}
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (kind, name)
);

-- ---------------------------------------------------------------- class representatives
create table public.cr_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id),
  section_id    uuid not null references public.sections(id),  -- any batch-section, not only one's own
  semester_id   uuid not null references public.semesters(id),
  message       text,
  phone         text,
  status        public.request_status not null default 'pending',
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now()
);
create unique index cr_requests_one_pending
  on public.cr_requests (user_id, section_id, semester_id) where status = 'pending';

create table public.cr_assignments (
  id             uuid primary key default gen_random_uuid(),
  section_id     uuid not null references public.sections(id),
  semester_id    uuid not null references public.semesters(id),
  user_id        uuid references public.profiles(id),
  invited_email  citext,                         -- manual assignment before the student signs up
  source         text not null check (source in ('request', 'manual')),
  request_id     uuid references public.cr_requests(id),
  assigned_by    uuid references public.profiles(id),
  assigned_at    timestamptz not null default now(),
  revoked_at     timestamptz,
  revoked_by     uuid references public.profiles(id),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  sync_version   bigint not null default nextval('public.sync_seq'),
  constraint cr_has_person check (user_id is not null or invited_email is not null)
);
create unique index cr_assignment_unique
  on public.cr_assignments (section_id, semester_id, coalesce(user_id::text, invited_email::text))
  where revoked_at is null;

-- ---------------------------------------------------------------- communication
create table public.notices (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  scope         public.notice_scope not null,
  batch_id      uuid references public.batches(id),
  section_id    uuid references public.sections(id),
  lab_group_id  uuid references public.lab_groups(id),
  course_id     uuid references public.courses(id),
  pinned        boolean not null default false,
  author_id     uuid not null references public.profiles(id),
  author_role   text not null check (author_role in ('admin', 'cr', 'faculty')),
  published_at  timestamptz not null default now(),
  expires_at    timestamptz,
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  sync_version  bigint not null default nextval('public.sync_seq')
);

create table public.academic_events (           -- quiz, lab exam, mid, final, deadline
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid not null references public.sections(id),
  lab_group_id  uuid references public.lab_groups(id),
  course_id     uuid references public.courses(id),
  kind          public.event_kind not null,
  title         text not null,
  date          date not null,
  start_time    time,
  end_time      time,
  in_class_time boolean not null default false,
  room_id       uuid references public.rooms(id),
  syllabus      text,
  note          text,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  sync_version  bigint not null default nextval('public.sync_seq')
);

-- One row per event; recipients are resolved from target at send time.
create table public.notification_events (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,                  -- routine_published, class_exception, notice, academic_event, cr_status, routine_ready
  title         text not null,
  body          text not null,
  data          jsonb not null default '{}',
  target        jsonb not null,                 -- {"all":true} | {"section_ids":[]} | {"lab_group_ids":[]} | {"user_ids":[]} | {"batch_ids":[]}
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  dispatched_at timestamptz,
  dispatch_log  jsonb
);

create table public.notification_reads (
  user_id   uuid not null references public.profiles(id),
  event_id  uuid not null references public.notification_events(id),
  read_at   timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),  -- null for a guest device
  token       text not null unique,                 -- Expo push token or Web Push subscription JSON
  kind        text not null check (kind in ('expo', 'webpush')),
  platform    text,
  app_version text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

-- ---------------------------------------------------------------- personal (private to the student)
create table public.attendance_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id),
  class_slot_id uuid references public.class_slots(id),
  exception_id  uuid references public.class_exceptions(id),   -- makeup classes
  course_id     uuid not null references public.courses(id),
  date          date not null,
  status        public.attendance_status not null,
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  sync_version  bigint not null default nextval('public.sync_seq')
);
create unique index attendance_unique
  on public.attendance_records (user_id, coalesce(class_slot_id, exception_id), date);

create table public.notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id),
  course_id     uuid references public.courses(id),
  title         text,
  body          text not null default '',
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  sync_version  bigint not null default nextval('public.sync_seq')
);

create table public.issue_reports (             -- "Report wrong information"
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id),
  class_slot_id  uuid references public.class_slots(id),
  kind           text not null check (kind in ('wrong_room', 'wrong_time', 'wrong_teacher', 'missing_class', 'other')),
  message        text,
  status         text not null default 'open' check (status in ('open', 'fixed', 'dismissed')),
  resolved_by    uuid references public.profiles(id),
  resolved_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------- app releases (APK pilot, Play Store, App Store)
create table public.app_releases (
  id                   uuid primary key default gen_random_uuid(),
  platform             public.release_platform not null,
  channel              text not null default 'production' check (channel in ('preview', 'production')),
  version_name         text not null,           -- "1.3.0"
  version_code         integer not null,        -- Android versionCode / iOS build number
  min_supported_code   integer not null,        -- older builds see the force-update screen
  download_path        text,                    -- storage: app-releases/<file>.apk (pilot)
  store_url            text,                    -- Play / App Store link after approval
  notes                text,
  notes_bn             text,
  published_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  sync_version         bigint not null default nextval('public.sync_seq'),
  unique (platform, channel, version_code)
);

-- ---------------------------------------------------------------- audit
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  action     text not null,                     -- insert, update, delete, publish, approve ...
  entity     text not null,
  entity_id  text,
  before     jsonb,
  after      jsonb,
  at         timestamptz not null default now()
);
create index audit_log_at on public.audit_log (at desc);

-- ---------------------------------------------------------------- touch triggers
select public.add_touch_trigger(t::regclass) from unnest(array[
  'public.app_settings','public.feature_flags','public.i18n_overrides','public.departments',
  'public.semesters','public.time_slots','public.batches','public.sections','public.lab_groups',
  'public.courses','public.faculty','public.buildings','public.rooms','public.calendar_days',
  'public.profiles','public.routine_versions','public.class_slots','public.class_exceptions',
  'public.extra_enrolments','public.cr_assignments','public.notices','public.academic_events',
  'public.attendance_records','public.notes','public.app_releases'
]) as t;
