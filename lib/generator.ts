import os from "node:os";
import path from "node:path";
import slugify from "slugify";

import { ensureDir, pathExists, writeFileRecursive } from "@/lib/fsx";
import type { AppSpec } from "@/lib/spec";
import { buildFileMap } from "@/lib/templates/next";

const DEFAULT_LOCAL_ROOT = path.resolve(process.cwd(), "generated");
const VERCEL_TMP_ROOT = path.join(os.tmpdir(), "ai-appgen", "generated");

export const OUTPUT_ROOT =
  process.env.GENERATOR_ROOT ?? (process.env.VERCEL ? VERCEL_TMP_ROOT : DEFAULT_LOCAL_ROOT);

export type GenerateOptions = {
  spec: AppSpec;
  projectRoot?: string;
};

export type GenerateResult = {
  slug: string;
  targetDir: string;
  filesWritten: number;
};

export async function generateApp({
  spec,
  projectRoot = process.cwd(),
}: GenerateOptions): Promise<GenerateResult> {
  await ensureDir(OUTPUT_ROOT);

  const baseSlug = slugify(spec.name, { lower: true, strict: true }) || "app";
  const slug = await ensureUniqueSlug(OUTPUT_ROOT, baseSlug);
  const targetDir = path.join(OUTPUT_ROOT, slug);

  await ensureDir(targetDir);

  const files = await buildFileMap({
    spec,
    slug,
    targetDir,
    projectRoot,
  });

  let filesWritten = 0;
  for (const { filepath, contents } of files) {
    await writeFileRecursive(filepath, contents);
    filesWritten += 1;
  }

  return {
    slug,
    targetDir,
    filesWritten,
  };
}

async function ensureUniqueSlug(baseDir: string, baseSlug: string): Promise<string> {
  let suffix = 0;
  let candidate = baseSlug;

  while (await pathExists(path.join(baseDir, candidate))) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix + 1}`;
  }

  return candidate;
}
