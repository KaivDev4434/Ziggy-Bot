import React, { useRef, useEffect } from 'react';
import { ChatInterfaceProps } from '../../types';
import MessageBubble from './MessageBubble';
import InputArea from './InputArea';

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">Z</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Ziggy</h1>
            <p className="text-sm text-gray-500">Your AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
        <div className="p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">Z</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Ziggy!</h3>
              <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                I'm your personal AI assistant. Tell me about your tasks, thoughts, or anything on your mind, 
                and I'll help you organize everything using proven productivity methods.
              </p>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-1">📝 Journal Entry</h4>
                  <p className="text-sm text-gray-600">"Today I need to call the doctor and buy groceries"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-1">🎯 Quick Task</h4>
                  <p className="text-sm text-gray-600">"Remind me to review the project proposal by Friday"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-1">🎬 Add to Lists</h4>
                  <p className="text-sm text-gray-600">"I want to watch Inception later"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-1">✅ Mark Complete</h4>
                  <p className="text-sm text-gray-600">"I finished the laundry task"</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <InputArea onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatInterface;
