import { NextResponse } from "next/server";
import { z } from "zod";

import { generateApp } from "@/lib/generator";
import { checkRateLimit } from "@/lib/rate";
import { ensureSpecDefaults } from "@/lib/spec";

export const runtime = "nodejs";

const requestSchema = z.object({
  spec: z.unknown(),
});

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const allowed = checkRateLimit({
      identifier: `generate:${clientIp}`,
      limit: 12,
      windowMs: 60 * 60 * 1000,
    });

    if (!allowed) {
      return NextResponse.json({ error: "rate_limit" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const specResult = ensureSpecDefaults(parsed.data.spec);
    if ("error" in specResult) {
      return NextResponse.json(specResult, { status: 422 });
    }

    const result = await generateApp({ spec: specResult });

    return NextResponse.json({
      spec: specResult,
      slug: result.slug,
      outputDir: result.targetDir,
      filesWritten: result.filesWritten,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Generator failed",
        detail: serializeError(error),
      },
      { status: 500 },
    );
  }
}

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return "Unknown error";
}
