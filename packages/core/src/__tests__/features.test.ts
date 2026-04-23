import { describe, expect, it } from "vitest";
import {
  analyzeSignal,
  analyzeSwingSignal,
  buildMarketMoodSnapshot,
  calculateSpread,
  calculateTradeReturn,
  detectChartPatterns,
  detectCandlestickPatterns,
  estimateTradeDirection,
  isTimeframe,
  isRealtimeTimeframe,
  parsePolygonEvents,
  parseFinraShortInterestCsv,
  parseFinraShortSaleVolumeCsv,
  parseSecFailsToDeliverText,
  parseYahooSearchResponse,
  normalizeUserState,
  rankScannerResult,
  RealtimeCandleAggregator,
  sma,
  timeframeConfig,
  toHeikinAshi,
  type Candle,
  type RealtimeTrade
} from "../index";

describe("extended market features", () => {
  it("supports daily, weekly, and monthly timeframes", () => {
    expect(isTimeframe("1d")).toBe(true);
    expect(isTimeframe("1w")).toBe(true);
    expect(isTimeframe("1mo")).toBe(true);
    expect(isTimeframe("1s")).toBe(true);
    expect(isRealtimeTimeframe("1s")).toBe(true);
    expect(isRealtimeTimeframe("5m")).toBe(false);
    expect(timeframeConfig["1w"].interval).toBe("1wk");
    expect(timeframeConfig["1mo"].interval).toBe("1mo");
  });

  it("aggregates realtime trades into second candles and limits the rolling buffer", () => {
    const aggregator = new RealtimeCandleAggregator("1s");
    const first = aggregator.updateTrade(trade(100, 10, "2026-04-22T14:30:00.100Z"));
    const sameBucket = aggregator.updateTrade(trade(101, 7, "2026-04-22T14:30:00.900Z"));
    const nextBucket = aggregator.updateTrade(trade(99, 5, "2026-04-22T14:30:01.100Z"));

    expect(first.timestamp).toBe(sameBucket.timestamp);
    expect(sameBucket.open).toBe(100);
    expect(sameBucket.high).toBe(101);
    expect(sameBucket.close).toBe(101);
    expect(sameBucket.volume).toBe(17);
    expect(nextBucket.timestamp).toBeGreaterThan(sameBucket.timestamp);
    expect(aggregator.getCandles()).toHaveLength(2);
  });

  it("calculates spread and estimates trade direction from level 1 quotes", () => {
    const quote = {
      symbol: "QQQ",
      bidPrice: 499.9,
      bidSize: 5,
      askPrice: 500,
      askSize: 7,
      spread: 0.1,
      timestamp: "2026-04-22T14:30:00.000Z"
    };

    expect(calculateSpread(quote)).toBeCloseTo(0.1);
    expect(estimateTradeDirection(trade(500, 1), quote)).toBe("BUY");
    expect(estimateTradeDirection(trade(499.9, 1), quote)).toBe("SELL");
  });

  it("parses Polygon/Massive trade and quote websocket events without leaking keys", () => {
    const events = parsePolygonEvents(
      JSON.stringify([
        { ev: "status", status: "auth_success", message: "authenticated" },
        { ev: "Q", sym: "QQQ", bp: 499.9, bs: 2, ap: 500, as: 4, t: 1776868200000 },
        { ev: "T", sym: "QQQ", p: 500, s: 12, t: 1776868200100 }
      ])
    );

    expect(events.some((event) => event.type === "status")).toBe(true);
    expect(events.some((event) => event.type === "quote")).toBe(true);
    expect(events.some((event) => event.type === "trade")).toBe(true);
    expect(JSON.stringify(events)).not.toContain("POLYGON_API_KEY");
  });

  it("keeps ETF symbols from Yahoo search results", () => {
    const results = parseYahooSearchResponse({
      quotes: [
        { symbol: "QQQ", shortname: "Invesco QQQ Trust", quoteType: "ETF", exchDisp: "Nasdaq" },
        { symbol: "AAPL", shortname: "Apple Inc.", quoteType: "EQUITY", exchDisp: "Nasdaq" },
        { symbol: "AAPL2501C00100000", shortname: "Option", quoteType: "OPTION", exchDisp: "OPR" }
      ]
    });

    expect(results.map((result) => result.symbol)).toEqual(["QQQ", "AAPL"]);
    expect(results[0].quoteType).toBe("ETF");
  });

  it("converts regular candles to Heikin-Ashi candles", () => {
    const candles = makeCandles(3);
    const heikin = toHeikinAshi(candles);

    expect(heikin).toHaveLength(3);
    expect(heikin[0].close).toBeCloseTo(
      (candles[0].open + candles[0].high + candles[0].low + candles[0].close) / 4,
      5
    );
    expect(heikin[1].open).toBeCloseTo((heikin[0].open + heikin[0].close) / 2, 5);
  });

  it("detects representative candlestick patterns", () => {
    const bullish = detectCandlestickPatterns([
      candle(100, 101, 94, 95),
      candle(94, 104, 93, 103)
    ]);
    const bearish = detectCandlestickPatterns([
      candle(95, 104, 94, 103),
      candle(104, 105, 93, 94)
    ]);

    expect(bullish.some((pattern) => pattern.id === "bullish_engulfing")).toBe(true);
    expect(bearish.some((pattern) => pattern.id === "bearish_engulfing")).toBe(true);
  });

  it("detects chart structure patterns such as head and shoulders and bull flags", () => {
    const headAndShoulders = detectChartPatterns(
      closeSeries([100, 102, 104, 103, 101, 99, 101, 104, 108, 106, 103, 100, 102, 104, 103, 101, 98])
    );
    const bullFlag = detectChartPatterns(makeBullFlagCandles());

    expect(headAndShoulders.some((pattern) => pattern.id === "head_and_shoulders")).toBe(true);
    expect(bullFlag.some((pattern) => pattern.id === "bull_flag" || pattern.id === "bullish_pennant")).toBe(true);
  });

  it("ranks scanner results by signal quality and setup proximity", () => {
    const candles = makeCandles(220);
    const signal = analyzeSignal({
      symbol: "AAPL",
      timeframe: "5m",
      candles,
      source: "fixture",
      now: new Date(candles.at(-1)!.timestamp + 60_000)
    });
    const result = rankScannerResult({
      symbol: "AAPL",
      timeframe: "5m",
      candles,
      signal,
      now: new Date(candles.at(-1)!.timestamp + 60_000)
    });

    expect(result.symbol).toBe("AAPL");
    expect(result.score).toBeGreaterThan(0);
    expect(result.keyReason.length).toBeGreaterThan(0);
  });

  it("calculates SMA and swing signals", () => {
    expect(sma([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]);

    const bullish = analyzeSwingSignal({
      symbol: "MSFT",
      timeframe: "1d",
      candles: makeCandles(240),
      source: "fixture",
      now: new Date(Date.now())
    });
    const bearish = analyzeSwingSignal({
      symbol: "MSFT",
      timeframe: "1d",
      candles: makeCandles(240).map((candle, index) => ({
        ...candle,
        close: 140 - index * 0.12,
        open: 140 - index * 0.12 + 0.05,
        high: 140 - index * 0.12 + 0.5,
        low: 140 - index * 0.12 - 0.5
      })),
      source: "fixture",
      now: new Date(Date.now())
    });

    expect(bullish.horizon).toBe("swing");
    expect(bullish.bias).toBe("LONG");
    expect(bearish.bias).toBe("SHORT");
  });

  it("parses short-flow public data fixtures", () => {
    const shortInterest = parseFinraShortInterestCsv(
      "Symbol,Settlement Date,Current Short Interest,Average Daily Share Volume,Days To Cover\nAAPL,2026-04-15,1000000,250000,4"
    );
    const shortVolume = parseFinraShortSaleVolumeCsv(
      "Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume\n20260422|AAPL|550000|1000|1000000"
    );
    const ftd = parseSecFailsToDeliverText(
      "SETTLEMENT DATE|CUSIP|SYMBOL|QUANTITY (FAILS)|DESCRIPTION|PRICE\n20260415|037833100|AAPL|1200|APPLE INC|201.5"
    );

    expect(shortInterest[0].daysToCover).toBe(4);
    expect(shortVolume[0].shortVolumeRatio).toBeCloseTo(0.55);
    expect(ftd[0].quantity).toBe(1200);
  });

  it("builds market mood and trade return calculations", () => {
    const mood = buildMarketMoodSnapshot({
      vixQuote: {
        symbol: "^VIX",
        price: 14,
        change: 0,
        changePercent: 0,
        source: "fixture",
        timestamp: new Date().toISOString()
      },
      spyCandles: makeCandles(60),
      qqqCandles: makeCandles(60),
      putCallRatio: 0.7
    });
    const returns = calculateTradeReturn({
      principal: 10_000,
      feePercent: 0.05,
      taxPercent: 10,
      entryPrice: 100,
      takeProfitPrice: 110,
      stopLossPrice: 95,
      direction: "long"
    });

    expect(mood.score).toBeGreaterThan(50);
    expect(returns.takeProfit.net).toBeGreaterThan(0);
    expect(returns.stopLoss.net).toBeLessThan(0);
  });

  it("normalizes user state without allowing secret-like fields", () => {
    const state = normalizeUserState({
      locale: "en",
      favorites: ["aapl", "AAPL", "MSFT"],
      lastSymbol: "msft",
      timeframe: "1d",
      horizon: "swing",
      OPENAI_API_KEY: "secret"
    });

    expect(state.locale).toBe("en");
    expect(state.favorites).toEqual(["AAPL", "MSFT"]);
    expect(JSON.stringify(state)).not.toContain("secret");
  });
});

function makeCandles(count: number): Candle[] {
  const baseTime = Date.now() - count * 5 * 60_000;
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 0.12;
    return {
      timestamp: baseTime + index * 5 * 60_000,
      time: new Date(baseTime + index * 5 * 60_000).toISOString(),
      open: close - 0.08,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1_000 + index * 5
    };
  });
}

function closeSeries(values: number[]): Candle[] {
  const baseTime = Date.now() - values.length * 5 * 60_000;
  return values.map((close, index) => ({
    timestamp: baseTime + index * 5 * 60_000,
    time: new Date(baseTime + index * 5 * 60_000).toISOString(),
    open: index === 0 ? close : values[index - 1],
    high: close + 0.35,
    low: close - 0.35,
    close,
    volume: 1_500
  }));
}

function makeBullFlagCandles(): Candle[] {
  const impulse = Array.from({ length: 24 }, (_, index) => 100 + index * 0.32);
  const flag = Array.from({ length: 18 }, (_, index) => 107.7 - index * 0.08 + Math.sin(index / 2) * 0.05);
  return closeSeries([...impulse, ...flag]);
}

function candle(open: number, high: number, low: number, close: number): Candle {
  return {
    timestamp: Date.now(),
    time: new Date().toISOString(),
    open,
    high,
    low,
    close,
    volume: 1_000
  };
}

function trade(price: number, size: number, timestamp = "2026-04-22T14:30:00.000Z"): RealtimeTrade {
  return {
    symbol: "QQQ",
    price,
    size,
    timestamp
  };
}
