import { NextResponse } from "next/server";
import {
  analyzeSignal,
  analyzeSwingSignal,
  createMarketDataProvider,
  fetchShortFlowSnapshot,
  rankScannerResult,
  type AgentScanResult,
  type AppLocale,
  type MarketMoodSnapshot,
  type ScannerResult,
  type ShortFlowSnapshot,
  type Timeframe,
  type TradingHorizon
} from "@trading-helper/core";
import { fetchOptionSentimentSnapshot } from "@trading-helper/core/server";

export const runtime = "nodejs";

const provider = createMarketDataProvider();
const DEFAULT_UNIVERSE = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "AMD",
  "META",
  "AMZN",
  "GOOGL",
  "NFLX",
  "AVGO",
  "SMCI",
  "PLTR",
  "COIN",
  "MSTR",
  "SHOP",
  "UBER",
  "CRM",
  "NOW",
  "PANW",
  "CRWD",
  "SPY",
  "QQQ",
  "VOO",
  "IWM",
  "DIA",
  "XLK",
  "XLF",
  "XLE",
  "XBI",
  "ARKK"
] as const;

interface AgentScanBody {
  horizon?: TradingHorizon;
  locale?: AppLocale;
  symbols?: string[];
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AgentScanBody;
  const horizon: TradingHorizon = body.horizon === "swing" ? "swing" : "scalp";
  const locale: AppLocale = body.locale === "en" ? "en" : "ko";
  const timeframe: Timeframe = horizon === "swing" ? "1d" : "5m";
  const symbols = normalizeSymbols(body.symbols?.length ? body.symbols : [...DEFAULT_UNIVERSE]).slice(0, 30);

  const mood = await fetch(`${baseUrl(request)}/api/market/mood`, { cache: "no-store" })
    .then((response) => response.json() as Promise<MarketMoodSnapshot>)
    .catch(() =>
      ({
        score: 50,
        label: { ko: "중립", en: "Neutral" },
        vix: null,
        putCallRatio: null,
        spyTrend: "NEUTRAL",
        qqqTrend: "NEUTRAL",
        warnings: ["Market mood failed to load."],
        dataTimestamp: new Date().toISOString(),
        source: "Unavailable"
      }) satisfies MarketMoodSnapshot
    );

  const rows: ScannerResult[] = [];
  for (let index = 0; index < symbols.length; index += 4) {
    const batch = symbols.slice(index, index + 4);
    const batchRows = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const [candles, shortFlow, optionSentiment] = await Promise.all([
            provider.getCandles(symbol, timeframe),
            fetchShortFlowSnapshot(symbol).catch(() => null),
            fetchOptionSentimentSnapshot(symbol).catch(() => null)
          ]);
          const input = { symbol, timeframe, candles, source: provider.source, locale, shortFlow, optionSentiment };
          const signal = horizon === "swing" ? analyzeSwingSignal(input) : analyzeSignal({ ...input, horizon });
          const ranked = rankScannerResult({ symbol, timeframe, candles, signal, locale, horizon });
          return applyContextBoost(ranked, shortFlow, mood, locale);
        } catch {
          return null;
        }
      })
    );
    rows.push(...batchRows.filter((row): row is ScannerResult => row !== null));
  }

  const candidates = rows.sort((left, right) => right.score - left.score).slice(0, 5);
  const proposedFavorites = candidates.slice(0, 3).map((candidate) => candidate.symbol);

  const result: AgentScanResult = {
    horizon,
    candidates,
    proposedFavorites,
    mood,
    report: {
      title: locale === "en" ? "Agent Scan Report" : "에이전트 스캔 리포트",
      summary: buildSummary(candidates, mood, locale),
      warnings: [
        locale === "en"
          ? "Rankings are analysis-only and do not predict or guarantee profit."
          : "순위는 분석 보조용이며 수익을 예측하거나 보장하지 않습니다.",
        ...mood.warnings.slice(0, 2)
      ],
      generatedAt: new Date().toISOString()
    }
  };

  return NextResponse.json(result);
}

function applyContextBoost(
  row: ScannerResult,
  shortFlow: ShortFlowSnapshot | null,
  mood: MarketMoodSnapshot,
  locale: AppLocale
): ScannerResult {
  let score = row.score;
  const rankReasons = [...row.rankReasons];
  const shortRatio = shortFlow?.shortSaleVolume?.shortVolumeRatio ?? null;
  const daysToCover = shortFlow?.shortInterest?.daysToCover ?? null;

  if (shortRatio !== null && shortRatio >= 0.55 && row.bias === "SHORT") {
    score += 4;
    rankReasons.push({ label: locale === "en" ? "Short-sale volume pressure +4" : "공매도 거래 비중 +4", weight: 4 });
  }
  if (daysToCover !== null && daysToCover >= 4 && row.bias === "LONG") {
    score += 4;
    rankReasons.push({ label: locale === "en" ? "Crowded-short squeeze risk +4" : "숏 커버 가능성 +4", weight: 4 });
  }
  if (mood.score >= 60 && row.bias === "LONG") {
    score += 3;
    rankReasons.push({ label: locale === "en" ? "Risk-on mood +3" : "위험선호 분위기 +3", weight: 3 });
  }
  if (mood.score <= 40 && row.bias === "SHORT") {
    score += 3;
    rankReasons.push({ label: locale === "en" ? "Risk-off mood +3" : "위험회피 분위기 +3", weight: 3 });
  }

  return {
    ...row,
    score: Math.round(score * 10) / 10,
    rankReasons
  };
}

function buildSummary(candidates: ScannerResult[], mood: MarketMoodSnapshot, locale: AppLocale): string {
  if (candidates.length === 0) {
    return locale === "en" ? "No candidates produced a usable setup." : "사용 가능한 셋업 후보가 없습니다.";
  }

  const top = candidates[0];
  return locale === "en"
    ? `${top.symbol} is the top ranked ${top.bias.toLowerCase()} setup with ${top.confidence}% confidence. Market mood proxy is ${mood.label.en} (${mood.score}/100).`
    : `${top.symbol}이(가) ${top.bias === "LONG" ? "롱" : top.bias === "SHORT" ? "숏" : "중립"} 후보 중 최상위입니다. 신뢰도는 ${top.confidence}%이고 시장 심리 프록시는 ${mood.label.ko}(${mood.score}/100)입니다.`;
}

function normalizeSymbols(symbols: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const symbol of symbols) {
    const value = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.-]{1,12}$/.test(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function baseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
