import { notFound } from "next/navigation";
import { UiGallery } from "./ui-gallery";

/** Developer gallery of every component in dark and light. Not served in production. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="grid gap-px bg-border xl:grid-cols-2">
      <UiGallery theme="dark" />
      <UiGallery theme="light" />
    </main>
  );
}
