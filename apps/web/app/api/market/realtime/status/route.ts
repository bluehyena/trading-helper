import { NextResponse } from "next/server";
import { POLYGON_REALTIME_SOURCE } from "@trading-helper/core";

export const runtime = "nodejs";

export async function GET() {
  const provider = process.env.REALTIME_DATA_PROVIDER ?? "polygon";
  const configured = provider === "polygon" && Boolean(process.env.POLYGON_API_KEY);

  return NextResponse.json({
    configured,
    provider,
    source: configured ? POLYGON_REALTIME_SOURCE : "Realtime provider is not configured."
  });
}
