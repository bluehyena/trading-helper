import { GeminiProvider } from "./gemini";
import { LocalAiProvider } from "./local";
import { OpenAiProvider } from "./openai";
import type { AiProvider, AiProviderName, AiProviderStatus } from "./types";

export * from "./gemini";
export * from "./local";
export * from "./openai";
export * from "./prompt";
export * from "./types";

export function getAiProviderStatus(env: NodeJS.ProcessEnv = process.env): AiProviderStatus {
  return {
    openai: Boolean(env.OPENAI_API_KEY),
    gemini: Boolean(env.GEMINI_API_KEY),
    local: true
  };
}

export function createAiProvider(
  requested: AiProviderName,
  env: NodeJS.ProcessEnv = process.env
): AiProvider {
  if (requested === "openai" && env.OPENAI_API_KEY) {
    return new OpenAiProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
  }

  if (requested === "gemini" && env.GEMINI_API_KEY) {
    return new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL);
  }

  return new LocalAiProvider();
}
