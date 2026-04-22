"use client";

import type { AppLocale, Candle, SignalResult } from "@trading-helper/core";
import { formatNumber } from "../lib/format";

interface FlowPanelProps {
  candles: Candle[];
  locale: AppLocale;
  signal: SignalResult | null;
}

type Tone = "long" | "short" | "neutral";

export function FlowPanel({ candles, locale, signal }: FlowPanelProps) {
  if (!signal || candles.length === 0) {
    return <section className="panel skeleton" aria-label={locale === "en" ? "Demand loading" : "수급 로딩"} />;
  }

  const t = copy[locale];
  const snapshot = buildFlowSnapshot(candles, signal, locale);

  return (
    <section className={`panel flow-panel flow-${snapshot.tone}`}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Flow</p>
          <h2>{t.title}</h2>
        </div>
        <span className={`flow-badge ${snapshot.tone}`}>{t.tone[snapshot.tone]}</span>
      </div>
      <p className="flow-note">{t.note}</p>
      <dl className="flow-grid">
        {snapshot.metrics.map((metric) => (
          <div key={metric.id}>
            <dt>{t.metrics[metric.id]}</dt>
            <dd>
              {metric.value}
              <span className={`flow-dot ${metric.tone}`} aria-hidden />
            </dd>
          </div>
        ))}
      </dl>
      <div className="flow-resources">
        <p>{t.resourcesTitle}</p>
        <a href="https://www.finra.org/finra-data/browse-catalog/short-sale-volume-data/daily-short-sale-volume-files" target="_blank" rel="noreferrer">
          FINRA short volume
        </a>
        <a href="https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets" target="_blank" rel="noreferrer">
          SEC 13F
        </a>
        <a href="https://www.nasdaq.com/solutions/data/equities/short-interest" target="_blank" rel="noreferrer">
          Short interest
        </a>
      </div>
    </section>
  );
}

function buildFlowSnapshot(candles: Candle[], signal: SignalResult, locale: AppLocale) {
  const latest = candles.at(-1)!;
  const indicators = signal.indicators;
  const t = copy[locale];
  const closeLocation = rangeLocation(latest);
  const volumeImpulse = volumeRatio(candles.slice(-5), candles.slice(-25, -5));
  const obvSlope = normalizedObvSlope(candles.slice(-18));
  const aboveVwap = typeof indicators.vwap === "number" ? latest.close >= indicators.vwap : null;
  const relVol = indicators.relativeVolume;

  let score = signal.bias === "LONG" ? 10 : signal.bias === "SHORT" ? -10 : 0;
  if (typeof relVol === "number") {
    score += relVol >= 1.5 ? 18 : relVol >= 1.1 ? 8 : relVol <= 0.75 ? -8 : 0;
  }
  if (aboveVwap !== null) {
    score += aboveVwap ? 16 : -16;
  }
  score += obvSlope > 0.35 ? 16 : obvSlope < -0.35 ? -16 : 0;
  score += closeLocation > 0.68 ? 12 : closeLocation < 0.32 ? -12 : 0;
  if (typeof volumeImpulse === "number") {
    score += volumeImpulse >= 1.4 ? 12 : volumeImpulse <= 0.8 ? -6 : 0;
  }

  const tone: Tone = score >= 22 ? "long" : score <= -22 ? "short" : "neutral";

  return {
    tone,
    metrics: [
      {
        id: "relativeVolume",
        value: typeof relVol === "number" ? `${formatNumber(relVol)}x` : "-",
        tone: typeof relVol === "number" ? (relVol >= 1.2 ? "long" : relVol <= 0.75 ? "short" : "neutral") : "neutral"
      },
      {
        id: "vwap",
        value: aboveVwap === null ? "-" : aboveVwap ? t.values.above : t.values.below,
        tone: aboveVwap === null ? "neutral" : aboveVwap ? "long" : "short"
      },
      {
        id: "obv",
        value: obvSlope > 0.35 ? t.values.rising : obvSlope < -0.35 ? t.values.falling : t.values.flat,
        tone: obvSlope > 0.35 ? "long" : obvSlope < -0.35 ? "short" : "neutral"
      },
      {
        id: "closeLocation",
        value: `${formatNumber(closeLocation * 100, 0)}%`,
        tone: closeLocation > 0.68 ? "long" : closeLocation < 0.32 ? "short" : "neutral"
      },
      {
        id: "volumeImpulse",
        value: typeof volumeImpulse === "number" ? `${formatNumber(volumeImpulse)}x` : "-",
        tone: typeof volumeImpulse === "number" ? (volumeImpulse >= 1.4 ? "long" : volumeImpulse <= 0.8 ? "short" : "neutral") : "neutral"
      },
      {
        id: "setupBias",
        value: t.values.bias[signal.bias],
        tone: signal.bias === "LONG" ? "long" : signal.bias === "SHORT" ? "short" : "neutral"
      }
    ] satisfies Array<{ id: keyof (typeof copy)["en"]["metrics"]; value: string; tone: Tone }>
  };
}

function rangeLocation(candle: Candle): number {
  const range = candle.high - candle.low;
  if (range <= 0) {
    return 0.5;
  }

  return (candle.close - candle.low) / range;
}

function volumeRatio(recentCandles: Candle[], baseCandles: Candle[]): number | null {
  const recent = average(recentCandles.map((candle) => candle.volume));
  const base = average(baseCandles.map((candle) => candle.volume));
  if (!recent || !base) {
    return null;
  }

  return recent / base;
}

function normalizedObvSlope(candles: Candle[]): number {
  if (candles.length < 3) {
    return 0;
  }

  let obv = 0;
  const values = [0];
  for (let index = 1; index < candles.length; index += 1) {
    if (candles[index].close > candles[index - 1].close) {
      obv += candles[index].volume;
    } else if (candles[index].close < candles[index - 1].close) {
      obv -= candles[index].volume;
    }
    values.push(obv);
  }

  const averageVolume = average(candles.map((candle) => candle.volume)) ?? 1;
  return (values.at(-1)! - values[0]) / (averageVolume * candles.length);
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const copy = {
  ko: {
    title: "수급 체크",
    note: "기관 매수 직접 지표가 아니라, 추격매수 전에 참여 강도를 함께 보는 프록시입니다.",
    tone: {
      long: "수요 우세",
      short: "공급 우세",
      neutral: "혼조"
    },
    metrics: {
      relativeVolume: "상대거래량",
      vwap: "VWAP 위치",
      obv: "OBV 방향",
      closeLocation: "종가 위치",
      volumeImpulse: "거래량 가속",
      setupBias: "셋업 방향"
    },
    values: {
      above: "위",
      below: "아래",
      rising: "상승",
      falling: "하락",
      flat: "횡보",
      bias: {
        LONG: "롱",
        SHORT: "숏",
        NEUTRAL: "중립"
      }
    },
    resourcesTitle: "지연 공개자료"
  },
  en: {
    title: "Demand Check",
    note: "Not a direct institutional tape. These are participation proxies to check before chasing.",
    tone: {
      long: "Demand",
      short: "Supply",
      neutral: "Mixed"
    },
    metrics: {
      relativeVolume: "Rel volume",
      vwap: "VWAP position",
      obv: "OBV direction",
      closeLocation: "Close location",
      volumeImpulse: "Volume impulse",
      setupBias: "Setup bias"
    },
    values: {
      above: "Above",
      below: "Below",
      rising: "Rising",
      falling: "Falling",
      flat: "Flat",
      bias: {
        LONG: "Long",
        SHORT: "Short",
        NEUTRAL: "Neutral"
      }
    },
    resourcesTitle: "Delayed public data"
  }
} as const;
