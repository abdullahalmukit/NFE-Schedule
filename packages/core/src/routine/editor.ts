/**
 * Manual routine editor (ADM-RT-5): validation of the class form. Values come
 * from an HTML form as strings.
 */
import { z } from "zod";

const id = z.string().uuid();
const optionalId = z
  .string()
  .trim()
  .refine((v) => v === "" || z.string().uuid().safeParse(v).success, "id")
  .transform((v) => v || null);

export const classSlotForm = z.object({
  version_id: id,
  section_id: id,
  day: z.coerce.number().int().min(0).max(6),
  time_slot_id: id,
  course_id: id,
  section_label: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => /^[A-Z]{1,2}$/.test(v), "sectionLabel"),
  lab_group_id: optionalId,
  faculty_id: optionalId,
  room_id: optionalId,
  span: z.coerce.number().int().min(1).max(6),
  note: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null),
});

export type ClassSlotInput = z.infer<typeof classSlotForm>;
