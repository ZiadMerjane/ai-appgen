export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest } from "next/server";
import archiver from "archiver";
import fs from "node:fs";
import path from "node:path";

const GENERATED_ROOT = path.resolve(process.cwd(), "generated");
const MAX_BYTES = 200 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return new Response(JSON.stringify({ error: "missing_slug" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const dir = path.join(GENERATED_ROOT, slug);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  let bytes = 0;
  let aborted = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const zip = archiver("zip", { zlib: { level: 9 } });

      zip.on("data", (chunk: Buffer) => {
        if (aborted) return;
        bytes += chunk.length;
        if (bytes > MAX_BYTES) {
          aborted = true;
          zip.abort();
          controller.error(new Error("ZIP_TOO_LARGE"));
          return;
        }
        controller.enqueue(new Uint8Array(chunk));
      });

      zip.on("end", () => {
        if (!aborted) controller.close();
      });

      zip.on("warning", (err) => {
        console.warn("[zip warning]", err);
      });

      zip.on("error", (err) => {
        if (!aborted) controller.error(err);
      });

      zip.directory(dir, false);
      void zip.finalize();
    },
    cancel() {
      aborted = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${slug}.zip"`,
    },
  });
}
