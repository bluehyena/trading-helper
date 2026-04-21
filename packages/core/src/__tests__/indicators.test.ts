import { describe, expect, it } from "vitest";
import { atr, ema, indicatorSnapshot, macd, relativeVolume, rsi, type Candle } from "../index";

describe("technical indicators", () => {
  it("calculates EMA after the warmup period", () => {
    const values = [1, 2, 3, 4, 5, 6];
    const result = ema(values, 3);

    expect(result[0]).toBeNull();
    expect(result[2]).toBe(2);
    expect(result.at(-1)).toBeCloseTo(5, 5);
  });

  it("detects strong RSI on persistent gains", () => {
    const values = Array.from({ length: 25 }, (_, index) => 100 + index);
    const result = rsi(values, 14);

    expect(result.at(-1)).toBe(100);
  });

  it("produces positive MACD histogram in an uptrend", () => {
    const values = Array.from({ length: 80 }, (_, index) => 50 + index * 0.2 + index * index * 0.005);
    const result = macd(values);

    expect(result.at(-1)?.histogram).toBeGreaterThan(0);
  });

  it("calculates volatility and volume snapshots", () => {
    const candles = makeCandles(40, 1);

    expect(atr(candles).at(-1)).toBeGreaterThan(0);
    expect(relativeVolume(candles).at(-1)).toBeGreaterThan(0);
    expect(indicatorSnapshot(candles).vwap).toBeGreaterThan(0);
  });
});

function makeCandles(count: number, direction: 1 | -1): Candle[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + direction * index * 0.25;
    return {
      timestamp: Date.now() - (count - index) * 60_000,
      time: new Date(Date.now() - (count - index) * 60_000).toISOString(),
      open: close - direction * 0.1,
      high: close + 0.5,
      low: close - 0.5,
      close,
      volume: 1_000 + index * 10
    };
  });
}
