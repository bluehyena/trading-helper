import { expect, test } from "@playwright/test";

test("loads the dashboard, surfaces options context, and opens the playbook", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  let savedState = makeStateFixture("AAPL", "ko");

  await page.route("**/api/state", async (route) => {
    if (route.request().method() === "PUT") {
      savedState = { ...savedState, ...(route.request().postDataJSON() as Record<string, unknown>) };
    }
    await route.fulfill({ json: savedState });
  });
  await page.route("**/api/market/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q")?.toUpperCase() ?? "";
    await route.fulfill({
      json:
        query === "QQQ"
          ? [{ symbol: "QQQ", shortName: "Invesco QQQ Trust", exchange: "Nasdaq", quoteType: "ETF" }]
          : [{ symbol: "AAPL", shortName: "Apple Inc.", exchange: "Nasdaq", quoteType: "EQUITY" }]
    });
  });
  await page.route("**/api/market/realtime/status", async (route) => {
    await route.fulfill({
      json: { configured: false, provider: "polygon", source: "Realtime provider is not configured." }
    });
  });
  await page.route("**/api/market/quote**", async (route) => {
    await route.fulfill({ status: 502, json: { error: "Quote unavailable in fixture." } });
  });
  await page.route("**/api/market/fx", async (route) => {
    await route.fulfill({
      json: {
        pair: "USD/KRW",
        rate: 1400,
        timestamp: new Date().toISOString(),
        source: "fixture"
      }
    });
  });
  await page.route("**/api/market/short-flow**", async (route) => {
    await route.fulfill({ json: makeShortFlowFixture() });
  });
  await page.route("**/api/market/mood", async (route) => {
    await route.fulfill({ json: makeMoodFixture() });
  });
  await page.route("**/api/market/candles**", async (route) => {
    await route.fulfill({ json: makeCandlePayload() });
  });
  await page.route("**/api/market/scan", async (route) => {
    await route.fulfill({
      json: {
        results: [
          {
            symbol: "AAPL",
            timeframe: "5m",
            price: 201.85,
            bias: "LONG",
            confidence: 72,
            score: 91.4,
            entryZone: { low: 201.2, high: 202.4 },
            invalidation: 199.1,
            targets: [
              { label: "1R", price: 204.7 },
              { label: "2R", price: 207.2 }
            ],
            keyReason: "Short-term EMA alignment is bullish.",
            dataAgeMinutes: 2,
            patterns: [
              {
                id: "bullish_engulfing",
                direction: "BULLISH",
                strength: "HIGH",
                label: { ko: "Bullish Engulfing", en: "Bullish Engulfing" },
                description: { ko: "Reversal candidate", en: "Reversal candidate" }
              }
            ],
            chartPatterns: [
              {
                id: "bull_flag",
                direction: "BULLISH",
                strength: "MEDIUM",
                label: { ko: "Bull Flag", en: "Bull Flag" },
                description: { ko: "Bullish continuation candidate", en: "Bullish continuation candidate" },
                levels: [{ label: { ko: "Flag high", en: "Flag high" }, price: 204 }],
                points: []
              }
            ],
            rankReasons: [],
            signal: makeCandlePayload().signal
          }
        ]
      }
    });
  });
  await page.route("**/api/ai/status", async (route) => {
    await route.fulfill({ json: { openai: false, gemini: false, local: true } });
  });
  await page.route("**/api/ai/chat", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: "This is a mocked analysis-only response. No order execution is performed."
    });
  });
  await page.route("**/api/ai/actions/preview", async (route) => {
    await route.fulfill({ json: { proposals: [] } });
  });
  await page.route("**/api/agent/scan", async (route) => {
    await route.fulfill({
      json: {
        horizon: "scalp",
        candidates: [],
        proposedFavorites: [],
        mood: makeMoodFixture(),
        report: {
          title: "Agent Scan Report",
          summary: "No candidates produced a usable setup.",
          warnings: [],
          generatedAt: new Date().toISOString()
        }
      }
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Trading Helper" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AAPL" })).toBeVisible();
  await expect(page.locator(".current-price")).toContainText("282,590");
  await expect(page.locator(".signal")).toBeVisible();
  await expect(page.locator(".snapshot-strip")).toBeVisible();
  await expect(page.locator(".options-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "1s" })).toBeDisabled();
  await expect(page.locator(".watch-panel")).toBeInViewport();
  await expect(page.locator(".chart-panel")).toBeInViewport();
  await expect(page.locator(".side-stack")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);

  await page.locator(".chart").hover({ position: { x: 420, y: 180 } });
  await expect(page.locator(".crosshair-tooltip")).toBeVisible();

  await page.locator(".search-box input").fill("QQQ");
  await expect(page.locator(".search-results").getByText("ETF")).toBeVisible();
  await page.getByText("Invesco QQQ Trust").click();
  await expect(page.getByRole("heading", { name: "QQQ" })).toBeVisible();

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator(".current-price")).toHaveText("$201.85");
  await expect(page.getByRole("heading", { name: "Demand Check" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Front Expiry Options" })).toBeVisible();
  await expect(page.locator(".options-panel .flow-badge").getByText("Call skew")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recommended Strategies" })).toBeVisible();
  await expect(page.getByText("Bull Call Spread")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Short Data Check" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fear/Greed Proxy" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Candlestick chart" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();

  await page.getByRole("button", { name: "Scan favorites" }).click();
  await expect(page.getByText("Score 91.4")).toBeVisible();
  await expect(page.getByText("Bullish Engulfing", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Bull Flag", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /AI/ }).click();
  await expect(page.getByRole("heading", { name: "Fintech Analysis Chat" })).toBeVisible();
  await page.locator(".chat-form input").fill("Why long?");
  await page.locator(".chat-form button").click();
  await expect(page.getByText("This is a mocked analysis-only response. No order execution is performed.")).toBeVisible();

  await page.getByRole("link", { name: "Playbook" }).click();
  await expect(page.getByRole("heading", { name: "A learning hub for indicators, chart structures, and products" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Indicators", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Chart Shapes", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Products", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Market Data", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Products", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Call Option" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Covered Call" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Call Option" })).toBeVisible();

  await page.getByRole("button", { name: "Chart Shapes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hammer", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Head and Shoulders", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Market Data", exact: true }).click();
  await expect(page.getByRole("heading", { name: "FINRA ATS / Dark Pool Proxy" })).toBeVisible();

  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.getByRole("button", { name: "MSFT" }).click();
  await page.getByRole("button", { name: "1h" }).click();
  await expect(page.getByRole("heading", { name: "MSFT" })).toBeVisible();
  await page.waitForTimeout(450);
  await page.reload();
  await expect(page.getByRole("heading", { name: "MSFT" })).toBeVisible();
  await expect(page.getByRole("button", { name: "1h" })).toHaveClass(/active/);
});

test("renders mocked realtime seconds candles and time and sales", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  await page.route("**/api/state", async (route) => {
    await route.fulfill({ json: makeStateFixture("QQQ", "en") });
  });
  await page.route("**/api/market/search**", async (route) => {
    await route.fulfill({
      json: [{ symbol: "QQQ", shortName: "Invesco QQQ Trust", exchange: "Nasdaq", quoteType: "ETF" }]
    });
  });
  await page.route("**/api/market/realtime/status", async (route) => {
    await route.fulfill({
      json: { configured: true, provider: "polygon", source: "Polygon/Massive fixture" }
    });
  });
  await page.route("**/api/market/quote**", async (route) => {
    await route.fulfill({
      json: {
        symbol: "QQQ",
        name: "Invesco QQQ Trust",
        price: 500,
        change: 1,
        changePercent: 0.2,
        source: "fixture",
        timestamp: new Date().toISOString()
      }
    });
  });
  await page.route("**/api/market/fx", async (route) => {
    await route.fulfill({
      json: {
        pair: "USD/KRW",
        rate: 1400,
        timestamp: new Date().toISOString(),
        source: "fixture"
      }
    });
  });
  await page.route("**/api/market/short-flow**", async (route) => {
    await route.fulfill({ json: makeShortFlowFixture("QQQ") });
  });
  await page.route("**/api/market/mood", async (route) => {
    await route.fulfill({ json: makeMoodFixture() });
  });
  await page.route("**/api/market/candles**", async (route) => {
    await route.fulfill({ json: makeCandlePayload("QQQ") });
  });
  await page.route("**/api/market/realtime/stream**", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
      body: makeRealtimeStream()
    });
  });
  await page.route("**/api/ai/status", async (route) => {
    await route.fulfill({ json: { openai: false, gemini: false, local: true } });
  });

  await page.goto("/");
  await expect(page.getByText("Realtime ready")).toBeVisible();
  await page.getByRole("button", { name: "1s" }).click();

  await expect(page.getByRole("img", { name: "Candlestick chart" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Time & Sales" })).toBeVisible();
  await expect(page.locator(".quote-strip").getByText("Bid")).toBeVisible();
  await expect(page.getByText("Recent trades")).toBeVisible();
  await expect(page.getByText("Ask-hit volume")).toBeVisible();
  await expect(page.locator(".current-price")).toHaveText("$500.00");
});

function makeCandlePayload(symbol = "AAPL", timeframe = "5m") {
  const candles = Array.from({ length: 80 }, (_, index) => {
    const timestamp = Date.now() - (80 - index) * 5 * 60_000;
    const close = 190 + index * 0.15;
    return {
      timestamp,
      time: new Date(timestamp).toISOString(),
      open: close - 0.08,
      high: close + 0.5,
      low: close - 0.5,
      close,
      volume: 1000 + index * 5
    };
  });

  const call195 = optionContract(symbol, "CALL", 195, 8.2, 0.03, true);
  const call200 = optionContract(symbol, "CALL", 200, 4.5, 0.01, true);
  const call205 = optionContract(symbol, "CALL", 205, 2.5, 0.02, false);
  const put195 = optionContract(symbol, "PUT", 195, 2.8, 0.03, false);
  const put200 = optionContract(symbol, "PUT", 200, 4.3, 0.01, false);

  return {
    symbol,
    timeframe,
    horizon: "scalp",
    candles,
    source: "fixture",
    signal: {
      symbol,
      timeframe,
      horizon: "scalp",
      bias: "LONG",
      confidence: 68,
      entryZone: { low: 201.2, high: 202.4 },
      invalidation: 199.1,
      targets: [
        { label: "1R", price: 204.7 },
        { label: "2R", price: 207.2 }
      ],
      riskReward: 2,
      reasons: ["Short-term EMA alignment is bullish.", "Price is above VWAP."],
      warnings: ["Analysis-only output based on free public data."],
      patterns: [
        {
          id: "bullish_engulfing",
          direction: "BULLISH",
          strength: "HIGH",
          label: { ko: "Bullish Engulfing", en: "Bullish Engulfing" },
          description: { ko: "Reversal candidate", en: "Reversal candidate" }
        }
      ],
      chartPatterns: [
        {
          id: "bull_flag",
          direction: "BULLISH",
          strength: "MEDIUM",
          label: { ko: "Bull Flag", en: "Bull Flag" },
          description: { ko: "Bullish continuation candidate", en: "Bullish continuation candidate" },
          levels: [{ label: { ko: "Flag high", en: "Flag high" }, price: 204 }],
          points: []
        }
      ],
      indicators: {
        ema9: 201,
        ema21: 199,
        ema50: 196,
        ema200: null,
        sma9: 200.8,
        sma21: 199.2,
        sma50: 196.4,
        sma200: null,
        rsi14: 58,
        macd: 1,
        macdSignal: 0.7,
        macdHistogram: 0.3,
        bollingerUpper: 205,
        bollingerMiddle: 200,
        bollingerLower: 195,
        atr14: 1.4,
        vwap: 200,
        relativeVolume: 1.3,
        obv: 100000,
        support: 199,
        resistance: 205,
        pivot: 201
      },
      optionsSentiment: {
        symbol,
        expiration: "2026-05-17T00:00:00.000Z",
        underlyingPrice: 201.85,
        callVolume: 4200,
        putVolume: 1800,
        callOpenInterest: 9500,
        putOpenInterest: 4300,
        putCallVolumeRatio: 0.43,
        putCallOpenInterestRatio: 0.45,
        atmCallImpliedVolatility: 0.29,
        atmPutImpliedVolatility: 0.27,
        impliedVolatilitySkew: -0.02,
        volatilityRegime: "LOW",
        bias: "LONG",
        confidence: 71,
        reasons: ["Front-expiry options flow is tilted toward calls."],
        warnings: ["Options data is delayed context."],
        nearCalls: [call195, call200, call205],
        nearPuts: [put195, put200],
        strategyRecommendations: [
          {
            id: "bull_call_spread",
            title: { ko: "Bull Call Spread", en: "Bull Call Spread" },
            summary: {
              ko: "A debit spread for bullish setups when implied volatility is not excessively high.",
              en: "A debit spread for bullish setups when implied volatility is not excessively high."
            },
            outlook: "LONG",
            volatilityRegime: "LOW",
            riskLevel: "MEDIUM",
            fitScore: 93,
            maxProfit: 300,
            maxProfitSummary: {
              ko: "Profit is capped if price reaches the short strike.",
              en: "Profit is capped if price reaches the short strike."
            },
            maxLoss: 200,
            maxLossSummary: {
              ko: "The net debit paid is the maximum loss.",
              en: "The net debit paid is the maximum loss."
            },
            breakEvenPrices: [202],
            estimatedBuyingPower: 200,
            estimatedBuyingPowerSummary: {
              ko: "Buying power is roughly the net debit paid.",
              en: "Buying power is roughly the net debit paid."
            },
            legs: [
              {
                asset: "CALL",
                side: "BUY",
                quantity: 1,
                strike: 200,
                expiration: "2026-05-17T00:00:00.000Z",
                premium: 4.5,
                note: { ko: "Buy the ATM call", en: "Buy the ATM call" }
              },
              {
                asset: "CALL",
                side: "SELL",
                quantity: 1,
                strike: 205,
                expiration: "2026-05-17T00:00:00.000Z",
                premium: 2.5,
                note: { ko: "Sell a higher-strike call", en: "Sell a higher-strike call" }
              }
            ],
            warnings: ["Assumes one standard U.S. equity option contract controls 100 shares."]
          }
        ],
        topCalls: [call200],
        topPuts: [put195],
        dataTimestamp: candles.at(-1)!.time,
        source: "fixture"
      },
      dataTimestamp: candles.at(-1)!.time,
      source: "fixture"
    }
  };
}

function makeRealtimeStream() {
  const payload = makeCandlePayload("QQQ", "1s");
  const latest = payload.candles.at(-1)!;
  latest.close = 500;
  latest.high = 500.05;
  latest.low = 499.8;
  latest.open = 499.9;
  payload.signal.timeframe = "1s";
  payload.signal.dataTimestamp = latest.time;
  payload.signal.source = "Polygon/Massive fixture";

  return [
    sse("status", { source: "Polygon/Massive fixture", message: "subscribed" }),
    sse("quote", { symbol: "QQQ", bidPrice: 499.9, bidSize: 10, askPrice: 500, askSize: 12, spread: 0.1, timestamp: latest.time }),
    sse("trade", { symbol: "QQQ", price: 500, size: 100, timestamp: latest.time, direction: "BUY" }),
    sse("candle", latest),
    sse("signal", payload)
  ].join("");
}

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function makeStateFixture(symbol = "AAPL", locale: "ko" | "en" = "ko") {
  return {
    locale,
    favorites: ["AAPL", "MSFT", "NVDA", "TSLA", "AMD", "META", "SPY", "QQQ", "VOO"],
    lastSymbol: symbol,
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
    updatedAt: new Date().toISOString()
  };
}

function makeShortFlowFixture(symbol = "AAPL") {
  return {
    symbol,
    shortInterest: {
      symbol,
      settlementDate: "2026-04-15",
      shortInterest: 1000000,
      averageDailyVolume: 250000,
      daysToCover: 4,
      source: "fixture"
    },
    shortSaleVolume: {
      symbol,
      date: "2026-04-22",
      shortVolume: 550000,
      totalVolume: 1000000,
      shortExemptVolume: 1000,
      shortVolumeRatio: 0.55,
      source: "fixture"
    },
    failsToDeliver: {
      symbol,
      settlementDate: "2026-04-15",
      quantity: 1200,
      price: 201.5,
      source: "fixture"
    },
    darkPool: {
      symbol,
      weekStartDate: "2026-04-14",
      tier: "T1",
      totalWeeklyShares: 4500000,
      totalWeeklyTrades: 12500,
      lastUpdateDate: "2026-04-21",
      atsToShortVolumeRatio: 8.2,
      atsShareOfShortVolumePercent: 820,
      warnings: [
        "ATS data is delayed weekly public data.",
        "ATS shares and daily short volume come from different delayed datasets."
      ],
      dataTimestamp: new Date().toISOString(),
      source: "fixture"
    },
    warnings: ["Short-related public data is delayed and must not be treated as real-time order flow."],
    dataTimestamp: new Date().toISOString(),
    source: "fixture"
  };
}

function makeMoodFixture() {
  return {
    score: 66,
    label: { ko: "Greed", en: "Greed" },
    vix: 16,
    putCallRatio: 0.8,
    spyTrend: "LONG",
    qqqTrend: "LONG",
    warnings: ["This is a Fear/Greed-style proxy, not the CNN Fear & Greed Index."],
    dataTimestamp: new Date().toISOString(),
    source: "fixture"
  };
}

function optionContract(
  symbol: string,
  side: "CALL" | "PUT",
  strike: number,
  lastPrice: number,
  distanceFromSpotPercent: number,
  inTheMoney: boolean
) {
  return {
    contractSymbol: `${symbol}-${side}-${strike}`,
    side,
    strike,
    expiration: "2026-05-17T00:00:00.000Z",
    lastPrice,
    volume: 1000,
    openInterest: 2500,
    impliedVolatility: 0.29,
    inTheMoney,
    distanceFromSpotPercent
  };
}
