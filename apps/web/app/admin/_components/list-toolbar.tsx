import { inputClass } from "./fields";

/** Search box and "show archived" switch; submits as a GET form so the URL holds the filter. */
export function ListToolbar(p: {
  path: string;
  q: string;
  archived: boolean;
  labels: { search: string; showArchived: string };
  extra?: Record<string, string>;
}) {
  return (
    <form action={p.path} className="flex flex-wrap items-center gap-3">
      {Object.entries(p.extra ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input
        type="search"
        name="q"
        defaultValue={p.q}
        placeholder={p.labels.search}
        aria-label={p.labels.search}
        className={`${inputClass} max-w-xs`}
      />
      <label className="flex items-center gap-2 font-body text-small text-text">
        <input
          type="checkbox"
          name="archived"
          value="1"
          defaultChecked={p.archived}
          className="h-4 w-4 accent-accent"
        />
        {p.labels.showArchived}
      </label>
      <button
        type="submit"
        className="h-10 rounded-button border border-border px-4 font-body text-small font-semibold text-text hover:bg-surface-raised"
      >
        {p.labels.search}
      </button>
    </form>
  );
}
