// AI Provider type definitions

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProviderOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface AIProviderResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

/**
 * Interface that all AI providers must implement.
 * This allows swapping between Anthropic, Perplexity, OpenAI, and Ollama
 * without changing any calling code.
 */
export interface AIProvider {
  name: string;
  
  /**
   * Send a chat completion request to the provider.
   */
  chat(
    messages: ChatMessage[],
    options?: AIProviderOptions
  ): Promise<AIProviderResponse>;

  /**
   * Stream a chat completion. Returns an async iterator that yields chunks.
   */
  chatStream?(
    messages: ChatMessage[],
    options?: AIProviderOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;

  /**
   * Check if the provider is properly configured (has API key, etc.)
   */
  isConfigured(): boolean;

  /**
   * Whether this provider supports streaming
   */
  supportsStreaming?: boolean;
}
