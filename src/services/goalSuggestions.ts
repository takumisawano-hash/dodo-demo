/**
 * DoDo Life - 目標自動提案サービス
 * 過去データを分析して達成可能な目標を自動提案する
 */

import { supabase } from './supabase';
import type { Database } from '../types/database';

// ============================
// 型定義
// ============================

/** 目標カテゴリ */
export type GoalCategory = 'spending' | 'sleep' | 'exercise' | 'reading' | 'water';

/** 目標タイプ (増やすか減らすか) */
export type GoalDirection = 'increase' | 'decrease';

/** 目標の期間 */
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';

/** 目標提案 */
export interface GoalSuggestion {
  id: string;
  category: GoalCategory;
  direction: GoalDirection;
  period: GoalPeriod;
  currentValue: number;
  suggestedValue: number;
  improvementPercent: number;
  unit: string;
  emoji: string;
  title: string;
  message: string;
  motivationalMessage: string;
}

/** 設定された目標 */
export interface Goal {
  id: string;
  userId: string;
  category: GoalCategory;
  targetValue: number;
  currentValue: number;
  period: GoalPeriod;
  unit: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'achieved' | 'failed' | 'cancelled';
  createdAt: string;
}

/** 目標進捗 */
export interface GoalProgress {
  goal: Goal;
  currentProgress: number;
  progressPercent: number;
  daysRemaining: number;
  isOnTrack: boolean;
  projectedValue: number;
}

// ============================
// カテゴリ設定
// ============================

const CATEGORY_CONFIG: Record<GoalCategory, {
  emoji: string;
  title: string;
  direction: GoalDirection;
  period: GoalPeriod;
  unit: string;
  improvementRange: { min: number; max: number };
}> = {
  spending: {
    emoji: '💰',
    title: '支出',
    direction: 'decrease',
    period: 'monthly',
    unit: '円',
    improvementRange: { min: 0.05, max: 0.10 }, // 5-10%削減
  },
  sleep: {
    emoji: '😴',
    title: '睡眠時間',
    direction: 'increase',
    period: 'daily',
    unit: '時間',
    improvementRange: { min: 0.05, max: 0.15 }, // 5-15%増加
  },
  exercise: {
    emoji: '🏃',
    title: '運動',
    direction: 'increase',
    period: 'weekly',
    unit: '回',
    improvementRange: { min: 0.15, max: 0.30 }, // 15-30%増加 (週1回→2回などを想定)
  },
  reading: {
    emoji: '📚',
    title: '読書',
    direction: 'increase',
    period: 'monthly',
    unit: '冊',
    improvementRange: { min: 0.30, max: 0.50 }, // 30-50%増加 (2冊→3冊など)
  },
  water: {
    emoji: '💧',
    title: '水分摂取',
    direction: 'increase',
    period: 'daily',
    unit: 'ml',
    improvementRange: { min: 0.10, max: 0.20 }, // 10-20%増加
  },
};

// ============================
// データ取得関数
// ============================

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type SleepRow = Database['public']['Tables']['health_sleep']['Row'];
type ExerciseRow = Database['public']['Tables']['health_exercise']['Row'];
type WaterRow = Database['public']['Tables']['health_water']['Row'];
type BookRow = Database['public']['Tables']['books']['Row'];
type GoalRow = Database['public']['Tables']['goals']['Row'];
type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type GoalUpdate = Database['public']['Tables']['goals']['Update'];

/**
 * 先月の支出合計を取得
 */
async function getLastMonthSpending(userId: string): Promise<number | null> {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const { data, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', lastMonth.toISOString().split('T')[0])
    .lte('date', lastMonthEnd.toISOString().split('T')[0]);

  if (error || !data || data.length === 0) return null;

  const transactions = data as Pick<TransactionRow, 'amount'>[];
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * 過去30日の平均睡眠時間を取得 (時間単位)
 */
async function getAverageSleepHours(userId: string): Promise<number | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('health_sleep')
    .select('sleep_at, wake_at')
    .eq('user_id', userId)
    .gte('date', thirtyDaysAgo);

  if (error || !data || data.length === 0) return null;

  const sleepRecords = data as Pick<SleepRow, 'sleep_at' | 'wake_at'>[];
  const totalHours = sleepRecords.reduce((sum, record) => {
    const sleepTime = new Date(record.sleep_at).getTime();
    const wakeTime = new Date(record.wake_at).getTime();
    const hours = (wakeTime - sleepTime) / (1000 * 60 * 60);
    return sum + (hours > 0 ? hours : hours + 24); // 日付をまたぐ場合の補正
  }, 0);

  return Math.round((totalHours / sleepRecords.length) * 10) / 10; // 小数点1位まで
}

/**
 * 過去4週間の週平均運動回数を取得
 */
async function getWeeklyExerciseCount(userId: string): Promise<number | null> {
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('health_exercise')
    .select('id, date')
    .eq('user_id', userId)
    .gte('date', fourWeeksAgo);

  if (error || !data || data.length === 0) return null;

  const exerciseRecords = data as Pick<ExerciseRow, 'id' | 'date'>[];
  // ユニークな日数をカウント（1日複数運動しても1回とカウント）
  const uniqueDays = new Set(exerciseRecords.map((r) => r.date)).size;

  return Math.round((uniqueDays / 4) * 10) / 10; // 週平均
}

/**
 * 過去3ヶ月の月平均読了冊数を取得
 */
async function getMonthlyReadingCount(userId: string): Promise<number | null> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data, error } = await supabase
    .from('books')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('updated_at', threeMonthsAgo.toISOString());

  if (error || !data || data.length === 0) return null;

  return Math.round((data.length / 3) * 10) / 10; // 月平均
}

/**
 * 過去30日の1日平均水分摂取量を取得 (ml)
 */
async function getAverageWaterIntake(userId: string): Promise<number | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('health_water')
    .select('amount_ml, date')
    .eq('user_id', userId)
    .gte('date', thirtyDaysAgo);

  if (error || !data || data.length === 0) return null;

  const waterRecords = data as Pick<WaterRow, 'amount_ml' | 'date'>[];
  // 日ごとの合計を計算
  const dailyTotals: Record<string, number> = {};
  waterRecords.forEach((record) => {
    dailyTotals[record.date] = (dailyTotals[record.date] || 0) + record.amount_ml;
  });

  const days = Object.keys(dailyTotals).length;
  const totalMl = Object.values(dailyTotals).reduce((sum, ml) => sum + ml, 0);

  return Math.round(totalMl / days);
}

// ============================
// 目標提案生成
// ============================

/**
 * ユニークIDを生成
 */
function generateId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 改善率を計算 (ランダムに10-20%の範囲で設定)
 */
function calculateImprovement(
  currentValue: number,
  direction: GoalDirection,
  range: { min: number; max: number }
): { suggestedValue: number; improvementPercent: number } {
  const improvement = range.min + Math.random() * (range.max - range.min);
  const improvementPercent = Math.round(improvement * 100);

  let suggestedValue: number;
  if (direction === 'increase') {
    suggestedValue = currentValue * (1 + improvement);
  } else {
    suggestedValue = currentValue * (1 - improvement);
  }

  return { suggestedValue, improvementPercent };
}

/**
 * 値を適切にフォーマット
 */
function formatValue(value: number, category: GoalCategory): number {
  switch (category) {
    case 'spending':
      return Math.round(value / 1000) * 1000; // 1000円単位
    case 'sleep':
      return Math.round(value * 2) / 2; // 0.5時間単位
    case 'exercise':
      return Math.round(value); // 整数
    case 'reading':
      return Math.round(value); // 整数
    case 'water':
      return Math.round(value / 100) * 100; // 100ml単位
    default:
      return Math.round(value);
  }
}

/**
 * 提案メッセージを生成
 */
function generateMessage(
  category: GoalCategory,
  currentValue: number,
  suggestedValue: number,
  config: typeof CATEGORY_CONFIG[GoalCategory]
): { message: string; motivationalMessage: string } {
  const formattedCurrent = formatDisplayValue(currentValue, category, config.unit);
  const formattedSuggested = formatDisplayValue(suggestedValue, category, config.unit);

  const messages: Record<GoalCategory, { message: string; motivationalMessage: string }> = {
    spending: {
      message: `先月の支出は${formattedCurrent}。今月は${formattedSuggested}を目標にしてみない？`,
      motivationalMessage: '無理のない節約で、将来の自分にプレゼント！💪',
    },
    sleep: {
      message: `平均睡眠${formattedCurrent}だから、${formattedSuggested}を目指そう`,
      motivationalMessage: '質の良い睡眠で、毎日をもっとエネルギッシュに！✨',
    },
    exercise: {
      message: `週${formattedCurrent}運動できてるから、週${formattedSuggested}にチャレンジ！`,
      motivationalMessage: '継続は力なり！少しずつステップアップしよう🔥',
    },
    reading: {
      message: `月に${formattedCurrent}読めてるから、${formattedSuggested}目指そう📚`,
      motivationalMessage: '知識は最高の投資！新しい世界が待ってる📖',
    },
    water: {
      message: `1日平均${formattedCurrent}飲めてるから、${formattedSuggested}を目指そう`,
      motivationalMessage: 'こまめな水分補給で、体の中からキレイに💧',
    },
  };

  return messages[category];
}

/**
 * 表示用の値フォーマット
 */
function formatDisplayValue(value: number, category: GoalCategory, unit: string): string {
  switch (category) {
    case 'spending':
      return `¥${value.toLocaleString()}`;
    case 'sleep':
      return `${value}${unit}`;
    case 'exercise':
      return `${value}${unit}`;
    case 'reading':
      return `${value}${unit}`;
    case 'water':
      return `${value}${unit}`;
    default:
      return `${value}${unit}`;
  }
}

/**
 * 全カテゴリの目標提案を生成
 */
export async function generateGoalSuggestions(userId: string): Promise<GoalSuggestion[]> {
  const suggestions: GoalSuggestion[] = [];

  // 各カテゴリのデータを並列で取得
  const [spending, sleep, exercise, reading, water] = await Promise.all([
    getLastMonthSpending(userId),
    getAverageSleepHours(userId),
    getWeeklyExerciseCount(userId),
    getMonthlyReadingCount(userId),
    getAverageWaterIntake(userId),
  ]);

  // 支出目標
  if (spending !== null && spending > 0) {
    const config = CATEGORY_CONFIG.spending;
    const { suggestedValue, improvementPercent } = calculateImprovement(
      spending,
      config.direction,
      config.improvementRange
    );
    const formattedSuggested = formatValue(suggestedValue, 'spending');
    const { message, motivationalMessage } = generateMessage(
      'spending',
      spending,
      formattedSuggested,
      config
    );

    suggestions.push({
      id: generateId(),
      category: 'spending',
      direction: config.direction,
      period: config.period,
      currentValue: spending,
      suggestedValue: formattedSuggested,
      improvementPercent,
      unit: config.unit,
      emoji: config.emoji,
      title: config.title,
      message,
      motivationalMessage,
    });
  }

  // 睡眠目標
  if (sleep !== null && sleep > 0 && sleep < 10) {
    const config = CATEGORY_CONFIG.sleep;
    const { suggestedValue, improvementPercent } = calculateImprovement(
      sleep,
      config.direction,
      config.improvementRange
    );
    const formattedSuggested = formatValue(suggestedValue, 'sleep');
    
    // 9時間を超えないようにする
    const cappedSuggested = Math.min(formattedSuggested, 9);
    const { message, motivationalMessage } = generateMessage(
      'sleep',
      sleep,
      cappedSuggested,
      config
    );

    suggestions.push({
      id: generateId(),
      category: 'sleep',
      direction: config.direction,
      period: config.period,
      currentValue: sleep,
      suggestedValue: cappedSuggested,
      improvementPercent,
      unit: config.unit,
      emoji: config.emoji,
      title: config.title,
      message,
      motivationalMessage,
    });
  }

  // 運動目標
  if (exercise !== null && exercise > 0) {
    const config = CATEGORY_CONFIG.exercise;
    const { suggestedValue, improvementPercent } = calculateImprovement(
      exercise,
      config.direction,
      config.improvementRange
    );
    const formattedSuggested = Math.max(formatValue(suggestedValue, 'exercise'), exercise + 1);
    
    // 週7回を超えないようにする
    const cappedSuggested = Math.min(formattedSuggested, 7);
    const { message, motivationalMessage } = generateMessage(
      'exercise',
      exercise,
      cappedSuggested,
      config
    );

    suggestions.push({
      id: generateId(),
      category: 'exercise',
      direction: config.direction,
      period: config.period,
      currentValue: exercise,
      suggestedValue: cappedSuggested,
      improvementPercent,
      unit: config.unit,
      emoji: config.emoji,
      title: config.title,
      message,
      motivationalMessage,
    });
  }

  // 読書目標
  if (reading !== null && reading > 0) {
    const config = CATEGORY_CONFIG.reading;
    const { suggestedValue, improvementPercent } = calculateImprovement(
      reading,
      config.direction,
      config.improvementRange
    );
    const formattedSuggested = Math.max(formatValue(suggestedValue, 'reading'), reading + 1);
    const { message, motivationalMessage } = generateMessage(
      'reading',
      formattedSuggested,
      formattedSuggested,
      config
    );

    suggestions.push({
      id: generateId(),
      category: 'reading',
      direction: config.direction,
      period: config.period,
      currentValue: reading,
      suggestedValue: formattedSuggested,
      improvementPercent,
      unit: config.unit,
      emoji: config.emoji,
      title: config.title,
      message: `月に${Math.round(reading)}冊読めてるから、${formattedSuggested}冊目指そう📚`,
      motivationalMessage,
    });
  }

  // 水分摂取目標
  if (water !== null && water > 0) {
    const config = CATEGORY_CONFIG.water;
    const { suggestedValue, improvementPercent } = calculateImprovement(
      water,
      config.direction,
      config.improvementRange
    );
    const formattedSuggested = formatValue(suggestedValue, 'water');
    
    // 推奨量の3000mlを超えないようにする
    const cappedSuggested = Math.min(formattedSuggested, 3000);
    const { message, motivationalMessage } = generateMessage(
      'water',
      water,
      cappedSuggested,
      config
    );

    suggestions.push({
      id: generateId(),
      category: 'water',
      direction: config.direction,
      period: config.period,
      currentValue: water,
      suggestedValue: cappedSuggested,
      improvementPercent,
      unit: config.unit,
      emoji: config.emoji,
      title: config.title,
      message,
      motivationalMessage,
    });
  }

  return suggestions;
}

/**
 * 単一カテゴリの目標提案を生成
 */
export async function generateSuggestionForCategory(
  userId: string,
  category: GoalCategory
): Promise<GoalSuggestion | null> {
  const suggestions = await generateGoalSuggestions(userId);
  return suggestions.find((s) => s.category === category) ?? null;
}

// ============================
// 目標設定・管理
// ============================

/**
 * 目標を設定（提案を承認）
 */
export async function acceptGoalSuggestion(
  userId: string,
  suggestion: GoalSuggestion
): Promise<Goal> {
  const now = new Date();
  let endDate: Date;

  // 期間に応じた終了日を設定
  switch (suggestion.period) {
    case 'daily':
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 30); // 30日間
      break;
    case 'weekly':
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 28); // 4週間
      break;
    case 'monthly':
      endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1); // 1ヶ月
      endDate.setDate(0); // 月末
      break;
  }

  const goal: Omit<Goal, 'id' | 'createdAt'> = {
    userId,
    category: suggestion.category,
    targetValue: suggestion.suggestedValue,
    currentValue: suggestion.currentValue,
    period: suggestion.period,
    unit: suggestion.unit,
    startDate: now.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    status: 'active',
  };

  const insertData: GoalInsert = {
    user_id: goal.userId,
    category: goal.category,
    target_value: goal.targetValue,
    current_value: goal.currentValue,
    period: goal.period,
    unit: goal.unit,
    start_date: goal.startDate,
    end_date: goal.endDate,
    status: goal.status,
  };

  const { data, error } = await supabase
    .from('goals')
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create goal');

  const row = data as Database['public']['Tables']['goals']['Row'];

  return {
    id: row.id,
    userId: row.user_id,
    category: row.category as GoalCategory,
    targetValue: row.target_value,
    currentValue: row.current_value,
    period: row.period as GoalPeriod,
    unit: row.unit,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as Goal['status'],
    createdAt: row.created_at,
  };
}

/**
 * アクティブな目標を取得
 */
export async function getActiveGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Database['public']['Tables']['goals']['Row'][];
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    category: row.category as GoalCategory,
    targetValue: row.target_value,
    currentValue: row.current_value,
    period: row.period as GoalPeriod,
    unit: row.unit,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as Goal['status'],
    createdAt: row.created_at,
  }));
}

/**
 * 目標の進捗を取得
 */
export async function getGoalProgress(
  userId: string,
  goal: Goal
): Promise<GoalProgress> {
  const now = new Date();
  const startDate = new Date(goal.startDate);
  const endDate = new Date(goal.endDate);
  
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - elapsedDays);

  // 現在の進捗を取得
  let currentProgress: number;
  switch (goal.category) {
    case 'spending':
      currentProgress = (await getLastMonthSpending(userId)) ?? 0;
      break;
    case 'sleep':
      currentProgress = (await getAverageSleepHours(userId)) ?? 0;
      break;
    case 'exercise':
      currentProgress = (await getWeeklyExerciseCount(userId)) ?? 0;
      break;
    case 'reading':
      currentProgress = (await getMonthlyReadingCount(userId)) ?? 0;
      break;
    case 'water':
      currentProgress = (await getAverageWaterIntake(userId)) ?? 0;
      break;
    default:
      currentProgress = 0;
  }

  // 進捗率を計算 (方向によって計算方法が異なる)
  let progressPercent: number;
  let isOnTrack: boolean;
  const config = CATEGORY_CONFIG[goal.category];

  if (config.direction === 'decrease') {
    // 減少目標: 目標値に近づくほど進捗が上がる
    const improvement = goal.currentValue - currentProgress;
    const targetImprovement = goal.currentValue - goal.targetValue;
    progressPercent = Math.min(100, Math.max(0, (improvement / targetImprovement) * 100));
    isOnTrack = currentProgress <= goal.targetValue || progressPercent >= (elapsedDays / totalDays) * 100;
  } else {
    // 増加目標: 目標値に近づくほど進捗が上がる
    const improvement = currentProgress - goal.currentValue;
    const targetImprovement = goal.targetValue - goal.currentValue;
    progressPercent = Math.min(100, Math.max(0, (improvement / targetImprovement) * 100));
    isOnTrack = currentProgress >= goal.targetValue || progressPercent >= (elapsedDays / totalDays) * 100;
  }

  // 予測値を計算
  const projectedValue = currentProgress; // 現在の傾向を維持した場合

  return {
    goal,
    currentProgress,
    progressPercent: Math.round(progressPercent),
    daysRemaining,
    isOnTrack,
    projectedValue,
  };
}

/**
 * 目標のステータスを更新
 */
export async function updateGoalStatus(
  goalId: string,
  status: Goal['status']
): Promise<void> {
  const updateData: GoalUpdate = { status };
  
  const { error } = await supabase
    .from('goals')
    .update(updateData as never)
    .eq('id', goalId as never);

  if (error) throw error;
}

/**
 * 期限切れの目標をチェックして更新
 */
export async function checkAndUpdateExpiredGoals(userId: string): Promise<void> {
  const activeGoals = await getActiveGoals(userId);
  const today = new Date().toISOString().split('T')[0];

  for (const goal of activeGoals) {
    if (goal.endDate < today) {
      const progress = await getGoalProgress(userId, goal);
      const newStatus = progress.progressPercent >= 100 ? 'achieved' : 'failed';
      await updateGoalStatus(goal.id, newStatus);
    }
  }
}

// ============================
// ユーティリティ関数
// ============================

/**
 * カテゴリの設定を取得
 */
export function getCategoryConfig(category: GoalCategory) {
  return CATEGORY_CONFIG[category];
}

/**
 * 全カテゴリのリストを取得
 */
export function getAllCategories(): GoalCategory[] {
  return Object.keys(CATEGORY_CONFIG) as GoalCategory[];
}

/**
 * 目標達成時のお祝いメッセージを生成
 */
export function generateCelebrationMessage(goal: Goal): string {
  const config = CATEGORY_CONFIG[goal.category];
  const messages: Record<GoalCategory, string[]> = {
    spending: [
      '🎉 やったね！今月の節約目標達成！',
      '💰 素晴らしい！賢くお金を使えたね！',
      '✨ 目標達成おめでとう！この調子で続けよう！',
    ],
    sleep: [
      '😴💤 睡眠目標達成！よく休めたね！',
      '🌙 素晴らしい睡眠習慣！健康的だね！',
      '✨ 目標達成！質の良い睡眠で毎日元気！',
    ],
    exercise: [
      '🏆 運動目標達成！素晴らしい継続力！',
      '💪 やったね！健康的な生活習慣が身についてる！',
      '🔥 目標達成おめでとう！体も心も元気！',
    ],
    reading: [
      '📚✨ 読書目標達成！知識がどんどん増えてるね！',
      '🎉 素晴らしい！読書習慣が定着してきた！',
      '📖 目標達成！新しい世界をたくさん知れたね！',
    ],
    water: [
      '💧✨ 水分摂取目標達成！体の中からキレイ！',
      '🎉 素晴らしい！健康的な習慣だね！',
      '💦 目標達成！こまめな水分補給、続けよう！',
    ],
  };

  const categoryMessages = messages[goal.category];
  return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
}

export default {
  generateGoalSuggestions,
  generateSuggestionForCategory,
  acceptGoalSuggestion,
  getActiveGoals,
  getGoalProgress,
  updateGoalStatus,
  checkAndUpdateExpiredGoals,
  getCategoryConfig,
  getAllCategories,
  generateCelebrationMessage,
};
