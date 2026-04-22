"use client";

import type { MarketContext } from "@trading-helper/ai";
import type {
  AppLocale,
  Candle,
  CandleStyle,
  Quote,
  ScannerResult,
  SignalResult,
  SymbolSearchResult,
  Timeframe
} from "@trading-helper/core";
import { AlertCircle, BookOpen, RefreshCcw, Search, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatKrw, formatNumber, formatPercent } from "../lib/format";
import { messages } from "../messages";
import { AiChat } from "./AiChat";
import { CandlestickChart, type IndicatorToggles } from "./CandlestickChart";
import { RiskPanel } from "./RiskPanel";
import { SignalCard } from "./SignalCard";

interface CandlePayload {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  signal: SignalResult;
  source: string;
}

interface FxRate {
  pair: "USD/KRW";
  rate: number;
  timestamp: string;
  source: string;
}

type ScanRow = ScannerResult | { symbol: string; error: string };

const defaultFavorites = ["AAPL", "MSFT", "NVDA", "TSLA", "AMD", "META"];
const timeframes: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "1d", "1w", "1mo"];
const favoritesKey = "trading-helper-favorites";

export function Dashboard() {
  const [locale, setLocale] = useState<AppLocale>("ko");
  const [symbol, setSymbol] = useState("AAPL");
  const [query, setQuery] = useState("AAPL");
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [payload, setPayload] = useState<CandlePayload | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [fxRate, setFxRate] = useState<FxRate | null>(null);
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [favorites, setFavorites] = useState<string[]>(defaultFavorites);
  const [scanRows, setScanRows] = useState<ScanRow[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [candleStyle, setCandleStyle] = useState<CandleStyle>("regular");
  const [showOverlays, setShowOverlays] = useState(true);
  const [toggles, setToggles] = useState<IndicatorToggles>({
    ema: true,
    vwap: true,
    bollinger: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = messages[locale];

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("trading-helper-locale");
    const savedFavorites = readFavorites();
    if (savedLocale === "ko" || savedLocale === "en") {
      window.setTimeout(() => setLocale(savedLocale), 0);
    }
    if (savedFavorites.length > 0) {
      window.setTimeout(() => setFavorites(savedFavorites), 0);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    window.localStorage.setItem(favoritesKey, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    void loadMarket(symbol, timeframe, locale);
  }, [symbol, timeframe, locale]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (query.trim().length < 1) {
        setSearchResults([]);
        return;
      }

      fetch(`/api/market/search?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((results: SymbolSearchResult[] | { error: string }) => {
          setSearchResults(Array.isArray(results) ? results : []);
        })
        .catch(() => setSearchResults([]));
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query]);

  const latestCandle = payload?.candles.at(-1) ?? null;
  const displayPriceUsd = quote?.price ?? latestCandle?.close ?? null;
  const displayPriceTimestamp = quote?.timestamp ?? latestCandle?.time ?? null;
  const isFavorite = favorites.includes(symbol);

  const marketContext: MarketContext | null = useMemo(() => {
    if (!payload?.signal) {
      return null;
    }

    return {
      symbol,
      quote:
        displayPriceUsd !== null && displayPriceTimestamp
          ? {
              price: displayPriceUsd,
              change: quote?.change ?? 0,
              changePercent: quote?.changePercent ?? 0,
              marketState: quote?.marketState,
              timestamp: displayPriceTimestamp
            }
          : undefined,
      signal: payload.signal
    };
  }, [displayPriceTimestamp, displayPriceUsd, payload, quote, symbol]);

  async function loadMarket(nextSymbol: string, nextTimeframe: Timeframe, nextLocale: AppLocale) {
    setIsLoading(true);
    setError(null);

    try {
      const [candlesResponse, quoteResponse, fxResponse] = await Promise.all([
        fetch(
          `/api/market/candles?symbol=${encodeURIComponent(nextSymbol)}&timeframe=${nextTimeframe}&locale=${nextLocale}`
        ),
        fetch(`/api/market/quote?symbol=${encodeURIComponent(nextSymbol)}`),
        fetch("/api/market/fx")
      ]);

      const candlesJson = (await candlesResponse.json()) as CandlePayload | { error: string };
      const quoteJson = (await quoteResponse.json()) as Quote | { error: string };
      const fxJson = (await fxResponse.json()) as FxRate | { error: string };

      if (!candlesResponse.ok || "error" in candlesJson) {
        throw new Error("error" in candlesJson ? candlesJson.error : messages[nextLocale].errors.candles);
      }

      setPayload(candlesJson);
      setQuote("error" in quoteJson ? null : quoteJson);
      setFxRate("error" in fxJson ? null : fxJson);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : messages[nextLocale].errors.market);
    } finally {
      setIsLoading(false);
    }
  }

  async function scanFavorites() {
    setIsScanning(true);
    try {
      const response = await fetch("/api/market/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: favorites, timeframe, locale })
      });
      const json = (await response.json()) as { results?: ScanRow[] };
      setScanRows(json.results ?? []);
    } finally {
      setIsScanning(false);
    }
  }

  function chooseSymbol(nextSymbol: string) {
    const normalized = nextSymbol.trim().toUpperCase();
    if (!normalized) {
      return;
    }

    setSymbol(normalized);
    setQuery(normalized);
    setSearchResults([]);
  }

  function toggleFavorite(nextSymbol = symbol) {
    const normalized = nextSymbol.trim().toUpperCase();
    if (!normalized) {
      return;
    }

    setFavorites((current) =>
      current.includes(normalized) ? current.filter((favorite) => favorite !== normalized) : [...current, normalized].slice(0, 25)
    );
  }

  function changeLocale(nextLocale: AppLocale) {
    setLocale(nextLocale);
    window.localStorage.setItem("trading-helper-locale", nextLocale);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{t.tagline}</p>
          <h1>{t.appName}</h1>
        </div>
        <div className="top-actions">
          <Link className="learn-link" href="/learn">
            <BookOpen size={17} aria-hidden />
            {t.nav.learn}
          </Link>
          <div className="language-switch" aria-label={t.language.label}>
            {(["ko", "en"] as AppLocale[]).map((item) => (
              <button
                key={item}
                type="button"
                className={locale === item ? "active" : ""}
                onClick={() => changeLocale(item)}
              >
                {t.language[item]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="market-pill full-width">
        <AlertCircle size={16} aria-hidden />
        <span>{t.disclaimer}</span>
      </section>

      <section className="dashboard-grid">
        <aside className="watch-panel">
          <form
            className="search-box"
            onSubmit={(event) => {
              event.preventDefault();
              chooseSymbol(query);
            }}
          >
            <Search size={18} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t.aria.symbolSearch} />
          </form>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div key={result.symbol} className="search-result-row">
                  <button type="button" onClick={() => chooseSymbol(result.symbol)}>
                    <strong>{result.symbol}</strong>
                    <span>{result.shortName}</span>
                  </button>
                  <button
                    type="button"
                    className={favorites.includes(result.symbol) ? "star-button active" : "star-button"}
                    onClick={() => toggleFavorite(result.symbol)}
                    aria-label={favorites.includes(result.symbol) ? t.scanner.remove : t.scanner.add}
                  >
                    <Star size={16} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="panel-head compact">
            <div>
              <p className="eyebrow">Scanner</p>
              <h2>{t.scanner.title}</h2>
            </div>
            <button className="small-action" type="button" onClick={scanFavorites} disabled={isScanning || favorites.length === 0}>
              {isScanning ? t.scanner.scanning : t.scanner.scan}
            </button>
          </div>
          <div className="watchlist">
            {favorites.map((item) => (
              <button
                key={item}
                type="button"
                className={item === symbol ? "active" : ""}
                onClick={() => chooseSymbol(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {favorites.length === 0 && <p className="helper-text">{t.scanner.empty}</p>}
          <div className="scanner-list">
            {scanRows.map((row) =>
              "error" in row ? (
                <div key={row.symbol} className="scanner-row error">
                  <strong>{row.symbol}</strong>
                  <span>{t.scanner.error}</span>
                </div>
              ) : (
                <button key={row.symbol} type="button" className="scanner-row" onClick={() => chooseSymbol(row.symbol)}>
                  <span className="scanner-topline">
                    <strong>{row.symbol}</strong>
                    <b className={`bias-${row.bias.toLowerCase()}`}>{t.signal.bias[row.bias]}</b>
                    <em>{t.scanner.score} {formatNumber(row.score, 1)}</em>
                  </span>
                  <span>{formatDisplayPrice(row.price, fxRate, locale)} · {row.keyReason}</span>
                  <span>
                    {t.scanner.entry}: {formatZone(row.entryZone)} · {t.scanner.stop}: {formatCurrency(row.invalidation)}
                  </span>
                  {row.patterns.length > 0 && (
                    <span>
                      {t.scanner.patterns}: {row.patterns.map((pattern) => pattern.label[locale]).join(", ")}
                    </span>
                  )}
                  {row.chartPatterns.length > 0 && (
                    <span>
                      {t.scanner.chartPatterns}: {row.chartPatterns.map((pattern) => pattern.label[locale]).join(", ")}
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </aside>

        <section className="chart-panel">
          <div className="chart-toolbar">
            <div>
              <p className="eyebrow">{payload?.source ?? "Market data"}</p>
              <div className="symbol-row">
                <h2>{symbol}</h2>
                <button
                  className={isFavorite ? "star-button active large" : "star-button large"}
                  type="button"
                  onClick={() => toggleFavorite(symbol)}
                  aria-label={isFavorite ? t.scanner.remove : t.scanner.add}
                >
                  <Star size={18} aria-hidden />
                </button>
                {displayPriceUsd !== null && (
                  <>
                    <span className="current-price" title={priceTitle(displayPriceUsd, fxRate, locale)}>
                      {formatDisplayPrice(displayPriceUsd, fxRate, locale)}
                    </span>
                    {quote && (
                      <span className={quote.changePercent >= 0 ? "positive" : "negative"}>
                        {formatPercent(quote.changePercent)}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => void loadMarket(symbol, timeframe, locale)}
              aria-label={t.aria.refresh}
            >
              <RefreshCcw size={18} aria-hidden />
            </button>
          </div>
          <div className="segmented" aria-label={t.aria.timeframe}>
            {timeframes.map((item) => (
              <button
                key={item}
                type="button"
                className={item === timeframe ? "active" : ""}
                onClick={() => setTimeframe(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="toggle-row" aria-label={t.aria.indicators}>
            <Toggle label="EMA" checked={toggles.ema} onChange={() => setToggles({ ...toggles, ema: !toggles.ema })} />
            <Toggle
              label="VWAP"
              checked={toggles.vwap}
              onChange={() => setToggles({ ...toggles, vwap: !toggles.vwap })}
            />
            <Toggle
              label="Bollinger"
              checked={toggles.bollinger}
              onChange={() => setToggles({ ...toggles, bollinger: !toggles.bollinger })}
            />
            <Toggle
              label={t.chartControls.heikinAshi}
              checked={candleStyle === "heikin_ashi"}
              onChange={() => setCandleStyle(candleStyle === "regular" ? "heikin_ashi" : "regular")}
            />
            <Toggle label={t.chartControls.overlays} checked={showOverlays} onChange={() => setShowOverlays(!showOverlays)} />
          </div>
          {error && <div className="error-box">{error}</div>}
          {!error && payload && (
            <CandlestickChart
              key={`${symbol}-${timeframe}`}
              candleStyle={candleStyle}
              candles={payload.candles}
              locale={locale}
              labels={t.chart}
              showOverlays={showOverlays}
              signal={payload.signal}
              toggles={toggles}
            />
          )}
          {!error && isLoading && <div className="chart-empty">{t.errors.loading}</div>}
        </section>

        <section className="side-stack">
          <SignalCard locale={locale} labels={t.signal} signal={payload?.signal ?? null} />
          <RiskPanel labels={t.risk} signal={payload?.signal ?? null} />
        </section>

        <AiChat locale={locale} labels={t.ai} marketContext={marketContext} />
      </section>
    </main>
  );
}

function readFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(favoritesKey);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return parsed.map((symbol) => symbol.toUpperCase()).filter(Boolean).slice(0, 25);
  } catch {
    return [];
  }
}

function formatDisplayPrice(priceUsd: number, fxRate: FxRate | null, locale: AppLocale): string {
  if (locale === "ko" && fxRate) {
    return formatKrw(priceUsd * fxRate.rate);
  }

  return formatCurrency(priceUsd);
}

function priceTitle(priceUsd: number, fxRate: FxRate | null, locale: AppLocale): string {
  if (locale === "ko" && fxRate) {
    return `${formatCurrency(priceUsd)} x ${fxRate.pair} ${fxRate.rate.toFixed(2)} (${fxRate.source})`;
  }

  return `${formatCurrency(priceUsd)} USD`;
}

function formatZone(zone: ScannerResult["entryZone"]): string {
  if (!zone) {
    return "-";
  }

  return `${formatCurrency(zone.low)}-${formatCurrency(zone.high)}`;
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button type="button" className={checked ? "toggle active" : "toggle"} onClick={onChange}>
      <span aria-hidden />
      {label}
    </button>
  );
}
