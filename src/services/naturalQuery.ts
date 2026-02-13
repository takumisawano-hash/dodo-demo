/**
 * DoDo Life - 自然言語クエリサービス
 * チャットで質問すると、全ミニアプリのデータを検索して回答
 *
 * 例:
 * - 「先月いくら使った？」→「先月の支出は¥152,340だよ。食費が一番多くて¥45,000」
 * - 「最近寝れてる？」→「今週の平均睡眠は6.2時間。ちょっと少ないかも😴」
 * - 「今月何冊読んだ？」→「今月は2冊読了！『〇〇』と『△△』だね📚」
 * - 「体重の推移見せて」→ グラフを表示
 * - 「来週の予定は？」→ 予定一覧を表示
 */

import { supabase, getCurrentUser } from './supabase';
import type {
  Database,
  Transaction,
  Event,
  Task,
  HealthWeight,
  HealthMeal,
  HealthExercise,
  HealthWater,
  HealthSleep,
} from '../types/database';

// ============================
// Types
// ============================

/** クエリの種類 */
export type QueryCategory =
  | 'finance' // 家計簿
  | 'events' // 予定
  | 'tasks' // タスク
  | 'sleep' // 睡眠
  | 'weight' // 体重
  | 'exercise' // 運動
  | 'meals' // 食事
  | 'water' // 水分
  | 'books' // 読書
  | 'movies' // 映画
  | 'general'; // 一般・複合

/** 期間指定 */
export type TimePeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'custom';

/** 集計タイプ */
export type AggregationType = 'sum' | 'avg' | 'count' | 'list' | 'trend';

/** 解析されたクエリ意図 */
export interface QueryIntent {
  category: QueryCategory;
  period: TimePeriod;
  periodStart?: string; // ISO date
  periodEnd?: string; // ISO date
  aggregation: AggregationType;
  subCategory?: string; // 食費、ランニングなど
  showChart: boolean;
  originalQuery: string;
}

/** クエリ結果のデータ */
export interface QueryData {
  category: QueryCategory;
  records: Record<string, unknown>[];
  summary?: {
    total?: number;
    average?: number;
    count?: number;
    breakdown?: { label: string; value: number }[];
    trend?: { date: string; value: number }[];
  };
}

/** 自然言語クエリの結果 */
export interface NaturalQueryResult {
  /** ドードーの回答 */
  response: string;
  /** 取得したデータ */
  data: QueryData;
  /** グラフを表示するか */
  showChart: boolean;
  /** グラフ用データ */
  chartData?: {
    type: 'line' | 'bar' | 'pie';
    labels: string[];
    values: number[];
  };
}

// ============================
// Date Utilities
// ============================

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateRange(period: TimePeriod): { start: string; end: string } {
  const now = new Date();
  const today = getToday();

  switch (period) {
    case 'today':
      return { start: today, end: today };

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const y = yesterday.toISOString().split('T')[0];
      return { start: y, end: y };
    }

    case 'this_week': {
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      weekStart.setDate(weekStart.getDate() - diff);
      return { start: weekStart.toISOString().split('T')[0], end: today };
    }

    case 'last_week': {
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      const diff = day === 0 ? 6 : day - 1;
      weekStart.setDate(weekStart.getDate() - diff - 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      };
    }

    case 'this_month': {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { start: monthStart, end: today };
    }

    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: lastMonth.toISOString().split('T')[0],
        end: lastMonthEnd.toISOString().split('T')[0],
      };
    }

    case 'this_year': {
      const yearStart = `${now.getFullYear()}-01-01`;
      return { start: yearStart, end: today };
    }

    case 'last_year': {
      const lastYear = now.getFullYear() - 1;
      return { start: `${lastYear}-01-01`, end: `${lastYear}-12-31` };
    }

    default:
      return { start: today, end: today };
  }
}

// ============================
// Query Intent Analysis
// ============================

/** Edge FunctionのURL（意図解析用） */
const QUERY_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/natural-query`
  : '';

/**
 * ユーザーの質問からクエリ意図を解析（ローカルフォールバック版）
 * Edge Functionが使えない場合のシンプルなルールベース解析
 */
function analyzeQueryIntentLocal(query: string): QueryIntent {
  const q = query.toLowerCase();
  const now = new Date();

  // カテゴリ判定
  let category: QueryCategory = 'general';
  if (q.includes('支出') || q.includes('出費') || q.includes('使っ') || q.includes('いくら') || q.includes('家計') || q.includes('食費') || q.includes('交通費')) {
    category = 'finance';
  } else if (q.includes('予定') || q.includes('スケジュール') || q.includes('イベント')) {
    category = 'events';
  } else if (q.includes('タスク') || q.includes('やること') || q.includes('todo')) {
    category = 'tasks';
  } else if (q.includes('睡眠') || q.includes('寝') || q.includes('眠')) {
    category = 'sleep';
  } else if (q.includes('体重') || q.includes('kg')) {
    category = 'weight';
  } else if (q.includes('運動') || q.includes('走') || q.includes('筋トレ') || q.includes('エクササイズ')) {
    category = 'exercise';
  } else if (q.includes('食事') || q.includes('ご飯') || q.includes('カロリー')) {
    category = 'meals';
  } else if (q.includes('水') || q.includes('水分')) {
    category = 'water';
  } else if (q.includes('本') || q.includes('読書') || q.includes('読') && q.includes('冊')) {
    category = 'books';
  } else if (q.includes('映画') || q.includes('ドラマ') || q.includes('観')) {
    category = 'movies';
  }

  // 期間判定
  let period: TimePeriod = 'this_month';
  if (q.includes('今日')) {
    period = 'today';
  } else if (q.includes('昨日')) {
    period = 'yesterday';
  } else if (q.includes('今週')) {
    period = 'this_week';
  } else if (q.includes('先週') || q.includes('前週')) {
    period = 'last_week';
  } else if (q.includes('今月')) {
    period = 'this_month';
  } else if (q.includes('先月') || q.includes('前月')) {
    period = 'last_month';
  } else if (q.includes('今年')) {
    period = 'this_year';
  } else if (q.includes('去年') || q.includes('昨年')) {
    period = 'last_year';
  } else if (q.includes('最近')) {
    period = 'this_week';
  }

  // 来週の予定の特殊処理
  if (q.includes('来週')) {
    period = 'custom';
    const nextWeekStart = new Date(now);
    const day = nextWeekStart.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    nextWeekStart.setDate(nextWeekStart.getDate() + diff);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
    return {
      category,
      period,
      periodStart: nextWeekStart.toISOString().split('T')[0],
      periodEnd: nextWeekEnd.toISOString().split('T')[0],
      aggregation: 'list',
      showChart: false,
      originalQuery: query,
    };
  }

  // 集計タイプ判定
  let aggregation: AggregationType = 'sum';
  if (q.includes('推移') || q.includes('変化') || q.includes('グラフ') || q.includes('チャート')) {
    aggregation = 'trend';
  } else if (q.includes('平均')) {
    aggregation = 'avg';
  } else if (q.includes('何件') || q.includes('何冊') || q.includes('いくつ') || q.includes('何回')) {
    aggregation = 'count';
  } else if (q.includes('一覧') || q.includes('リスト') || q.includes('どんな')) {
    aggregation = 'list';
  }

  // グラフ表示判定
  const showChart =
    q.includes('推移') ||
    q.includes('グラフ') ||
    q.includes('チャート') ||
    q.includes('見せて') ||
    aggregation === 'trend';

  // サブカテゴリ抽出
  let subCategory: string | undefined;
  if (category === 'finance') {
    const categories = ['食費', '外食', '交通費', '日用品', '娯楽', '医療', '教育', '美容', '衣服', '住居', '通信'];
    for (const cat of categories) {
      if (q.includes(cat)) {
        subCategory = cat;
        break;
      }
    }
  }

  return {
    category,
    period,
    aggregation,
    subCategory,
    showChart,
    originalQuery: query,
  };
}

// ============================
// Data Fetching Functions
// ============================

/**
 * 家計データを取得
 */
async function fetchFinanceData(
  userId: string,
  start: string,
  end: string,
  subCategory?: string
): Promise<QueryData> {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (subCategory) {
    query = query.eq('category', subCategory);
  }

  const { data, error } = await query;
  if (error) throw error;

  const transactions = (data ?? []) as Transaction[];

  // 集計
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  // カテゴリ別内訳
  const byCategory: Record<string, number> = {};
  for (const t of transactions) {
    const cat = t.category ?? 'その他';
    byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
  }
  const breakdown = Object.entries(byCategory)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // 日別推移
  const byDate: Record<string, number> = {};
  for (const t of transactions) {
    byDate[t.date] = (byDate[t.date] ?? 0) + t.amount;
  }
  const trend = Object.entries(byDate)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    category: 'finance',
    records: transactions,
    summary: {
      total,
      count: transactions.length,
      breakdown,
      trend,
    },
  };
}

/**
 * 睡眠データを取得
 */
async function fetchSleepData(userId: string, start: string, end: string): Promise<QueryData> {
  const { data, error } = await supabase
    .from('health_sleep')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (error) throw error;

  const sleepRecords = (data ?? []) as HealthSleep[];

  // 睡眠時間を計算
  const durations = sleepRecords
    .filter((r) => r.sleep_at && r.wake_at)
    .map((r) => {
      const sleepTime = new Date(r.sleep_at!);
      const wakeTime = new Date(r.wake_at!);
      const durationHours = (wakeTime.getTime() - sleepTime.getTime()) / (1000 * 60 * 60);
      return { date: r.date, value: Math.round(durationHours * 10) / 10 };
    });

  const total = durations.reduce((sum, d) => sum + d.value, 0);
  const average = durations.length > 0 ? total / durations.length : 0;

  return {
    category: 'sleep',
    records: sleepRecords,
    summary: {
      total: Math.round(total * 10) / 10,
      average: Math.round(average * 10) / 10,
      count: sleepRecords.length,
      trend: durations,
    },
  };
}

/**
 * 体重データを取得
 */
async function fetchWeightData(userId: string, start: string, end: string): Promise<QueryData> {
  const { data, error } = await supabase
    .from('health_weight')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });

  if (error) throw error;

  const weightRecords = (data ?? []) as HealthWeight[];
  const weights = weightRecords.map((r) => r.weight);
  const trend = weightRecords.map((r) => ({ date: r.date, value: r.weight }));

  return {
    category: 'weight',
    records: weightRecords,
    summary: {
      average: weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0,
      count: weightRecords.length,
      trend,
    },
  };
}

/**
 * 予定データを取得
 */
async function fetchEventsData(userId: string, start: string, end: string): Promise<QueryData> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .or(`start_at.gte.${start}T00:00:00,start_at.lte.${end}T23:59:59`)
    .order('start_at', { ascending: true });

  if (error) throw error;

  const events = (data ?? []) as Event[];

  return {
    category: 'events',
    records: events,
    summary: {
      count: events.length,
    },
  };
}

/**
 * タスクデータを取得
 */
async function fetchTasksData(userId: string, start: string, end: string): Promise<QueryData> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .or(`due_date.gte.${start},due_date.lte.${end}`)
    .order('due_date', { ascending: true });

  if (error) throw error;

  const tasks = (data ?? []) as Task[];
  const completed = tasks.filter((t) => t.completed).length;

  return {
    category: 'tasks',
    records: tasks,
    summary: {
      count: tasks.length,
      total: completed, // 完了数
    },
  };
}

/**
 * 運動データを取得
 */
async function fetchExerciseData(userId: string, start: string, end: string): Promise<QueryData> {
  const { data, error } = await supabase
    .from('health_exercise')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (error) throw error;

  const exerciseRecords = (data ?? []) as HealthExercise[];
  const totalMinutes = exerciseRecords.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  const totalKm = exerciseRecords.reduce((sum, e) => sum + (e.distance_km ?? 0), 0);

  // 種類別内訳
  const byType: Record<string, number> = {};
  for (const e of exerciseRecords) {
    byType[e.exercise_type] = (byType[e.exercise_type] ?? 0) + (e.duration_minutes ?? 0);
  }
  const breakdown = Object.entries(byType)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return {
    category: 'exercise',
    records: exerciseRecords,
    summary: {
      total: totalMinutes,
      count: exerciseRecords.length,
      average: exerciseRecords.length > 0 ? totalMinutes / exerciseRecords.length : 0,
      breakdown,
    },
  };
}

/**
 * 食事データを取得
 */
async function fetchMealsData(userId: string, start: string, end: string): Promise<QueryData> {
  const { data, error } = await supabase
    .from('health_meals')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (error) throw error;

  const mealRecords = (data ?? []) as HealthMeal[];
  const totalCalories = mealRecords.reduce((sum, m) => sum + (m.calories ?? 0), 0);

  // 日別推移
  const byDate: Record<string, number> = {};
  for (const m of mealRecords) {
    byDate[m.date] = (byDate[m.date] ?? 0) + (m.calories ?? 0);
  }
  const trend = Object.entries(byDate)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    category: 'meals',
    records: mealRecords,
    summary: {
      total: totalCalories,
      count: mealRecords.length,
      average: trend.length > 0 ? totalCalories / trend.length : 0,
      trend,
    },
  };
}

/**
 * 水分データを取得
 */
async function fetchWaterData(userId: string, start: string, end: string): Promise<QueryData> {
  const { data, error } = await supabase
    .from('health_water')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (error) throw error;

  const waterRecords = (data ?? []) as HealthWater[];
  const totalMl = waterRecords.reduce((sum, w) => sum + w.amount_ml, 0);

  // 日別推移
  const byDate: Record<string, number> = {};
  for (const w of waterRecords) {
    byDate[w.date] = (byDate[w.date] ?? 0) + w.amount_ml;
  }
  const trend = Object.entries(byDate)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    category: 'water',
    records: waterRecords,
    summary: {
      total: totalMl,
      count: waterRecords.length,
      average: trend.length > 0 ? totalMl / trend.length : 0,
      trend,
    },
  };
}

/**
 * 読書データを取得（booksテーブル）
 */
async function fetchBooksData(userId: string, start: string, end: string): Promise<QueryData> {
  // booksテーブルがない場合のフォールバック
  try {
    const { data, error } = await supabase
      .from('books' as 'transactions') // 型回避
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const records = data ?? [];

    return {
      category: 'books',
      records,
      summary: {
        count: records.length,
      },
    };
  } catch {
    // テーブルが存在しない場合
    return {
      category: 'books',
      records: [],
      summary: { count: 0 },
    };
  }
}

/**
 * 映画データを取得
 */
async function fetchMoviesData(userId: string, start: string, end: string): Promise<QueryData> {
  try {
    const { data, error } = await supabase
      .from('movies' as 'transactions') // 型回避
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const records = data ?? [];

    return {
      category: 'movies',
      records,
      summary: {
        count: records.length,
      },
    };
  } catch {
    return {
      category: 'movies',
      records: [],
      summary: { count: 0 },
    };
  }
}

// ============================
// Response Generation
// ============================

/**
 * フォーマットユーティリティ
 */
function formatNumber(num: number): string {
  return num.toLocaleString('ja-JP');
}

function formatCurrency(num: number): string {
  return `¥${formatNumber(num)}`;
}

function formatPeriodName(period: TimePeriod): string {
  const names: Record<TimePeriod, string> = {
    today: '今日',
    yesterday: '昨日',
    this_week: '今週',
    last_week: '先週',
    this_month: '今月',
    last_month: '先月',
    this_year: '今年',
    last_year: '去年',
    custom: 'この期間',
  };
  return names[period];
}

/**
 * データを元に自然な回答を生成
 */
function generateLocalResponse(intent: QueryIntent, data: QueryData): string {
  const periodName = formatPeriodName(intent.period);

  switch (data.category) {
    case 'finance': {
      const { total = 0, breakdown = [] } = data.summary ?? {};
      if (total === 0) {
        return `${periodName}の支出は0円だよ！節約できてるね💰✨`;
      }
      let response = `${periodName}の支出は${formatCurrency(total)}だよ💰`;
      if (breakdown.length > 0) {
        const top = breakdown[0];
        response += ` ${top.label}が一番多くて${formatCurrency(top.value)}`;
      }
      return response;
    }

    case 'sleep': {
      const { average = 0, count = 0 } = data.summary ?? {};
      if (count === 0) {
        return `${periodName}の睡眠記録がないみたい😴 記録してね！`;
      }
      let response = `${periodName}の平均睡眠は${average.toFixed(1)}時間`;
      if (average < 6) {
        response += '。ちょっと少ないかも😴 もう少し寝よう！';
      } else if (average < 7) {
        response += '。まあまあかな🦤';
      } else {
        response += '。いい感じ！✨';
      }
      return response;
    }

    case 'weight': {
      const { trend = [], count = 0 } = data.summary ?? {};
      if (count === 0) {
        return `${periodName}の体重記録がないみたい⚖️ 記録してね！`;
      }
      const latest = trend[trend.length - 1];
      const first = trend[0];
      let response = `${periodName}の体重記録は${count}件📊`;
      if (trend.length >= 2) {
        const diff = latest.value - first.value;
        const sign = diff >= 0 ? '+' : '';
        response += ` 最新${latest.value}kg（${sign}${diff.toFixed(1)}kg）`;
      } else {
        response += ` 最新${latest.value}kg`;
      }
      return response;
    }

    case 'events': {
      const { count = 0 } = data.summary ?? {};
      const events = data.records as { title: string; start_at: string | null }[];
      if (count === 0) {
        return `${periodName}の予定はないよ📅 ゆっくりできるね！`;
      }
      let response = `${periodName}の予定は${count}件あるよ📅\n`;
      const eventList = events.slice(0, 5).map((e) => {
        const date = e.start_at ? new Date(e.start_at) : null;
        const dateStr = date
          ? `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
          : '';
        return `・${dateStr} ${e.title}`;
      });
      response += eventList.join('\n');
      if (count > 5) {
        response += `\n...他${count - 5}件`;
      }
      return response;
    }

    case 'tasks': {
      const tasks = data.records as { title: string; completed: boolean }[];
      const total = tasks.length;
      const completed = tasks.filter((t) => t.completed).length;
      if (total === 0) {
        return `${periodName}のタスクはないよ✅`;
      }
      let response = `${periodName}のタスクは${total}件（完了${completed}件）✅\n`;
      const pending = tasks.filter((t) => !t.completed).slice(0, 5);
      if (pending.length > 0) {
        response += '残りのタスク:\n';
        response += pending.map((t) => `・${t.title}`).join('\n');
      }
      return response;
    }

    case 'exercise': {
      const { total = 0, count = 0, breakdown = [] } = data.summary ?? {};
      if (count === 0) {
        return `${periodName}の運動記録がないみたい💪 体動かそう！`;
      }
      let response = `${periodName}は${count}回運動したね💪 合計${total}分！`;
      if (breakdown.length > 0) {
        response += ` ${breakdown[0].label}が多いね`;
      }
      return response;
    }

    case 'meals': {
      const { total = 0, average = 0, count = 0 } = data.summary ?? {};
      if (count === 0) {
        return `${periodName}の食事記録がないみたい🍽️`;
      }
      return `${periodName}の摂取カロリーは合計${formatNumber(total)}kcal🍽️ 1日平均${formatNumber(Math.round(average))}kcal`;
    }

    case 'water': {
      const { total = 0, average = 0 } = data.summary ?? {};
      if (total === 0) {
        return `${periodName}の水分記録がないみたい💧 水飲んでね！`;
      }
      const liters = (total / 1000).toFixed(1);
      const avgLiters = (average / 1000).toFixed(1);
      return `${periodName}の水分摂取は合計${liters}L💧 1日平均${avgLiters}L`;
    }

    case 'books': {
      const { count = 0 } = data.summary ?? {};
      const books = data.records as { title: string; author?: string }[];
      if (count === 0) {
        return `${periodName}は読了した本がないみたい📚 何か読んでみる？`;
      }
      let response = `${periodName}は${count}冊読了！📚\n`;
      response += books.map((b) => `・『${b.title}』${b.author ? ` ${b.author}` : ''}`).join('\n');
      return response;
    }

    case 'movies': {
      const { count = 0 } = data.summary ?? {};
      const movies = data.records as { title: string; rating?: number }[];
      if (count === 0) {
        return `${periodName}は観た映画がないみたい🎬`;
      }
      let response = `${periodName}は${count}本観たね🎬\n`;
      response += movies.map((m) => `・『${m.title}』${m.rating ? ` ★${m.rating}` : ''}`).join('\n');
      return response;
    }

    default:
      return 'ごめん、その質問はちょっとわからなかった🦤💦 もう少し詳しく教えてくれる？';
  }
}

// ============================
// AI-Powered Query Processing (Edge Function)
// ============================

/**
 * Edge Functionを使用したAI強化版クエリ処理
 * より高度な意図解析と自然な回答生成を行う
 */
export async function processNaturalQueryAI(query: string): Promise<NaturalQueryResult> {
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;

  if (!accessToken) {
    throw new Error('認証が必要です');
  }

  const response = await fetch(QUERY_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'クエリ処理に失敗しました');
  }

  return await response.json();
}

// ============================
// Main Query Processing
// ============================

/**
 * 自然言語クエリを処理してデータを取得・回答を生成
 * @param query ユーザーの質問
 * @param useAI AI強化版を使用するか（デフォルト: false = ローカル処理）
 */
export async function processNaturalQuery(
  query: string,
  useAI = false
): Promise<NaturalQueryResult> {
  // AI強化版を使用する場合はEdge Functionを呼び出す
  if (useAI && QUERY_FUNCTION_URL) {
    try {
      return await processNaturalQueryAI(query);
    } catch (error) {
      console.warn('AI query failed, falling back to local:', error);
      // フォールバックとしてローカル処理を継続
    }
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('認証が必要です');
  }

  // 1. クエリ意図を解析
  const intent = analyzeQueryIntentLocal(query);

  // 2. 期間を取得
  let start: string, end: string;
  if (intent.period === 'custom' && intent.periodStart && intent.periodEnd) {
    start = intent.periodStart;
    end = intent.periodEnd;
  } else {
    const range = getDateRange(intent.period);
    start = range.start;
    end = range.end;
  }

  // 3. カテゴリに応じてデータを取得
  let data: QueryData;

  switch (intent.category) {
    case 'finance':
      data = await fetchFinanceData(user.id, start, end, intent.subCategory);
      break;
    case 'sleep':
      data = await fetchSleepData(user.id, start, end);
      break;
    case 'weight':
      data = await fetchWeightData(user.id, start, end);
      break;
    case 'events':
      data = await fetchEventsData(user.id, start, end);
      break;
    case 'tasks':
      data = await fetchTasksData(user.id, start, end);
      break;
    case 'exercise':
      data = await fetchExerciseData(user.id, start, end);
      break;
    case 'meals':
      data = await fetchMealsData(user.id, start, end);
      break;
    case 'water':
      data = await fetchWaterData(user.id, start, end);
      break;
    case 'books':
      data = await fetchBooksData(user.id, start, end);
      break;
    case 'movies':
      data = await fetchMoviesData(user.id, start, end);
      break;
    default:
      // 一般的な質問の場合、複数カテゴリから情報を集める
      data = {
        category: 'general',
        records: [],
        summary: {},
      };
  }

  // 4. 回答を生成
  const response = generateLocalResponse(intent, data);

  // 5. グラフデータを準備
  let chartData: NaturalQueryResult['chartData'];
  if (intent.showChart && data.summary?.trend) {
    const trend = data.summary.trend;
    chartData = {
      type: 'line',
      labels: trend.map((t) => {
        const d = new Date(t.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      values: trend.map((t) => t.value),
    };
  } else if (intent.showChart && data.summary?.breakdown) {
    const breakdown = data.summary.breakdown;
    chartData = {
      type: 'pie',
      labels: breakdown.map((b) => b.label),
      values: breakdown.map((b) => b.value),
    };
  }

  return {
    response,
    data,
    showChart: intent.showChart,
    chartData,
  };
}

/**
 * クエリが自然言語クエリかどうかを判定
 * 記録系の入力と区別するために使用
 */
export function isNaturalQuery(input: string): boolean {
  const queryIndicators = [
    // 疑問詞
    'いくら',
    'どのくらい',
    'どれくらい',
    'どれだけ',
    'いつ',
    'どこ',
    'なに',
    '何',
    // 質問系語尾
    '？',
    '?',
    'かな',
    'だろう',
    'でしょう',
    // 要求系
    '教えて',
    '見せて',
    '確認',
    'チェック',
    '知りたい',
    // 過去形+疑問
    'だった',
    'した',
    'できた',
    // 推移・統計系
    '推移',
    '変化',
    '平均',
    '合計',
    '一覧',
    'リスト',
  ];

  const lowerInput = input.toLowerCase();
  return queryIndicators.some((indicator) => lowerInput.includes(indicator));
}

// ============================
// Exports
// ============================

export default {
  processNaturalQuery,
  isNaturalQuery,
};
