import type { Candle } from "../types";
import { average, standardDeviation } from "./math";

export function sma(values: number[], period: number): Array<number | null> {
  if (period <= 0) {
    throw new Error("SMA period must be positive.");
  }

  return values.map((_, index) => {
    if (index + 1 < period) {
      return null;
    }

    return average(values.slice(index + 1 - period, index + 1));
  });
}

export function ema(values: number[], period: number): Array<number | null> {
  if (period <= 0) {
    throw new Error("EMA period must be positive.");
  }

  const output: Array<number | null> = Array(values.length).fill(null);
  const multiplier = 2 / (period + 1);
  let previous: number | null = null;

  values.forEach((value, index) => {
    if (index + 1 < period) {
      return;
    }

    if (previous === null) {
      previous = average(values.slice(index + 1 - period, index + 1));
    } else {
      previous = (value - previous) * multiplier + previous;
    }

    output[index] = previous;
  });

  return output;
}

export function rsi(values: number[], period = 14): Array<number | null> {
  const output: Array<number | null> = Array(values.length).fill(null);
  if (values.length <= period) {
    return output;
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  output[period] = toRsi(averageGain, averageLoss);

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    output[index] = toRsi(averageGain, averageLoss);
  }

  return output;
}

function toRsi(averageGain: number, averageLoss: number): number {
  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

export interface MacdPoint {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export function macd(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MacdPoint[] {
  const fast = ema(values, fastPeriod);
  const slow = ema(values, slowPeriod);
  const macdLine = values.map((_, index) =>
    fast[index] !== null && slow[index] !== null
      ? (fast[index] as number) - (slow[index] as number)
      : null
  );
  const signalLine = emaNullable(macdLine, signalPeriod);

  return values.map((_, index) => {
    const line = macdLine[index];
    const signal = signalLine[index];
    return {
      macd: line,
      signal,
      histogram: line !== null && signal !== null ? line - signal : null
    };
  });
}

function emaNullable(values: Array<number | null>, period: number): Array<number | null> {
  const output: Array<number | null> = Array(values.length).fill(null);
  const compact: number[] = [];
  let previous: number | null = null;
  const multiplier = 2 / (period + 1);

  values.forEach((value, index) => {
    if (value === null) {
      return;
    }

    compact.push(value);
    if (compact.length < period) {
      return;
    }

    if (previous === null) {
      previous = average(compact.slice(compact.length - period));
    } else {
      previous = (value - previous) * multiplier + previous;
    }

    output[index] = previous;
  });

  return output;
}

export interface BollingerBand {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export function bollingerBands(
  values: number[],
  period = 20,
  deviations = 2
): BollingerBand[] {
  return values.map((_, index) => {
    if (index + 1 < period) {
      return { upper: null, middle: null, lower: null };
    }

    const slice = values.slice(index + 1 - period, index + 1);
    const middle = average(slice);
    const deviation = standardDeviation(slice);

    if (middle === null || deviation === null) {
      return { upper: null, middle: null, lower: null };
    }

    return {
      upper: middle + deviation * deviations,
      middle,
      lower: middle - deviation * deviations
    };
  });
}

export function vwap(candles: Candle[]): Array<number | null> {
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;
  let previousDate = "";

  return candles.map((candle) => {
    const currentDate = candle.time.slice(0, 10);
    if (currentDate !== previousDate) {
      cumulativePriceVolume = 0;
      cumulativeVolume = 0;
      previousDate = currentDate;
    }

    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativePriceVolume += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;

    return cumulativeVolume > 0 ? cumulativePriceVolume / cumulativeVolume : null;
  });
}
