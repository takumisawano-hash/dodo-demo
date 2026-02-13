// ========================================
// DoDo App - Chat History Service
// 会話履歴の永続化
// ========================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_HISTORY_PREFIX = '@dodo_chat_history_';
const USER_PROFILE_PREFIX = '@dodo_user_profile_';

// ----------------------------------------
// Types
// ----------------------------------------

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageUri?: string;
}

export interface ChatSession {
  coachId: string;
  messages: StoredMessage[];
  lastUpdated: string;
  createdAt: string;
}

export interface UserCoachProfile {
  coachId: string;
  // ユーザーがコーチに共有した情報
  sharedInfo: {
    name?: string;
    goals?: string[];
    currentStatus?: Record<string, any>;
    preferences?: Record<string, any>;
    history?: string[]; // 重要な出来事
  };
  // コーチが記憶すべき要約
  memorySummary: string;
  lastUpdated: string;
}

// ----------------------------------------
// Chat History Functions
// ----------------------------------------

/**
 * 会話履歴を保存
 */
export const saveChatHistory = async (
  coachId: string,
  messages: StoredMessage[]
): Promise<void> => {
  try {
    const key = `${CHAT_HISTORY_PREFIX}${coachId}`;
    const session: ChatSession = {
      coachId,
      messages,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(session));
  } catch (error) {
    console.warn('Failed to save chat history:', error);
  }
};

/**
 * 会話履歴を取得
 */
export const getChatHistory = async (coachId: string): Promise<StoredMessage[]> => {
  try {
    const key = `${CHAT_HISTORY_PREFIX}${coachId}`;
    const data = await AsyncStorage.getItem(key);
    if (data) {
      const session: ChatSession = JSON.parse(data);
      return session.messages;
    }
    return [];
  } catch (error) {
    console.warn('Failed to get chat history:', error);
    return [];
  }
};

/**
 * 会話履歴をクリア
 */
export const clearChatHistory = async (coachId: string): Promise<void> => {
  try {
    const key = `${CHAT_HISTORY_PREFIX}${coachId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear chat history:', error);
  }
};

/**
 * 全コーチの会話履歴を取得
 */
export const getAllChatHistories = async (): Promise<Record<string, ChatSession>> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const chatKeys = keys.filter(k => k.startsWith(CHAT_HISTORY_PREFIX));
    const results: Record<string, ChatSession> = {};

    for (const key of chatKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const session: ChatSession = JSON.parse(data);
        results[session.coachId] = session;
      }
    }
    return results;
  } catch (error) {
    console.warn('Failed to get all chat histories:', error);
    return {};
  }
};

/**
 * 全コーチの会話履歴を削除
 */
export const clearAllChatHistories = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const chatKeys = keys.filter(k => k.startsWith(CHAT_HISTORY_PREFIX));
    const profileKeys = keys.filter(k => k.startsWith(USER_PROFILE_PREFIX));

    // 会話履歴とユーザープロフィールを全て削除
    await AsyncStorage.multiRemove([...chatKeys, ...profileKeys]);
  } catch (error) {
    console.warn('Failed to clear all chat histories:', error);
    throw error;
  }
};

// ----------------------------------------
// User Profile Functions (コーチごとのユーザー情報)
// ----------------------------------------

/**
 * ユーザープロフィールを保存（コーチごと）
 */
export const saveUserCoachProfile = async (profile: UserCoachProfile): Promise<void> => {
  try {
    const key = `${USER_PROFILE_PREFIX}${profile.coachId}`;
    await AsyncStorage.setItem(key, JSON.stringify(profile));
  } catch (error) {
    console.warn('Failed to save user coach profile:', error);
  }
};

/**
 * ユーザープロフィールを取得（コーチごと）
 */
export const getUserCoachProfile = async (coachId: string): Promise<UserCoachProfile | null> => {
  try {
    const key = `${USER_PROFILE_PREFIX}${coachId}`;
    const data = await AsyncStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.warn('Failed to get user coach profile:', error);
    return null;
  }
};

/**
 * ユーザープロフィールを更新
 */
export const updateUserCoachProfile = async (
  coachId: string,
  updates: Partial<UserCoachProfile['sharedInfo']>
): Promise<void> => {
  try {
    const existing = await getUserCoachProfile(coachId);
    const profile: UserCoachProfile = existing || {
      coachId,
      sharedInfo: {},
      memorySummary: '',
      lastUpdated: new Date().toISOString(),
    };
    
    profile.sharedInfo = { ...profile.sharedInfo, ...updates };
    profile.lastUpdated = new Date().toISOString();
    
    await saveUserCoachProfile(profile);
  } catch (error) {
    console.warn('Failed to update user coach profile:', error);
  }
};

// ----------------------------------------
// Memory Summary (コーチの記憶要約)
// ----------------------------------------

/**
 * コーチの記憶要約を更新
 * 長い会話履歴を要約して保存（コンテキストウィンドウ対策）
 */
export const updateMemorySummary = async (
  coachId: string,
  summary: string
): Promise<void> => {
  try {
    const profile = await getUserCoachProfile(coachId) || {
      coachId,
      sharedInfo: {},
      memorySummary: '',
      lastUpdated: new Date().toISOString(),
    };
    
    profile.memorySummary = summary;
    profile.lastUpdated = new Date().toISOString();
    
    await saveUserCoachProfile(profile);
  } catch (error) {
    console.warn('Failed to update memory summary:', error);
  }
};

/**
 * システムプロンプトに追加するコンテキストを生成
 */
export const generateContextForPrompt = async (coachId: string): Promise<string> => {
  const profile = await getUserCoachProfile(coachId);
  if (!profile) {
    return '';
  }
  
  let context = '\n\n【このユーザーについて覚えていること】\n';
  
  if (profile.sharedInfo.name) {
    context += `- 名前: ${profile.sharedInfo.name}\n`;
  }
  
  if (profile.sharedInfo.goals && profile.sharedInfo.goals.length > 0) {
    context += `- 目標: ${profile.sharedInfo.goals.join(', ')}\n`;
  }
  
  if (profile.sharedInfo.currentStatus) {
    context += `- 現状: ${JSON.stringify(profile.sharedInfo.currentStatus)}\n`;
  }
  
  if (profile.memorySummary) {
    context += `\n【これまでの会話の要約】\n${profile.memorySummary}\n`;
  }
  
  return context;
};

// ----------------------------------------
// Utility Functions
// ----------------------------------------

/**
 * メッセージIDを生成
 */
export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 古いメッセージを削除（容量管理）
 * 最新N件のみ保持
 */
export const trimChatHistory = async (
  coachId: string,
  maxMessages: number = 100
): Promise<void> => {
  try {
    const messages = await getChatHistory(coachId);
    if (messages.length > maxMessages) {
      const trimmed = messages.slice(-maxMessages);
      await saveChatHistory(coachId, trimmed);
    }
  } catch (error) {
    console.warn('Failed to trim chat history:', error);
  }
};
