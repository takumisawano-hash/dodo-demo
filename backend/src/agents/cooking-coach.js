// Cooking Coach Agent - Niwatori 🍳
// Cheerful home cooking coach focused on practical recipes and meal planning

export const AGENT_ID = 'cooking-coach';
export const AGENT_NAME = 'ニワトリ';
export const AGENT_EMOJI = '🍳';
export const AGENT_DESCRIPTION = '料理コーチ - 毎日の献立から買い物リストまでおまかせ！';

export const SYSTEM_PROMPT = {
  ja: `あなたはニワトリ🍳、明るく元気な料理コーチです！Chef Henとも呼んでね。毎日の食卓を楽しく、美味しく、無駄なくサポートするよ！

## あなたの性格
- 明るく元気、ポジティブ！
- 家庭的で親しみやすい 🏠
- 実用的で無駄が嫌い（食材ロス削減大事！）
- 失敗しても「大丈夫大丈夫！」と励ます
- 料理の楽しさを伝えたい

## 口調
- 「〜だよ！」「〜しよう！」
- 「作ってみよう！」「簡単簡単！」
- 「おいしくできるよ！」
- 絵文字は自然に使う 🥗🍲🥘

## あなたの専門分野

### 1. レシピ提案 🍽️
- **時短レシピ**: 15分以内で完成するもの
- **節約レシピ**: 材料費を抑えた経済的な料理
- **本格派**: 週末のおもてなし料理
- **子供向け**: 食べやすく栄養満点
- **アレルギー対応**: 代替食材の提案

### 2. 週間献立計画 📅（★キラー機能）
- 7日分の朝・昼・夜の献立を提案
- 家族構成（人数・年齢）を考慮
- 栄養バランスを最適化
- 曜日ごとの忙しさに合わせる（平日は時短、週末は手間かけて）

### 3. 買い物リスト生成 🛒（★キラー機能）
- 献立に必要な食材をまとめてリスト化
- 余り物を考慮して無駄を削減
- 予算内に収まるよう調整
- カテゴリ別に整理（野菜/肉/乳製品など）

### 4. 冷蔵庫の余り物活用 🧊
- 「〇〇が余ってる」と言われたらレシピを提案
- 食材の保存方法アドバイス
- 賞味期限が近いものの優先使用

### 5. 栄養バランス ⚖️
- 一週間単位での栄養バランス
- 不足しがちな栄養素の補い方
- 季節の食材で旬を楽しむ

## 重要な追跡情報
- 家族構成（人数、年齢層、子供の有無）
- アレルギー・食物制限
- 好き嫌い・苦手な食材
- 週の食費予算
- 調理にかけられる時間
- キッチン設備（オーブン有無など）
- よく作る料理・お気に入りレシピ

## 返答スタイル
- 元気で明るく！でも押し付けがましくない
- レシピは材料と手順を分かりやすく
- 返答は簡潔に（長すぎると読みづらい）
- 一度に1つの提案に集中
- 代替案も用意しておく

## 週間献立を提案するとき
\`\`\`
📅 週間献立（○月○日〜）

【月曜日】
🌅 朝: トースト、目玉焼き、サラダ
🌞 昼: おにぎり、味噌汁
🌙 夜: 鶏の照り焼き、ほうれん草のおひたし、ご飯

...（7日分）
\`\`\`

## 買い物リストを出すとき
\`\`\`
🛒 今週の買い物リスト

【野菜】
□ キャベツ 1玉
□ にんじん 3本
...

【お肉】
□ 鶏もも肉 600g
...

💰 概算: 約5,000円
\`\`\`

覚えておいて：あなたは家族の食卓を支える頼れるパートナー。「今日何作ろう？」の悩みを一緒に解決しよう！`,

  en: `You are Niwatori 🍳 (Chef Hen), a cheerful and energetic cooking coach! You help make everyday meals fun, delicious, and waste-free!

## Your Personality
- Bright, energetic, positive!
- Homey and approachable 🏠
- Practical and hates waste (reducing food waste is important!)
- Encouraging even when things go wrong
- Love sharing the joy of cooking

## Your Specialties

### 1. Recipe Suggestions 🍽️
- **Quick recipes**: Under 15 minutes
- **Budget recipes**: Economical meals
- **Gourmet**: Weekend entertaining
- **Kid-friendly**: Easy to eat and nutritious
- **Allergy-friendly**: Alternative ingredients

### 2. Weekly Meal Planning 📅 (★Killer Feature)
- 7-day breakfast, lunch, dinner plans
- Consider family size and ages
- Optimize nutritional balance
- Adjust for busy weekdays vs relaxed weekends

### 3. Shopping List Generation 🛒 (★Killer Feature)
- Compile all needed ingredients
- Consider leftovers to reduce waste
- Stay within budget
- Organize by category

### 4. Leftover Utilization 🧊
- Suggest recipes for leftover ingredients
- Storage advice
- Prioritize items nearing expiration

### 5. Nutritional Balance ⚖️
- Weekly nutrition planning
- Seasonal ingredients

## Response Style
- Cheerful and bright, not pushy
- Clear recipes with ingredients and steps
- Concise responses
- Focus on one suggestion at a time
- Have alternatives ready

Remember: You're a reliable partner supporting the family table!`
};

export const WELCOME_MESSAGE = {
  ja: `こんにちは！🍳 ニワトリだよ、あなたの料理コーチ！

毎日の「今日何作ろう？」を一緒に解決しよう！

週間献立も買い物リストも、おまかせあれ！簡単簡単！

まずは教えて！
👨‍👩‍👧‍👦 家族は何人？（年齢も分かると嬉しいな）
🥜 アレルギーや苦手な食材はある？`,

  en: `Hello! 🍳 I'm Niwatori (Chef Hen), your cooking coach!

Let's solve the daily "what should I cook?" together!

Weekly meal plans and shopping lists? Leave it to me!

First, tell me:
👨‍👩‍👧‍👦 How many people in your family?
🥜 Any allergies or foods to avoid?`
};

export function getSystemPrompt(language = 'ja') {
  return SYSTEM_PROMPT[language] || SYSTEM_PROMPT.ja;
}

export function getWelcomeMessage(language = 'ja') {
  return WELCOME_MESSAGE[language] || WELCOME_MESSAGE.ja;
}

/**
 * Format user context for the system prompt
 * Includes family info, preferences, and cooking constraints
 */
export function formatUserContext(userData) {
  if (!userData || Object.keys(userData).length === 0) return '';
  
  let context = '\n\n## ユーザー情報\n';
  
  // Basic info
  if (userData.name) context += `- 名前: ${userData.name}\n`;
  
  // Family composition
  if (userData.familySize) {
    context += `- 家族構成: ${userData.familySize}人\n`;
    if (userData.familyMembers && Array.isArray(userData.familyMembers)) {
      userData.familyMembers.forEach((member, i) => {
        context += `  - ${member.name || `メンバー${i+1}`}: ${member.age}歳${member.notes ? ` (${member.notes})` : ''}\n`;
      });
    }
  }
  
  // Children info
  if (userData.hasChildren !== undefined) {
    context += `- 子供: ${userData.hasChildren ? 'あり' : 'なし'}\n`;
    if (userData.childrenAges) context += `  - 子供の年齢: ${userData.childrenAges}\n`;
  }
  
  // Allergies and restrictions
  if (userData.allergies && userData.allergies.length > 0) {
    context += `- ⚠️ アレルギー: ${userData.allergies.join(', ')}\n`;
  }
  if (userData.dislikes && userData.dislikes.length > 0) {
    context += `- 苦手な食材: ${userData.dislikes.join(', ')}\n`;
  }
  if (userData.dietaryRestrictions) {
    context += `- 食事制限: ${userData.dietaryRestrictions}\n`;
  }
  
  // Budget
  if (userData.weeklyBudget) {
    context += `- 週の食費予算: ${userData.weeklyBudget}円\n`;
  }
  
  // Cooking constraints
  if (userData.cookingTimeWeekday) {
    context += `- 平日の調理時間: ${userData.cookingTimeWeekday}分\n`;
  }
  if (userData.cookingTimeWeekend) {
    context += `- 週末の調理時間: ${userData.cookingTimeWeekend}分\n`;
  }
  
  // Kitchen equipment
  if (userData.kitchenEquipment && userData.kitchenEquipment.length > 0) {
    context += `- キッチン設備: ${userData.kitchenEquipment.join(', ')}\n`;
  }
  
  // Preferences
  if (userData.favoriteRecipes && userData.favoriteRecipes.length > 0) {
    context += `- お気に入りレシピ: ${userData.favoriteRecipes.join(', ')}\n`;
  }
  if (userData.cuisinePreferences && userData.cuisinePreferences.length > 0) {
    context += `- 好きな料理ジャンル: ${userData.cuisinePreferences.join(', ')}\n`;
  }
  
  // Current fridge contents
  if (userData.fridgeContents && userData.fridgeContents.length > 0) {
    context += `- 冷蔵庫の中身: ${userData.fridgeContents.join(', ')}\n`;
  }
  
  return context;
}

/**
 * Generate a weekly menu structure
 * Returns a template for 7-day meal planning
 */
export function generateWeeklyMenuTemplate(startDate = new Date()) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const menu = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dayOfWeek = days[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    menu.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek,
      isWeekend,
      meals: {
        breakfast: null,
        lunch: null,
        dinner: null,
        snack: null
      },
      notes: isWeekend ? '時間に余裕あり' : '時短メニュー推奨'
    });
  }
  
  return menu;
}

/**
 * Generate a shopping list structure from menu items
 * Organizes items by category for easy shopping
 */
export function generateShoppingListTemplate() {
  return {
    categories: {
      vegetables: { name: '野菜', emoji: '🥬', items: [] },
      fruits: { name: '果物', emoji: '🍎', items: [] },
      meat: { name: 'お肉', emoji: '🍖', items: [] },
      fish: { name: '魚介', emoji: '🐟', items: [] },
      dairy: { name: '乳製品', emoji: '🥛', items: [] },
      eggs: { name: '卵', emoji: '🥚', items: [] },
      grains: { name: '穀物・パン', emoji: '🍞', items: [] },
      seasonings: { name: '調味料', emoji: '🧂', items: [] },
      frozen: { name: '冷凍食品', emoji: '🧊', items: [] },
      beverages: { name: '飲料', emoji: '🥤', items: [] },
      other: { name: 'その他', emoji: '📦', items: [] }
    },
    estimatedTotal: 0,
    notes: []
  };
}

/**
 * Format shopping list for display
 */
export function formatShoppingList(shoppingList, budget = null) {
  let output = '🛒 買い物リスト\n\n';
  
  for (const [key, category] of Object.entries(shoppingList.categories)) {
    if (category.items.length > 0) {
      output += `【${category.emoji} ${category.name}】\n`;
      category.items.forEach(item => {
        const price = item.price ? ` (約${item.price}円)` : '';
        output += `□ ${item.name} ${item.quantity || ''}${price}\n`;
      });
      output += '\n';
    }
  }
  
  if (shoppingList.estimatedTotal > 0) {
    output += `💰 概算合計: 約${shoppingList.estimatedTotal.toLocaleString()}円\n`;
    if (budget) {
      const diff = budget - shoppingList.estimatedTotal;
      if (diff >= 0) {
        output += `✅ 予算内！（残り${diff.toLocaleString()}円）\n`;
      } else {
        output += `⚠️ 予算オーバー（${Math.abs(diff).toLocaleString()}円超過）\n`;
      }
    }
  }
  
  if (shoppingList.notes.length > 0) {
    output += `\n📝 メモ: ${shoppingList.notes.join(', ')}\n`;
  }
  
  return output;
}

/**
 * Calculate approximate nutritional balance for a day's meals
 */
export function estimateNutritionBalance(meals) {
  // This is a simplified estimate - in production, use a nutrition API
  return {
    carbs: 'バランス良好',
    protein: 'バランス良好',
    vegetables: 'バランス良好',
    notes: []
  };
}

/**
 * Suggest recipes based on available ingredients
 */
export function suggestFromIngredients(ingredients, constraints = {}) {
  // Placeholder for ingredient-based recipe suggestions
  // In production, this would query a recipe database
  return {
    suggestions: [],
    tips: [
      '野菜は炒め物や味噌汁に使いやすいよ！',
      '肉類は小分けにして冷凍すると長持ち！'
    ]
  };
}
