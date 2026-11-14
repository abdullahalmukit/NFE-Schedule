/**
 * Validation of the master-data admin forms (ADM-MD-4, ADM-MD-5). Values come
 * from HTML forms as strings; these schemas trim, normalise and convert them.
 */
import { z } from "zod";
import {
  normalizeCourseCode,
  normalizeEmail,
  normalizeInitial,
  normalizePhone,
  toLatinDigits,
} from "./normalize";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => toLatinDigits(v))
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max), "number")
    .transform((v) => (v === "" ? null : Number(v)));

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "date")
  .transform((v) => v || null);

const optionalUuid = z
  .string()
  .trim()
  .refine((v) => v === "" || /^[0-9a-f-]{36}$/i.test(v), "id")
  .transform((v) => v || null);

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.null(), z.undefined()])
  .transform((v) => v === "on" || v === "true");

export const courseForm = z.object({
  code: z.string().transform((v, ctx) => {
    const n = normalizeCourseCode(v);
    if (!n) ctx.addIssue({ code: "custom", message: "code" });
    return n?.code ?? v;
  }),
  title: optionalText(200),
  title_bn: optionalText(200),
  credit: z
    .string()
    .trim()
    .transform((v) => toLatinDigits(v))
    .refine((v) => v === "" || (/^\d+(\.\d)?$/.test(v) && Number(v) <= 20), "credit")
    .transform((v) => (v === "" ? null : Number(v))),
  type: z.enum(["theory", "lab", "other"]),
  offering_department_id: optionalUuid,
});

export const facultyForm = z
  .object({
    initial: z
      .string()
      .transform(normalizeInitial)
      .refine((v) => /^[A-Z]{1,8}$/.test(v), "initial"),
    full_name: optionalText(120),
    designation: optionalText(120),
    department_id: optionalUuid,
    email: z
      .string()
      .transform(normalizeEmail)
      .refine((v) => v === "" || z.string().email().safeParse(v).success, "email")
      .transform((v) => v || null),
    phone: z
      .string()
      .transform(normalizePhone)
      .refine((v) => v === "" || /^\+?\d{6,15}$/.test(v), "phone")
      .transform((v) => v || null),
    office_room: optionalText(60),
    consultation_hours: optionalText(300),
    status: z.enum(["active", "on_leave", "left"]),
    is_guest: checkbox,
    joined_on: optionalDate,
    left_on: optionalDate,
    show_email: checkbox,
    show_phone: checkbox,
    show_office_room: checkbox,
  })
  .transform(({ show_email, show_phone, show_office_room, ...f }) => ({
    ...f,
    contact_visibility: { email: show_email, phone: show_phone, office_room: show_office_room },
  }));

export const departmentForm = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => /^[A-Z]{2,8}$/.test(v), "code"),
  name: optionalText(120),
});

export const batchForm = z.object({
  code: z
    .string()
    .transform((v) => toLatinDigits(v).trim())
    .refine((v) => /^\d{2,4}$/.test(v), "batch"),
  intake_semester: optionalText(40),
});

export const sectionForm = z.object({
  batch_id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => /^[A-Z]{1,2}$/.test(v), "section"),
});

export const labGroupForm = z.object({
  section_id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => /^[A-Z]{1,2}\d{1,2}$/.test(v), "labGroup"),
});

export const buildingForm = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .refine((v) => /^[A-Z0-9-]{1,12}$/.test(v), "building"),
  name: optionalText(120),
});

export const roomForm = z.object({
  building_id: z.string().uuid(),
  number: z
    .string()
    .transform((v) => toLatinDigits(v).trim().toUpperCase())
    .refine((v) => /^[A-Z0-9-]{1,10}$/.test(v), "room"),
  floor: optionalInt(0, 50),
  type: z.enum(["classroom", "lab", "gym", "other"]),
  capacity: optionalInt(1, 1000),
  is_active: checkbox,
});

/** First issue of a failed parse, as a stable word ("code", "email", …) for the UI. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "invalid";
}
