import { NextResponse } from "next/server";
import { isTimeframe, type AiActionProposal, type TradingHorizon } from "@trading-helper/core";

export const runtime = "nodejs";

interface PreviewBody {
  message?: string;
  horizon?: TradingHorizon;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PreviewBody;
  const message = body.message ?? "";
  const horizon: TradingHorizon = body.horizon === "swing" ? "swing" : "scalp";
  const proposals = buildActionProposals(message, horizon);

  return NextResponse.json({ proposals });
}

export function buildActionProposals(message: string, horizon: TradingHorizon): AiActionProposal[] {
  const normalized = message.trim();
  const symbol = extractSymbol(normalized);
  const proposals: AiActionProposal[] = [];

  if (symbol && /(즐겨찾기|watchlist|favorite|관심)/i.test(normalized)) {
    if (/(삭제|제거|remove|delete)/i.test(normalized)) {
      proposals.push({
        id: `remove-${symbol}`,
        type: "remove_favorite",
        symbol,
        label: { ko: `${symbol} 즐겨찾기 제거`, en: `Remove ${symbol} from favorites` }
      });
    } else if (/(추가|넣어|add|save)/i.test(normalized)) {
      proposals.push({
        id: `add-${symbol}`,
        type: "add_favorite",
        symbol,
        label: { ko: `${symbol} 즐겨찾기 추가`, en: `Add ${symbol} to favorites` }
      });
    }
  }

  if (symbol && /(보여|열어|선택|select|show|open)/i.test(normalized)) {
    proposals.push({
      id: `set-symbol-${symbol}`,
      type: "set_symbol",
      symbol,
      label: { ko: `${symbol} 종목 열기`, en: `Open ${symbol}` }
    });
  }

  const timeframeCandidate = normalized.match(/\b(1s|5s|15s|1m|5m|15m|30m|1h|1d|1w|1mo)\b/i)?.[1]?.toLowerCase() ?? null;
  if (isTimeframe(timeframeCandidate)) {
    proposals.push({
      id: `set-timeframe-${timeframeCandidate}`,
      type: "set_timeframe",
      timeframe: timeframeCandidate,
      label: { ko: `${timeframeCandidate} 차트로 변경`, en: `Switch to ${timeframeCandidate}` }
    });
  }

  if (/스윙|swing/i.test(normalized)) {
    proposals.push({
      id: "set-horizon-swing",
      type: "set_horizon",
      horizon: "swing",
      label: { ko: "스윙 관점으로 변경", en: "Switch to Swing view" }
    });
  } else if (/스캘핑|scalp/i.test(normalized)) {
    proposals.push({
      id: "set-horizon-scalp",
      type: "set_horizon",
      horizon: "scalp",
      label: { ko: "스캘핑 관점으로 변경", en: "Switch to Scalp view" }
    });
  }

  if (
    /(에이전트|agent|스캔|scan|가장.*좋|수익.*확률|유망|rank|ranking|후보)/i.test(normalized) &&
    /(종목|stock|ticker|후보|scan|스캔)/i.test(normalized)
  ) {
    proposals.push({
      id: `agent-scan-${horizon}`,
      type: "run_agent_scan",
      horizon,
      label: { ko: "에이전트 종목 스캔 실행", en: "Run agent stock scan" }
    });
  }

  return dedupe(proposals);
}

function extractSymbol(message: string): string | null {
  const candidates = message.match(/\b[A-Z]{1,5}(?:[.-][A-Z])?\b/g) ?? [];
  const ignored = new Set(["AI", "API", "ETF", "USD", "KRW", "LONG", "SHORT", "SMA", "EMA", "VWAP", "RSI", "MACD"]);
  const symbol = candidates.find((candidate) => !ignored.has(candidate));
  return symbol ?? null;
}

function dedupe(proposals: AiActionProposal[]): AiActionProposal[] {
  const seen = new Set<string>();
  return proposals.filter((proposal) => {
    if (seen.has(proposal.id)) {
      return false;
    }
    seen.add(proposal.id);
    return true;
  });
}
