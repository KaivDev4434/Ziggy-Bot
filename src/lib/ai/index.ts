// AI module public API
// Re-exports everything needed by the rest of the app

export { chat, getProvider, listProviders } from "./registry";
export type {
  AIProvider,
  AIProviderOptions,
  AIProviderResponse,
  ChatMessage,
} from "./types";
