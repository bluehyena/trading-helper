"use client";

import type { AppLocale, PatternDirection, SignalResult } from "@trading-helper/core";
import { Activity, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, formatDateTime } from "../lib/format";
import type { UiMessages } from "../messages";

interface SignalCardProps {
  locale: AppLocale;
  labels: UiMessages["signal"];
  signal: SignalResult | null;
}

export function SignalCard({ locale, labels, signal }: SignalCardProps) {
  if (!signal) {
    return <section className="panel skeleton" aria-label={labels.loading} />;
  }

  const Icon = signal.bias === "LONG" ? TrendingUp : signal.bias === "SHORT" ? TrendingDown : Activity;

  return (
    <section className={`panel signal signal-${signal.bias.toLowerCase()}`}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">{labels.title}</p>
          <h2>{labels.bias[signal.bias]}</h2>
        </div>
        <Icon size={30} aria-hidden />
      </div>
      <div className="confidence">
        <span>{signal.confidence}%</span>
        <div className="confidence-track">
          <div style={{ width: `${signal.confidence}%` }} />
        </div>
      </div>
      <dl className="metric-grid">
        <div>
          <dt>{labels.entry}</dt>
          <dd>
            {signal.entryZone
              ? `${formatCurrency(signal.entryZone.low)} ~ ${formatCurrency(signal.entryZone.high)}`
              : labels.wait}
          </dd>
        </div>
        <div>
          <dt>{labels.invalidation}</dt>
          <dd>{formatCurrency(signal.invalidation)}</dd>
        </div>
        <div>
          <dt>{labels.target}</dt>
          <dd>{signal.targets.map((target) => `${target.label} ${formatCurrency(target.price)}`).join(" / ") || "-"}</dd>
        </div>
        <div>
          <dt>{labels.data}</dt>
          <dd>{formatDateTime(signal.dataTimestamp, locale)}</dd>
        </div>
      </dl>
      <div className="reason-list">
        {signal.patterns.length > 0 && (
          <p className="pattern-summary">
            {signal.patterns.map((pattern) => (
              <span className="pattern-token" key={pattern.id}>
                <span className="pattern-name">{pattern.label[locale]}</span>
                <span className={`pattern-direction ${pattern.direction === "BULLISH" ? "long" : "short"}`}>
                  {directionLabel(pattern.direction, locale)}
                </span>
              </span>
            ))}
          </p>
        )}
        {signal.chartPatterns.length > 0 && (
          <p className="pattern-summary">
            {signal.chartPatterns.map((pattern) => (
              <span className="pattern-token" key={pattern.id}>
                <span className="pattern-name">{pattern.label[locale]}</span>
                <span className={`pattern-direction ${pattern.direction === "BULLISH" ? "long" : "short"}`}>
                  {directionLabel(pattern.direction, locale)}
                </span>
              </span>
            ))}
          </p>
        )}
        {signal.reasons.slice(0, 4).map((reason) => (
          <p key={reason}>{reason}</p>
        ))}
      </div>
      {signal.warnings.length > 0 && (
        <div className="warning-list">
          <ShieldAlert size={16} aria-hidden />
          <span>{signal.warnings[0]}</span>
        </div>
      )}
    </section>
  );
}

function directionLabel(direction: PatternDirection, locale: AppLocale): string {
  if (locale === "en") {
    return direction === "BULLISH" ? "Long watch" : "Short watch";
  }

  return direction === "BULLISH" ? "롱 관찰" : "숏 관찰";
}
