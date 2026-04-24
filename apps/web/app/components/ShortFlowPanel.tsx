"use client";

import type { AppLocale, ShortFlowSnapshot } from "@trading-helper/core";
import { formatNumber } from "../lib/format";

interface ShortFlowPanelProps {
  locale: AppLocale;
  snapshot: ShortFlowSnapshot | null;
}

export function ShortFlowPanel({ locale, snapshot }: ShortFlowPanelProps) {
  const t = copy[locale];

  if (!snapshot) {
    return <section className="panel skeleton" aria-label={t.loading} />;
  }

  const shortRatio = snapshot.shortSaleVolume?.shortVolumeRatio ?? null;
  const darkPoolRatio = snapshot.darkPool?.atsShareOfShortVolumePercent ?? null;

  return (
    <section className="panel data-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Short Flow</p>
          <h2>{t.title}</h2>
        </div>
        <span className="data-badge">{t.delayed}</span>
      </div>
      <dl className="compact-metrics">
        <Metric label={t.shortInterest} value={formatNumber(snapshot.shortInterest?.shortInterest, 0)} />
        <Metric label={t.daysToCover} value={formatNumber(snapshot.shortInterest?.daysToCover, 2)} />
        <Metric label={t.shortRatio} value={shortRatio === null ? "-" : `${formatNumber(shortRatio * 100, 1)}%`} />
        <Metric label={t.ftd} value={formatNumber(snapshot.failsToDeliver?.quantity, 0)} />
        <Metric label={t.darkPoolShares} value={formatNumber(snapshot.darkPool?.totalWeeklyShares, 0)} />
        <Metric label={t.darkPoolTrades} value={formatNumber(snapshot.darkPool?.totalWeeklyTrades, 0)} />
        <Metric label={t.darkPoolTier} value={snapshot.darkPool?.tier ?? "-"} />
        <Metric label={t.darkPoolVsShort} value={darkPoolRatio === null ? "-" : `${formatNumber(darkPoolRatio, 1)}%`} />
      </dl>
      <p className="data-note">{snapshot.darkPool?.warnings[1] ?? snapshot.warnings[0] ?? t.note}</p>
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
    loading: "숏 데이터 로딩",
    title: "공매도 체크",
    delayed: "지연",
    shortInterest: "숏 인터레스트",
    daysToCover: "DTC",
    shortRatio: "공매도 거래비중",
    ftd: "FTD",
    darkPoolShares: "ATS 주간 수량",
    darkPoolTrades: "ATS 주간 체결",
    darkPoolTier: "FINRA 티어",
    darkPoolVsShort: "ATS / 공매 비율",
    note: "공개 숏 데이터와 다크풀 ATS 데이터는 모두 지연 자료이며 실시간 주문 흐름이 아닙니다."
  },
  en: {
    loading: "Short data loading",
    title: "Short Data Check",
    delayed: "Delayed",
    shortInterest: "Short interest",
    daysToCover: "DTC",
    shortRatio: "Short vol ratio",
    ftd: "FTD",
    darkPoolShares: "ATS weekly shares",
    darkPoolTrades: "ATS weekly trades",
    darkPoolTier: "FINRA tier",
    darkPoolVsShort: "ATS / short volume",
    note: "Public short-flow and ATS dark-pool data is delayed context, not real-time order flow."
  }
} as const;
