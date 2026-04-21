import OpenAI from "openai";
import { buildContextMessage, buildTradingSystemPrompt } from "./prompt";
import type { AiChatRequest, AiProvider } from "./types";

export class GeminiProvider implements AiProvider {
  readonly name = "gemini" as const;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model = "gemini-3-flash-preview") {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
    });
    this.model = model;
  }

  async *streamChat(request: AiChatRequest): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: buildTradingSystemPrompt(request.locale) },
        { role: "system", content: buildContextMessage(request) },
        ...request.messages
      ],
      stream: true
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        yield text;
      }
    }
  }
}
