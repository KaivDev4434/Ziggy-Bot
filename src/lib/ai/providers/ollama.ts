// Ollama (Local LLM) Provider

import type { AIProvider, ChatMessage, AIProviderOptions, AIProviderResponse } from "../types";

interface OllamaAPIResponse {
  message: { role: string; content: string };
  model: string;
  eval_count?: number;
  prompt_eval_count?: number;
}

export class OllamaProvider implements AIProvider {
  name = "ollama";
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    this.defaultModel = process.env.OLLAMA_MODEL ?? "llama3.1";
  }

  isConfigured(): boolean {
    return !!this.baseUrl;
  }

  async chat(
    messages: ChatMessage[],
    options?: AIProviderOptions
  ): Promise<AIProviderResponse> {
    const model = options?.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          num_predict: options?.maxTokens ?? 1500,
          temperature: options?.temperature ?? 0.3,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorBody}`);
    }

    const data: OllamaAPIResponse = await response.json();

    return {
      content: data.message?.content || "",
      model: data.model,
      usage: {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
    };
  }
}
