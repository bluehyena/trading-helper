import { describe, expect, it } from "vitest";
import { parseAlphaVantageTimeSeries } from "../index";

describe("Alpha Vantage parser", () => {
  it("normalizes intraday time series payloads", () => {
    const candles = parseAlphaVantageTimeSeries(
      {
        "Time Series (5min)": {
          "2026-04-21 09:35:00": {
            "1. open": "101",
            "2. high": "102",
            "3. low": "100",
            "4. close": "101.5",
            "5. volume": "1234"
          },
          "2026-04-21 09:30:00": {
            "1. open": "100",
            "2. high": "101",
            "3. low": "99",
            "4. close": "100.8",
            "5. volume": "1000"
          }
        }
      },
      "5m"
    );

    expect(candles).toHaveLength(2);
    expect(candles[0].open).toBe(100);
    expect(candles[1].close).toBe(101.5);
  });
});
