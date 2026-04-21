import type { Candle, IndicatorSnapshot } from "../types";
import { bollingerBands, ema, macd, rsi, vwap } from "./trend";
import { lastDefined } from "./math";
import { obv, relativeVolume, atr } from "./volatility";
import { pivotLevels } from "./pivots";

export * from "./math";
export * from "./pivots";
export * from "./trend";
export * from "./volatility";

export function indicatorSnapshot(candles: Candle[]): IndicatorSnapshot {
  const closes = candles.map((candle) => candle.close);
  const macdPoints = macd(closes);
  const bands = bollingerBands(closes);
  const pivots = pivotLevels(candles);

  return {
    ema9: lastDefined(ema(closes, 9)),
    ema21: lastDefined(ema(closes, 21)),
    ema50: lastDefined(ema(closes, 50)),
    ema200: lastDefined(ema(closes, 200)),
    rsi14: lastDefined(rsi(closes, 14)),
    macd: lastDefined(macdPoints.map((point) => point.macd)),
    macdSignal: lastDefined(macdPoints.map((point) => point.signal)),
    macdHistogram: lastDefined(macdPoints.map((point) => point.histogram)),
    bollingerUpper: lastDefined(bands.map((band) => band.upper)),
    bollingerMiddle: lastDefined(bands.map((band) => band.middle)),
    bollingerLower: lastDefined(bands.map((band) => band.lower)),
    atr14: lastDefined(atr(candles, 14)),
    vwap: lastDefined(vwap(candles)),
    relativeVolume: lastDefined(relativeVolume(candles, 20)),
    obv: lastDefined(obv(candles)),
    support: pivots.support,
    resistance: pivots.resistance,
    pivot: pivots.pivot
  };
}
