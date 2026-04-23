"use client";

import { calculateTradeReturn, type AppLocale, type CalculatorDefaults } from "@trading-helper/core";
import { Calculator } from "lucide-react";
import { formatCurrency, formatNumber } from "../lib/format";

interface ProfitCalculatorProps {
  locale: AppLocale;
  value: CalculatorDefaults;
  onChange: (next: CalculatorDefaults) => void;
}

export function ProfitCalculator({ locale, value, onChange }: ProfitCalculatorProps) {
  const t = copy[locale];
  const result = calculateTradeReturn(value);

  function update<K extends keyof CalculatorDefaults>(key: K, nextValue: CalculatorDefaults[K]) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <section className="panel calculator-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Calculator</p>
          <h2>{t.title}</h2>
        </div>
        <Calculator size={24} aria-hidden />
      </div>
      <div className="calculator-grid">
        <label>
          {t.principal}
          <input type="number" value={value.principal} min="0" onChange={(event) => update("principal", Number(event.target.value))} />
        </label>
        <label>
          {t.direction}
          <select value={value.direction} onChange={(event) => update("direction", event.target.value === "short" ? "short" : "long")}>
            <option value="long">{t.long}</option>
            <option value="short">{t.short}</option>
          </select>
        </label>
        <label>
          {t.entry}
          <input type="number" value={value.entryPrice} min="0" step="0.01" onChange={(event) => update("entryPrice", Number(event.target.value))} />
        </label>
        <label>
          {t.takeProfit}
          <input type="number" value={value.takeProfitPrice} min="0" step="0.01" onChange={(event) => update("takeProfitPrice", Number(event.target.value))} />
        </label>
        <label>
          {t.stopLoss}
          <input type="number" value={value.stopLossPrice} min="0" step="0.01" onChange={(event) => update("stopLossPrice", Number(event.target.value))} />
        </label>
        <label>
          {t.fee}
          <input type="number" value={value.feePercent} min="0" step="0.01" onChange={(event) => update("feePercent", Number(event.target.value))} />
        </label>
        <label>
          {t.tax}
          <input type="number" value={value.taxPercent} min="0" step="0.01" onChange={(event) => update("taxPercent", Number(event.target.value))} />
        </label>
      </div>
      <dl className="calculator-results">
        <Metric label={t.shares} value={formatNumber(result.shares, 4)} />
        <Metric label={t.profitNet} value={`${formatCurrency(result.takeProfit.net)} (${formatNumber(result.takeProfit.roiPercent, 2)}%)`} />
        <Metric label={t.lossNet} value={`${formatCurrency(result.stopLoss.net)} (${formatNumber(result.stopLoss.roiPercent, 2)}%)`} />
        <Metric label={t.breakEven} value={formatCurrency(result.breakEvenPrice)} />
      </dl>
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
    title: "수익률 계산기",
    principal: "원금($)",
    direction: "방향",
    long: "롱",
    short: "숏",
    entry: "진입",
    takeProfit: "익절",
    stopLoss: "손절",
    fee: "수수료%",
    tax: "제세금%",
    shares: "수량",
    profitNet: "익절 순손익",
    lossNet: "손절 순손익",
    breakEven: "손익분기"
  },
  en: {
    title: "Return Calculator",
    principal: "Capital ($)",
    direction: "Direction",
    long: "Long",
    short: "Short",
    entry: "Entry",
    takeProfit: "Take profit",
    stopLoss: "Stop loss",
    fee: "Fee %",
    tax: "Tax %",
    shares: "Shares",
    profitNet: "TP net",
    lossNet: "SL net",
    breakEven: "Break even"
  }
} as const;
