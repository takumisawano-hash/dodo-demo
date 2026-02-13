/**
 * DoDo Life - デイリーサマリーサービス
 * 毎日21時に今日の全データを総括してプッシュ通知 + チャット表示
 */

import * as Notifications from 'expo-notifications';

import { supabase, getCurrentUser } from './supabase';
import { saveChatMessage } from './ai';
import type { Database } from '../types/database';

// Table types
type Transaction = Database['public']['Tables']['transactions']['Row'];
type Event = Database['public']['Tables']['events']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type HealthWeight = Database['public']['Tables']['health_weight']['Row'];
type HealthMeal = Database['public']['Tables']['health_meals']['Row'];
type HealthWater = Database['public']['Tables']['health_water']['Row'];
type HealthSleep = Database['public']['Tables']['health_sleep']['Row'];
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

// ============================
// Types
// ============================

export interface DailySummaryData {
  /** 今日の日付 YYYY-MM-DD */
  date: string;
  
  /** 家計 */
  finance: {
    todayExpense: number;
    todayIncome: number;
    monthlyBudget: number;
    monthlySpent: number;
    budgetRemaining: number;
  };
  
  /** 予定 */
  schedule: {
    totalEvents: number;
    completedEvents: number;
    eventTitles: string[];
  };
  
  /** タスク */
  tasks: {
    totalTasks: number;
    completedTasks: number;
    taskTitles: string[];
  };
  
  /** 健康 - 体重 */
  weight: {
    current: number | null;
    yesterday: number | null;
    diff: number | null;
  };
  
  /** 健康 - カロリー */
  calories: {
    total: number;
    meals: { type: string; calories: number }[];
  };
  
  /** 健康 - 水分 */
  water: {
    totalMl: number;
    cups: number;
    targetCups: number;
  };
  
  /** 睡眠（昨夜分） */
  sleep: {
    hours: number | null;
    minutes: number | null;
    quality: number | null;
  };
  
  /** 継続日数 */
  streak: {
    days: number;
    startDate: string | null;
  };
}

export interface GeneratedSummary {
  /** 整形されたサマリーテキスト */
  formattedText: string;
  /** ドードーのコメント */
  dodoComment: string;
  /** 完全なメッセージ（通知用） */
  fullMessage: string;
}

// ============================
// Data Collection Functions
// ============================

/**
 * 今日の日付を取得 (YYYY-MM-DD)
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 昨日の日付を取得 (YYYY-MM-DD)
 */
function getYesterday(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * 今月を取得 (YYYY-MM)
 */
function getCurrentMonth(): string {
  return getToday().substring(0, 7);
}

/**
 * 家計データを収集
 */
async function collectFinanceData(userId: string): Promise<DailySummaryData['finance']> {
  const today = getToday();
  const currentMonth = getCurrentMonth();
  
  // 今日の取引を取得
  const { data: todayTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today);
  
  // 今月の取引を取得
  const { data: monthlyTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', `${currentMonth}-01`)
    .lte('date', `${currentMonth}-31`);
  
  // 今月の予算を取得
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month', currentMonth);
  
  const transactions = (todayTransactions ?? []) as Transaction[];
  const monthlyTxns = (monthlyTransactions ?? []) as Transaction[];
  
  const todayExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const todayIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyBudget = (budgets ?? []).reduce((sum, b) => sum + b.amount, 0);
  
  const monthlySpent = monthlyTxns
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return {
    todayExpense,
    todayIncome,
    monthlyBudget,
    monthlySpent,
    budgetRemaining: monthlyBudget - monthlySpent,
  };
}

/**
 * 予定データを収集
 */
async function collectScheduleData(userId: string): Promise<DailySummaryData['schedule']> {
  const today = getToday();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .or(`and(start_at.gte.${today},start_at.lt.${tomorrowStr}),and(all_day.eq.true,start_at.gte.${today},start_at.lt.${tomorrowStr})`);
  
  const eventList = (events ?? []) as Event[];
  
  return {
    totalEvents: eventList.length,
    // 終日イベントまたは終了時刻が過ぎているものを完了とみなす
    completedEvents: eventList.filter(e => 
      e.all_day || (e.end_at && new Date(e.end_at) < new Date())
    ).length,
    eventTitles: eventList.map(e => e.title),
  };
}

/**
 * タスクデータを収集
 */
async function collectTaskData(userId: string): Promise<DailySummaryData['tasks']> {
  const today = getToday();
  
  // 今日が期限のタスク、または今日完了したタスク
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .or(`due_date.eq.${today},and(completed.eq.true,completed_at.gte.${today}T00:00:00,completed_at.lt.${today}T23:59:59)`);
  
  const taskList = (tasks ?? []) as Task[];
  
  return {
    totalTasks: taskList.length,
    completedTasks: taskList.filter(t => t.completed).length,
    taskTitles: taskList.map(t => t.title),
  };
}

/**
 * 体重データを収集
 */
async function collectWeightData(userId: string): Promise<DailySummaryData['weight']> {
  const today = getToday();
  const yesterday = getYesterday();
  
  const [todayResult, yesterdayResult] = await Promise.all([
    supabase
      .from('health_weight')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('health_weight')
      .select('*')
      .eq('user_id', userId)
      .eq('date', yesterday)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);
  
  const currentWeight = todayResult.data?.[0]?.weight ?? null;
  const yesterdayWeight = yesterdayResult.data?.[0]?.weight ?? null;
  
  return {
    current: currentWeight,
    yesterday: yesterdayWeight,
    diff: currentWeight && yesterdayWeight 
      ? Math.round((currentWeight - yesterdayWeight) * 10) / 10 
      : null,
  };
}

/**
 * カロリーデータを収集
 */
async function collectCalorieData(userId: string): Promise<DailySummaryData['calories']> {
  const today = getToday();
  
  const { data: meals } = await supabase
    .from('health_meals')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today);
  
  const mealList = meals ?? [];
  
  return {
    total: mealList.reduce((sum, m) => sum + (m.calories ?? 0), 0),
    meals: mealList.map(m => ({
      type: m.meal_type,
      calories: m.calories ?? 0,
    })),
  };
}

/**
 * 水分データを収集
 */
async function collectWaterData(userId: string): Promise<DailySummaryData['water']> {
  const today = getToday();
  const TARGET_CUPS = 8;
  const ML_PER_CUP = 250;
  
  const { data: water } = await supabase
    .from('health_water')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today);
  
  const totalMl = (water ?? []).reduce((sum, w) => sum + w.amount_ml, 0);
  
  return {
    totalMl,
    cups: Math.round(totalMl / ML_PER_CUP),
    targetCups: TARGET_CUPS,
  };
}

/**
 * 睡眠データを収集（昨夜分）
 */
async function collectSleepData(userId: string): Promise<DailySummaryData['sleep']> {
  const today = getToday();
  
  const { data: sleep } = await supabase
    .from('health_sleep')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .limit(1)
    .single();
  
  if (!sleep || !sleep.sleep_at || !sleep.wake_at) {
    return { hours: null, minutes: null, quality: null };
  }
  
  const sleepTime = new Date(sleep.sleep_at);
  const wakeTime = new Date(sleep.wake_at);
  const durationMs = wakeTime.getTime() - sleepTime.getTime();
  const totalMinutes = Math.round(durationMs / 60000);
  
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    quality: sleep.quality,
  };
}

/**
 * 継続日数を計算
 */
async function calculateStreak(userId: string): Promise<DailySummaryData['streak']> {
  // chat_messagesテーブルから連続してアクティブな日数を計算
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('user_id', userId)
    .eq('role', 'user')
    .order('created_at', { ascending: false });
  
  if (!messages || messages.length === 0) {
    return { days: 1, startDate: getToday() };
  }
  
  // 日付でグループ化
  const uniqueDates = [...new Set(
    messages.map(m => m.created_at.split('T')[0])
  )].sort().reverse();
  
  let streak = 0;
  let currentDate = new Date(getToday());
  
  for (const dateStr of uniqueDates) {
    const date = new Date(dateStr);
    const expectedDate = new Date(currentDate);
    expectedDate.setDate(expectedDate.getDate() - streak);
    
    if (date.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
      streak++;
    } else if (streak > 0) {
      break;
    }
  }
  
  // 最低1日
  streak = Math.max(streak, 1);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - streak + 1);
  
  return {
    days: streak,
    startDate: startDate.toISOString().split('T')[0],
  };
}

// ============================
// Summary Generation
// ============================

/**
 * 全データを収集
 */
export async function collectDailySummaryData(userId: string): Promise<DailySummaryData> {
  const [finance, schedule, tasks, weight, calories, water, sleep, streak] = await Promise.all([
    collectFinanceData(userId),
    collectScheduleData(userId),
    collectTaskData(userId),
    collectWeightData(userId),
    collectCalorieData(userId),
    collectWaterData(userId),
    collectSleepData(userId),
    calculateStreak(userId),
  ]);
  
  return {
    date: getToday(),
    finance,
    schedule,
    tasks,
    weight,
    calories,
    water,
    sleep,
    streak,
  };
}

/**
 * 数値をフォーマット（カンマ区切り）
 */
function formatNumber(num: number): string {
  return num.toLocaleString('ja-JP');
}

/**
 * サマリーテキストを整形
 */
function formatSummaryText(data: DailySummaryData): string {
  const lines: string[] = [];
  
  // 💰 家計
  if (data.finance.todayExpense > 0 || data.finance.monthlyBudget > 0) {
    let financeLine = `💰 今日の支出: ¥${formatNumber(data.finance.todayExpense)}`;
    if (data.finance.monthlyBudget > 0) {
      financeLine += `（予算残り¥${formatNumber(data.finance.budgetRemaining)}）`;
    }
    lines.push(financeLine);
  }
  
  // 📅 予定
  if (data.schedule.totalEvents > 0) {
    lines.push(`📅 こなした予定: ${data.schedule.completedEvents}件`);
  }
  
  // ✅ タスク
  if (data.tasks.totalTasks > 0) {
    lines.push(`✅ 完了タスク: ${data.tasks.completedTasks}/${data.tasks.totalTasks}件`);
  }
  
  // 💪 体重
  if (data.weight.current !== null) {
    let weightLine = `💪 体重: ${data.weight.current.toFixed(1)}kg`;
    if (data.weight.diff !== null) {
      const sign = data.weight.diff >= 0 ? '+' : '';
      weightLine += `（昨日比${sign}${data.weight.diff.toFixed(1)}kg）`;
    }
    lines.push(weightLine);
  }
  
  // 🍽️ カロリー
  if (data.calories.total > 0) {
    lines.push(`🍽️ 摂取カロリー: ${formatNumber(data.calories.total)}kcal`);
  }
  
  // 💧 水分
  if (data.water.cups > 0) {
    lines.push(`💧 水分: ${data.water.cups}杯/${data.water.targetCups}杯`);
  }
  
  // 😴 睡眠
  if (data.sleep.hours !== null) {
    lines.push(`😴 昨夜の睡眠: ${data.sleep.hours}時間${data.sleep.minutes}分`);
  }
  
  // 🔥 継続日数
  lines.push(`🔥 継続日数: ${data.streak.days}日`);
  
  return lines.join('\n');
}

/**
 * Edge Function URLを取得
 */
function getEdgeFunctionUrl(path: string): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return supabaseUrl ? `${supabaseUrl}/functions/v1/${path}` : '';
}

/**
 * Claude APIでドードーのコメントを生成（Edge Function経由）
 */
async function generateDodoComment(data: DailySummaryData): Promise<string> {
  const prompt = `あなたはDoDo Life（ドードーライフ）というライフログアプリのマスコットキャラクター「ドードー」です。
ドードーはかわいくて励まし上手な鳥のキャラクターです。

今日のユーザーの1日のサマリーを見て、温かく励ましのコメントを1〜2文で返してください。
絵文字を適度に使って親しみやすくしてください。

【今日のサマリー】
${formatSummaryText(data)}

【ルール】
- 1〜2文で簡潔に
- 具体的なデータに触れて褒める
- ポジティブな表現を使う
- 「ドードー」の一人称は使わない
- 語尾は「ね！」「よ！」「💪」などで締める`;

  try {
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session?.session?.access_token;
    
    const response = await fetch(getEdgeFunctionUrl('generate-comment'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({ prompt }),
    });
    
    if (response.ok) {
      const result = await response.json();
      return result.comment || getDefaultComment(data);
    }
  } catch (error) {
    console.warn('Failed to generate AI comment:', error);
  }
  
  return getDefaultComment(data);
}

/**
 * デフォルトのドードーコメントを生成
 */
function getDefaultComment(data: DailySummaryData): string {
  const comments: string[] = [];
  
  // データに応じたコメントを選択
  if (data.tasks.completedTasks > 0 && data.tasks.completedTasks === data.tasks.totalTasks) {
    comments.push('タスク全部完了！すごいね✨');
  }
  if (data.water.cups >= data.water.targetCups) {
    comments.push('水分補給もバッチリ💧');
  }
  if (data.streak.days >= 7) {
    comments.push(`${data.streak.days}日継続中！その調子🔥`);
  }
  if (data.weight.diff !== null && data.weight.diff < 0) {
    comments.push('体重管理順調だね💪');
  }
  
  if (comments.length > 0) {
    return comments[Math.floor(Math.random() * comments.length)] + ' 明日も一緒に頑張ろう！';
  }
  
  return '今日も頑張ったね！明日も一緒に頑張ろう💪';
}

/**
 * サマリーを生成
 */
export async function generateDailySummary(userId: string): Promise<GeneratedSummary> {
  const data = await collectDailySummaryData(userId);
  const formattedText = formatSummaryText(data);
  const dodoComment = await generateDodoComment(data);
  
  const fullMessage = `🌙 今日のまとめ\n\n${formattedText}\n\n${dodoComment}`;
  
  return {
    formattedText,
    dodoComment,
    fullMessage,
  };
}

// ============================
// Notification & Chat
// ============================

/**
 * プッシュ通知を送信
 */
async function sendPushNotification(summary: GeneratedSummary): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌙 今日のまとめ',
      body: summary.formattedText.split('\n').slice(0, 3).join(' | ') + '...',
      data: { type: 'daily_summary' },
    },
    trigger: null, // 即座に送信
  });
}

/**
 * チャットにサマリーを保存
 */
async function saveSummaryToChat(userId: string, summary: GeneratedSummary): Promise<void> {
  await saveChatMessage('assistant', summary.fullMessage);
}

/**
 * デイリーサマリーを送信（メイン関数）
 */
export async function sendDailySummary(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    console.warn('User not authenticated, skipping daily summary');
    return;
  }
  
  const summary = await generateDailySummary(user.id);
  
  await Promise.all([
    sendPushNotification(summary),
    saveSummaryToChat(user.id, summary),
  ]);
  
  console.log('Daily summary sent successfully');
}

// ============================
// Scheduler
// ============================

/**
 * 毎日21時にデイリーサマリーをスケジュール
 */
export async function scheduleDailySummary(): Promise<string> {
  // 既存のデイリーサマリー通知をキャンセル
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'daily_summary_trigger') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
  
  // 毎日21:00にトリガー
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Summary Trigger',
      body: '',
      data: { type: 'daily_summary_trigger' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
  
  return identifier;
}

/**
 * 通知リスナーを設定
 * アプリ起動時に呼び出す
 */
export function setupDailySummaryListener(): () => void {
  const subscription = Notifications.addNotificationReceivedListener(async (notification) => {
    if (notification.request.content.data?.type === 'daily_summary_trigger') {
      await sendDailySummary();
    }
  });
  
  return () => subscription.remove();
}

/**
 * 通知許可をリクエスト
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

// ============================
// Exports
// ============================

export default {
  collectDailySummaryData,
  generateDailySummary,
  sendDailySummary,
  scheduleDailySummary,
  setupDailySummaryListener,
  requestNotificationPermissions,
};
