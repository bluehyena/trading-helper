import { describe, expect, it } from "vitest";
import { analyzeSignal, isDataStale, type Candle } from "../index";

describe("signal engine", () => {
  it("emits a long bias for aligned bullish structure", () => {
    const candles = makeTrendCandles(240, 1);
    const signal = analyzeSignal({
      symbol: "AAPL",
      timeframe: "5m",
      candles,
      source: "fixture",
      now: new Date(candles.at(-1)!.timestamp + 60_000)
    });

    expect(signal.bias).toBe("LONG");
    expect(signal.confidence).toBeGreaterThanOrEqual(50);
    expect(signal.entryZone).not.toBeNull();
    expect(signal.targets).toHaveLength(2);
  });

  it("emits a short bias for aligned bearish structure", () => {
    const candles = makeTrendCandles(240, -1);
    const signal = analyzeSignal({
      symbol: "TSLA",
      timeframe: "5m",
      candles,
      source: "fixture",
      now: new Date(candles.at(-1)!.timestamp + 60_000)
    });

    expect(signal.bias).toBe("SHORT");
    expect(signal.confidence).toBeGreaterThanOrEqual(50);
    expect(signal.invalidation).not.toBeNull();
  });

  it("keeps sideways data neutral", () => {
    const candles = makeSidewaysCandles(180);
    const signal = analyzeSignal({
      symbol: "MSFT",
      timeframe: "15m",
      candles,
      source: "fixture",
      now: new Date(candles.at(-1)!.timestamp + 60_000)
    });

    expect(signal.bias).toBe("NEUTRAL");
    expect(signal.entryZone).toBeNull();
  });

  it("flags stale intraday data", () => {
    const candles = makeTrendCandles(80, 1).map((candle) => ({
      ...candle,
      timestamp: candle.timestamp - 60 * 60_000,
      time: new Date(candle.timestamp - 60 * 60_000).toISOString()
    }));

    expect(isDataStale(candles, "5m", new Date(candles.at(-1)!.timestamp + 30 * 60_000))).toBe(true);
  });
});

function makeTrendCandles(count: number, direction: 1 | -1): Candle[] {
  const baseTime = Date.now() - count * 5 * 60_000;
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + direction * index * 0.18 + Math.sin(index / 6) * 0.08;
    return {
      timestamp: baseTime + index * 5 * 60_000,
      time: new Date(baseTime + index * 5 * 60_000).toISOString(),
      open: close - direction * 0.08,
      high: close + 0.45,
      low: close - 0.45,
      close,
      volume: 1_000 + index * 8
    };
  });
}

function makeSidewaysCandles(count: number): Candle[] {
  const baseTime = Date.now() - count * 15 * 60_000;
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + Math.sin(index / 3) * 0.18;
    return {
      timestamp: baseTime + index * 15 * 60_000,
      time: new Date(baseTime + index * 15 * 60_000).toISOString(),
      open: close + Math.cos(index / 2) * 0.04,
      high: close + 0.35,
      low: close - 0.35,
      close,
      volume: 1_200 + (index % 4) * 20
    };
  });
}
