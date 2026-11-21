/** "Data changed" events: screens re-query the tables that changed. */
type Listener = (tables: string[]) => void;

const listeners = new Set<Listener>();

export function onChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitChange(tables: string[]): void {
  if (!tables.length) return;
  for (const l of listeners) l(tables);
}
