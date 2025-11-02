import { readFile } from "node:fs/promises";
import path from "node:path";

import type { AppSpec, FieldType } from "@/lib/spec";

export type TemplateContext = {
  spec: AppSpec;
  slug: string;
  targetDir: string;
  projectRoot: string;
};

export type GeneratedFile = {
  filepath: string;
  contents: string;
};

type NormalizedField = {
  name: string;
  label: string;
  type: FieldType;
  columnName: string;
};

type NormalizedEntity = {
  name: string;
  singular: string;
  plural: string;
  slug: string;
  tableName: string;
  fields: NormalizedField[];
};

export type NormalizedSpec = {
  name: string;
  slug: string;
  auth: AppSpec["auth"];
  entities: NormalizedEntity[];
  pages: AppSpec["pages"];
  generatedAt: string;
};

export async function buildFileMap(context: TemplateContext): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  const normalized = normalizeSpec(context.spec, context.slug);

  const dataDir = path.join(context.targetDir, "generated");
  const specModulePath = path.join(dataDir, "spec.ts");

  const normalizedLiteral = toTypeScriptLiteral(normalized);
  const originalLiteral = toTypeScriptLiteral(context.spec);

  files.push({
    filepath: specModulePath,
    contents: `export const normalizedSpec = ${normalizedLiteral} as const;\n\nexport const originalSpec = ${originalLiteral} as const;\n`,
  });

  files.push(...(await baseTemplateFiles(context, normalized)));
  files.push(...buildSupabaseFiles(context, normalized));

  return files;
}

function normalizeSpec(spec: AppSpec, slug: string): NormalizedSpec {
  const entities = spec.entities.map((entity) => {
    const singular = singularize(entity.name);
    const plural = pluralize(singular);
    const entitySlug = toKebabCase(plural);
    const tableName = toSnakeCase(plural);
    const fields = entity.fields.map<NormalizedField>((field) => ({
      name: field.name,
      label: toTitle(field.name),
      type: field.type,
      columnName: toSnakeCase(field.name),
    }));

    return {
      name: entity.name,
      singular,
      plural,
      slug: entitySlug,
      tableName,
      fields,
    };
  });

  return {
    name: spec.name,
    slug,
    auth: spec.auth,
    entities,
    pages: spec.pages,
    generatedAt: new Date().toISOString(),
  };
}

async function baseTemplateFiles(
  context: TemplateContext,
  normalized: NormalizedSpec,
): Promise<GeneratedFile[]> {
  const templateRoot = path.join(context.projectRoot, "lib", "templates", "next");
  const files: GeneratedFile[] = [];

  const baseFiles = await loadStaticTemplates(path.join(templateRoot, "base"));

  for (const { relativePath, contents } of baseFiles) {
    const rendered = renderTemplate(contents, {
      APP_NAME: normalized.name,
      APP_SLUG: context.slug,
      SPEC_JSON: JSON.stringify(normalized, null, 2),
    });

    files.push({
      filepath: path.join(context.targetDir, relativePath),
      contents: rendered,
    });
  }

  return files;
}

function buildSupabaseFiles(context: TemplateContext, normalized: NormalizedSpec): GeneratedFile[] {
  const migrationsPath = path.join(
    context.targetDir,
    "supabase",
    "migrations",
    "0001_init.sql",
  );

  return [
    {
      filepath: migrationsPath,
      contents: buildMigrationSql(normalized),
    },
  ];
}

async function loadStaticTemplates(
  directory: string,
): Promise<Array<{ relativePath: string; contents: string }>> {
  const entries: Array<{ relativePath: string; contents: string }> = [];
  const { readdir } = await import("node:fs/promises");

  const items = await readdir(directory, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(directory, item.name);
    if (item.isDirectory()) {
      const childEntries = await loadStaticTemplates(fullPath);
      for (const child of childEntries) {
        entries.push({
          relativePath: path.join(item.name, child.relativePath),
          contents: child.contents,
        });
      }
    } else {
      const buffer = await readFile(fullPath, "utf8");
      const relative = path.relative(directory, fullPath);
      entries.push({
        relativePath: relative.replace(/\.tpl$/, ""),
        contents: buffer,
      });
    }
  }

  return entries;
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/{{\s*([A-Z0-9_]+)\s*}}/g, (_, key) => vars[key] ?? "");
}

function toTypeScriptLiteral(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/\\u2028/g, "\\u2028")
    .replace(/\\u2029/g, "\\u2029");
}

function buildMigrationSql(spec: NormalizedSpec): string {
  const lines: string[] = [
    `-- Generated on ${spec.generatedAt}`,
    `create extension if not exists "pgcrypto";`,
  ];

  for (const entity of spec.entities) {
    const qualifiedTable = `public."${entity.tableName}"`;

    lines.push("");
    lines.push(`create table if not exists ${qualifiedTable} (`);
    lines.push(`  id uuid primary key default gen_random_uuid(),`);
    lines.push(`  user_id uuid not null default auth.uid() references auth.users(id),`);

    for (const field of entity.fields) {
      lines.push(`  ${field.columnName} ${mapFieldTypeToSql(field.type)} not null,`);
    }

    lines.push(`  created_at timestamptz not null default now()`);
    lines.push(`);`);
    lines.push("");
    lines.push(`alter table ${qualifiedTable} add column if not exists user_id uuid default auth.uid();`);
    lines.push(`alter table ${qualifiedTable} enable row level security;`);
    lines.push(
      `create policy "${entity.tableName}_select_own" on ${qualifiedTable}`,
    );
    lines.push(`  for select`);
    lines.push(`  using (auth.uid() = user_id);`);
    lines.push(
      `create policy "${entity.tableName}_insert_own" on ${qualifiedTable}`,
    );
    lines.push(`  for insert`);
    lines.push(`  with check (auth.uid() = user_id);`);
    lines.push(
      `create policy "${entity.tableName}_update_own" on ${qualifiedTable}`,
    );
    lines.push(`  for update`);
    lines.push(`  using (auth.uid() = user_id);`);
    lines.push(
      `create policy "${entity.tableName}_delete_own" on ${qualifiedTable}`,
    );
    lines.push(`  for delete`);
    lines.push(`  using (auth.uid() = user_id);`);
  }

  return `${lines.join("\n")}\n`;
}

function mapFieldTypeToSql(type: FieldType): string {
  switch (type) {
    case "string":
      return "text";
    case "text":
      return "text";
    case "int":
      return "integer default 0";
    case "float":
      return "double precision default 0";
    case "bool":
      return "boolean default false";
    case "date":
      return "timestamptz";
    default:
      return "text";
  }
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

function toKebabCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .toLowerCase();
}

function toSnakeCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .toLowerCase();
}

function toTitle(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
