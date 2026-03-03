// AI module public API
// Re-exports everything needed by the rest of the app

export { chat, chatStream, getProvider, listProviders } from "./registry";
export type {
  AIProvider,
  AIProviderOptions,
  AIProviderResponse,
  ChatMessage,
  StreamChunk,
} from "./types";
