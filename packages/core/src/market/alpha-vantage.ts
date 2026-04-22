import type {
  Candle,
  MarketDataProvider,
  MarketStatus,
  Quote,
  SymbolSearchResult,
  Timeframe
} from "../types";
import { isRealtimeTimeframe } from "./timeframes";

const ALPHA_VANTAGE_SOURCE =
  "Alpha Vantage API (free limits apply; intraday freshness depends on entitlement)";

interface AlphaVantageMatch {
  "1. symbol"?: string;
  "2. name"?: string;
  "4. region"?: string;
  "8. currency"?: string;
}

interface AlphaVantageSearchResponse {
  bestMatches?: AlphaVantageMatch[];
  Note?: string;
  Information?: string;
}

interface AlphaVantageQuoteResponse {
  "Global Quote"?: {
    "01. symbol"?: string;
    "05. price"?: string;
    "09. change"?: string;
    "10. change percent"?: string;
  };
  Note?: string;
  Information?: string;
}

interface AlphaVantageTimeSeriesResponse {
  [key: string]: unknown;
  Note?: string;
  Information?: string;
}

export class AlphaVantageMarketDataProvider implements MarketDataProvider {
  readonly source = ALPHA_VANTAGE_SOURCE;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    const response = await this.query<AlphaVantageSearchResponse>({
      function: "SYMBOL_SEARCH",
      keywords: query
    });

    throwIfLimited(response);

    return (response.bestMatches ?? [])
      .filter((match) => match["4. region"] === "United States")
      .slice(0, 8)
      .map((match) => ({
        symbol: match["1. symbol"] ?? "",
        shortName: match["2. name"] ?? match["1. symbol"] ?? "",
        exchange: match["4. region"],
        quoteType: "EQUITY"
      }))
      .filter((match) => match.symbol.length > 0);
  }

  async getQuote(symbol: string): Promise<Quote> {
    const normalized = normalizeSymbol(symbol);
    const response = await this.query<AlphaVantageQuoteResponse>({
      function: "GLOBAL_QUOTE",
      symbol: normalized
    });

    throwIfLimited(response);

    const quote = response["Global Quote"];
    const price = Number(quote?.["05. price"]);

    if (!quote || !Number.isFinite(price)) {
      throw new Error(`No Alpha Vantage quote returned for ${normalized}.`);
    }

    return {
      symbol: quote["01. symbol"] ?? normalized,
      price,
      change: Number(quote["09. change"] ?? 0),
      changePercent: parsePercent(quote["10. change percent"]),
      source: this.source,
      timestamp: new Date().toISOString()
    };
  }

  async getCandles(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
    if (isRealtimeTimeframe(timeframe)) {
      throw new Error(`${timeframe} candles require a configured realtime WebSocket provider.`);
    }

    const normalized = normalizeSymbol(symbol);
    const isDaily = timeframe === "1d";
    const isWeekly = timeframe === "1w";
    const isMonthly = timeframe === "1mo";
    const response = await this.query<AlphaVantageTimeSeriesResponse>({
      function: isMonthly
        ? "TIME_SERIES_MONTHLY"
        : isWeekly
          ? "TIME_SERIES_WEEKLY"
          : isDaily
            ? "TIME_SERIES_DAILY"
            : "TIME_SERIES_INTRADAY",
      symbol: normalized,
      ...(isDaily || isWeekly || isMonthly
        ? { outputsize: "compact" }
        : {
            interval: alphaVantageInterval(timeframe),
            outputsize: "compact",
            adjusted: "true",
            extended_hours: "true"
          })
    });

    throwIfLimited(response);

    return parseAlphaVantageTimeSeries(response, timeframe);
  }

  async getMarketStatus(): Promise<MarketStatus> {
    return {
      isOpen: false,
      session: "closed",
      timezone: "America/New_York",
      source: `${this.source}; status computed locally in MVP`,
      timestamp: new Date().toISOString()
    };
  }

  private async query<T>(params: Record<string, string>): Promise<T> {
    const url = new URL("https://www.alphavantage.co/query");
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    url.searchParams.set("apikey", this.apiKey);

    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "trading-helper/0.1" },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Alpha Vantage request failed with HTTP ${response.status}.`);
    }

    return (await response.json()) as T;
  }
}

export function parseAlphaVantageTimeSeries(
  response: AlphaVantageTimeSeriesResponse,
  timeframe: Timeframe
): Candle[] {
  const key =
    timeframe === "1d"
      ? "Time Series (Daily)"
      : timeframe === "1w"
        ? "Weekly Time Series"
        : timeframe === "1mo"
          ? "Monthly Time Series"
      : `Time Series (${alphaVantageInterval(timeframe)})`;
  const series = response[key] as Record<string, Record<string, string>> | undefined;

  if (!series) {
    throw new Error("No Alpha Vantage time series returned.");
  }

  return Object.entries(series)
    .map(([time, values]) => ({
      timestamp: alphaVantageTimestamp(time),
      time: new Date(alphaVantageTimestamp(time)).toISOString(),
      open: Number(values["1. open"]),
      high: Number(values["2. high"]),
      low: Number(values["3. low"]),
      close: Number(values["4. close"]),
      volume: Number(values["5. volume"] ?? 0)
    }))
    .filter((candle) =>
      [candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite)
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

function throwIfLimited(response: { Note?: string; Information?: string }) {
  const message = response.Note ?? response.Information;
  if (message) {
    throw new Error(message);
  }
}

function parsePercent(value: string | undefined): number {
  return Number((value ?? "0").replace("%", ""));
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function alphaVantageInterval(timeframe: Timeframe): string {
  if (timeframe === "1h") {
    return "60min";
  }

  if (timeframe === "1d") {
    return "daily";
  }

  return timeframe.replace("m", "min");
}

function alphaVantageTimestamp(value: string): number {
  const iso = value.includes(" ") ? `${value.replace(" ", "T")}Z` : `${value}T00:00:00Z`;
  return new Date(iso).getTime();
}

export const alphaVantageSourceDescription = ALPHA_VANTAGE_SOURCE;
