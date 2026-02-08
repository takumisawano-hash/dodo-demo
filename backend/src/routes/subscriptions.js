import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { updateUser, supabase } from '../config/database.js';
import { getPlanLimit } from '../middleware/rateLimit.js';

const router = Router();

// Plan definitions
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    messages_per_day: 20,
    features: ['3 default agents', 'Basic chat', 'Haiku model']
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 500, // ¥500/month
    messages_per_day: 50,
    features: ['3 default agents', '50 messages/day', 'Haiku model', 'Chat history']
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 1000, // ¥1000/month
    messages_per_day: 100,
    features: ['All agents', '100 messages/day', 'Haiku model', 'Priority support']
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 2000, // ¥2000/month
    messages_per_day: 200,
    features: ['All agents', '200 messages/day', 'Sonnet model', 'Priority support', 'Custom agents']
  }
};

// GET /api/subscriptions/plans
router.get('/plans', (req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

// GET /api/subscriptions/current
router.get('/current', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const plan = PLANS[user.plan] || PLANS.free;
    
    // Get subscription details if exists
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();
    
    res.json({
      plan,
      subscription: subscription ? {
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end
      } : null,
      usage: {
        limit: getPlanLimit(user.plan),
        plan: user.plan
      }
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// POST /api/subscriptions/upgrade
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const { plan_id } = req.body;
    
    if (!PLANS[plan_id]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    if (plan_id === 'free') {
      return res.status(400).json({ error: 'Cannot upgrade to free plan' });
    }
    
    // In production, integrate with payment provider (Stripe, etc.)
    // For now, just update the plan
    
    const updated = await updateUser(req.user.id, { plan: plan_id });
    
    // Create subscription record
    await supabase.from('subscriptions').upsert({
      user_id: req.user.id,
      plan_id,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    res.json({
      message: 'Plan upgraded successfully',
      plan: PLANS[plan_id]
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

// POST /api/subscriptions/cancel
router.post('/cancel', authenticate, async (req, res) => {
  try {
    // Mark subscription as cancelled at period end
    const { error } = await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('user_id', req.user.id)
      .eq('status', 'active');
    
    if (error) throw error;
    
    res.json({
      message: 'Subscription will be cancelled at the end of the billing period'
    });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// POST /api/subscriptions/webhook (for payment provider)
router.post('/webhook', async (req, res) => {
  // Handle payment provider webhooks
  // Stripe, etc.
  
  const event = req.body;
  
  console.log('Webhook received:', event.type);
  
  // TODO: Verify webhook signature
  // TODO: Handle different event types
  
  res.json({ received: true });
});

export default router;
