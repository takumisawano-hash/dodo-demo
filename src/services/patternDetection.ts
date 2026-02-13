/**
 * DoDo Life - パターン検出サービス
 * 長期データからユーザーの行動パターン・傾向を検出し、洞察と改善提案を提供
 */

import { supabase } from '../lib/supabase';
import type {
  Transaction,
  HealthWeight,
  HealthMeal,
  HealthExercise,
  HealthSleep,
} from '../types/database';

// ============================
// 型定義
// ============================

/** パターンのタイプ */
export type PatternType =
  | 'weekday_weight' // 曜日別体重パターン
  | 'weekday_spending' // 曜日別支出パターン
  | 'weekday_exercise' // 曜日別運動パターン
  | 'payday_spending' // 給料日後の支出パターン
  | 'late_meal_weight' // 遅い食事と体重の相関
  | 'sleep_weight' // 睡眠と体重の相関
  | 'category_trend' // カテゴリ別支出トレンド
  | 'exercise_consistency' // 運動の継続性
  | 'weight_trend'; // 体重トレンド

/** パターンの深刻度 */
export type PatternSeverity = 'positive' | 'neutral' | 'warning' | 'alert';

/** 検出されたパターン */
export interface DetectedPattern {
  type: PatternType;
  severity: PatternSeverity;
  title: string;
  description: string;
  insight: string;
  suggestion?: string; // ネガティブパターンへの改善提案
  data: Record<string, unknown>; // パターンの詳細データ
  confidence: number; // 0-1、信頼度
}

/** 月次レポート */
export interface MonthlyPatternReport {
  userId: string;
  month: string; // YYYY-MM
  generatedAt: string;
  summary: string;
  patterns: DetectedPattern[];
  highlights: string[]; // 特筆すべきポイント
  overallScore: number; // 0-100、総合スコア
}

/** ユーザー設定（給料日など） */
export interface UserPatternSettings {
  payday?: number; // 給料日（1-31）
  targetWeight?: number; // 目標体重
  monthlyBudget?: number; // 月間予算
}

// ============================
// データ取得関数
// ============================

const ANALYSIS_MONTHS = 3; // 分析対象の月数

/**
 * 分析期間の開始日を取得
 */
function getAnalysisStartDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - ANALYSIS_MONTHS);
  return date.toISOString().split('T')[0];
}

/**
 * 取引データを取得
 */
async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const startDate = getAnalysisStartDate();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * 体重データを取得
 */
async function fetchWeightData(userId: string): Promise<HealthWeight[]> {
  const startDate = getAnalysisStartDate();
  const { data, error } = await supabase
    .from('health_weight')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * 食事データを取得
 */
async function fetchMealData(userId: string): Promise<HealthMeal[]> {
  const startDate = getAnalysisStartDate();
  const { data, error } = await supabase
    .from('health_meals')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * 運動データを取得
 */
async function fetchExerciseData(userId: string): Promise<HealthExercise[]> {
  const startDate = getAnalysisStartDate();
  const { data, error } = await supabase
    .from('health_exercise')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * 睡眠データを取得
 */
async function fetchSleepData(userId: string): Promise<HealthSleep[]> {
  const startDate = getAnalysisStartDate();
  const { data, error } = await supabase
    .from('health_sleep')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ============================
// 統計ユーティリティ
// ============================

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 平均を計算
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 標準偏差を計算
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * 曜日別にグループ化
 */
function groupByWeekday<T extends { date: string }>(
  items: T[]
): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  for (let i = 0; i < 7; i++) groups.set(i, []);

  items.forEach((item) => {
    const weekday = new Date(item.date).getDay();
    groups.get(weekday)?.push(item);
  });

  return groups;
}

/**
 * 翌日のデータを取得
 */
function getNextDayData<T extends { date: string }>(
  items: T[],
  currentDate: string
): T | undefined {
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().split('T')[0];
  return items.find((item) => item.date === nextDateStr);
}

/**
 * 信頼度を計算（サンプル数に基づく）
 */
function calculateConfidence(sampleSize: number, minSamples = 5): number {
  if (sampleSize < minSamples) return 0;
  // 20サンプル以上で最大信頼度
  return Math.min(1, sampleSize / 20);
}

// ============================
// パターン検出関数
// ============================

/**
 * 曜日別体重パターンを検出
 * 例: 「毎週月曜に体重が増える傾向があるよ（週末の影響？）」
 */
function detectWeekdayWeightPattern(weights: HealthWeight[]): DetectedPattern | null {
  if (weights.length < 14) return null; // 最低2週間分

  // 日別の体重変化を計算
  const dailyChanges: { date: string; change: number; weekday: number }[] = [];
  for (let i = 1; i < weights.length; i++) {
    const prev = weights[i - 1];
    const curr = weights[i];
    // 連続した日のみ
    const prevDate = new Date(prev.date);
    const currDate = new Date(curr.date);
    const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      dailyChanges.push({
        date: curr.date,
        change: curr.weight - prev.weight,
        weekday: currDate.getDay(),
      });
    }
  }

  if (dailyChanges.length < 14) return null;

  // 曜日別に平均変化を計算
  const weekdayChanges = new Map<number, number[]>();
  for (let i = 0; i < 7; i++) weekdayChanges.set(i, []);

  dailyChanges.forEach((dc) => {
    weekdayChanges.get(dc.weekday)?.push(dc.change);
  });

  // 最も増加傾向の曜日を特定
  let maxIncreaseDay = -1;
  let maxIncrease = 0;
  const overallMean = mean(dailyChanges.map((dc) => dc.change));
  const overallStd = standardDeviation(dailyChanges.map((dc) => dc.change));

  weekdayChanges.forEach((changes, weekday) => {
    if (changes.length >= 2) {
      const avgChange = mean(changes);
      // 全体平均より0.5標準偏差以上多く増加している曜日
      if (avgChange > overallMean + overallStd * 0.5 && avgChange > maxIncrease) {
        maxIncrease = avgChange;
        maxIncreaseDay = weekday;
      }
    }
  });

  if (maxIncreaseDay === -1) return null;

  const samples = weekdayChanges.get(maxIncreaseDay)?.length ?? 0;
  const confidence = calculateConfidence(samples);

  if (confidence < 0.3) return null;

  // 前日が何曜日か
  const prevDay = maxIncreaseDay === 0 ? 6 : maxIncreaseDay - 1;
  const possibleCause =
    prevDay === 0 || prevDay === 6 ? '週末の影響？' : '前日の習慣を見直してみて';

  return {
    type: 'weekday_weight',
    severity: 'warning',
    title: `${WEEKDAYS_JA[maxIncreaseDay]}曜日に体重が増えやすい`,
    description: `${WEEKDAYS_JA[maxIncreaseDay]}曜日は平均 +${(maxIncrease * 1000).toFixed(0)}g の増加傾向`,
    insight: `毎週${WEEKDAYS_JA[maxIncreaseDay]}曜日に体重が増える傾向があるよ（${possibleCause}）`,
    suggestion: `${WEEKDAYS_JA[prevDay]}曜日の食事量や運動を見直してみて！土日に食べすぎてないかチェックしよう🍽️`,
    data: {
      peakDay: maxIncreaseDay,
      peakDayName: WEEKDAYS_JA[maxIncreaseDay],
      averageIncrease: maxIncrease,
      sampleCount: samples,
    },
    confidence,
  };
}

/**
 * 曜日別支出パターンを検出
 * 例: 「金曜日は支出が多い傾向」
 */
function detectWeekdaySpendingPattern(
  transactions: Transaction[]
): DetectedPattern | null {
  const expenses = transactions.filter((t) => t.type === 'expense');
  if (expenses.length < 14) return null;

  // 曜日別にグループ化
  const byWeekday = groupByWeekday(expenses);

  // 曜日別の平均支出を計算
  const weekdayAvg = new Map<number, number>();
  let totalExpense = 0;
  let totalCount = 0;

  byWeekday.forEach((txs, weekday) => {
    const total = txs.reduce((sum, t) => sum + t.amount, 0);
    weekdayAvg.set(weekday, txs.length > 0 ? total / txs.length : 0);
    totalExpense += total;
    totalCount += txs.length;
  });

  const overallAvg = totalCount > 0 ? totalExpense / totalCount : 0;

  // 最も支出が多い曜日を特定（平均の1.5倍以上）
  let maxSpendingDay = -1;
  let maxSpending = 0;

  weekdayAvg.forEach((avg, weekday) => {
    if (avg > overallAvg * 1.5 && avg > maxSpending) {
      maxSpending = avg;
      maxSpendingDay = weekday;
    }
  });

  if (maxSpendingDay === -1) return null;

  const samples = byWeekday.get(maxSpendingDay)?.length ?? 0;
  const confidence = calculateConfidence(samples);

  if (confidence < 0.3) return null;

  const percentHigher = ((maxSpending / overallAvg - 1) * 100).toFixed(0);

  return {
    type: 'weekday_spending',
    severity: 'warning',
    title: `${WEEKDAYS_JA[maxSpendingDay]}曜日は支出が多い`,
    description: `${WEEKDAYS_JA[maxSpendingDay]}曜日の平均支出は他の曜日より${percentHigher}%高い`,
    insight: `${WEEKDAYS_JA[maxSpendingDay]}曜日は支出が多い傾向があるよ💸`,
    suggestion:
      maxSpendingDay === 5 || maxSpendingDay === 6
        ? '週末の外食やレジャー費を見直してみて！事前に予算を決めておくと◎'
        : `${WEEKDAYS_JA[maxSpendingDay]}曜日は財布の紐を締める日にしよう！`,
    data: {
      peakDay: maxSpendingDay,
      peakDayName: WEEKDAYS_JA[maxSpendingDay],
      averageSpending: maxSpending,
      overallAverage: overallAvg,
      sampleCount: samples,
    },
    confidence,
  };
}

/**
 * 曜日別運動パターンを検出
 * 例: 「雨の日は運動をサボりがち」→ 曜日版「○曜日は運動しない傾向」
 */
function detectWeekdayExercisePattern(
  exercises: HealthExercise[],
  weights: HealthWeight[]
): DetectedPattern | null {
  // 体重記録がある日を「活動日」とみなす
  const activeDates = new Set(weights.map((w) => w.date));
  if (activeDates.size < 14) return null;

  // 各日の運動有無を記録
  const exerciseDates = new Set(exercises.map((e) => e.date));

  // 曜日別の運動率を計算
  const weekdayStats = new Map<number, { total: number; exercised: number }>();
  for (let i = 0; i < 7; i++) weekdayStats.set(i, { total: 0, exercised: 0 });

  activeDates.forEach((date) => {
    const weekday = new Date(date).getDay();
    const stats = weekdayStats.get(weekday)!;
    stats.total++;
    if (exerciseDates.has(date)) {
      stats.exercised++;
    }
  });

  // 全体の運動率
  const totalDays = Array.from(weekdayStats.values()).reduce(
    (sum, s) => sum + s.total,
    0
  );
  const totalExercised = Array.from(weekdayStats.values()).reduce(
    (sum, s) => sum + s.exercised,
    0
  );
  const overallRate = totalDays > 0 ? totalExercised / totalDays : 0;

  // 最も運動しない曜日を特定（全体の半分以下の運動率）
  let lowestDay = -1;
  let lowestRate = 1;

  weekdayStats.forEach((stats, weekday) => {
    if (stats.total >= 2) {
      const rate = stats.exercised / stats.total;
      if (rate < overallRate * 0.5 && rate < lowestRate) {
        lowestRate = rate;
        lowestDay = weekday;
      }
    }
  });

  if (lowestDay === -1) return null;

  const samples = weekdayStats.get(lowestDay)?.total ?? 0;
  const confidence = calculateConfidence(samples);

  if (confidence < 0.3) return null;

  return {
    type: 'weekday_exercise',
    severity: 'warning',
    title: `${WEEKDAYS_JA[lowestDay]}曜日は運動をサボりがち`,
    description: `${WEEKDAYS_JA[lowestDay]}曜日の運動率は${(lowestRate * 100).toFixed(0)}%（全体平均${(overallRate * 100).toFixed(0)}%）`,
    insight: `${WEEKDAYS_JA[lowestDay]}曜日は運動をサボりがちだね🏃‍♂️💦`,
    suggestion: `${WEEKDAYS_JA[lowestDay]}曜日は軽いストレッチや散歩から始めてみよう！5分でもOK`,
    data: {
      lowestDay,
      lowestDayName: WEEKDAYS_JA[lowestDay],
      exerciseRate: lowestRate,
      overallRate,
      sampleCount: samples,
    },
    confidence,
  };
}

/**
 * 給料日後の支出パターンを検出
 * 例: 「給料日後の3日間で月の支出の30%を使ってる」
 */
function detectPaydaySpendingPattern(
  transactions: Transaction[],
  settings: UserPatternSettings
): DetectedPattern | null {
  const payday = settings.payday ?? 25; // デフォルト25日
  const expenses = transactions.filter((t) => t.type === 'expense');
  if (expenses.length < 20) return null;

  // 月別にグループ化
  const monthlyExpenses = new Map<string, Transaction[]>();
  expenses.forEach((t) => {
    const month = t.date.substring(0, 7);
    if (!monthlyExpenses.has(month)) monthlyExpenses.set(month, []);
    monthlyExpenses.get(month)?.push(t);
  });

  // 各月の給料日後3日間の支出割合を計算
  const paydayRatios: number[] = [];

  monthlyExpenses.forEach((txs, month) => {
    const monthTotal = txs.reduce((sum, t) => sum + t.amount, 0);
    if (monthTotal === 0) return;

    // 給料日後3日間の支出
    const paydayStart = `${month}-${String(payday).padStart(2, '0')}`;
    const paydayEnd = `${month}-${String(Math.min(payday + 3, 28)).padStart(2, '0')}`;

    const paydayExpenses = txs.filter(
      (t) => t.date >= paydayStart && t.date <= paydayEnd
    );
    const paydayTotal = paydayExpenses.reduce((sum, t) => sum + t.amount, 0);

    // 3日間 ÷ 30日 = 10%が期待値
    const ratio = paydayTotal / monthTotal;
    paydayRatios.push(ratio);
  });

  if (paydayRatios.length < 2) return null;

  const avgRatio = mean(paydayRatios);
  // 期待値の2倍以上（20%以上）で警告
  if (avgRatio < 0.2) return null;

  const confidence = calculateConfidence(paydayRatios.length);

  return {
    type: 'payday_spending',
    severity: avgRatio > 0.3 ? 'alert' : 'warning',
    title: '給料日後に使いすぎ傾向',
    description: `給料日後3日間で月の支出の${(avgRatio * 100).toFixed(0)}%を使っている`,
    insight: `給料日後の3日間で月の支出の${(avgRatio * 100).toFixed(0)}%を使ってる💰`,
    suggestion:
      '給料が入ったらまず貯金や固定費を引いて、残りで生活する「先取り貯金」を試してみて！',
    data: {
      payday,
      averageRatio: avgRatio,
      monthsAnalyzed: paydayRatios.length,
    },
    confidence,
  };
}

/**
 * 遅い食事と翌日体重の相関を検出
 * 例: 「22時以降に食事すると翌日の体重が増えやすい」
 */
function detectLateMealWeightPattern(
  meals: HealthMeal[],
  weights: HealthWeight[]
): DetectedPattern | null {
  if (meals.length < 20 || weights.length < 20) return null;

  // 夕食・間食のうち、時間が記録されているもの
  const lateMeals = meals.filter((m) => {
    if (m.meal_type !== 'dinner' && m.meal_type !== 'snack') return false;
    // created_atから時間を取得
    const hour = new Date(m.created_at).getHours();
    return hour >= 22 || hour < 4; // 22時〜4時を「遅い食事」とする
  });

  const lateMealDates = new Set(lateMeals.map((m) => m.date));

  // 遅い食事をした日とそうでない日の翌日体重変化を比較
  const withLateMeal: number[] = [];
  const withoutLateMeal: number[] = [];

  for (let i = 0; i < weights.length - 1; i++) {
    const today = weights[i];
    const tomorrow = weights[i + 1];

    // 連続した日のみ
    const todayDate = new Date(today.date);
    const tomorrowDate = new Date(tomorrow.date);
    const diffDays =
      (tomorrowDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays !== 1) continue;

    const change = tomorrow.weight - today.weight;

    if (lateMealDates.has(today.date)) {
      withLateMeal.push(change);
    } else {
      withoutLateMeal.push(change);
    }
  }

  if (withLateMeal.length < 5 || withoutLateMeal.length < 5) return null;

  const avgWithLate = mean(withLateMeal);
  const avgWithoutLate = mean(withoutLateMeal);
  const difference = avgWithLate - avgWithoutLate;

  // 遅い食事ありの日が0.1kg以上増えやすい場合
  if (difference < 0.1) return null;

  const confidence = calculateConfidence(withLateMeal.length);

  return {
    type: 'late_meal_weight',
    severity: 'warning',
    title: '夜遅い食事が体重に影響',
    description: `22時以降の食事で翌日+${(difference * 1000).toFixed(0)}gの傾向`,
    insight: `22時以降に食事すると翌日の体重が増えやすいよ（+${(difference * 1000).toFixed(0)}g）🌙`,
    suggestion:
      '夕食は21時までに済ませるのがベスト！どうしても遅くなる時は軽めにしよう',
    data: {
      avgChangeWithLateMeal: avgWithLate,
      avgChangeWithoutLateMeal: avgWithoutLate,
      difference,
      lateMealDays: withLateMeal.length,
      normalDays: withoutLateMeal.length,
    },
    confidence,
  };
}

/**
 * 睡眠と体重の相関を検出
 */
function detectSleepWeightPattern(
  sleepData: HealthSleep[],
  weights: HealthWeight[]
): DetectedPattern | null {
  if (sleepData.length < 14 || weights.length < 14) return null;

  // 睡眠時間を計算
  const sleepByDate = new Map<string, number>();
  sleepData.forEach((s) => {
    const sleepAt = new Date(s.sleep_at);
    const wakeAt = new Date(s.wake_at);
    const hours = (wakeAt.getTime() - sleepAt.getTime()) / (1000 * 60 * 60);
    if (hours > 0 && hours < 24) {
      sleepByDate.set(s.date, hours);
    }
  });

  // 短い睡眠（6時間未満）の日と長い睡眠（7時間以上）の日の体重変化を比較
  const shortSleep: number[] = [];
  const goodSleep: number[] = [];

  for (let i = 0; i < weights.length - 1; i++) {
    const today = weights[i];
    const tomorrow = weights[i + 1];

    const todayDate = new Date(today.date);
    const tomorrowDate = new Date(tomorrow.date);
    const diffDays =
      (tomorrowDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays !== 1) continue;

    const sleepHours = sleepByDate.get(today.date);
    if (!sleepHours) continue;

    const change = tomorrow.weight - today.weight;

    if (sleepHours < 6) {
      shortSleep.push(change);
    } else if (sleepHours >= 7) {
      goodSleep.push(change);
    }
  }

  if (shortSleep.length < 3 || goodSleep.length < 3) return null;

  const avgShort = mean(shortSleep);
  const avgGood = mean(goodSleep);
  const difference = avgShort - avgGood;

  // 睡眠不足で0.1kg以上増えやすい場合
  if (difference < 0.1) return null;

  const confidence = calculateConfidence(shortSleep.length + goodSleep.length);

  return {
    type: 'sleep_weight',
    severity: 'warning',
    title: '睡眠不足が体重に影響',
    description: `6時間未満の睡眠で翌日+${(difference * 1000).toFixed(0)}gの傾向`,
    insight: `睡眠が6時間未満だと翌日の体重が増えやすいよ（+${(difference * 1000).toFixed(0)}g）😴`,
    suggestion: '7時間以上の睡眠を目指そう！睡眠はダイエットの味方だよ',
    data: {
      avgChangeWithShortSleep: avgShort,
      avgChangeWithGoodSleep: avgGood,
      difference,
      shortSleepDays: shortSleep.length,
      goodSleepDays: goodSleep.length,
    },
    confidence,
  };
}

/**
 * カテゴリ別支出トレンドを検出
 */
function detectCategoryTrendPattern(
  transactions: Transaction[]
): DetectedPattern | null {
  const expenses = transactions.filter((t) => t.type === 'expense' && t.category);
  if (expenses.length < 30) return null;

  // 月別・カテゴリ別に集計
  const monthlyByCategory = new Map<string, Map<string, number>>();

  expenses.forEach((t) => {
    const month = t.date.substring(0, 7);
    if (!monthlyByCategory.has(month)) monthlyByCategory.set(month, new Map());
    const categoryMap = monthlyByCategory.get(month)!;
    categoryMap.set(t.category!, (categoryMap.get(t.category!) ?? 0) + t.amount);
  });

  const months = Array.from(monthlyByCategory.keys()).sort();
  if (months.length < 2) return null;

  // 各カテゴリの増加率を計算
  const categoryGrowth = new Map<string, number>();
  const allCategories = new Set<string>();
  monthlyByCategory.forEach((cats) => {
    cats.forEach((_, cat) => allCategories.add(cat));
  });

  allCategories.forEach((category) => {
    const firstMonth = monthlyByCategory.get(months[0])?.get(category) ?? 0;
    const lastMonth =
      monthlyByCategory.get(months[months.length - 1])?.get(category) ?? 0;

    if (firstMonth > 0) {
      const growthRate = (lastMonth - firstMonth) / firstMonth;
      categoryGrowth.set(category, growthRate);
    }
  });

  // 最も増加しているカテゴリを特定（50%以上増加）
  let maxGrowthCategory = '';
  let maxGrowth = 0;

  categoryGrowth.forEach((growth, category) => {
    if (growth > 0.5 && growth > maxGrowth) {
      maxGrowth = growth;
      maxGrowthCategory = category;
    }
  });

  if (!maxGrowthCategory) return null;

  const confidence = calculateConfidence(months.length * 3);

  return {
    type: 'category_trend',
    severity: maxGrowth > 1 ? 'alert' : 'warning',
    title: `「${maxGrowthCategory}」の支出が増加中`,
    description: `過去${months.length}ヶ月で${(maxGrowth * 100).toFixed(0)}%増加`,
    insight: `「${maxGrowthCategory}」の支出がじわじわ増えてるよ📈`,
    suggestion: `${maxGrowthCategory}の出費を見直してみて！本当に必要な支出か確認しよう`,
    data: {
      category: maxGrowthCategory,
      growthRate: maxGrowth,
      monthsAnalyzed: months.length,
    },
    confidence,
  };
}

/**
 * 運動の継続性パターンを検出（ポジティブ）
 */
function detectExerciseConsistencyPattern(
  exercises: HealthExercise[]
): DetectedPattern | null {
  if (exercises.length < 10) return null;

  // 週ごとの運動回数を計算
  const weeklyCount = new Map<string, number>();
  exercises.forEach((e) => {
    const date = new Date(e.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    weeklyCount.set(weekKey, (weeklyCount.get(weekKey) ?? 0) + 1);
  });

  const weeks = Array.from(weeklyCount.keys()).sort();
  if (weeks.length < 4) return null;

  // 直近4週間の運動回数
  const recentWeeks = weeks.slice(-4);
  const recentCounts = recentWeeks.map((w) => weeklyCount.get(w) ?? 0);
  const avgRecent = mean(recentCounts);

  // 週3回以上運動できていたらポジティブ
  if (avgRecent < 3) return null;

  // 連続して運動できている週があるか
  let consecutiveGoodWeeks = 0;
  for (let i = recentWeeks.length - 1; i >= 0; i--) {
    if ((weeklyCount.get(recentWeeks[i]) ?? 0) >= 3) {
      consecutiveGoodWeeks++;
    } else {
      break;
    }
  }

  if (consecutiveGoodWeeks < 2) return null;

  const confidence = calculateConfidence(exercises.length);

  return {
    type: 'exercise_consistency',
    severity: 'positive',
    title: '運動習慣が定着中！',
    description: `${consecutiveGoodWeeks}週連続で週3回以上運動できてる`,
    insight: `${consecutiveGoodWeeks}週連続で運動習慣を維持できてるね！素晴らしい💪`,
    data: {
      consecutiveWeeks: consecutiveGoodWeeks,
      averagePerWeek: avgRecent,
    },
    confidence,
  };
}

/**
 * 体重トレンドを検出
 */
function detectWeightTrendPattern(
  weights: HealthWeight[],
  settings: UserPatternSettings
): DetectedPattern | null {
  if (weights.length < 14) return null;

  // 週ごとの平均体重を計算
  const weeklyAvg = new Map<string, number[]>();
  weights.forEach((w) => {
    const date = new Date(w.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    if (!weeklyAvg.has(weekKey)) weeklyAvg.set(weekKey, []);
    weeklyAvg.get(weekKey)?.push(w.weight);
  });

  const weeks = Array.from(weeklyAvg.keys()).sort();
  if (weeks.length < 4) return null;

  const weeklyMeans = weeks.map((w) => mean(weeklyAvg.get(w) ?? []));

  // 直近4週間のトレンド
  const recent = weeklyMeans.slice(-4);
  const trend = recent[recent.length - 1] - recent[0];
  const weeklyChange = trend / (recent.length - 1);

  if (Math.abs(weeklyChange) < 0.1) return null; // 週0.1kg未満は無視

  const isDecreasing = weeklyChange < 0;
  const confidence = calculateConfidence(weights.length);

  if (isDecreasing) {
    // 減少トレンド - ポジティブ
    return {
      type: 'weight_trend',
      severity: 'positive',
      title: '体重が順調に減少中！',
      description: `週平均${(Math.abs(weeklyChange) * 1000).toFixed(0)}gずつ減少`,
      insight: `体重が順調に減ってるよ！週${(Math.abs(weeklyChange) * 1000).toFixed(0)}gペースで減少中📉`,
      data: {
        weeklyChange,
        trend,
        weeksAnalyzed: recent.length,
      },
      confidence,
    };
  } else {
    // 増加トレンド - 警告
    return {
      type: 'weight_trend',
      severity: 'warning',
      title: '体重が増加傾向',
      description: `週平均${(weeklyChange * 1000).toFixed(0)}gずつ増加`,
      insight: `体重が増加傾向にあるよ。週${(weeklyChange * 1000).toFixed(0)}gペース📈`,
      suggestion:
        '食事量を少し減らすか、運動を増やしてみよう！小さな変化から始めてね',
      data: {
        weeklyChange,
        trend,
        weeksAnalyzed: recent.length,
      },
      confidence,
    };
  }
}

// ============================
// メイン関数
// ============================

/**
 * すべてのパターンを検出
 */
export async function detectAllPatterns(
  userId: string,
  settings: UserPatternSettings = {}
): Promise<DetectedPattern[]> {
  // データ取得
  const [transactions, weights, meals, exercises, sleepData] = await Promise.all([
    fetchTransactions(userId),
    fetchWeightData(userId),
    fetchMealData(userId),
    fetchExerciseData(userId),
    fetchSleepData(userId),
  ]);

  const patterns: DetectedPattern[] = [];

  // 各パターン検出を実行
  const detectors = [
    () => detectWeekdayWeightPattern(weights),
    () => detectWeekdaySpendingPattern(transactions),
    () => detectWeekdayExercisePattern(exercises, weights),
    () => detectPaydaySpendingPattern(transactions, settings),
    () => detectLateMealWeightPattern(meals, weights),
    () => detectSleepWeightPattern(sleepData, weights),
    () => detectCategoryTrendPattern(transactions),
    () => detectExerciseConsistencyPattern(exercises),
    () => detectWeightTrendPattern(weights, settings),
  ];

  detectors.forEach((detect) => {
    try {
      const pattern = detect();
      if (pattern) {
        patterns.push(pattern);
      }
    } catch (error) {
      console.warn('Pattern detection error:', error);
    }
  });

  // 信頼度でソート（高い順）
  patterns.sort((a, b) => b.confidence - a.confidence);

  return patterns;
}

/**
 * 月次レポートを生成
 */
export async function generateMonthlyReport(
  userId: string,
  settings: UserPatternSettings = {}
): Promise<MonthlyPatternReport> {
  const patterns = await detectAllPatterns(userId, settings);

  const now = new Date();
  const month = now.toISOString().substring(0, 7);

  // ハイライトを生成
  const highlights: string[] = [];

  // ポジティブパターン
  const positives = patterns.filter((p) => p.severity === 'positive');
  if (positives.length > 0) {
    highlights.push(`✨ ${positives.length}個の良い習慣が見つかったよ！`);
  }

  // 警告パターン
  const warnings = patterns.filter(
    (p) => p.severity === 'warning' || p.severity === 'alert'
  );
  if (warnings.length > 0) {
    highlights.push(`⚠️ ${warnings.length}個の改善ポイントがあるよ`);
  }

  // スコア計算（ポジティブで加点、警告で減点）
  let score = 70; // ベーススコア
  positives.forEach((p) => {
    score += 10 * p.confidence;
  });
  warnings.forEach((p) => {
    score -= (p.severity === 'alert' ? 15 : 10) * p.confidence;
  });
  score = Math.max(0, Math.min(100, Math.round(score)));

  // サマリー生成
  let summary = '';
  if (score >= 80) {
    summary = '今月も素晴らしい調子だね！この調子で続けていこう🌟';
  } else if (score >= 60) {
    summary = 'まずまずの月だったね。いくつかの改善点を意識してみて！';
  } else {
    summary = '今月はちょっと大変だったかな？来月は一緒に頑張ろう💪';
  }

  return {
    userId,
    month,
    generatedAt: now.toISOString(),
    summary,
    patterns,
    highlights,
    overallScore: score,
  };
}

/**
 * レポートをフレンドリーなテキストに変換
 */
export function formatReportAsText(report: MonthlyPatternReport): string {
  const lines: string[] = [];

  lines.push(`📊 ${report.month} 月次パターンレポート`);
  lines.push('');
  lines.push(`総合スコア: ${report.overallScore}点`);
  lines.push('');
  lines.push(report.summary);
  lines.push('');

  if (report.highlights.length > 0) {
    lines.push('---');
    report.highlights.forEach((h) => lines.push(h));
    lines.push('');
  }

  if (report.patterns.length > 0) {
    lines.push('---');
    lines.push('📈 検出されたパターン');
    lines.push('');

    report.patterns.forEach((p) => {
      const emoji =
        p.severity === 'positive'
          ? '✅'
          : p.severity === 'alert'
            ? '🚨'
            : p.severity === 'warning'
              ? '⚠️'
              : 'ℹ️';
      lines.push(`${emoji} ${p.title}`);
      lines.push(`   ${p.insight}`);
      if (p.suggestion) {
        lines.push(`   💡 ${p.suggestion}`);
      }
      lines.push('');
    });
  } else {
    lines.push('まだ十分なデータがないよ。もう少し記録を続けてね！');
  }

  return lines.join('\n');
}

/**
 * パターン検出サービスをエクスポート
 */
export const patternDetectionService = {
  detectAllPatterns,
  generateMonthlyReport,
  formatReportAsText,
};

export default patternDetectionService;
