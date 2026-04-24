import { clamp, indicatorSnapshot, round } from "../indicators";
import type {
  AppLocale,
  Candle,
  IndicatorSnapshot,
  OptionSentimentSnapshot,
  ShortFlowSnapshot,
  SignalBias,
  SignalResult,
  Timeframe,
  TradingHorizon
} from "../types";
import { detectChartPatterns } from "./chart-patterns";
import { detectCandlestickPatterns } from "./patterns";
import { isDataStale, minutesSinceLatestCandle } from "./staleness";

interface AnalyzeSignalInput {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  source: string;
  locale?: AppLocale;
  now?: Date;
  horizon?: TradingHorizon;
  optionSentiment?: OptionSentimentSnapshot | null;
  shortFlow?: ShortFlowSnapshot | null;
}

const signalCopy = {
  ko: {
    analysisOnly:
      "무료 공개 데이터를 기반으로 한 분석 보조입니다. 실시간 주문 체결 데이터가 아니며 주문 기능도 제공하지 않습니다.",
    noCandles: "분석에 사용할 캔들 데이터가 없습니다.",
    tooFewCandles: "캔들 수가 적어 EMA50과 단기 구조 판단의 신뢰도가 제한됩니다.",
    stale: (minutes: number) => `마지막 캔들이 약 ${minutes}분 전 데이터입니다.`,
    emaBull: "단기 EMA 배열이 상승 쪽으로 정렬돼 있습니다.",
    emaBear: "단기 EMA 배열이 하락 쪽으로 정렬돼 있습니다.",
    emaMixed: "단기 EMA 배열이 섞여 있어 방향성이 약합니다.",
    aboveEma50: "현재가가 EMA50 위에 있어 추세 유지 가능성이 있습니다.",
    belowEma50: "현재가가 EMA50 아래에 있어 매도 압력이 더 강할 수 있습니다.",
    aboveVwap: "가격이 VWAP 위에 있어 장중 매수 우위가 감지됩니다.",
    belowVwap: "가격이 VWAP 아래에 있어 장중 매도 우위가 감지됩니다.",
    rsiBull: "RSI가 과열 전의 상승 모멘텀 구간입니다.",
    rsiBear: "RSI가 약세 모멘텀 구간입니다.",
    rsiOverbought: "RSI 과열권입니다. 추격 롱 진입 리스크가 큽니다.",
    rsiOversold: "RSI 과매도권입니다. 늦은 숏 추격 리스크가 큽니다.",
    macdBull: "MACD 히스토그램이 양수라 모멘텀 개선 흐름을 시사합니다.",
    macdBear: "MACD 히스토그램이 음수라 모멘텀 약화 흐름을 시사합니다.",
    relVolume: (value: number) => `상대 거래량이 ${round(value, 2)}배로 확대됐습니다.`,
    nearSupport: "가격이 최근 지지 부근에서 반응 중입니다.",
    nearResistance: "가격이 최근 저항 부근이라 돌파 실패 리스크가 있습니다.",
    optionsBull: "근월물 옵션 흐름이 콜 우위입니다.",
    optionsBear: "근월물 옵션 흐름이 풋 우위입니다.",
    darkPoolProxy: "FINRA ATS 다크풀 거래량이 높아 숨은 유동성 활동도 함께 참고해야 합니다.",
    noEdge: "아직 뚜렷한 방향 우위가 확인되지 않았습니다."
  },
  en: {
    analysisOnly:
      "Analysis-only output based on free public data. It is not live order-book or execution data and does not place orders.",
    noCandles: "No candle data is available for analysis.",
    tooFewCandles: "The candle history is short, so EMA50 and intraday-structure confidence is limited.",
    stale: (minutes: number) => `The latest candle is about ${minutes} minutes old.`,
    emaBull: "Short-term EMA alignment is bullish.",
    emaBear: "Short-term EMA alignment is bearish.",
    emaMixed: "Short-term EMA alignment is mixed, so direction is weak.",
    aboveEma50: "Price is holding above EMA50.",
    belowEma50: "Price is below EMA50, which can indicate stronger sell pressure.",
    aboveVwap: "Price is above VWAP, suggesting intraday buyer control.",
    belowVwap: "Price is below VWAP, suggesting intraday seller control.",
    rsiBull: "RSI is in a bullish momentum zone before clear overextension.",
    rsiBear: "RSI is in a weak momentum zone.",
    rsiOverbought: "RSI is overbought. Chasing long entries carries elevated risk.",
    rsiOversold: "RSI is oversold. Chasing short entries carries elevated risk.",
    macdBull: "MACD histogram is positive, suggesting improving momentum.",
    macdBear: "MACD histogram is negative, suggesting weakening momentum.",
    relVolume: (value: number) => `Relative volume has expanded to ${round(value, 2)}x.`,
    nearSupport: "Price is reacting near recent support.",
    nearResistance: "Price is near recent resistance, so breakout-failure risk is elevated.",
    optionsBull: "Front-expiry options flow is tilted toward calls.",
    optionsBear: "Front-expiry options flow is tilted toward puts.",
    darkPoolProxy: "FINRA ATS dark-pool activity is elevated, so hidden-liquidity context may matter.",
    noEdge: "No clear directional edge has been confirmed yet."
  }
} satisfies Record<AppLocale, Record<string, string | ((value: number) => string)>>;

export function analyzeSignal({
  symbol,
  timeframe,
  candles,
  source,
  locale = "ko",
  now = new Date(),
  horizon = "scalp",
  optionSentiment = null,
  shortFlow = null
}: AnalyzeSignalInput): SignalResult {
  const copy = signalCopy[locale];
  const indicators = indicatorSnapshot(candles);
  const latest = candles.at(-1);
  const previous = candles.at(-2);
  const patterns = detectCandlestickPatterns(candles);
  const chartPatterns = detectChartPatterns(candles);
  const reasons: string[] = [];
  const warnings: string[] = [copy.analysisOnly as string];

  if (!latest) {
    return {
      symbol,
      timeframe,
      horizon,
      bias: "NEUTRAL",
      confidence: 0,
      entryZone: null,
      invalidation: null,
      targets: [],
      riskReward: null,
      reasons: [copy.noCandles as string],
      warnings,
      indicators,
      patterns,
      chartPatterns,
      optionsSentiment: optionSentiment,
      dataTimestamp: now.toISOString(),
      source
    };
  }

  if (candles.length < 60) {
    warnings.push(copy.tooFewCandles as string);
  }

  const staleMinutes = minutesSinceLatestCandle(candles, now);
  if (isDataStale(candles, timeframe, now) && staleMinutes !== null) {
    warnings.push((copy.stale as (minutes: number) => string)(Math.round(staleMinutes)));
  }

  let score = 0;
  const close = latest.close;
  const atr = indicators.atr14 ?? Math.max(latest.high - latest.low, close * 0.005);

  if (indicators.ema9 && indicators.ema21) {
    if (close > indicators.ema9 && indicators.ema9 > indicators.ema21) {
      score += 1.4;
      reasons.push(copy.emaBull as string);
    } else if (close < indicators.ema9 && indicators.ema9 < indicators.ema21) {
      score -= 1.4;
      reasons.push(copy.emaBear as string);
    } else {
      reasons.push(copy.emaMixed as string);
    }
  }

  if (indicators.ema50) {
    if (close > indicators.ema50) {
      score += 0.8;
      reasons.push(copy.aboveEma50 as string);
    } else {
      score -= 0.8;
      reasons.push(copy.belowEma50 as string);
    }
  }

  if (indicators.ema200) {
    score += close > indicators.ema200 ? 0.6 : -0.6;
  }

  if (indicators.vwap) {
    if (close > indicators.vwap) {
      score += 0.9;
      reasons.push(copy.aboveVwap as string);
    } else {
      score -= 0.9;
      reasons.push(copy.belowVwap as string);
    }
  }

  if (indicators.rsi14 !== null) {
    if (indicators.rsi14 >= 52 && indicators.rsi14 <= 68) {
      score += 0.8;
      reasons.push(copy.rsiBull as string);
    } else if (indicators.rsi14 <= 48 && indicators.rsi14 >= 32) {
      score -= 0.8;
      reasons.push(copy.rsiBear as string);
    } else if (indicators.rsi14 > 72) {
      warnings.push(copy.rsiOverbought as string);
      score += 0.2;
    } else if (indicators.rsi14 < 28) {
      warnings.push(copy.rsiOversold as string);
      score -= 0.2;
    }
  }

  if (indicators.macdHistogram !== null) {
    if (indicators.macdHistogram > 0) {
      score += 0.7;
      reasons.push(copy.macdBull as string);
    } else if (indicators.macdHistogram < 0) {
      score -= 0.7;
      reasons.push(copy.macdBear as string);
    }
  }

  if (previous && indicators.relativeVolume !== null && indicators.relativeVolume > 1.2) {
    const direction = latest.close >= previous.close ? 1 : -1;
    score += 0.5 * direction;
    reasons.push((copy.relVolume as (value: number) => string)(indicators.relativeVolume));
  }

  if (indicators.support && close - indicators.support <= atr * 0.6) {
    score += 0.35;
    reasons.push(copy.nearSupport as string);
  }

  if (indicators.resistance && indicators.resistance - close <= atr * 0.6) {
    score -= 0.35;
    reasons.push(copy.nearResistance as string);
  }

  if (optionSentiment?.bias === "LONG") {
    score += 0.85;
    reasons.push(copy.optionsBull as string);
  } else if (optionSentiment?.bias === "SHORT") {
    score -= 0.85;
    reasons.push(copy.optionsBear as string);
  }

  if ((shortFlow?.darkPool?.atsToShortVolumeRatio ?? 0) >= 8) {
    warnings.push(copy.darkPoolProxy as string);
  }

  for (const pattern of patterns) {
    if (pattern.direction === "BULLISH") {
      score += pattern.strength === "HIGH" ? 0.7 : 0.35;
      reasons.push(locale === "en" ? `${pattern.label.en} pattern detected.` : `${pattern.label.ko} 패턴이 감지됐습니다.`);
    } else {
      score -= pattern.strength === "HIGH" ? 0.7 : 0.35;
      reasons.push(locale === "en" ? `${pattern.label.en} pattern detected.` : `${pattern.label.ko} 패턴이 감지됐습니다.`);
    }
  }

  for (const pattern of chartPatterns) {
    const weight = pattern.strength === "HIGH" ? 0.9 : pattern.strength === "MEDIUM" ? 0.55 : 0.3;
    score += pattern.direction === "BULLISH" ? weight : -weight;
    reasons.push(locale === "en" ? `${pattern.label.en} chart pattern detected.` : `${pattern.label.ko} 차트 패턴이 감지됐습니다.`);
  }

  const bias = score >= 2.2 ? "LONG" : score <= -2.2 ? "SHORT" : "NEUTRAL";
  const confidence = confidenceFromScore(score, warnings.length, bias);
  const tradePlan = buildTradePlan(bias, close, atr, indicators.support, indicators.resistance);

  return {
    symbol: symbol.toUpperCase(),
    timeframe,
    horizon,
    bias,
    confidence,
    entryZone: tradePlan.entryZone,
    invalidation: tradePlan.invalidation,
    targets: tradePlan.targets,
    riskReward: tradePlan.riskReward,
    reasons: reasons.length > 0 ? reasons : [copy.noEdge as string],
    warnings,
    indicators: roundIndicators(indicators),
    patterns,
    chartPatterns,
    optionsSentiment: optionSentiment,
    dataTimestamp: latest.time,
    source
  };
}

function confidenceFromScore(score: number, warningCount: number, bias: SignalBias): number {
  if (bias === "NEUTRAL") {
    return clamp(Math.round(35 + Math.abs(score) * 5), 20, 55);
  }

  return clamp(Math.round(52 + Math.abs(score) * 8 - warningCount * 3), 45, 88);
}

function buildTradePlan(
  bias: SignalBias,
  close: number,
  atr: number,
  support: number | null,
  resistance: number | null
): Pick<SignalResult, "entryZone" | "invalidation" | "targets" | "riskReward"> {
  if (bias === "NEUTRAL") {
    return {
      entryZone: null,
      invalidation: null,
      targets: [],
      riskReward: null
    };
  }

  if (bias === "LONG") {
    const invalidation = support ? Math.min(close - atr * 0.75, support - atr * 0.15) : close - atr;
    const risk = Math.max(close - invalidation, atr * 0.35);
    return {
      entryZone: {
        low: round(close - atr * 0.25),
        high: round(close + atr * 0.1)
      },
      invalidation: round(invalidation),
      targets: [
        { label: "1R", price: round(close + risk) },
        { label: "2R", price: round(close + risk * 2) }
      ],
      riskReward: 2
    };
  }

  const invalidation = resistance
    ? Math.max(close + atr * 0.75, resistance + atr * 0.15)
    : close + atr;
  const risk = Math.max(invalidation - close, atr * 0.35);
  return {
    entryZone: {
      low: round(close - atr * 0.1),
      high: round(close + atr * 0.25)
    },
    invalidation: round(invalidation),
    targets: [
      { label: "1R", price: round(close - risk) },
      { label: "2R", price: round(close - risk * 2) }
    ],
    riskReward: 2
  };
}

function roundIndicators(indicators: IndicatorSnapshot): IndicatorSnapshot {
  return Object.fromEntries(
    Object.entries(indicators).map(([key, value]) => [
      key,
      typeof value === "number" ? round(value, key === "relativeVolume" ? 2 : 4) : value
    ])
  ) as IndicatorSnapshot;
}
