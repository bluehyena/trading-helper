import type { AppLocale, SignalResult } from "@trading-helper/core";

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
