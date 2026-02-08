/**
 * Conversation Model
 * 会話管理
 */

import { supabase } from '../config/supabase.js';

export class Conversation {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.agentId = data.agent_id;
    this.title = data.title;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * IDで取得
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? new Conversation(data) : null;
  }

  /**
   * ユーザーの会話一覧取得
   */
  static async findByUserId(userId, { agentId, limit = 50, offset = 0 } = {}) {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(d => new Conversation(d));
  }

  /**
   * ユーザーとエージェントの最新会話取得
   */
  static async findLatest(userId, agentId) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? new Conversation(data) : null;
  }

  /**
   * 会話作成
   */
  static async create({ userId, agentId, title }) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        agent_id: agentId,
        title,
      })
      .select()
      .single();

    if (error) throw error;
    return new Conversation(data);
  }

  /**
   * または既存取得
   */
  static async findOrCreate(userId, agentId) {
    let conversation = await Conversation.findLatest(userId, agentId);
    if (!conversation) {
      conversation = await Conversation.create({ userId, agentId });
    }
    return conversation;
  }

  /**
   * タイトル更新
   */
  async updateTitle(title) {
    const { data, error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;
    this.title = title;
    this.updatedAt = data.updated_at;
    return this;
  }

  /**
   * updated_at を更新
   */
  async touch() {
    const { data, error } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;
    this.updatedAt = data.updated_at;
    return this;
  }

  /**
   * 会話削除
   */
  async delete() {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', this.id);

    if (error) throw error;
    return true;
  }

  /**
   * メッセージ取得
   */
  async getMessages({ limit = 100, offset = 0 } = {}) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', this.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  /**
   * メッセージ数取得
   */
  async getMessageCount() {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', this.id);

    if (error) throw error;
    return count || 0;
  }

  /**
   * JSON出力用
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      agentId: this.agentId,
      title: this.title,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Conversation;
