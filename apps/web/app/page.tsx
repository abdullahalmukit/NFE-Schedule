import { DEFAULT_LOCALE, t } from "@nfe/core";
import { Logo } from "@nfe/ui/web";

export default function HomePage() {
  return (
    <main className="grid min-h-screen place-content-center justify-items-center gap-6 p-5 text-center">
      <Logo size={96} />
      <div>
        <h1 className="font-display text-title font-bold">{t(DEFAULT_LOCALE, "app.name")}</h1>
        <p className="font-body text-small text-text-muted">{t(DEFAULT_LOCALE, "app.tagline")}</p>
      </div>
    </main>
  );
}
