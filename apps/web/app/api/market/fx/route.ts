import { NextResponse } from "next/server";

const FX_SOURCE = "Yahoo Finance public chart endpoint (unofficial, delayed/best-effort)";

interface YahooFxChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
      };
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
      timestamp?: number[];
    }>;
    error?: { description?: string } | null;
  };
}

export async function GET() {
  try {
    const response = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/KRW%3DX?range=5d&interval=1d", {
      headers: {
        Accept: "application/json",
        "User-Agent": "trading-helper/0.1"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`FX request failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as YahooFxChartResponse;
    const result = payload.chart?.result?.[0];
    const rate = result?.meta?.regularMarketPrice ?? latestClose(result?.indicators?.quote?.[0]?.close);
    const timestamp = result?.meta?.regularMarketTime
      ? new Date(result.meta.regularMarketTime * 1000).toISOString()
      : latestTimestamp(result?.timestamp);

    if (!rate) {
      throw new Error(payload.chart?.error?.description ?? "No USD/KRW rate returned.");
    }

    return NextResponse.json({
      pair: "USD/KRW",
      rate,
      timestamp,
      source: FX_SOURCE
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load USD/KRW rate." },
      { status: 502 }
    );
  }
}

function latestClose(values: Array<number | null> | undefined): number | null {
  if (!values) {
    return null;
  }

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (typeof value === "number") {
      return value;
    }
  }

  return null;
}

function latestTimestamp(values: number[] | undefined): string {
  const latest = values?.at(-1);
  return latest ? new Date(latest * 1000).toISOString() : new Date().toISOString();
}
