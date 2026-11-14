import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { en, fill, firstIssue, type AdminArea, type MessageKey } from "@nfe/core";
import { getAdminContext } from "./admin";

export interface ActionResult {
  ok: boolean;
  message: string;
}

/** FormData → plain object of strings (checkboxes absent = undefined). */
export function formValues(
  form: FormData,
  names: readonly string[],
): Record<string, string | undefined> {
  return Object.fromEntries(
    names.map((n) => {
      const v = form.get(n);
      return [n, typeof v === "string" ? v : undefined];
    }),
  );
}

/** Message for a failed form parse: the first issue in the user's language. */
export async function invalid(error: z.ZodError): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const key = `md.err.${firstIssue(error)}`;
  return { ok: false, message: tr(key in en ? (key as MessageKey) : "md.err.generic") };
}

/**
 * Result of a database write: duplicate → "already exists", nothing written or
 * row-level security → "you need the X area", success → `okKey` and refresh `paths`.
 */
export async function written(
  result: {
    error: { code?: string; message: string } | null;
    count?: number | null;
    data?: unknown;
  },
  area: AdminArea,
  paths: string[],
  okKey: MessageKey = "md.saved",
  duplicateKey: MessageKey = "md.err.duplicate",
): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const { error, data } = result;
  if (error?.code === "23505") return { ok: false, message: tr(duplicateKey) };
  const nothing = !error && Array.isArray(data) && data.length === 0;
  if (error || nothing) {
    if (error && error.code !== "42501" && !/row-level security/.test(error.message)) {
      return { ok: false, message: tr("md.err.generic") };
    }
    return {
      ok: false,
      message: fill(tr("md.noArea"), { area: tr(`admin.area.${area}` as MessageKey) }),
    };
  }
  for (const p of paths) revalidatePath(p);
  return { ok: true, message: tr(okKey) };
}

export const uuid = /^[0-9a-f-]{36}$/i;
