import { type FieldType, type GeneratedSpec } from "@/lib/spec";
import { coerceFieldValue } from "@/lib/utils";

export function buildInsertPayload(
  entity: GeneratedSpec["entities"][number],
  formData: FormData,
  userId: string,
) {
  const payload: Record<string, unknown> = {
    user_id: userId,
  };

  for (const field of entity.fields) {
    const value = coerceFieldValue(field.type, formData.get(field.name));
    if (value !== null && value !== undefined) {
      payload[field.columnName] = value;
    }
  }

  return payload;
}

export function buildUpdatePayload(
  entity: GeneratedSpec["entities"][number],
  formData: FormData,
) {
  const payload: Record<string, unknown> = {};

  for (const field of entity.fields) {
    const value = coerceFieldValue(field.type, formData.get(field.name));
    if (value !== null && value !== undefined) {
      payload[field.columnName] = value;
    }
  }

  return payload;
}

export function defaultValue(type: FieldType) {
  switch (type) {
    case "bool":
      return false;
    case "int":
    case "float":
      return 0;
    case "date":
      return new Date().toISOString().slice(0, 10);
    default:
      return "";
  }
}
