import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Avatar,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  Add,
  PlayArrow,
  Schedule,
  TrendingUp,
  Assignment,
  CheckCircle,
  Psychology,
  MoreVert,
} from '@mui/icons-material';
import { format, isToday, isTomorrow } from 'date-fns';
import MainLayout from '../components/Layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { useChatStore } from '../store/chatStore';

// Mock greeting messages for different times
const getGreetingMessage = (userName: string, hour: number) => {
  if (hour < 12) {
    return `Good morning, ${userName}! Ready to tackle today's tasks?`;
  } else if (hour < 17) {
    return `Good afternoon, ${userName}! How's your day going?`;
  } else {
    return `Good evening, ${userName}! Let's wrap up the day productively.`;
  }
};

const getDateGreeting = () => {
  const today = new Date();
  return format(today, 'EEEE, MMMM do, yyyy');
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const { tasks, statistics, fetchTasks, getStatistics, isLoading } = useTaskStore();
  const { conversations, fetchConversations } = useChatStore();

  const [currentHour] = useState(new Date().getHours());

  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth().then(() => {
        if (!isAuthenticated) {
          router.push('/auth/login');
        }
      });
    }
  }, [isAuthenticated, checkAuth, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
      getStatistics();
      fetchConversations();
    }
  }, [isAuthenticated, fetchTasks, getStatistics, fetchConversations]);

  if (!isAuthenticated || !user) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Skeleton variant="text" width="40%" height={40} />
          <Skeleton variant="text" width="60%" height={20} sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Skeleton variant="rectangular" height={120} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </MainLayout>
    );
  }

  const upcomingTasks = tasks
    .filter(task => task.status === 'pending' && task.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5);

  const recentConversations = conversations
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .slice(0, 3);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-task':
        router.push('/tasks?new=true');
        break;
      case 'new-chat':
        router.push('/chat');
        break;
      case 'view-tasks':
        router.push('/tasks');
        break;
      case 'view-conversations':
        router.push('/conversations');
        break;
      default:
        break;
    }
  };

  const formatTaskDeadline = (deadline: string) => {
    const date = new Date(deadline);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getTaskPriorityColor = (priority: number) => {
    if (priority >= 8) return 'error';
    if (priority >= 5) return 'warning';
    return 'success';
  };

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {getGreetingMessage(user.name, currentHour)}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {getDateGreeting()}
          </Typography>
        </Box>

        {/* Quick Actions */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleQuickAction('new-task')}
            >
              New Task
            </Button>
            <Button
              variant="outlined"
              startIcon={<Psychology />}
              onClick={() => handleQuickAction('new-chat')}
            >
              Chat with Ziggy
            </Button>
            <Button
              variant="outlined"
              startIcon={<Assignment />}
              onClick={() => handleQuickAction('view-tasks')}
            >
              View All Tasks
            </Button>
          </Box>
        </Paper>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Assignment sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="h6">Total Tasks</Typography>
                </Box>
                <Typography variant="h4" component="div">
                  {statistics?.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All time
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="h6">Completed</Typography>
                </Box>
                <Typography variant="h4" component="div">
                  {statistics?.completed || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statistics?.completionRate || 0}% completion rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Schedule sx={{ color: 'warning.main', mr: 1 }} />
                  <Typography variant="h6">Pending</Typography>
                </Box>
                <Typography variant="h4" component="div">
                  {statistics?.pending || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Waiting to start
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PlayArrow sx={{ color: 'info.main', mr: 1 }} />
                  <Typography variant="h6">In Progress</Typography>
                </Box>
                <Typography variant="h4" component="div">
                  {statistics?.inProgress || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Currently active
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Upcoming Tasks */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Upcoming Tasks</Typography>
                  <Button
                    size="small"
                    onClick={() => handleQuickAction('view-tasks')}
                  >
                    View All
                  </Button>
                </Box>
                
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} variant="rectangular" height={60} sx={{ mb: 1 }} />
                  ))
                ) : upcomingTasks.length > 0 ? (
                  <List>
                    {upcomingTasks.map((task, index) => (
                      <ListItem
                        key={task.id}
                        divider={index < upcomingTasks.length - 1}
                        sx={{ px: 0 }}
                      >
                        <ListItemText
                          primary={task.title}
                          secondary={task.description}
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {task.priority && (
                              <Chip
                                label={`P${task.priority}`}
                                size="small"
                                color={getTaskPriorityColor(task.priority)}
                              />
                            )}
                            {task.deadline && (
                              <Chip
                                label={formatTaskDeadline(task.deadline)}
                                size="small"
                                variant="outlined"
                              />
                            )}
                            <IconButton size="small">
                              <MoreVert />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No upcoming tasks. Create your first task!
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      sx={{ mt: 2 }}
                      onClick={() => handleQuickAction('new-task')}
                    >
                      Create Task
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity & Conversations */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Recent Conversations</Typography>
                  <Button
                    size="small"
                    onClick={() => handleQuickAction('view-conversations')}
                  >
                    View All
                  </Button>
                </Box>

                {recentConversations.length > 0 ? (
                  <List>
                    {recentConversations.map((conversation, index) => (
                      <ListItem
                        key={conversation.id}
                        divider={index < recentConversations.length - 1}
                        sx={{ px: 0, cursor: 'pointer' }}
                        onClick={() => router.push(`/chat?conversation=${conversation.id}`)}
                      >
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          <Psychology />
                        </Avatar>
                        <ListItemText
                          primary={conversation.title}
                          secondary={`${conversation.messageCount} messages`}
                          primaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No conversations yet. Start chatting with Ziggy!
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Psychology />}
                      sx={{ mt: 2 }}
                      onClick={() => handleQuickAction('new-chat')}
                    >
                      Start Chat
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Productivity Stats */}
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Today's Progress
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Completion Rate</Typography>
                    <Typography variant="body2">
                      {statistics?.completionRate || 0}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={statistics?.completionRate || 0}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Keep up the great work! 🎉
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
} 