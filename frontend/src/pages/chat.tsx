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
    isSending,
    error,
    fetchConversations,
    getConversation,
    createConversation,
    sendMessage,
    setCurrentConversation,
    clearError,
  } = useChatStore();
  const { fetchTasks } = useTaskStore();

  const [messageInput, setMessageInput] = useState('');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth().then(() => {
        if (!isAuthenticated) {
          router.push('/auth/login');
        }
      });
    }
  }, [isAuthenticated, checkAuth, router]);

  // Load conversations and handle conversation selection
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
      if (conversationId && typeof conversationId === 'string') {
        getConversation(conversationId);
      }
    }
  }, [isAuthenticated, conversationId, fetchConversations, getConversation]);

  // Auto-load the most recent conversation if no specific conversation is selected
  useEffect(() => {
    if (isAuthenticated && !conversationId && conversations.length > 0 && !currentConversation) {
      const mostRecentConversation = conversations
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())[0];
      
      if (mostRecentConversation) {
        setCurrentConversation(mostRecentConversation);
        // Update URL to reflect the loaded conversation
        router.replace(`/chat?conversation=${mostRecentConversation.id}`, undefined, { shallow: true });
      }
    }
  }, [isAuthenticated, conversationId, conversations, currentConversation, setCurrentConversation, router]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle scroll to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    const content = messageInput.trim();
    setMessageInput('');

    try {
      const result = await sendMessage(content, currentConversation?.id);
      
      // If tasks were created/updated, refresh the task list
      if (result.actions?.some(action => action.type === 'create_task' || action.type === 'update_task')) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = async () => {
    try {
      const conversation = await createConversation('New Chat');
      router.push(`/chat?conversation=${conversation.id}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleConversationSelect = (conversation: any) => {
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
        key={message.id}
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
            position: 'relative',
          }}
        >
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>

          {/* Show NLP results for assistant messages */}
          {!isUser && message.nlpResult && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip
                  label={`Intent: ${message.nlpResult.intent}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${(message.nlpResult.confidence * 100).toFixed(0)}% confident`}
                  size="small"
                  color={message.nlpResult.confidence > 0.8 ? 'success' : 'warning'}
                />
              </Box>

              {message.nlpResult.entities.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" display="block" gutterBottom>
                    Entities detected:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {message.nlpResult.entities.map((entity, idx) => (
                      <Chip
                        key={idx}
                        label={`${entity.type}: ${entity.value}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {message.nlpResult.tasks.length > 0 && (
                <Box>
                  <Typography variant="caption" display="block" gutterBottom>
                    Tasks created/updated:
                  </Typography>
                  {message.nlpResult.tasks.map((task, idx) => (
                    <Box
                      key={idx}
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
                          color={task.priority >= 8 ? 'error' : task.priority >= 5 ? 'warning' : 'success'}
                        />
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
                New
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
                {conversations.map((conversation) => (
                  <ListItem
                    key={conversation.id}
                    button
                    selected={currentConversation?.id === conversation.id}
                    onClick={() => handleConversationSelect(conversation)}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
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
                    <IconButton size="small">
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
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleNewConversation}
                  size="small"
                >
                  Start First Chat
                </Button>
              </Box>
            )}
          </Box>
        </Card>

        {/* Main Chat Area */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Chat Header */}
          <CardContent sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <Psychology />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {currentConversation?.title || 'Chat with Ziggy'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    AI Task Assistant • Online
                  </Typography>
                </Box>
              </Box>
              <IconButton>
                <MoreVert />
              </IconButton>
            </Box>
          </CardContent>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" onClose={clearError} sx={{ m: 1 }}>
              {error}
            </Alert>
          )}

          {/* Messages Area */}
          <Box
            ref={messagesContainerRef}
            sx={{
              flex: 1,
              overflow: 'auto',
              position: 'relative',
            }}
          >
            {messages.length > 0 ? (
              <List sx={{ py: 1 }}>
                {messages.filter(message => message && message.role).map((message, index) => renderMessage(message, index))}
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
                <Avatar sx={{ bgcolor: 'secondary.main', mb: 2, width: 64, height: 64 }}>
                  <Psychology sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  Hi {user.name}! I'm Ziggy 🤖
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
                  I'm your AI task assistant. I can help you create tasks, manage your schedule, 
                  set reminders, and keep you organized. Just tell me what you need to do!
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Chip
                    label="Create a task for tomorrow"
                    variant="outlined"
                    onClick={() => setMessageInput("Create a task for tomorrow")}
                    clickable
                  />
                  <Chip
                    label="Show my pending tasks"
                    variant="outlined"
                    onClick={() => setMessageInput("Show my pending tasks")}
                    clickable
                  />
                  <Chip
                    label="Schedule a meeting"
                    variant="outlined"
                    onClick={() => setMessageInput("Schedule a meeting")}
                    clickable
                  />
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />

            {/* Scroll to Bottom FAB */}
            {showScrollToBottom && (
              <Fab
                size="small"
                color="primary"
                onClick={scrollToBottom}
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                }}
              >
                <KeyboardArrowDown />
              </Fab>
            )}
          </Box>

          {/* Typing Indicator */}
          {isSending && (
            <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 24, height: 24 }}>
                  <Psychology sx={{ fontSize: 16 }} />
                </Avatar>
                <Typography variant="body2" color="text.secondary">
                  Ziggy is thinking...
                </Typography>
                <CircularProgress size={16} />
              </Box>
            </Box>
          )}

          {/* Message Input */}
          <CardContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Type your message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSending}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || isSending}
                sx={{
                  minWidth: 48,
                  height: 48,
                  borderRadius: 3,
                }}
              >
                {isSending ? <CircularProgress size={24} color="inherit" /> : <Send />}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Press Enter to send, Shift+Enter for new line
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </MainLayout>
  );
} 