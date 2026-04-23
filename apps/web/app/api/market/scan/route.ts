import { NextResponse } from "next/server";
import {
  analyzeSignal,
  analyzeSwingSignal,
  createMarketDataProvider,
  isRealtimeTimeframe,
  isTimeframe,
  rankScannerResult,
  type AppLocale,
  type Timeframe,
  type TradingHorizon
} from "@trading-helper/core";

export const runtime = "nodejs";

interface ScanRequestBody {
  symbols?: string[];
  timeframe?: string;
  locale?: AppLocale;
  horizon?: TradingHorizon;
}

const provider = createMarketDataProvider();
const MAX_SYMBOLS = 25;
const BATCH_SIZE = 4;

export async function POST(request: Request) {
  const body = (await request.json()) as ScanRequestBody;
  const symbols = normalizeSymbols(body.symbols ?? []).slice(0, MAX_SYMBOLS);
  const requestedTimeframe = body.timeframe ?? null;
  const timeframe: Timeframe = isTimeframe(requestedTimeframe) && !isRealtimeTimeframe(requestedTimeframe) ? requestedTimeframe : "5m";
  const locale: AppLocale = body.locale === "en" ? "en" : "ko";
  const horizon: TradingHorizon = body.horizon === "swing" ? "swing" : "scalp";
  const scanTimeframe: Timeframe = horizon === "swing" && (timeframe === "5m" || timeframe === "1m" || timeframe === "15m" || timeframe === "30m" || timeframe === "1h")
    ? "1d"
    : timeframe;

  if (symbols.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const results = [];
  for (let index = 0; index < symbols.length; index += BATCH_SIZE) {
    const batch = symbols.slice(index, index + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const candles = await provider.getCandles(symbol, scanTimeframe);
          const input = {
            symbol,
            timeframe: scanTimeframe,
            candles,
            locale,
            source: provider.source
          };
          const signal = horizon === "swing" ? analyzeSwingSignal(input) : analyzeSignal({ ...input, horizon });

          return rankScannerResult({ symbol, timeframe: scanTimeframe, candles, signal, locale, horizon });
        } catch (error) {
          return {
            symbol,
            error: error instanceof Error ? error.message : "Scan failed."
          };
        }
      })
    );
    results.push(...batchResults);
  }

  return NextResponse.json({
    results: results.sort((left, right) => ("score" in right ? right.score : -999) - ("score" in left ? left.score : -999)),
    source: provider.source,
    horizon,
    maxSymbols: MAX_SYMBOLS
  });
}

function normalizeSymbols(symbols: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const symbol of symbols) {
    const value = symbol.trim().toUpperCase();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}
