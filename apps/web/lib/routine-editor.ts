import "server-only";
import { fill, sectionKey, type MessageKey, type VersionClass } from "@nfe/core";
import { detectClashes } from "@nfe/parser";
import type { AppState } from "./app-state";
import type { Slot } from "./routine-versions";

type Tr = AppState["tr"];

export interface ClashReport {
  /** Plain-language problems for the whole draft. */
  messages: string[];
  /** Class id → the problems it is part of (cards are marked red). */
  byClass: Map<string, string[]>;
}

/**
 * Live clash check of the whole draft (ADM-RT-5), e.g. "DAMR teaches 263-B and
 * 263-C on Monday 11:20".
 */
export function clashReport(classes: VersionClass[], slots: Slot[], tr: Tr): ClashReport {
  const byClass = new Map<string, string[]>();
  const messages: string[] = [];
  for (const c of detectClashes(classes)) {
    const when = `${tr(`day.${c.day}` as MessageKey)} ${slots.find((s) => s.position === c.slot)?.start ?? ""}`;
    const where = [...new Set(c.items.map((i) => `${sectionKey(i)} ${i.courseCode}`))].join(", ");
    const subject =
      c.kind === "teacher"
        ? c.items[0]!.facultyInitial
        : c.kind === "room"
          ? `${c.items[0]!.building}: ${c.items[0]!.room}`
          : sectionKey(c.items[0]!);
    const message = fill(tr(`rte.clash.${c.kind}` as MessageKey), { subject, when, where });
    messages.push(message);
    for (const i of c.items) byClass.set(i.id, [...(byClass.get(i.id) ?? []), message]);
  }
  return { messages, byClass };
}
