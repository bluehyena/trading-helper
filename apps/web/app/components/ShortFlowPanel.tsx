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

  const shortRatio = snapshot.shortSaleVolume?.shortVolumeRatio;

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
        <Metric label={t.shortRatio} value={shortRatio === null || shortRatio === undefined ? "-" : `${formatNumber(shortRatio * 100, 1)}%`} />
        <Metric label={t.ftd} value={formatNumber(snapshot.failsToDeliver?.quantity, 0)} />
      </dl>
      <p className="data-note">{snapshot.warnings[0] ?? t.note}</p>
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
    title: "공매도/숏 체크",
    delayed: "지연",
    shortInterest: "숏 인터레스트",
    daysToCover: "DTC",
    shortRatio: "공매도 거래비중",
    ftd: "FTD",
    note: "공개 숏 데이터는 실시간 수급이 아니라 지연된 참고 자료입니다."
  },
  en: {
    loading: "Short data loading",
    title: "Short Data Check",
    delayed: "Delayed",
    shortInterest: "Short interest",
    daysToCover: "DTC",
    shortRatio: "Short vol ratio",
    ftd: "FTD",
    note: "Public short data is delayed context, not real-time order flow."
  }
} as const;
