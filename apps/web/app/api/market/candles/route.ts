import { NextResponse } from "next/server";
import { analyzeSignal, createMarketDataProvider, isTimeframe, type AppLocale } from "@trading-helper/core";

const provider = createMarketDataProvider();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "AAPL";
  const timeframe = searchParams.get("timeframe");
  const locale = toLocale(searchParams.get("locale"));

  if (!isTimeframe(timeframe)) {
    return NextResponse.json({ error: "Unsupported timeframe." }, { status: 400 });
  }

  try {
    const candles = await provider.getCandles(symbol, timeframe);
    const signal = analyzeSignal({
      symbol,
      timeframe,
      candles,
      source: provider.source,
      locale
    });

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      timeframe,
      candles,
      signal,
      source: provider.source
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load candles." },
      { status: 502 }
    );
  }
}

function toLocale(value: string | null): AppLocale {
  return value === "en" ? "en" : "ko";
}
