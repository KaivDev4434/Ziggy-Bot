import { create } from 'zustand';
import { chatApi, Conversation, Message } from '../lib/api';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}

interface ChatActions {
  fetchConversations: () => Promise<void>;
  getConversation: (id: string) => Promise<void>;
  createConversation: (title?: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string, conversationId?: string) => Promise<{ message: Message; response: Message; actions?: any[] }>;
  getHistory: (conversationId?: string) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (message: Message) => void;
  clearError: () => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  // State
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,

  // Actions
  fetchConversations: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await chatApi.getConversations();
      const { conversations } = response.data.data!;
      
      set({ 
        conversations,
        isLoading: false,
        error: null 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch conversations'
      });
    }
  },

  getConversation: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await chatApi.getConversation(id);
      const { conversation, messages } = response.data.data!;
      
      // Filter out any invalid messages
      const validMessages = messages.filter((msg: Message) => msg && msg.role);
      
      set({ 
        currentConversation: conversation,
        messages: validMessages,
        isLoading: false,
        error: null 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch conversation'
      });
    }
  },

  createConversation: async (title?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await chatApi.createConversation({ title });
      const { conversation } = response.data.data!;
      
      // Add new conversation to the list
      const { conversations } = get();
      set({ 
        conversations: [conversation, ...conversations],
        currentConversation: conversation,
        messages: [], // New conversation starts with no messages
        isLoading: false,
        error: null 
      });
      
      return conversation;
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to create conversation'
      });
      throw error;
    }
  },

  deleteConversation: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      await chatApi.deleteConversation(id);
      
      // Remove conversation from the list
      const { conversations, currentConversation } = get();
      const filteredConversations = conversations.filter(c => c.id !== id);
      
      set({ 
        conversations: filteredConversations,
        currentConversation: currentConversation?.id === id ? null : currentConversation,
        messages: currentConversation?.id === id ? [] : get().messages,
        isLoading: false,
        error: null 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to delete conversation'
      });
      throw error;
    }
  },

  sendMessage: async (content: string, conversationId?: string) => {
    try {
      set({ isSending: true, error: null });
      
      const response = await chatApi.sendMessage({ content, conversationId });
      const { message, response: botResponse, conversation, actions } = response.data.data!;
      
      // Update current conversation if it changed
      const isNewConversation = conversation.id !== get().currentConversation?.id;
      
      if (isNewConversation) {
        set({ currentConversation: conversation });
        
        // Update conversations list
        const { conversations } = get();
        const updatedConversations = conversations.map(c => 
          c.id === conversation.id ? conversation : c
        );
        if (!conversations.find(c => c.id === conversation.id)) {
          updatedConversations.unshift(conversation);
        }
        set({ conversations: updatedConversations });
        
        // For new conversations, load the full conversation to get all messages
        // This ensures we have the complete message history
        try {
          const conversationResponse = await chatApi.getConversation(conversation.id);
          const { messages: allMessages } = conversationResponse.data.data!;
          const validMessages = allMessages.filter((msg: Message) => msg && msg.role);
          
          set({ 
            messages: validMessages,
            isSending: false,
            error: null 
          });
        } catch (error) {
          console.warn('Failed to load full conversation, using partial messages:', error);
          // Fallback to adding just the new messages
          const { messages } = get();
          const newMessages = [];
          if (message && message.role) newMessages.push(message);
          if (botResponse && botResponse.role) newMessages.push(botResponse);
          
          set({ 
            messages: [...messages, ...newMessages],
            isSending: false,
            error: null 
          });
        }
      } else {
        // Same conversation, just add the new messages
        const { messages } = get();
        const newMessages = [];
        if (message && message.role) newMessages.push(message);
        if (botResponse && botResponse.role) newMessages.push(botResponse);
        
        set({ 
          messages: [...messages, ...newMessages],
          isSending: false,
          error: null 
        });
      }
      
      return { message, response: botResponse, actions };
    } catch (error: any) {
      set({ 
        isSending: false, 
        error: error.response?.data?.message || 'Failed to send message'
      });
      throw error;
    }
  },

  getHistory: async (conversationId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await chatApi.getHistory(conversationId);
      const { messages } = response.data.data!;
      
      // Filter out any invalid messages
      const validMessages = messages.filter((msg: Message) => msg && msg.role);
      
      set({ 
        messages: validMessages,
        isLoading: false,
        error: null 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch message history'
      });
    }
  },

  setCurrentConversation: (conversation: Conversation | null) => {
    set({ 
      currentConversation: conversation,
      messages: [] // Clear messages when switching conversations
    });
    
    // Load messages for the new conversation
    if (conversation) {
      get().getConversation(conversation.id);
    }
  },

  addMessage: (message: Message) => {
    if (!message || !message.role) {
      console.warn('Attempted to add invalid message:', message);
      return;
    }
    const { messages } = get();
    set({ messages: [...messages, message] });
  },

  clearError: () => set({ error: null }),
  
  clearMessages: () => set({ messages: [] }),
})); 