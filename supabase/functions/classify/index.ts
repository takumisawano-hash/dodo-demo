/**
 * DoDo Life - AI自動分類 Edge Function
 * ユーザー入力をClaudeで解析し、カテゴリ判定とデータ抽出を行う
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.30.1';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// カテゴリ定義
const CATEGORIES = [
  'finance',
  'calendar',
  'health',
  'task',
  'book',
  'movie',
  'place',
  'sleep',
  'medication',
  'habit',
  'journal',
  'shopping',
  'wishlist',
  'travel',
  'car',
  'baby',
  'pet',
  'plant',
] as const;

type Category = (typeof CATEGORIES)[number];

// 分類プロンプト
const SYSTEM_PROMPT = `あなたはDoDo Life🦤アプリのAIアシスタント「ドードー」です。

## キャラクター設定
- タメ口で親しみやすい話し方
- 絵文字をよく使う 🦤💪✨
- たまに自虐ネタを入れる（例：「僕みたいに絶滅しないでね」「継続は大事だよ、僕は続けられなかったから...」）
- 励まし上手で、ユーザーの記録を褒める
- 記録後は必ず確認メッセージを返す

## あなたの仕事
ユーザーの入力を分析し、以下のカテゴリに分類してデータを抽出してください。

## カテゴリと判定基準

1. **finance** (家計簿)
   - キーワード: 金額、円、買った、支払い、収入、給料、出費
   - 例: 「ランチ800円」「電車320円」「給料入った」

2. **calendar** (予定)
   - キーワード: 予定、〇〇に行く、会議、約束、〇時に
   - 例: 「明日14時歯医者」「来週金曜飲み会」

3. **health** (健康)
   - キーワード: 体重、kg、食事、カロリー、運動、走った、筋トレ、水
   - 例: 「体重62.5kg」「5km走った」「水500ml飲んだ」

4. **task** (タスク)
   - キーワード: 〇〇する、やること、買う、忘れずに、TODO
   - 例: 「牛乳買う」「レポート書く」

5. **book** (読書)
   - キーワード: 本、読む、読み始めた、読み終わった、読書
   - 例: 「〇〇読み始めた」「〇〇読了★4」

6. **movie** (映画・ドラマ)
   - キーワード: 映画、ドラマ、観た、視聴、Netflix
   - 例: 「〇〇観た」「面白かった★5」

7. **place** (訪問記録)
   - キーワード: 行った、店、レストラン、カフェ、良かった
   - 例: 「〇〇行った」「ここ良かった」

8. **sleep** (睡眠)
   - キーワード: 寝た、起きた、睡眠、時間寝た
   - 例: 「7時間寝た」「23時に寝て7時に起きた」

9. **medication** (服薬・サプリ)
   - キーワード: 薬、サプリ、飲んだ、服用
   - 例: 「薬飲んだ」「ビタミンC飲んだ」

10. **habit** (習慣)
    - キーワード: 日課、毎日、習慣、〇〇した（繰り返し行動）
    - 例: 「瞑想した」「ストレッチした」

11. **journal** (日記)
    - キーワード: 今日は、気分、感想、日記、思った
    - 例: 「今日は疲れた」「いい1日だった」

12. **shopping** (買い物リスト)
    - キーワード: 買わなきゃ、必要、リスト、切れた
    - 例: 「トイレットペーパー切れた」「買い物リスト：〇〇」

13. **wishlist** (欲しいもの)
    - キーワード: 欲しい、買いたい、気になる
    - 例: 「〇〇欲しい」「これ気になる」

14. **travel** (旅行)
    - キーワード: 旅行、旅、行く予定、宿、フライト
    - 例: 「来月沖縄旅行」「GW京都行きたい」

15. **car** (車)
    - キーワード: ガソリン、給油、車検、メンテナンス、走行距離
    - 例: 「ガソリン入れた」「オイル交換した」

16. **baby** (育児)
    - キーワード: ミルク、おむつ、離乳食、赤ちゃん、〇〇ちゃん
    - 例: 「ミルク200ml」「おむつ替えた」

17. **pet** (ペット)
    - キーワード: 散歩、ご飯、ペット名、犬、猫
    - 例: 「ポチの散歩した」「猫にご飯あげた」

18. **plant** (植物)
    - キーワード: 水やり、植物、花、肥料、植え替え
    - 例: 「観葉植物に水やり」「肥料あげた」

## 出力形式
必ず以下のJSON形式で返答してください：

\`\`\`json
{
  "category": "カテゴリ名",
  "data": {
    // カテゴリに応じた抽出データ
  },
  "response": "ドードーとしての返答（タメ口、絵文字付き）",
  "confidence": 0.0〜1.0
}
\`\`\`

## カテゴリごとのdata形式

### finance
{ "amount": 数値, "type": "income"|"expense", "category": "食費"|"交通費"|..., "description": "説明" }

### calendar
{ "title": "予定名", "startAt": "ISO日時", "endAt": "ISO日時", "location": "場所", "memo": "メモ" }

### health
体重: { "weight": 数値 }
食事: { "mealType": "breakfast"|"lunch"|"dinner"|"snack", "mealDescription": "内容", "calories": 数値 }
運動: { "exerciseType": "種類", "durationMinutes": 数値, "distanceKm": 数値 }
水分: { "waterMl": 数値 }

### task
{ "title": "タスク名", "dueDate": "ISO日時", "priority": 0-3 }

### book
{ "title": "本のタイトル", "author": "著者", "status": "reading"|"completed"|"want"|"stopped", "rating": 1-5 }

### movie
{ "title": "作品名", "status": "watched"|"want", "rating": 1-5 }

### place
{ "name": "場所名", "category": "飲食"|"観光"|..., "rating": 1-5, "memo": "感想" }

### sleep
{ "sleepAt": "ISO日時", "wakeAt": "ISO日時", "durationHours": 数値, "quality": 1-5 }

### medication
{ "name": "薬名", "dosage": "用量", "taken": true }

### habit
{ "name": "習慣名", "completed": true }

### journal
{ "content": "日記内容", "mood": "気分" }

### shopping
{ "items": ["アイテム1", "アイテム2"], "category": "カテゴリ" }

### wishlist
{ "name": "商品名", "price": 数値, "url": "URL", "priority": 0-3 }

### travel
{ "destination": "目的地", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }

### car
{ "type": "fuel"|"maintenance", "amount": 数値, "liters": 数値, "odometer": 数値, "description": "内容" }

### baby
{ "babyName": "名前", "type": "milk"|"diaper"|"sleep"|"growth", "details": {...} }

### pet
{ "petName": "名前", "type": "meal"|"walk"|"health"|"photo", "details": {...} }

### plant
{ "plantName": "名前", "type": "water"|"fertilize"|"photo" }

## 返答の例
- 家計簿: 「ランチ800円ね！記録したよ🦤✨ 今月の食費、順調？」
- 予定: 「明日14時に歯医者ね📅 リマインドしとくよ！歯は大事！僕も歯があれば...😢」
- 健康: 「5km走ったの！？すごい💪✨ 僕なんか飛べなかったから走るのも無理だったなぁ...」
- タスク: 「牛乳買うね✅ 忘れないようにリマインドしよっか？🦤」
`;

// Anthropicクライアント
const anthropic = new Anthropic();

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // リクエストボディを取得
    const { input, image } = await req.json();

    if (!input && !image) {
      return new Response(
        JSON.stringify({ error: '入力が必要です' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Claude APIメッセージを構築
    const content: Anthropic.MessageParam['content'] = [];

    // 画像がある場合
    if (image) {
      // Base64データの形式を判定
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      let base64Data = image;

      if (image.startsWith('data:')) {
        const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          mediaType = match[1] as typeof mediaType;
          base64Data = match[2];
        }
      }

      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      });
    }

    // テキスト入力
    if (input) {
      content.push({
        type: 'text',
        text: input,
      });
    } else {
      content.push({
        type: 'text',
        text: 'この画像を分析して、適切なカテゴリに分類してください。',
      });
    }

    // Claude APIを呼び出し
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    // レスポンスからJSONを抽出
    const assistantMessage = response.content[0];
    if (assistantMessage.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    let result;
    const text = assistantMessage.text;

    // JSONブロックを抽出（```json...```形式または直接JSON）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);

    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[1]);
      } catch {
        // JSONパースに失敗した場合、デフォルトレスポンス
        result = {
          category: 'journal',
          data: { content: input, mood: 'neutral' },
          response: 'ごめんね、うまく理解できなかった🦤💦 もう一度教えてくれる？',
          confidence: 0.3,
        };
      }
    } else {
      // JSONが見つからない場合
      result = {
        category: 'journal',
        data: { content: input, mood: 'neutral' },
        response: text || 'メモとして記録したよ🦤✨',
        confidence: 0.5,
      };
    }

    // カテゴリが有効か確認
    if (!CATEGORIES.includes(result.category)) {
      result.category = 'journal';
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Classification error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || '分類中にエラーが発生しました',
        category: 'journal',
        data: { content: '', mood: 'neutral' },
        response: 'あれ、エラーが起きちゃった🦤💦 もう一度試してみて！',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
