import { clamp, indicatorSnapshot, round } from "../indicators";
import type {
  AppLocale,
  Candle,
  OptionSentimentSnapshot,
  ShortFlowSnapshot,
  SignalBias,
  SignalResult,
  Timeframe
} from "../types";
import { detectChartPatterns } from "./chart-patterns";
import { detectCandlestickPatterns } from "./patterns";
import { isDataStale, minutesSinceLatestCandle } from "./staleness";

interface AnalyzeSwingSignalInput {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  source: string;
  locale?: AppLocale;
  now?: Date;
  optionSentiment?: OptionSentimentSnapshot | null;
  shortFlow?: ShortFlowSnapshot | null;
}

const copy = {
  ko: {
    analysisOnly: "스윙 관점의 분석 보조 결과입니다. 투자 판단과 손실 책임은 사용자에게 있습니다.",
    noCandles: "스윙 분석에 사용할 캔들 데이터가 없습니다.",
    tooFewCandles: "스윙 분석은 더 긴 일봉/주봉 이력이 필요해 신뢰도를 낮춰 봐야 합니다.",
    stale: (minutes: number) => `마지막 캔들이 약 ${minutes}분 전 데이터입니다.`,
    trendBull: "중기 이동평균 배열이 상승 추세를 지지합니다.",
    trendBear: "중기 이동평균 배열이 하락 추세를 지지합니다.",
    aboveSma50: "가격이 SMA50 위에 있어 중기 방어 흐름이 유지됩니다.",
    belowSma50: "가격이 SMA50 아래에 있어 스윙 약세가 우세할 수 있습니다.",
    aboveEma200: "가격이 EMA200 위에 있어 큰 추세가 우호적입니다.",
    belowEma200: "가격이 EMA200 아래에 있어 큰 추세 리스크가 남아 있습니다.",
    rsiBull: "RSI가 스윙 상승 모멘텀 구간입니다.",
    rsiBear: "RSI가 스윙 약세 모멘텀 구간입니다.",
    rsiHot: "RSI가 과열권입니다. 스윙 추격 진입 리스크가 큽니다.",
    rsiCold: "RSI가 과매도권입니다. 늦은 숏 추격은 위험할 수 있습니다.",
    macdBull: "MACD 히스토그램이 양수라 중기 모멘텀이 개선 중입니다.",
    macdBear: "MACD 히스토그램이 음수라 중기 모멘텀이 약합니다.",
    volume: (value: number) => `거래량이 평균 대비 ${round(value, 2)}배로 증가했습니다.`,
    support: "최근 지지 부근에서 반등 가능 구간입니다.",
    resistance: "최근 저항 부근이라 돌파 실패 리스크를 봐야 합니다.",
    optionsBull: "옵션 포지셔닝이 스윙 롱 쪽에 조금 더 우호적입니다.",
    optionsBear: "옵션 포지셔닝이 스윙 숏 쪽에 조금 더 우호적입니다.",
    darkPoolProxy: "FINRA ATS 다크풀 거래량이 높아 스윙 재료 해석에 숨은 유동성도 참고해야 합니다.",
    noEdge: "스윙 관점에서 아직 뚜렷한 방향 우위가 확인되지 않았습니다."
  },
  en: {
    analysisOnly: "Swing-horizon analysis support only. Investment decisions and losses remain the user's responsibility.",
    noCandles: "No candle data is available for swing analysis.",
    tooFewCandles: "Swing analysis needs more daily or weekly history, so confidence should be reduced.",
    stale: (minutes: number) => `The latest candle is about ${minutes} minutes old.`,
    trendBull: "Medium-term moving-average alignment supports an uptrend.",
    trendBear: "Medium-term moving-average alignment supports a downtrend.",
    aboveSma50: "Price is holding above SMA50.",
    belowSma50: "Price is below SMA50, which can favor swing weakness.",
    aboveEma200: "Price is above EMA200, so the larger trend is supportive.",
    belowEma200: "Price is below EMA200, so larger-trend risk is elevated.",
    rsiBull: "RSI is in a swing bullish momentum zone.",
    rsiBear: "RSI is in a swing weak momentum zone.",
    rsiHot: "RSI is hot. Swing chase risk is elevated.",
    rsiCold: "RSI is oversold. Late short entries can be risky.",
    macdBull: "MACD histogram is positive, suggesting improving medium-term momentum.",
    macdBear: "MACD histogram is negative, suggesting weak medium-term momentum.",
    volume: (value: number) => `Volume has expanded to ${round(value, 2)}x average.`,
    support: "Price is near recent support, where swing buyers may defend.",
    resistance: "Price is near recent resistance, so breakout failure risk is elevated.",
    optionsBull: "Options positioning is modestly supportive of the swing long case.",
    optionsBear: "Options positioning is modestly supportive of the swing short case.",
    darkPoolProxy: "FINRA ATS dark-pool activity is elevated, so hidden-liquidity context may matter for swing interpretation.",
    noEdge: "No clear swing edge has been confirmed yet."
  }
} satisfies Record<AppLocale, Record<string, string | ((value: number) => string)>>;

export function analyzeSwingSignal({
  symbol,
  timeframe,
  candles,
  source,
  locale = "ko",
  now = new Date(),
  optionSentiment = null,
  shortFlow = null
}: AnalyzeSwingSignalInput): SignalResult {
  const t = copy[locale];
  const indicators = indicatorSnapshot(candles);
  const latest = candles.at(-1);
  const previous = candles.at(-2);
  const patterns = detectCandlestickPatterns(candles);
  const chartPatterns = detectChartPatterns(candles);
  const warnings: string[] = [t.analysisOnly as string];
  const reasons: string[] = [];

  if (!latest) {
    return {
      symbol: symbol.toUpperCase(),
      timeframe,
      horizon: "swing",
      bias: "NEUTRAL",
      confidence: 0,
      entryZone: null,
      invalidation: null,
      targets: [],
      riskReward: null,
      reasons: [t.noCandles as string],
      warnings,
      indicators,
      patterns,
      chartPatterns,
      optionsSentiment: optionSentiment,
      dataTimestamp: now.toISOString(),
      source
    };
  }

  if (candles.length < 120) {
    warnings.push(t.tooFewCandles as string);
  }

  const staleMinutes = minutesSinceLatestCandle(candles, now);
  if (isDataStale(candles, timeframe, now) && staleMinutes !== null) {
    warnings.push((t.stale as (minutes: number) => string)(Math.round(staleMinutes)));
  }

  const close = latest.close;
  const atr = indicators.atr14 ?? Math.max(latest.high - latest.low, close * 0.03);
  let score = 0;

  if (indicators.ema21 && indicators.ema50 && indicators.ema200) {
    if (close > indicators.ema21 && indicators.ema21 > indicators.ema50 && indicators.ema50 > indicators.ema200) {
      score += 2.1;
      reasons.push(t.trendBull as string);
    } else if (close < indicators.ema21 && indicators.ema21 < indicators.ema50 && indicators.ema50 < indicators.ema200) {
      score -= 2.1;
      reasons.push(t.trendBear as string);
    }
  }

  if (indicators.sma50) {
    if (close >= indicators.sma50) {
      score += 0.9;
      reasons.push(t.aboveSma50 as string);
    } else {
      score -= 0.9;
      reasons.push(t.belowSma50 as string);
    }
  }

  if (indicators.ema200) {
    if (close >= indicators.ema200) {
      score += 0.8;
      reasons.push(t.aboveEma200 as string);
    } else {
      score -= 0.8;
      reasons.push(t.belowEma200 as string);
    }
  }

  if (indicators.rsi14 !== null) {
    if (indicators.rsi14 >= 50 && indicators.rsi14 <= 66) {
      score += 0.8;
      reasons.push(t.rsiBull as string);
    } else if (indicators.rsi14 <= 45 && indicators.rsi14 >= 32) {
      score -= 0.8;
      reasons.push(t.rsiBear as string);
    } else if (indicators.rsi14 > 72) {
      score += 0.15;
      warnings.push(t.rsiHot as string);
    } else if (indicators.rsi14 < 28) {
      score -= 0.15;
      warnings.push(t.rsiCold as string);
    }
  }

  if (indicators.macdHistogram !== null) {
    if (indicators.macdHistogram > 0) {
      score += 0.75;
      reasons.push(t.macdBull as string);
    } else if (indicators.macdHistogram < 0) {
      score -= 0.75;
      reasons.push(t.macdBear as string);
    }
  }

  if (previous && indicators.relativeVolume !== null && indicators.relativeVolume >= 1.1) {
    const direction = latest.close >= previous.close ? 1 : -1;
    score += 0.55 * direction;
    reasons.push((t.volume as (value: number) => string)(indicators.relativeVolume));
  }

  if (indicators.support && close - indicators.support <= atr * 0.9) {
    score += 0.4;
    reasons.push(t.support as string);
  }

  if (indicators.resistance && indicators.resistance - close <= atr * 0.9) {
    score -= 0.4;
    reasons.push(t.resistance as string);
  }

  if (optionSentiment?.bias === "LONG") {
    score += 0.45;
    reasons.push(t.optionsBull as string);
  } else if (optionSentiment?.bias === "SHORT") {
    score -= 0.45;
    reasons.push(t.optionsBear as string);
  }

  if ((shortFlow?.darkPool?.atsToShortVolumeRatio ?? 0) >= 8) {
    warnings.push(t.darkPoolProxy as string);
  }

  for (const pattern of patterns) {
    const weight = pattern.strength === "HIGH" ? 0.55 : 0.28;
    score += pattern.direction === "BULLISH" ? weight : -weight;
    reasons.push(locale === "en" ? `${pattern.label.en} candle pattern detected.` : `${pattern.label.ko} 캔들 패턴이 감지됐습니다.`);
  }

  for (const pattern of chartPatterns) {
    const weight = pattern.strength === "HIGH" ? 1 : pattern.strength === "MEDIUM" ? 0.65 : 0.35;
    score += pattern.direction === "BULLISH" ? weight : -weight;
    reasons.push(locale === "en" ? `${pattern.label.en} chart pattern detected.` : `${pattern.label.ko} 차트 패턴이 감지됐습니다.`);
  }

  const bias = score >= 2.6 ? "LONG" : score <= -2.6 ? "SHORT" : "NEUTRAL";
  const confidence = confidenceFromScore(score, warnings.length, bias);
  const plan = buildSwingTradePlan(bias, close, atr, indicators.support, indicators.resistance);

  return {
    symbol: symbol.toUpperCase(),
    timeframe,
    horizon: "swing",
    bias,
    confidence,
    entryZone: plan.entryZone,
    invalidation: plan.invalidation,
    targets: plan.targets,
    riskReward: plan.riskReward,
    reasons: reasons.length > 0 ? reasons : [t.noEdge as string],
    warnings,
    indicators: Object.fromEntries(
      Object.entries(indicators).map(([key, value]) => [key, typeof value === "number" ? round(value, key === "relativeVolume" ? 2 : 4) : value])
    ) as SignalResult["indicators"],
    patterns,
    chartPatterns,
    optionsSentiment: optionSentiment,
    dataTimestamp: latest.time,
    source
  };
}

function confidenceFromScore(score: number, warningCount: number, bias: SignalBias): number {
  if (bias === "NEUTRAL") {
    return clamp(Math.round(36 + Math.abs(score) * 4), 20, 58);
  }

  return clamp(Math.round(50 + Math.abs(score) * 8 - warningCount * 3), 44, 86);
}

function buildSwingTradePlan(
  bias: SignalBias,
  close: number,
  atr: number,
  support: number | null,
  resistance: number | null
): Pick<SignalResult, "entryZone" | "invalidation" | "targets" | "riskReward"> {
  if (bias === "NEUTRAL") {
    return { entryZone: null, invalidation: null, targets: [], riskReward: null };
  }

  if (bias === "LONG") {
    const invalidation = support ? Math.min(close - atr * 1.1, support - atr * 0.2) : close - atr * 1.35;
    const risk = Math.max(close - invalidation, atr * 0.75);
    return {
      entryZone: { low: round(close - atr * 0.45), high: round(close + atr * 0.15) },
      invalidation: round(invalidation),
      targets: [
        { label: "1R", price: round(close + risk) },
        { label: "2R", price: round(close + risk * 2) }
      ],
      riskReward: 2
    };
  }

  const invalidation = resistance ? Math.max(close + atr * 1.1, resistance + atr * 0.2) : close + atr * 1.35;
  const risk = Math.max(invalidation - close, atr * 0.75);
  return {
    entryZone: { low: round(close - atr * 0.15), high: round(close + atr * 0.45) },
    invalidation: round(invalidation),
    targets: [
      { label: "1R", price: round(close - risk) },
      { label: "2R", price: round(close - risk * 2) }
    ],
    riskReward: 2
  };
}
