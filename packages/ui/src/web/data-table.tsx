import type { ReactNode } from "react";

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  /** Cell content; may be an inline input. */
  render: (row: Row) => ReactNode;
  width?: string;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  caption?: string;
}

export function DataTable<Row>({ columns, rows, rowKey, caption }: DataTableProps<Row>) {
  return (
    <table className="w-full border-collapse font-body text-small">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <thead>
        <tr className="border-b border-border text-left">
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              className="px-3 py-2 font-semibold text-text-muted"
              style={{ width: c.width }}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={rowKey(r)} className="border-b border-border last:border-b-0">
            {columns.map((c) => (
              <td key={c.key} className="px-3 py-2 align-middle text-text">
                {c.render(r)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
