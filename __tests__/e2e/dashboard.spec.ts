import { expect, test } from "@playwright/test";

test("loads the dashboard, renders signal, and streams AI explanation", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.route("**/api/market/search**", async (route) => {
    await route.fulfill({
      json: [{ symbol: "AAPL", shortName: "Apple Inc.", exchange: "Nasdaq", quoteType: "EQUITY" }]
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
  await expect(page.locator(".watch-panel")).toBeInViewport();
  await expect(page.locator(".chart-panel")).toBeInViewport();
  await expect(page.locator(".side-stack")).toBeInViewport();
  await expect(page.locator(".ai-panel")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
  await page.getByRole("button", { name: "즐겨찾기 스캔" }).click();
  await expect(page.getByText("점수 91.4")).toBeVisible();
  await expect(page.getByText("패턴: 상승 장악형")).toBeVisible();
  await expect(page.getByText("차트형태: 불 플래그")).toBeVisible();

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator(".current-price")).toHaveText("$201.85");
  await expect(page.locator(".signal").getByText("Long bias")).toBeVisible();
  await expect(page.getByRole("img", { name: "Candlestick chart" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fintech Analysis Chat" })).toBeVisible();
  await page.getByRole("link", { name: "Learn" }).click();
  await expect(page.getByRole("heading", { name: "Indicator & Chart Pattern Guide" })).toBeVisible();
  await expect(page.getByText("Heikin-Ashi")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Head and Shoulders", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Dashboard" }).click();

  await page.getByPlaceholder("Ask about the current setup").fill("Why long?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("롱 근거 테스트 응답입니다")).toBeVisible();
});

function makeCandlePayload() {
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
    symbol: "AAPL",
    timeframe: "5m",
    candles,
    source: "fixture",
    signal: {
      symbol: "AAPL",
      timeframe: "5m",
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
