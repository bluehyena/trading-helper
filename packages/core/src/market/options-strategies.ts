import { round } from "../indicators";
import type {
  OptionFlowContract,
  OptionSentimentSnapshot,
  OptionStrategyId,
  OptionStrategyLeg,
  OptionStrategyRecommendation,
  OptionVolatilityRegime,
  SignalBias
} from "../types";

interface StrategyBuildInput {
  underlyingPrice: number | null;
  expiration: string | null;
  calls: OptionFlowContract[];
  puts: OptionFlowContract[];
  bias: SignalBias;
  volatilityRegime: OptionVolatilityRegime;
}

type StrategyFactory = (input: StrategyBuildInput) => OptionStrategyRecommendation | null;

const CONTRACT_MULTIPLIER = 100;

const strategyTitles: Record<OptionStrategyId, OptionStrategyRecommendation["title"]> = {
  bull_call_spread: { ko: "불 콜 스프레드", en: "Bull Call Spread" },
  bear_put_spread: { ko: "베어 풋 스프레드", en: "Bear Put Spread" },
  bull_put_spread: { ko: "불 풋 스프레드", en: "Bull Put Spread" },
  bear_call_spread: { ko: "베어 콜 스프레드", en: "Bear Call Spread" },
  long_straddle: { ko: "롱 스트래들", en: "Long Straddle" },
  short_straddle: { ko: "숏 스트래들", en: "Short Straddle" },
  long_strangle: { ko: "롱 스트랭글", en: "Long Strangle" },
  short_strangle: { ko: "숏 스트랭글", en: "Short Strangle" },
  iron_condor: { ko: "아이언 콘도르", en: "Iron Condor" },
  butterfly_spread: { ko: "버터플라이 스프레드", en: "Butterfly Spread" },
  covered_call: { ko: "커버드 콜", en: "Covered Call" },
  protective_put: { ko: "프로텍티브 풋", en: "Protective Put" }
};

const riskLevels: Record<OptionStrategyId, OptionStrategyRecommendation["riskLevel"]> = {
  bull_call_spread: "MEDIUM",
  bear_put_spread: "MEDIUM",
  bull_put_spread: "MEDIUM",
  bear_call_spread: "MEDIUM",
  long_straddle: "HIGH",
  short_straddle: "HIGH",
  long_strangle: "HIGH",
  short_strangle: "HIGH",
  iron_condor: "MEDIUM",
  butterfly_spread: "LOW",
  covered_call: "MEDIUM",
  protective_put: "LOW"
};

const factoryOrder: OptionStrategyId[] = [
  "bull_call_spread",
  "bear_put_spread",
  "bull_put_spread",
  "bear_call_spread",
  "long_straddle",
  "short_straddle",
  "long_strangle",
  "short_strangle",
  "iron_condor",
  "butterfly_spread",
  "covered_call",
  "protective_put"
];

const factories: Record<OptionStrategyId, StrategyFactory> = {
  bull_call_spread: buildBullCallSpread,
  bear_put_spread: buildBearPutSpread,
  bull_put_spread: buildBullPutSpread,
  bear_call_spread: buildBearCallSpread,
  long_straddle: buildLongStraddle,
  short_straddle: buildShortStraddle,
  long_strangle: buildLongStrangle,
  short_strangle: buildShortStrangle,
  iron_condor: buildIronCondor,
  butterfly_spread: buildButterflySpread,
  covered_call: buildCoveredCall,
  protective_put: buildProtectivePut
};

export function classifyOptionVolatilityRegime(
  atmCallImpliedVolatility: number | null | undefined,
  atmPutImpliedVolatility: number | null | undefined
): OptionVolatilityRegime {
  const values = [atmCallImpliedVolatility, atmPutImpliedVolatility].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );

  if (values.length === 0) {
    return "MEDIUM";
  }

  const averageIv = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (averageIv >= 0.45) {
    return "HIGH";
  }
  if (averageIv <= 0.3) {
    return "LOW";
  }
  return "MEDIUM";
}

export function buildOptionStrategyRecommendations(input: StrategyBuildInput): OptionStrategyRecommendation[] {
  return factoryOrder
    .map((id) => factories[id](input))
    .filter((strategy): strategy is OptionStrategyRecommendation => strategy !== null)
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, 4);
}

function buildBullCallSpread(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  const longCall = pickAtTheMoney(input.calls, input.underlyingPrice);
  const shortCall = pickAbove(input.calls, longCall?.strike ?? null);
  if (!longCall || !shortCall) {
    return null;
  }

  const debit = nonNegative((premium(longCall) ?? 0) - (premium(shortCall) ?? 0));
  const width = shortCall.strike - longCall.strike;
  const maxProfit = width > 0 ? Math.max(width - debit, 0) * CONTRACT_MULTIPLIER : null;

  return makeStrategy({
    id: "bull_call_spread",
    input,
    fitScore: fitScore("bull_call_spread", input.bias, input.volatilityRegime),
    summary: {
      ko: "강세지만 변동성이 너무 높지 않을 때 debit으로 상방을 노리는 스프레드입니다.",
      en: "A debit spread for bullish setups when implied volatility is not excessively high."
    },
    maxProfit,
    maxProfitSummary: {
      ko: maxProfit === null ? "행사가 폭에 따라 제한됩니다." : "상단 행사가까지 가면 이익이 제한적으로 확정됩니다.",
      en: maxProfit === null ? "Profit is capped by the spread width." : "Profit is capped if price reaches the short strike."
    },
    maxLoss: debit * CONTRACT_MULTIPLIER,
    maxLossSummary: {
      ko: "순지불 프리미엄이 최대 손실입니다.",
      en: "The net debit paid is the maximum loss."
    },
    breakEvenPrices: [round(longCall.strike + debit)],
    estimatedBuyingPower: debit * CONTRACT_MULTIPLIER,
    estimatedBuyingPowerSummary: {
      ko: "대략 순지불 금액만큼의 자본이 필요합니다.",
      en: "Buying power is roughly the net debit paid."
    },
    legs: [
      makeLeg("BUY", longCall, {
        ko: "ATM 또는 약간 ITM 콜 매수",
        en: "Buy the ATM or slightly ITM call"
      }),
      makeLeg("SELL", shortCall, {
        ko: "상단 행사가 콜 매도",
        en: "Sell a higher-strike call"
      })
    ]
  });
}

function buildBearPutSpread(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  const longPut = pickAtTheMoney(input.puts, input.underlyingPrice);
  const shortPut = pickBelow(input.puts, longPut?.strike ?? null);
  if (!longPut || !shortPut) {
    return null;
  }

  const debit = nonNegative((premium(longPut) ?? 0) - (premium(shortPut) ?? 0));
  const width = longPut.strike - shortPut.strike;
  const maxProfit = width > 0 ? Math.max(width - debit, 0) * CONTRACT_MULTIPLIER : null;

  return makeStrategy({
    id: "bear_put_spread",
    input,
    fitScore: fitScore("bear_put_spread", input.bias, input.volatilityRegime),
    summary: {
      ko: "약세지만 premium을 통제하고 싶을 때 쓰는 debit 풋 스프레드입니다.",
      en: "A bearish debit put spread that keeps premium cost more controlled than a naked put."
    },
    maxProfit,
    maxProfitSummary: {
      ko: maxProfit === null ? "행사가 폭에 따라 제한됩니다." : "하단 행사가까지 가면 이익이 제한적으로 확정됩니다.",
      en: maxProfit === null ? "Profit is capped by the spread width." : "Profit is capped if price reaches the lower strike."
    },
    maxLoss: debit * CONTRACT_MULTIPLIER,
    maxLossSummary: {
      ko: "순지불 프리미엄이 최대 손실입니다.",
      en: "The net debit paid is the maximum loss."
    },
    breakEvenPrices: [round(longPut.strike - debit)],
    estimatedBuyingPower: debit * CONTRACT_MULTIPLIER,
    estimatedBuyingPowerSummary: {
      ko: "대략 순지불 금액만큼의 자본이 필요합니다.",
      en: "Buying power is roughly the net debit paid."
    },
    legs: [
      makeLeg("BUY", longPut, {
        ko: "ATM 또는 약간 ITM 풋 매수",
        en: "Buy the ATM or slightly ITM put"
      }),
      makeLeg("SELL", shortPut, {
        ko: "더 낮은 행사가 풋 매도",
        en: "Sell a lower-strike put"
      })
    ]
  });
}

function buildBullPutSpread(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  const shortPut = pickBelow(input.puts, input.underlyingPrice);
  const longPut = pickBelow(input.puts, shortPut?.strike ?? null);
  if (!shortPut || !longPut) {
    return null;
  }

  const credit = nonNegative((premium(shortPut) ?? 0) - (premium(longPut) ?? 0));
  const width = shortPut.strike - longPut.strike;

  return makeStrategy({
    id: "bull_put_spread",
    input,
    fitScore: fitScore("bull_put_spread", input.bias, input.volatilityRegime),
    summary: {
      ko: "강세 또는 버팀 시나리오에서 credit을 받는 bullish put spread입니다.",
      en: "A bullish credit spread that benefits if price stays above the short put."
    },
    maxProfit: credit * CONTRACT_MULTIPLIER,
    maxProfitSummary: {
      ko: "받은 순프리미엄이 최대 이익입니다.",
      en: "The net credit received is the maximum profit."
    },
    maxLoss: Math.max(width - credit, 0) * CONTRACT_MULTIPLIER,
    maxLossSummary: {
      ko: "스프레드 폭에서 순크레딧을 뺀 값이 최대 손실입니다.",
      en: "Maximum loss is spread width minus net credit."
    },
    breakEvenPrices: [round(shortPut.strike - credit)],
    estimatedBuyingPower: Math.max(width - credit, 0) * CONTRACT_MULTIPLIER,
    estimatedBuyingPowerSummary: {
      ko: "대략 최대 손실에 해당하는 증거금이 필요합니다.",
      en: "Buying power is roughly the defined-risk max loss."
    },
    legs: [
      makeLeg("SELL", shortPut, {
        ko: "기초자산 아래 OTM 풋 매도",
        en: "Sell an OTM put below spot"
      }),
      makeLeg("BUY", longPut, {
        ko: "더 낮은 행사가 풋 매수",
        en: "Buy a lower-strike put for protection"
      })
    ],
    warnings: [
      "If the stock falls hard, the spread can still reach its defined maximum loss."
    ]
  });
}

function buildBearCallSpread(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  const shortCall = pickAbove(input.calls, input.underlyingPrice);
  const longCall = pickAbove(input.calls, shortCall?.strike ?? null);
  if (!shortCall || !longCall) {
    return null;
  }

  const credit = nonNegative((premium(shortCall) ?? 0) - (premium(longCall) ?? 0));
  const width = longCall.strike - shortCall.strike;

  return makeStrategy({
    id: "bear_call_spread",
    input,
    fitScore: fitScore("bear_call_spread", input.bias, input.volatilityRegime),
    summary: {
      ko: "약세 또는 상단 막힘 시나리오에서 credit을 받는 bearish call spread입니다.",
      en: "A bearish credit spread that benefits if price stays below the short call."
    },
    maxProfit: credit * CONTRACT_MULTIPLIER,
    maxProfitSummary: {
      ko: "받은 순프리미엄이 최대 이익입니다.",
      en: "The net credit received is the maximum profit."
    },
    maxLoss: Math.max(width - credit, 0) * CONTRACT_MULTIPLIER,
    maxLossSummary: {
      ko: "스프레드 폭에서 순크레딧을 뺀 값이 최대 손실입니다.",
      en: "Maximum loss is spread width minus net credit."
    },
    breakEvenPrices: [round(shortCall.strike + credit)],
    estimatedBuyingPower: Math.max(width - credit, 0) * CONTRACT_MULTIPLIER,
    estimatedBuyingPowerSummary: {
      ko: "대략 최대 손실에 해당하는 증거금이 필요합니다.",
      en: "Buying power is roughly the defined-risk max loss."
    },
    legs: [
      makeLeg("SELL", shortCall, {
        ko: "기초자산 위 OTM 콜 매도",
        en: "Sell an OTM call above spot"
      }),
      makeLeg("BUY", longCall, {
        ko: "더 높은 행사가 콜 매수",
        en: "Buy a higher-strike call for protection"
      })
    ],
    warnings: [
      "A squeeze higher can still push this defined-risk spread to max loss."
    ]
  });
}

function buildLongStraddle(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  const longCall = pickAtTheMoney(input.calls, input.underlyingPrice);
  const longPut = pickAtTheMoney(input.puts, input.underlyingPrice);
  if (!longCall || !longPut) {
    return null;
  }

  const debit = (premium(longCall) ?? 0) + (premium(longPut) ?? 0);
  const strike = average([longCall.strike, longPut.strike]);

  return makeStrategy({
    id: "long_straddle",
    input,
    fitScore: fitScore("long_straddle", input.bias, input.volatilityRegime),
    summary: {
      ko: "방향은 모르지만 큰 변동을 기대할 때 ATM 콜과 풋을 함께 매수합니다.",
      en: "Buy the ATM call and put together when you expect a large move but not a clear direction."
    },
    maxProfit: null,
    maxProfitSummary: {
      ko: "상승 또는 급락이 크게 나오면 이익 가능성이 열립니다.",
      en: "Profit can become very large if price makes a sharp move away from the center strike."
    },
    maxLoss: debit * CONTRACT_MULTIPLIER,
    maxLossSummary: {
      ko: "지불한 총 프리미엄이 최대 손실입니다.",
      en: "The total premium paid is the maximum loss."
    },
    breakEvenPrices: [round(strike - debit), round(strike + debit)],
    estimatedBuyingPower: debit * CONTRACT_MULTIPLIER,
    estimatedBuyingPowerSummary: {
      ko: "대략 총 프리미엄만큼의 자본이 필요합니다.",
      en: "Buying power is roughly the total debit paid."
    },
    legs: [
      makeLeg("BUY", longCall, {
        ko: "ATM 콜 매수",
        en: "Buy the ATM call"
      }),
      makeLeg("BUY", longPut, {
        ko: "ATM 풋 매수",
        en: "Buy the ATM put"
      })
    ]
  });
}

function buildShortStraddle(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  const shortCall = pickAtTheMoney(input.calls, input.underlyingPrice);
  const shortPut = pickAtTheMoney(input.puts, input.underlyingPrice);
  if (!shortCall || !shortPut) {
    return null;
  }

  const credit = (premium(shortCall) ?? 0) + (premium(shortPut) ?? 0);
  const strike = average([shortCall.strike, shortPut.strike]);

  return makeStrategy({
    id: "short_straddle",
    input,
    fitScore: fitScore("short_straddle", input.bias, input.volatilityRegime),
    summary: {
      ko: "중립 시나리오에서 프리미엄을 받지만, 방향성 급변에 매우 취약한 고위험 전략입니다.",
      en: "Collect premium in a neutral outlook, but this is a very high-risk strategy if price breaks out hard."
    },
    maxProfit: credit * CONTRACT_MULTIPLIER,
    maxProfitSummary: {
      ko: "받은 총 프리미엄이 최대 이익입니다.",
      en: "The total premium received is the maximum profit."
    },
    maxLoss: null,
    maxLossSummary: {
      ko: "상승은 사실상 무제한, 하락도 큰 손실 가능성이 있습니다.",
      en: "Upside loss is effectively unlimited and downside loss can also be very large."
    },
    breakEvenPrices: [round(strike - credit), round(strike + credit)],
    estimatedBuyingPower: null,
    estimatedBuyingPowerSummary: {
      ko: "브로커 증거금 규칙에 따라 크게 달라집니다.",
      en: "Margin is broker-dependent and can be substantial."
    },
    legs: [
      makeLeg("SELL", shortCall, {
        ko: "ATM 콜 매도",
        en: "Sell the ATM call"
      }),
      makeLeg("SELL", shortPut, {
        ko: "ATM 풋 매도",
        en: "Sell the ATM put"
      })
    ],
    warnings: [
      "Short straddles are advanced strategies and can carry very large losses."
    ]
  });
}

function buildLongStrangle(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  const longCall = pickAbove(input.calls, input.underlyingPrice);
  const longPut = pickBelow(input.puts, input.underlyingPrice);
  if (!longCall || !longPut) {
    return null;
  }

  const debit = (premium(longCall) ?? 0) + (premium(longPut) ?? 0);
  return makeStrategy({
    id: "long_strangle",
    input,
    fitScore: fitScore("long_strangle", input.bias, input.volatilityRegime),
    summary: {
      ko: "ATM보다 싼 premium으로 큰 변동을 노릴 때 쓰는 양방향 매수 전략입니다.",
      en: "A cheaper two-sided volatility play that buys an OTM call and OTM put."
    },
    maxProfit: null,
    maxProfitSummary: {
      ko: "큰 상하방 변동이 나오면 이익 여지가 커집니다.",
      en: "Profit can become large if price moves sharply beyond either wing."
    },
    maxLoss: debit * CONTRACT_MULTIPLIER,
    maxLossSummary: {
      ko: "지불한 총 프리미엄이 최대 손실입니다.",
      en: "The total premium paid is the maximum loss."
    },
    breakEvenPrices: [round(longPut.strike - debit), round(longCall.strike + debit)],
    estimatedBuyingPower: debit * CONTRACT_MULTIPLIER,
    estimatedBuyingPowerSummary: {
      ko: "대략 총 프리미엄만큼의 자본이 필요합니다.",
      en: "Buying power is roughly the total debit paid."
    },
    legs: [
      makeLeg("BUY", longCall, {
        ko: "OTM 콜 매수",
        en: "Buy the OTM call"
      }),
      makeLeg("BUY", longPut, {
        ko: "OTM 풋 매수",
        en: "Buy the OTM put"
      })
    ]
  });
}

function buildShortStrangle(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  const shortCall = pickAbove(input.calls, input.underlyingPrice);
  const shortPut = pickBelow(input.puts, input.underlyingPrice);
  if (!shortCall || !shortPut) {
    return null;
  }

  const credit = (premium(shortCall) ?? 0) + (premium(shortPut) ?? 0);
  return makeStrategy({
    id: "short_strangle",
    input,
    fitScore: fitScore("short_strangle", input.bias, input.volatilityRegime),
    summary: {
      ko: "중립이지만 ATR 대비 변동이 과하다고 볼 때 쓰는 고위험 프리미엄 수취 전략입니다.",
      en: "A high-risk premium-selling strategy for neutral views when implied volatility looks rich."
    },
    maxProfit: credit * CONTRACT_MULTIPLIER,
    maxProfitSummary: {
      ko: "받은 총 프리미엄이 최대 이익입니다.",
      en: "The total credit received is the maximum profit."
    },
    maxLoss: null,
    maxLossSummary: {
      ko: "상단은 사실상 무제한 손실, 하단도 큰 손실 가능성이 있습니다.",
      en: "Upside loss can be effectively unlimited and downside loss can still be large."
    },
    breakEvenPrices: [round(shortPut.strike - credit), round(shortCall.strike + credit)],
    estimatedBuyingPower: null,
    estimatedBuyingPowerSummary: {
      ko: "브로커 증거금 규칙에 따라 크게 달라집니다.",
      en: "Margin is broker-dependent and can be substantial."
    },
    legs: [
      makeLeg("SELL", shortCall, {
        ko: "OTM 콜 매도",
        en: "Sell the OTM call"
      }),
      makeLeg("SELL", shortPut, {
        ko: "OTM 풋 매도",
        en: "Sell the OTM put"
      })
    ],
    warnings: [
      "Short strangles are advanced strategies and can carry very large losses."
    ]
  });
}

function buildIronCondor(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  const shortPut = pickBelow(input.puts, input.underlyingPrice);
  const longPut = pickBelow(input.puts, shortPut?.strike ?? null);
  const shortCall = pickAbove(input.calls, input.underlyingPrice);
  const longCall = pickAbove(input.calls, shortCall?.strike ?? null);
  if (!shortPut || !longPut || !shortCall || !longCall) {
    return null;
  }

  const credit =
    (premium(shortPut) ?? 0) +
    (premium(shortCall) ?? 0) -
    (premium(longPut) ?? 0) -
    (premium(longCall) ?? 0);
  const putWidth = shortPut.strike - longPut.strike;
  const callWidth = longCall.strike - shortCall.strike;
  const width = Math.max(putWidth, callWidth);

  return makeStrategy({
    id: "iron_condor",
    input,
    fitScore: fitScore("iron_condor", input.bias, input.volatilityRegime),
    summary: {
      ko: "중립 저변동 시나리오에서 양쪽 외곽을 팔아 프리미엄을 받는 defined-risk 전략입니다.",
      en: "A defined-risk premium-selling strategy for neutral, lower-volatility range views."
    },
    maxProfit: Math.max(credit, 0) * CONTRACT_MULTIPLIER,
    maxProfitSummary: {
      ko: "받은 순크레딧이 최대 이익입니다.",
      en: "The net credit received is the maximum profit."
    },
    maxLoss: Math.max(width - credit, 0) * CONTRACT_MULTIPLIER,
    maxLossSummary: {
      ko: "한쪽 스프레드 폭에서 순크레딧을 뺀 값이 최대 손실입니다.",
      en: "Maximum loss is the widest side minus net credit."
    },
    breakEvenPrices: [round(shortPut.strike - credit), round(shortCall.strike + credit)],
    estimatedBuyingPower: Math.max(width - credit, 0) * CONTRACT_MULTIPLIER,
    estimatedBuyingPowerSummary: {
      ko: "대략 최대 손실에 해당하는 증거금이 필요합니다.",
      en: "Buying power is roughly the defined-risk max loss."
    },
    legs: [
      makeLeg("BUY", longPut, {
        ko: "하단 보호 풋 매수",
        en: "Buy the lower protective put"
      }),
      makeLeg("SELL", shortPut, {
        ko: "중간 하단 풋 매도",
        en: "Sell the nearer OTM put"
      }),
      makeLeg("SELL", shortCall, {
        ko: "중간 상단 콜 매도",
        en: "Sell the nearer OTM call"
      }),
      makeLeg("BUY", longCall, {
        ko: "상단 보호 콜 매수",
        en: "Buy the higher protective call"
      })
    ]
  });
}

function buildButterflySpread(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  const middle = pickAtTheMoney(input.calls, input.underlyingPrice);
  const lower = pickBelow(input.calls, middle?.strike ?? null);
  const upper = pickAbove(input.calls, middle?.strike ?? null);
  if (!lower || !middle || !upper) {
    return null;
  }

  const debit = nonNegative((premium(lower) ?? 0) + (premium(upper) ?? 0) - 2 * (premium(middle) ?? 0));
  const width = Math.min(middle.strike - lower.strike, upper.strike - middle.strike);
  const maxProfit = width > 0 ? Math.max(width - debit, 0) * CONTRACT_MULTIPLIER : null;

  return makeStrategy({
    id: "butterfly_spread",
    input,
    fitScore: fitScore("butterfly_spread", input.bias, input.volatilityRegime),
    summary: {
      ko: "특정 중심 가격 근처에서 만기되는 시나리오를 노리는 저변동 전략입니다.",
      en: "A lower-volatility strategy that targets expiry near a center strike."
    },
    maxProfit,
    maxProfitSummary: {
      ko: maxProfit === null ? "중심 행사가 근처에서 가장 유리합니다." : "가운데 행사가 부근에서 최대 이익이 나옵니다.",
      en: maxProfit === null ? "The best outcome is near the middle strike." : "Maximum profit occurs near the middle strike at expiry."
    },
    maxLoss: debit * CONTRACT_MULTIPLIER,
    maxLossSummary: {
      ko: "순지불 프리미엄이 최대 손실입니다.",
      en: "The net debit paid is the maximum loss."
    },
    breakEvenPrices: [round(lower.strike + debit), round(upper.strike - debit)],
    estimatedBuyingPower: debit * CONTRACT_MULTIPLIER,
    estimatedBuyingPowerSummary: {
      ko: "대략 순지불 금액만큼의 자본이 필요합니다.",
      en: "Buying power is roughly the net debit paid."
    },
    legs: [
      makeLeg("BUY", lower, {
        ko: "하단 콜 매수",
        en: "Buy the lower-strike call"
      }),
      {
        asset: "CALL",
        side: "SELL",
        quantity: 2,
        strike: middle.strike,
        expiration: middle.expiration,
        premium: roundNullable(premium(middle), 4),
        note: {
          ko: "가운데 콜 2개 매도",
          en: "Sell two middle-strike calls"
        }
      },
      makeLeg("BUY", upper, {
        ko: "상단 콜 매수",
        en: "Buy the higher-strike call"
      })
    ]
  });
}

function buildCoveredCall(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  if (input.underlyingPrice === null) {
    return null;
  }

  const shortCall = pickAbove(input.calls, input.underlyingPrice);
  if (!shortCall) {
    return null;
  }

  const credit = premium(shortCall) ?? 0;
  const upside = Math.max(shortCall.strike - input.underlyingPrice, 0);

  return makeStrategy({
    id: "covered_call",
    input,
    fitScore: fitScore("covered_call", input.bias, input.volatilityRegime),
    summary: {
      ko: "이미 주식을 100주 보유 중이라면 콜을 팔아 프리미엄을 받는 전략입니다.",
      en: "If you already own 100 shares, a covered call sells upside beyond the short strike in exchange for premium."
    },
    outlook: "HEDGE",
    maxProfit: (upside + credit) * CONTRACT_MULTIPLIER,
    maxProfitSummary: {
      ko: "상승 이익은 short call 행사가 부근에서 제한됩니다.",
      en: "Upside profit is capped around the short-call strike plus credit."
    },
    maxLoss: Math.max(input.underlyingPrice - credit, 0) * CONTRACT_MULTIPLIER,
    maxLossSummary: {
      ko: "주가 하락 리스크는 여전히 주식 보유만큼 큽니다.",
      en: "Downside stock risk still remains even after collecting premium."
    },
    breakEvenPrices: [round(input.underlyingPrice - credit)],
    estimatedBuyingPower: input.underlyingPrice * CONTRACT_MULTIPLIER,
    estimatedBuyingPowerSummary: {
      ko: "100주 보유 비용이 필요합니다.",
      en: "Requires the buying power needed to own 100 shares."
    },
    legs: [
      {
        asset: "STOCK",
        side: "BUY",
        quantity: 100,
        strike: null,
        expiration: null,
        premium: input.underlyingPrice,
        note: {
          ko: "기초자산 100주 보유",
          en: "Own 100 shares of stock"
        }
      },
      makeLeg("SELL", shortCall, {
        ko: "기초자산 위 OTM 콜 매도",
        en: "Sell an OTM call against the shares"
      })
    ],
    warnings: [
      "This strategy assumes the account already holds or can purchase 100 shares."
    ]
  });
}

function buildProtectivePut(input: StrategyBuildInput): OptionStrategyRecommendation | null {
  if (input.underlyingPrice === null) {
    return null;
  }

  const longPut = pickBelow(input.puts, input.underlyingPrice) ?? pickAtTheMoney(input.puts, input.underlyingPrice);
  if (!longPut) {
    return null;
  }

  const putPremium = premium(longPut) ?? 0;

  return makeStrategy({
    id: "protective_put",
    input,
    fitScore: fitScore("protective_put", input.bias, input.volatilityRegime),
    summary: {
      ko: "주식 100주를 보유하면서 downside floor를 만들고 싶을 때 쓰는 헤지 전략입니다.",
      en: "A hedge for long stock positions that buys a put to create a downside floor."
    },
    outlook: "HEDGE",
    maxProfit: null,
    maxProfitSummary: {
      ko: "상승은 주식 보유만큼 열려 있지만 풋 premium이 성과를 깎습니다.",
      en: "Upside remains open like long stock, reduced by the put premium paid."
    },
    maxLoss: Math.max(input.underlyingPrice - longPut.strike + putPremium, 0) * CONTRACT_MULTIPLIER,
    maxLossSummary: {
      ko: "대략 주가 진입가와 풋 strike 차이 + premium이 최대 손실입니다.",
      en: "Maximum loss is roughly stock entry minus put strike, plus the put premium."
    },
    breakEvenPrices: [round(input.underlyingPrice + putPremium)],
    estimatedBuyingPower: (input.underlyingPrice + putPremium) * CONTRACT_MULTIPLIER,
    estimatedBuyingPowerSummary: {
      ko: "100주 보유 비용과 풋 premium이 필요합니다.",
      en: "Requires buying power for 100 shares plus the put premium."
    },
    legs: [
      {
        asset: "STOCK",
        side: "BUY",
        quantity: 100,
        strike: null,
        expiration: null,
        premium: input.underlyingPrice,
        note: {
          ko: "기초자산 100주 보유",
          en: "Own 100 shares of stock"
        }
      },
      makeLeg("BUY", longPut, {
        ko: "하방 보호용 풋 매수",
        en: "Buy a protective put"
      })
    ],
    warnings: [
      "This strategy assumes the account already holds or can purchase 100 shares."
    ]
  });
}

function makeStrategy({
  id,
  input,
  fitScore,
  summary,
  maxProfit,
  maxProfitSummary,
  maxLoss,
  maxLossSummary,
  breakEvenPrices,
  estimatedBuyingPower,
  estimatedBuyingPowerSummary,
  legs,
  warnings = [],
  outlook
}: {
  id: OptionStrategyId;
  input: StrategyBuildInput;
  fitScore: number;
  summary: OptionStrategyRecommendation["summary"];
  maxProfit: number | null;
  maxProfitSummary: OptionStrategyRecommendation["maxProfitSummary"];
  maxLoss: number | null;
  maxLossSummary: OptionStrategyRecommendation["maxLossSummary"];
  breakEvenPrices: number[];
  estimatedBuyingPower: number | null;
  estimatedBuyingPowerSummary: OptionStrategyRecommendation["estimatedBuyingPowerSummary"];
  legs: OptionStrategyLeg[];
  warnings?: string[];
  outlook?: OptionStrategyRecommendation["outlook"];
}): OptionStrategyRecommendation {
  return {
    id,
    title: strategyTitles[id],
    summary,
    outlook: outlook ?? input.bias,
    volatilityRegime: input.volatilityRegime,
    riskLevel: riskLevels[id],
    fitScore,
    maxProfit: roundNullable(maxProfit, 2),
    maxProfitSummary,
    maxLoss: roundNullable(maxLoss, 2),
    maxLossSummary,
    breakEvenPrices: breakEvenPrices.filter((price) => Number.isFinite(price)).map((price) => round(price, 2)),
    estimatedBuyingPower: roundNullable(estimatedBuyingPower, 2),
    estimatedBuyingPowerSummary,
    legs,
    warnings: [
      "Assumes one standard U.S. equity option contract controls 100 shares.",
      ...warnings
    ]
  };
}

function fitScore(id: OptionStrategyId, bias: SignalBias, volatilityRegime: OptionVolatilityRegime): number {
  const table: Record<OptionStrategyId, Record<SignalBias, Record<OptionVolatilityRegime, number>>> = {
    bull_call_spread: {
      LONG: { LOW: 93, MEDIUM: 84, HIGH: 70 },
      SHORT: { LOW: 24, MEDIUM: 22, HIGH: 20 },
      NEUTRAL: { LOW: 35, MEDIUM: 30, HIGH: 25 }
    },
    bear_put_spread: {
      LONG: { LOW: 22, MEDIUM: 20, HIGH: 18 },
      SHORT: { LOW: 93, MEDIUM: 84, HIGH: 72 },
      NEUTRAL: { LOW: 36, MEDIUM: 31, HIGH: 26 }
    },
    bull_put_spread: {
      LONG: { LOW: 67, MEDIUM: 79, HIGH: 86 },
      SHORT: { LOW: 20, MEDIUM: 18, HIGH: 16 },
      NEUTRAL: { LOW: 44, MEDIUM: 48, HIGH: 42 }
    },
    bear_call_spread: {
      LONG: { LOW: 20, MEDIUM: 18, HIGH: 16 },
      SHORT: { LOW: 66, MEDIUM: 78, HIGH: 86 },
      NEUTRAL: { LOW: 43, MEDIUM: 47, HIGH: 41 }
    },
    long_straddle: {
      LONG: { LOW: 34, MEDIUM: 46, HIGH: 60 },
      SHORT: { LOW: 34, MEDIUM: 46, HIGH: 60 },
      NEUTRAL: { LOW: 45, MEDIUM: 76, HIGH: 93 }
    },
    short_straddle: {
      LONG: { LOW: 18, MEDIUM: 16, HIGH: 12 },
      SHORT: { LOW: 18, MEDIUM: 16, HIGH: 12 },
      NEUTRAL: { LOW: 72, MEDIUM: 60, HIGH: 28 }
    },
    long_strangle: {
      LONG: { LOW: 30, MEDIUM: 40, HIGH: 55 },
      SHORT: { LOW: 30, MEDIUM: 40, HIGH: 55 },
      NEUTRAL: { LOW: 42, MEDIUM: 73, HIGH: 90 }
    },
    short_strangle: {
      LONG: { LOW: 20, MEDIUM: 17, HIGH: 12 },
      SHORT: { LOW: 20, MEDIUM: 17, HIGH: 12 },
      NEUTRAL: { LOW: 79, MEDIUM: 63, HIGH: 26 }
    },
    iron_condor: {
      LONG: { LOW: 24, MEDIUM: 26, HIGH: 15 },
      SHORT: { LOW: 24, MEDIUM: 26, HIGH: 15 },
      NEUTRAL: { LOW: 91, MEDIUM: 81, HIGH: 46 }
    },
    butterfly_spread: {
      LONG: { LOW: 30, MEDIUM: 34, HIGH: 22 },
      SHORT: { LOW: 30, MEDIUM: 34, HIGH: 22 },
      NEUTRAL: { LOW: 86, MEDIUM: 78, HIGH: 52 }
    },
    covered_call: {
      LONG: { LOW: 58, MEDIUM: 54, HIGH: 42 },
      SHORT: { LOW: 16, MEDIUM: 14, HIGH: 12 },
      NEUTRAL: { LOW: 40, MEDIUM: 38, HIGH: 32 }
    },
    protective_put: {
      LONG: { LOW: 40, MEDIUM: 52, HIGH: 68 },
      SHORT: { LOW: 12, MEDIUM: 14, HIGH: 18 },
      NEUTRAL: { LOW: 28, MEDIUM: 34, HIGH: 42 }
    }
  };

  return table[id][bias][volatilityRegime];
}

function makeLeg(
  side: OptionStrategyLeg["side"],
  contract: OptionFlowContract,
  note: OptionStrategyLeg["note"]
): OptionStrategyLeg {
  return {
    asset: contract.side,
    side,
    quantity: 1,
    strike: contract.strike,
    expiration: contract.expiration,
    premium: roundNullable(premium(contract), 4),
    note
  };
}

function pickAtTheMoney(contracts: OptionFlowContract[], underlyingPrice: number | null): OptionFlowContract | null {
  if (contracts.length === 0) {
    return null;
  }

  if (underlyingPrice === null) {
    return contracts[0] ?? null;
  }

  return [...contracts].sort((left, right) => distance(left, underlyingPrice) - distance(right, underlyingPrice))[0] ?? null;
}

function pickAbove(contracts: OptionFlowContract[], anchorStrike: number | null): OptionFlowContract | null {
  if (anchorStrike === null) {
    return null;
  }

  return (
    [...contracts]
      .filter((contract) => contract.strike > anchorStrike)
      .sort((left, right) => left.strike - right.strike)[0] ?? null
  );
}

function pickBelow(contracts: OptionFlowContract[], anchorStrike: number | null): OptionFlowContract | null {
  if (anchorStrike === null) {
    return null;
  }

  return (
    [...contracts]
      .filter((contract) => contract.strike < anchorStrike)
      .sort((left, right) => right.strike - left.strike)[0] ?? null
  );
}

function distance(contract: OptionFlowContract, underlyingPrice: number): number {
  return Math.abs(contract.strike - underlyingPrice);
}

function premium(contract: OptionFlowContract | null): number | null {
  if (!contract) {
    return null;
  }

  return typeof contract.lastPrice === "number" && Number.isFinite(contract.lastPrice) ? contract.lastPrice : null;
}

function roundNullable(value: number | null | undefined, digits: number): number | null {
  return typeof value === "number" && Number.isFinite(value) ? round(value, digits) : null;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function nonNegative(value: number): number {
  return Math.max(value, 0);
}

export function summarizeVolatilityRegime(regime: OptionVolatilityRegime): OptionSentimentSnapshot["warnings"][number] {
  if (regime === "HIGH") {
    return "Implied volatility is elevated, so premium-buying strategies need larger moves and premium-selling strategies need disciplined risk control.";
  }
  if (regime === "LOW") {
    return "Implied volatility is relatively contained, so defined-risk spreads and range structures may be easier to price.";
  }
  return "Implied volatility is in a middle regime, so strategy selection should lean more on directional bias and event risk.";
}
