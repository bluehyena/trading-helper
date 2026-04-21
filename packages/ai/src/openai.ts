import OpenAI from "openai";
import { buildContextMessage, buildTradingSystemPrompt } from "./prompt";
import type { AiChatRequest, AiProvider } from "./types";

export class OpenAiProvider implements AiProvider {
  readonly name = "openai" as const;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model = "gpt-5-mini") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async *streamChat(request: AiChatRequest): AsyncIterable<string> {
    const input = [
      {
        role: "system",
        content: buildContextMessage(request)
      },
      ...request.messages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content
      }))
    ];

    const stream = await this.client.responses.create({
      model: this.model,
      instructions: buildTradingSystemPrompt(request.locale),
      input: input as never,
      stream: true
    });

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        yield event.delta;
      }
    }
  }
}
