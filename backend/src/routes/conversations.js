// Conversations API - History management
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { isValidAgent } from '../agents/index.js';
import { 
  getConversationHistory, 
  clearConversation,
  getAllUserData,
  setUserData
} from '../db/index.js';

const router = Router();

/**
 * GET /api/conversations/:agentType
 * Get conversation history with an agent
 */
router.get('/:agentType', authMiddleware, (req, res, next) => {
  try {
    const { agentType } = req.params;
    const { offset = 0, limit = 50 } = req.query;
    
    if (!isValidAgent(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    const result = getConversationHistory(
      req.user.id, 
      agentType, 
      parseInt(offset), 
      parseInt(limit)
    );
    
    res.json({
      agentType,
      ...result
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/conversations/:agentType
 * Clear conversation history with an agent
 */
router.delete('/:agentType', authMiddleware, (req, res, next) => {
  try {
    const { agentType } = req.params;
    
    if (!isValidAgent(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    clearConversation(req.user.id, agentType);
    
    res.json({
      success: true,
      message: `Conversation with ${agentType} cleared`
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/conversations/:agentType/data
 * Get user data stored by an agent
 */
router.get('/:agentType/data', authMiddleware, (req, res, next) => {
  try {
    const { agentType } = req.params;
    
    if (!isValidAgent(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    const data = getAllUserData(req.user.id, agentType);
    
    res.json({
      agentType,
      data
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/conversations/:agentType/data
 * Update user data for an agent
 */
router.put('/:agentType/data', authMiddleware, (req, res, next) => {
  try {
    const { agentType } = req.params;
    const updates = req.body;
    
    if (!isValidAgent(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    // Save each key-value pair
    for (const [key, value] of Object.entries(updates)) {
      setUserData(req.user.id, agentType, key, value);
    }
    
    const data = getAllUserData(req.user.id, agentType);
    
    res.json({
      success: true,
      agentType,
      data
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;
