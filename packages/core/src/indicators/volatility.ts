import type { Candle } from "../types";
import { average } from "./math";

export function atr(candles: Candle[], period = 14): Array<number | null> {
  const trueRanges = candles.map((candle, index) => {
    if (index === 0) {
      return candle.high - candle.low;
    }

    const previousClose = candles[index - 1].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });

  const output: Array<number | null> = Array(candles.length).fill(null);
  let previousAtr: number | null = null;

  trueRanges.forEach((range, index) => {
    if (index + 1 < period) {
      return;
    }

    if (previousAtr === null) {
      previousAtr = average(trueRanges.slice(index + 1 - period, index + 1));
    } else {
      previousAtr = (previousAtr * (period - 1) + range) / period;
    }

    output[index] = previousAtr;
  });

  return output;
}

export function relativeVolume(candles: Candle[], period = 20): Array<number | null> {
  return candles.map((candle, index) => {
    if (index < period) {
      return null;
    }

    const previousVolumes = candles
      .slice(index - period, index)
      .map((previous) => previous.volume);
    const baseline = average(previousVolumes);

    return baseline && baseline > 0 ? candle.volume / baseline : null;
  });
}

export function obv(candles: Candle[]): Array<number | null> {
  let value = 0;

  return candles.map((candle, index) => {
    if (index === 0) {
      return value;
    }

    const previousClose = candles[index - 1].close;
    if (candle.close > previousClose) {
      value += candle.volume;
    } else if (candle.close < previousClose) {
      value -= candle.volume;
    }

    return value;
  });
}
