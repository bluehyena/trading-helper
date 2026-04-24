"use client";

import type { AppLocale, ShortFlowSnapshot, SignalResult } from "@trading-helper/core";
import { formatNumber } from "../lib/format";

interface MarketPulseStripProps {
  locale: AppLocale;
  signal: SignalResult | null;
  shortFlow: ShortFlowSnapshot | null;
  isRealtime: boolean;
}

type Tone = "long" | "short" | "neutral";

export function MarketPulseStrip({ locale, signal, shortFlow, isRealtime }: MarketPulseStripProps) {
  if (!signal) {
    return null;
  }

  const t = copy[locale];
  const rsi = signal.indicators.rsi14;
  const macd = signal.indicators.macdHistogram;
  const relativeVolume = signal.indicators.relativeVolume;
  const options = signal.optionsSentiment;
  const darkPoolRatio = shortFlow?.darkPool?.atsShareOfShortVolumePercent ?? null;

  const tiles = [
    {
      label: "RSI 14",
      value: formatNumber(rsi, 1),
      meta:
        rsi === null
          ? "-"
          : rsi >= 52 && rsi <= 68
            ? t.rsi.bull
            : rsi <= 48 && rsi >= 32
              ? t.rsi.bear
              : t.rsi.neutral,
      tone: rsiTone(rsi)
    },
    {
      label: "MACD Hist",
      value: formatNumber(macd, 4),
      meta: macd === null ? "-" : macd >= 0 ? t.macd.up : t.macd.down,
      tone: macd === null ? "neutral" : macd >= 0 ? "long" : "short"
    },
    {
      label: "Rel Vol",
      value: relativeVolume === null ? "-" : `${formatNumber(relativeVolume, 2)}x`,
      meta:
        relativeVolume === null
          ? "-"
          : relativeVolume >= 1.3
            ? t.relVol.hot
            : relativeVolume <= 0.8
              ? t.relVol.cool
              : t.relVol.flat,
      tone: relativeVolume === null ? "neutral" : relativeVolume >= 1.3 ? "long" : relativeVolume <= 0.8 ? "short" : "neutral"
    },
    {
      label: locale === "en" ? "Options" : "옵션",
      value:
        options?.bias === "LONG"
          ? t.options.long
          : options?.bias === "SHORT"
            ? t.options.short
            : t.options.neutral,
      meta: options?.putCallVolumeRatio === null || options?.putCallVolumeRatio === undefined ? "PCR -" : `PCR ${formatNumber(options.putCallVolumeRatio, 2)}`,
      tone: options?.bias === "LONG" ? "long" : options?.bias === "SHORT" ? "short" : "neutral"
    },
    {
      label: locale === "en" ? "ATS / Short" : "ATS / 공매",
      value: darkPoolRatio === null ? "-" : `${formatNumber(darkPoolRatio, 1)}%`,
      meta: shortFlow?.darkPool?.tier ?? t.darkPool.meta,
      tone: "neutral" satisfies Tone
    }
  ];

  return (
    <section className="snapshot-strip" aria-label={t.title}>
      <div className="snapshot-head">
        <p className="eyebrow">{isRealtime ? t.live : t.title}</p>
        <span>{isRealtime ? t.liveNote : t.note}</span>
      </div>
      <div className="snapshot-grid">
        {tiles.map((tile) => (
          <article key={tile.label} className={`snapshot-tile ${tile.tone}`}>
            <dt>{tile.label}</dt>
            <dd>{tile.value}</dd>
            <span>{tile.meta}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function rsiTone(rsi: number | null): Tone {
  if (rsi === null) {
    return "neutral";
  }
  if (rsi >= 52 && rsi <= 68) {
    return "long";
  }
  if (rsi <= 48 && rsi >= 32) {
    return "short";
  }
  return "neutral";
}

const copy = {
  ko: {
    title: "셋업 스냅샷",
    live: "실시간 스냅샷",
    note: "현재 캔들 기준 핵심 수치를 빠르게 요약합니다.",
    liveNote: "초봉/분봉 스트림으로 RSI와 모멘텀을 즉시 재계산합니다.",
    rsi: {
      bull: "롱 구간",
      bear: "숏 구간",
      neutral: "중립"
    },
    macd: {
      up: "상방 모멘텀",
      down: "하방 모멘텀"
    },
    relVol: {
      hot: "거래량 확장",
      cool: "거래량 둔화",
      flat: "보통"
    },
    options: {
      long: "콜 우위",
      short: "풋 우위",
      neutral: "균형"
    },
    darkPool: {
      meta: "지연 ATS"
    }
  },
  en: {
    title: "Setup Snapshot",
    live: "Live Snapshot",
    note: "Quick-read values from the current chart context.",
    liveNote: "RSI and momentum are recalculated from the rolling stream candles.",
    rsi: {
      bull: "Long zone",
      bear: "Short zone",
      neutral: "Neutral"
    },
    macd: {
      up: "Positive momentum",
      down: "Negative momentum"
    },
    relVol: {
      hot: "Expanded volume",
      cool: "Thin volume",
      flat: "Normal"
    },
    options: {
      long: "Call skew",
      short: "Put skew",
      neutral: "Balanced"
    },
    darkPool: {
      meta: "Delayed ATS"
    }
  }
} as const;
