import { DEFAULT_LOCALE, t } from "@nfe/core";
import { Logo } from "@nfe/ui/web";

export default function HomePage() {
  const [strong = "", ...rest] = t(DEFAULT_LOCALE, "app.name").split(" ");
  return (
    <main className="grid min-h-screen place-content-center p-5">
      <Logo
        strong={strong}
        rest={rest.join(" ")}
        tagline={t(DEFAULT_LOCALE, "app.tagline")}
        size={56}
      />
    </main>
  );
}
