/**
 * DoDo Life - Supabase Client
 * Supabaseクライアント設定とユーティリティ関数
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

import type { Database } from '../types/database';

// 環境変数から取得
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Supabaseクライアント作成
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // React Nativeでは不要
  },
});

// ============================
// Auth ヘルパー関数
// ============================

/**
 * 現在のユーザーを取得
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * 現在のセッションを取得
 */
export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

/**
 * メールでサインアップ
 */
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * メールでサインイン
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * サインアウト
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ============================
// Database ヘルパー関数
// ============================

type TableName = keyof Database['public']['Tables'];

/**
 * 汎用のデータ取得関数
 */
export async function fetchData<T extends TableName>(
  table: T,
  options?: {
    userId?: string;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    filters?: Record<string, unknown>;
  }
) {
  let query = supabase.from(table).select('*');

  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }

  if (options?.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy, {
      ascending: options.ascending ?? false,
    });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * 汎用のデータ挿入関数
 */
export async function insertData<T extends TableName>(
  table: T,
  data: Database['public']['Tables'][T]['Insert']
) {
  const { data: result, error } = await supabase.from(table).insert(data).select().single();

  if (error) throw error;
  return result;
}

/**
 * 汎用のデータ更新関数
 */
export async function updateData<T extends TableName>(
  table: T,
  id: string,
  data: Database['public']['Tables'][T]['Update']
) {
  const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select().single();

  if (error) throw error;
  return result;
}

/**
 * 汎用のデータ削除関数
 */
export async function deleteData<T extends TableName>(table: T, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id);

  if (error) throw error;
}

// ============================
// 特定テーブル用ヘルパー
// ============================

/**
 * 今月の取引を取得
 */
export async function getMonthlyTransactions(userId: string, yearMonth: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', `${yearMonth}-01`)
    .lt('date', getNextMonth(yearMonth))
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * 今日のイベントを取得
 */
export async function getTodayEvents(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .or(`and(start_at.gte.${today},start_at.lt.${tomorrow}),all_day.eq.true`)
    .order('start_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * 今日の健康データを取得
 */
export async function getTodayHealth(userId: string) {
  const today = new Date().toISOString().split('T')[0];

  const [weight, meals, exercise, water] = await Promise.all([
    supabase
      .from('health_weight')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase.from('health_meals').select('*').eq('user_id', userId).eq('date', today),
    supabase.from('health_exercise').select('*').eq('user_id', userId).eq('date', today),
    supabase.from('health_water').select('*').eq('user_id', userId).eq('date', today),
  ]);

  return {
    weight: weight.data?.[0] ?? null,
    meals: meals.data ?? [],
    exercise: exercise.data ?? [],
    water: water.data ?? [],
    totalCalories: (meals.data ?? []).reduce((sum, m) => sum + (m.calories ?? 0), 0),
    totalWaterMl: (water.data ?? []).reduce((sum, w) => sum + w.amount_ml, 0),
  };
}

/**
 * 未完了タスクを取得
 */
export async function getPendingTasks(userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * チャット履歴を取得
 */
export async function getChatHistory(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).reverse();
}

// ============================
// ユーティリティ
// ============================

function getNextMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
}

/**
 * リアルタイムサブスクリプション用ヘルパー
 */
export function subscribeToTable<T extends TableName>(
  table: T,
  userId: string,
  callback: (payload: unknown) => void
) {
  return supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}

export default supabase;
