/**
 * Routine file format rules as stored in `app_settings.parser.routine`
 * (ADM-RT-11; docs/ROUTINE_IMPORT.md §6): either `{"use_defaults": true}` or a
 * full rules object with the same shape as `RoutineParserRules` in
 * `@nfe/parser`. Every pattern must compile and carry the named groups the
 * parser reads.
 */
import { z } from "zod";

export const RULE_PATTERNS = {
  tableTitle: ["batch", "section"],
  courseLine: ["code", "label"],
  facultyLine: ["initial"],
  roomLine: ["building", "room"],
  timeHeader: ["sh", "sm", "eh", "em"],
} as const;

export type RulePattern = keyof typeof RULE_PATTERNS;

export const LINE_KINDS = ["course", "faculty", "room"] as const;

/** Problem with one pattern, or null: "invalid" (does not compile) or "group:<name>" (missing). */
export function patternProblem(pattern: RulePattern, source: string): string | null {
  try {
    new RegExp(source);
  } catch {
    return "invalid";
  }
  const missing = RULE_PATTERNS[pattern].find((g) => !source.includes(`(?<${g}>`));
  return missing ? `group:${missing}` : null;
}

const pattern = (name: RulePattern) =>
  z
    .string()
    .min(1)
    .max(500)
    .superRefine((v, ctx) => {
      const p = patternProblem(name, v);
      if (p) ctx.addIssue({ code: "custom", message: p });
    });

export const routineRulesSchema = z.object({
  tableTitle: pattern("tableTitle"),
  courseLine: pattern("courseLine"),
  facultyLine: pattern("facultyLine"),
  roomLine: pattern("roomLine"),
  timeHeader: pattern("timeHeader"),
  pmBeforeHour: z.number().int().min(1).max(12),
  days: z
    .record(z.string().trim().toLowerCase().min(3).max(30), z.number().int().min(0).max(6))
    .refine((d) => Object.keys(d).length >= 1, "days"),
  lineOrder: z
    .array(z.enum(LINE_KINDS))
    .length(3)
    .refine((l) => new Set(l).size === 3, "lineOrder"),
});

export type RoutineRules = z.infer<typeof routineRulesSchema>;

export const routineRulesSetting = z.union([
  z.object({ use_defaults: z.literal(true) }).strict(),
  routineRulesSchema,
]);

/** The stored rules, or null to use the parser's defaults (also when the stored value is invalid). */
export function readRoutineRules(stored: unknown): RoutineRules | null {
  const parsed = routineRulesSchema.safeParse(stored);
  return parsed.success ? parsed.data : null;
}
