import Link from "next/link";
import {
  covers,
  hasArea,
  monthGrid,
  monthRange,
  parseMonth,
  readSetting,
  shiftMonth,
  type DayIndex,
  type MessageKey,
} from "@nfe/core";
import { Card, cx, Panel, Pill, type PillProps } from "@nfe/ui/web";
import { formatDate, getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { AddCalendarDayForm, RemoveCalendarDayForm } from "./calendar-forms";

const TYPES = ["holiday", "exam_week", "no_class", "special"] as const;
const tone: Record<(typeof TYPES)[number], PillProps["tone"]> = {
  holiday: "danger",
  exam_week: "warning",
  no_class: "neutral",
  special: "info",
};

function today(): { year: number; month: number; iso: string } {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)), iso };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A-12 Academic calendar: month view, add / remove days and ranges (ADM-SET-2). */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { access, tr, locale } = await getAdminContext();
  if (!hasArea(access, "calendar")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">{tr("cal.noArea")}</p>
      </Card>
    );
  }
  const now = today();
  const { year, month } = parseMonth((await searchParams).m, now);
  const { start, end } = monthRange(year, month);
  const supabase = await createClient();

  const [{ data: entries }, { data: batches }, { data: weekRow }] = await Promise.all([
    supabase
      .from("calendar_days")
      .select("id, date, end_date, type, title, applies_to")
      .is("deleted_at", null)
      .lte("date", end)
      .or(`end_date.gte.${start},and(end_date.is.null,date.gte.${start})`)
      .order("date"),
    supabase
      .from("batches")
      .select("id, code")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("code", { ascending: false }),
    supabase.from("app_settings").select("value").eq("key", "week").maybeSingle(),
  ]);
  const week = readSetting("week", weekRow?.value);
  const weeks = monthGrid(year, month, week.start_day as DayIndex);
  const dayNames = locale === "bn" ? week.day_names_bn : week.day_names_en;
  const headers = Array.from({ length: 7 }, (_, i) => dayNames[(week.start_day + i) % 7] ?? "");
  const typeLabel = (t: string) => tr(`cal.type.${t}` as MessageKey);
  const batchCode = (id: string) => batches?.find((b) => b.id === id)?.code ?? "?";
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const monthTitle = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display font-bold">{tr("admin.nav.calendar")}</h1>
        <p className="mt-1 font-body text-body text-text-muted">{tr("cal.help")}</p>
      </div>

      <Panel title={tr("cal.add")}>
        <AddCalendarDayForm
          batches={batches ?? []}
          defaultDate={year === now.year && month === now.month ? now.iso : start}
          labels={{
            date: tr("cal.date"),
            endDate: tr("cal.endDate"),
            type: tr("cal.type"),
            title: tr("cal.titleField"),
            batches: tr("cal.batches"),
            save: tr("settings.add"),
            types: TYPES.map((t) => ({ value: t, label: typeLabel(t) })),
          }}
        />
      </Panel>

      <Panel
        title={monthTitle}
        aside={
          <div className="flex gap-3">
            <Link
              href={`/admin/calendar?m=${prev.year}-${pad(prev.month)}`}
              className="font-body text-small font-semibold text-accent"
            >
              ← {tr("cal.prev")}
            </Link>
            <Link
              href={`/admin/calendar?m=${next.year}-${pad(next.month)}`}
              className="font-body text-small font-semibold text-accent"
            >
              {tr("cal.next")} →
            </Link>
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {headers.map((h) => (
            <div
              key={h}
              className="bg-surface px-2 py-2 text-center font-body text-caption font-semibold text-text-muted"
            >
              {h}
            </div>
          ))}
          {weeks.flat().map((cell) => {
            const here = (entries ?? []).filter((e) => covers(e, cell.date));
            return (
              <div
                key={cell.date}
                className={cx(
                  "flex min-h-24 flex-col gap-1 bg-bg p-2",
                  !cell.inMonth && "opacity-40",
                  cell.date === now.iso && "ring-2 ring-inset ring-accent",
                )}
              >
                <span className="font-body text-small font-semibold">{cell.day}</span>
                {here.map((e) => (
                  <Pill
                    key={e.id}
                    size="sm"
                    tone={tone[e.type]}
                    label={e.title ?? typeLabel(e.type)}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col divide-y divide-border">
          {(entries ?? []).length === 0 ? (
            <p className="font-body text-body text-text-muted">{tr("cal.none")}</p>
          ) : null}
          {(entries ?? []).map((e) => {
            const ids = (e.applies_to as { batch_ids?: string[] } | null)?.batch_ids ?? [];
            return (
              <div key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                <Pill size="sm" tone={tone[e.type]} label={typeLabel(e.type)} />
                <span className="font-body text-body font-semibold">
                  {e.title ?? typeLabel(e.type)}
                </span>
                <span className="font-body text-small text-text-muted">
                  {formatDate(e.date, locale)}
                  {e.end_date ? ` – ${formatDate(e.end_date, locale)}` : ""} ·{" "}
                  {ids.length ? ids.map(batchCode).join(", ") : tr("cal.everyone")}
                </span>
                <span className="ml-auto">
                  <RemoveCalendarDayForm id={e.id} label={tr("cal.remove")} />
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
