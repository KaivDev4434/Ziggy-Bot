import React from 'react';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Companion Chatbot - Ziggy Bot</title>
        <meta name="description" content="Your intelligent task management companion" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ 
        minHeight: '100vh', 
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <h1 style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem',
          color: '#2563eb',
          textAlign: 'center'
        }}>
          🤖 Companion Chatbot
        </h1>
        
        <h2 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '2rem',
          color: '#64748b',
          textAlign: 'center'
        }}>
          Ziggy Bot - Your Intelligent Task Management Companion
        </h2>

        <div style={{
          padding: '2rem',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          backgroundColor: '#f8fafc',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#059669', marginBottom: '1rem' }}>
            ✅ Phase 1 Complete!
          </h3>
          
          <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
            Your development environment is successfully set up and running:
          </p>
          
          <ul style={{ 
            textAlign: 'left', 
            lineHeight: '1.8',
            color: '#374151'
          }}>
            <li>🎯 <strong>Frontend</strong>: Running on port 3000</li>
            <li>🚀 <strong>Backend API</strong>: Running on port 8080</li>
            <li>🗄️ <strong>MongoDB</strong>: Running on port 27017</li>
            <li>🧠 <strong>Local LLM (Ollama)</strong>: Running on port 11434</li>
            <li>🔑 <strong>Perplexity API</strong>: Configured</li>
          </ul>

          <div style={{ 
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#dbeafe',
            borderRadius: '0.25rem'
          }}>
            <p style={{ margin: 0, color: '#1e40af' }}>
              <strong>Ready for Phase 2:</strong> Database Design and Core Backend Development
            </p>
          </div>
        </div>
      </main>
    </>
  );
} 