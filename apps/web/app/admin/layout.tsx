import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { adminNav } from "@nfe/core";
import { Card, Logo } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { AdminHeader } from "./admin-header";

export const metadata: Metadata = { title: "Admin · NFE Schedule" };

/** Admin panel shell: desktop-first, top bar with only the areas this admin holds. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { access, tr, user } = await getAdminContext();

  if (!access) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center gap-6 px-5">
        <Logo size={56} />
        <Card>
          <h1 className="font-display text-title font-bold">{tr("admin.noAccess.title")}</h1>
          <p className="mt-2 font-body text-body text-text-muted">{tr("admin.noAccess.body")}</p>
        </Card>
        <Link href="/" className="font-body text-small font-semibold text-accent">
          {tr("admin.backToApp")}
        </Link>
      </main>
    );
  }

  const nav = adminNav(access);
  const toLink = (i: { slug: string; label: Parameters<typeof tr>[0] }) => ({
    href: `/admin/${i.slug}`,
    label: tr(i.label),
  });

  return (
    <div className="min-h-screen">
      <AdminHeader
        appName={tr("app.name")}
        areaLabel={tr("admin.title")}
        links={nav.main.map(toLink)}
        moreLinks={nav.more.map(toLink)}
        moreLabel={tr("admin.more")}
        user={user.fullName ?? user.email}
        signOutLabel={tr("auth.signOut")}
      />
      <main className="mx-auto w-full max-w-[1280px] px-6 py-8">{children}</main>
    </div>
  );
}
