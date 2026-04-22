import {
  analyzeSignal,
  createRealtimeMarketDataProvider,
  estimateTradeDirection,
  isRealtimeTimeframe,
  POLYGON_REALTIME_SOURCE,
  RealtimeCandleAggregator,
  type AppLocale,
  type RealtimeProviderEvent,
  type RealtimeQuote,
  type RealtimeTrade
} from "@trading-helper/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = normalizeSymbol(searchParams.get("symbol") ?? "AAPL");
  const timeframe = searchParams.get("timeframe");
  const locale = toLocale(searchParams.get("locale"));

  if (!isRealtimeTimeframe(timeframe)) {
    return sseResponse((send, close) => {
      send("error", { message: "Unsupported realtime timeframe." });
      close();
    }, request.signal);
  }

  const provider = createRealtimeMarketDataProvider();
  if (!provider) {
    return sseResponse((send, close) => {
      send("error", { message: "Realtime provider is not configured. Set REALTIME_DATA_PROVIDER=polygon and POLYGON_API_KEY." });
      close();
    }, request.signal);
  }

  return sseResponse(async (send, close, signal) => {
    const aggregator = new RealtimeCandleAggregator(timeframe);
    let latestQuote: RealtimeQuote | null = null;

    send("status", {
      configured: true,
      provider: "polygon",
      source: provider.source,
      symbol,
      timeframe,
      message: "Realtime stream starting."
    });

    try {
      for await (const event of provider.streamTradesAndQuotes(symbol)) {
        if (signal.aborted) {
          break;
        }

        handleProviderEvent(event, {
          locale,
          send,
          setQuote: (quote) => {
            latestQuote = quote;
          },
          latestQuote: () => latestQuote,
          aggregator,
          symbol,
          timeframe
        });
      }
    } catch (error) {
      send("error", { message: error instanceof Error ? error.message : "Realtime stream failed." });
    } finally {
      close();
    }
  }, request.signal);
}

function handleProviderEvent(
  event: RealtimeProviderEvent,
  context: {
    locale: AppLocale;
    send: (event: string, data: unknown) => void;
    setQuote: (quote: RealtimeQuote) => void;
    latestQuote: () => RealtimeQuote | null;
    aggregator: RealtimeCandleAggregator;
    symbol: string;
    timeframe: "1s" | "5s" | "15s";
  }
) {
  if (event.type === "status") {
    context.send("status", { ...event, source: POLYGON_REALTIME_SOURCE });
    return;
  }

  if (event.type === "error") {
    context.send("error", { message: event.message });
    return;
  }

  if (event.type === "quote") {
    context.setQuote(event.quote);
    context.send("quote", event.quote);
    return;
  }

  const trade: RealtimeTrade = {
    ...event.trade,
    direction: estimateTradeDirection(event.trade, context.latestQuote())
  };
  const candle = context.aggregator.updateTrade(trade);
  const candles = context.aggregator.getCandles();
  const signal = analyzeSignal({
    symbol: context.symbol,
    timeframe: context.timeframe,
    candles,
    source: POLYGON_REALTIME_SOURCE,
    locale: context.locale
  });

  context.send("trade", trade);
  context.send("candle", candle);
  context.send("signal", {
    symbol: context.symbol,
    timeframe: context.timeframe,
    candles,
    signal,
    source: POLYGON_REALTIME_SOURCE
  });
}

function sseResponse(
  producer: (
    send: (event: string, data: unknown) => void,
    close: () => void,
    signal: AbortSignal
  ) => void | Promise<void>,
  requestSignal?: AbortSignal
) {
  let abortController: AbortController | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  const finish = (controller?: ReadableStreamDefaultController<Uint8Array>) => {
    if (closed) {
      return;
    }
    closed = true;
    if (heartbeat) {
      clearInterval(heartbeat);
    }
    abortController?.abort();
    try {
      controller?.close();
    } catch {
      // The stream may already be closed by the client.
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      abortController = new AbortController();
      requestSignal?.addEventListener("abort", () => finish(controller), { once: true });
      heartbeat = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }
      }, 15_000);

      const close = () => {
        finish(controller);
      };
      const send = (event: string, data: unknown) => {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      void Promise.resolve(producer(send, close, abortController.signal)).catch((error) => {
        send("error", { message: error instanceof Error ? error.message : "Realtime stream failed." });
        close();
      });
    },
    cancel() {
      finish();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive"
    }
  });
}

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12) || "AAPL";
}

function toLocale(value: string | null): AppLocale {
  return value === "en" ? "en" : "ko";
}
