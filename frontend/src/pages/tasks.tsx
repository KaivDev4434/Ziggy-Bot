import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import MainLayout from '../components/Layout/MainLayout';

export default function TasksPage() {
  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Tasks
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => console.log('Create task')}
          >
            New Task
          </Button>
        </Box>
        
        <Typography variant="body1" color="text.secondary">
          Task management page coming soon! For now, you can manage tasks through the AI chat interface.
        </Typography>
      </Box>
    </MainLayout>
  );
} 