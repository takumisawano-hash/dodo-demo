/**
 * DoDo Life - 予測・先読み提案サービス
 * 過去データとカレンダーから未来を予測して提案
 */

import { supabase } from './supabase';
import type { Transaction, Event, Task, Budget } from '../types/database';

// Supabaseクエリ結果をanyで扱う（スキーマ拡張時の柔軟性のため）
/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================
// 型定義
// ============================

/** 予測の種類 */
export type PredictionType =
  | 'calendar_reminder'   // 📅 カレンダーリマインダー
  | 'budget_warning'      // 💰 予算警告
  | 'goal_progress'       // 📚 目標達成予測
  | 'medication_refill'   // 💊 薬補充アラート
  | 'habit_streak'        // 🎯 習慣継続
  | 'weather_opportunity' // 🏃 天気連携
  | 'task_deadline'       // ✅ タスク期限
  | 'spending_pattern';   // 📊 支出パターン

/** 予測の優先度 */
export type PredictionPriority = 'high' | 'medium' | 'low';

/** 予測結果 */
export interface Prediction {
  type: PredictionType;
  priority: PredictionPriority;
  emoji: string;
  title: string;
  message: string;
  actionable?: boolean;
  dueDate?: string;
  metadata?: Record<string, unknown>;
}

/** 朝サマリー */
export interface MorningSummary {
  greeting: string;
  predictions: Prediction[];
  todayEvents: Event[];
  pendingTasks: Task[];
  generatedAt: string;
}

// ============================
// ユーティリティ関数
// ============================

/** 日付文字列をYYYY-MM-DD形式で取得 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** 日付をN日後に移動 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** 今月の残り日数を取得 */
function getRemainingDaysInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
}

/** 曜日を日本語で取得 */
function getDayOfWeekJa(date: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}

/** 時間帯に応じた挨拶を取得 */
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'おはよう、早起きさん！🌙';
  if (hour < 12) return 'おはよう！🌅';
  if (hour < 18) return 'こんにちは！☀️';
  return 'こんばんは！🌃';
}

// ============================
// 予測関数
// ============================

/**
 * 📅 明日以降のカレンダーイベントをリマインド
 */
export async function predictCalendarReminders(
  userId: string,
  daysAhead: number = 3
): Promise<Prediction[]> {
  const predictions: Prediction[] = [];
  const now = new Date();

  // 明日から指定日数分のイベントを取得
  const tomorrow = formatDate(addDays(now, 1));
  const endDate = formatDate(addDays(now, daysAhead));

  const { data: eventsData } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_at', tomorrow)
    .lte('start_at', endDate + 'T23:59:59')
    .order('start_at', { ascending: true });

  const events = (eventsData || []) as any[];
  if (events.length === 0) return predictions;

  // イベントごとにリマインダーを生成
  for (const event of events) {
    const eventDate = new Date(event.start_at || '');
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let timeWord = '';
    if (daysUntil === 1) timeWord = '明日';
    else if (daysUntil === 2) timeWord = '明後日';
    else timeWord = `${daysUntil}日後`;

    const dayOfWeek = getDayOfWeekJa(eventDate);
    const timeStr = event.all_day
      ? '終日'
      : eventDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    predictions.push({
      type: 'calendar_reminder',
      priority: daysUntil === 1 ? 'high' : 'medium',
      emoji: '📅',
      title: `${timeWord}の予定`,
      message: `${timeWord}(${dayOfWeek}) ${timeStr}に「${event.title}」があるよ${event.location ? `📍${event.location}` : ''}、忘れないでね！`,
      dueDate: event.start_at || undefined,
      metadata: { eventId: event.id },
    });
  }

  return predictions;
}

/**
 * 💰 予算オーバー予測
 */
export async function predictBudgetWarning(userId: string): Promise<Prediction[]> {
  const predictions: Prediction[] = [];
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysPassed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - daysPassed;

  // 今月の予算を取得
  const { data: budgetsData } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month', currentMonth);

  const budgets = (budgetsData || []) as any[];
  if (budgets.length === 0) return predictions;

  // 今月の支出を取得
  const { data: transactionsData } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', `${currentMonth}-01`)
    .lte('date', `${currentMonth}-${daysInMonth}`);

  const transactions = (transactionsData || []) as any[];

  // カテゴリ別の支出を集計
  const spentByCategory: Record<string, number> = {};
  for (const tx of transactions) {
    const cat = tx.category || 'その他';
    spentByCategory[cat] = (spentByCategory[cat] || 0) + tx.amount;
  }

  // 各予算カテゴリをチェック
  for (const budget of budgets) {
    const spent = spentByCategory[budget.category] || 0;
    const dailyRate = spent / daysPassed;
    const projectedTotal = dailyRate * daysInMonth;
    const percentUsed = (spent / budget.amount) * 100;

    // すでにオーバー
    if (spent > budget.amount) {
      predictions.push({
        type: 'budget_warning',
        priority: 'high',
        emoji: '🚨',
        title: `${budget.category}予算オーバー`,
        message: `${budget.category}の予算¥${budget.amount.toLocaleString()}を既に¥${(spent - budget.amount).toLocaleString()}超えてるよ！残り${remainingDays}日は節約モードだね💪`,
        actionable: true,
        metadata: { category: budget.category, budget: budget.amount, spent },
      });
    }
    // このペースだとオーバーしそう
    else if (projectedTotal > budget.amount && percentUsed > 70) {
      const overAmount = Math.round(projectedTotal - budget.amount);
      predictions.push({
        type: 'budget_warning',
        priority: 'high',
        emoji: '⚠️',
        title: `${budget.category}予算注意`,
        message: `このペースだと${budget.category}が¥${overAmount.toLocaleString()}オーバーしそう…残り${remainingDays}日で1日¥${Math.round((budget.amount - spent) / remainingDays).toLocaleString()}ペースにしよう！`,
        actionable: true,
        metadata: { category: budget.category, budget: budget.amount, spent, projected: projectedTotal },
      });
    }
    // 順調
    else if (percentUsed < 50 && daysPassed > daysInMonth / 2) {
      predictions.push({
        type: 'budget_warning',
        priority: 'low',
        emoji: '🎉',
        title: `${budget.category}節約上手`,
        message: `${budget.category}は予算の${Math.round(percentUsed)}%で折り返し！いい調子だよ✨`,
        metadata: { category: budget.category, budget: budget.amount, spent },
      });
    }
  }

  return predictions;
}

/**
 * 📊 支出パターン分析（来週の予測）
 */
export async function predictSpendingPattern(userId: string): Promise<Prediction[]> {
  const predictions: Prediction[] = [];
  const now = new Date();
  
  // 過去30日のイベントと支出を分析
  const thirtyDaysAgo = formatDate(addDays(now, -30));
  const sevenDaysAhead = formatDate(addDays(now, 7));

  // 来週のイベントを取得
  const { data: upcomingEventsData } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_at', formatDate(now))
    .lte('start_at', sevenDaysAhead);

  const upcomingEvents = (upcomingEventsData || []) as any[];

  // 出張・旅行・飲み会などのイベントをカウント
  const expensiveKeywords = ['出張', '旅行', '飲み会', '会食', 'ランチ', 'ディナー', '食事会', 'パーティ'];
  const expensiveEvents = upcomingEvents.filter((event: any) =>
    expensiveKeywords.some(kw => event.title.includes(kw) || (event.memo || '').includes(kw))
  );

  if (expensiveEvents.length >= 2) {
    const eventList = expensiveEvents.map(e => e.title).join('、');
    predictions.push({
      type: 'spending_pattern',
      priority: 'medium',
      emoji: '💰',
      title: '出費が増えそう',
      message: `来週は「${eventList}」など予定が多いから、外食費が増えそうだね。予算に余裕を持っておこう！`,
      metadata: { events: expensiveEvents.map(e => e.id) },
    });
  }

  return predictions;
}

/**
 * ✅ タスク期限リマインダー
 */
export async function predictTaskDeadlines(userId: string): Promise<Prediction[]> {
  const predictions: Prediction[] = [];
  const now = new Date();
  const threeDaysAhead = formatDate(addDays(now, 3));

  const { data: tasksData } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .not('due_date', 'is', null)
    .lte('due_date', threeDaysAhead)
    .order('due_date', { ascending: true });

  const tasks = (tasksData || []) as any[];
  if (tasks.length === 0) return predictions;

  const today = formatDate(now);
  const tomorrow = formatDate(addDays(now, 1));

  // 期限切れタスク
  const overdueTasks = tasks.filter((t: any) => t.due_date && t.due_date < today);
  if (overdueTasks.length > 0) {
    predictions.push({
      type: 'task_deadline',
      priority: 'high',
      emoji: '🔥',
      title: '期限切れタスク',
      message: `${overdueTasks.length}件のタスクが期限切れだよ！「${overdueTasks[0].title}」など、今日片付けちゃおう！`,
      actionable: true,
      metadata: { taskIds: overdueTasks.map((t: any) => t.id) },
    });
  }

  // 今日期限
  const todayTasks = tasks.filter((t: any) => t.due_date === today);
  if (todayTasks.length > 0) {
    predictions.push({
      type: 'task_deadline',
      priority: 'high',
      emoji: '⏰',
      title: '今日が期限',
      message: `今日期限のタスク${todayTasks.length}件！「${todayTasks[0].title}」を忘れずにね！`,
      actionable: true,
      metadata: { taskIds: todayTasks.map((t: any) => t.id) },
    });
  }

  // 明日期限
  const tomorrowTasks = tasks.filter((t: any) => t.due_date === tomorrow);
  if (tomorrowTasks.length > 0) {
    predictions.push({
      type: 'task_deadline',
      priority: 'medium',
      emoji: '📋',
      title: '明日が期限',
      message: `明日期限のタスク${tomorrowTasks.length}件。今日のうちに進められる？`,
      metadata: { taskIds: tomorrowTasks.map((t: any) => t.id) },
    });
  }

  return predictions;
}

/**
 * 📚 目標達成予測（習慣トラッキング）
 */
export async function predictGoalProgress(userId: string): Promise<Prediction[]> {
  const predictions: Prediction[] = [];
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const remainingDays = daysInMonth - daysPassed;

  // 今月の読書記録を取得（booksテーブルがあれば）
  const { data: books } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('updated_at', `${currentMonth}-01`)
    .order('updated_at', { ascending: false });

  // 月間読書目標（仮に3冊として）
  const MONTHLY_BOOK_GOAL = 3;
  const completedBooks = books?.length || 0;
  const booksRemaining = MONTHLY_BOOK_GOAL - completedBooks;

  if (booksRemaining <= 0) {
    predictions.push({
      type: 'goal_progress',
      priority: 'low',
      emoji: '🎊',
      title: '読書目標達成！',
      message: `今月の読書目標${MONTHLY_BOOK_GOAL}冊クリア！おめでとう📚✨`,
      metadata: { goal: MONTHLY_BOOK_GOAL, completed: completedBooks },
    });
  } else if (booksRemaining <= 1 && remainingDays >= 3) {
    predictions.push({
      type: 'goal_progress',
      priority: 'medium',
      emoji: '📚',
      title: '読書目標まであと少し',
      message: `あと${booksRemaining}冊で今月の読書目標達成だよ！残り${remainingDays}日、ラストスパート！`,
      metadata: { goal: MONTHLY_BOOK_GOAL, completed: completedBooks, remaining: booksRemaining },
    });
  }

  // 運動記録を分析
  const weekAgo = formatDate(addDays(now, -7));
  const { data: exercises } = await supabase
    .from('health_exercise')
    .select('*')
    .eq('user_id', userId)
    .gte('date', weekAgo)
    .order('date', { ascending: false });

  const exerciseDays = new Set((exercises as any[] || []).map((e: any) => e.date)).size;
  
  if (exerciseDays >= 5) {
    predictions.push({
      type: 'goal_progress',
      priority: 'low',
      emoji: '💪',
      title: '運動習慣キープ中',
      message: `今週${exerciseDays}日運動できてるね！この調子でいこう🏃`,
      metadata: { exerciseDays },
    });
  } else if (exerciseDays <= 1 && now.getDay() >= 3) { // 水曜以降で1日以下
    predictions.push({
      type: 'goal_progress',
      priority: 'medium',
      emoji: '🏃',
      title: '運動しよう',
      message: `今週まだ${exerciseDays}日しか運動してないよ。週末に挽回できるかも？`,
      metadata: { exerciseDays },
    });
  }

  return predictions;
}

/**
 * 💊 薬・消耗品の補充リマインダー
 */
export async function predictMedicationRefill(userId: string): Promise<Prediction[]> {
  const predictions: Prediction[] = [];

  // 薬テーブルがあれば残量をチェック
  const { data: medicationsData } = await supabase
    .from('medications')
    .select('*, medication_logs(taken_at)')
    .eq('user_id', userId);

  const medications = (medicationsData || []) as any[];
  if (medications.length === 0) return predictions;

  for (const med of medications) {
    // 残量フィールドがあれば（スキーマ拡張が必要な場合は実装調整）
    const remaining = med.remaining_count;
    const dailyDose = med.daily_dose || 1;

    if (remaining !== undefined && remaining <= dailyDose * 7) {
      const daysLeft = Math.floor(remaining / dailyDose);
      predictions.push({
        type: 'medication_refill',
        priority: daysLeft <= 3 ? 'high' : 'medium',
        emoji: '💊',
        title: '薬の補充時期',
        message: daysLeft <= 3
          ? `「${med.name}」があと${daysLeft}日分！早めに補充しよう`
          : `「${med.name}」が来週あたりで切れそう。補充の準備を`,
        actionable: true,
        metadata: { medicationId: med.id, medicationName: med.name, remaining, daysLeft },
      });
    }
  }

  return predictions;
}

/**
 * 🎯 習慣ストリーク（継続日数）
 */
export async function predictHabitStreak(userId: string): Promise<Prediction[]> {
  const predictions: Prediction[] = [];

  const { data: habitsData } = await supabase
    .from('habits')
    .select('*, habit_logs(date, completed)')
    .eq('user_id', userId)
    .eq('active', true);

  const habits = (habitsData || []) as any[];
  if (habits.length === 0) return predictions;

  const today = formatDate(new Date());
  const yesterday = formatDate(addDays(new Date(), -1));

  for (const habit of habits) {
    const logs = (habit as any).habit_logs || [];
    
    // 連続日数を計算
    let streak = 0;
    let checkDate = new Date();
    
    for (let i = 0; i < 365; i++) {
      const dateStr = formatDate(checkDate);
      const log = logs.find((l: any) => l.date === dateStr && l.completed);
      if (log) {
        streak++;
        checkDate = addDays(checkDate, -1);
      } else if (dateStr !== today) {
        // 今日はまだカウントしない（今日やる可能性がある）
        break;
      } else {
        checkDate = addDays(checkDate, -1);
      }
    }

    // 記念日的なストリーク
    if (streak === 6) {
      predictions.push({
        type: 'habit_streak',
        priority: 'high',
        emoji: '🔥',
        title: '習慣継続中',
        message: `「${habit.name}」6日連続達成中！今日やれば1週間達成だよ🎯`,
        metadata: { habitId: habit.id, habitName: habit.name, streak },
      });
    } else if (streak === 29) {
      predictions.push({
        type: 'habit_streak',
        priority: 'high',
        emoji: '🏆',
        title: 'もうすぐ1ヶ月',
        message: `「${habit.name}」29日連続！明日で1ヶ月達成だよ！`,
        metadata: { habitId: habit.id, habitName: habit.name, streak },
      });
    } else if (streak > 0 && streak % 10 === 0) {
      predictions.push({
        type: 'habit_streak',
        priority: 'low',
        emoji: '✨',
        title: '習慣継続',
        message: `「${habit.name}」${streak}日継続中！すごいね👏`,
        metadata: { habitId: habit.id, habitName: habit.name, streak },
      });
    }
  }

  return predictions;
}

/**
 * 🏃 週末の天気連携（外部API必要）
 * 注意: 実際の天気APIキーが必要
 */
export async function predictWeatherOpportunity(
  userId: string,
  weatherApiKey?: string
): Promise<Prediction[]> {
  const predictions: Prediction[] = [];

  // 天気APIがない場合はスキップ
  if (!weatherApiKey) return predictions;

  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // 金曜〜土曜の場合、週末の天気をチェック
  if (dayOfWeek >= 4 && dayOfWeek <= 6) {
    try {
      // 仮実装: 実際のAPIコールはここに
      // const weather = await fetchWeatherForecast(weatherApiKey);
      
      // モック: 天気が良い場合の例
      const isGoodWeather = Math.random() > 0.5; // 実際はAPIから判定
      
      if (isGoodWeather) {
        predictions.push({
          type: 'weather_opportunity',
          priority: 'low',
          emoji: '🏃',
          title: '運動日和',
          message: '週末は天気が良さそう！外で運動するチャンスだよ☀️',
        });
      }
    } catch (error) {
      console.error('Weather API error:', error);
    }
  }

  return predictions;
}

// ============================
// 統合関数
// ============================

/**
 * すべての予測を生成
 */
export async function generateAllPredictions(
  userId: string,
  options?: { weatherApiKey?: string }
): Promise<Prediction[]> {
  const predictions: Prediction[] = [];

  // 並列で予測を生成
  const results = await Promise.allSettled([
    predictCalendarReminders(userId),
    predictBudgetWarning(userId),
    predictSpendingPattern(userId),
    predictTaskDeadlines(userId),
    predictGoalProgress(userId),
    predictMedicationRefill(userId),
    predictHabitStreak(userId),
    predictWeatherOpportunity(userId, options?.weatherApiKey),
  ]);

  // 成功した予測を集約
  for (const result of results) {
    if (result.status === 'fulfilled') {
      predictions.push(...result.value);
    }
  }

  // 優先度でソート
  const priorityOrder: Record<PredictionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  predictions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return predictions;
}

/**
 * 朝のサマリーを生成
 */
export async function generateMorningSummary(
  userId: string,
  options?: { weatherApiKey?: string }
): Promise<MorningSummary> {
  const now = new Date();
  const today = formatDate(now);
  const tomorrow = formatDate(addDays(now, 1));

  // 予測を生成
  const predictions = await generateAllPredictions(userId, options);

  // 今日のイベントを取得
  const { data: todayEventsData } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .or(`and(start_at.gte.${today},start_at.lt.${tomorrow}),all_day.eq.true`)
    .order('start_at', { ascending: true });

  // 未完了タスクを取得
  const { data: pendingTasksData } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .order('priority', { ascending: false })
    .limit(5);

  const todayEventsTyped = (todayEventsData || []) as Event[];
  const pendingTasksTyped = (pendingTasksData || []) as Task[];

  // 挨拶を生成
  const dayOfWeek = getDayOfWeekJa(now);
  const greeting = `${getTimeGreeting()} 今日は${now.getMonth() + 1}月${now.getDate()}日(${dayOfWeek})だよ！`;

  return {
    greeting,
    predictions: predictions.slice(0, 5), // 上位5件に絞る
    todayEvents: todayEventsTyped,
    pendingTasks: pendingTasksTyped,
    generatedAt: now.toISOString(),
  };
}

/**
 * 朝サマリーをフレンドリーなテキストで出力
 */
export function formatMorningSummaryText(summary: MorningSummary): string {
  const lines: string[] = [summary.greeting, ''];

  // 今日の予定
  if (summary.todayEvents.length > 0) {
    lines.push('📅 **今日の予定**');
    for (const event of summary.todayEvents) {
      const timeStr = event.all_day
        ? '終日'
        : new Date(event.start_at || '').toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          });
      lines.push(`  • ${timeStr} ${event.title}`);
    }
    lines.push('');
  }

  // 予測・提案
  if (summary.predictions.length > 0) {
    lines.push('💡 **今日のヒント**');
    for (const pred of summary.predictions) {
      lines.push(`${pred.emoji} ${pred.message}`);
    }
    lines.push('');
  }

  // 未完了タスク
  if (summary.pendingTasks.length > 0) {
    lines.push('✅ **やることリスト**');
    for (const task of summary.pendingTasks.slice(0, 3)) {
      const dueStr = task.due_date ? ` (${task.due_date})` : '';
      lines.push(`  • ${task.title}${dueStr}`);
    }
    if (summary.pendingTasks.length > 3) {
      lines.push(`  ...他${summary.pendingTasks.length - 3}件`);
    }
  }

  return lines.join('\n');
}

/**
 * プッシュ通知すべき重要な予測を取得
 */
export async function getUrgentPredictions(userId: string): Promise<Prediction[]> {
  const predictions = await generateAllPredictions(userId);
  
  // highの予測のみ返す
  return predictions.filter(p => p.priority === 'high');
}

/**
 * 特定のタイミングでチェックすべき予測（定期実行用）
 */
export async function checkScheduledPredictions(
  userId: string,
  timing: 'morning' | 'evening' | 'realtime'
): Promise<Prediction[]> {
  switch (timing) {
    case 'morning':
      // 朝: カレンダー、タスク期限、習慣
      return [
        ...(await predictCalendarReminders(userId, 1)),
        ...(await predictTaskDeadlines(userId)),
        ...(await predictHabitStreak(userId)),
      ];

    case 'evening':
      // 夕方: 予算、目標進捗
      return [
        ...(await predictBudgetWarning(userId)),
        ...(await predictGoalProgress(userId)),
      ];

    case 'realtime':
      // リアルタイム: 緊急のもののみ
      return getUrgentPredictions(userId);

    default:
      return [];
  }
}

export default {
  generateAllPredictions,
  generateMorningSummary,
  formatMorningSummaryText,
  getUrgentPredictions,
  checkScheduledPredictions,
  predictCalendarReminders,
  predictBudgetWarning,
  predictSpendingPattern,
  predictTaskDeadlines,
  predictGoalProgress,
  predictMedicationRefill,
  predictHabitStreak,
  predictWeatherOpportunity,
};
