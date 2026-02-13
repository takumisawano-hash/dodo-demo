/**
 * DoDo Life - 自然言語クエリ Edge Function
 * ユーザーの質問を解析し、データを取得して自然な回答を生成
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import Anthropic from 'npm:@anthropic-ai/sdk@0.30.1';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Anthropicクライアント
const anthropic = new Anthropic();

// Supabaseクライアント作成
function createSupabaseClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );
}

// ============================
// Types
// ============================

interface QueryIntent {
  category: string;
  period: {
    type: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';
    startDate?: string;
    endDate?: string;
  };
  aggregation: 'sum' | 'avg' | 'count' | 'list' | 'trend';
  subCategory?: string;
  showChart: boolean;
}

interface QueryData {
  category: string;
  records: unknown[];
  summary: Record<string, unknown>;
}

// ============================
// Intent Analysis Prompt
// ============================

const INTENT_ANALYSIS_PROMPT = `あなたはDoDo Lifeアプリのクエリ解析AIです。
ユーザーの質問を分析し、どのデータを取得すべきか判定してください。

## カテゴリ
- finance: 家計簿・支出・収入
- events: 予定・スケジュール
- tasks: タスク・やること
- sleep: 睡眠
- weight: 体重
- exercise: 運動
- meals: 食事・カロリー
- water: 水分
- books: 読書
- movies: 映画

## 期間
- today: 今日
- yesterday: 昨日
- this_week: 今週
- last_week: 先週
- this_month: 今月
- last_month: 先月
- this_year: 今年
- custom: カスタム期間（startDate, endDateを指定）

## 集計タイプ
- sum: 合計
- avg: 平均
- count: 件数
- list: 一覧表示
- trend: 推移・変化

## 出力形式（JSON）
{
  "category": "カテゴリ",
  "period": {
    "type": "期間タイプ",
    "startDate": "YYYY-MM-DD（customの場合）",
    "endDate": "YYYY-MM-DD（customの場合）"
  },
  "aggregation": "集計タイプ",
  "subCategory": "サブカテゴリ（食費、ランニングなど）",
  "showChart": true/false
}
`;

// ============================
// Response Generation Prompt
// ============================

const RESPONSE_GENERATION_PROMPT = `あなたはDoDo Life🦤アプリのAIアシスタント「ドードー」です。

## キャラクター設定
- タメ口で親しみやすい話し方
- 絵文字をよく使う 🦤💪✨
- たまに自虐ネタを入れる
- 励まし上手で、ユーザーのデータを褒める

## ルール
1. データに基づいて具体的に回答する
2. 数値は適切にフォーマット（金額は¥、体重はkg）
3. ポジティブな表現を使う
4. 2-3文で簡潔に
5. 絵文字で締めくくる

## 回答例
- 「先月の支出は¥152,340だよ💰 食費が一番多くて¥45,000。でも予算内だから大丈夫！✨」
- 「今週の平均睡眠は6.2時間。ちょっと少ないかも😴 もう少し寝れるといいね！」
- 「今月は2冊読了！『〇〇』と『△△』だね📚 すごい！僕より読んでる🦤」
`;

// ============================
// Date Utilities
// ============================

function getDateRange(period: QueryIntent['period']): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (period.type) {
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
      const diff = day === 0 ? 6 : day - 1;
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

    case 'custom':
      return {
        start: period.startDate ?? today,
        end: period.endDate ?? today,
      };

    default:
      return { start: today, end: today };
  }
}

// ============================
// Data Fetching
// ============================

async function fetchData(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  intent: QueryIntent,
  dateRange: { start: string; end: string }
): Promise<QueryData> {
  const { start, end } = dateRange;

  switch (intent.category) {
    case 'finance': {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end);

      if (intent.subCategory) {
        query = query.eq('category', intent.subCategory);
      }

      const { data } = await query;
      const records = data ?? [];
      const total = records.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

      const byCategory: Record<string, number> = {};
      for (const t of records as { category?: string; amount: number }[]) {
        const cat = t.category ?? 'その他';
        byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
      }

      return {
        category: 'finance',
        records,
        summary: {
          total,
          count: records.length,
          breakdown: Object.entries(byCategory)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value),
        },
      };
    }

    case 'sleep': {
      const { data } = await supabase
        .from('health_sleep')
        .select('*')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end);

      const records = data ?? [];
      const durations = records
        .filter((r: { sleep_at?: string; wake_at?: string }) => r.sleep_at && r.wake_at)
        .map((r: { sleep_at: string; wake_at: string; date: string }) => {
          const hours = (new Date(r.wake_at).getTime() - new Date(r.sleep_at).getTime()) / (1000 * 60 * 60);
          return { date: r.date, hours: Math.round(hours * 10) / 10 };
        });

      const totalHours = durations.reduce((sum: number, d: { hours: number }) => sum + d.hours, 0);

      return {
        category: 'sleep',
        records,
        summary: {
          totalHours,
          averageHours: durations.length > 0 ? totalHours / durations.length : 0,
          count: records.length,
          trend: durations,
        },
      };
    }

    case 'weight': {
      const { data } = await supabase
        .from('health_weight')
        .select('*')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      const records = data ?? [];
      const weights = records.map((r: { weight: number }) => r.weight);

      return {
        category: 'weight',
        records,
        summary: {
          latest: weights[weights.length - 1],
          first: weights[0],
          average: weights.length > 0 ? weights.reduce((a: number, b: number) => a + b, 0) / weights.length : 0,
          count: records.length,
          trend: records.map((r: { date: string; weight: number }) => ({ date: r.date, weight: r.weight })),
        },
      };
    }

    case 'events': {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .or(`start_at.gte.${start}T00:00:00,start_at.lte.${end}T23:59:59`)
        .order('start_at', { ascending: true });

      return {
        category: 'events',
        records: data ?? [],
        summary: { count: (data ?? []).length },
      };
    }

    case 'tasks': {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .or(`due_date.gte.${start},due_date.lte.${end}`);

      const records = data ?? [];
      const completed = records.filter((t: { completed: boolean }) => t.completed).length;

      return {
        category: 'tasks',
        records,
        summary: { total: records.length, completed, pending: records.length - completed },
      };
    }

    case 'exercise': {
      const { data } = await supabase
        .from('health_exercise')
        .select('*')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end);

      const records = data ?? [];
      const totalMinutes = records.reduce((sum: number, e: { duration_minutes?: number }) => sum + (e.duration_minutes ?? 0), 0);

      return {
        category: 'exercise',
        records,
        summary: { totalMinutes, count: records.length },
      };
    }

    case 'meals': {
      const { data } = await supabase
        .from('health_meals')
        .select('*')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end);

      const records = data ?? [];
      const totalCalories = records.reduce((sum: number, m: { calories?: number }) => sum + (m.calories ?? 0), 0);

      return {
        category: 'meals',
        records,
        summary: { totalCalories, count: records.length },
      };
    }

    case 'water': {
      const { data } = await supabase
        .from('health_water')
        .select('*')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end);

      const records = data ?? [];
      const totalMl = records.reduce((sum: number, w: { amount_ml: number }) => sum + w.amount_ml, 0);

      return {
        category: 'water',
        records,
        summary: { totalMl, liters: totalMl / 1000, count: records.length },
      };
    }

    case 'books': {
      try {
        const { data } = await supabase
          .from('books')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .gte('created_at', `${start}T00:00:00`)
          .lte('created_at', `${end}T23:59:59`);

        return {
          category: 'books',
          records: data ?? [],
          summary: { count: (data ?? []).length },
        };
      } catch {
        return { category: 'books', records: [], summary: { count: 0 } };
      }
    }

    case 'movies': {
      try {
        const { data } = await supabase
          .from('movies')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', `${start}T00:00:00`)
          .lte('created_at', `${end}T23:59:59`);

        return {
          category: 'movies',
          records: data ?? [],
          summary: { count: (data ?? []).length },
        };
      } catch {
        return { category: 'movies', records: [], summary: { count: 0 } };
      }
    }

    default:
      return { category: 'general', records: [], summary: {} };
  }
}

// ============================
// Main Handler
// ============================

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '認証が必要です' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: '質問を入力してください' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Supabaseクライアント作成
    const supabase = createSupabaseClient(authHeader);

    // ユーザーIDを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: '認証エラー' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Claude APIでクエリ意図を解析
    const intentResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: INTENT_ANALYSIS_PROMPT,
      messages: [{ role: 'user', content: query }],
    });

    let intent: QueryIntent;
    try {
      const intentText = intentResponse.content[0];
      if (intentText.type !== 'text') throw new Error('Unexpected response');
      const jsonMatch = intentText.text.match(/\{[\s\S]*\}/);
      intent = JSON.parse(jsonMatch?.[0] ?? '{}');
    } catch {
      // フォールバック
      intent = {
        category: 'finance',
        period: { type: 'this_month' },
        aggregation: 'sum',
        showChart: false,
      };
    }

    // 2. 期間を計算
    const dateRange = getDateRange(intent.period);

    // 3. データを取得
    const data = await fetchData(supabase, user.id, intent, dateRange);

    // 4. Claude APIで自然な回答を生成
    const responsePrompt = `
質問: ${query}

取得したデータ:
${JSON.stringify(data.summary, null, 2)}

このデータに基づいて、ドードーとして回答してください。
`;

    const responseResult = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: RESPONSE_GENERATION_PROMPT,
      messages: [{ role: 'user', content: responsePrompt }],
    });

    const responseText = responseResult.content[0];
    const response = responseText.type === 'text' ? responseText.text : 'ごめん、うまく答えられなかった🦤💦';

    // 5. グラフデータを準備
    let chartData = null;
    if (intent.showChart) {
      if (data.summary.trend && Array.isArray(data.summary.trend)) {
        const trend = data.summary.trend as { date: string; value?: number; hours?: number; weight?: number }[];
        chartData = {
          type: 'line',
          labels: trend.map((t) => {
            const d = new Date(t.date);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }),
          values: trend.map((t) => t.value ?? t.hours ?? t.weight ?? 0),
        };
      } else if (data.summary.breakdown && Array.isArray(data.summary.breakdown)) {
        const breakdown = data.summary.breakdown as { label: string; value: number }[];
        chartData = {
          type: 'pie',
          labels: breakdown.map((b) => b.label),
          values: breakdown.map((b) => b.value),
        };
      }
    }

    return new Response(
      JSON.stringify({
        response,
        data,
        showChart: intent.showChart,
        chartData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Natural query error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'クエリ処理中にエラーが発生しました',
        response: 'あれ、エラーが起きちゃった🦤💦 もう一度試してみて！',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
