export type Timeframe = "1s" | "5s" | "15s" | "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1w" | "1mo";

export type SignalBias = "LONG" | "SHORT" | "NEUTRAL";

export type AppLocale = "ko" | "en";

export type CandleStyle = "regular" | "heikin_ashi";

export type TradingHorizon = "scalp" | "swing";

export type MovingAverageKind = "ema" | "sma";

export type MovingAveragePeriod = 9 | 21 | 50 | 200;

export type PatternDirection = "BULLISH" | "BEARISH";

export type PatternStrength = "LOW" | "MEDIUM" | "HIGH";

export type OptionContractSide = "CALL" | "PUT";

export type DarkPoolTier = "T1" | "T2" | "OTCE";

export type OptionVolatilityRegime = "LOW" | "MEDIUM" | "HIGH";

export type OptionStrategyId =
  | "bull_call_spread"
  | "bear_put_spread"
  | "bull_put_spread"
  | "bear_call_spread"
  | "long_straddle"
  | "short_straddle"
  | "long_strangle"
  | "short_strangle"
  | "iron_condor"
  | "butterfly_spread"
  | "covered_call"
  | "protective_put";

export type OptionStrategyRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type ChartPatternId =
  | "head_and_shoulders"
  | "inverse_head_and_shoulders"
  | "bull_flag"
  | "bear_flag"
  | "bullish_pennant"
  | "bearish_pennant"
  | "ascending_triangle"
  | "descending_triangle"
  | "symmetrical_triangle"
  | "double_top"
  | "double_bottom"
  | "rising_wedge"
  | "falling_wedge";

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
  quoteType?: "EQUITY" | "ETF" | string;
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

export type RealtimeTradeDirection = "BUY" | "SELL" | "NEUTRAL";

export interface RealtimeTrade {
  symbol: string;
  price: number;
  size: number;
  exchange?: number;
  conditions?: number[];
  timestamp: string;
  direction?: RealtimeTradeDirection;
}

export interface RealtimeQuote {
  symbol: string;
  bidPrice: number | null;
  bidSize: number | null;
  askPrice: number | null;
  askSize: number | null;
  spread: number | null;
  timestamp: string;
}

export type RealtimeProviderEvent =
  | { type: "status"; status: "connecting" | "connected" | "authenticated" | "subscribed" | "closed"; message: string }
  | { type: "trade"; trade: RealtimeTrade }
  | { type: "quote"; quote: RealtimeQuote }
  | { type: "error"; message: string };

export interface RealtimeMarketDataProvider {
  readonly source: string;
  streamTradesAndQuotes(symbol: string): AsyncIterable<RealtimeProviderEvent>;
}

export interface IndicatorSnapshot {
  ema9: number | null;
  ema21: number | null;
  ema50: number | null;
  ema200: number | null;
  sma9: number | null;
  sma21: number | null;
  sma50: number | null;
  sma200: number | null;
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

export interface PatternSignal {
  id:
    | "bullish_engulfing"
    | "hammer"
    | "morning_star"
    | "three_white_soldiers"
    | "bearish_engulfing"
    | "shooting_star"
    | "evening_star"
    | "three_black_crows";
  direction: PatternDirection;
  strength: PatternStrength;
  label: {
    ko: string;
    en: string;
  };
  description: {
    ko: string;
    en: string;
  };
}

export interface ChartPatternPoint {
  timestamp: number;
  price: number;
  role: string;
}

export interface ChartPatternLevel {
  label: {
    ko: string;
    en: string;
  };
  price: number;
}

export interface ChartPatternSignal {
  id: ChartPatternId;
  direction: PatternDirection;
  strength: PatternStrength;
  label: {
    ko: string;
    en: string;
  };
  description: {
    ko: string;
    en: string;
  };
  levels: ChartPatternLevel[];
  points: ChartPatternPoint[];
}

export interface OptionFlowContract {
  contractSymbol: string;
  side: OptionContractSide;
  strike: number;
  expiration: string;
  lastPrice: number | null;
  volume: number | null;
  openInterest: number | null;
  impliedVolatility: number | null;
  inTheMoney: boolean;
  distanceFromSpotPercent: number | null;
}

export interface OptionStrategyLeg {
  asset: OptionContractSide | "STOCK";
  side: "BUY" | "SELL";
  quantity: number;
  strike: number | null;
  expiration: string | null;
  premium: number | null;
  note: {
    ko: string;
    en: string;
  };
}

export interface OptionStrategyRecommendation {
  id: OptionStrategyId;
  title: {
    ko: string;
    en: string;
  };
  summary: {
    ko: string;
    en: string;
  };
  outlook: SignalBias | "HEDGE";
  volatilityRegime: OptionVolatilityRegime;
  riskLevel: OptionStrategyRiskLevel;
  fitScore: number;
  maxProfit: number | null;
  maxProfitSummary: {
    ko: string;
    en: string;
  };
  maxLoss: number | null;
  maxLossSummary: {
    ko: string;
    en: string;
  };
  breakEvenPrices: number[];
  estimatedBuyingPower: number | null;
  estimatedBuyingPowerSummary: {
    ko: string;
    en: string;
  };
  legs: OptionStrategyLeg[];
  warnings: string[];
}

export interface OptionSentimentSnapshot {
  symbol: string;
  expiration: string | null;
  underlyingPrice: number | null;
  callVolume: number | null;
  putVolume: number | null;
  callOpenInterest: number | null;
  putOpenInterest: number | null;
  putCallVolumeRatio: number | null;
  putCallOpenInterestRatio: number | null;
  atmCallImpliedVolatility: number | null;
  atmPutImpliedVolatility: number | null;
  impliedVolatilitySkew: number | null;
  volatilityRegime: OptionVolatilityRegime;
  bias: SignalBias;
  confidence: number;
  reasons: string[];
  warnings: string[];
  nearCalls: OptionFlowContract[];
  nearPuts: OptionFlowContract[];
  strategyRecommendations: OptionStrategyRecommendation[];
  topCalls: OptionFlowContract[];
  topPuts: OptionFlowContract[];
  dataTimestamp: string;
  source: string;
}

export interface DarkPoolSnapshot {
  symbol: string;
  weekStartDate: string | null;
  tier: DarkPoolTier | null;
  totalWeeklyShares: number | null;
  totalWeeklyTrades: number | null;
  lastUpdateDate: string | null;
  atsToShortVolumeRatio: number | null;
  atsShareOfShortVolumePercent: number | null;
  warnings: string[];
  dataTimestamp: string;
  source: string;
}

export interface SignalResult {
  symbol: string;
  timeframe: Timeframe;
  horizon: TradingHorizon;
  bias: SignalBias;
  confidence: number;
  entryZone: PriceZone | null;
  invalidation: number | null;
  targets: SignalTarget[];
  riskReward: number | null;
  reasons: string[];
  warnings: string[];
  indicators: IndicatorSnapshot;
  patterns: PatternSignal[];
  chartPatterns: ChartPatternSignal[];
  optionsSentiment?: OptionSentimentSnapshot | null;
  dataTimestamp: string;
  source: string;
}

export interface FavoriteSymbol {
  symbol: string;
  name?: string;
  addedAt: string;
}

export interface ScannerRankReason {
  label: string;
  weight: number;
}

export interface ScannerResult {
  symbol: string;
  timeframe: Timeframe;
  horizon: TradingHorizon;
  price: number;
  bias: SignalBias;
  confidence: number;
  score: number;
  entryZone: PriceZone | null;
  invalidation: number | null;
  targets: SignalTarget[];
  keyReason: string;
  dataAgeMinutes: number | null;
  patterns: PatternSignal[];
  chartPatterns: ChartPatternSignal[];
  rankReasons: ScannerRankReason[];
  signal: SignalResult;
}

export interface ShortInterestRecord {
  symbol: string;
  settlementDate: string;
  shortInterest: number | null;
  averageDailyVolume: number | null;
  daysToCover: number | null;
  source: string;
}

export interface ShortSaleVolumeRecord {
  symbol: string;
  date: string;
  shortVolume: number | null;
  totalVolume: number | null;
  shortExemptVolume: number | null;
  shortVolumeRatio: number | null;
  source: string;
}

export interface FailsToDeliverRecord {
  symbol: string;
  settlementDate: string;
  quantity: number | null;
  price: number | null;
  source: string;
}

export interface ShortFlowSnapshot {
  symbol: string;
  shortInterest: ShortInterestRecord | null;
  shortSaleVolume: ShortSaleVolumeRecord | null;
  failsToDeliver: FailsToDeliverRecord | null;
  darkPool: DarkPoolSnapshot | null;
  warnings: string[];
  dataTimestamp: string;
  source: string;
}

export interface MarketMoodSnapshot {
  score: number;
  label: {
    ko: string;
    en: string;
  };
  vix: number | null;
  putCallRatio: number | null;
  spyTrend: SignalBias;
  qqqTrend: SignalBias;
  warnings: string[];
  dataTimestamp: string;
  source: string;
}

export type AiActionProposal =
  | {
      id: string;
      type: "add_favorite" | "remove_favorite" | "set_symbol";
      symbol: string;
      label: {
        ko: string;
        en: string;
      };
    }
  | {
      id: string;
      type: "set_timeframe";
      timeframe: Timeframe;
      label: {
        ko: string;
        en: string;
      };
    }
  | {
      id: string;
      type: "set_horizon";
      horizon: TradingHorizon;
      label: {
        ko: string;
        en: string;
      };
    }
  | {
      id: string;
      type: "run_agent_scan";
      horizon: TradingHorizon;
      label: {
        ko: string;
        en: string;
      };
    };

export interface AgentReport {
  title: string;
  summary: string;
  warnings: string[];
  generatedAt: string;
}

export interface AgentScanResult {
  horizon: TradingHorizon;
  candidates: ScannerResult[];
  report: AgentReport;
  proposedFavorites: string[];
  mood: MarketMoodSnapshot;
}

export interface ChartPreferences {
  candleStyle: CandleStyle;
  showOverlays: boolean;
  movingAverageKind: MovingAverageKind;
  movingAveragePeriods: Record<MovingAveragePeriod, boolean>;
  vwap: boolean;
  bollinger: boolean;
}

export interface CalculatorDefaults {
  principal: number;
  feePercent: number;
  taxPercent: number;
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  direction: "long" | "short";
}

export interface UserState {
  locale: AppLocale;
  favorites: string[];
  lastSymbol: string;
  timeframe: Timeframe;
  horizon: TradingHorizon;
  chart: ChartPreferences;
  calculator: CalculatorDefaults;
  updatedAt: string;
}

export interface TradeReturnInput extends CalculatorDefaults {}

export interface TradeReturnScenario {
  exitPrice: number;
  gross: number;
  fees: number;
  taxes: number;
  net: number;
  roiPercent: number;
}

export interface TradeReturnResult {
  shares: number;
  takeProfit: TradeReturnScenario;
  stopLoss: TradeReturnScenario;
  breakEvenPrice: number;
}
