import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { updateUser, supabase } from '../config/database.js';

const router = Router();

// GET /api/users/profile
router.get('/profile', authenticate, (req, res) => {
  const user = req.user;
  
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    avatar_url: user.avatar_url,
    created_at: user.created_at
  });
});

// PUT /api/users/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, avatar_url } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (avatar_url) updates.avatar_url = avatar_url;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    const updated = await updateUser(req.user.id, updates);
    
    res.json({
      message: 'Profile updated',
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        plan: updated.plan,
        avatar_url: updated.avatar_url
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/agents
router.get('/agents', authenticate, async (req, res) => {
  try {
    // Get user's unlocked agents
    const { data: userAgents, error } = await supabase
      .from('user_agents')
      .select(`
        agent_id,
        unlocked_at,
        agents (
          id,
          name,
          display_name,
          description,
          avatar_url,
          personality
        )
      `)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    // Default agents (always available)
    const defaultAgents = [
      {
        id: 'hina',
        name: 'hina',
        display_name: 'ヒナ',
        description: '明るく元気な女の子。いつもポジティブに励ましてくれる',
        personality: 'cheerful',
        unlocked: true
      },
      {
        id: 'kai',
        name: 'kai',
        display_name: 'カイ',
        description: 'クールで頼れる男の子。落ち着いた雰囲気で相談に乗ってくれる',
        personality: 'cool',
        unlocked: true
      },
      {
        id: 'mochi',
        name: 'mochi',
        display_name: 'モチ',
        description: '可愛くて元気な子。一緒にいると楽しくなる',
        personality: 'playful',
        unlocked: true
      }
    ];
    
    res.json({ agents: defaultAgents });
  } catch (error) {
    console.error('Agents fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/users/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Get message count
    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);
    
    // Get streak (consecutive days)
    const { data: usageData } = await supabase
      .from('usage')
      .select('date')
      .eq('user_id', req.user.id)
      .order('date', { ascending: false })
      .limit(30);
    
    let streak = 0;
    if (usageData && usageData.length > 0) {
      const today = new Date();
      let checkDate = new Date(today.toISOString().split('T')[0]);
      
      for (const usage of usageData) {
        const usageDate = new Date(usage.date);
        if (usageDate.getTime() === checkDate.getTime()) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
    
    res.json({
      total_messages: messageCount || 0,
      streak_days: streak,
      member_since: req.user.created_at
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
