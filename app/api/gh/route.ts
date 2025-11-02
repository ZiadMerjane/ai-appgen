import { NextResponse } from "next/server";
import { spawnSync } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const result = spawnSync("gh", ["--version"], { encoding: "utf8" });
    const available = result.status === 0;
    return NextResponse.json({ available });
  } catch (error) {
    console.warn("Failed to detect gh CLI", error);
    return NextResponse.json({ available: false });
  }
}
