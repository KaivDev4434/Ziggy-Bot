// AI Provider Registry
// Manages provider selection and fallback logic

import type { AIProvider, ChatMessage, AIProviderOptions, AIProviderResponse, StreamChunk } from "./types";
import { PerplexityProvider } from "./providers/perplexity";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider } from "./providers/openai";
import { OllamaProvider } from "./providers/ollama";

type ProviderName = "anthropic" | "perplexity" | "openai" | "ollama";

const providers: Record<ProviderName, AIProvider> = {
  anthropic: new AnthropicProvider(),
  perplexity: new PerplexityProvider(),
  openai: new OpenAIProvider(),
  ollama: new OllamaProvider(),
};

/**
 * Get the configured primary provider from the AI_PROVIDER env var.
 * Falls back to the first available configured provider.
 */
function getPrimaryProvider(): AIProvider {
  const configuredName = (process.env.AI_PROVIDER ?? "perplexity") as ProviderName;
  
  const primary = providers[configuredName];
  if (primary?.isConfigured()) {
    return primary;
  }

  // Fallback: try each provider in preference order
  const fallbackOrder: ProviderName[] = ["anthropic", "perplexity", "openai", "ollama"];
  for (const name of fallbackOrder) {
    if (providers[name].isConfigured()) {
      console.warn(
        `AI provider "${configuredName}" not configured, falling back to "${name}"`
      );
      return providers[name];
    }
  }

  throw new Error(
    "No AI provider is configured. Set AI_PROVIDER and provide the corresponding API key in .env"
  );
}

/**
 * Get a specific provider by name.
 */
export function getProvider(name?: ProviderName): AIProvider {
  if (!name) return getPrimaryProvider();
  
  const provider = providers[name];
  if (!provider?.isConfigured()) {
    throw new Error(`AI provider "${name}" is not configured`);
  }
  return provider;
}

/**
 * Send a chat completion using the configured provider.
 * This is the main entry point for AI calls.
 */
export async function chat(
  messages: ChatMessage[],
  options?: AIProviderOptions & { provider?: ProviderName }
): Promise<AIProviderResponse> {
  const provider = getProvider(options?.provider);
  return provider.chat(messages, options);
}

/**
 * Stream a chat completion using the configured provider.
 * Falls back to non-streaming if the provider doesn't support it.
 */
export async function* chatStream(
  messages: ChatMessage[],
  options?: AIProviderOptions & { provider?: ProviderName }
): AsyncGenerator<StreamChunk, void, unknown> {
  const provider = getProvider(options?.provider);
  
  // If provider supports streaming, use it
  if (provider.chatStream && provider.supportsStreaming) {
    yield* provider.chatStream(messages, options);
    return;
  }
  
  // Fallback: get full response and yield as single chunk
  const response = await provider.chat(messages, options);
  yield { content: response.content, done: true };
}

/**
 * List all available (configured) providers.
 */
export function listProviders(): { name: string; configured: boolean }[] {
  return Object.entries(providers).map(([name, provider]) => ({
    name,
    configured: provider.isConfigured(),
  }));
}
