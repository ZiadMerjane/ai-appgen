import type { FieldType } from "@/lib/spec";

export function fieldInputType(type: FieldType): string {
  switch (type) {
    case "text":
      return "textarea";
    case "int":
    case "float":
      return "number";
    case "bool":
      return "checkbox";
    case "date":
      return "date";
    default:
      return "text";
  }
}

export function coerceFieldValue(type: FieldType, value: FormDataEntryValue | null) {
  if (type === "bool") {
    if (value === null) {
      return false;
    }
    const raw = typeof value === "string" ? value : String(value);
    return raw === "on" || raw === "true";
  }

  if (value === null) {
    return null;
  }

  const raw = typeof value === "string" ? value : String(value);

  switch (type) {
    case "int":
      return raw.length ? Number.parseInt(raw, 10) : null;
    case "float":
      return raw.length ? Number.parseFloat(raw) : null;
    case "date":
      return raw.length ? new Date(raw).toISOString() : null;
    default:
      return raw;
  }
}

export function formatValueForDisplay(type: FieldType, value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (type === "bool") {
    return value ? "Yes" : "No";
  }

  if (type === "date" && typeof value === "string") {
    return new Date(value).toLocaleString();
  }

  return String(value);
}

export function titleize(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
