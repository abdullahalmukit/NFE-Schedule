export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      academic_events: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string
          date: string
          deleted_at: string | null
          end_time: string | null
          id: string
          in_class_time: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          lab_group_id: string | null
          note: string | null
          room_id: string | null
          section_id: string
          start_time: string | null
          syllabus: string | null
          sync_version: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by: string
          date: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          in_class_time?: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          lab_group_id?: string | null
          note?: string | null
          room_id?: string | null
          section_id: string
          start_time?: string | null
          syllabus?: string | null
          sync_version?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string
          date?: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          in_class_time?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          lab_group_id?: string | null
          note?: string | null
          room_id?: string | null
          section_id?: string
          start_time?: string | null
          syllabus?: string | null
          sync_version?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "academic_events_lab_group_id_fkey"
            columns: ["lab_group_id"]
            isOneToOne: false
            referencedRelation: "lab_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_events_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invites: {
        Row: {
          accepted_at: string | null
          areas: string[]
          email: string
          invited_at: string
          invited_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          areas?: string[]
          email: string
          invited_at?: string
          invited_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          areas?: string[]
          email?: string
          invited_at?: string
          invited_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_permissions: {
        Row: {
          areas: string[]
          granted_at: string
          granted_by: string | null
          is_main: boolean
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          areas?: string[]
          granted_at?: string
          granted_by?: string | null
          is_main?: boolean
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          areas?: string[]
          granted_at?: string
          granted_by?: string | null
          is_main?: boolean
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      app_releases: {
        Row: {
          channel: string
          deleted_at: string | null
          download_path: string | null
          id: string
          min_supported_code: number
          notes: string | null
          notes_bn: string | null
          platform: Database["public"]["Enums"]["release_platform"]
          published_at: string
          store_url: string | null
          sync_version: number
          updated_at: string
          version_code: number
          version_name: string
        }
        Insert: {
          channel?: string
          deleted_at?: string | null
          download_path?: string | null
          id?: string
          min_supported_code: number
          notes?: string | null
          notes_bn?: string | null
          platform: Database["public"]["Enums"]["release_platform"]
          published_at?: string
          store_url?: string | null
          sync_version?: number
          updated_at?: string
          version_code: number
          version_name: string
        }
        Update: {
          channel?: string
          deleted_at?: string | null
          download_path?: string | null
          id?: string
          min_supported_code?: number
          notes?: string | null
          notes_bn?: string | null
          platform?: Database["public"]["Enums"]["release_platform"]
          published_at?: string
          store_url?: string | null
          sync_version?: number
          updated_at?: string
          version_code?: number
          version_name?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          deleted_at: string | null
          description: string | null
          is_public: boolean
          key: string
          sync_version: number
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          deleted_at?: string | null
          description?: string | null
          is_public?: boolean
          key: string
          sync_version?: number
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          deleted_at?: string | null
          description?: string | null
          is_public?: boolean
          key?: string
          sync_version?: number
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          class_slot_id: string | null
          course_id: string
          date: string
          deleted_at: string | null
          exception_id: string | null
          id: string
          status: Database["public"]["Enums"]["attendance_status"]
          sync_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          class_slot_id?: string | null
          course_id: string
          date: string
          deleted_at?: string | null
          exception_id?: string | null
          id?: string
          status: Database["public"]["Enums"]["attendance_status"]
          sync_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          class_slot_id?: string | null
          course_id?: string
          date?: string
          deleted_at?: string | null
          exception_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          sync_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_slot_id_fkey"
            columns: ["class_slot_id"]
            isOneToOne: false
            referencedRelation: "class_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_exception_id_fkey"
            columns: ["exception_id"]
            isOneToOne: false
            referencedRelation: "class_exceptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          at: string
          before: Json | null
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity: string
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity?: string
          entity_id?: string | null
          id?: never
        }
        Relationships: []
      }
      batches: {
        Row: {
          code: string
          deleted_at: string | null
          graduated_at: string | null
          id: string
          intake_semester: string | null
          status: Database["public"]["Enums"]["batch_status"]
          sync_version: number
          updated_at: string
        }
        Insert: {
          code: string
          deleted_at?: string | null
          graduated_at?: string | null
          id?: string
          intake_semester?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
          sync_version?: number
          updated_at?: string
        }
        Update: {
          code?: string
          deleted_at?: string | null
          graduated_at?: string | null
          id?: string
          intake_semester?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
          sync_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      buildings: {
        Row: {
          code: string
          deleted_at: string | null
          id: string
          name: string | null
          sync_version: number
          updated_at: string
        }
        Insert: {
          code: string
          deleted_at?: string | null
          id?: string
          name?: string | null
          sync_version?: number
          updated_at?: string
        }
        Update: {
          code?: string
          deleted_at?: string | null
          id?: string
          name?: string | null
          sync_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      calendar_days: {
        Row: {
          applies_to: Json | null
          date: string
          deleted_at: string | null
          end_date: string | null
          id: string
          sync_version: number
          title: string | null
          type: Database["public"]["Enums"]["calendar_day_type"]
          updated_at: string
        }
        Insert: {
          applies_to?: Json | null
          date: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          sync_version?: number
          title?: string | null
          type: Database["public"]["Enums"]["calendar_day_type"]
          updated_at?: string
        }
        Update: {
          applies_to?: Json | null
          date?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          sync_version?: number
          title?: string | null
          type?: Database["public"]["Enums"]["calendar_day_type"]
          updated_at?: string
        }
        Relationships: []
      }
      class_exceptions: {
        Row: {
          class_slot_id: string | null
          course_id: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          faculty_id: string | null
          id: string
          lab_group_id: string | null
          new_date: string | null
          new_end: string | null
          new_room_id: string | null
          new_start: string | null
          new_time_slot_id: string | null
          note: string | null
          section_id: string
          sync_version: number
          type: Database["public"]["Enums"]["exception_type"]
          updated_at: string
        }
        Insert: {
          class_slot_id?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          deleted_at?: string | null
          faculty_id?: string | null
          id?: string
          lab_group_id?: string | null
          new_date?: string | null
          new_end?: string | null
          new_room_id?: string | null
          new_start?: string | null
          new_time_slot_id?: string | null
          note?: string | null
          section_id: string
          sync_version?: number
          type: Database["public"]["Enums"]["exception_type"]
          updated_at?: string
        }
        Update: {
          class_slot_id?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          faculty_id?: string | null
          id?: string
          lab_group_id?: string | null
          new_date?: string | null
          new_end?: string | null
          new_room_id?: string | null
          new_start?: string | null
          new_time_slot_id?: string | null
          note?: string | null
          section_id?: string
          sync_version?: number
          type?: Database["public"]["Enums"]["exception_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_exceptions_class_slot_id_fkey"
            columns: ["class_slot_id"]
            isOneToOne: false
            referencedRelation: "class_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_exceptions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_exceptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_exceptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "class_exceptions_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_exceptions_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_exceptions_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_exceptions_lab_group_id_fkey"
            columns: ["lab_group_id"]
            isOneToOne: false
            referencedRelation: "lab_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_exceptions_new_room_id_fkey"
            columns: ["new_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_exceptions_new_time_slot_id_fkey"
            columns: ["new_time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_exceptions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      class_slots: {
        Row: {
          course_id: string
          day: number
          deleted_at: string | null
          faculty_id: string | null
          id: string
          lab_group_id: string | null
          note: string | null
          raw_text: string[] | null
          room_id: string | null
          section_id: string
          section_label: string
          span: number
          sync_version: number
          time_slot_id: string
          updated_at: string
          version_id: string
        }
        Insert: {
          course_id: string
          day: number
          deleted_at?: string | null
          faculty_id?: string | null
          id?: string
          lab_group_id?: string | null
          note?: string | null
          raw_text?: string[] | null
          room_id?: string | null
          section_id: string
          section_label: string
          span?: number
          sync_version?: number
          time_slot_id: string
          updated_at?: string
          version_id: string
        }
        Update: {
          course_id?: string
          day?: number
          deleted_at?: string | null
          faculty_id?: string | null
          id?: string
          lab_group_id?: string | null
          note?: string | null
          raw_text?: string[] | null
          room_id?: string | null
          section_id?: string
          section_label?: string
          span?: number
          sync_version?: number
          time_slot_id?: string
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_slots_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_slots_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_slots_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_slots_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_slots_lab_group_id_fkey"
            columns: ["lab_group_id"]
            isOneToOne: false
            referencedRelation: "lab_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_slots_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_slots_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_slots_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_slots_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "routine_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          credit: number | null
          deleted_at: string | null
          id: string
          offering_department_id: string | null
          prefix: string | null
          status: Database["public"]["Enums"]["record_status"]
          sync_version: number
          title: string | null
          title_bn: string | null
          type: Database["public"]["Enums"]["course_type"]
          updated_at: string
        }
        Insert: {
          code: string
          credit?: number | null
          deleted_at?: string | null
          id?: string
          offering_department_id?: string | null
          prefix?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          sync_version?: number
          title?: string | null
          title_bn?: string | null
          type?: Database["public"]["Enums"]["course_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          credit?: number | null
          deleted_at?: string | null
          id?: string
          offering_department_id?: string | null
          prefix?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          sync_version?: number
          title?: string | null
          title_bn?: string | null
          type?: Database["public"]["Enums"]["course_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_offering_department_id_fkey"
            columns: ["offering_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      cr_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          deleted_at: string | null
          id: string
          invited_email: string | null
          request_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          section_id: string
          semester_id: string
          source: string
          sync_version: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          deleted_at?: string | null
          id?: string
          invited_email?: string | null
          request_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          section_id: string
          semester_id: string
          source: string
          sync_version?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          deleted_at?: string | null
          id?: string
          invited_email?: string | null
          request_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          section_id?: string
          semester_id?: string
          source?: string
          sync_version?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cr_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cr_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cr_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_assignments_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_assignments_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cr_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_assignments_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cr_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          phone: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          section_id: string
          semester_id: string
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          phone?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_id: string
          semester_id: string
          status?: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          phone?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_id?: string
          semester_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cr_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cr_requests_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_requests_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          deleted_at: string | null
          id: string
          is_home: boolean
          name: string | null
          sync_version: number
          updated_at: string
        }
        Insert: {
          code: string
          deleted_at?: string | null
          id?: string
          is_home?: boolean
          name?: string | null
          sync_version?: number
          updated_at?: string
        }
        Update: {
          code?: string
          deleted_at?: string | null
          id?: string
          is_home?: boolean
          name?: string | null
          sync_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      extra_enrolments: {
        Row: {
          course_id: string
          deleted_at: string | null
          id: string
          lab_group_id: string | null
          section_id: string
          semester_id: string
          sync_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          deleted_at?: string | null
          id?: string
          lab_group_id?: string | null
          section_id: string
          semester_id: string
          sync_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          deleted_at?: string | null
          id?: string
          lab_group_id?: string | null
          section_id?: string
          semester_id?: string
          sync_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_enrolments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_enrolments_lab_group_id_fkey"
            columns: ["lab_group_id"]
            isOneToOne: false
            referencedRelation: "lab_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_enrolments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_enrolments_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_enrolments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_enrolments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      faculty: {
        Row: {
          consultation_hours: string | null
          contact_visibility: Json
          deleted_at: string | null
          department_id: string | null
          designation: string | null
          email: string | null
          full_name: string | null
          id: string
          initial: string
          is_guest: boolean
          joined_on: string | null
          left_on: string | null
          office_room: string | null
          phone: string | null
          photo_path: string | null
          status: Database["public"]["Enums"]["faculty_status"]
          sync_version: number
          updated_at: string
        }
        Insert: {
          consultation_hours?: string | null
          contact_visibility?: Json
          deleted_at?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          initial: string
          is_guest?: boolean
          joined_on?: string | null
          left_on?: string | null
          office_room?: string | null
          phone?: string | null
          photo_path?: string | null
          status?: Database["public"]["Enums"]["faculty_status"]
          sync_version?: number
          updated_at?: string
        }
        Update: {
          consultation_hours?: string | null
          contact_visibility?: Json
          deleted_at?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          initial?: string
          is_guest?: boolean
          joined_on?: string | null
          left_on?: string | null
          office_room?: string | null
          phone?: string | null
          photo_path?: string | null
          status?: Database["public"]["Enums"]["faculty_status"]
          sync_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          deleted_at: string | null
          description: string | null
          enabled: boolean
          key: string
          min_app_version: string | null
          roles: string[]
          sync_version: number
          updated_at: string
        }
        Insert: {
          deleted_at?: string | null
          description?: string | null
          enabled?: boolean
          key: string
          min_app_version?: string | null
          roles?: string[]
          sync_version?: number
          updated_at?: string
        }
        Update: {
          deleted_at?: string | null
          description?: string | null
          enabled?: boolean
          key?: string
          min_app_version?: string | null
          roles?: string[]
          sync_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      i18n_overrides: {
        Row: {
          deleted_at: string | null
          key: string
          locale: string
          sync_version: number
          updated_at: string
          value: string
        }
        Insert: {
          deleted_at?: string | null
          key: string
          locale: string
          sync_version?: number
          updated_at?: string
          value: string
        }
        Update: {
          deleted_at?: string | null
          key?: string
          locale?: string
          sync_version?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      import_mapping_presets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["import_kind"]
          mapping: Json
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["import_kind"]
          mapping: Json
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["import_kind"]
          mapping?: Json
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_mapping_presets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_mapping_presets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      import_runs: {
        Row: {
          applied_at: string | null
          created_at: string
          created_by: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          kind: Database["public"]["Enums"]["import_kind"]
          mapping: Json | null
          result: Json | null
          semester_id: string | null
          status: Database["public"]["Enums"]["import_status"]
          version_id: string | null
          version_label: string | null
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          kind: Database["public"]["Enums"]["import_kind"]
          mapping?: Json | null
          result?: Json | null
          semester_id?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          version_id?: string | null
          version_label?: string | null
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          kind?: Database["public"]["Enums"]["import_kind"]
          mapping?: Json | null
          result?: Json | null
          semester_id?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          version_id?: string | null
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "import_runs_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "routine_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_reports: {
        Row: {
          class_slot_id: string | null
          created_at: string
          id: string
          kind: string
          message: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          class_slot_id?: string | null
          created_at?: string
          id?: string
          kind: string
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          class_slot_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_reports_class_slot_id_fkey"
            columns: ["class_slot_id"]
            isOneToOne: false
            referencedRelation: "class_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "issue_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lab_groups: {
        Row: {
          deleted_at: string | null
          id: string
          name: string
          section_id: string
          status: Database["public"]["Enums"]["record_status"]
          sync_version: number
          updated_at: string
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          name: string
          section_id: string
          status?: Database["public"]["Enums"]["record_status"]
          sync_version?: number
          updated_at?: string
        }
        Update: {
          deleted_at?: string | null
          id?: string
          name?: string
          section_id?: string
          status?: Database["public"]["Enums"]["record_status"]
          sync_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_groups_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          course_id: string | null
          deleted_at: string | null
          id: string
          sync_version: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          course_id?: string | null
          deleted_at?: string | null
          id?: string
          sync_version?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          course_id?: string | null
          deleted_at?: string | null
          id?: string
          sync_version?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notices: {
        Row: {
          author_id: string
          author_role: string
          batch_id: string | null
          body: string
          course_id: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string
          lab_group_id: string | null
          pinned: boolean
          published_at: string
          scope: Database["public"]["Enums"]["notice_scope"]
          section_id: string | null
          sync_version: number
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_role: string
          batch_id?: string | null
          body: string
          course_id?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          lab_group_id?: string | null
          pinned?: boolean
          published_at?: string
          scope: Database["public"]["Enums"]["notice_scope"]
          section_id?: string | null
          sync_version?: number
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_role?: string
          batch_id?: string | null
          body?: string
          course_id?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          lab_group_id?: string | null
          pinned?: boolean
          published_at?: string
          scope?: Database["public"]["Enums"]["notice_scope"]
          section_id?: string | null
          sync_version?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notices_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_lab_group_id_fkey"
            columns: ["lab_group_id"]
            isOneToOne: false
            referencedRelation: "lab_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          data: Json
          dispatch_log: Json | null
          dispatched_at: string | null
          id: string
          kind: string
          target: Json
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          data?: Json
          dispatch_log?: Json | null
          dispatched_at?: string | null
          id?: string
          kind: string
          target: Json
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          dispatch_log?: Json | null
          dispatched_at?: string | null
          id?: string
          kind?: string
          target?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          event_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          awaiting_routine: boolean
          batch_id: string | null
          created_at: string
          deleted_at: string | null
          email: string
          faculty_id: string | null
          full_name: string | null
          id: string
          lab_group_id: string | null
          locale: string
          section_id: string | null
          status: Database["public"]["Enums"]["user_status"]
          sync_version: number
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          awaiting_routine?: boolean
          batch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          faculty_id?: string | null
          full_name?: string | null
          id: string
          lab_group_id?: string | null
          locale?: string
          section_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          sync_version?: number
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          awaiting_routine?: boolean
          batch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          faculty_id?: string | null
          full_name?: string | null
          id?: string
          lab_group_id?: string | null
          locale?: string
          section_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          sync_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_lab_group_id_fkey"
            columns: ["lab_group_id"]
            isOneToOne: false
            referencedRelation: "lab_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          app_version: string | null
          created_at: string
          id: string
          kind: string
          last_seen: string
          platform: string | null
          token: string
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: string
          kind: string
          last_seen?: string
          platform?: string | null
          token: string
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_seen?: string
          platform?: string | null
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rooms: {
        Row: {
          building_id: string
          capacity: number | null
          deleted_at: string | null
          floor: number | null
          id: string
          is_active: boolean
          number: string
          sync_version: number
          type: Database["public"]["Enums"]["room_type"]
          updated_at: string
        }
        Insert: {
          building_id: string
          capacity?: number | null
          deleted_at?: string | null
          floor?: number | null
          id?: string
          is_active?: boolean
          number: string
          sync_version?: number
          type?: Database["public"]["Enums"]["room_type"]
          updated_at?: string
        }
        Update: {
          building_id?: string
          capacity?: number | null
          deleted_at?: string | null
          floor?: number | null
          id?: string
          is_active?: boolean
          number?: string
          sync_version?: number
          type?: Database["public"]["Enums"]["room_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_versions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          effective_from: string | null
          id: string
          label: string
          notes: string | null
          parent_version_id: string | null
          published_at: string | null
          published_by: string | null
          semester_id: string
          source: Database["public"]["Enums"]["version_source"]
          source_file_path: string | null
          status: Database["public"]["Enums"]["version_status"]
          sync_version: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from?: string | null
          id?: string
          label: string
          notes?: string | null
          parent_version_id?: string | null
          published_at?: string | null
          published_by?: string | null
          semester_id: string
          source: Database["public"]["Enums"]["version_source"]
          source_file_path?: string | null
          status?: Database["public"]["Enums"]["version_status"]
          sync_version?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from?: string | null
          id?: string
          label?: string
          notes?: string | null
          parent_version_id?: string | null
          published_at?: string | null
          published_by?: string | null
          semester_id?: string
          source?: Database["public"]["Enums"]["version_source"]
          source_file_path?: string | null
          status?: Database["public"]["Enums"]["version_status"]
          sync_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "routine_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "routine_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "routine_versions_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      section_changes: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_lab: string | null
          from_section: string | null
          id: string
          to_lab: string | null
          to_section: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_lab?: string | null
          from_section?: string | null
          id?: string
          to_lab?: string | null
          to_section?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_lab?: string | null
          from_section?: string | null
          id?: string
          to_lab?: string | null
          to_section?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_changes_from_lab_fkey"
            columns: ["from_lab"]
            isOneToOne: false
            referencedRelation: "lab_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_changes_from_section_fkey"
            columns: ["from_section"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_changes_to_lab_fkey"
            columns: ["to_lab"]
            isOneToOne: false
            referencedRelation: "lab_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_changes_to_section_fkey"
            columns: ["to_section"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "section_crs"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sections: {
        Row: {
          batch_id: string
          deleted_at: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["record_status"]
          sync_version: number
          updated_at: string
        }
        Insert: {
          batch_id: string
          deleted_at?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["record_status"]
          sync_version?: number
          updated_at?: string
        }
        Update: {
          batch_id?: string
          deleted_at?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["record_status"]
          sync_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          deleted_at: string | null
          ends_on: string | null
          id: string
          is_active: boolean
          name: string
          starts_on: string | null
          sync_version: number
          updated_at: string
        }
        Insert: {
          deleted_at?: string | null
          ends_on?: string | null
          id?: string
          is_active?: boolean
          name: string
          starts_on?: string | null
          sync_version?: number
          updated_at?: string
        }
        Update: {
          deleted_at?: string | null
          ends_on?: string | null
          id?: string
          is_active?: boolean
          name?: string
          starts_on?: string | null
          sync_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          deleted_at: string | null
          end_time: string
          id: string
          label: string | null
          position: number
          semester_id: string
          start_time: string
          sync_version: number
          updated_at: string
        }
        Insert: {
          deleted_at?: string | null
          end_time: string
          id?: string
          label?: string | null
          position: number
          semester_id: string
          start_time: string
          sync_version?: number
          updated_at?: string
        }
        Update: {
          deleted_at?: string | null
          end_time?: string
          id?: string
          label?: string | null
          position?: number
          semester_id?: string
          start_time?: string
          sync_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_slots_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      faculty_directory: {
        Row: {
          consultation_hours: string | null
          deleted_at: string | null
          department: string | null
          designation: string | null
          email: string | null
          full_name: string | null
          id: string | null
          initial: string | null
          is_guest: boolean | null
          office_room: string | null
          phone: string | null
          photo_path: string | null
          status: Database["public"]["Enums"]["faculty_status"] | null
          sync_version: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      faculty_public: {
        Row: {
          deleted_at: string | null
          department: string | null
          designation: string | null
          full_name: string | null
          id: string | null
          initial: string | null
          is_guest: boolean | null
          photo_path: string | null
          status: Database["public"]["Enums"]["faculty_status"] | null
          sync_version: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      section_crs: {
        Row: {
          deleted_at: string | null
          full_name: string | null
          section_id: string | null
          semester_id: string | null
          sync_version: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cr_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_assignments_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      active_semester_id: { Args: never; Returns: string }
      add_touch_trigger: { Args: { tbl: unknown }; Returns: undefined }
      admin_area_names: { Args: never; Returns: string[] }
      admin_dashboard: { Args: never; Returns: Json }
      apply_for_cr: {
        Args: { p_message?: string; p_phone?: string; p_section: string }
        Returns: string
      }
      apply_master_import: { Args: { p_plan: Json; p_run: string }; Returns: Json }
      archive_superseded_versions: {
        Args: { p_semester: string }
        Returns: undefined
      }
      assign_cr: {
        Args: { p_email?: string; p_section: string; p_user?: string }
        Returns: string
      }
      can_post_to_section: { Args: { p_section: string }; Returns: boolean }
      cancel_admin_invite: { Args: { p_email: string }; Returns: undefined }
      check_admin_areas: { Args: { p_areas: string[] }; Returns: undefined }
      choose_section: {
        Args: { p_lab_group?: string; p_section: string }
        Returns: undefined
      }
      claim_main_admin: { Args: never; Returns: boolean }
      daily_maintenance: { Args: never; Returns: string }
      event_recipients: { Args: { p_event: string }; Returns: string[] }
      has_admin_area: { Args: { area: string }; Returns: boolean }
      hook_before_user_created: { Args: { event: Json }; Returns: Json }
      invite_admin: {
        Args: { p_areas: string[]; p_email: string }
        Returns: string
      }
      is_active_member: { Args: never; Returns: boolean }
      is_any_admin: { Args: never; Returns: boolean }
      is_cr_of: { Args: { p_section: string }; Returns: boolean }
      is_main_admin: { Args: never; Returns: boolean }
      my_faculty_id: { Args: never; Returns: string }
      my_notifications: {
        Args: { p_limit?: number }
        Returns: {
          body: string
          created_at: string
          data: Json
          id: string
          kind: string
          read: boolean
          title: string
        }[]
      }
      publish_routine_version: {
        Args: {
          p_affected_lab_group_ids?: string[]
          p_affected_section_ids?: string[]
          p_effective_from: string
          p_notify: boolean
          p_summary?: string
          p_version: string
        }
        Returns: undefined
      }
      review_cr_request: {
        Args: { p_approve: boolean; p_note?: string; p_request: string }
        Returns: undefined
      }
      review_signup: {
        Args: { p_approve: boolean; p_user: string }
        Returns: undefined
      }
      revoke_admin: { Args: { p_user: string }; Returns: undefined }
      revoke_cr: { Args: { p_assignment: string }; Returns: undefined }
      set_active_semester: { Args: { p_semester: string }; Returns: undefined }
      set_admin_areas: {
        Args: { p_areas: string[]; p_user: string }
        Returns: undefined
      }
      signup_settings: { Args: never; Returns: Json }
      sync_pull: { Args: { p_since?: number }; Returns: Json }
      teaches_section: { Args: { p_section: string }; Returns: boolean }
      transfer_main_admin: { Args: { p_user: string }; Returns: undefined }
      version_in_effect: {
        Args: { p_date?: string; p_semester: string }
        Returns: string
      }
    }
    Enums: {
      account_type: "student" | "faculty" | "staff"
      attendance_status: "attended" | "missed" | "cancelled"
      batch_status: "active" | "graduated"
      calendar_day_type: "holiday" | "exam_week" | "no_class" | "special"
      course_type: "theory" | "lab" | "other"
      event_kind:
        | "quiz"
        | "lab_exam"
        | "mid"
        | "final"
        | "assignment"
        | "presentation"
        | "other"
      exception_type: "cancelled" | "rescheduled" | "room_change" | "makeup"
      faculty_status: "active" | "on_leave" | "left"
      import_kind: "routine" | "faculty" | "courses"
      import_status: "uploaded" | "parsed" | "applied" | "failed" | "cancelled"
      notice_scope: "department" | "batch" | "section" | "lab_group" | "course"
      record_status: "active" | "inactive" | "archived"
      release_platform: "android" | "ios" | "web"
      request_status: "pending" | "approved" | "rejected" | "withdrawn"
      room_type: "classroom" | "lab" | "gym" | "other"
      user_status: "pending" | "active" | "alumni" | "disabled"
      version_source: "import" | "manual" | "rollback"
      version_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["student", "faculty", "staff"],
      attendance_status: ["attended", "missed", "cancelled"],
      batch_status: ["active", "graduated"],
      calendar_day_type: ["holiday", "exam_week", "no_class", "special"],
      course_type: ["theory", "lab", "other"],
      event_kind: [
        "quiz",
        "lab_exam",
        "mid",
        "final",
        "assignment",
        "presentation",
        "other",
      ],
      exception_type: ["cancelled", "rescheduled", "room_change", "makeup"],
      faculty_status: ["active", "on_leave", "left"],
      import_kind: ["routine", "faculty", "courses"],
      import_status: ["uploaded", "parsed", "applied", "failed", "cancelled"],
      notice_scope: ["department", "batch", "section", "lab_group", "course"],
      record_status: ["active", "inactive", "archived"],
      release_platform: ["android", "ios", "web"],
      request_status: ["pending", "approved", "rejected", "withdrawn"],
      room_type: ["classroom", "lab", "gym", "other"],
      user_status: ["pending", "active", "alumni", "disabled"],
      version_source: ["import", "manual", "rollback"],
      version_status: ["draft", "published", "archived"],
    },
  },
} as const
