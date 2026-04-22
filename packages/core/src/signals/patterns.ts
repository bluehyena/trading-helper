import type { Candle, PatternSignal } from "../types";

type PatternDefinition = Omit<PatternSignal, "strength">;

const definitions = {
  bullish_engulfing: {
    id: "bullish_engulfing",
    direction: "BULLISH",
    label: { ko: "상승 장악형", en: "Bullish Engulfing" },
    description: {
      ko: "이전 음봉을 강한 양봉이 감싸며 매수 반전을 시사합니다.",
      en: "A strong bullish candle engulfs the prior bearish body, suggesting a buyer reversal."
    }
  },
  hammer: {
    id: "hammer",
    direction: "BULLISH",
    label: { ko: "망치형", en: "Hammer" },
    description: {
      ko: "긴 아래꼬리와 작은 몸통이 저가 방어를 시사합니다.",
      en: "A long lower wick with a small body suggests downside rejection."
    }
  },
  morning_star: {
    id: "morning_star",
    direction: "BULLISH",
    label: { ko: "샛별형", en: "Morning Star" },
    description: {
      ko: "하락 후 작은 캔들과 강한 양봉이 이어지는 반전 패턴입니다.",
      en: "A bearish candle, small indecision candle, and strong bullish recovery form a reversal setup."
    }
  },
  three_white_soldiers: {
    id: "three_white_soldiers",
    direction: "BULLISH",
    label: { ko: "적삼병", en: "Three White Soldiers" },
    description: {
      ko: "연속 양봉이 이어지며 강한 상승 추세를 시사합니다.",
      en: "Three consecutive bullish candles suggest strong upside continuation."
    }
  },
  bearish_engulfing: {
    id: "bearish_engulfing",
    direction: "BEARISH",
    label: { ko: "하락 장악형", en: "Bearish Engulfing" },
    description: {
      ko: "이전 양봉을 강한 음봉이 감싸며 매도 반전을 시사합니다.",
      en: "A strong bearish candle engulfs the prior bullish body, suggesting a seller reversal."
    }
  },
  shooting_star: {
    id: "shooting_star",
    direction: "BEARISH",
    label: { ko: "유성형", en: "Shooting Star" },
    description: {
      ko: "긴 위꼬리와 작은 몸통이 고가 매도 압력을 시사합니다.",
      en: "A long upper wick with a small body suggests upside rejection."
    }
  },
  evening_star: {
    id: "evening_star",
    direction: "BEARISH",
    label: { ko: "석별형", en: "Evening Star" },
    description: {
      ko: "상승 후 작은 캔들과 강한 음봉이 이어지는 반전 패턴입니다.",
      en: "A bullish candle, small indecision candle, and strong bearish drop form a reversal setup."
    }
  },
  three_black_crows: {
    id: "three_black_crows",
    direction: "BEARISH",
    label: { ko: "흑삼병", en: "Three Black Crows" },
    description: {
      ko: "연속 음봉이 이어지며 강한 하락 추세를 시사합니다.",
      en: "Three consecutive bearish candles suggest strong downside continuation."
    }
  }
} satisfies Record<PatternSignal["id"], PatternDefinition>;

export function detectCandlestickPatterns(candles: Candle[]): PatternSignal[] {
  if (candles.length < 2) {
    return [];
  }

  const patterns: PatternSignal[] = [];
  const latest = candles.at(-1)!;
  const previous = candles.at(-2)!;
  const third = candles.at(-3);

  if (isBearish(previous) && isBullish(latest) && bodyLow(latest) <= bodyLow(previous) && bodyHigh(latest) >= bodyHigh(previous)) {
    patterns.push(withStrength(definitions.bullish_engulfing, "HIGH"));
  }

  if (isBullish(previous) && isBearish(latest) && bodyLow(latest) <= bodyLow(previous) && bodyHigh(latest) >= bodyHigh(previous)) {
    patterns.push(withStrength(definitions.bearish_engulfing, "HIGH"));
  }

  if (lowerWick(latest) >= realBody(latest) * 2 && upperWick(latest) <= realBody(latest) * 0.8) {
    patterns.push(withStrength(definitions.hammer, "MEDIUM"));
  }

  if (upperWick(latest) >= realBody(latest) * 2 && lowerWick(latest) <= realBody(latest) * 0.8) {
    patterns.push(withStrength(definitions.shooting_star, "MEDIUM"));
  }

  if (third) {
    const middleBody = realBody(previous);
    const thirdBody = realBody(third);
    const latestBody = realBody(latest);

    if (isBearish(third) && middleBody < thirdBody * 0.55 && isBullish(latest) && latest.close > midpoint(third)) {
      patterns.push(withStrength(definitions.morning_star, "HIGH"));
    }

    if (isBullish(third) && middleBody < thirdBody * 0.55 && isBearish(latest) && latest.close < midpoint(third)) {
      patterns.push(withStrength(definitions.evening_star, "HIGH"));
    }

    if ([third, previous, latest].every(isBullish) && previous.close > third.close && latest.close > previous.close) {
      patterns.push(withStrength(definitions.three_white_soldiers, latestBody > thirdBody * 0.7 ? "HIGH" : "MEDIUM"));
    }

    if ([third, previous, latest].every(isBearish) && previous.close < third.close && latest.close < previous.close) {
      patterns.push(withStrength(definitions.three_black_crows, latestBody > thirdBody * 0.7 ? "HIGH" : "MEDIUM"));
    }
  }

  return dedupe(patterns).slice(0, 3);
}

function withStrength(definition: PatternDefinition, strength: PatternSignal["strength"]): PatternSignal {
  return { ...definition, strength };
}

function dedupe(patterns: PatternSignal[]): PatternSignal[] {
  const seen = new Set<string>();
  return patterns.filter((pattern) => {
    if (seen.has(pattern.id)) {
      return false;
    }
    seen.add(pattern.id);
    return true;
  });
}

function isBullish(candle: Candle): boolean {
  return candle.close > candle.open;
}

function isBearish(candle: Candle): boolean {
  return candle.close < candle.open;
}

function realBody(candle: Candle): number {
  return Math.max(Math.abs(candle.close - candle.open), (candle.high - candle.low) * 0.03);
}

function bodyHigh(candle: Candle): number {
  return Math.max(candle.open, candle.close);
}

function bodyLow(candle: Candle): number {
  return Math.min(candle.open, candle.close);
}

function upperWick(candle: Candle): number {
  return candle.high - bodyHigh(candle);
}

function lowerWick(candle: Candle): number {
  return bodyLow(candle) - candle.low;
}

function midpoint(candle: Candle): number {
  return (candle.open + candle.close) / 2;
}
