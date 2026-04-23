import type { UserState } from "./types";

export const defaultUserState: UserState = {
  locale: "ko",
  favorites: ["AAPL", "MSFT", "NVDA", "TSLA", "AMD", "META", "SPY", "QQQ", "VOO"],
  lastSymbol: "AAPL",
  timeframe: "5m",
  horizon: "scalp",
  chart: {
    candleStyle: "regular",
    showOverlays: true,
    movingAverageKind: "ema",
    movingAveragePeriods: {
      9: true,
      21: true,
      50: false,
      200: false
    },
    vwap: true,
    bollinger: false
  },
  calculator: {
    principal: 10000,
    feePercent: 0.05,
    taxPercent: 0,
    entryPrice: 100,
    takeProfitPrice: 105,
    stopLossPrice: 97,
    direction: "long"
  },
  updatedAt: new Date(0).toISOString()
};

export function normalizeUserState(value: unknown, now = new Date()): UserState {
  const input = isRecord(value) ? value : {};
  const chart = isRecord(input.chart) ? input.chart : {};
  const periods = isRecord(chart.movingAveragePeriods) ? chart.movingAveragePeriods : {};
  const calculator = isRecord(input.calculator) ? input.calculator : {};
  const timeframe = isTimeframeValue(input.timeframe);

  return {
    locale: input.locale === "en" ? "en" : "ko",
    favorites: normalizeFavorites(Array.isArray(input.favorites) ? input.favorites : defaultUserState.favorites),
    lastSymbol: normalizeSymbol(typeof input.lastSymbol === "string" ? input.lastSymbol : defaultUserState.lastSymbol),
    timeframe: timeframe || defaultUserState.timeframe,
    horizon: input.horizon === "swing" ? "swing" : "scalp",
    chart: {
      candleStyle: chart.candleStyle === "heikin_ashi" ? "heikin_ashi" : "regular",
      showOverlays: typeof chart.showOverlays === "boolean" ? chart.showOverlays : defaultUserState.chart.showOverlays,
      movingAverageKind: chart.movingAverageKind === "sma" ? "sma" : "ema",
      movingAveragePeriods: {
        9: typeof periods[9] === "boolean" ? periods[9] : defaultUserState.chart.movingAveragePeriods[9],
        21: typeof periods[21] === "boolean" ? periods[21] : defaultUserState.chart.movingAveragePeriods[21],
        50: typeof periods[50] === "boolean" ? periods[50] : defaultUserState.chart.movingAveragePeriods[50],
        200: typeof periods[200] === "boolean" ? periods[200] : defaultUserState.chart.movingAveragePeriods[200]
      },
      vwap: typeof chart.vwap === "boolean" ? chart.vwap : defaultUserState.chart.vwap,
      bollinger: typeof chart.bollinger === "boolean" ? chart.bollinger : defaultUserState.chart.bollinger
    },
    calculator: {
      principal: positiveNumber(calculator.principal, defaultUserState.calculator.principal),
      feePercent: nonNegativeNumber(calculator.feePercent, defaultUserState.calculator.feePercent),
      taxPercent: nonNegativeNumber(calculator.taxPercent, defaultUserState.calculator.taxPercent),
      entryPrice: positiveNumber(calculator.entryPrice, defaultUserState.calculator.entryPrice),
      takeProfitPrice: positiveNumber(calculator.takeProfitPrice, defaultUserState.calculator.takeProfitPrice),
      stopLossPrice: positiveNumber(calculator.stopLossPrice, defaultUserState.calculator.stopLossPrice),
      direction: calculator.direction === "short" ? "short" : "long"
    },
    updatedAt: now.toISOString()
  };
}

function normalizeFavorites(values: unknown[]): string[] {
  const seen = new Set<string>();
  const favorites: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const symbol = normalizeSymbol(value);
    if (!symbol || seen.has(symbol)) {
      continue;
    }
    seen.add(symbol);
    favorites.push(symbol);
  }

  return favorites.slice(0, 25);
}

function normalizeSymbol(value: string): string {
  const symbol = value.trim().toUpperCase();
  return /^[A-Z0-9.-]{1,12}$/.test(symbol) ? symbol : "AAPL";
}

function positiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function isRecord(value: unknown): value is Record<string | number, unknown> {
  return typeof value === "object" && value !== null;
}

function isTimeframeValue(value: unknown): UserState["timeframe"] | false {
  return (
    value === "1s" ||
    value === "5s" ||
    value === "15s" ||
    value === "1m" ||
    value === "5m" ||
    value === "15m" ||
    value === "30m" ||
    value === "1h" ||
    value === "1d" ||
    value === "1w" ||
    value === "1mo"
  )
    ? value
    : false;
}
