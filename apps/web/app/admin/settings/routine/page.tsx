import { Panel } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";

/**
 * Settings → Routine format (ADM-RT-11). The editable parser rules and their
 * "Test on a file" button are built with the routine import (routine-import).
 */
export default async function RoutineFormatPage() {
  const { tr } = await getAdminContext();
  return (
    <Panel title={tr("setp.routine")}>
      <p className="font-body text-body text-text-muted">{tr("settings.routineSoon")}</p>
    </Panel>
  );
}
