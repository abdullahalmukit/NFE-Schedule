"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cx } from "@nfe/ui/web";
import { moveClass } from "../../../editor-actions";

export interface EditorCard {
  id: string;
  day: number;
  timeSlotId: string;
  title: string;
  lines: string[];
  /** Problems this class is part of; the card turns red. */
  clashes: string[];
  selected: boolean;
}

export interface EditorGridProps {
  versionId: string;
  slots: { id: string; label: string }[];
  days: { index: number; label: string }[];
  cards: EditorCard[];
  /** "?batch=…&section=…" to keep the section when opening a cell or a card. */
  query: string;
  /** Cell being added to, "day:slotId". */
  activeCell: string | null;
  labels: { add: string; moving: string; failed: string };
}

/**
 * A-2 editor grid: click an empty cell to add a class, click a card to edit
 * it, drag a card to another cell to move it (ADM-RT-5).
 */
export function EditorGrid(p: EditorGridProps) {
  const router = useRouter();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const base = `/admin/routine/versions/${p.versionId}/edit${p.query}`;

  function drop(day: number, timeSlotId: string) {
    const id = dragging;
    setDragging(null);
    setOver(null);
    if (!id) return;
    const card = p.cards.find((c) => c.id === id);
    if (!card || (card.day === day && card.timeSlotId === timeSlotId)) return;
    start(async () => {
      setError("");
      const res = await moveClass({ versionId: p.versionId, id, day, timeSlotId });
      if (!res.ok) setError(res.message || p.labels.failed);
      router.refresh();
    });
  }

  return (
    <div className={cx("overflow-x-auto", busy && "opacity-60")}>
      {error ? (
        <p className="mb-2 font-body text-small font-semibold text-danger">{error}</p>
      ) : null}
      <table className="w-full min-w-[760px] border-collapse font-body text-small">
        <thead>
          <tr>
            <th className="w-24 border border-border bg-surface-raised p-2" />
            {p.slots.map((s) => (
              <th
                key={s.id}
                className="border border-border bg-surface-raised p-2 text-center font-semibold text-text-muted"
              >
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.days.map((d) => (
            <tr key={d.index}>
              <th className="border border-border p-2 text-left align-top font-semibold text-text">
                {d.label}
              </th>
              {p.slots.map((s) => {
                const cell = `${d.index}:${s.id}`;
                const here = p.cards.filter((c) => c.day === d.index && c.timeSlotId === s.id);
                return (
                  <td
                    key={s.id}
                    onDragOver={(e) => {
                      if (!dragging) return;
                      e.preventDefault();
                      setOver(cell);
                    }}
                    onDragLeave={() => setOver((o) => (o === cell ? null : o))}
                    onDrop={(e) => {
                      e.preventDefault();
                      drop(d.index, s.id);
                    }}
                    className={cx(
                      "h-20 border border-border p-1 align-top",
                      over === cell && "bg-accent-soft",
                      p.activeCell === cell && "outline outline-2 outline-accent",
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      {here.map((c) => (
                        <Link
                          key={c.id}
                          href={`${base}&edit=${c.id}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            setDragging(c.id);
                          }}
                          onDragEnd={() => setDragging(null)}
                          title={c.clashes.join("\n") || undefined}
                          className={cx(
                            "block cursor-grab rounded-lg border p-2 active:cursor-grabbing",
                            c.clashes.length
                              ? "border-danger bg-danger-soft"
                              : "border-transparent bg-surface-raised hover:border-border",
                            c.selected && "border-accent",
                          )}
                        >
                          <span className="block font-semibold text-text">{c.title}</span>
                          {c.lines.map((l, i) => (
                            <span key={i} className="block truncate text-caption text-text-muted">
                              {l}
                            </span>
                          ))}
                        </Link>
                      ))}
                      <Link
                        href={`${base}&cell=${encodeURIComponent(cell)}`}
                        aria-label={`${p.labels.add} ${d.label} ${s.label}`}
                        className="rounded-lg py-1 text-center text-caption text-text-faint hover:bg-surface-raised hover:text-accent"
                      >
                        +
                      </Link>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
