/**
 * One-off class changes (ADM-RT-9 for admins, CR-5 for CRs later): cancel,
 * reschedule or move one class on one date, or add a makeup class. The
 * routine itself never changes. Values come from an HTML form as strings.
 */
import { z } from "zod";
import { dayIndexFromJsDay } from "../days";

export const EXCEPTION_TYPES = ["cancelled", "rescheduled", "room_change", "makeup"] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date");
const optionalId = z
  .string()
  .trim()
  .refine((v) => v === "" || z.string().uuid().safeParse(v).success, "id")
  .transform((v) => v || null);
const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "date")
  .transform((v) => v || null);

/** Day index (0 = Saturday) of a "YYYY-MM-DD" date, independent of the time zone. */
export function dayIndexOfDate(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return dayIndexFromJsDay(new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay());
}

export const classExceptionForm = z
  .object({
    type: z.enum(EXCEPTION_TYPES),
    section_id: z.string().uuid(),
    date,
    /** The class of the routine; empty for a makeup class. */
    class_slot_id: optionalId,
    lab_group_id: optionalId,
    course_id: optionalId,
    faculty_id: optionalId,
    new_date: optionalDate,
    new_time_slot_id: optionalId,
    new_room_id: optionalId,
    note: z
      .string()
      .trim()
      .max(300)
      .transform((v) => v || null),
  })
  .superRefine((v, ctx) => {
    const need = (ok: boolean, path: string, message: string) => {
      if (!ok) ctx.addIssue({ code: "custom", path: [path], message });
    };
    if (v.type === "makeup") {
      need(!!v.course_id, "course_id", "course");
      need(!!v.new_time_slot_id, "new_time_slot_id", "time");
    } else {
      need(!!v.class_slot_id, "class_slot_id", "class");
    }
    if (v.type === "rescheduled") {
      need(!!v.new_date && !!v.new_time_slot_id, "new_time_slot_id", "newTime");
    }
    if (v.type === "room_change") need(!!v.new_room_id, "new_room_id", "room");
  })
  .transform((v) => ({
    ...v,
    // Fields that do not belong to the type are dropped.
    class_slot_id: v.type === "makeup" ? null : v.class_slot_id,
    course_id: v.type === "makeup" ? v.course_id : null,
    faculty_id: v.type === "makeup" ? v.faculty_id : null,
    new_date: v.type === "rescheduled" ? v.new_date : null,
    new_time_slot_id: v.type === "rescheduled" || v.type === "makeup" ? v.new_time_slot_id : null,
    new_room_id: v.type === "cancelled" ? null : v.new_room_id,
  }));

export type ClassExceptionInput = z.infer<typeof classExceptionForm>;
