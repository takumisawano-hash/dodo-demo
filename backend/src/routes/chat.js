import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authenticate } from '../middleware/auth.js';
import { checkRateLimit, selectModel } from '../middleware/rateLimit.js';
import { getAgent, incrementUsage, saveMessage, getConversationHistory } from '../config/database.js';
import { getAgentPrompt } from '../config/agentPrompts.js';

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// POST /api/chat/:agentId - Send message to agent
router.post('/:agentId', authenticate, checkRateLimit, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message } = req.body;
    const user = req.user;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get agent system prompt
    const systemPrompt = getAgentPrompt(agentId);
    
    // Get conversation history
    const history = await getConversationHistory(user.id, agentId, 10);
    const messages = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add current message
    messages.push({ role: 'user', content: message });
    
    // Select model based on plan
    const model = selectModel(user.plan);
    
    // Call Claude API
    const response = await anthropic.messages.create({
      model,
      max_tokens: 500,
      system: systemPrompt,
      messages
    });
    
    const assistantMessage = response.content[0].text;
    
    // Save messages to database
    await saveMessage(user.id, agentId, 'user', message);
    await saveMessage(user.id, agentId, 'assistant', assistantMessage);
    
    // Increment usage
    await incrementUsage(user.id);
    
    res.json({
      message: assistantMessage,
      usage: {
        used: req.usage.used + 1,
        limit: req.usage.limit,
        remaining: req.usage.remaining - 1
      },
      model
    });
  } catch (error) {
    console.error('Chat error:', error);
    
    if (error.status === 429) {
      return res.status(429).json({ error: 'API rate limit exceeded. Please try again later.' });
    }
    
    res.status(500).json({ error: 'Failed to get response' });
  }
});

// GET /api/chat/:agentId/history - Get conversation history
router.get('/:agentId/history', authenticate, async (req, res) => {
  try {
    const { agentId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await getConversationHistory(req.user.id, agentId, limit);
    
    res.json({ messages: history });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/chat/usage - Get current usage
router.get('/usage', authenticate, async (req, res) => {
  try {
    const { getUserUsageToday } = await import('../config/database.js');
    const { getPlanLimit } = await import('../middleware/rateLimit.js');
    
    const usageToday = await getUserUsageToday(req.user.id);
    const limit = getPlanLimit(req.user.plan);
    
    res.json({
      used: usageToday,
      limit,
      remaining: Math.max(0, limit - usageToday),
      plan: req.user.plan
    });
  } catch (error) {
    console.error('Usage error:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

export default router;
