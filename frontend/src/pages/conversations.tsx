import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import MainLayout from '../components/Layout/MainLayout';

export default function ConversationsPage() {
  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Conversations
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => window.location.href = '/chat'}
          >
            New Chat
          </Button>
        </Box>
        
        <Typography variant="body1" color="text.secondary">
          Conversation management page coming soon! For now, you can access all conversations through the chat interface.
        </Typography>
      </Box>
    </MainLayout>
  );
} 