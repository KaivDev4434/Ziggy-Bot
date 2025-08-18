import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChatInterface from './components/Chat/ChatInterface';
import { Message } from './types';
import { useCreateJournalEntry } from './hooks/useJournal';
import './App.css';

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Chat Page with real backend integration
const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const createJournalEntry = useCreateJournalEntry();

  const handleSendMessage = async (content: string) => {
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      type: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Save to backend as journal entry
      const journalEntry = await createJournalEntry.mutateAsync(content);
      
      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `✅ I've saved your journal entry! 

📝 **Entry ID**: ${journalEntry.id}
🕒 **Saved at**: ${new Date(journalEntry.created_at).toLocaleString()}

Your message: "${content}"

I'm ready to help you organize your thoughts and tasks. In the next phase, I'll be able to automatically extract tasks, add items to lists, and help you manage everything using proven productivity methods!`,
        type: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      // Handle API errors
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: `❌ Sorry, I couldn't save your journal entry. 

**Error**: ${error.message || 'Unknown error occurred'}

Please make sure the backend server is running on http://localhost:8080. You can try again once the connection is restored.`,
        type: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto h-full">
        <div className="bg-white h-full shadow-xl">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

const TasksPage = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Tasks</h1>
      <p className="text-gray-600">Task management interface coming soon...</p>
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/tasks" element={<TasksPage />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
