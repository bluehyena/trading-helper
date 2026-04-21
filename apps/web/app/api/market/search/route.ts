import { NextResponse } from "next/server";
import { createMarketDataProvider } from "@trading-helper/core";

const provider = createMarketDataProvider();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json([]);
  }

  try {
    return NextResponse.json(await provider.searchSymbols(query));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search symbols." },
      { status: 502 }
    );
  }
}
