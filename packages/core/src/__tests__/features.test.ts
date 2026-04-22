import { describe, expect, it } from "vitest";
import {
  analyzeSignal,
  detectCandlestickPatterns,
  isTimeframe,
  rankScannerResult,
  timeframeConfig,
  toHeikinAshi,
  type Candle
} from "../index";

describe("extended market features", () => {
  it("supports daily, weekly, and monthly timeframes", () => {
    expect(isTimeframe("1d")).toBe(true);
    expect(isTimeframe("1w")).toBe(true);
    expect(isTimeframe("1mo")).toBe(true);
    expect(timeframeConfig["1w"].interval).toBe("1wk");
    expect(timeframeConfig["1mo"].interval).toBe("1mo");
  });

  it("converts regular candles to Heikin-Ashi candles", () => {
    const candles = makeCandles(3);
    const heikin = toHeikinAshi(candles);

    expect(heikin).toHaveLength(3);
    expect(heikin[0].close).toBeCloseTo(
      (candles[0].open + candles[0].high + candles[0].low + candles[0].close) / 4,
      5
    );
    expect(heikin[1].open).toBeCloseTo((heikin[0].open + heikin[0].close) / 2, 5);
  });

  it("detects representative candlestick patterns", () => {
    const bullish = detectCandlestickPatterns([
      candle(100, 101, 94, 95),
      candle(94, 104, 93, 103)
    ]);
    const bearish = detectCandlestickPatterns([
      candle(95, 104, 94, 103),
      candle(104, 105, 93, 94)
    ]);

    expect(bullish.some((pattern) => pattern.id === "bullish_engulfing")).toBe(true);
    expect(bearish.some((pattern) => pattern.id === "bearish_engulfing")).toBe(true);
  });

  it("ranks scanner results by signal quality and setup proximity", () => {
    const candles = makeCandles(220);
    const signal = analyzeSignal({
      symbol: "AAPL",
      timeframe: "5m",
      candles,
      source: "fixture",
      now: new Date(candles.at(-1)!.timestamp + 60_000)
    });
    const result = rankScannerResult({
      symbol: "AAPL",
      timeframe: "5m",
      candles,
      signal,
      now: new Date(candles.at(-1)!.timestamp + 60_000)
    });

    expect(result.symbol).toBe("AAPL");
    expect(result.score).toBeGreaterThan(0);
    expect(result.keyReason.length).toBeGreaterThan(0);
  });
});

function makeCandles(count: number): Candle[] {
  const baseTime = Date.now() - count * 5 * 60_000;
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 0.12;
    return {
      timestamp: baseTime + index * 5 * 60_000,
      time: new Date(baseTime + index * 5 * 60_000).toISOString(),
      open: close - 0.08,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1_000 + index * 5
    };
  });
}

function candle(open: number, high: number, low: number, close: number): Candle {
  return {
    timestamp: Date.now(),
    time: new Date().toISOString(),
    open,
    high,
    low,
    close,
    volume: 1_000
  };
}
