// ========================================
// DoDo App - Chat Sync Service
// Supabase同期 + 記憶要約 + プロフィール抽出
// ========================================

import { supabase } from './supabase';
import { 
  StoredMessage, 
  saveChatHistory, 
  getChatHistory,
  generateMessageId 
} from './chatHistory';

// ----------------------------------------
// Types
// ----------------------------------------

export interface UserCoachProfile {
  id?: string;
  userId: string;
  coachId: string;
  displayName?: string;
  goals: string[];
  currentStatus: Record<string, any>;
  preferences: Record<string, any>;
  importantEvents: string[];
  memorySummary?: string;
  lastSummaryAt?: string;
}

// ----------------------------------------
// Supabase同期
// ----------------------------------------

/**
 * ログイン中のユーザーIDを取得
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
};

/**
 * 会話履歴をSupabaseに同期
 */
export const syncChatToSupabase = async (
  coachId: string,
  messages: StoredMessage[]
): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) return; // 未ログインは同期しない

  try {
    // 既存のメッセージを取得
    const { data: existing } = await supabase
      .from('chat_messages')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastSyncedAt = existing?.[0]?.created_at || '1970-01-01';

    // 新しいメッセージのみ追加
    const newMessages = messages.filter(m => 
      new Date(m.timestamp) > new Date(lastSyncedAt)
    );

    if (newMessages.length === 0) return;

    const inserts = newMessages.map(msg => ({
      user_id: userId,
      coach_id: coachId,
      role: msg.role,
      content: msg.content,
      image_uri: msg.imageUri,
      created_at: msg.timestamp,
    }));

    await supabase.from('chat_messages').insert(inserts);
  } catch (error) {
    console.warn('Failed to sync to Supabase:', error);
  }
};

/**
 * Supabaseから会話履歴を取得
 */
export const getChatFromSupabase = async (
  coachId: string
): Promise<StoredMessage[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      timestamp: row.created_at,
      imageUri: row.image_uri,
    }));
  } catch (error) {
    console.warn('Failed to get from Supabase:', error);
    return [];
  }
};

/**
 * ローカルとSupabaseを同期（マージ）
 */
export const syncChatHistory = async (coachId: string): Promise<StoredMessage[]> => {
  const userId = await getCurrentUserId();
  
  // ローカルの履歴を取得
  const localHistory = await getChatHistory(coachId);
  
  if (!userId) {
    // 未ログインはローカルのみ
    return localHistory;
  }

  // Supabaseの履歴を取得
  const cloudHistory = await getChatFromSupabase(coachId);

  // マージ（重複排除）
  const merged = mergeHistories(localHistory, cloudHistory);
  
  // ローカルを更新
  await saveChatHistory(coachId, merged);
  
  // Supabaseに未同期分を追加
  await syncChatToSupabase(coachId, merged);
  
  return merged;
};

/**
 * 履歴をマージ（タイムスタンプでソート、重複排除）
 */
const mergeHistories = (
  local: StoredMessage[],
  cloud: StoredMessage[]
): StoredMessage[] => {
  const map = new Map<string, StoredMessage>();
  
  // ローカルを先に追加
  for (const msg of local) {
    map.set(msg.id, msg);
  }
  
  // クラウドを追加（IDが同じなら上書きしない）
  for (const msg of cloud) {
    if (!map.has(msg.id)) {
      map.set(msg.id, msg);
    }
  }
  
  // タイムスタンプでソート
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

// ----------------------------------------
// 記憶要約（Memory Summary）
// ----------------------------------------

/**
 * 会話履歴を要約（AIに依頼）
 */
export const generateMemorySummary = async (
  coachId: string,
  messages: StoredMessage[]
): Promise<string> => {
  // 最新50件を要約対象に
  const recentMessages = messages.slice(-50);
  
  const summaryContent = recentMessages
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'コーチ'}: ${m.content}`)
    .join('\n');

  // 要約プロンプト（AIには送信せず、ローカルで簡易要約）
  // 本番ではAIに要約させることも可能
  const userMessages = recentMessages.filter(m => m.role === 'user');
  
  const summary = extractKeyInfo(userMessages.map(m => m.content));
  return summary;
};

/**
 * キー情報を抽出（簡易版）
 */
const extractKeyInfo = (userMessages: string[]): string => {
  const allText = userMessages.join(' ');
  const info: string[] = [];
  
  // 目標の抽出
  const goalPatterns = [
    /目標は(.+?)(?:です|。|$)/g,
    /(.+?)を目指し/g,
    /(.+?)したい/g,
  ];
  
  for (const pattern of goalPatterns) {
    const matches = allText.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length < 50) {
        info.push(`目標: ${match[1]}`);
      }
    }
  }
  
  // 数値情報の抽出
  const numberPatterns = [
    { pattern: /体重[はが]?(\d+(?:\.\d+)?)\s*kg/gi, label: '体重' },
    { pattern: /(\d+)\s*歳/gi, label: '年齢' },
    { pattern: /身長[はが]?(\d+(?:\.\d+)?)\s*cm/gi, label: '身長' },
    { pattern: /(\d+)\s*時間?睡眠/gi, label: '睡眠時間' },
  ];
  
  for (const { pattern, label } of numberPatterns) {
    const matches = allText.matchAll(pattern);
    for (const match of matches) {
      info.push(`${label}: ${match[1]}`);
    }
  }
  
  return info.length > 0 ? info.join('\n') : '特記事項なし';
};

/**
 * 記憶要約を保存
 */
export const saveMemorySummary = async (
  coachId: string,
  summary: string
): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    await supabase
      .from('user_coach_profiles')
      .upsert({
        user_id: userId,
        coach_id: coachId,
        memory_summary: summary,
        last_summary_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,coach_id',
      });
  } catch (error) {
    console.warn('Failed to save memory summary:', error);
  }
};

/**
 * 記憶要約を取得
 */
export const getMemorySummary = async (coachId: string): Promise<string | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const { data } = await supabase
      .from('user_coach_profiles')
      .select('memory_summary')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .single();

    return data?.memory_summary || null;
  } catch {
    return null;
  }
};

// ----------------------------------------
// ユーザープロフィール抽出
// ----------------------------------------

/**
 * メッセージからユーザー情報を自動抽出
 */
export const extractUserInfoFromMessage = (
  message: string
): Partial<UserCoachProfile> => {
  const info: Partial<UserCoachProfile> = {
    goals: [],
    currentStatus: {},
  };
  
  // 名前の抽出
  const namePatterns = [
    /私の名前は(.+?)(?:です|。|$)/i,
    /(.+?)と呼んで/i,
    /(.+?)って言います/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length < 20) {
      info.displayName = match[1].trim();
      break;
    }
  }
  
  // 目標の抽出
  const goalPatterns = [
    /目標は(.+?)(?:です|。|$)/gi,
    /(.+?)を達成したい/gi,
    /(.+?)になりたい/gi,
  ];
  
  for (const pattern of goalPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length < 100) {
        info.goals!.push(match[1].trim());
      }
    }
  }
  
  // 数値ステータスの抽出
  const statusPatterns = [
    { pattern: /体重[はが]?(\d+(?:\.\d+)?)\s*kg/i, key: 'weight', unit: 'kg' },
    { pattern: /身長[はが]?(\d+(?:\.\d+)?)\s*cm/i, key: 'height', unit: 'cm' },
    { pattern: /(\d+)\s*歳/i, key: 'age', unit: '歳' },
    { pattern: /年収[はが]?(\d+)万/i, key: 'income', unit: '万円' },
    { pattern: /貯金[はが]?(\d+)万/i, key: 'savings', unit: '万円' },
  ];
  
  for (const { pattern, key, unit } of statusPatterns) {
    const match = message.match(pattern);
    if (match) {
      info.currentStatus![key] = {
        value: parseFloat(match[1]),
        unit,
        updatedAt: new Date().toISOString(),
      };
    }
  }
  
  return info;
};

/**
 * ユーザープロフィールを更新
 */
export const updateUserProfile = async (
  coachId: string,
  updates: Partial<UserCoachProfile>
): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    // 既存のプロフィールを取得
    const { data: existing } = await supabase
      .from('user_coach_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .single();

    // マージ
    const merged = {
      user_id: userId,
      coach_id: coachId,
      display_name: updates.displayName || existing?.display_name,
      goals: [...(existing?.goals || []), ...(updates.goals || [])].slice(-10), // 最新10件
      current_status: { ...(existing?.current_status || {}), ...(updates.currentStatus || {}) },
      preferences: { ...(existing?.preferences || {}), ...(updates.preferences || {}) },
      important_events: [...(existing?.important_events || []), ...(updates.importantEvents || [])].slice(-20),
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('user_coach_profiles')
      .upsert(merged, { onConflict: 'user_id,coach_id' });
  } catch (error) {
    console.warn('Failed to update user profile:', error);
  }
};

/**
 * ユーザープロフィールを取得
 */
export const getUserProfile = async (coachId: string): Promise<UserCoachProfile | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const { data } = await supabase
      .from('user_coach_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      coachId: data.coach_id,
      displayName: data.display_name,
      goals: data.goals || [],
      currentStatus: data.current_status || {},
      preferences: data.preferences || {},
      importantEvents: data.important_events || [],
      memorySummary: data.memory_summary,
      lastSummaryAt: data.last_summary_at,
    };
  } catch {
    return null;
  }
};

/**
 * システムプロンプトに追加するコンテキストを生成
 */
export const generateUserContext = async (coachId: string): Promise<string> => {
  const profile = await getUserProfile(coachId);
  if (!profile) return '';

  let context = '\n\n【このユーザーについて覚えていること】\n';

  if (profile.displayName) {
    context += `- 名前: ${profile.displayName}\n`;
  }

  if (profile.goals.length > 0) {
    context += `- 目標: ${profile.goals.join(', ')}\n`;
  }

  if (Object.keys(profile.currentStatus).length > 0) {
    for (const [key, value] of Object.entries(profile.currentStatus)) {
      if (typeof value === 'object' && value.value !== undefined) {
        context += `- ${key}: ${value.value}${value.unit || ''}\n`;
      }
    }
  }

  if (profile.memorySummary) {
    context += `\n【これまでの会話の要約】\n${profile.memorySummary}\n`;
  }

  return context;
};
