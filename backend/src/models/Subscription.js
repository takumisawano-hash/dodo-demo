/**
 * Subscription Model
 * サブスクリプション管理
 */

import { supabase } from '../config/supabase.js';

// プラン定義
export const PLANS = {
  FREE_TRIAL: 'free_trial',
  STARTER: 'starter',
  BASIC: 'basic',
  PRO: 'pro',
};

// プラン制限
export const PLAN_LIMITS = {
  [PLANS.FREE_TRIAL]: {
    messagesPerDay: 10,
    maxSlots: 1,
    model: 'haiku',
    duration: 7, // days
  },
  [PLANS.STARTER]: {
    messagesPerDay: 50,
    maxSlots: 1,
    model: 'haiku',
  },
  [PLANS.BASIC]: {
    messagesPerDay: 200,
    maxSlots: 3,
    model: 'sonnet',
  },
  [PLANS.PRO]: {
    messagesPerDay: Infinity,
    maxSlots: 5,
    model: 'sonnet',
  },
};

export const STATUS = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  EXPIRED: 'expired',
  PAST_DUE: 'past_due',
};

export class Subscription {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.plan = data.plan;
    this.status = data.status;
    this.stripeCustomerId = data.stripe_customer_id;
    this.stripeSubscriptionId = data.stripe_subscription_id;
    this.currentPeriodStart = data.current_period_start;
    this.currentPeriodEnd = data.current_period_end;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * IDで取得
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? new Subscription(data) : null;
  }

  /**
   * ユーザーIDでアクティブなサブスク取得
   */
  static async findActiveByUserId(userId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', STATUS.ACTIVE)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? new Subscription(data) : null;
  }

  /**
   * Stripe Subscription IDで取得
   */
  static async findByStripeId(stripeSubscriptionId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? new Subscription(data) : null;
  }

  /**
   * サブスクリプション作成
   */
  static async create({
    userId,
    plan,
    status = STATUS.ACTIVE,
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
  }) {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan,
        status,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
      })
      .select()
      .single();

    if (error) throw error;
    return new Subscription(data);
  }

  /**
   * 無料トライアル作成
   */
  static async createFreeTrial(userId) {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + PLAN_LIMITS[PLANS.FREE_TRIAL].duration);

    return Subscription.create({
      userId,
      plan: PLANS.FREE_TRIAL,
      status: STATUS.ACTIVE,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: endDate.toISOString(),
    });
  }

  /**
   * ステータス更新
   */
  async updateStatus(status) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;
    this.status = status;
    return this;
  }

  /**
   * 期間更新（Stripeから）
   */
  async updatePeriod(start, end) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        current_period_start: start,
        current_period_end: end,
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;
    this.currentPeriodStart = start;
    this.currentPeriodEnd = end;
    return this;
  }

  /**
   * プラン制限取得
   */
  getLimits() {
    return PLAN_LIMITS[this.plan] || PLAN_LIMITS[PLANS.FREE_TRIAL];
  }

  /**
   * アクティブか確認
   */
  isActive() {
    if (this.status !== STATUS.ACTIVE) return false;
    if (this.currentPeriodEnd) {
      return new Date(this.currentPeriodEnd) > new Date();
    }
    return true;
  }

  /**
   * 期限切れか確認
   */
  isExpired() {
    if (!this.currentPeriodEnd) return false;
    return new Date(this.currentPeriodEnd) <= new Date();
  }

  /**
   * JSON出力用
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      plan: this.plan,
      status: this.status,
      limits: this.getLimits(),
      currentPeriodStart: this.currentPeriodStart,
      currentPeriodEnd: this.currentPeriodEnd,
      isActive: this.isActive(),
      createdAt: this.createdAt,
    };
  }
}

export default Subscription;
