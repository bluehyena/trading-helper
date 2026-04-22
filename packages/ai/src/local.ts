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
  const warnings = signal.warnings.map((warning) => `- ${warning}`).join("\n");
  const executionRefusal =
    /주문|매수해|매도해|buy|sell|order|execute/i.test(latestQuestion)
      ? "\n\n주문 실행이나 확정적인 매수/매도 지시는 제공하지 않습니다. 아래 내용은 분석 보조입니다."
      : "";

  return `${header}\n${quoteLine}\n${plan}\n\n근거:\n${reasons}${chartPatterns}\n\n주의:\n${warnings}${executionRefusal}`;
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
  const warnings = signal.warnings.map((warning) => `- ${warning}`).join("\n");
  const executionRefusal =
    /주문|매수해|매도해|buy|sell|order|execute/i.test(latestQuestion)
      ? "\n\nI cannot execute orders or give a certain buy/sell instruction. This is analysis-only context."
      : "";

  return `${header}\n${quoteLine}\n${plan}\n\nReasons:\n${reasons}${chartPatterns}\n\nWarnings:\n${warnings}${executionRefusal}`;
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
