"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@nfe/ui/web";

const RECHECK_MS = 30_000;

/**
 * Re-reads the account status every 30 s and when the tab regains focus; the
 * page moves on by itself once an admin approves the account (AUTH-8).
 * Push notifications will make this instant (push-notifications branch).
 */
export function RecheckStatus({ label }: { label: string }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), RECHECK_MS);
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);
  return <Button label={label} variant="secondary" onClick={() => router.refresh()} />;
}
