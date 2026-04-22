import type { AppLocale, RealtimeTradeDirection, SignalResult, Timeframe } from "@trading-helper/core";

export type AiProviderName = "openai" | "gemini" | "local";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface MarketContext {
  symbol: string;
  quote?: {
    price: number;
    change: number;
    changePercent: number;
    marketState?: string;
    timestamp: string;
  };
  signal: SignalResult;
  realtime?: {
    enabled: boolean;
    timeframe: Timeframe;
    source?: string;
    bidPrice?: number | null;
    askPrice?: number | null;
    spread?: number | null;
    lastTradePrice?: number | null;
    lastTradeSize?: number | null;
    lastTradeDirection?: RealtimeTradeDirection;
    recentTradeCount?: number;
    warning?: string;
  };
}

export interface AiChatRequest {
  messages: ChatMessage[];
  marketContext: MarketContext;
  locale?: AppLocale;
}

export interface AiProvider {
  readonly name: AiProviderName;
  streamChat(request: AiChatRequest): AsyncIterable<string>;
}

export interface AiProviderStatus {
  openai: boolean;
  gemini: boolean;
  local: true;
}
