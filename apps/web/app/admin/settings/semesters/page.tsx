import { hasArea } from "@nfe/core";
import { Card, Panel, Pill } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { SemesterForm, SlotForm } from "./semester-forms";

/** Settings → Semesters & time slots (ADM-SET-2, routine area). */
export default async function SemestersPage() {
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "routine")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">{tr("sem.noArea")}</p>
      </Card>
    );
  }
  const supabase = await createClient();
  const [{ data: semesters }, { data: slots }] = await Promise.all([
    supabase
      .from("semesters")
      .select("id, name, starts_on, ends_on, is_active")
      .is("deleted_at", null)
      .order("is_active", { ascending: false })
      .order("starts_on", { ascending: false, nullsFirst: false }),
    supabase
      .from("time_slots")
      .select("id, semester_id, position, start_time, end_time, label")
      .is("deleted_at", null)
      .order("position"),
  ]);

  const semLabels = {
    name: tr("sem.name"),
    starts: tr("sem.starts"),
    ends: tr("sem.ends"),
    save: tr("settings.save"),
    add: tr("sem.add"),
    makeActive: tr("sem.makeActive"),
    archive: tr("sem.archive"),
  };
  const slotLabels = {
    position: tr("sem.position"),
    start: tr("sem.start"),
    end: tr("sem.end"),
    label: tr("sem.label"),
    save: tr("settings.save"),
    add: tr("sem.addSlot"),
    remove: tr("settings.remove"),
  };

  return (
    <div className="flex flex-col gap-6">
      <Panel title={tr("setp.semesters")} description={tr("sem.help")}>
        <SemesterForm labels={semLabels} />
      </Panel>
      {(semesters ?? []).length === 0 ? (
        <Card>
          <p className="font-body text-body text-text-muted">{tr("sem.none")}</p>
        </Card>
      ) : null}
      {(semesters ?? []).map((s) => {
        const own = (slots ?? []).filter((x) => x.semester_id === s.id);
        const next = own.reduce((m, x) => Math.max(m, x.position), 0) + 1;
        return (
          <Panel
            key={s.id}
            title={s.name}
            aside={
              s.is_active ? <Pill label={tr("sem.active")} tone="accent" size="sm" /> : undefined
            }
          >
            <div className="flex flex-col gap-5">
              <SemesterForm semester={s} labels={semLabels} />
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <h3 className="font-body text-body font-semibold">{tr("sem.slots")}</h3>
                {own.length === 0 ? (
                  <p className="font-body text-small text-text-muted">{tr("sem.noSlots")}</p>
                ) : null}
                {own.map((slot) => (
                  <SlotForm key={slot.id} semesterId={s.id} slot={slot} labels={slotLabels} />
                ))}
                {next <= 20 ? (
                  <SlotForm semesterId={s.id} nextPosition={next} labels={slotLabels} />
                ) : null}
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
