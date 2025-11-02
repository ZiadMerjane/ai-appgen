import path from "node:path";
import slugify from "slugify";

import { ensureDir, pathExists, writeFileRecursive } from "@/lib/fsx";
import type { AppSpec } from "@/lib/spec";
import { buildFileMap } from "@/lib/templates/next";

export type GenerateOptions = {
  spec: AppSpec;
  baseDir?: string;
  projectRoot?: string;
};

export type GenerateResult = {
  slug: string;
  targetDir: string;
  filesWritten: number;
};

export async function generateApp({
  spec,
  baseDir = process.cwd(),
  projectRoot = process.cwd(),
}: GenerateOptions): Promise<GenerateResult> {
  const generatedRoot = path.join(baseDir, "generated");
  await ensureDir(generatedRoot);

  const baseSlug = slugify(spec.name, { lower: true, strict: true }) || "app";
  const slug = await ensureUniqueSlug(generatedRoot, baseSlug);
  const targetDir = path.join(generatedRoot, slug);

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
