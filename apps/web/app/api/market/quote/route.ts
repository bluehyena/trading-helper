import { NextResponse } from "next/server";
import { createMarketDataProvider } from "@trading-helper/core";

const provider = createMarketDataProvider();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "AAPL";

  try {
    return NextResponse.json(await provider.getQuote(symbol));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load quote." },
      { status: 502 }
    );
  }
}
