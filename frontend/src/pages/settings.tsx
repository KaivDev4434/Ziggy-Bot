import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import MainLayout from '../components/Layout/MainLayout';

export default function SettingsPage() {
  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Settings
          </Typography>
        </Box>
        
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Preferences
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Settings and preferences page coming soon! Your preferences are currently managed automatically by the AI system.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </MainLayout>
  );
} 