import { NextResponse } from "next/server";
import {
  analyzeSignal,
  analyzeSwingSignal,
  createMarketDataProvider,
  isRealtimeTimeframe,
  isTimeframe,
  type AppLocale,
  type TradingHorizon
} from "@trading-helper/core";
import { fetchOptionSentimentSnapshot } from "@trading-helper/core/server";

const provider = createMarketDataProvider();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "AAPL";
  const timeframe = searchParams.get("timeframe");
  const locale = toLocale(searchParams.get("locale"));
  const horizon = toHorizon(searchParams.get("horizon"));

  if (!isTimeframe(timeframe)) {
    return NextResponse.json({ error: "Unsupported timeframe." }, { status: 400 });
  }

  if (isRealtimeTimeframe(timeframe)) {
    return NextResponse.json({ error: "Second-level candles require the realtime stream endpoint." }, { status: 400 });
  }

  try {
    const [candles, optionSentiment] = await Promise.all([
      provider.getCandles(symbol, timeframe),
      fetchOptionSentimentSnapshot(symbol).catch(() => null)
    ]);
    const signalInput = {
      symbol,
      timeframe,
      candles,
      source: provider.source,
      locale,
      optionSentiment
    };
    const signal = horizon === "swing" ? analyzeSwingSignal(signalInput) : analyzeSignal({ ...signalInput, horizon });

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      timeframe,
      horizon,
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

function toHorizon(value: string | null): TradingHorizon {
  return value === "swing" ? "swing" : "scalp";
}
