// OpenAI API Provider

import type { AIProvider, ChatMessage, AIProviderOptions, AIProviderResponse } from "../types";

interface OpenAIAPIResponse {
  choices: {
    message: { role: string; content: string };
  }[];
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private apiKey: string | undefined;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async chat(
    messages: ChatMessage[],
    options?: AIProviderOptions
  ): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const model = options?.model ?? "gpt-4o";

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options?.maxTokens ?? 1500,
        temperature: options?.temperature ?? 0.3,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
    }

    const data: OpenAIAPIResponse = await response.json();
    const content = data.choices[0]?.message?.content || "";

    return {
      content,
      model: data.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }
}
