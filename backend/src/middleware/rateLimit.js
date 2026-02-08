import { getUserUsageToday } from '../config/database.js';

// Plan limits (messages per day)
const PLAN_LIMITS = {
  free: 20,
  starter: 50,
  basic: 100,
  pro: 200
};

export function getPlanLimit(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export async function checkRateLimit(req, res, next) {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const plan = user.plan || 'free';
    const limit = getPlanLimit(plan);
    const usageToday = await getUserUsageToday(user.id);
    
    // Attach usage info to request
    req.usage = {
      used: usageToday,
      limit,
      remaining: Math.max(0, limit - usageToday),
      plan
    };
    
    if (usageToday >= limit) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: `You've used all ${limit} messages for today. Upgrade your plan for more!`,
        usage: req.usage,
        upgradeUrl: '/subscription'
      });
    }
    
    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    res.status(500).json({ error: 'Failed to check usage limit' });
  }
}

// Model selection based on plan
export function selectModel(plan) {
  // Pro gets Sonnet, others get Haiku
  if (plan === 'pro') {
    return 'claude-sonnet-4-20250514';
  }
  return 'claude-haiku-4-20250514';
}

export default checkRateLimit;
