"use client";

import type { AiProviderName, AiProviderStatus, ChatMessage, MarketContext } from "@trading-helper/ai";
import type { AppLocale } from "@trading-helper/core";
import { Bot, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { UiMessages } from "../messages";

interface AiChatProps {
  locale: AppLocale;
  labels: UiMessages["ai"];
  marketContext: MarketContext | null;
}

export function AiChat({ locale, labels, marketContext }: AiChatProps) {
  const [status, setStatus] = useState<AiProviderStatus>({ openai: false, gemini: false, local: true });
  const [provider, setProvider] = useState<AiProviderName>("local");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((response) => response.json())
      .then((nextStatus: AiProviderStatus) => {
        setStatus(nextStatus);
        if (nextStatus.openai) {
          setProvider("openai");
        } else if (nextStatus.gemini) {
          setProvider("gemini");
        }
      })
      .catch(() => setStatus({ openai: false, gemini: false, local: true }));
  }, []);

  const providerLabel = useMemo(() => {
    if (provider === "openai") {
      return status.openai ? "OpenAI" : labels.openAiNoKey;
    }

    if (provider === "gemini") {
      return status.gemini ? "Gemini" : labels.geminiNoKey;
    }

    return "Local";
  }, [labels.geminiNoKey, labels.openAiNoKey, provider, status]);

  async function submit(messageText = input) {
    const trimmed = messageText.trim();
    if (!trimmed || !marketContext || isStreaming) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          messages: nextMessages,
          marketContext,
          locale
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response stream.");
      }

      let assistantText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        assistantText += decoder.decode(value, { stream: true });
        setMessages([...nextMessages, { role: "assistant", content: assistantText }]);
      }
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: labels.error
        }
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <aside className="panel ai-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">AI</p>
          <h2>{labels.title}</h2>
        </div>
        <Bot size={28} aria-hidden />
      </div>
      <div className="provider-row" aria-label={labels.providerAria}>
        {(["local", "openai", "gemini"] as AiProviderName[]).map((name) => (
          <button
            key={name}
            className={provider === name ? "provider active" : "provider"}
            type="button"
            onClick={() => setProvider(name)}
          >
            {name === "local" ? "Local" : name === "openai" ? "OpenAI" : "Gemini"}
          </button>
        ))}
      </div>
      <div className="provider-status">
        <Sparkles size={15} aria-hidden />
        <span>{providerLabel}</span>
      </div>
      <div className="quick-row">
        {labels.quickPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => submit(prompt)} disabled={!marketContext || isStreaming}>
            {prompt}
          </button>
        ))}
      </div>
      <div className="chat-log" aria-live="polite">
        {(messages.length > 0 ? messages : [{ role: "assistant", content: labels.initial } satisfies ChatMessage]).map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
            {message.content || labels.composing}
          </div>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={labels.placeholder}
          disabled={!marketContext || isStreaming}
        />
        <button type="submit" disabled={!marketContext || isStreaming || input.trim().length === 0} aria-label={labels.send}>
          <Send size={18} aria-hidden />
        </button>
      </form>
    </aside>
  );
}
