import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  IconButton,
  Chip,
  CircularProgress,
  Divider,
  Tooltip,
  Alert,
  Fab,
} from '@mui/material';
import {
  Send,
  Psychology,
  Person,
  Add,
  MoreVert,
  TaskAlt,
  Schedule,
  CheckCircle,
  Error,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import MainLayout from '../components/Layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useTaskStore } from '../store/taskStore';
import { Message } from '../lib/api';

export default function ChatPage() {
  const router = useRouter();
  const { conversationId } = router.query;
  
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    sendMessage,
    fetchConversations,
    getHistory,
    getConversation,
    createConversation,
    setCurrentConversation,
  } = useChatStore();
  const { fetchTasks } = useTaskStore();
  
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle scroll visibility
  const handleScroll = (e: any) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, checkAuth]);

  // Fetch conversations on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchConversations();
    }
  }, [isAuthenticated, user, fetchConversations]);

  // Handle conversation selection from URL
  useEffect(() => {
    if (conversationId && 
        conversationId !== 'undefined' && 
        typeof conversationId === 'string' && 
        conversationId.length > 0 &&
        conversationId !== 'null') {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        getConversation(conversationId);
      } else {
        // If conversation not found in list, redirect to chat without conversation
        console.warn('Conversation not found in list:', conversationId);
        router.replace('/chat', undefined, { shallow: true });
      }
    }
  }, [conversationId, conversations, setCurrentConversation, getConversation, router]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!currentConversation && conversations.length > 0) {
      const firstConversation = conversations[0];
      if (firstConversation && firstConversation.id) {
        setCurrentConversation(firstConversation);
        router.push(`/chat?conversation=${firstConversation.id}`, undefined, { shallow: true });
      }
    }
  }, [currentConversation, conversations, setCurrentConversation, router]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    const messageText = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    try {
      let conversationToUse = currentConversation;
      
      // Create new conversation if none exists
      if (!conversationToUse) {
        conversationToUse = await createConversation(`Chat ${new Date().toLocaleString()}`);
        if (conversationToUse && conversationToUse.id) {
          router.push(`/chat?conversation=${conversationToUse.id}`, undefined, { shallow: true });
        }
      }

      await sendMessage(messageText, conversationToUse.id);
      
      // Refresh task data in case new tasks were created
      fetchTasks();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConversation = await createConversation(`New Chat ${new Date().toLocaleString()}`);
      setCurrentConversation(newConversation);
      if (newConversation && newConversation.id) {
        router.push(`/chat?conversation=${newConversation.id}`);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleConversationSelect = (conversation: any) => {
    if (!conversation || !conversation.id) {
      console.warn('Invalid conversation selected:', conversation);
      return;
    }
    setCurrentConversation(conversation);
    router.push(`/chat?conversation=${conversation.id}`);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const renderMessage = (message: Message, index: number) => {
    // Safety check to prevent undefined message errors
    if (!message || !message.role) {
      console.warn('Undefined message detected:', message, 'at index:', index);
      return null;
    }
    
    const isUser = message.role === 'user';
    const isLastMessage = index === messages.length - 1;

    return (
      <ListItem
        key={message.id || `message-${index}-${message.role}-${Date.now()}`}
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          px: 2,
          py: 1,
        }}
      >
        <ListItemAvatar sx={{ minWidth: 0, mx: 1 }}>
          <Avatar
            sx={{
              bgcolor: isUser ? 'primary.main' : 'secondary.main',
              width: 32,
              height: 32,
            }}
          >
            {isUser ? <Person /> : <Psychology />}
          </Avatar>
        </ListItemAvatar>

        <Box
          sx={{
            maxWidth: '70%',
            backgroundColor: isUser ? 'primary.main' : 'grey.100',
            color: isUser ? 'white' : 'text.primary',
            borderRadius: 2,
            px: 2,
            py: 1,
          }}
        >
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>

          {/* Show NLP results for assistant messages */}
          {!isUser && message.nlpResult && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              {message.nlpResult.entities && message.nlpResult.entities.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" display="block" gutterBottom>
                    Entities detected:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {message.nlpResult.entities.map((entity, idx) => (
                      <Chip
                        key={`${message.id || 'msg'}-entity-${idx}-${entity.type}-${entity.value}`}
                        label={`${entity.type}: ${entity.value}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {message.nlpResult.tasks && message.nlpResult.tasks.length > 0 && (
                <Box>
                  <Typography variant="caption" display="block" gutterBottom>
                    Tasks created/updated:
                  </Typography>
                  {message.nlpResult.tasks.map((task, idx) => (
                    <Box
                      key={`${message.id || 'msg'}-task-${idx}-${task.title || 'task'}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.5,
                        px: 1,
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    >
                      <TaskAlt sx={{ fontSize: 16 }} />
                      <Typography variant="caption">{task.title}</Typography>
                      {task.priority && (
                        <Chip
                          label={`P${task.priority}`}
                          size="small"
                          color="primary"
                          sx={{ fontSize: '0.6rem', height: 16 }}
                        />
                      )}
                      {task.deadline && (
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          📅 {format(new Date(task.deadline), 'MMM d')}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'right',
              mt: 0.5,
              opacity: 0.7,
            }}
          >
            {formatMessageTime(message.timestamp)}
          </Typography>
        </Box>
      </ListItem>
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex' }}>
        {/* Conversations Sidebar */}
        <Card sx={{ width: 320, mr: 2, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Conversations</Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={handleNewConversation}
              >
                New Chat
              </Button>
            </Box>
          </CardContent>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : conversations.length > 0 ? (
              <List sx={{ py: 0 }}>
                {conversations.map((conversation, index) => (
                  <ListItem
                    key={conversation.id || `conversation-${index}-${conversation.title || 'untitled'}`}
                    selected={currentConversation?.id === conversation.id}
                    onClick={() => handleConversationSelect(conversation)}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.5,
                      cursor: 'pointer',
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
                        <Psychology />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={conversation.title}
                      secondary={`${conversation.messageCount} messages`}
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{
                        noWrap: true,
                        sx: { opacity: currentConversation?.id === conversation.id ? 0.8 : 0.6 }
                      }}
                    />
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle menu click here
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No conversations yet
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleNewConversation}
                >
                  Start First Chat
                </Button>
              </Box>
            )}
          </Box>
        </Card>

        {/* Chat Area */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Chat Header */}
          <CardContent sx={{ borderBottom: 1, borderColor: 'divider', py: 2 }}>
            <Typography variant="h6">
              {currentConversation ? currentConversation.title : 'Select a conversation'}
            </Typography>
          </CardContent>

          {/* Messages */}
          <Box
            onScroll={handleScroll}
            sx={{
              flex: 1,
              overflow: 'auto',
              position: 'relative',
            }}
          >
            {messages.length > 0 ? (
              <List sx={{ py: 1 }}>
                {messages
                  .filter(message => message && message.role && (message.id || message.content))
                  .map((message, index) => renderMessage(message, index))
                  .filter(Boolean)
                }
              </List>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  p: 3,
                }}
              >
                <Psychology sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Start chatting with Ziggy!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ask questions, create tasks, or just have a conversation.
                </Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Scroll to Bottom Button */}
          {showScrollButton && (
            <Fab
              size="small"
              color="primary"
              sx={{
                position: 'absolute',
                bottom: 80,
                right: 24,
              }}
              onClick={scrollToBottom}
            >
              <KeyboardArrowDown />
            </Fab>
          )}

          {/* Message Input */}
          <CardContent sx={{ pt: 2, pb: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isSending}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'background.paper',
                  },
                }}
              />
              <Button
                variant="contained"
                endIcon={<Send />}
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || isSending}
                sx={{ py: 1.5, px: 3 }}
              >
                {isSending ? <CircularProgress size={20} color="inherit" /> : 'Send'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </MainLayout>
  );
} 