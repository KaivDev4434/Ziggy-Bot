// Anthropic (Claude) API Provider
// Primary provider - supports tool calling natively

import type { AIProvider, ChatMessage, AIProviderOptions, AIProviderResponse, StreamChunk } from "../types";

interface AnthropicAPIResponse {
  content: { type: string; text: string }[];
  model: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  supportsStreaming = true;
  private baseUrl = "https://api.anthropic.com/v1";

  private get apiKey(): string | undefined {
    return process.env.ANTHROPIC_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private prepareMessages(messages: ChatMessage[]) {
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    return { systemMessage, chatMessages };
  }

  async chat(
    messages: ChatMessage[],
    options?: AIProviderOptions
  ): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    const { systemMessage, chatMessages } = this.prepareMessages(messages);
    const model = options?.model ?? "claude-sonnet-4-20250514";

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? 1500,
        ...(systemMessage ? { system: systemMessage.content } : {}),
        messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorBody}`);
    }

    const data: AnthropicAPIResponse = await response.json();
    const textContent = data.content.find((c) => c.type === "text");
    const content = textContent?.text || "";

    return {
      content,
      model: data.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens:
              (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
          }
        : undefined,
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: AIProviderOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    const { systemMessage, chatMessages } = this.prepareMessages(messages);
    const model = options?.model ?? "claude-sonnet-4-20250514";

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? 1500,
        stream: true,
        ...(systemMessage ? { system: systemMessage.content } : {}),
        messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(data);
              
              // Handle different Anthropic SSE event types
              if (parsed.type === "content_block_delta") {
                const delta = parsed.delta;
                if (delta?.type === "text_delta" && delta?.text) {
                  yield { content: delta.text, done: false };
                }
              } else if (parsed.type === "message_stop") {
                yield { content: "", done: true };
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { content: "", done: true };
  }
}
