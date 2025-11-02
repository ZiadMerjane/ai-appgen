import { normalizedSpec, originalSpec } from "@/generated/spec";

export type FieldType = "string" | "text" | "int" | "float" | "bool" | "date";

export type GeneratedSpec = typeof normalizedSpec;
export type OriginalSpec = typeof originalSpec;

export const appSpec = normalizedSpec;
export const originalAppSpec = originalSpec;

export function getEntities() {
  return appSpec.entities;
}

export function getEntityBySlug(slug: string) {
  return appSpec.entities.find((entity) => entity.slug === slug);
}

export function getPrimaryEntity() {
  return appSpec.entities[0];
}
