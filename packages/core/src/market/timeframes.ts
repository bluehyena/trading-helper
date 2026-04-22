import type { Timeframe } from "../types";

export interface TimeframeConfig {
  interval: string;
  range: string;
  staleAfterMinutes: number;
}

export const timeframeConfig: Record<Timeframe, TimeframeConfig> = {
  "1m": { interval: "1m", range: "1d", staleAfterMinutes: 8 },
  "5m": { interval: "5m", range: "5d", staleAfterMinutes: 20 },
  "15m": { interval: "15m", range: "5d", staleAfterMinutes: 45 },
  "30m": { interval: "30m", range: "1mo", staleAfterMinutes: 90 },
  "1h": { interval: "60m", range: "3mo", staleAfterMinutes: 180 },
  "1d": { interval: "1d", range: "1y", staleAfterMinutes: 60 * 36 },
  "1w": { interval: "1wk", range: "5y", staleAfterMinutes: 60 * 24 * 10 },
  "1mo": { interval: "1mo", range: "10y", staleAfterMinutes: 60 * 24 * 45 }
};

export function isTimeframe(value: string | null): value is Timeframe {
  return value !== null && value in timeframeConfig;
}
