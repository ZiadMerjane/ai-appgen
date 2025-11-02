import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildFileMap } from "@/lib/templates/next";
import type { AppSpec } from "@/lib/spec";

describe("template SQL policies", () => {
  it("includes owner-based RLS policies and user_id defaults", async () => {
    const spec: AppSpec = {
      name: "Library",
      entities: [
        {
          name: "Book",
          fields: [
            { name: "title", type: "string" },
            { name: "pages", type: "int" },
          ],
        },
      ],
      pages: [
        { route: "/", purpose: "List books", entities: ["Book"] },
      ],
      auth: { emailPassword: true },
    };

    const files = await buildFileMap({
      spec,
      slug: "library",
      targetDir: path.join(process.cwd(), ".tmp-library"),
      projectRoot: process.cwd(),
    });

    const migration = files.find((file) =>
      file.filepath.endsWith(path.join("supabase", "migrations", "0001_init.sql")),
    );

    expect(migration).toBeDefined();
    const sql = migration?.contents ?? "";

    expect(sql).toContain('add column if not exists user_id uuid default auth.uid()');
    expect(sql).toContain('create policy "books_select_own"');
    expect(sql).toContain('create policy "books_insert_own"');
    expect(sql).toContain('create policy "books_update_own"');
    expect(sql).toContain('create policy "books_delete_own"');
  });
});
