"use client";

import {
  bollingerBands,
  ema,
  toHeikinAshi,
  type AppLocale,
  type Candle,
  type CandleStyle,
  type SignalResult,
  vwap
} from "@trading-helper/core";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useState, type PointerEvent, type WheelEvent } from "react";
import { formatCurrency } from "../lib/format";
import type { UiMessages } from "../messages";

export interface IndicatorToggles {
  ema: boolean;
  vwap: boolean;
  bollinger: boolean;
}

interface CandlestickChartProps {
  candles: Candle[];
  candleStyle: CandleStyle;
  locale: AppLocale;
  labels: UiMessages["chart"];
  signal?: SignalResult;
  showOverlays: boolean;
  toggles: IndicatorToggles;
}

const WIDTH = 960;
const HEIGHT = 420;
const PADDING = { top: 18, right: 72, bottom: 34, left: 18 };
const PRICE_HEIGHT = 318;
const VOLUME_TOP = 340;
const VOLUME_HEIGHT = 48;
const DEFAULT_VISIBLE_COUNT = 140;
const MIN_VISIBLE_COUNT = 24;
const ZOOM_STEP = 0.16;

export function CandlestickChart({ candles, candleStyle, locale, labels, signal, showOverlays, toggles }: CandlestickChartProps) {
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);
  const [offsetFromEnd, setOffsetFromEnd] = useState(0);
  const [dragStart, setDragStart] = useState<{ x: number; offset: number } | null>(null);
  const maxVisibleCount = Math.max(MIN_VISIBLE_COUNT, candles.length);
  const boundedVisibleCount = clamp(visibleCount, MIN_VISIBLE_COUNT, maxVisibleCount);
  const maxOffset = Math.max(0, candles.length - boundedVisibleCount);
  const boundedOffset = clamp(offsetFromEnd, 0, maxOffset);
  const end = Math.max(0, candles.length - boundedOffset);
  const start = Math.max(0, end - boundedVisibleCount);
  const displayCandles = candleStyle === "heikin_ashi" ? toHeikinAshi(candles) : candles;
  const regularVisible = candles.slice(start, end);
  const visible = displayCandles.slice(start, end);
  const closeValues = regularVisible.map((candle) => candle.close);
  const ema9 = ema(closeValues, 9);
  const ema21 = ema(closeValues, 21);
  const vwapValues = vwap(regularVisible);
  const bands = bollingerBands(closeValues);
  const overlayPrices = showOverlays && signal ? overlayPriceValues(signal) : [];
  const allPrices = visible.flatMap((candle, index) => [
    candle.high,
    candle.low,
    toggles.ema ? ema9[index] : null,
    toggles.ema ? ema21[index] : null,
    toggles.vwap ? vwapValues[index] : null,
    toggles.bollinger ? bands[index]?.upper : null,
    toggles.bollinger ? bands[index]?.lower : null
  ]).concat(overlayPrices);
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
  const yFor = (price: number) => PADDING.top + ((yMax - price) / (yMax - yMin)) * PRICE_HEIGHT;
  const maxVolume = Math.max(...regularVisible.map((candle) => candle.volume), 1);

  const priceTicks = buildTicks(yMin, yMax, 5);
  const timeLabels = buildTimeLabels(visible, locale);

  function zoom(direction: "in" | "out") {
    const multiplier = direction === "in" ? 1 - ZOOM_STEP : 1 + ZOOM_STEP;
    const nextCount = clamp(Math.round(boundedVisibleCount * multiplier), MIN_VISIBLE_COUNT, maxVisibleCount);
    setVisibleCount(nextCount);
    setOffsetFromEnd((current) => clamp(current, 0, Math.max(0, candles.length - nextCount)));
  }

  function resetZoom() {
    setVisibleCount(DEFAULT_VISIBLE_COUNT);
    setOffsetFromEnd(0);
  }

  function pan(candlesToMove: number) {
    setOffsetFromEnd((current) => clamp(current + candlesToMove, 0, Math.max(0, candles.length - boundedVisibleCount)));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();

    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const direction = Math.sign(event.deltaX || event.deltaY);
      pan(direction * Math.max(1, Math.round(boundedVisibleCount * 0.04)));
      return;
    }

    zoom(event.deltaY < 0 ? "in" : "out");
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({ x: event.clientX, offset: boundedOffset });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart) {
      return;
    }

    const candleDelta = Math.round((event.clientX - dragStart.x) / Math.max(xStep, 1));
    setOffsetFromEnd(clamp(dragStart.offset + candleDelta, 0, maxOffset));
  }

  function handlePointerEnd() {
    setDragStart(null);
  }

  return (
    <div
      className={dragStart ? "chart-frame dragging" : "chart-frame"}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="chart-controls" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => zoom("in")} aria-label={labels.zoomIn} title={labels.zoomIn}>
          <ZoomIn size={17} aria-hidden />
        </button>
        <button type="button" onClick={() => zoom("out")} aria-label={labels.zoomOut} title={labels.zoomOut}>
          <ZoomOut size={17} aria-hidden />
        </button>
        <button type="button" onClick={resetZoom} aria-label={labels.resetZoom} title={labels.resetZoom}>
          <RotateCcw size={17} aria-hidden />
        </button>
      </div>
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
        {showOverlays && signal && <TradeOverlays signal={signal} yFor={yFor} />}
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
        {regularVisible.map((candle, index) => {
          const x = xFor(index);
          const volumeHeight = Math.max(1, (candle.volume / maxVolume) * VOLUME_HEIGHT);
          const isUp = candle.close >= candle.open;
          return (
            <rect
              key={`volume-${candle.timestamp}-${index}`}
              className={isUp ? "volume-bar up" : "volume-bar down"}
              x={x - candleWidth / 2}
              y={VOLUME_TOP + VOLUME_HEIGHT - volumeHeight}
              width={candleWidth}
              height={volumeHeight}
              rx="1"
            />
          );
        })}
        <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={VOLUME_TOP} y2={VOLUME_TOP} className="volume-separator" />
      </svg>
    </div>
  );
}

function TradeOverlays({ signal, yFor }: { signal: SignalResult; yFor: (price: number) => number }) {
  return (
    <g className="trade-overlays">
      {signal.entryZone && (
        <rect
          x={PADDING.left}
          y={yFor(signal.entryZone.high)}
          width={WIDTH - PADDING.left - PADDING.right}
          height={Math.max(2, yFor(signal.entryZone.low) - yFor(signal.entryZone.high))}
          className="entry-zone"
        />
      )}
      {signal.invalidation !== null && (
        <OverlayLine price={signal.invalidation} yFor={yFor} className="stop-line" label="SL" />
      )}
      {signal.targets.map((target) => (
        <OverlayLine key={target.label} price={target.price} yFor={yFor} className="target-line" label={target.label} />
      ))}
    </g>
  );
}

function OverlayLine({
  price,
  yFor,
  className,
  label
}: {
  price: number;
  yFor: (price: number) => number;
  className: string;
  label: string;
}) {
  const y = yFor(price);
  return (
    <g>
      <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} className={className} />
      <text x={WIDTH - PADDING.right - 8} y={y - 5} textAnchor="end" className="overlay-label">
        {label} {formatCurrency(price)}
      </text>
    </g>
  );
}

function overlayPriceValues(signal: SignalResult): number[] {
  const values = signal.targets.map((target) => target.price);
  if (signal.entryZone) {
    values.push(signal.entryZone.low, signal.entryZone.high);
  }
  if (signal.invalidation !== null) {
    values.push(signal.invalidation);
  }

  return values;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
