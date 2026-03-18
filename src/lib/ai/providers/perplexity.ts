// Perplexity API Provider
// Good for web-search-augmented queries

import { AI_CONFIG } from "@/lib/constants";
import type { AIProvider, ChatMessage, AIProviderOptions, AIProviderResponse } from "../types";

interface PerplexityAPIResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class PerplexityProvider implements AIProvider {
  name = "perplexity";

  private get apiKey(): string | undefined {
    return process.env.PERPLEXITY_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async chat(
    messages: ChatMessage[],
    options?: AIProviderOptions
  ): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error("Perplexity API key not configured");
    }

    const response = await fetch(AI_CONFIG.PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model ?? AI_CONFIG.DEFAULT_MODEL,
        messages,
        max_tokens: options?.maxTokens ?? AI_CONFIG.MAX_TOKENS,
        temperature: options?.temperature ?? AI_CONFIG.TEMPERATURE,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorBody}`);
    }

    const data: PerplexityAPIResponse = await response.json();
    const content = data.choices[0]?.message?.content || "";

    return {
      content,
      model: options?.model ?? AI_CONFIG.DEFAULT_MODEL,
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
