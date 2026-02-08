import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDB } from './db/index.js';
import chatRouter from './routes/chat.js';
import usersRouter from './routes/users.js';
import conversationsRouter from './routes/conversations.js';
import agentsRouter from './routes/agents.js';

const app = express();
const PORT = process.env.PORT || 3100;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'dodo-backend',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/chat', chatRouter);
app.use('/api/users', usersRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/agents', agentsRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Initialize
async function start() {
  console.log('🦤 Starting DoDo Backend...');
  
  // Initialize database
  await initDB();
  console.log('✅ Database initialized');
  
  // Start server
  app.listen(PORT, () => {
    console.log(`🎯 DoDo API running on http://localhost:${PORT}`);
    console.log(`   AI Provider: ${process.env.AI_PROVIDER || 'anthropic'}`);
  });
}

start().catch(console.error);
