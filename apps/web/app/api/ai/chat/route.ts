import { createAiProvider, type AiProviderName, type ChatMessage, type MarketContext } from "@trading-helper/ai";
import type { AppLocale } from "@trading-helper/core";

export const runtime = "nodejs";

interface ChatRequestBody {
  provider?: AiProviderName;
  messages?: ChatMessage[];
  marketContext?: MarketContext;
  locale?: AppLocale;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;
  const locale: AppLocale = body.locale === "en" ? "en" : "ko";

  if (!body.marketContext || !Array.isArray(body.messages)) {
    return new Response("Invalid AI chat payload.", { status: 400 });
  }

  const provider = createAiProvider(body.provider ?? "local");
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.streamChat({
          messages: body.messages ?? [],
          marketContext: body.marketContext as MarketContext,
          locale
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        controller.enqueue(
          encoder.encode(
            locale === "en"
              ? "\n\nAI response generation failed. Please check your API key, model name, and provider status."
              : "\n\nAI 응답 생성 중 오류가 발생했습니다. API 키, 모델명, 제공자 상태를 확인해 주세요."
          )
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
