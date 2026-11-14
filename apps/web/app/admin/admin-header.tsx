"use client";

import { usePathname } from "next/navigation";
import { AdminTopBar, Button } from "@nfe/ui/web";
import { signOut } from "../actions";

export interface AdminHeaderLink {
  href: string;
  label: string;
}

export interface AdminHeaderProps {
  appName: string;
  areaLabel: string;
  links: AdminHeaderLink[];
  moreLinks: AdminHeaderLink[];
  moreLabel: string;
  user: string;
  signOutLabel: string;
}

/** Top bar with the current page marked; links come from adminNav() on the server. */
export function AdminHeader(p: AdminHeaderProps) {
  const path = usePathname();
  const mark = (l: AdminHeaderLink) => ({
    ...l,
    active: path === l.href || path.startsWith(`${l.href}/`),
  });
  return (
    <AdminTopBar
      appName={p.appName}
      areaLabel={p.areaLabel}
      links={p.links.map(mark)}
      moreLinks={p.moreLinks.map(mark)}
      moreLabel={p.moreLabel}
      user={p.user}
      actions={
        <form action={signOut}>
          <Button label={p.signOutLabel} variant="secondary" size="medium" type="submit" />
        </form>
      }
    />
  );
}
