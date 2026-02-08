/**
 * User Model
 * ユーザー管理
 */

import { supabase } from '../config/supabase.js';

export class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.avatarUrl = data.avatar_url;
    this.locale = data.locale || 'ja';
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * IDでユーザー取得
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? new User(data) : null;
  }

  /**
   * Emailでユーザー取得
   */
  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? new User(data) : null;
  }

  /**
   * ユーザー作成
   */
  static async create({ email, name, avatarUrl, locale = 'ja' }) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        name,
        avatar_url: avatarUrl,
        locale,
      })
      .select()
      .single();

    if (error) throw error;
    return new User(data);
  }

  /**
   * ユーザー更新
   */
  async update(updates) {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: updates.name ?? this.name,
        avatar_url: updates.avatarUrl ?? this.avatarUrl,
        locale: updates.locale ?? this.locale,
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;
    Object.assign(this, new User(data));
    return this;
  }

  /**
   * ユーザー削除
   */
  async delete() {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', this.id);

    if (error) throw error;
    return true;
  }

  /**
   * サブスクリプション取得
   */
  async getSubscription() {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', this.id)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * 登録スロット取得
   */
  async getSlots() {
    const { data, error } = await supabase
      .from('user_slots')
      .select('*')
      .eq('user_id', this.id)
      .order('slot_number');

    if (error) throw error;
    return data || [];
  }

  /**
   * ストリーク取得
   */
  async getStreak(agentId = null) {
    let query = supabase
      .from('streaks')
      .select('*')
      .eq('user_id', this.id);

    if (agentId) {
      query = query.eq('agent_id', agentId);
    } else {
      query = query.is('agent_id', null);
    }

    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * JSON出力用
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatarUrl: this.avatarUrl,
      locale: this.locale,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default User;
