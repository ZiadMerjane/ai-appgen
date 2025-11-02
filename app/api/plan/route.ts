import { NextResponse } from "next/server";
import { z } from "zod";

import { callLLM } from "@/lib/llm";
import { checkRateLimit } from "@/lib/rate";
import { ensureSpecDefaults, plannerPromptTemplate } from "@/lib/spec";

export const runtime = "nodejs";

const requestSchema = z.object({
  prompt: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const allowed = checkRateLimit({
      identifier: `plan:${clientIp}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });

    if (!allowed) {
      return NextResponse.json({ error: "rate_limit" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((err) => err.message).join(", ") },
        { status: 400 },
      );
    }

    const prompt = parsed.data.prompt ?? "";
    const system = "You translate product ideas into strict JSON specs.";
    const llmResponse = await callLLM({
      system,
      prompt: plannerPromptTemplate(prompt),
      temperature: 0,
    });

    let jsonPayload: unknown;
    try {
      jsonPayload = JSON.parse(llmResponse);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Planner returned non-JSON output",
          detail: serializeError(error),
          raw: llmResponse,
        },
        { status: 502 },
      );
    }

    const spec = ensureSpecDefaults(jsonPayload);

    if ("error" in spec) {
      return NextResponse.json(spec, { status: 422 });
    }

    return NextResponse.json(spec);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Planner failed",
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
