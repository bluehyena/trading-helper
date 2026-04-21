import type { Candle, Timeframe } from "../types";
import { timeframeConfig } from "../market/timeframes";

export function minutesSinceLatestCandle(candles: Candle[], now = new Date()): number | null {
  const latest = candles.at(-1);
  if (!latest) {
    return null;
  }

  return Math.max(0, (now.getTime() - latest.timestamp) / 60_000);
}

export function isDataStale(candles: Candle[], timeframe: Timeframe, now = new Date()): boolean {
  const minutes = minutesSinceLatestCandle(candles, now);
  if (minutes === null) {
    return true;
  }

  return minutes > timeframeConfig[timeframe].staleAfterMinutes;
}
