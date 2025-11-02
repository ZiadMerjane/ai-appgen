import Link from "next/link";

import { deleteRecordAction } from "@/app/actions";
import EmptyState from "@/components/EmptyState";
import type { GeneratedSpec } from "@/lib/spec";
import { formatValueForDisplay } from "@/lib/utils";

type Props = {
  entity: GeneratedSpec["entities"][number];
  records: Array<Record<string, unknown>>;
};

export default function EntityTable({ entity, records }: Props) {
  const columns = entity.fields;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800">
        <thead className="bg-slate-900/70 text-left text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3">ID</th>
            {columns.map((field) => (
              <th key={field.name} className="px-4 py-3">
                {field.label}
              </th>
            ))}
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-sm">
          {records.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 3} className="px-4 py-6">
                <EmptyState
                  title="No records yet"
                  description={`Create the first ${entity.singular.toLowerCase()} to populate this table.`}
                />
              </td>
            </tr>
          ) : (
            records.map((record) => (
              <tr key={String(record.id)}>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{record.id as string}</td>
                {columns.map((field) => (
                  <td key={field.name} className="px-4 py-3">
                    {formatValueForDisplay(field.type, record[field.columnName as keyof typeof record])}
                  </td>
                ))}
                <td className="px-4 py-3 text-slate-400">
                  {formatCreatedAt(record.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 text-xs">
                    <Link
                      href={`/${entity.slug}/${record.id}`}
                      className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                    >
                      Edit
                    </Link>
                    <form action={deleteRecordAction}>
                      <input type="hidden" name="entity" value={entity.slug} />
                      <input type="hidden" name="id" value={String(record.id)} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-500/40 px-3 py-1 text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatCreatedAt(value: unknown): string {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleString();
  } catch (error) {
    console.error(error);
    return String(value);
  }
}
