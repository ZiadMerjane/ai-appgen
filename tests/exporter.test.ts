import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";

import { zipDirectoryToBuffer } from "@/lib/zip";

describe("zipDirectoryToBuffer", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "exporter-test-"));
    await writeFile(path.join(tempDir, "hello.txt"), "hello world", "utf8");
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates a non-empty zip buffer", async () => {
    const buffer = await zipDirectoryToBuffer(tempDir);
    expect(buffer.length).toBeGreaterThan(100);
  });
});
