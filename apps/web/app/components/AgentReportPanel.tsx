"use client";

import type { AgentScanResult, AppLocale } from "@trading-helper/core";
import { formatNumber } from "../lib/format";

interface AgentReportPanelProps {
  locale: AppLocale;
  result: AgentScanResult | null;
  onAddFavorites: (symbols: string[]) => void;
}

export function AgentReportPanel({ locale, result, onAddFavorites }: AgentReportPanelProps) {
  const t = copy[locale];

  if (!result) {
    return null;
  }

  return (
    <section className="panel agent-report">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Agent</p>
          <h2>{result.report.title}</h2>
        </div>
        <span className="data-badge">{result.horizon}</span>
      </div>
      <p className="data-note">{result.report.summary}</p>
      <div className="agent-candidates">
        {result.candidates.map((candidate) => (
          <div key={candidate.symbol}>
            <strong>{candidate.symbol}</strong>
            <span>{candidate.bias}</span>
            <em>{formatNumber(candidate.score, 1)}</em>
          </div>
        ))}
      </div>
      {result.proposedFavorites.length > 0 && (
        <button className="small-action wide" type="button" onClick={() => onAddFavorites(result.proposedFavorites)}>
          {t.add} {result.proposedFavorites.join(", ")}
        </button>
      )}
    </section>
  );
}

const copy = {
  ko: {
    add: "즐겨찾기에 추가"
  },
  en: {
    add: "Add to favorites"
  }
} as const;
