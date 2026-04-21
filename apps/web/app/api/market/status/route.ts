import { NextResponse } from "next/server";
import { createMarketDataProvider } from "@trading-helper/core";

const provider = createMarketDataProvider();

export async function GET() {
  return NextResponse.json(await provider.getMarketStatus());
}
