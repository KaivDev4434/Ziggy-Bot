import React from 'react';
import { format } from 'date-fns';
import { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.type === 'user';
  const isLoading = message.isLoading;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser 
          ? 'bg-primary-500 text-white rounded-br-sm' 
          : 'bg-white text-gray-800 shadow-md rounded-bl-sm border border-gray-200'
      }`}>
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm text-gray-500">Ziggy is thinking...</span>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            <p className={`text-xs mt-1 ${
              isUser ? 'text-primary-100' : 'text-gray-500'
            }`}>
              {format(message.timestamp, 'h:mm a')}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
