import { expect, test } from "@playwright/test";

test("loads the dashboard, renders signal, and streams AI explanation", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  let savedState = makeStateFixture();
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
    await route.fulfill({
      status: 502,
      json: { error: "Quote unavailable in fixture." }
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
                label: { ko: "상승 장악형", en: "Bullish Engulfing" },
                description: { ko: "반전 후보", en: "Reversal candidate" }
              }
            ],
            chartPatterns: [
              {
                id: "bull_flag",
                direction: "BULLISH",
                strength: "MEDIUM",
                label: { ko: "불 플래그", en: "Bull Flag" },
                description: { ko: "상승 지속 후보", en: "Bullish continuation candidate" },
                levels: [{ label: { ko: "플래그 상단", en: "Flag high" }, price: 204 }],
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
      body: "롱 근거 테스트 응답입니다. 주문 실행은 하지 않습니다."
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
          title: "에이전트 스캔 리포트",
          summary: "사용 가능한 셋업 후보가 없습니다.",
          warnings: [],
          generatedAt: new Date().toISOString()
        }
      }
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Trading Helper" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AAPL" })).toBeVisible();
  await expect(page.getByText("₩282,590")).toBeVisible();
  await expect(page.getByText("롱 우위")).toBeVisible();
  await expect(page.getByText("투자 판단과 손실 책임은 사용자 본인")).toBeVisible();
  await expect(page.getByRole("img", { name: "캔들 차트" })).toBeVisible();
  await expect(page.getByRole("button", { name: "확대" })).toBeVisible();
  await expect(page.getByRole("button", { name: "축소" })).toBeVisible();
  await expect(page.getByRole("button", { name: "하이킨아시" })).toBeVisible();
  await expect(page.getByRole("button", { name: "타점 표시" })).toBeVisible();
  await expect(page.getByRole("button", { name: "1s" })).toBeDisabled();
  await expect(page.getByText("실시간 키 필요")).toBeVisible();
  await expect(page.getByRole("button", { name: "QQQ" })).toBeVisible();
  await expect(page.locator(".signal .pattern-direction.long").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "수급 체크" })).toBeVisible();
  await expect(page.getByText("수요 우세")).toBeVisible();
  await expect(page.locator(".watch-panel")).toBeInViewport();
  await expect(page.locator(".chart-panel")).toBeInViewport();
  await expect(page.locator(".side-stack")).toBeInViewport();
  await expect(page.getByRole("heading", { name: "공매도/숏 체크" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "공포/탐욕 프록시" })).toBeVisible();
  await page.getByRole("button", { name: /AI/ }).click();
  await expect(page.locator(".ai-panel")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
  await page.locator(".chart").hover({ position: { x: 420, y: 180 } });
  await expect(page.locator(".crosshair-tooltip")).toBeVisible();
  await page.getByRole("button", { name: "즐겨찾기 스캔" }).click();
  await expect(page.getByText("점수 91.4")).toBeVisible();
  await expect(page.getByText("패턴: 상승 장악형")).toBeVisible();
  await expect(page.getByText("차트형태: 불 플래그")).toBeVisible();
  await page.getByLabel("종목 검색").fill("QQQ");
  await expect(page.locator(".search-results").getByText("ETF")).toBeVisible();
  await page.getByText("Invesco QQQ Trust").click();
  await expect(page.getByRole("heading", { name: "QQQ" })).toBeVisible();

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator(".current-price")).toHaveText("$201.85");
  await expect(page.locator(".signal").getByText("Long bias")).toBeVisible();
  await expect(page.locator(".signal").getByText("Long watch").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Demand Check" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Candlestick chart" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fintech Analysis Chat" })).toBeVisible();
  await page.getByRole("link", { name: "Learn" }).click();
  await expect(page.getByRole("heading", { name: "Indicator & Chart Pattern Guide" })).toBeVisible();
  await expect(page.getByText("Heikin-Ashi")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hammer", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Hammer", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Head and Shoulders", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Head and Shoulders", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Bull Flag", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByRole("heading", { name: "Double Bottom" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "FINRA Daily Short Sale Volume" })).toBeVisible();
  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.getByRole("button", { name: /AI/ }).click();

  await page.locator(".chat-form input").fill("Why long?");
  await page.locator(".chat-form button").click();
  await expect(page.getByText("롱 근거 테스트 응답입니다")).toBeVisible();

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
    await route.fulfill({ json: makeStateFixture("QQQ") });
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
  await expect(page.getByText("실시간 준비됨")).toBeVisible();
  await page.getByRole("button", { name: "1s" }).click();

  await expect(page.getByRole("img", { name: "캔들 차트" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "체결창" })).toBeVisible();
  await expect(page.getByText("매수호가")).toBeVisible();
  await expect(page.getByText("최근 체결")).toBeVisible();
  await expect(page.getByText("매수체결량")).toBeVisible();
  await expect(page.getByText("매수체결", { exact: true })).toBeVisible();
  await expect(page.locator(".current-price")).toHaveText("₩700,000");
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
      reasons: ["단기 EMA 배열이 상승 방향입니다.", "가격이 VWAP 위에 있습니다."],
      warnings: ["무료 공개 데이터 기반의 분석 보조입니다."],
      patterns: [
        {
          id: "bullish_engulfing",
          direction: "BULLISH",
          strength: "HIGH",
          label: { ko: "상승 장악형", en: "Bullish Engulfing" },
          description: { ko: "반전 후보", en: "Reversal candidate" }
        }
      ],
      chartPatterns: [
        {
          id: "bull_flag",
          direction: "BULLISH",
          strength: "MEDIUM",
          label: { ko: "불 플래그", en: "Bull Flag" },
          description: { ko: "상승 지속 후보", en: "Bullish continuation candidate" },
          levels: [{ label: { ko: "플래그 상단", en: "Flag high" }, price: 204 }],
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

function makeStateFixture(symbol = "AAPL") {
  return {
    locale: "ko",
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
    warnings: ["Short-related public data is delayed and must not be treated as real-time order flow."],
    dataTimestamp: new Date().toISOString(),
    source: "fixture"
  };
}

function makeMoodFixture() {
  return {
    score: 66,
    label: { ko: "탐욕", en: "Greed" },
    vix: 16,
    putCallRatio: 0.8,
    spyTrend: "LONG",
    qqqTrend: "LONG",
    warnings: ["This is a Fear/Greed-style proxy, not the CNN Fear & Greed Index."],
    dataTimestamp: new Date().toISOString(),
    source: "fixture"
  };
}
