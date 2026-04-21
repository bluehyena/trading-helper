"use client";

import { bollingerBands, ema, type AppLocale, type Candle, vwap } from "@trading-helper/core";
import { formatCurrency } from "../lib/format";
import type { UiMessages } from "../messages";

export interface IndicatorToggles {
  ema: boolean;
  vwap: boolean;
  bollinger: boolean;
}

interface CandlestickChartProps {
  candles: Candle[];
  locale: AppLocale;
  labels: UiMessages["chart"];
  toggles: IndicatorToggles;
}

const WIDTH = 960;
const HEIGHT = 420;
const PADDING = { top: 18, right: 72, bottom: 34, left: 18 };

export function CandlestickChart({ candles, locale, labels, toggles }: CandlestickChartProps) {
  const visible = candles.slice(-140);
  const closeValues = visible.map((candle) => candle.close);
  const ema9 = ema(closeValues, 9);
  const ema21 = ema(closeValues, 21);
  const vwapValues = vwap(visible);
  const bands = bollingerBands(closeValues);
  const allPrices = visible.flatMap((candle, index) => [
    candle.high,
    candle.low,
    toggles.ema ? ema9[index] : null,
    toggles.ema ? ema21[index] : null,
    toggles.vwap ? vwapValues[index] : null,
    toggles.bollinger ? bands[index]?.upper : null,
    toggles.bollinger ? bands[index]?.lower : null
  ]);
  const numericPrices = allPrices.filter((price): price is number => typeof price === "number");
  const min = Math.min(...numericPrices);
  const max = Math.max(...numericPrices);
  const pricePadding = (max - min) * 0.08 || max * 0.01;
  const yMin = min - pricePadding;
  const yMax = max + pricePadding;

  if (visible.length === 0) {
    return <div className="chart-empty">{labels.noData}</div>;
  }

  const xStep = (WIDTH - PADDING.left - PADDING.right) / Math.max(visible.length - 1, 1);
  const candleWidth = Math.max(3, Math.min(10, xStep * 0.58));

  const xFor = (index: number) => PADDING.left + index * xStep;
  const yFor = (price: number) =>
    PADDING.top +
    ((yMax - price) / (yMax - yMin)) * (HEIGHT - PADDING.top - PADDING.bottom);

  const priceTicks = buildTicks(yMin, yMax, 5);
  const timeLabels = buildTimeLabels(visible, locale);

  return (
    <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={labels.ariaLabel}>
      <rect width={WIDTH} height={HEIGHT} rx="8" className="chart-bg" />
      {priceTicks.map((tick) => (
        <g key={tick}>
          <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={yFor(tick)} y2={yFor(tick)} className="grid-line" />
          <text x={WIDTH - PADDING.right + 10} y={yFor(tick) + 4} className="axis-text">
            {formatCurrency(tick)}
          </text>
        </g>
      ))}
      {timeLabels.map((label) => (
        <text key={label.index} x={xFor(label.index)} y={HEIGHT - 12} textAnchor="middle" className="axis-text">
          {label.text}
        </text>
      ))}
      {toggles.bollinger && (
        <>
          <path d={linePath(bands.map((band) => band.upper), xFor, yFor)} className="line band-line" />
          <path d={linePath(bands.map((band) => band.lower), xFor, yFor)} className="line band-line" />
        </>
      )}
      {toggles.ema && (
        <>
          <path d={linePath(ema9, xFor, yFor)} className="line ema-fast" />
          <path d={linePath(ema21, xFor, yFor)} className="line ema-slow" />
        </>
      )}
      {toggles.vwap && <path d={linePath(vwapValues, xFor, yFor)} className="line vwap-line" />}
      {visible.map((candle, index) => {
        const x = xFor(index);
        const openY = yFor(candle.open);
        const closeY = yFor(candle.close);
        const highY = yFor(candle.high);
        const lowY = yFor(candle.low);
        const isUp = candle.close >= candle.open;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2, Math.abs(closeY - openY));

        return (
          <g key={`${candle.timestamp}-${index}`} className={isUp ? "candle up" : "candle down"}>
            <line x1={x} x2={x} y1={highY} y2={lowY} />
            <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1.5" />
          </g>
        );
      })}
    </svg>
  );
}

function linePath(
  values: Array<number | null>,
  xFor: (index: number) => number,
  yFor: (value: number) => number
): string {
  let path = "";
  values.forEach((value, index) => {
    if (value === null) {
      return;
    }

    path += `${path ? " L" : "M"} ${xFor(index).toFixed(2)} ${yFor(value).toFixed(2)}`;
  });

  return path;
}

function buildTicks(min: number, max: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => min + ((max - min) / (count - 1)) * index);
}

function buildTimeLabels(candles: Candle[], locale: AppLocale): Array<{ index: number; text: string }> {
  const indexes = [0, Math.floor(candles.length / 2), candles.length - 1];
  return indexes.map((index) => {
    const date = new Date(candles[index].time);
    return {
      index,
      text: new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date)
    };
  });
}
