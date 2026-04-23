"use client";

import type { AppLocale, MarketMoodSnapshot } from "@trading-helper/core";
import { formatNumber } from "../lib/format";

interface MarketMoodPanelProps {
  locale: AppLocale;
  mood: MarketMoodSnapshot | null;
}

export function MarketMoodPanel({ locale, mood }: MarketMoodPanelProps) {
  const t = copy[locale];

  if (!mood) {
    return <section className="panel skeleton" aria-label={t.loading} />;
  }

  return (
    <section className="panel data-panel mood-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Market Mood</p>
          <h2>{t.title}</h2>
        </div>
        <span className="mood-score">{mood.score}</span>
      </div>
      <div className="mood-meter" aria-label={`${t.score} ${mood.score}`}>
        <span style={{ width: `${mood.score}%` }} />
      </div>
      <dl className="compact-metrics">
        <Metric label={t.label} value={mood.label[locale]} />
        <Metric label="VIX" value={formatNumber(mood.vix, 2)} />
        <Metric label="Put/Call" value={formatNumber(mood.putCallRatio, 2)} />
        <Metric label="SPY/QQQ" value={`${mood.spyTrend}/${mood.qqqTrend}`} />
      </dl>
      <p className="data-note">{mood.warnings[0] ?? t.note}</p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

const copy = {
  ko: {
    loading: "시장 심리 로딩",
    title: "공포/탐욕 프록시",
    score: "점수",
    label: "분위기",
    note: "CNN 지수가 아니라 공개 데이터로 만든 참고용 프록시입니다."
  },
  en: {
    loading: "Market mood loading",
    title: "Fear/Greed Proxy",
    score: "Score",
    label: "Mood",
    note: "This is a public-data proxy, not the CNN index."
  }
} as const;
