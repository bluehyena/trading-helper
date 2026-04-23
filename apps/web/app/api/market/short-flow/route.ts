import { NextResponse } from "next/server";
import { fetchShortFlowSnapshot } from "@trading-helper/core";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "AAPL";

  try {
    return NextResponse.json(await fetchShortFlowSnapshot(symbol));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load short-flow data." },
      { status: 502 }
    );
  }
}
