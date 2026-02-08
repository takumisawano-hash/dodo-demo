/**
 * Message Model
 * メッセージ管理
 */

import { supabase } from '../config/supabase.js';

export const ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
};

export const MODELS = {
  HAIKU: 'haiku',
  SONNET: 'sonnet',
};

export class Message {
  constructor(data) {
    this.id = data.id;
    this.conversationId = data.conversation_id;
    this.role = data.role;
    this.content = data.content;
    this.modelUsed = data.model_used;
    this.tokensUsed = data.tokens_used;
    this.createdAt = data.created_at;
  }

  /**
   * IDで取得
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? new Message(data) : null;
  }

  /**
   * 会話IDでメッセージ一覧取得
   */
  static async findByConversationId(conversationId, { limit = 100, before } = {}) {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(d => new Message(d));
  }

  /**
   * 最新N件のメッセージ取得（コンテキスト用）
   */
  static async getRecentContext(conversationId, limit = 20) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    // 時系列順に並び替え
    return (data || []).reverse().map(d => new Message(d));
  }

  /**
   * メッセージ作成
   */
  static async create({ conversationId, role, content, modelUsed, tokensUsed }) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        model_used: modelUsed,
        tokens_used: tokensUsed || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return new Message(data);
  }

  /**
   * ユーザーメッセージ作成
   */
  static async createUserMessage(conversationId, content) {
    return Message.create({
      conversationId,
      role: ROLES.USER,
      content,
    });
  }

  /**
   * アシスタントメッセージ作成
   */
  static async createAssistantMessage(conversationId, content, { modelUsed, tokensUsed } = {}) {
    return Message.create({
      conversationId,
      role: ROLES.ASSISTANT,
      content,
      modelUsed,
      tokensUsed,
    });
  }

  /**
   * メッセージ削除
   */
  async delete() {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', this.id);

    if (error) throw error;
    return true;
  }

  /**
   * 会話の全メッセージ削除
   */
  static async deleteByConversationId(conversationId) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (error) throw error;
    return true;
  }

  /**
   * Claude APIフォーマットに変換
   */
  toClaudeFormat() {
    return {
      role: this.role === ROLES.ASSISTANT ? 'assistant' : 'user',
      content: this.content,
    };
  }

  /**
   * JSON出力用
   */
  toJSON() {
    return {
      id: this.id,
      conversationId: this.conversationId,
      role: this.role,
      content: this.content,
      modelUsed: this.modelUsed,
      tokensUsed: this.tokensUsed,
      createdAt: this.createdAt,
    };
  }
}

export default Message;
