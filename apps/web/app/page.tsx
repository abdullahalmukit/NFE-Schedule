import { DEFAULT_LOCALE, t } from "@nfe/core";
import { tokens } from "@nfe/ui";

export default function HomePage() {
  const c = tokens.color.dark;
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeContent: "center",
        gap: 8,
        textAlign: "center",
        background: c.bg,
        color: c.text,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ margin: 0 }}>{t(DEFAULT_LOCALE, "app.name")}</h1>
      <p style={{ margin: 0, color: c.textMuted }}>{t(DEFAULT_LOCALE, "app.tagline")}</p>
    </main>
  );
}
