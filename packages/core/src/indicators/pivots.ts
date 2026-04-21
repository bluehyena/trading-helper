import type { Candle } from "../types";

export interface PivotLevels {
  support: number | null;
  resistance: number | null;
  pivot: number | null;
}

export function pivotLevels(candles: Candle[], lookback = 60): PivotLevels {
  const latest = candles.at(-1);
  const previous = candles.at(-2);

  if (!latest || !previous) {
    return { support: null, resistance: null, pivot: null };
  }

  const recent = candles.slice(-lookback);
  const supports = recent
    .map((candle) => candle.low)
    .filter((price) => price <= latest.close);
  const resistances = recent
    .map((candle) => candle.high)
    .filter((price) => price >= latest.close);

  return {
    support: supports.length > 0 ? Math.max(...supports) : null,
    resistance: resistances.length > 0 ? Math.min(...resistances) : null,
    pivot: (previous.high + previous.low + previous.close) / 3
  };
}
