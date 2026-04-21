import type {
  Candle,
  MarketDataProvider,
  MarketStatus,
  Quote,
  SymbolSearchResult,
  Timeframe
} from "../types";
import { timeframeConfig } from "./timeframes";

const YAHOO_SOURCE =
  "Yahoo Finance public endpoints (unofficial, delayed/best-effort, research-use)";

interface YahooSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  quoteType?: string;
}

interface YahooSearchResponse {
  quotes?: YahooSearchQuote[];
}

interface YahooQuoteResult {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: number;
  marketState?: string;
  fullExchangeName?: string;
  currency?: string;
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: YahooQuoteResult[];
  };
}

interface YahooChartQuote {
  open?: Array<number | null>;
  high?: Array<number | null>;
  low?: Array<number | null>;
  close?: Array<number | null>;
  volume?: Array<number | null>;
}

interface YahooChartResult {
  timestamp?: number[];
  indicators?: {
    quote?: YahooChartQuote[];
  };
}

interface YahooChartResponse {
  chart?: {
    result?: YahooChartResult[];
    error?: { description?: string } | null;
  };
}

export class YahooMarketDataProvider implements MarketDataProvider {
  readonly source = YAHOO_SOURCE;

  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
    url.searchParams.set("q", query);
    url.searchParams.set("quotesCount", "10");
    url.searchParams.set("newsCount", "0");

    const response = await fetchJson<YahooSearchResponse>(url);
    return (response.quotes ?? [])
      .filter((quote) => quote.symbol && quote.quoteType === "EQUITY")
      .slice(0, 8)
      .map((quote) => ({
        symbol: quote.symbol as string,
        shortName: quote.shortname ?? quote.longname ?? quote.symbol ?? "",
        exchange: quote.exchDisp,
        quoteType: quote.quoteType
      }));
  }

  async getQuote(symbol: string): Promise<Quote> {
    const normalized = normalizeSymbol(symbol);
    const url = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
    url.searchParams.set("symbols", normalized);

    const response = await fetchJson<YahooQuoteResponse>(url);
    const quote = response.quoteResponse?.result?.[0];
    const price = quote?.regularMarketPrice;

    if (!quote || typeof price !== "number") {
      throw new Error(`No quote returned for ${normalized}.`);
    }

    return {
      symbol: quote.symbol ?? normalized,
      name: quote.shortName ?? quote.longName,
      price,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      marketState: quote.marketState,
      exchange: quote.fullExchangeName,
      currency: quote.currency,
      source: this.source,
      timestamp: new Date((quote.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString()
    };
  }

  async getCandles(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
    const normalized = normalizeSymbol(symbol);
    const config = timeframeConfig[timeframe];
    const url = new URL(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalized)}`
    );
    url.searchParams.set("range", config.range);
    url.searchParams.set("interval", config.interval);
    url.searchParams.set("includePrePost", "true");
    url.searchParams.set("events", "div,splits");

    const response = await fetchJson<YahooChartResponse>(url);
    return parseYahooChartResponse(response, normalized);
  }

  async getMarketStatus(): Promise<MarketStatus> {
    const now = new Date();
    const session = getEasternMarketSession(now);

    return {
      isOpen: session === "regular",
      session,
      timezone: "America/New_York",
      source: "Computed from U.S. equity session hours",
      timestamp: now.toISOString()
    };
  }
}

export function parseYahooChartResponse(response: YahooChartResponse, symbol: string): Candle[] {
  const error = response.chart?.error?.description;
  if (error) {
    throw new Error(error);
  }

  const result = response.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];

  if (!quote || timestamps.length === 0) {
    throw new Error(`No candle data returned for ${symbol}.`);
  }

  return timestamps
    .map((timestamp, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];

      if (
        typeof open !== "number" ||
        typeof high !== "number" ||
        typeof low !== "number" ||
        typeof close !== "number"
      ) {
        return null;
      }

      return {
        timestamp: timestamp * 1000,
        time: new Date(timestamp * 1000).toISOString(),
        open,
        high,
        low,
        close,
        volume: quote.volume?.[index] ?? 0
      } satisfies Candle;
    })
    .filter((candle): candle is Candle => candle !== null);
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "trading-helper/0.1"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Market data request failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as T;
}

function getEasternMarketSession(date: Date): MarketStatus["session"] {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const minutes = hour * 60 + minute;

  if (weekday === "Sat" || weekday === "Sun") {
    return "closed";
  }

  if (minutes >= 4 * 60 && minutes < 9 * 60 + 30) {
    return "pre";
  }

  if (minutes >= 9 * 60 + 30 && minutes < 16 * 60) {
    return "regular";
  }

  if (minutes >= 16 * 60 && minutes < 20 * 60) {
    return "post";
  }

  return "closed";
}

export const yahooSourceDescription = YAHOO_SOURCE;
