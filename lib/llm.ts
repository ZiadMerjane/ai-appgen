import { defaultSpec, type AppSpec } from "@/lib/spec";

type CallLLMArgs = {
  system: string;
  prompt: string;
  temperature?: number;
};

type LocalLLMOptions = {
  temperature?: number;
};

export async function callLLM({
  system,
  prompt,
  temperature = 0,
}: CallLLMArgs): Promise<string> {
  const provider = (process.env.AI_PROVIDER ?? "local").toLowerCase();

  if (provider === "openai") {
    return callOpenAI({ system, prompt, temperature });
  }

  return callLocalLLM({ prompt, options: { temperature } });
}

async function callOpenAI({
  system,
  prompt,
  temperature,
}: CallLLMArgs): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await client.responses.create({
    model,
    temperature,
    input: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const output = response.output_text;

  if (!output) {
    throw new Error("OpenAI response did not contain any text");
  }

  return output.trim();
}

function callLocalLLM({
  prompt,
  options,
}: {
  prompt: string;
  options: LocalLLMOptions;
}): Promise<string> {
  // Deterministic pseudo planner to keep offline mode functional.
  const spec = buildHeuristicSpec(prompt, options);
  return Promise.resolve(JSON.stringify(spec));
}

function buildHeuristicSpec(prompt: string, _options: LocalLLMOptions): AppSpec {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    return defaultSpec;
  }

  const lower = trimmedPrompt.toLowerCase();

  if (lower.includes("note")) {
    return {
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
    };
  }

  if (lower.includes("task")) {
    return defaultSpec;
  }

  const appName = titleCase(extractAppName(trimmedPrompt));
  const entityName = singularize(appName);
  const fields = extractFields(lower);

  return {
    name: appName,
    entities: [
      {
        name: entityName,
        fields,
      },
    ],
    pages: [
      {
        route: "/",
        purpose: `List ${pluralize(entityName)} with quick actions`,
        entities: [entityName],
      },
      {
        route: `/${toKebabCase(entityName)}/new`,
        purpose: `Create a new ${entityName}`,
        entities: [entityName],
      },
    ],
    auth: { emailPassword: true },
  };
}

function extractAppName(prompt: string): string {
  const match = prompt.match(/([\w\s]+?)\s+(app|application|tool)/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  const words = prompt
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return defaultSpec.name;
  }

  return words.slice(-1)[0]!;
}

function extractFields(prompt: string): AppSpec["entities"][number]["fields"] {
  const fieldsSectionMatch = prompt.match(/with\s+(.+)/);
  const rawFields =
    fieldsSectionMatch?.[1]
      .split(/,|and|\+|&/g)
      .map((field) => field.trim())
      .filter(Boolean) ?? [];

  const mappedFields = rawFields
    .map((field) => mapField(field))
    .filter(Boolean) as AppSpec["entities"][number]["fields"];

  if (mappedFields.length > 0) {
    return dedupeByKey(mappedFields, "name");
  }

  return defaultSpec.entities[0]!.fields;
}

function mapField(source: string):
  | AppSpec["entities"][number]["fields"][number]
  | undefined {
  const normalized = source.toLowerCase();

  if (/\b(done|completed|is done|status)\b/.test(normalized)) {
    return { name: "done", type: "bool" };
  }

  if (/\b(title|name)\b/.test(normalized)) {
    return { name: "title", type: "string" };
  }

  if (/\b(description|details|body|content)\b/.test(normalized)) {
    return { name: "description", type: "text" };
  }

  if (/\b(date|due|deadline)\b/.test(normalized)) {
    return { name: "dueDate", type: "date" };
  }

  if (/\b(count|amount|quantity)\b/.test(normalized)) {
    return { name: "quantity", type: "int" };
  }

  if (/\b(price|cost|total)\b/.test(normalized)) {
    return { name: "price", type: "float" };
  }

  if (normalized.length > 0) {
    return { name: normalized.replace(/\s+/g, ""), type: "string" };
  }

  return undefined;
}

function singularize(value: string): string {
  if (value.toLowerCase().endsWith("ies")) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.toLowerCase().endsWith("ses")) {
    return value.slice(0, -2);
  }
  if (value.toLowerCase().endsWith("s") && value.length > 1) {
    return value.slice(0, -1);
  }
  return value;
}

function pluralize(value: string): string {
  if (value.toLowerCase().endsWith("y")) {
    return `${value.slice(0, -1)}ies`;
  }
  if (value.toLowerCase().endsWith("s")) {
    return `${value}es`;
  }
  return `${value}s`;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .toLowerCase();
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
