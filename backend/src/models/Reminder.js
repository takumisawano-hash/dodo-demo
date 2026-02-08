/**
 * Reminder Model
 * リマインダー管理
 */

import { supabase } from '../config/supabase.js';

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export class Reminder {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.agentId = data.agent_id;
    this.time = data.time;
    this.days = data.days || [];
    this.timezone = data.timezone || 'Asia/Tokyo';
    this.message = data.message;
    this.enabled = data.enabled;
    this.lastTriggeredAt = data.last_triggered_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * IDで取得
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? new Reminder(data) : null;
  }

  /**
   * ユーザーIDでリマインダー一覧取得
   */
  static async findByUserId(userId, { agentId, enabledOnly = false } = {}) {
    let query = supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('time');

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    if (enabledOnly) {
      query = query.eq('enabled', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(d => new Reminder(d));
  }

  /**
   * 有効なリマインダーを時刻と曜日で取得
   */
  static async findDueReminders(time, dayOfWeek) {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('time', time)
      .eq('enabled', true)
      .contains('days', [dayOfWeek]);

    if (error) throw error;
    return (data || []).map(d => new Reminder(d));
  }

  /**
   * リマインダー作成
   */
  static async create({ userId, agentId, time, days = [], timezone = 'Asia/Tokyo', message }) {
    // 曜日バリデーション
    const validDays = days.filter(d => DAYS.includes(d.toLowerCase()));

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: userId,
        agent_id: agentId,
        time,
        days: validDays,
        timezone,
        message,
        enabled: true,
      })
      .select()
      .single();

    if (error) throw error;
    return new Reminder(data);
  }

  /**
   * リマインダー更新
   */
  async update(updates) {
    const updateData = {};

    if (updates.time !== undefined) updateData.time = updates.time;
    if (updates.days !== undefined) {
      updateData.days = updates.days.filter(d => DAYS.includes(d.toLowerCase()));
    }
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.message !== undefined) updateData.message = updates.message;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

    const { data, error } = await supabase
      .from('reminders')
      .update(updateData)
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;
    Object.assign(this, new Reminder(data));
    return this;
  }

  /**
   * 有効/無効切り替え
   */
  async toggle() {
    return this.update({ enabled: !this.enabled });
  }

  /**
   * トリガー記録
   */
  async markTriggered() {
    const { data, error } = await supabase
      .from('reminders')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;
    this.lastTriggeredAt = data.last_triggered_at;
    return this;
  }

  /**
   * リマインダー削除
   */
  async delete() {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', this.id);

    if (error) throw error;
    return true;
  }

  /**
   * 次回発火日時を計算
   */
  getNextTrigger() {
    if (!this.enabled || this.days.length === 0) return null;

    const now = new Date();
    const [hours, minutes] = this.time.split(':').map(Number);
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + i);
      checkDate.setHours(hours, minutes, 0, 0);

      const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][checkDate.getDay()];
      
      if (this.days.includes(dayName)) {
        if (i === 0 && checkDate <= now) continue;
        return checkDate;
      }
    }
    return null;
  }

  /**
   * JSON出力用
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      agentId: this.agentId,
      time: this.time,
      days: this.days,
      timezone: this.timezone,
      message: this.message,
      enabled: this.enabled,
      nextTrigger: this.getNextTrigger(),
      lastTriggeredAt: this.lastTriggeredAt,
      createdAt: this.createdAt,
    };
  }
}

export default Reminder;
