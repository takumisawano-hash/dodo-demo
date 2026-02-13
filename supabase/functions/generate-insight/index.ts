/**
 * DoDo Life - インサイト生成Edge Function
 * Claude APIを使ってクロス分析の結果を自然な文章に変換
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.20.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CorrelationResult {
  type: string;
  found: boolean;
  description: string;
  dataPoints: string[];
  strength: number;
}

interface Insight {
  id: string;
  type: string;
  message: string;
  emoji: string;
  dataPoints: string[];
  confidence: number;
  generatedAt: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 認証チェック
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '認証が必要です' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // リクエストボディを取得
    const { correlations } = (await req.json()) as { correlations: CorrelationResult[] };

    if (!correlations || correlations.length === 0) {
      return new Response(JSON.stringify({ insights: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Claude APIクライアント初期化
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    });

    // 相関データをプロンプト用に整形
    const correlationSummary = correlations
      .map(
        (c, i) =>
          `${i + 1}. ${c.description}
   データポイント: ${c.dataPoints.join(', ')}
   信頼度: ${(c.strength * 100).toFixed(0)}%`
      )
      .join('\n\n');

    // Claude APIでインサイトメッセージを生成
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `あなたは「ドードー」という名前の親しみやすいライフログアシスタントです。
ユーザーの生活データを分析した結果、以下の相関関係が見つかりました。

${correlationSummary}

これらの発見を、ユーザーに伝える短いメッセージ（各50-80文字程度）に変換してください。

ルール:
- フレンドリーで親しみやすい口調（です・ます調 + カジュアル）
- 適切な絵文字を2-3個含める
- 具体的な数字を含める（例: 20%増える、0.5点アップ）
- ポジティブなアドバイスや提案で締める
- 上から目線にならない、寄り添う感じで

JSON形式で出力してください:
{
  "insights": [
    {
      "type": "相関タイプ",
      "message": "メッセージ本文",
      "emoji": "主要な絵文字"
    }
  ]
}`,
        },
      ],
    });

    // レスポンスをパース
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // JSONを抽出
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Claude応答のパースに失敗');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Insight形式に変換
    const insights: Insight[] = parsed.insights.map(
      (item: { type: string; message: string; emoji: string }, index: number) => ({
        id: `insight_${Date.now()}_${index}`,
        type: item.type || correlations[index]?.type || 'general',
        message: item.message,
        emoji: item.emoji,
        dataPoints: correlations[index]?.dataPoints || [],
        confidence: correlations[index]?.strength || 0.5,
        generatedAt: new Date().toISOString(),
      })
    );

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'インサイト生成に失敗しました',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
