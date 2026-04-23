import type { Candle, MarketMoodSnapshot, Quote, SignalBias } from "../types";

export const MARKET_MOOD_SOURCE =
  "Yahoo public market proxies plus optional Cboe put/call ratio file (delayed/best-effort)";

interface BuildMarketMoodInput {
  vixQuote?: Quote | null;
  spyCandles?: Candle[];
  qqqCandles?: Candle[];
  putCallRatio?: number | null;
  warnings?: string[];
  now?: Date;
}

export function buildMarketMoodSnapshot({
  vixQuote = null,
  spyCandles = [],
  qqqCandles = [],
  putCallRatio = null,
  warnings = [],
  now = new Date()
}: BuildMarketMoodInput): MarketMoodSnapshot {
  const vix = vixQuote?.price ?? null;
  const spyTrend = trendFromCandles(spyCandles);
  const qqqTrend = trendFromCandles(qqqCandles);
  let score = 50;

  if (vix !== null) {
    score += vix <= 15 ? 18 : vix <= 20 ? 8 : vix >= 32 ? -22 : vix >= 25 ? -12 : 0;
  } else {
    warnings.push("VIX proxy is unavailable.");
  }

  score += spyTrend === "LONG" ? 12 : spyTrend === "SHORT" ? -12 : 0;
  score += qqqTrend === "LONG" ? 10 : qqqTrend === "SHORT" ? -10 : 0;

  if (putCallRatio !== null) {
    score += putCallRatio <= 0.75 ? 8 : putCallRatio >= 1.2 ? -10 : 0;
  } else {
    warnings.push("Cboe put/call ratio is unavailable unless a public CSV URL is configured.");
  }

  const bounded = Math.round(Math.max(0, Math.min(100, score)));

  return {
    score: bounded,
    label: moodLabel(bounded),
    vix,
    putCallRatio,
    spyTrend,
    qqqTrend,
    warnings: [
      "This is a Fear/Greed-style proxy, not the CNN Fear & Greed Index.",
      "Market mood inputs are delayed/best-effort public data.",
      ...warnings
    ],
    dataTimestamp: now.toISOString(),
    source: MARKET_MOOD_SOURCE
  };
}

export function parsePutCallRatioCsv(raw: string): number | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.slice().reverse()) {
    const values = line.split(/[,|]/).map((value) => value.trim().replace(/^"|"$/g, ""));
    const numeric = values
      .map((value) => Number(value.replace(/[%\s]/g, "")))
      .filter((value) => Number.isFinite(value));
    const plausible = numeric.find((value) => value > 0.2 && value < 3);
    if (plausible !== undefined) {
      return plausible;
    }
  }

  return null;
}

function trendFromCandles(candles: Candle[]): SignalBias {
  if (candles.length < 30) {
    return "NEUTRAL";
  }

  const latest = candles.at(-1)!;
  const shortAverage = average(candles.slice(-10).map((candle) => candle.close));
  const longAverage = average(candles.slice(-30).map((candle) => candle.close));

  if (shortAverage === null || longAverage === null) {
    return "NEUTRAL";
  }

  if (latest.close > shortAverage && shortAverage > longAverage) {
    return "LONG";
  }

  if (latest.close < shortAverage && shortAverage < longAverage) {
    return "SHORT";
  }

  return "NEUTRAL";
}

function moodLabel(score: number): MarketMoodSnapshot["label"] {
  if (score >= 75) {
    return { ko: "강한 탐욕", en: "Extreme Greed" };
  }
  if (score >= 58) {
    return { ko: "탐욕", en: "Greed" };
  }
  if (score <= 25) {
    return { ko: "강한 공포", en: "Extreme Fear" };
  }
  if (score <= 42) {
    return { ko: "공포", en: "Fear" };
  }

  return { ko: "중립", en: "Neutral" };
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
