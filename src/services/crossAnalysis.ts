/**
 * DoDo Life - クロス分析インサイトサービス
 * 複数ミニアプリのデータを横断分析してインサイトを生成
 */

import { supabase } from '../lib/supabase';
import type {
  Transaction,
  HealthSleep,
  HealthExercise,
  HealthMeal,
  HealthWeight,
  HealthWater,
  Task,
} from '../types/database';

// ============================
// 型定義
// ============================

interface DailyData {
  date: string;
  sleep?: {
    durationHours: number;
    quality: number | null;
  };
  exercise?: {
    totalMinutes: number;
    types: string[];
  };
  meals?: {
    totalCalories: number;
    eatingOutCount: number;
    mealCount: number;
  };
  weight?: number;
  waterMl?: number;
  spending?: {
    total: number;
    categories: Record<string, number>;
  };
  tasksCompleted?: number;
}

interface WeeklyData {
  weekStart: string;
  weekEnd: string;
  days: DailyData[];
}

interface Insight {
  id: string;
  type: InsightType;
  message: string;
  emoji: string;
  dataPoints: string[];
  confidence: number; // 0-1
  generatedAt: string;
}

type InsightType =
  | 'sleep_spending'
  | 'exercise_sleep'
  | 'eating_out_weight'
  | 'monthly_spending_pattern'
  | 'water_productivity'
  | 'exercise_mood'
  | 'sleep_tasks'
  | 'general';

interface CorrelationResult {
  type: InsightType;
  found: boolean;
  description: string;
  dataPoints: string[];
  strength: number; // 相関の強さ 0-1
}

// ============================
// データ収集
// ============================

/**
 * 指定期間の日別データを収集
 */
async function collectDailyData(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyData[]> {
  // 全データを並列取得
  const [sleepData, exerciseData, mealData, weightData, waterData, transactionData, taskData] =
    await Promise.all([
      supabase
        .from('health_sleep')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('health_exercise')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('health_meals')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('health_weight')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('health_water')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', startDate)
        .lte('completed_at', endDate),
    ]);

  // 日付リストを生成
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  // データを型付きでキャスト
  const sleepList = (sleepData.data ?? []) as HealthSleep[];
  const exerciseList = (exerciseData.data ?? []) as HealthExercise[];
  const mealList = (mealData.data ?? []) as HealthMeal[];
  const weightList = (weightData.data ?? []) as HealthWeight[];
  const waterList = (waterData.data ?? []) as HealthWater[];
  const transactionList = (transactionData.data ?? []) as Transaction[];
  const taskList = (taskData.data ?? []) as Task[];

  // 日別に集約
  return dates.map((date) => {
    const dailyData: DailyData = { date };

    // 睡眠
    const sleepRecords = sleepList.filter((s) => s.date === date);
    if (sleepRecords.length > 0) {
      const record = sleepRecords[0];
      const sleepTime = new Date(record.sleep_at);
      const wakeTime = new Date(record.wake_at);
      const durationMs = wakeTime.getTime() - sleepTime.getTime();
      dailyData.sleep = {
        durationHours: durationMs / (1000 * 60 * 60),
        quality: record.quality,
      };
    }

    // 運動
    const exerciseRecords = exerciseList.filter((e) => e.date === date);
    if (exerciseRecords.length > 0) {
      const uniqueTypes = Array.from(new Set(exerciseRecords.map((e) => e.exercise_type)));
      dailyData.exercise = {
        totalMinutes: exerciseRecords.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0),
        types: uniqueTypes,
      };
    }

    // 食事
    const mealRecords = mealList.filter((m) => m.date === date);
    if (mealRecords.length > 0) {
      dailyData.meals = {
        totalCalories: mealRecords.reduce((sum, m) => sum + (m.calories ?? 0), 0),
        eatingOutCount: mealRecords.filter(
          (m) => m.description?.includes('外食') || m.description?.includes('レストラン')
        ).length,
        mealCount: mealRecords.length,
      };
    }

    // 体重
    const weightRecords = weightList.filter((w) => w.date === date);
    if (weightRecords.length > 0) {
      dailyData.weight = weightRecords[0].weight;
    }

    // 水分
    const waterRecords = waterList.filter((w) => w.date === date);
    if (waterRecords.length > 0) {
      dailyData.waterMl = waterRecords.reduce((sum, w) => sum + w.amount_ml, 0);
    }

    // 支出
    const spendingRecords = transactionList.filter((t) => t.date === date);
    if (spendingRecords.length > 0) {
      const categories: Record<string, number> = {};
      spendingRecords.forEach((t) => {
        const cat = t.category ?? 'その他';
        categories[cat] = (categories[cat] ?? 0) + t.amount;
      });
      dailyData.spending = {
        total: spendingRecords.reduce((sum, t) => sum + t.amount, 0),
        categories,
      };
    }

    // タスク完了数
    const taskRecords = taskList.filter((t) => t.completed_at?.startsWith(date));
    dailyData.tasksCompleted = taskRecords.length;

    return dailyData;
  });
}

/**
 * 週別データを取得
 */
async function collectWeeklyData(userId: string, weeks: number = 4): Promise<WeeklyData[]> {
  const weeklyData: WeeklyData[] = [];
  const now = new Date();

  for (let i = 0; i < weeks; i++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const days = await collectDailyData(
      userId,
      weekStart.toISOString().split('T')[0],
      weekEnd.toISOString().split('T')[0]
    );

    weeklyData.push({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      days,
    });
  }

  return weeklyData;
}

// ============================
// 相関分析
// ============================

/**
 * 睡眠と翌日の支出の相関を分析
 */
function analyzeSleepSpendingCorrelation(days: DailyData[]): CorrelationResult {
  const pairs: { sleepHours: number; nextDaySpending: number }[] = [];

  for (let i = 0; i < days.length - 1; i++) {
    const today = days[i];
    const tomorrow = days[i + 1];

    if (today.sleep && tomorrow.spending) {
      pairs.push({
        sleepHours: today.sleep.durationHours,
        nextDaySpending: tomorrow.spending.total,
      });
    }
  }

  if (pairs.length < 5) {
    return {
      type: 'sleep_spending',
      found: false,
      description: '',
      dataPoints: [],
      strength: 0,
    };
  }

  // 睡眠6時間未満 vs 6時間以上の支出を比較
  const shortSleep = pairs.filter((p) => p.sleepHours < 6);
  const normalSleep = pairs.filter((p) => p.sleepHours >= 6);

  if (shortSleep.length < 2 || normalSleep.length < 2) {
    return {
      type: 'sleep_spending',
      found: false,
      description: '',
      dataPoints: [],
      strength: 0,
    };
  }

  const avgShortSleepSpending = shortSleep.reduce((s, p) => s + p.nextDaySpending, 0) / shortSleep.length;
  const avgNormalSleepSpending = normalSleep.reduce((s, p) => s + p.nextDaySpending, 0) / normalSleep.length;

  const percentDiff = ((avgShortSleepSpending - avgNormalSleepSpending) / avgNormalSleepSpending) * 100;

  if (percentDiff > 15) {
    return {
      type: 'sleep_spending',
      found: true,
      description: `睡眠6時間未満の日は翌日の支出が${Math.round(percentDiff)}%多い`,
      dataPoints: [
        `短睡眠時の翌日平均支出: ¥${Math.round(avgShortSleepSpending).toLocaleString()}`,
        `通常睡眠時の翌日平均支出: ¥${Math.round(avgNormalSleepSpending).toLocaleString()}`,
        `サンプル数: ${pairs.length}日`,
      ],
      strength: Math.min(percentDiff / 50, 1),
    };
  }

  return {
    type: 'sleep_spending',
    found: false,
    description: '',
    dataPoints: [],
    strength: 0,
  };
}

/**
 * 運動と睡眠の質の相関を分析
 */
function analyzeExerciseSleepCorrelation(days: DailyData[]): CorrelationResult {
  const exerciseDays: number[] = [];
  const noExerciseDays: number[] = [];

  for (let i = 0; i < days.length - 1; i++) {
    const today = days[i];
    const tonight = days[i + 1]; // 翌日の睡眠データ = 当日夜の睡眠

    if (tonight.sleep?.quality) {
      if (today.exercise && today.exercise.totalMinutes >= 20) {
        exerciseDays.push(tonight.sleep.quality);
      } else {
        noExerciseDays.push(tonight.sleep.quality);
      }
    }
  }

  if (exerciseDays.length < 3 || noExerciseDays.length < 3) {
    return {
      type: 'exercise_sleep',
      found: false,
      description: '',
      dataPoints: [],
      strength: 0,
    };
  }

  const avgExerciseSleep = exerciseDays.reduce((s, q) => s + q, 0) / exerciseDays.length;
  const avgNoExerciseSleep = noExerciseDays.reduce((s, q) => s + q, 0) / noExerciseDays.length;

  if (avgExerciseSleep > avgNoExerciseSleep + 0.3) {
    return {
      type: 'exercise_sleep',
      found: true,
      description: '運動した日は睡眠の質が良い傾向',
      dataPoints: [
        `運動日の平均睡眠スコア: ${avgExerciseSleep.toFixed(1)}/5`,
        `非運動日の平均睡眠スコア: ${avgNoExerciseSleep.toFixed(1)}/5`,
        `運動日: ${exerciseDays.length}日、非運動日: ${noExerciseDays.length}日`,
      ],
      strength: Math.min((avgExerciseSleep - avgNoExerciseSleep) / 2, 1),
    };
  }

  return {
    type: 'exercise_sleep',
    found: false,
    description: '',
    dataPoints: [],
    strength: 0,
  };
}

/**
 * 外食と体重の相関を分析
 */
function analyzeEatingOutWeightCorrelation(weeklyData: WeeklyData[]): CorrelationResult {
  const weekStats: { eatingOutCount: number; weightChange: number }[] = [];

  for (const week of weeklyData) {
    const eatingOutCount = week.days.reduce((sum, d) => sum + (d.meals?.eatingOutCount ?? 0), 0);
    const weights = week.days.filter((d) => d.weight).map((d) => d.weight!);

    if (weights.length >= 2) {
      const firstWeight = weights[0];
      const lastWeight = weights[weights.length - 1];
      weekStats.push({
        eatingOutCount,
        weightChange: lastWeight - firstWeight,
      });
    }
  }

  if (weekStats.length < 2) {
    return {
      type: 'eating_out_weight',
      found: false,
      description: '',
      dataPoints: [],
      strength: 0,
    };
  }

  // 外食が多い週（3回以上）vs 少ない週を比較
  const highEatingOut = weekStats.filter((w) => w.eatingOutCount >= 3);
  const lowEatingOut = weekStats.filter((w) => w.eatingOutCount < 3);

  if (highEatingOut.length < 1 || lowEatingOut.length < 1) {
    return {
      type: 'eating_out_weight',
      found: false,
      description: '',
      dataPoints: [],
      strength: 0,
    };
  }

  const avgHighChange = highEatingOut.reduce((s, w) => s + w.weightChange, 0) / highEatingOut.length;
  const avgLowChange = lowEatingOut.reduce((s, w) => s + w.weightChange, 0) / lowEatingOut.length;

  if (avgHighChange > avgLowChange + 0.2) {
    return {
      type: 'eating_out_weight',
      found: true,
      description: '外食が多い週は体重が増える傾向',
      dataPoints: [
        `外食多い週の体重変化: +${avgHighChange.toFixed(1)}kg`,
        `外食少ない週の体重変化: ${avgLowChange >= 0 ? '+' : ''}${avgLowChange.toFixed(1)}kg`,
        `分析週数: ${weekStats.length}週`,
      ],
      strength: Math.min((avgHighChange - avgLowChange) / 1, 1),
    };
  }

  return {
    type: 'eating_out_weight',
    found: false,
    description: '',
    dataPoints: [],
    strength: 0,
  };
}

/**
 * 月末の支出パターンを分析
 */
function analyzeMonthlySpendingPattern(days: DailyData[]): CorrelationResult {
  // 日付を月初・月中・月末に分類
  const earlyMonth: number[] = []; // 1-10日
  const midMonth: number[] = []; // 11-20日
  const lateMonth: number[] = []; // 21-31日

  for (const day of days) {
    if (!day.spending) continue;

    const dayOfMonth = parseInt(day.date.split('-')[2], 10);

    if (dayOfMonth <= 10) {
      earlyMonth.push(day.spending.total);
    } else if (dayOfMonth <= 20) {
      midMonth.push(day.spending.total);
    } else {
      lateMonth.push(day.spending.total);
    }
  }

  if (earlyMonth.length < 3 || midMonth.length < 3 || lateMonth.length < 3) {
    return {
      type: 'monthly_spending_pattern',
      found: false,
      description: '',
      dataPoints: [],
      strength: 0,
    };
  }

  const avgEarly = earlyMonth.reduce((s, v) => s + v, 0) / earlyMonth.length;
  const avgMid = midMonth.reduce((s, v) => s + v, 0) / midMonth.length;
  const avgLate = lateMonth.reduce((s, v) => s + v, 0) / lateMonth.length;

  const maxAvg = Math.max(avgEarly, avgMid, avgLate);
  const minAvg = Math.min(avgEarly, avgMid, avgLate);

  if (avgLate === maxAvg && avgLate > avgEarly * 1.3) {
    return {
      type: 'monthly_spending_pattern',
      found: true,
      description: '月末に支出が集中する傾向',
      dataPoints: [
        `月初(1-10日)平均: ¥${Math.round(avgEarly).toLocaleString()}`,
        `月中(11-20日)平均: ¥${Math.round(avgMid).toLocaleString()}`,
        `月末(21-31日)平均: ¥${Math.round(avgLate).toLocaleString()}`,
      ],
      strength: Math.min((avgLate - avgEarly) / avgEarly, 1),
    };
  }

  return {
    type: 'monthly_spending_pattern',
    found: false,
    description: '',
    dataPoints: [],
    strength: 0,
  };
}

/**
 * 水分摂取とタスク完了の相関を分析
 */
function analyzeWaterProductivityCorrelation(days: DailyData[]): CorrelationResult {
  const highWaterDays: number[] = []; // 1500ml以上
  const lowWaterDays: number[] = []; // 1500ml未満

  for (const day of days) {
    if (day.waterMl !== undefined && day.tasksCompleted !== undefined) {
      if (day.waterMl >= 1500) {
        highWaterDays.push(day.tasksCompleted);
      } else {
        lowWaterDays.push(day.tasksCompleted);
      }
    }
  }

  if (highWaterDays.length < 3 || lowWaterDays.length < 3) {
    return {
      type: 'water_productivity',
      found: false,
      description: '',
      dataPoints: [],
      strength: 0,
    };
  }

  const avgHighWater = highWaterDays.reduce((s, t) => s + t, 0) / highWaterDays.length;
  const avgLowWater = lowWaterDays.reduce((s, t) => s + t, 0) / lowWaterDays.length;

  if (avgHighWater > avgLowWater * 1.2 && avgLowWater > 0) {
    return {
      type: 'water_productivity',
      found: true,
      description: '水分をしっかり取ると生産性が上がる傾向',
      dataPoints: [
        `水分1.5L以上の日のタスク完了数: ${avgHighWater.toFixed(1)}件`,
        `水分1.5L未満の日のタスク完了数: ${avgLowWater.toFixed(1)}件`,
        `高水分日: ${highWaterDays.length}日、低水分日: ${lowWaterDays.length}日`,
      ],
      strength: Math.min((avgHighWater - avgLowWater) / avgLowWater, 1),
    };
  }

  return {
    type: 'water_productivity',
    found: false,
    description: '',
    dataPoints: [],
    strength: 0,
  };
}

// ============================
// Claude API連携
// ============================

const INSIGHT_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-insight`
  : '';

/**
 * Claude APIでインサイトメッセージを生成
 */
async function generateInsightMessage(
  correlations: CorrelationResult[],
  accessToken: string
): Promise<Insight[]> {
  const foundCorrelations = correlations.filter((c) => c.found);

  if (foundCorrelations.length === 0) {
    return [];
  }

  // Edge Functionを呼び出し
  const response = await fetch(INSIGHT_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      correlations: foundCorrelations,
    }),
  });

  if (!response.ok) {
    // フォールバック: ローカルでメッセージ生成
    return generateLocalInsights(foundCorrelations);
  }

  const result = await response.json();
  return result.insights;
}

/**
 * ローカルでインサイトメッセージを生成（フォールバック）
 */
function generateLocalInsights(correlations: CorrelationResult[]): Insight[] {
  const insightTemplates: Record<InsightType, { emoji: string; templates: string[] }> = {
    sleep_spending: {
      emoji: '💤💰',
      templates: [
        '睡眠が6時間未満の日は、翌日の支出が{percent}%増える傾向があるよ💤💰 しっかり寝てお財布も守ろう！',
        'ちょっと面白い発見！睡眠不足の翌日は{percent}%も多く使っちゃうみたい💤💰 睡眠は節約の味方だね！',
      ],
    },
    exercise_sleep: {
      emoji: '🏃😴',
      templates: [
        '運動した日は睡眠の質が良いみたい🏃😴 体を動かすと夜もぐっすりだね！',
        '発見！運動すると睡眠スコアがアップ🏃😴 今日も少し体を動かしてみない？',
      ],
    },
    eating_out_weight: {
      emoji: '🍽️⚖️',
      templates: [
        '外食が多い週は体重が増えてるね🍽️⚖️ たまには自炊も楽しいよ！',
        '気づいたことが！外食週は体重が上がりがち🍽️⚖️ バランス大事にしようね！',
      ],
    },
    monthly_spending_pattern: {
      emoji: '💰📅',
      templates: [
        '月末に支出が集中してるよ💰📅 計画的に使うともっと安心かも！',
        '発見！月末に財布のヒモが緩みがち💰📅 月初から少しずつ使うのもアリかも？',
      ],
    },
    water_productivity: {
      emoji: '💧✅',
      templates: [
        '水分をしっかり取ると、タスクもはかどるみたい💧✅ 今日もこまめに水分補給しよう！',
        '興味深い発見！水を飲むと生産性アップ💧✅ デスクに水を置いておこう！',
      ],
    },
    exercise_mood: {
      emoji: '🏃😊',
      templates: ['運動すると気分もアップ！🏃😊 今日も少し体を動かしてみない？'],
    },
    sleep_tasks: {
      emoji: '😴✅',
      templates: ['しっかり寝た日はタスク完了数が多いね😴✅ 睡眠は生産性の源！'],
    },
    general: {
      emoji: '💡',
      templates: ['データから新しい発見があったよ💡'],
    },
  };

  return correlations.map((corr) => {
    const template = insightTemplates[corr.type] || insightTemplates.general;
    let message = template.templates[Math.floor(Math.random() * template.templates.length)];

    // プレースホルダー置換
    if (corr.type === 'sleep_spending') {
      const percentMatch = corr.description.match(/(\d+)%/);
      if (percentMatch) {
        message = message.replace('{percent}', percentMatch[1]);
      }
    }

    return {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: corr.type,
      message,
      emoji: template.emoji,
      dataPoints: corr.dataPoints,
      confidence: corr.strength,
      generatedAt: new Date().toISOString(),
    };
  });
}

// ============================
// メインAPI
// ============================

/**
 * ユーザーのクロス分析を実行
 */
export async function runCrossAnalysis(userId: string): Promise<Insight[]> {
  // 過去30日のデータを収集
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const dailyData = await collectDailyData(
    userId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  const weeklyData = await collectWeeklyData(userId, 4);

  // 各種相関分析を実行
  const correlations: CorrelationResult[] = [
    analyzeSleepSpendingCorrelation(dailyData),
    analyzeExerciseSleepCorrelation(dailyData),
    analyzeEatingOutWeightCorrelation(weeklyData),
    analyzeMonthlySpendingPattern(dailyData),
    analyzeWaterProductivityCorrelation(dailyData),
  ];

  // セッション取得
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;

  if (accessToken) {
    return generateInsightMessage(correlations, accessToken);
  } else {
    return generateLocalInsights(correlations.filter((c) => c.found));
  }
}

/**
 * インサイトをチャットに保存
 */
export async function saveInsightToChat(userId: string, insight: Insight): Promise<void> {
  const { error } = await supabase.from('chat_messages').insert({
    user_id: userId,
    role: 'assistant' as const,
    content: insight.message,
  });

  if (error) throw error;
}

/**
 * 最後のインサイト送信日時を取得
 */
export async function getLastInsightDate(userId: string): Promise<Date | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('user_id', userId)
    .eq('role', 'assistant')
    .like('content', '%💡%') // インサイトは絵文字を含む
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  const record = data[0] as { created_at: string };
  return new Date(record.created_at);
}

/**
 * インサイト送信が必要かチェック
 * 週1-2回（3-4日に1回）のペースで送信
 */
export async function shouldSendInsight(userId: string): Promise<boolean> {
  const lastInsight = await getLastInsightDate(userId);

  if (!lastInsight) {
    return true; // 初回
  }

  const daysSinceLastInsight = (Date.now() - lastInsight.getTime()) / (1000 * 60 * 60 * 24);

  // 3日以上経過していれば送信
  return daysSinceLastInsight >= 3;
}

/**
 * 定期インサイト送信（バックグラウンドジョブ用）
 */
export async function sendScheduledInsight(userId: string): Promise<Insight | null> {
  // 送信判定
  const shouldSend = await shouldSendInsight(userId);
  if (!shouldSend) {
    return null;
  }

  // 分析実行
  const insights = await runCrossAnalysis(userId);

  if (insights.length === 0) {
    return null;
  }

  // 最も信頼度の高いインサイトを選択
  const bestInsight = insights.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  );

  // チャットに保存
  await saveInsightToChat(userId, bestInsight);

  return bestInsight;
}

/**
 * 全ユーザーへのインサイト送信（バッチ処理用）
 */
export async function sendInsightsToAllUsers(): Promise<{ sent: number; skipped: number }> {
  const { data: users, error } = await supabase.from('users').select('id');

  if (error || !users) {
    throw new Error('ユーザー一覧の取得に失敗しました');
  }

  let sent = 0;
  let skipped = 0;

  const userList = users as Array<{ id: string }>;

  for (const user of userList) {
    try {
      const insight = await sendScheduledInsight(user.id);
      if (insight) {
        sent++;
      } else {
        skipped++;
      }
    } catch (e) {
      console.error(`User ${user.id} insight error:`, e);
      skipped++;
    }
  }

  return { sent, skipped };
}

// ============================
// エクスポート
// ============================

export type { Insight, InsightType, CorrelationResult, DailyData, WeeklyData };
