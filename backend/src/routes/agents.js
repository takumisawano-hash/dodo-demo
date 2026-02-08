// Agents API - List available agents
import { Router } from 'express';
import { getAgentList, getAgent } from '../agents/index.js';

const router = Router();

/**
 * GET /api/agents
 * List all available agents
 */
router.get('/', (req, res) => {
  const agents = getAgentList();
  res.json({ agents });
});

/**
 * GET /api/agents/:agentType
 * Get details of a specific agent
 */
router.get('/:agentType', (req, res) => {
  const { agentType } = req.params;
  const agent = getAgent(agentType);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json({
    id: agentType,
    name: agent.AGENT_NAME,
    emoji: agent.AGENT_EMOJI,
    description: agent.AGENT_DESCRIPTION
  });
});

export default router;
