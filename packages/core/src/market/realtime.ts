import type {
  Candle,
  RealtimeMarketDataProvider,
  RealtimeProviderEvent,
  RealtimeQuote,
  RealtimeTrade,
  Timeframe
} from "../types";
import { isRealtimeTimeframe, realtimeRollingLimit, timeframeSeconds } from "./timeframes";

export const POLYGON_REALTIME_SOURCE = "Polygon/Massive WebSocket (BYOK; entitlement-dependent real-time/delayed feed)";

interface PolygonStatusEvent {
  ev?: "status";
  status?: string;
  message?: string;
}

interface PolygonTradeEvent {
  ev?: "T";
  sym?: string;
  x?: number;
  p?: number;
  s?: number;
  c?: number[];
  t?: number;
}

interface PolygonQuoteEvent {
  ev?: "Q";
  sym?: string;
  bp?: number;
  bs?: number;
  ap?: number;
  as?: number;
  t?: number;
}

type PolygonEvent = PolygonStatusEvent | PolygonTradeEvent | PolygonQuoteEvent;

export class RealtimeCandleAggregator {
  private readonly bucketMs: number;
  private readonly limit: number;
  private readonly candles: Candle[] = [];

  constructor(timeframe: Timeframe) {
    if (!isRealtimeTimeframe(timeframe)) {
      throw new Error(`Realtime candle aggregation does not support ${timeframe}.`);
    }

    this.bucketMs = timeframeSeconds(timeframe) * 1000;
    this.limit = realtimeRollingLimit(timeframe);
  }

  updateTrade(trade: RealtimeTrade): Candle {
    const timestamp = new Date(trade.timestamp).getTime();
    const bucketStart = Math.floor(timestamp / this.bucketMs) * this.bucketMs;
    const latest = this.candles.at(-1);

    if (latest && latest.timestamp === bucketStart) {
      latest.high = Math.max(latest.high, trade.price);
      latest.low = Math.min(latest.low, trade.price);
      latest.close = trade.price;
      latest.volume += trade.size;
      return latest;
    }

    const candle: Candle = {
      timestamp: bucketStart,
      time: new Date(bucketStart).toISOString(),
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: trade.size
    };
    this.candles.push(candle);

    if (this.candles.length > this.limit) {
      this.candles.splice(0, this.candles.length - this.limit);
    }

    return candle;
  }

  getCandles(): Candle[] {
    return this.candles.map((candle) => ({ ...candle }));
  }
}

export function upsertRollingCandle(candles: Candle[], candle: Candle, limit: number): Candle[] {
  const next = [...candles];
  const index = next.findIndex((item) => item.timestamp === candle.timestamp);

  if (index >= 0) {
    next[index] = candle;
  } else {
    next.push(candle);
  }

  next.sort((a, b) => a.timestamp - b.timestamp);
  return next.slice(Math.max(0, next.length - limit));
}

export function calculateSpread(quote: Pick<RealtimeQuote, "bidPrice" | "askPrice">): number | null {
  if (typeof quote.bidPrice !== "number" || typeof quote.askPrice !== "number") {
    return null;
  }

  return Math.max(0, quote.askPrice - quote.bidPrice);
}

export function estimateTradeDirection(trade: RealtimeTrade, quote: RealtimeQuote | null): RealtimeTrade["direction"] {
  if (!quote || typeof quote.askPrice !== "number" || typeof quote.bidPrice !== "number") {
    return "NEUTRAL";
  }

  if (trade.price >= quote.askPrice) {
    return "BUY";
  }

  if (trade.price <= quote.bidPrice) {
    return "SELL";
  }

  return "NEUTRAL";
}

export function parsePolygonEvents(raw: string): RealtimeProviderEvent[] {
  const parsed = JSON.parse(raw) as PolygonEvent | PolygonEvent[];
  const events = Array.isArray(parsed) ? parsed : [parsed];
  return events.flatMap((event) => parsePolygonEvent(event));
}

export class PolygonRealtimeMarketDataProvider implements RealtimeMarketDataProvider {
  readonly source = POLYGON_REALTIME_SOURCE;

  constructor(
    private readonly apiKey: string,
    private readonly url = "wss://socket.polygon.io/stocks"
  ) {}

  async *streamTradesAndQuotes(symbol: string): AsyncIterable<RealtimeProviderEvent> {
    const normalized = symbol.trim().toUpperCase();
    const queue: RealtimeProviderEvent[] = [{ type: "status", status: "connecting", message: "Connecting to Polygon/Massive." }];
    const waiters: Array<() => void> = [];
    let closed = false;
    let authenticated = false;

    const notify = () => {
      const waiter = waiters.shift();
      waiter?.();
    };
    const enqueue = (event: RealtimeProviderEvent) => {
      queue.push(event);
      notify();
    };

    const socket = new WebSocket(this.url);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ action: "auth", params: this.apiKey }));
    });
    socket.addEventListener("message", (message) => {
      try {
        const events = parsePolygonEvents(String(message.data));
        for (const event of events) {
          enqueue(event);
          if (
            event.type === "status" &&
            !authenticated &&
            (event.status === "authenticated" || event.message.toLowerCase().includes("authenticated"))
          ) {
            authenticated = true;
            socket.send(JSON.stringify({ action: "subscribe", params: `T.${normalized},Q.${normalized}` }));
            enqueue({ type: "status", status: "subscribed", message: `Subscribed to ${normalized} trades and quotes.` });
          }
        }
      } catch (error) {
        enqueue({ type: "error", message: error instanceof Error ? error.message : "Failed to parse Polygon/Massive event." });
      }
    });
    socket.addEventListener("error", () => enqueue({ type: "error", message: "Polygon/Massive WebSocket error." }));
    socket.addEventListener("close", () => {
      closed = true;
      enqueue({ type: "status", status: "closed", message: "Realtime stream closed." });
    });

    try {
      while (!closed || queue.length > 0) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => waiters.push(resolve));
          continue;
        }

        yield queue.shift()!;
      }
    } finally {
      closed = true;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      notify();
    }
  }
}

export function createRealtimeMarketDataProvider(env: NodeJS.ProcessEnv = process.env): RealtimeMarketDataProvider | null {
  if ((env.REALTIME_DATA_PROVIDER ?? "polygon") !== "polygon") {
    return null;
  }

  if (!env.POLYGON_API_KEY) {
    return null;
  }

  return new PolygonRealtimeMarketDataProvider(env.POLYGON_API_KEY);
}

function parsePolygonEvent(event: PolygonEvent): RealtimeProviderEvent[] {
  if (event.ev === "status") {
    return [
      {
        type: event.status === "error" ? "error" : "status",
        ...(event.status === "error"
          ? { message: event.message ?? "Polygon/Massive status error." }
          : {
              status: statusFromPolygon(event.status, event.message),
              message: event.message ?? event.status ?? "Polygon/Massive status update."
            })
      } as RealtimeProviderEvent
    ];
  }

  if (event.ev === "T" && typeof event.sym === "string" && typeof event.p === "number" && typeof event.s === "number") {
    return [
      {
        type: "trade",
        trade: {
          symbol: event.sym,
          price: event.p,
          size: event.s,
          exchange: event.x,
          conditions: event.c,
          timestamp: new Date(event.t ?? Date.now()).toISOString()
        }
      }
    ];
  }

  if (event.ev === "Q" && typeof event.sym === "string") {
    const quote: RealtimeQuote = {
      symbol: event.sym,
      bidPrice: typeof event.bp === "number" ? event.bp : null,
      bidSize: typeof event.bs === "number" ? event.bs : null,
      askPrice: typeof event.ap === "number" ? event.ap : null,
      askSize: typeof event.as === "number" ? event.as : null,
      spread: null,
      timestamp: new Date(event.t ?? Date.now()).toISOString()
    };
    quote.spread = calculateSpread(quote);
    return [{ type: "quote", quote }];
  }

  return [];
}

function statusFromPolygon(status?: string, message?: string): Extract<RealtimeProviderEvent, { type: "status" }>["status"] {
  const value = `${status ?? ""} ${message ?? ""}`.toLowerCase();
  if (value.includes("auth")) {
    return "authenticated";
  }

  if (value.includes("connect")) {
    return "connected";
  }

  return "connected";
}
