import { describe, expect, it } from "vitest";
import { parseYahooChartResponse } from "../index";

describe("Yahoo market data parser", () => {
  it("normalizes fixture chart payloads into candles without live API calls", () => {
    const candles = parseYahooChartResponse(
      {
        chart: {
          result: [
            {
              timestamp: [1_700_000_000, 1_700_000_300, 1_700_000_600],
              indicators: {
                quote: [
                  {
                    open: [100, null, 101],
                    high: [101, null, 102],
                    low: [99, null, 100],
                    close: [100.5, null, 101.7],
                    volume: [1000, null, 1300]
                  }
                ]
              }
            }
          ],
          error: null
        }
      },
      "AAPL"
    );

    expect(candles).toHaveLength(2);
    expect(candles[0]).toMatchObject({ open: 100, close: 100.5, volume: 1000 });
    expect(candles[1].time).toBe("2023-11-14T22:23:20.000Z");
  });
});
