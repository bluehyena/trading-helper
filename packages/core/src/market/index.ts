export * from "./alpha-vantage";
export * from "./candles";
export * from "./timeframes";
export * from "./yahoo";

import { AlphaVantageMarketDataProvider } from "./alpha-vantage";
import { YahooMarketDataProvider } from "./yahoo";

export function createMarketDataProvider(env: NodeJS.ProcessEnv = process.env) {
  if (env.MARKET_DATA_PROVIDER === "alpha_vantage" && env.ALPHA_VANTAGE_API_KEY) {
    return new AlphaVantageMarketDataProvider(env.ALPHA_VANTAGE_API_KEY);
  }

  return new YahooMarketDataProvider();
}
