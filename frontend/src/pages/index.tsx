import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/authStore';
import {
  Box,
  CircularProgress,
  Typography,
  Avatar,
} from '@mui/material';
import { Psychology } from '@mui/icons-material';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const handleAuth = async () => {
      try {
        await checkAuth();
        
        // Redirect based on authentication status
        if (isAuthenticated) {
          router.replace('/dashboard');
        } else {
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    handleAuth();
  }, [isMounted, isAuthenticated, checkAuth, router]);

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!isMounted || isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'background.default',
        }}
      >
        <Avatar sx={{ bgcolor: 'primary.main', mb: 3, width: 64, height: 64 }}>
          <Psychology sx={{ fontSize: 32 }} />
        </Avatar>
        <Typography variant="h5" component="h1" gutterBottom color="primary">
          Ziggy Bot
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your AI Task Assistant
        </Typography>
        <CircularProgress />
      </Box>
    );
  }

  // This should not be reached as we redirect above, but just in case
  return null;
} 