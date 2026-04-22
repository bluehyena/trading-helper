import type { Candle } from "../types";

export function toHeikinAshi(candles: Candle[]): Candle[] {
  let previousOpen: number | null = null;
  let previousClose: number | null = null;

  return candles.map((candle) => {
    const close = (candle.open + candle.high + candle.low + candle.close) / 4;
    const open =
      previousOpen === null || previousClose === null
        ? (candle.open + candle.close) / 2
        : (previousOpen + previousClose) / 2;
    const high = Math.max(candle.high, open, close);
    const low = Math.min(candle.low, open, close);

    previousOpen = open;
    previousClose = close;

    return {
      ...candle,
      open,
      high,
      low,
      close
    };
  });
}
