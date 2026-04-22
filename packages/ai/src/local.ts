import type { AiChatRequest, AiProvider } from "./types";

export class LocalAiProvider implements AiProvider {
  readonly name = "local" as const;

  async *streamChat(request: AiChatRequest): AsyncIterable<string> {
    const locale = request.locale ?? "ko";
    const { signal, quote } = request.marketContext;
    const latestQuestion = request.messages.at(-1)?.content ?? "";
    const answer = locale === "en" ? buildEnglishAnswer(request, latestQuestion) : buildKoreanAnswer(request, latestQuestion);

    for (const chunk of chunkText(answer, 36)) {
      yield chunk;
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
  }
}

function buildKoreanAnswer(request: AiChatRequest, latestQuestion: string): string {
  const { signal, quote } = request.marketContext;
  const header = `${signal.symbol} ${signal.timeframe} 기준 ${toKoreanBias(
    signal.bias
  )} 편향, 신뢰도 ${signal.confidence}%입니다.`;
  const quoteLine = quote
    ? `현재 표시 가격은 ${quote.price.toFixed(2)}달러, 등락률은 ${quote.changePercent.toFixed(2)}%입니다.`
    : "현재 표시 가격 정보는 없습니다.";
  const plan =
    signal.bias === "NEUTRAL" || !signal.entryZone
      ? "지금은 명확한 진입 구간보다 관망 또는 추가 확인이 더 적절합니다."
      : `관찰 구간은 ${signal.entryZone.low}~${signal.entryZone.high}, 무효화 기준은 ${
          signal.invalidation
        }, 목표 후보는 ${signal.targets.map((target) => `${target.label} ${target.price}`).join(", ")}입니다.`;
  const reasons = signal.reasons.map((reason) => `- ${reason}`).join("\n");
  const chartPatterns =
    signal.chartPatterns.length > 0
      ? `\n\n차트 형태:\n${signal.chartPatterns.map((pattern) => `- ${pattern.label.ko}: ${pattern.description.ko}`).join("\n")}`
      : "";
  const candlePatterns =
    signal.patterns.length > 0
      ? `\n\n캔들 패턴:\n${signal.patterns.map((pattern) => `- ${pattern.label.ko}: ${pattern.description.ko}`).join("\n")}`
      : "";
  const flowCaveat =
    /기관|수급|공매도|잔량|short|interest|13f|ftd/i.test(latestQuestion)
      ? "\n\n수급 참고: 무료 데이터만으로 기관 주문을 실시간 식별할 수는 없습니다. 상대거래량, VWAP, OBV는 참여 강도 프록시이며 FINRA 공매도 거래량, Nasdaq 공매도잔량, SEC 13F/FTD는 지연 공개자료입니다."
      : "";
  const realtimeNote = request.marketContext.realtime?.enabled
    ? "\n\n초단기 참고: 현재 컨텍스트에는 초단위 캔들/체결창 자료가 포함되어 있습니다. 노이즈가 큰 관찰 자료이므로 확정 진입 지시가 아니라 상위 시간대와 함께 확인해야 합니다."
    : "";
  const warnings = signal.warnings.map((warning) => `- ${warning}`).join("\n");
  const executionRefusal =
    /주문|매수해|매도해|buy|sell|order|execute/i.test(latestQuestion)
      ? "\n\n주문 실행이나 확정적인 매수/매도 지시는 제공하지 않습니다. 아래 내용은 분석 보조입니다."
      : "";

  return `${header}\n${quoteLine}\n${plan}\n\n근거:\n${reasons}${candlePatterns}${chartPatterns}${flowCaveat}${realtimeNote}\n\n주의:\n${warnings}${executionRefusal}`;
}

function buildEnglishAnswer(request: AiChatRequest, latestQuestion: string): string {
  const { signal, quote } = request.marketContext;
  const header = `${signal.symbol} ${signal.timeframe} shows a ${signal.bias.toLowerCase()} bias with ${signal.confidence}% confidence.`;
  const quoteLine = quote
    ? `Displayed price is $${quote.price.toFixed(2)}, with a ${quote.changePercent.toFixed(2)}% move.`
    : "No displayed quote is available.";
  const plan =
    signal.bias === "NEUTRAL" || !signal.entryZone
      ? "There is no clear entry zone yet; waiting for confirmation is more appropriate."
      : `Observation zone is ${signal.entryZone.low} to ${signal.entryZone.high}, invalidation is ${
          signal.invalidation
        }, and target candidates are ${signal.targets.map((target) => `${target.label} ${target.price}`).join(", ")}.`;
  const reasons = signal.reasons.map((reason) => `- ${reason}`).join("\n");
  const chartPatterns =
    signal.chartPatterns.length > 0
      ? `\n\nChart patterns:\n${signal.chartPatterns.map((pattern) => `- ${pattern.label.en}: ${pattern.description.en}`).join("\n")}`
      : "";
  const candlePatterns =
    signal.patterns.length > 0
      ? `\n\nCandlestick patterns:\n${signal.patterns.map((pattern) => `- ${pattern.label.en}: ${pattern.description.en}`).join("\n")}`
      : "";
  const flowCaveat =
    /기관|수급|공매도|잔량|short|interest|13f|ftd|institution/i.test(latestQuestion)
      ? "\n\nFlow context: free data cannot identify institutional orders in real time. Relative volume, VWAP, and OBV are participation proxies, while FINRA short-sale volume, Nasdaq short interest, and SEC 13F/FTD are delayed public data."
      : "";
  const realtimeNote = request.marketContext.realtime?.enabled
    ? "\n\nScalping context: second-level candles and Time & Sales are included. Treat them as noisy observation data, not a certain entry instruction."
    : "";
  const warnings = signal.warnings.map((warning) => `- ${warning}`).join("\n");
  const executionRefusal =
    /주문|매수해|매도해|buy|sell|order|execute/i.test(latestQuestion)
      ? "\n\nI cannot execute orders or give a certain buy/sell instruction. This is analysis-only context."
      : "";

  return `${header}\n${quoteLine}\n${plan}\n\nReasons:\n${reasons}${candlePatterns}${chartPatterns}${flowCaveat}${realtimeNote}\n\nWarnings:\n${warnings}${executionRefusal}`;
}

function toKoreanBias(bias: string): string {
  if (bias === "LONG") {
    return "롱";
  }

  if (bias === "SHORT") {
    return "숏";
  }

  return "중립";
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }

  return chunks;
}
