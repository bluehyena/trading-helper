"use client";

import type { AppLocale, RealtimeQuote, RealtimeTrade } from "@trading-helper/core";
import { formatCurrency, formatNumber } from "../lib/format";

interface TimeSalesPanelProps {
  locale: AppLocale;
  quote: RealtimeQuote | null;
  trades: RealtimeTrade[];
}

export function TimeSalesPanel({ locale, quote, trades }: TimeSalesPanelProps) {
  const t = copy[locale];
  const stats = tradeStats(trades);

  return (
    <section className="time-sales" aria-label={t.title}>
      <div className="time-sales-head">
        <div>
          <p className="eyebrow">Tape</p>
          <h3>{t.title}</h3>
        </div>
        <div className="quote-strip">
          <span>
            {t.bid} <b>{formatCurrency(quote?.bidPrice)}</b>
          </span>
          <span>
            {t.ask} <b>{formatCurrency(quote?.askPrice)}</b>
          </span>
          <span>
            {t.spread} <b>{formatCurrency(quote?.spread)}</b>
          </span>
        </div>
      </div>
      <div className="tape-summary">
        <span>
          {t.count} <b>{formatNumber(stats.count, 0)}</b>
        </span>
        <span>
          {t.buyVolume} <b>{formatNumber(stats.buyVolume, 0)}</b>
        </span>
        <span>
          {t.sellVolume} <b>{formatNumber(stats.sellVolume, 0)}</b>
        </span>
      </div>
      <div className="tape-list">
        {trades.length === 0 ? (
          <p className="helper-text">{t.empty}</p>
        ) : (
          trades.slice(0, 10).map((trade, index) => (
            <div className={`tape-row ${trade.direction?.toLowerCase() ?? "neutral"}`} key={`${trade.timestamp}-${index}`}>
              <span>{formatTapeTime(trade.timestamp, locale)}</span>
              <strong>{formatCurrency(trade.price)}</strong>
              <em>{formatNumber(trade.size, 0)}</em>
              <b>{directionLabel(trade.direction, locale)}</b>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function tradeStats(trades: RealtimeTrade[]) {
  return trades.slice(0, 20).reduce(
    (stats, trade) => {
      stats.count += 1;
      if (trade.direction === "BUY") {
        stats.buyVolume += trade.size;
      } else if (trade.direction === "SELL") {
        stats.sellVolume += trade.size;
      }
      return stats;
    },
    { count: 0, buyVolume: 0, sellVolume: 0 }
  );
}

function formatTapeTime(timestamp: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(timestamp));
}

function directionLabel(direction: RealtimeTrade["direction"], locale: AppLocale): string {
  if (locale === "en") {
    return direction === "BUY" ? "Ask hit" : direction === "SELL" ? "Bid hit" : "Mid";
  }

  return direction === "BUY" ? "매수체결" : direction === "SELL" ? "매도체결" : "중간가";
}

const copy = {
  ko: {
    title: "체결창",
    bid: "매수호가",
    ask: "매도호가",
    spread: "스프레드",
    count: "최근 체결",
    buyVolume: "매수체결량",
    sellVolume: "매도체결량",
    empty: "실시간 체결을 기다리는 중입니다."
  },
  en: {
    title: "Time & Sales",
    bid: "Bid",
    ask: "Ask",
    spread: "Spread",
    count: "Recent trades",
    buyVolume: "Ask-hit volume",
    sellVolume: "Bid-hit volume",
    empty: "Waiting for realtime trades."
  }
} as const;
