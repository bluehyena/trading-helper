import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { defaultUserState, normalizeUserState } from "@trading-helper/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await readFile(statePath(), "utf8");
    return NextResponse.json(normalizeUserState(JSON.parse(raw)));
  } catch {
    return NextResponse.json(normalizeUserState(defaultUserState));
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const state = normalizeUserState(body);
    const filePath = statePath();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save state." },
      { status: 400 }
    );
  }
}

function statePath(): string {
  const configuredPath = process.env.TRADING_HELPER_STATE_PATH;
  if (configuredPath) {
    return path.resolve(/*turbopackIgnore: true*/ configuredPath);
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), ".trading-helper", "state.json");
}
