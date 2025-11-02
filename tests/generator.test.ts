import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { rm, access } from "node:fs/promises";

import { generateApp } from "@/lib/generator";
import { defaultSpec } from "@/lib/spec";

const requiredFiles = [
  "package.json",
  "README.md",
  "tsconfig.json",
  "app/layout.tsx",
  "app/page.tsx",
  "generated/spec.ts",
  "supabase/migrations/0001_init.sql",
];

describe("generateApp", () => {
  let tempDir: string;
  let originalGeneratorRoot: string | undefined;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "generator-test-"));
    originalGeneratorRoot = process.env.GENERATOR_ROOT;
    process.env.GENERATOR_ROOT = path.join(tempDir, "generated-root");
  });

  afterEach(async () => {
    if (originalGeneratorRoot === undefined) {
      delete process.env.GENERATOR_ROOT;
    } else {
      process.env.GENERATOR_ROOT = originalGeneratorRoot;
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates expected files within generated folder", async () => {
    const result = await generateApp({
      spec: defaultSpec,
      projectRoot: process.cwd(),
    });
    const base = result.targetDir;

    for (const relative of requiredFiles) {
      const filePath = path.join(base, relative);
      await expect(access(filePath)).resolves.toBeUndefined();
    }
  });
});
