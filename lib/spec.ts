import { z } from "zod";

export const fieldTypeSchema = z.enum([
  "string",
  "text",
  "int",
  "float",
  "bool",
  "date",
]);

export type FieldType = z.infer<typeof fieldTypeSchema>;

const fieldSchema = z
  .object({
    name: z.string().min(1, "Field name is required"),
    type: fieldTypeSchema,
  })
  .transform((field) => ({
    name: sanitizeName(field.name),
    type: field.type,
  }));

const entitySchema = z
  .object({
    name: z.string().min(1, "Entity name is required"),
    fields: z.array(fieldSchema).min(1, "Entity requires at least one field"),
  })
  .transform((entity) => ({
    name: sanitizeName(entity.name),
    fields: dedupeByKey(entity.fields, "name"),
  }));

const pageSchema = z
  .object({
    route: z.string().min(1, "Route is required"),
    purpose: z.string().min(1, "Purpose is required"),
    entities: z.array(z.string().min(1)).optional(),
  })
  .transform((page) => ({
    route: normalizeRoute(page.route),
    purpose: page.purpose.trim(),
    entities: page.entities?.map((name) => sanitizeName(name)),
  }));

const authSchema = z
  .object({
    emailPassword: z.boolean().default(true),
  })
  .default({ emailPassword: true });

const partialAppSpecSchema = z.object({
  name: z.string().optional(),
  entities: z.array(entitySchema).optional(),
  pages: z.array(pageSchema).optional(),
  auth: authSchema.optional(),
});

export const appSpecSchema = z.object({
  name: z.string(),
  entities: z.array(entitySchema),
  pages: z.array(pageSchema),
  auth: authSchema,
});

export type AppSpec = z.infer<typeof appSpecSchema>;

export type PlannerError = {
  error: string;
};

export const defaultSpec: AppSpec = {
  name: "Tasks",
  entities: [
    {
      name: "Task",
      fields: [
        { name: "title", type: "string" },
        { name: "done", type: "bool" },
      ],
    },
  ],
  pages: [
    {
      route: "/",
      purpose: "List tasks with quick status toggle",
      entities: ["Task"],
    },
    {
      route: "/tasks/new",
      purpose: "Create a new task",
      entities: ["Task"],
    },
  ],
  auth: { emailPassword: true },
};

export function ensureSpecDefaults(input: unknown): AppSpec | PlannerError {
  const result = partialAppSpecSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.message };
  }

  const sanitized = result.data;

  const name = sanitized.name?.trim() || defaultSpec.name;

  const entities =
    sanitized.entities && sanitized.entities.length > 0
      ? dedupeByKey(
          sanitized.entities.map((entity) => ({
            ...entity,
            fields:
              entity.fields.length > 0 ? entity.fields : defaultSpec.entities[0]!.fields,
          })),
          "name",
        )
      : defaultSpec.entities;

  const entityNames = new Set(entities.map((entity) => entity.name));

  const pages =
    sanitized.pages && sanitized.pages.length > 0
      ? sanitized.pages.map((page) => ({
          ...page,
          entities:
            page.entities && page.entities.length > 0
              ? page.entities.filter((entityName) => entityNames.has(entityName))
              : Array.from(entityNames),
        }))
      : defaultSpec.pages;

  const auth = sanitized.auth ?? { emailPassword: true };

  const completed = {
    name,
    entities,
    pages,
    auth,
  };

  const parsed = appSpecSchema.safeParse(completed);
  if (!parsed.success) {
    return { error: parsed.error.message };
  }

  return parsed.data;
}

export function plannerPromptTemplate(userPrompt: string): string {
  const instruction = `
You are a precise software planner that turns a product idea into a JSON spec.
Schema (JSON, no extra text):
{
  "name": string,
  "entities": Array<{ "name": string, "fields": Array<{ "name": string, "type": "string"|"text"|"int"|"float"|"bool"|"date" }> }>,
  "pages": Array<{ "route": string, "purpose": string, "entities"?: string[] }>,
  "auth"?: { "emailPassword": boolean }
}

Rules:
- Reply with JSON only.
- Temperature should be 0 (caller enforces).
- Always include at least one entity and page.
- Default auth.emailPassword to true when unsure.
- Prefer URL-safe kebab-case routes.
- Use concise entity and field names.

Few-shot examples:
Input: "Tasks app with title + done"
Output: ${JSON.stringify(defaultSpec)}

Input: "A notes app with tags"
Output: ${JSON.stringify({
    name: "Notes",
    entities: [
      {
        name: "Note",
        fields: [
          { name: "title", type: "string" },
          { name: "body", type: "text" },
          { name: "tags", type: "string" },
        ],
      },
    ],
    pages: [
      {
        route: "/",
        purpose: "List notes with tag filter",
        entities: ["Note"],
      },
      {
        route: "/notes/new",
        purpose: "Create a new note",
        entities: ["Note"],
      },
    ],
    auth: { emailPassword: true },
  })}
`.trim();

  return `${instruction}\n\nInput: ${userPrompt}\nOutput:`;
}

function sanitizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeRoute(route: string): string {
  const trimmed = route.trim();
  if (!trimmed.startsWith("/")) {
    return `/${trimmed.replace(/^\/*/, "")}`;
  }
  return trimmed.replace(/\/{2,}/g, "/");
}

function dedupeByKey<T extends Record<string, unknown>, K extends keyof T>(
  items: T[],
  key: K,
): T[] {
  const seen = new Set<unknown>();
  return items.filter((item) => {
    const identifier = item[key];
    if (seen.has(identifier)) {
      return false;
    }
    seen.add(identifier);
    return true;
  });
}
