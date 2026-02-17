// Anthropic (Claude) API Provider
// Primary provider - supports tool calling natively

import type { AIProvider, ChatMessage, AIProviderOptions, AIProviderResponse } from "../types";

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
  private apiKey: string | undefined;
  private baseUrl = "https://api.anthropic.com/v1";

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async chat(
    messages: ChatMessage[],
    options?: AIProviderOptions
  ): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    // Anthropic API uses a different format: system prompt is separate
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

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
}
