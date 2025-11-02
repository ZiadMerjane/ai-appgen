import type { GeneratedSpec } from "@/lib/spec";
import { fieldInputType } from "@/lib/utils";

type Props = {
  entity: GeneratedSpec["entities"][number];
  submitAction: (formData: FormData) => Promise<void>;
  initialValues?: Record<string, unknown> | null;
  submitLabel: string;
};

export default function EntityForm({ entity, submitAction, initialValues, submitLabel }: Props) {
  return (
    <form action={submitAction} className="space-y-6">
      <input type="hidden" name="entity" value={entity.slug} />
      {initialValues?.id ? (
        <input type="hidden" name="id" value={String(initialValues.id)} />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {entity.fields.map((field) => {
          const inputType = fieldInputType(field.type);
          const initial = initialValues?.[field.columnName] ?? null;

          if (inputType === "checkbox") {
            return (
              <label
                key={field.name}
                className="flex items-center gap-3 rounded-md border border-slate-700/70 bg-slate-900/50 px-4 py-3"
              >
                <input
                  type="checkbox"
                  name={field.name}
                  defaultChecked={Boolean(initial)}
                  className="size-4 rounded border-slate-600 bg-slate-900"
                />
                <span className="text-sm text-slate-200">{field.label}</span>
              </label>
            );
          }

          if (inputType === "textarea") {
            return (
              <label key={field.name} className="space-y-2">
                <span className="block text-sm text-slate-300">{field.label}</span>
                <textarea
                  name={field.name}
                  defaultValue={(initial as string | null) ?? ""}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                  rows={4}
                />
              </label>
            );
          }

          const defaultValue = deriveDefaultValue(inputType, initial);

          return (
            <label key={field.name} className="space-y-2">
              <span className="block text-sm text-slate-300">{field.label}</span>
              <input
                type={inputType}
                name={field.name}
                defaultValue={defaultValue}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
              />
            </label>
          );
        })}
      </div>
      <button
        type="submit"
        className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function deriveDefaultValue(inputType: string, initial: unknown) {
  if (initial === null || initial === undefined) {
    return inputType === "date" ? new Date().toISOString().slice(0, 10) : "";
  }

  if (inputType === "date" && typeof initial === "string") {
    return initial.slice(0, 10);
  }

  return String(initial);
}
