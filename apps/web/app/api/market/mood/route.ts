import { NextResponse } from "next/server";
import { buildMarketMoodSnapshot, createMarketDataProvider, parsePutCallRatioCsv } from "@trading-helper/core";

export const runtime = "nodejs";

const provider = createMarketDataProvider();

export async function GET() {
  const warnings: string[] = [];
  const [vixQuote, spyCandles, qqqCandles, putCallRatio] = await Promise.all([
    provider.getQuote("^VIX").catch((error) => {
      warnings.push(`VIX fetch failed: ${error instanceof Error ? error.message : "unknown error"}.`);
      return null;
    }),
    provider.getCandles("SPY", "1d").catch((error) => {
      warnings.push(`SPY trend fetch failed: ${error instanceof Error ? error.message : "unknown error"}.`);
      return [];
    }),
    provider.getCandles("QQQ", "1d").catch((error) => {
      warnings.push(`QQQ trend fetch failed: ${error instanceof Error ? error.message : "unknown error"}.`);
      return [];
    }),
    fetchPutCallRatio(warnings)
  ]);

  return NextResponse.json(
    buildMarketMoodSnapshot({
      vixQuote,
      spyCandles,
      qqqCandles,
      putCallRatio,
      warnings
    })
  );
}

async function fetchPutCallRatio(warnings: string[]): Promise<number | null> {
  const url = process.env.CBOE_PUT_CALL_RATIO_CSV_URL;
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/csv,text/plain,*/*",
        "User-Agent": "trading-helper/0.1"
      },
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return parsePutCallRatioCsv(await response.text());
  } catch (error) {
    warnings.push(`Cboe put/call fetch failed: ${error instanceof Error ? error.message : "unknown error"}.`);
    return null;
  }
}
