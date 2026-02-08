/**
 * UserMetrics Model
 * ユーザー指標管理（エージェント別）
 */

import { supabase } from '../config/supabase.js';

// 一般的なメトリクスキー
export const METRIC_KEYS = {
  // 健康・フィットネス
  WEIGHT: 'weight',
  STEPS: 'steps',
  SLEEP_HOURS: 'sleep_hours',
  WATER_INTAKE: 'water_intake',
  CALORIES: 'calories',
  
  // メンタル
  MOOD: 'mood',
  STRESS_LEVEL: 'stress_level',
  GRATITUDE: 'gratitude',
  
  // 習慣
  HABIT_COMPLETED: 'habit_completed',
  GOAL_PROGRESS: 'goal_progress',
  
  // 学習
  STUDY_MINUTES: 'study_minutes',
  VOCABULARY: 'vocabulary',
  
  // 汎用
  CUSTOM: 'custom',
};

export class UserMetrics {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.agentId = data.agent_id;
    this.metricKey = data.metric_key;
    this.metricValue = data.metric_value;
    this.recordedAt = data.recorded_at;
  }

  /**
   * IDで取得
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? new UserMetrics(data) : null;
  }

  /**
   * ユーザーとエージェントのメトリクス取得
   */
  static async findByUserAgent(userId, agentId, { metricKey, limit = 100, since } = {}) {
    let query = supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (metricKey) {
      query = query.eq('metric_key', metricKey);
    }
    if (since) {
      query = query.gte('recorded_at', since);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(d => new UserMetrics(d));
  }

  /**
   * 最新のメトリクス値取得
   */
  static async getLatest(userId, agentId, metricKey) {
    const { data, error } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .eq('metric_key', metricKey)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? new UserMetrics(data) : null;
  }

  /**
   * メトリクス記録
   */
  static async record({ userId, agentId, metricKey, metricValue, recordedAt }) {
    const { data, error } = await supabase
      .from('user_metrics')
      .insert({
        user_id: userId,
        agent_id: agentId,
        metric_key: metricKey,
        metric_value: metricValue,
        recorded_at: recordedAt || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return new UserMetrics(data);
  }

  /**
   * 複数メトリクス一括記録
   */
  static async recordBatch(userId, agentId, metrics) {
    const records = metrics.map(m => ({
      user_id: userId,
      agent_id: agentId,
      metric_key: m.metricKey,
      metric_value: m.metricValue,
      recorded_at: m.recordedAt || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('user_metrics')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(d => new UserMetrics(d));
  }

  /**
   * 期間内の統計取得
   */
  static async getStats(userId, agentId, metricKey, { since, until } = {}) {
    let query = supabase
      .from('user_metrics')
      .select('metric_value, recorded_at')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .eq('metric_key', metricKey)
      .order('recorded_at', { ascending: true });

    if (since) query = query.gte('recorded_at', since);
    if (until) query = query.lte('recorded_at', until);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return null;

    // 数値の場合は統計計算
    const values = data
      .map(d => d.metric_value?.value)
      .filter(v => typeof v === 'number');

    if (values.length === 0) {
      return {
        count: data.length,
        data,
      };
    }

    return {
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
      data,
    };
  }

  /**
   * メトリクス削除
   */
  async delete() {
    const { error } = await supabase
      .from('user_metrics')
      .delete()
      .eq('id', this.id);

    if (error) throw error;
    return true;
  }

  /**
   * JSON出力用
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      agentId: this.agentId,
      metricKey: this.metricKey,
      metricValue: this.metricValue,
      recordedAt: this.recordedAt,
    };
  }
}

// =====================================================
// DailyUsage - 日次利用量
// =====================================================
export class DailyUsage {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.date = data.date;
    this.messageCount = data.message_count;
    this.tokensUsed = data.tokens_used;
    this.createdAt = data.created_at;
  }

  /**
   * 今日の利用量取得
   */
  static async getToday(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? new DailyUsage(data) : null;
  }

  /**
   * 利用量インクリメント
   */
  static async increment(userId, { messageCount = 1, tokensUsed = 0 } = {}) {
    const today = new Date().toISOString().split('T')[0];

    // upsert
    const { data, error } = await supabase.rpc('increment_daily_usage', {
      p_user_id: userId,
      p_date: today,
      p_message_count: messageCount,
      p_tokens_used: tokensUsed,
    });

    if (error) {
      // フォールバック: 手動upsert
      const existing = await DailyUsage.getToday(userId);
      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from('daily_usage')
          .update({
            message_count: existing.messageCount + messageCount,
            tokens_used: existing.tokensUsed + tokensUsed,
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (updateError) throw updateError;
        return new DailyUsage(updated);
      } else {
        const { data: created, error: createError } = await supabase
          .from('daily_usage')
          .insert({
            user_id: userId,
            date: today,
            message_count: messageCount,
            tokens_used: tokensUsed,
          })
          .select()
          .single();
        if (createError) throw createError;
        return new DailyUsage(created);
      }
    }

    return data;
  }

  /**
   * 期間内の利用量取得
   */
  static async getRange(userId, since, until) {
    const { data, error } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('date', since)
      .lte('date', until)
      .order('date');

    if (error) throw error;
    return (data || []).map(d => new DailyUsage(d));
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      date: this.date,
      messageCount: this.messageCount,
      tokensUsed: this.tokensUsed,
    };
  }
}

// =====================================================
// Streak - ストリーク
// =====================================================
export class Streak {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.agentId = data.agent_id;
    this.currentStreak = data.current_streak;
    this.longestStreak = data.longest_streak;
    this.lastActiveDate = data.last_active_date;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * ストリーク取得
   */
  static async get(userId, agentId = null) {
    let query = supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId);

    if (agentId) {
      query = query.eq('agent_id', agentId);
    } else {
      query = query.is('agent_id', null);
    }

    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? new Streak(data) : null;
  }

  /**
   * ストリーク更新（アクティビティ記録）
   */
  static async recordActivity(userId, agentId = null) {
    const today = new Date().toISOString().split('T')[0];
    let streak = await Streak.get(userId, agentId);

    if (!streak) {
      // 新規作成
      const { data, error } = await supabase
        .from('streaks')
        .insert({
          user_id: userId,
          agent_id: agentId,
          current_streak: 1,
          longest_streak: 1,
          last_active_date: today,
        })
        .select()
        .single();
      if (error) throw error;
      return new Streak(data);
    }

    // 既存ストリーク更新
    const lastDate = new Date(streak.lastActiveDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

    let newStreak = streak.currentStreak;
    if (diffDays === 0) {
      // 同日: 変更なし
      return streak;
    } else if (diffDays === 1) {
      // 連続: インクリメント
      newStreak = streak.currentStreak + 1;
    } else {
      // 途切れ: リセット
      newStreak = 1;
    }

    const longestStreak = Math.max(newStreak, streak.longestStreak);

    const { data, error } = await supabase
      .from('streaks')
      .update({
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_active_date: today,
      })
      .eq('id', streak.id)
      .select()
      .single();

    if (error) throw error;
    return new Streak(data);
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      agentId: this.agentId,
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak,
      lastActiveDate: this.lastActiveDate,
    };
  }
}

export default { UserMetrics, DailyUsage, Streak, METRIC_KEYS };
