import type { AppLocale, Candle, ScannerRankReason, ScannerResult, SignalResult, Timeframe } from "../types";
import { round } from "../indicators";
import { minutesSinceLatestCandle } from "./staleness";

interface RankScannerInput {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  signal: SignalResult;
  locale?: AppLocale;
  now?: Date;
}

export function rankScannerResult({
  symbol,
  timeframe,
  candles,
  signal,
  locale = "ko",
  now = new Date()
}: RankScannerInput): ScannerResult {
  const latest = candles.at(-1);
  const price = latest?.close ?? 0;
  const dataAgeMinutes = minutesSinceLatestCandle(candles, now);
  const rankReasons: ScannerRankReason[] = [];
  let score = signal.bias === "NEUTRAL" ? 0 : signal.confidence;

  if (signal.entryZone && price > 0) {
    const distance = distanceToZone(price, signal.entryZone.low, signal.entryZone.high);
    const entryBonus = Math.max(0, 22 - distance * 180);
    score += entryBonus;
    rankReasons.push({
      label: locale === "en" ? `Entry proximity +${round(entryBonus, 1)}` : `타점 근접 +${round(entryBonus, 1)}`,
      weight: round(entryBonus, 1)
    });
  }

  if (signal.riskReward && signal.riskReward >= 2) {
    score += 8;
    rankReasons.push({ label: locale === "en" ? "2R plan +8" : "2R 계획 +8", weight: 8 });
  }

  if ((signal.indicators.relativeVolume ?? 0) >= 1.2) {
    score += 6;
    rankReasons.push({ label: locale === "en" ? "Relative volume +6" : "상대 거래량 +6", weight: 6 });
  }

  const alignedPatterns = signal.patterns.filter((pattern) =>
    signal.bias === "LONG" ? pattern.direction === "BULLISH" : signal.bias === "SHORT" ? pattern.direction === "BEARISH" : false
  );
  if (alignedPatterns.length > 0) {
    const patternBonus = alignedPatterns.some((pattern) => pattern.strength === "HIGH") ? 10 : 6;
    score += patternBonus;
    rankReasons.push({
      label:
        locale === "en"
          ? `${alignedPatterns[0].label.en} +${patternBonus}`
          : `${alignedPatterns[0].label.ko} +${patternBonus}`,
      weight: patternBonus
    });
  }

  const alignedChartPatterns = signal.chartPatterns.filter((pattern) =>
    signal.bias === "LONG" ? pattern.direction === "BULLISH" : signal.bias === "SHORT" ? pattern.direction === "BEARISH" : false
  );
  if (alignedChartPatterns.length > 0) {
    const chartPatternBonus = alignedChartPatterns.some((pattern) => pattern.strength === "HIGH") ? 12 : 7;
    score += chartPatternBonus;
    rankReasons.push({
      label:
        locale === "en"
          ? `${alignedChartPatterns[0].label.en} +${chartPatternBonus}`
          : `${alignedChartPatterns[0].label.ko} +${chartPatternBonus}`,
      weight: chartPatternBonus
    });
  }

  if (dataAgeMinutes !== null && dataAgeMinutes > 60) {
    const penalty = Math.min(18, dataAgeMinutes / 20);
    score -= penalty;
    rankReasons.push({
      label: locale === "en" ? `Stale data -${round(penalty, 1)}` : `데이터 지연 -${round(penalty, 1)}`,
      weight: -round(penalty, 1)
    });
  }

  return {
    symbol: symbol.toUpperCase(),
    timeframe,
    price,
    bias: signal.bias,
    confidence: signal.confidence,
    score: round(score, 1),
    entryZone: signal.entryZone,
    invalidation: signal.invalidation,
    targets: signal.targets,
    keyReason: signal.reasons[0] ?? (locale === "en" ? "No clear reason" : "뚜렷한 근거 없음"),
    dataAgeMinutes: dataAgeMinutes === null ? null : round(dataAgeMinutes, 1),
    patterns: signal.patterns,
    chartPatterns: signal.chartPatterns,
    rankReasons,
    signal
  };
}

function distanceToZone(price: number, low: number, high: number): number {
  if (price >= low && price <= high) {
    return 0;
  }

  const target = price < low ? low : high;
  return Math.abs(price - target) / price;
}
