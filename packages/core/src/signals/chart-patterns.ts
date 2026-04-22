import type { Candle, ChartPatternId, ChartPatternSignal, PatternDirection, PatternStrength } from "../types";

interface Pivot {
  index: number;
  type: "H" | "L";
  price: number;
  timestamp: number;
}

type ChartPatternDefinition = Pick<ChartPatternSignal, "id" | "direction" | "label" | "description">;

const definitions = {
  head_and_shoulders: {
    id: "head_and_shoulders",
    direction: "BEARISH",
    label: { ko: "헤드앤숄더", en: "Head and Shoulders" },
    description: {
      ko: "왼쪽 어깨, 더 높은 머리, 오른쪽 어깨가 만들어지며 목선 이탈 시 하락 전환 리스크가 커집니다.",
      en: "A left shoulder, higher head, and right shoulder pattern that raises reversal risk if price loses the neckline."
    }
  },
  inverse_head_and_shoulders: {
    id: "inverse_head_and_shoulders",
    direction: "BULLISH",
    label: { ko: "역헤드앤숄더", en: "Inverse Head and Shoulders" },
    description: {
      ko: "왼쪽 어깨, 더 낮은 머리, 오른쪽 어깨가 만들어지며 목선 돌파 시 상승 전환 후보가 됩니다.",
      en: "A left shoulder, lower head, and right shoulder pattern that becomes a bullish reversal candidate on neckline reclaim."
    }
  },
  bull_flag: {
    id: "bull_flag",
    direction: "BULLISH",
    label: { ko: "불 플래그", en: "Bull Flag" },
    description: {
      ko: "강한 상승 후 짧은 눌림/횡보가 이어지는 상승 지속형 패턴입니다.",
      en: "A continuation pattern where a strong upside impulse is followed by a brief pullback or sideways flag."
    }
  },
  bear_flag: {
    id: "bear_flag",
    direction: "BEARISH",
    label: { ko: "베어 플래그", en: "Bear Flag" },
    description: {
      ko: "강한 하락 후 짧은 반등/횡보가 이어지는 하락 지속형 패턴입니다.",
      en: "A continuation pattern where a strong downside impulse is followed by a brief bounce or sideways flag."
    }
  },
  bullish_pennant: {
    id: "bullish_pennant",
    direction: "BULLISH",
    label: { ko: "상승 페넌트", en: "Bullish Pennant" },
    description: {
      ko: "강한 상승 뒤 변동폭이 좁아지는 수렴이 나타나는 상승 지속 후보입니다.",
      en: "A bullish continuation candidate where volatility contracts after a strong upside impulse."
    }
  },
  bearish_pennant: {
    id: "bearish_pennant",
    direction: "BEARISH",
    label: { ko: "하락 페넌트", en: "Bearish Pennant" },
    description: {
      ko: "강한 하락 뒤 변동폭이 좁아지는 수렴이 나타나는 하락 지속 후보입니다.",
      en: "A bearish continuation candidate where volatility contracts after a strong downside impulse."
    }
  },
  ascending_triangle: {
    id: "ascending_triangle",
    direction: "BULLISH",
    label: { ko: "상승 삼각수렴", en: "Ascending Triangle" },
    description: {
      ko: "비슷한 저항선 아래에서 저점이 높아지는 구조로, 돌파 시 상승 지속 후보입니다.",
      en: "Higher lows pressing into a flat resistance area, often watched as a bullish breakout setup."
    }
  },
  descending_triangle: {
    id: "descending_triangle",
    direction: "BEARISH",
    label: { ko: "하락 삼각수렴", en: "Descending Triangle" },
    description: {
      ko: "비슷한 지지선 위에서 고점이 낮아지는 구조로, 이탈 시 하락 지속 후보입니다.",
      en: "Lower highs pressing into a flat support area, often watched as a bearish breakdown setup."
    }
  },
  symmetrical_triangle: {
    id: "symmetrical_triangle",
    direction: "BULLISH",
    label: { ko: "대칭 삼각수렴", en: "Symmetrical Triangle" },
    description: {
      ko: "고점은 낮아지고 저점은 높아지며 변동성이 압축되는 구조입니다. 직전 추세 방향 돌파를 확인해야 합니다.",
      en: "Lower highs and higher lows compress volatility. Traders usually wait for a breakout in the dominant direction."
    }
  },
  double_top: {
    id: "double_top",
    direction: "BEARISH",
    label: { ko: "쌍봉", en: "Double Top" },
    description: {
      ko: "비슷한 고점에서 두 번 막힌 구조로, 중간 저점 이탈 시 하락 전환 리스크가 커집니다.",
      en: "Two similar highs failing in the same area, with reversal risk increasing if the middle trough breaks."
    }
  },
  double_bottom: {
    id: "double_bottom",
    direction: "BULLISH",
    label: { ko: "쌍바닥", en: "Double Bottom" },
    description: {
      ko: "비슷한 저점에서 두 번 방어된 구조로, 중간 고점 돌파 시 상승 전환 후보가 됩니다.",
      en: "Two similar lows holding in the same area, with bullish reversal potential if the middle peak breaks."
    }
  },
  rising_wedge: {
    id: "rising_wedge",
    direction: "BEARISH",
    label: { ko: "상승 쐐기", en: "Rising Wedge" },
    description: {
      ko: "고점과 저점이 모두 높아지지만 폭이 좁아지는 구조로, 하방 이탈 리스크를 봅니다.",
      en: "Both highs and lows rise while the range narrows, often watched for downside failure."
    }
  },
  falling_wedge: {
    id: "falling_wedge",
    direction: "BULLISH",
    label: { ko: "하락 쐐기", en: "Falling Wedge" },
    description: {
      ko: "고점과 저점이 모두 낮아지지만 폭이 좁아지는 구조로, 상방 돌파 후보를 봅니다.",
      en: "Both highs and lows fall while the range narrows, often watched for upside reversal."
    }
  }
} satisfies Record<ChartPatternId, ChartPatternDefinition>;

export function detectChartPatterns(candles: Candle[]): ChartPatternSignal[] {
  if (candles.length < 16) {
    return [];
  }

  const windowCandles = candles.slice(-150);
  const offset = candles.length - windowCandles.length;
  const pivots = simplifyPivots(findPivots(windowCandles, 2).map((pivot) => ({ ...pivot, index: pivot.index + offset })));
  const patterns = [
    detectHeadAndShoulders(candles, pivots),
    detectInverseHeadAndShoulders(candles, pivots),
    detectDoubleTop(candles, pivots),
    detectDoubleBottom(candles, pivots),
    ...detectTriangleAndWedgePatterns(candles, pivots),
    ...detectContinuationPatterns(candles)
  ].filter((pattern): pattern is ChartPatternSignal => pattern !== null);

  return dedupe(patterns)
    .sort((left, right) => strengthWeight(right.strength) - strengthWeight(left.strength))
    .slice(0, 4);
}

function detectHeadAndShoulders(candles: Candle[], pivots: Pivot[]): ChartPatternSignal | null {
  const sequence = findRecentSequence(pivots, ["H", "L", "H", "L", "H"]);
  if (!sequence) {
    return null;
  }

  const [leftShoulder, necklineA, head, necklineB, rightShoulder] = sequence;
  const neckline = average(necklineA.price, necklineB.price);
  if (
    head.price <= Math.max(leftShoulder.price, rightShoulder.price) * 1.015 ||
    !approximatelyEqual(leftShoulder.price, rightShoulder.price, 0.055) ||
    !approximatelyEqual(necklineA.price, necklineB.price, 0.075) ||
    rightShoulder.price >= head.price
  ) {
    return null;
  }

  return createPattern("head_and_shoulders", latestClose(candles) < neckline ? "HIGH" : "MEDIUM", sequence, [
    level("목선", "Neckline", neckline),
    level("머리", "Head", head.price)
  ]);
}

function detectInverseHeadAndShoulders(candles: Candle[], pivots: Pivot[]): ChartPatternSignal | null {
  const sequence = findRecentSequence(pivots, ["L", "H", "L", "H", "L"]);
  if (!sequence) {
    return null;
  }

  const [leftShoulder, necklineA, head, necklineB, rightShoulder] = sequence;
  const neckline = average(necklineA.price, necklineB.price);
  if (
    head.price >= Math.min(leftShoulder.price, rightShoulder.price) * 0.985 ||
    !approximatelyEqual(leftShoulder.price, rightShoulder.price, 0.055) ||
    !approximatelyEqual(necklineA.price, necklineB.price, 0.075) ||
    rightShoulder.price <= head.price
  ) {
    return null;
  }

  return createPattern("inverse_head_and_shoulders", latestClose(candles) > neckline ? "HIGH" : "MEDIUM", sequence, [
    level("목선", "Neckline", neckline),
    level("머리", "Head", head.price)
  ]);
}

function detectDoubleTop(candles: Candle[], pivots: Pivot[]): ChartPatternSignal | null {
  const sequence = findRecentSequence(pivots, ["H", "L", "H"]);
  if (!sequence) {
    return null;
  }

  const [firstTop, trough, secondTop] = sequence;
  if (!approximatelyEqual(firstTop.price, secondTop.price, 0.025) || firstTop.price - trough.price < averageTrueRange(candles) * 1.2) {
    return null;
  }

  return createPattern("double_top", latestClose(candles) < trough.price ? "HIGH" : "MEDIUM", sequence, [
    level("저점", "Trough", trough.price),
    level("저항", "Resistance", average(firstTop.price, secondTop.price))
  ]);
}

function detectDoubleBottom(candles: Candle[], pivots: Pivot[]): ChartPatternSignal | null {
  const sequence = findRecentSequence(pivots, ["L", "H", "L"]);
  if (!sequence) {
    return null;
  }

  const [firstBottom, peak, secondBottom] = sequence;
  if (!approximatelyEqual(firstBottom.price, secondBottom.price, 0.025) || peak.price - firstBottom.price < averageTrueRange(candles) * 1.2) {
    return null;
  }

  return createPattern("double_bottom", latestClose(candles) > peak.price ? "HIGH" : "MEDIUM", sequence, [
    level("고점", "Peak", peak.price),
    level("지지", "Support", average(firstBottom.price, secondBottom.price))
  ]);
}

function detectTriangleAndWedgePatterns(candles: Candle[], pivots: Pivot[]): ChartPatternSignal[] {
  const highs = pivots.filter((pivot) => pivot.type === "H").slice(-4);
  const lows = pivots.filter((pivot) => pivot.type === "L").slice(-4);
  if (highs.length < 2 || lows.length < 2) {
    return [];
  }

  const patterns: ChartPatternSignal[] = [];
  const highStart = highs[0].price;
  const highEnd = highs.at(-1)!.price;
  const lowStart = lows[0].price;
  const lowEnd = lows.at(-1)!.price;
  const resistance = average(...highs.map((pivot) => pivot.price));
  const support = average(...lows.map((pivot) => pivot.price));
  const highFlat = maxDeviation(highs.map((pivot) => pivot.price)) <= 0.025;
  const lowFlat = maxDeviation(lows.map((pivot) => pivot.price)) <= 0.025;
  const highsFalling = highEnd < highStart * 0.985;
  const highsRising = highEnd > highStart * 1.01;
  const lowsRising = lowEnd > lowStart * 1.015;
  const lowsFalling = lowEnd < lowStart * 0.99;
  const points = [...highs, ...lows].sort((left, right) => left.index - right.index);

  if (highFlat && lowsRising) {
    patterns.push(
      createPattern("ascending_triangle", latestClose(candles) > resistance ? "HIGH" : "MEDIUM", points, [
        level("저항", "Resistance", resistance),
        level("상승 저점", "Rising lows", lowEnd)
      ])
    );
  }

  if (lowFlat && highsFalling) {
    patterns.push(
      createPattern("descending_triangle", latestClose(candles) < support ? "HIGH" : "MEDIUM", points, [
        level("지지", "Support", support),
        level("하락 고점", "Falling highs", highEnd)
      ])
    );
  }

  if (highsFalling && lowsRising) {
    const direction: PatternDirection = priorDirection(candles) >= 0 ? "BULLISH" : "BEARISH";
    patterns.push(
      createPattern(
        "symmetrical_triangle",
        latestRange(candles) < averageTrueRange(candles) * 1.7 ? "HIGH" : "MEDIUM",
        points,
        [level("상단 추세", "Upper trend", highEnd), level("하단 추세", "Lower trend", lowEnd)],
        direction
      )
    );
  }

  if (highsRising && lowsRising && rangeIsCompressing(highs, lows)) {
    patterns.push(
      createPattern("rising_wedge", "MEDIUM", points, [
        level("쐐기 상단", "Wedge high", highEnd),
        level("쐐기 하단", "Wedge low", lowEnd)
      ])
    );
  }

  if (highsFalling && lowsFalling && rangeIsCompressing(highs, lows)) {
    patterns.push(
      createPattern("falling_wedge", "MEDIUM", points, [
        level("쐐기 상단", "Wedge high", highEnd),
        level("쐐기 하단", "Wedge low", lowEnd)
      ])
    );
  }

  return patterns;
}

function detectContinuationPatterns(candles: Candle[]): ChartPatternSignal[] {
  if (candles.length < 38) {
    return [];
  }

  const flagLength = Math.min(18, Math.floor(candles.length * 0.35));
  const flagStart = candles.length - flagLength;
  const poleStart = Math.max(0, flagStart - 26);
  const poleOpen = candles[poleStart].close;
  const poleClose = candles[flagStart - 1].close;
  const impulsePct = (poleClose - poleOpen) / poleOpen;
  const flagCandles = candles.slice(flagStart);
  const flagHigh = Math.max(...flagCandles.map((candle) => candle.high));
  const flagLow = Math.min(...flagCandles.map((candle) => candle.low));
  const flagSlope = (flagCandles.at(-1)!.close - flagCandles[0].close) / flagCandles[0].close;
  const contraction = range(flagCandles.slice(0, Math.ceil(flagCandles.length / 2))) >
    range(flagCandles.slice(Math.floor(flagCandles.length / 2))) * 1.15;
  const points = [
    pivotFromCandle(candles[poleStart], poleStart, impulsePct >= 0 ? "L" : "H"),
    pivotFromCandle(candles[flagStart - 1], flagStart - 1, impulsePct >= 0 ? "H" : "L"),
    pivotFromCandle(flagCandles[0], flagStart, flagCandles[0].close >= flagCandles[0].open ? "H" : "L"),
    pivotFromCandle(flagCandles.at(-1)!, candles.length - 1, flagCandles.at(-1)!.close >= flagCandles.at(-1)!.open ? "H" : "L")
  ];

  const patterns: ChartPatternSignal[] = [];
  if (impulsePct >= 0.03 && flagSlope <= 0.012 && flagLow > poleOpen + (poleClose - poleOpen) * 0.35) {
    patterns.push(
      createPattern("bull_flag", latestClose(candles) > flagHigh ? "HIGH" : "MEDIUM", points, [
        level("플래그 상단", "Flag high", flagHigh),
        level("플래그 하단", "Flag low", flagLow)
      ])
    );
    if (contraction) {
      patterns.push(
        createPattern("bullish_pennant", latestClose(candles) > flagHigh ? "HIGH" : "MEDIUM", points, [
          level("수렴 상단", "Pennant high", flagHigh),
          level("수렴 하단", "Pennant low", flagLow)
        ])
      );
    }
  }

  if (impulsePct <= -0.03 && flagSlope >= -0.012 && flagHigh < poleOpen + (poleClose - poleOpen) * 0.35) {
    patterns.push(
      createPattern("bear_flag", latestClose(candles) < flagLow ? "HIGH" : "MEDIUM", points, [
        level("플래그 상단", "Flag high", flagHigh),
        level("플래그 하단", "Flag low", flagLow)
      ])
    );
    if (contraction) {
      patterns.push(
        createPattern("bearish_pennant", latestClose(candles) < flagLow ? "HIGH" : "MEDIUM", points, [
          level("수렴 상단", "Pennant high", flagHigh),
          level("수렴 하단", "Pennant low", flagLow)
        ])
      );
    }
  }

  return patterns;
}

function createPattern(
  id: ChartPatternId,
  strength: PatternStrength,
  pivots: Pivot[],
  levels: ChartPatternSignal["levels"],
  directionOverride?: PatternDirection
): ChartPatternSignal {
  const definition = definitions[id];
  return {
    ...definition,
    direction: directionOverride ?? definition.direction,
    strength,
    levels,
    points: pivots.map((pivot) => ({
      timestamp: pivot.timestamp,
      price: pivot.price,
      role: pivot.type === "H" ? "high" : "low"
    }))
  };
}

function findPivots(candles: Candle[], radius: number): Pivot[] {
  const pivots: Pivot[] = [];
  for (let index = radius; index < candles.length - radius; index += 1) {
    const candle = candles[index];
    const neighbors = candles.slice(index - radius, index + radius + 1);
    const isHigh = neighbors.every((neighbor, neighborIndex) => neighborIndex === radius || candle.high >= neighbor.high);
    const isLow = neighbors.every((neighbor, neighborIndex) => neighborIndex === radius || candle.low <= neighbor.low);

    if (isHigh) {
      pivots.push({ index, type: "H", price: candle.high, timestamp: candle.timestamp });
    }
    if (isLow) {
      pivots.push({ index, type: "L", price: candle.low, timestamp: candle.timestamp });
    }
  }

  return pivots;
}

function simplifyPivots(pivots: Pivot[]): Pivot[] {
  const simplified: Pivot[] = [];
  for (const pivot of pivots.sort((left, right) => left.index - right.index)) {
    const previous = simplified.at(-1);
    if (!previous || previous.type !== pivot.type) {
      simplified.push(pivot);
      continue;
    }

    const replacementIsMoreExtreme = pivot.type === "H" ? pivot.price > previous.price : pivot.price < previous.price;
    if (replacementIsMoreExtreme) {
      simplified[simplified.length - 1] = pivot;
    }
  }

  return simplified;
}

function findRecentSequence(pivots: Pivot[], sequence: Array<Pivot["type"]>): Pivot[] | null {
  for (let start = pivots.length - sequence.length; start >= 0; start -= 1) {
    const candidate = pivots.slice(start, start + sequence.length);
    if (candidate.every((pivot, index) => pivot.type === sequence[index])) {
      return candidate;
    }
  }

  return null;
}

function pivotFromCandle(candle: Candle, index: number, type: Pivot["type"]): Pivot {
  return {
    index,
    type,
    price: type === "H" ? candle.high : candle.low,
    timestamp: candle.timestamp
  };
}

function level(ko: string, en: string, price: number): ChartPatternSignal["levels"][number] {
  return {
    label: { ko, en },
    price: round(price)
  };
}

function dedupe(patterns: ChartPatternSignal[]): ChartPatternSignal[] {
  const seen = new Set<string>();
  return patterns.filter((pattern) => {
    if (seen.has(pattern.id)) {
      return false;
    }
    seen.add(pattern.id);
    return true;
  });
}

function average(...values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function approximatelyEqual(left: number, right: number, tolerance: number): boolean {
  return Math.abs(left - right) / average(left, right) <= tolerance;
}

function maxDeviation(values: number[]): number {
  const mean = average(...values);
  return Math.max(...values.map((value) => Math.abs(value - mean) / mean));
}

function range(candles: Candle[]): number {
  if (candles.length === 0) {
    return 0;
  }

  return Math.max(...candles.map((candle) => candle.high)) - Math.min(...candles.map((candle) => candle.low));
}

function latestRange(candles: Candle[]): number {
  const candle = candles.at(-1)!;
  return candle.high - candle.low;
}

function latestClose(candles: Candle[]): number {
  return candles.at(-1)!.close;
}

function priorDirection(candles: Candle[]): number {
  const lookback = candles.slice(-60, -20);
  if (lookback.length < 2) {
    return 0;
  }

  return lookback.at(-1)!.close - lookback[0].close;
}

function rangeIsCompressing(highs: Pivot[], lows: Pivot[]): boolean {
  const firstRange = highs[0].price - lows[0].price;
  const lastRange = highs.at(-1)!.price - lows.at(-1)!.price;
  return firstRange > 0 && lastRange > 0 && lastRange < firstRange * 0.82;
}

function averageTrueRange(candles: Candle[], period = 14): number {
  const recent = candles.slice(-period - 1);
  if (recent.length < 2) {
    const candle = candles.at(-1)!;
    return candle.high - candle.low;
  }

  const ranges = recent.slice(1).map((candle, index) => {
    const previous = recent[index];
    return Math.max(candle.high - candle.low, Math.abs(candle.high - previous.close), Math.abs(candle.low - previous.close));
  });

  return average(...ranges);
}

function strengthWeight(strength: PatternStrength): number {
  if (strength === "HIGH") {
    return 3;
  }

  if (strength === "MEDIUM") {
    return 2;
  }

  return 1;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
