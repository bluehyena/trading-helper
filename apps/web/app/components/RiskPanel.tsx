"use client";

import type { SignalResult } from "@trading-helper/core";
import { formatCurrency, formatNumber } from "../lib/format";
import type { UiMessages } from "../messages";

interface RiskPanelProps {
  labels: UiMessages["risk"];
  signal: SignalResult | null;
}

export function RiskPanel({ labels, signal }: RiskPanelProps) {
  if (!signal) {
    return <section className="panel skeleton" aria-label={labels.loading} />;
  }

  const indicators = signal.indicators;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Risk</p>
          <h2>{labels.title}</h2>
        </div>
      </div>
      <dl className="indicator-grid">
        <Metric label="VWAP" value={formatCurrency(indicators.vwap)} />
        <Metric label="EMA 9/21" value={`${formatCurrency(indicators.ema9)} / ${formatCurrency(indicators.ema21)}`} />
        <Metric label="RSI 14" value={formatNumber(indicators.rsi14)} />
        <Metric label="MACD Hist" value={formatNumber(indicators.macdHistogram, 4)} />
        <Metric label="ATR 14" value={formatCurrency(indicators.atr14)} />
        <Metric label="Rel Vol" value={`${formatNumber(indicators.relativeVolume)}x`} />
        <Metric label="Support" value={formatCurrency(indicators.support)} />
        <Metric label="Resistance" value={formatCurrency(indicators.resistance)} />
      </dl>
      <div className="warnings">
        {signal.warnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
      </div>
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
