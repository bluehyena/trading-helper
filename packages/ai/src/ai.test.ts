import { describe, expect, it } from "vitest";
import { buildTradingSystemPrompt, LocalAiProvider, type AiChatRequest } from "./index";

describe("AI guardrails", () => {
  it("builds an analysis-only fintech system prompt", () => {
    const prompt = buildTradingSystemPrompt();

    expect(prompt).toContain("must not claim certainty");
    expect(prompt).toContain("place/prepare orders");
  });

  it("local fallback refuses execution language while explaining context", async () => {
    const provider = new LocalAiProvider();
    const chunks: string[] = [];

    for await (const chunk of provider.streamChat(makeRequest("지금 매수 주문 넣어줘"))) {
      chunks.push(chunk);
    }

    const answer = chunks.join("");
    expect(answer).toContain("주문 실행");
    expect(answer).toContain("분석 보조");
    expect(answer).toContain("AAPL");
  });
});

function makeRequest(content: string): AiChatRequest {
  return {
    messages: [{ role: "user", content }],
    marketContext: {
      symbol: "AAPL",
      quote: {
        price: 200,
        change: 1,
        changePercent: 0.5,
        marketState: "REGULAR",
        timestamp: new Date().toISOString()
      },
      signal: {
        symbol: "AAPL",
        timeframe: "5m",
        horizon: "scalp",
        bias: "LONG",
        confidence: 64,
        entryZone: { low: 199, high: 201 },
        invalidation: 197,
        targets: [
          { label: "1R", price: 203 },
          { label: "2R", price: 206 }
        ],
        riskReward: 2,
        reasons: ["EMA 배열이 상승 방향입니다."],
        warnings: ["무료 공개 데이터 기반의 분석 보조입니다."],
        patterns: [],
        chartPatterns: [],
        indicators: {
          ema9: 200,
          ema21: 198,
          ema50: 195,
          ema200: 180,
          sma9: 199,
          sma21: 197,
          sma50: 194,
          sma200: 179,
          rsi14: 58,
          macd: 1,
          macdSignal: 0.8,
          macdHistogram: 0.2,
          bollingerUpper: 205,
          bollingerMiddle: 198,
          bollingerLower: 191,
          atr14: 2,
          vwap: 199,
          relativeVolume: 1.4,
          obv: 10000,
          support: 197,
          resistance: 205,
          pivot: 200
        },
        dataTimestamp: new Date().toISOString(),
        source: "fixture"
      }
    }
  };
}
