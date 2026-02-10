// ========================================
// DoDo App - Supabase Chat History Service
// クラウド同期 + 記憶機能
// ========================================

import { supabase, getCurrentUser } from './supabase';
import { StoredMessage, UserCoachProfile } from './chatHistory';

// ----------------------------------------
// Types
// ----------------------------------------

export interface SupabaseChatMessage {
  id: string;
  user_id: string;
  coach_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_uri?: string;
  created_at: string;
}

export interface SupabaseUserProfile {
  id: string;
  user_id: string;
  coach_id: string;
  display_name?: string;
  goals: string[];
  current_status: Record<string, any>;
  preferences: Record<string, any>;
  important_events: string[];
  memory_summary?: string;
  last_summary_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserInfo {
  name?: string;
  goals?: string[];
  currentStatus?: {
    weight?: string;
    age?: string;
    [key: string]: any;
  };
  preferences?: Record<string, any>;
}

// ----------------------------------------
// 同期状態管理
// ----------------------------------------

const SYNC_STATE_PREFIX = '@dodo_sync_state_';

interface SyncState {
  lastSyncedAt: string;
  lastLocalMessageId?: string;
}

async function getSyncState(coachId: string): Promise<SyncState | null> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const data = await AsyncStorage.getItem(`${SYNC_STATE_PREFIX}${coachId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function setSyncState(coachId: string, state: SyncState): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(`${SYNC_STATE_PREFIX}${coachId}`, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save sync state:', error);
  }
}

// ----------------------------------------
// 会話履歴同期
// ----------------------------------------

/**
 * 最後に同期したタイムスタンプを取得
 */
export async function getLastSyncedTimestamp(coachId: string): Promise<string | null> {
  const state = await getSyncState(coachId);
  return state?.lastSyncedAt || null;
}

/**
 * 会話履歴をSupabaseに同期（差分のみ）
 */
export async function syncChatToSupabase(
  coachId: string,
  messages: StoredMessage[]
): Promise<{ synced: number; errors: number }> {
  const user = await getCurrentUser();
  if (!user) {
    console.log('User not logged in, skipping Supabase sync');
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  try {
    // 最後に同期したタイムスタンプを取得
    const lastSynced = await getLastSyncedTimestamp(coachId);
    
    // 新しいメッセージのみフィルタ
    const newMessages = messages.filter(m => {
      if (!lastSynced) return true;
      return new Date(m.timestamp) > new Date(lastSynced);
    });

    if (newMessages.length === 0) {
      return { synced: 0, errors: 0 };
    }

    // バッチインサート
    const records = newMessages.map(msg => ({
      user_id: user.id,
      coach_id: coachId,
      role: msg.role,
      content: msg.content,
      image_uri: msg.imageUri,
      created_at: msg.timestamp,
    }));

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(records)
      .select();

    if (error) {
      console.error('Supabase sync error:', error);
      errors = newMessages.length;
    } else {
      synced = data?.length || 0;
      
      // 同期状態を更新
      if (newMessages.length > 0) {
        const latestTimestamp = newMessages[newMessages.length - 1].timestamp;
        await setSyncState(coachId, {
          lastSyncedAt: latestTimestamp,
          lastLocalMessageId: newMessages[newMessages.length - 1].id,
        });
      }
    }
  } catch (error) {
    console.error('syncChatToSupabase error:', error);
    errors++;
  }

  return { synced, errors };
}

/**
 * Supabaseから会話履歴を取得
 */
export async function getChatFromSupabase(
  coachId: string,
  limit: number = 100
): Promise<StoredMessage[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('getChatFromSupabase error:', error);
      return [];
    }

    // Supabase形式をStoredMessage形式に変換
    return (data || []).map((msg: SupabaseChatMessage) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at,
      imageUri: msg.image_uri,
    }));
  } catch (error) {
    console.error('getChatFromSupabase error:', error);
    return [];
  }
}

/**
 * 会話履歴をマージ（ローカル + クラウド）
 * 重複を排除し、タイムスタンプでソート
 */
export async function mergeChatHistory(
  coachId: string,
  localMessages: StoredMessage[]
): Promise<StoredMessage[]> {
  const cloudMessages = await getChatFromSupabase(coachId);
  
  // IDで重複を排除
  const messageMap = new Map<string, StoredMessage>();
  
  // クラウドメッセージを先に追加
  for (const msg of cloudMessages) {
    messageMap.set(msg.id, msg);
  }
  
  // ローカルメッセージを追加（上書き）
  for (const msg of localMessages) {
    messageMap.set(msg.id, msg);
  }
  
  // タイムスタンプでソート
  return Array.from(messageMap.values()).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

// ----------------------------------------
// ユーザープロフィール管理
// ----------------------------------------

/**
 * ユーザープロフィールを取得
 */
export async function getSupabaseUserProfile(
  coachId: string
): Promise<SupabaseUserProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from('user_coach_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('coach_id', coachId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('getSupabaseUserProfile error:', error);
    }

    return data || null;
  } catch (error) {
    console.error('getSupabaseUserProfile error:', error);
    return null;
  }
}

/**
 * ユーザープロフィールを保存/更新
 */
export async function saveSupabaseUserProfile(
  coachId: string,
  updates: Partial<Omit<SupabaseUserProfile, 'id' | 'user_id' | 'coach_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  try {
    const { error } = await supabase
      .from('user_coach_profiles')
      .upsert({
        user_id: user.id,
        coach_id: coachId,
        ...updates,
      }, {
        onConflict: 'user_id,coach_id',
      });

    if (error) {
      console.error('saveSupabaseUserProfile error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('saveSupabaseUserProfile error:', error);
    return false;
  }
}

// ----------------------------------------
// 会話からユーザー情報を抽出
// ----------------------------------------

const INFO_PATTERNS: Array<{
  pattern: RegExp;
  field: keyof UserInfo | string;
  isArray?: boolean;
  nested?: string;
}> = [
  // 名前
  { pattern: /私の名前は(.+?)(?:です|だよ|。|$)/i, field: 'name' },
  { pattern: /(.+?)と呼んで/i, field: 'name' },
  { pattern: /名前は(.+?)(?:です|だよ|。|$)/i, field: 'name' },
  
  // 目標
  { pattern: /目標は(.+?)(?:です|だよ|。|$)/i, field: 'goals', isArray: true },
  { pattern: /(.+?)を目指し/i, field: 'goals', isArray: true },
  { pattern: /(.+?)(?:kg|キロ)痩せたい/i, field: 'goals', isArray: true },
  
  // 体重
  { pattern: /体重は(.+?)(?:kg|キロ)/i, field: 'currentStatus', nested: 'weight' },
  { pattern: /(\d+(?:\.\d+)?)(?:kg|キロ)(?:です|だよ|ある)/i, field: 'currentStatus', nested: 'weight' },
  
  // 年齢
  { pattern: /(\d+)歳(?:です|だよ|$)/i, field: 'currentStatus', nested: 'age' },
  
  // 身長
  { pattern: /身長は?(\d+(?:\.\d+)?)(?:cm|センチ)/i, field: 'currentStatus', nested: 'height' },
  
  // 運動習慣
  { pattern: /週(\d+)(?:回|日)(?:運動|トレーニング|ジム)/i, field: 'currentStatus', nested: 'exerciseFrequency' },
  
  // 好み
  { pattern: /(.+?)が(?:好き|すき)/i, field: 'preferences', nested: 'likes', isArray: true },
  { pattern: /(.+?)が(?:嫌い|きらい|苦手)/i, field: 'preferences', nested: 'dislikes', isArray: true },
];

/**
 * メッセージからユーザー情報を抽出
 */
export function extractUserInfo(message: string): Partial<UserInfo> {
  const info: any = {};

  for (const { pattern, field, isArray, nested } of INFO_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      
      if (nested) {
        // ネストされたフィールド (e.g., currentStatus.weight)
        if (!info[field]) info[field] = {};
        if (isArray) {
          if (!info[field][nested]) info[field][nested] = [];
          info[field][nested].push(value);
        } else {
          info[field][nested] = value;
        }
      } else if (isArray) {
        // 配列フィールド
        if (!info[field]) info[field] = [];
        info[field].push(value);
      } else {
        // 単純フィールド
        info[field] = value;
      }
    }
  }

  return info;
}

/**
 * 抽出した情報をプロフィールに保存
 */
export async function saveExtractedUserInfo(
  coachId: string,
  message: string
): Promise<void> {
  const extractedInfo = extractUserInfo(message);
  
  if (Object.keys(extractedInfo).length === 0) return;

  const user = await getCurrentUser();
  if (!user) return;

  // 既存プロフィールを取得
  const existing = await getSupabaseUserProfile(coachId);
  
  // マージして保存
  const updates: any = {};
  
  if (extractedInfo.name) {
    updates.display_name = extractedInfo.name;
  }
  
  if (extractedInfo.goals) {
    const existingGoals = existing?.goals || [];
    updates.goals = [...new Set([...existingGoals, ...extractedInfo.goals])];
  }
  
  if (extractedInfo.currentStatus) {
    updates.current_status = {
      ...(existing?.current_status || {}),
      ...extractedInfo.currentStatus,
    };
  }
  
  if (extractedInfo.preferences) {
    updates.preferences = {
      ...(existing?.preferences || {}),
      ...extractedInfo.preferences,
    };
  }

  if (Object.keys(updates).length > 0) {
    await saveSupabaseUserProfile(coachId, updates);
  }
}

// ----------------------------------------
// 記憶要約機能
// ----------------------------------------

/**
 * AIに会話要約を依頼
 */
export async function generateMemorySummary(
  coachId: string,
  messages: StoredMessage[]
): Promise<string> {
  // AIサービスを動的インポート
  const { sendChatMessage } = await import('./ai');

  const conversationText = messages
    .slice(-50) // 最新50件
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'コーチ'}: ${m.content}`)
    .join('\n');

  const summaryPrompt = `以下の会話履歴を簡潔に要約してください。
ユーザーの目標、進捗、好み、重要な情報を箇条書きで抽出してください。

会話履歴:
${conversationText}

要約（箇条書き、最大10項目）:`;

  try {
    const response = await sendChatMessage(
      'system', // システム用のcoachId
      summaryPrompt,
      [],
      { stream: false }
    );
    return response.content;
  } catch (error) {
    console.error('generateMemorySummary error:', error);
    return '';
  }
}

/**
 * 定期的に要約を更新（50メッセージごと）
 */
export async function updateMemorySummaryIfNeeded(
  coachId: string,
  messages: StoredMessage[]
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  // 50メッセージごとに更新
  if (messages.length % 50 !== 0 || messages.length === 0) return;

  const profile = await getSupabaseUserProfile(coachId);
  const lastSummaryAt = profile?.last_summary_at;
  
  // 最後の要約から24時間以上経過している場合のみ更新
  if (lastSummaryAt) {
    const hoursSinceLastSummary = 
      (Date.now() - new Date(lastSummaryAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastSummary < 24) return;
  }

  const summary = await generateMemorySummary(coachId, messages);
  
  if (summary) {
    await saveSupabaseUserProfile(coachId, {
      memory_summary: summary,
      last_summary_at: new Date().toISOString(),
    });
  }
}

/**
 * コーチのプロンプトに追加するコンテキストを生成
 */
export async function getContextForPrompt(coachId: string): Promise<string> {
  const profile = await getSupabaseUserProfile(coachId);
  if (!profile) return '';

  let context = '\n\n【このユーザーについて覚えていること】\n';

  if (profile.display_name) {
    context += `- 名前: ${profile.display_name}\n`;
  }

  if (profile.goals && profile.goals.length > 0) {
    context += `- 目標: ${profile.goals.join(', ')}\n`;
  }

  if (profile.current_status && Object.keys(profile.current_status).length > 0) {
    const statusParts = [];
    if (profile.current_status.weight) statusParts.push(`体重${profile.current_status.weight}kg`);
    if (profile.current_status.age) statusParts.push(`${profile.current_status.age}歳`);
    if (profile.current_status.height) statusParts.push(`身長${profile.current_status.height}cm`);
    if (statusParts.length > 0) {
      context += `- 現状: ${statusParts.join(', ')}\n`;
    }
  }

  if (profile.memory_summary) {
    context += `\n【これまでの会話の要約】\n${profile.memory_summary}\n`;
  }

  return context;
}

// ----------------------------------------
// ユーティリティ
// ----------------------------------------

/**
 * 会話履歴を削除（Supabase）
 */
export async function clearSupabaseChatHistory(coachId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id)
      .eq('coach_id', coachId);

    if (error) {
      console.error('clearSupabaseChatHistory error:', error);
      return false;
    }

    // 同期状態もクリア
    await setSyncState(coachId, { lastSyncedAt: '' });

    return true;
  } catch (error) {
    console.error('clearSupabaseChatHistory error:', error);
    return false;
  }
}

/**
 * ユーザーの全データを削除
 */
export async function deleteAllUserData(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  try {
    // 会話履歴削除
    await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id);

    // プロフィール削除
    await supabase
      .from('user_coach_profiles')
      .delete()
      .eq('user_id', user.id);

    return true;
  } catch (error) {
    console.error('deleteAllUserData error:', error);
    return false;
  }
}
