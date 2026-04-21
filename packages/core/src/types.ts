export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "1d";

export type SignalBias = "LONG" | "SHORT" | "NEUTRAL";

export type AppLocale = "ko" | "en";

export interface Candle {
  timestamp: number;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolSearchResult {
  symbol: string;
  shortName: string;
  exchange?: string;
  quoteType?: string;
}

export interface Quote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  marketState?: string;
  exchange?: string;
  currency?: string;
  source: string;
  timestamp: string;
}

export interface MarketStatus {
  isOpen: boolean;
  session: "pre" | "regular" | "post" | "closed";
  timezone: "America/New_York";
  source: string;
  timestamp: string;
}

export interface MarketDataProvider {
  readonly source: string;
  searchSymbols(query: string): Promise<SymbolSearchResult[]>;
  getQuote(symbol: string): Promise<Quote>;
  getCandles(symbol: string, timeframe: Timeframe): Promise<Candle[]>;
  getMarketStatus(): Promise<MarketStatus>;
}

export interface IndicatorSnapshot {
  ema9: number | null;
  ema21: number | null;
  ema50: number | null;
  ema200: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  atr14: number | null;
  vwap: number | null;
  relativeVolume: number | null;
  obv: number | null;
  support: number | null;
  resistance: number | null;
  pivot: number | null;
}

export interface PriceZone {
  low: number;
  high: number;
}

export interface SignalTarget {
  label: "1R" | "2R";
  price: number;
}

export interface SignalResult {
  symbol: string;
  timeframe: Timeframe;
  bias: SignalBias;
  confidence: number;
  entryZone: PriceZone | null;
  invalidation: number | null;
  targets: SignalTarget[];
  riskReward: number | null;
  reasons: string[];
  warnings: string[];
  indicators: IndicatorSnapshot;
  dataTimestamp: string;
  source: string;
}
