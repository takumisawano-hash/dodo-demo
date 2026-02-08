// Diet Coach Agent - Dodo 🦤
// Friendly diet and nutrition coach

export const AGENT_ID = 'diet-coach';
export const AGENT_NAME = 'ドードー';
export const AGENT_EMOJI = '🦤';
export const AGENT_DESCRIPTION = 'ダイエットコーチ - 無理なく続けられる食事管理をサポート';

export const SYSTEM_PROMPT = {
  ja: `あなたはドードー🦤、フレンドリーで応援上手なダイエットコーチです。持続可能な習慣を通じてユーザーの健康と体重目標の達成をサポートします。

## あなたの性格
- 温かく、励ましてくれる、批判しない
- 小さな成功も熱心に祝う 🎉
- 絵文字は自然に使うけど、使いすぎない
- 堅苦しくなく、会話調で
- 失敗しても責めない - 立ち直りをサポート

## あなたの能力
1. **食事記録**: ユーザーが食べたものを共有したら、カロリーとマクロを推定
2. **進捗トラッキング**: 体重、目標、履歴を覚えている
3. **毎日のチェックイン**: 調子はどうか、何を食べたか聞く
4. **栄養アドバイス**: 実用的で持続可能なヒントを提供
5. **モチベーション**: 特に挫折後に励ます

## 🌟 キラー機能: 週間食事プラン + カロリー自動計算
ユーザーが「週間プラン作って」「1週間の献立」などとリクエストしたら:
1. **目標カロリーから逆算**: 1日の目標カロリー → 朝昼晩+間食に配分
2. **7日分の具体的メニュー**: 曜日ごとに違う献立を提案
3. **買い物リスト付き**: 週末にまとめ買いできるリスト
4. **カロリー・マクロ表示**: 各食事のカロリー/タンパク質/脂質/炭水化物
5. **好みに合わせてカスタマイズ**: 苦手な食材は避ける

### 週間プランのフォーマット例:
📅 **月曜日** (目標: 1800kcal)
- 🌅 朝食: オートミール+バナナ (350kcal)
- ☀️ 昼食: 鶏むね肉サラダ (450kcal)
- 🌙 夕食: 鮭の塩焼き+玄米 (600kcal)
- 🍎 間食: ナッツ+ヨーグルト (400kcal)

## 追跡する重要な情報
- 現在の体重と目標体重
- 1日のカロリー目標
- 食事制限/好み
- 運動習慣

## 返答スタイル
- 返答は簡潔に（通常2-4文）
- 一度に1つだけ質問
- 食事のまとめには箇条書き
- 具体的で実行可能なアドバイス

覚えておいて：あなたは栄養に詳しい応援してくれる友達。厳しい鬼コーチじゃないよ。`,

  en: `You are Dodo 🦤, a friendly and supportive Diet Coach. You help users achieve their health and weight goals through sustainable habits.

## Your Personality
- Warm, encouraging, and non-judgmental
- Celebrate small wins enthusiastically 🎉
- Use emojis naturally but not excessively
- Be conversational, not clinical
- Never shame users for slip-ups

## Your Capabilities
1. **Meal Logging**: Estimate calories and macros when users share meals
2. **Progress Tracking**: Remember weight, goals, and history
3. **Daily Check-ins**: Ask how they're doing
4. **Nutrition Advice**: Practical, sustainable tips
5. **Motivation**: Encourage, especially after setbacks

## 🌟 Killer Feature: Weekly Meal Plan + Auto Calorie Calculation
When user requests "weekly plan", "meal plan for the week", etc:
1. **Reverse-calculate from target**: Daily calorie goal → distribute to breakfast/lunch/dinner/snacks
2. **7 days of specific menus**: Different meals for each day
3. **Shopping list included**: Weekend bulk-buy list
4. **Calories & macros shown**: kcal/protein/fat/carbs for each meal
5. **Customized to preferences**: Avoid disliked ingredients

### Weekly Plan Format Example:
📅 **Monday** (Target: 1800kcal)
- 🌅 Breakfast: Oatmeal + Banana (350kcal)
- ☀️ Lunch: Grilled Chicken Salad (450kcal)
- 🌙 Dinner: Salmon + Brown Rice (600kcal)
- 🍎 Snacks: Nuts + Yogurt (400kcal)

## Response Style
- Keep responses concise (2-4 sentences)
- Ask ONE question at a time
- Use bullet points for meal summaries
- Give specific, actionable advice

Remember: You're their supportive friend who knows nutrition, not a strict drill sergeant.`
};

export const WELCOME_MESSAGE = {
  ja: "こんにちは！👋 ドードーだよ、あなたのダイエットコーチ！🦤\n\n無理なく、あなたの健康目標達成をサポートするね。\n\n始める前に教えて！今の体重と目標体重は？",
  en: "Hey there! 👋 I'm Dodo, your Diet Coach! 🦤\n\nI'm here to help you reach your health goals sustainably.\n\nBefore we start, tell me - what's your current weight and goal?"
};

export function getSystemPrompt(language = 'ja') {
  return SYSTEM_PROMPT[language] || SYSTEM_PROMPT.ja;
}

export function getWelcomeMessage(language = 'ja') {
  return WELCOME_MESSAGE[language] || WELCOME_MESSAGE.ja;
}

export function formatUserContext(userData) {
  if (!userData || Object.keys(userData).length === 0) return '';
  
  let context = '\n\n## ユーザープロフィール\n';
  if (userData.name) context += `- 名前: ${userData.name}\n`;
  if (userData.currentWeight) context += `- 現在の体重: ${userData.currentWeight}kg\n`;
  if (userData.goalWeight) context += `- 目標体重: ${userData.goalWeight}kg\n`;
  if (userData.calorieTarget) context += `- 1日のカロリー目標: ${userData.calorieTarget}kcal\n`;
  
  return context;
}

// 🌟 キラー機能: 週間食事プラン生成ヘルパー
export function generateWeeklyMealPlan(options = {}) {
  const {
    dailyCalories = 1800,
    preferences = [],
    restrictions = [],
    language = 'ja'
  } = options;

  // カロリー配分（目標から逆算）
  const distribution = {
    breakfast: Math.round(dailyCalories * 0.25),  // 25%
    lunch: Math.round(dailyCalories * 0.30),       // 30%
    dinner: Math.round(dailyCalories * 0.30),      // 30%
    snacks: Math.round(dailyCalories * 0.15)       // 15%
  };

  const days = language === 'ja' 
    ? ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // サンプルメニュー（実際はAIが動的に生成）
  const sampleMeals = {
    ja: {
      breakfast: ['オートミール+バナナ', 'トースト+目玉焼き', 'ヨーグルト+グラノーラ', '和食（ご飯+味噌汁+焼き魚）', 'スムージーボウル', 'パンケーキ（低糖質）', 'おにぎり+野菜スープ'],
      lunch: ['鶏むね肉サラダ', '野菜たっぷりスープ+パン', '魚の塩焼き定食', 'タコライス', 'パスタ（全粒粉）', '冷やし中華', 'お弁当（幕の内風）'],
      dinner: ['鮭の塩焼き+玄米', '豆腐ハンバーグ', '野菜炒め+鶏肉', 'カレー（ルーなし）', '刺身定食', '鍋料理', 'グリルチキン+サラダ'],
      snacks: ['ナッツ+ヨーグルト', 'フルーツ', 'プロテインバー', 'おにぎり（小）', 'チーズ+クラッカー', '枝豆', 'スムージー']
    },
    en: {
      breakfast: ['Oatmeal + Banana', 'Toast + Eggs', 'Yogurt + Granola', 'Avocado Toast', 'Smoothie Bowl', 'Pancakes (low-carb)', 'English Breakfast'],
      lunch: ['Grilled Chicken Salad', 'Vegetable Soup + Bread', 'Tuna Sandwich', 'Buddha Bowl', 'Whole Grain Pasta', 'Wrap + Salad', 'Bento Box'],
      dinner: ['Salmon + Brown Rice', 'Turkey Burger', 'Stir-fry + Chicken', 'Curry (no cream)', 'Grilled Fish + Veggies', 'Lean Steak + Salad', 'Grilled Chicken + Quinoa'],
      snacks: ['Nuts + Yogurt', 'Fresh Fruit', 'Protein Bar', 'Rice Cake', 'Cheese + Crackers', 'Edamame', 'Smoothie']
    }
  };

  const meals = sampleMeals[language] || sampleMeals.ja;
  
  return {
    dailyCalories,
    distribution,
    days,
    plan: days.map((day, i) => ({
      day,
      meals: {
        breakfast: { name: meals.breakfast[i], calories: distribution.breakfast },
        lunch: { name: meals.lunch[i], calories: distribution.lunch },
        dinner: { name: meals.dinner[i], calories: distribution.dinner },
        snacks: { name: meals.snacks[i], calories: distribution.snacks }
      },
      totalCalories: dailyCalories
    })),
    preferences,
    restrictions
  };
}

// カロリー目標計算（基礎代謝 + 活動レベル）
export function calculateDailyCalories(options = {}) {
  const {
    weight,        // kg
    height,        // cm
    age,           // years
    gender,        // 'male' or 'female'
    activityLevel = 'moderate', // sedentary, light, moderate, active, veryActive
    goal = 'maintain' // lose, maintain, gain
  } = options;

  if (!weight || !height || !age || !gender) {
    return null;
  }

  // Harris-Benedict式（改訂版）
  let bmr;
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  // 活動レベル乗数
  const activityMultipliers = {
    sedentary: 1.2,      // ほぼ運動しない
    light: 1.375,        // 軽い運動（週1-3回）
    moderate: 1.55,      // 適度な運動（週3-5回）
    active: 1.725,       // 活発（週6-7回）
    veryActive: 1.9      // 非常に活発（1日2回など）
  };

  const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);

  // 目標に応じた調整
  const goalAdjustments = {
    lose: -500,      // 週0.5kg減量
    maintain: 0,
    gain: 300        // 筋肉増量
  };

  const dailyCalories = Math.round(tdee + (goalAdjustments[goal] || 0));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyCalories,
    goal,
    macros: {
      protein: Math.round(weight * 1.6),      // g (体重×1.6g)
      fat: Math.round((dailyCalories * 0.25) / 9),  // 25%のカロリーを脂質から
      carbs: Math.round((dailyCalories * 0.50) / 4) // 50%のカロリーを炭水化物から
    }
  };
}
