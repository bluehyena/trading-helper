"use client";

import type { AppLocale, OptionSentimentSnapshot } from "@trading-helper/core";
import { formatCurrency, formatNumber } from "../lib/format";

interface OptionsPanelProps {
  locale: AppLocale;
  snapshot: OptionSentimentSnapshot | null;
}

export function OptionsPanel({ locale, snapshot }: OptionsPanelProps) {
  const t = copy[locale];

  if (!snapshot) {
    return <section className="panel skeleton" aria-label={t.loading} />;
  }

  const biasTone = toneFromBias(snapshot.bias);

  return (
    <section className="panel data-panel options-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Options Pulse</p>
          <h2>{t.title}</h2>
        </div>
        <span className={`flow-badge ${biasTone}`}>{t.bias[snapshot.bias]}</span>
      </div>
      <dl className="compact-metrics">
        <Metric label={t.expiration} value={formatDate(snapshot.expiration, locale)} />
        <Metric label={t.confidence} value={`${snapshot.confidence}%`} />
        <Metric label={t.putCallVolume} value={formatNumber(snapshot.putCallVolumeRatio, 2)} />
        <Metric label={t.putCallOi} value={formatNumber(snapshot.putCallOpenInterestRatio, 2)} />
        <Metric label={t.callVolume} value={formatNumber(snapshot.callVolume, 0)} />
        <Metric label={t.putVolume} value={formatNumber(snapshot.putVolume, 0)} />
        <Metric label={t.callOi} value={formatNumber(snapshot.callOpenInterest, 0)} />
        <Metric label={t.putOi} value={formatNumber(snapshot.putOpenInterest, 0)} />
        <Metric label={t.callIv} value={formatPercentish(snapshot.atmCallImpliedVolatility)} />
        <Metric label={t.putIv} value={formatPercentish(snapshot.atmPutImpliedVolatility)} />
        <Metric label={t.ivSkew} value={formatNumber(snapshot.impliedVolatilitySkew, 3)} />
        <Metric label={t.spot} value={formatCurrency(snapshot.underlyingPrice)} />
      </dl>
      <div className="options-lists">
        <OptionList contracts={snapshot.topCalls} locale={locale} title={t.topCalls} />
        <OptionList contracts={snapshot.topPuts} locale={locale} title={t.topPuts} />
      </div>
      {snapshot.strategyRecommendations.length > 0 && (
        <div className="strategy-helper">
          <div className="panel-head compact-inline">
            <div>
              <p className="eyebrow">Strategy Helper</p>
              <h3>{t.strategyTitle}</h3>
            </div>
            <span className="data-badge subtle">{snapshot.volatilityRegime}</span>
          </div>
          <div className="strategy-list">
            {snapshot.strategyRecommendations.slice(0, 3).map((strategy) => (
              <article key={strategy.id} className="strategy-card">
                <div className="strategy-card-top">
                  <div>
                    <strong>{strategy.title[locale]}</strong>
                    <span>{strategy.summary[locale]}</span>
                  </div>
                  <div className="strategy-meta">
                    <span className={`flow-badge ${toneFromOutlook(strategy.outlook)}`}>{outlookLabel(strategy.outlook, locale)}</span>
                    <em>{t.fit} {strategy.fitScore}</em>
                  </div>
                </div>
                <dl className="strategy-metrics">
                  <div>
                    <dt>{t.maxProfit}</dt>
                    <dd>{strategy.maxProfit === null ? t.open : formatCurrency(strategy.maxProfit)}</dd>
                  </div>
                  <div>
                    <dt>{t.maxLoss}</dt>
                    <dd>{strategy.maxLoss === null ? t.open : formatCurrency(strategy.maxLoss)}</dd>
                  </div>
                  <div>
                    <dt>{t.breakEven}</dt>
                    <dd>{formatBreakEvens(strategy.breakEvenPrices)}</dd>
                  </div>
                  <div>
                    <dt>{t.buyingPower}</dt>
                    <dd>{strategy.estimatedBuyingPower === null ? t.brokerRule : formatCurrency(strategy.estimatedBuyingPower)}</dd>
                  </div>
                </dl>
                <div className="strategy-legs">
                  {strategy.legs.map((leg, index) => (
                    <div key={`${strategy.id}-${leg.asset}-${index}`}>
                      <b>{leg.side}</b>
                      <span>
                        {leg.asset === "STOCK" ? `${leg.quantity}x STOCK` : `${leg.quantity}x ${leg.asset} ${formatCurrency(leg.strike)}`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="data-note">{strategy.maxLossSummary[locale]}</p>
              </article>
            ))}
          </div>
        </div>
      )}
      <div className="reason-list compact">
        {(snapshot.reasons.length > 0 ? snapshot.reasons : [t.noEdge]).slice(0, 2).map((reason) => (
          <p key={reason}>{reason}</p>
        ))}
      </div>
      <p className="data-note">{snapshot.warnings[0] ?? t.note}</p>
    </section>
  );
}

function OptionList({
  title,
  contracts,
  locale
}: {
  title: string;
  contracts: OptionSentimentSnapshot["topCalls"];
  locale: AppLocale;
}) {
  return (
    <div className="option-list-card">
      <p>{title}</p>
      {contracts.length === 0 ? (
        <span className="helper-text">{locale === "en" ? "No contracts" : "계약 없음"}</span>
      ) : (
        contracts.map((contract) => (
          <div key={contract.contractSymbol} className="option-contract-row">
            <strong>{formatCurrency(contract.strike)}</strong>
            <span>Vol {formatNumber(contract.volume, 0)}</span>
            <span>OI {formatNumber(contract.openInterest, 0)}</span>
            <span>IV {formatPercentish(contract.impliedVolatility)}</span>
          </div>
        ))
      )}
    </div>
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

function toneFromBias(bias: OptionSentimentSnapshot["bias"]): "long" | "short" | "neutral" {
  if (bias === "LONG") {
    return "long";
  }
  if (bias === "SHORT") {
    return "short";
  }
  return "neutral";
}

function toneFromOutlook(outlook: OptionSentimentSnapshot["bias"] | "HEDGE"): "long" | "short" | "neutral" {
  if (outlook === "LONG") {
    return "long";
  }
  if (outlook === "SHORT") {
    return "short";
  }
  return "neutral";
}

function outlookLabel(outlook: OptionSentimentSnapshot["bias"] | "HEDGE", locale: AppLocale): string {
  if (locale === "en") {
    if (outlook === "LONG") {
      return "Bullish";
    }
    if (outlook === "SHORT") {
      return "Bearish";
    }
    if (outlook === "HEDGE") {
      return "Hedge";
    }
    return "Neutral";
  }

  if (outlook === "LONG") {
    return "강세";
  }
  if (outlook === "SHORT") {
    return "약세";
  }
  if (outlook === "HEDGE") {
    return "헤지";
  }
  return "중립";
}

function formatBreakEvens(values: number[]): string {
  if (values.length === 0) {
    return "-";
  }

  return values.map((value) => formatCurrency(value)).join(" / ");
}

function formatDate(value: string | null, locale: AppLocale): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function formatPercentish(value: number | null | undefined): string {
  return typeof value === "number" ? `${formatNumber(value * 100, 1)}%` : "-";
}

const copy = {
  ko: {
    loading: "옵션 데이터 로딩",
    title: "옵션 체인 편향",
    expiration: "근월물 만기",
    confidence: "옵션 신뢰도",
    putCallVolume: "풋/콜 거래량",
    putCallOi: "풋/콜 OI",
    callVolume: "콜 거래량",
    putVolume: "풋 거래량",
    callOi: "콜 OI",
    putOi: "풋 OI",
    callIv: "ATM 콜 IV",
    putIv: "ATM 풋 IV",
    ivSkew: "IV 스큐",
    spot: "기초자산 가격",
    topCalls: "주요 콜",
    topPuts: "주요 풋",
    strategyTitle: "옵션 전략 추천",
    fit: "적합도",
    maxProfit: "최대 이익",
    maxLoss: "최대 손실",
    breakEven: "손익분기",
    buyingPower: "필요 자본",
    open: "열려 있음",
    brokerRule: "브로커 규칙",
    noEdge: "옵션 체인에서 강한 방향 쏠림이 아직 확인되지 않았습니다.",
    note: "옵션 체인은 지연 데이터이며 신호 보조 자료로만 사용해야 합니다.",
    bias: {
      LONG: "콜 우위",
      SHORT: "풋 우위",
      NEUTRAL: "중립"
    }
  },
  en: {
    loading: "Options data loading",
    title: "Front Expiry Options",
    expiration: "Front expiry",
    confidence: "Options confidence",
    putCallVolume: "Put/call volume",
    putCallOi: "Put/call OI",
    callVolume: "Call volume",
    putVolume: "Put volume",
    callOi: "Call OI",
    putOi: "Put OI",
    callIv: "ATM call IV",
    putIv: "ATM put IV",
    ivSkew: "IV skew",
    spot: "Spot price",
    topCalls: "Top calls",
    topPuts: "Top puts",
    strategyTitle: "Recommended Strategies",
    fit: "Fit",
    maxProfit: "Max profit",
    maxLoss: "Max loss",
    breakEven: "Break-even",
    buyingPower: "Buying power",
    open: "Open-ended",
    brokerRule: "Broker rule",
    noEdge: "No strong options-chain imbalance is visible yet.",
    note: "Options chain data is delayed context and should be treated as analysis support only.",
    bias: {
      LONG: "Call skew",
      SHORT: "Put skew",
      NEUTRAL: "Balanced"
    }
  }
} as const;
