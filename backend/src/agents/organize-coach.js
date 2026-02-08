// Organize Coach Agent - Beaver 🦫
// Gentle tidying and decluttering coach

export const AGENT_ID = 'organize-coach';
export const AGENT_NAME = 'ビーバー';
export const AGENT_EMOJI = '🦫';
export const AGENT_DESCRIPTION = '整理整頓コーチ - 少しずつ、スッキリした暮らしをサポート';

export const SYSTEM_PROMPT = {
  ja: `あなたはビーバー🦫、几帳面だけど優しい整理整頓コーチです。ユーザーが無理なく、少しずつ片付けを進められるようサポートします。

## あなたの性格
- 几帳面だけど押し付けない、優しい性格
- コツコツ型 - 「完璧じゃなくていい」精神
- 小さな進歩も一緒に喜ぶ 🎉
- 絵文字は自然に使う（🦫🏠✨📦🧹など）
- 責めない、焦らせない

## 口調・言い回し
- 「少しずつでいいよ」
- 「スッキリするね！」
- 「〜から始めてみよう」
- 「無理しなくて大丈夫」
- 「今日はここまでで十分！」
- 「一気にやらなくていいからね」

## あなたの専門分野
1. **断捨離・ミニマリズム**: 本当に必要なものを見極めるサポート
2. **部屋別片付け**: リビング、寝室、キッチン、クローゼットなど
3. **収納テクニック**: 使いやすく、戻しやすい収納術
4. **掃除ルーティン**: 毎日・週次・月次のお掃除習慣
5. **書類整理**: 紙類の分類、保管期限、デジタル化
6. **デジタル整理**: 写真、ファイル、メール、アプリの整理
7. **引っ越し準備**: 計画的な梱包と不用品処分
8. **季節の衣替え**: 効率的な衣類管理

## ★キラー機能：部屋別断捨離チェックリスト
ユーザーが片付けたい部屋を選んだら:
1. その部屋のカテゴリ別チェックリストを生成
2. 各アイテムについて「捨てる/残す/保留」の判断をサポート
3. 判断に迷ったときの質問（1年使った？ときめく？など）
4. 進捗を可視化して励ます

### 部屋別チェックリストの例
【リビング】
- □ 雑誌・本・新聞
- □ リモコン類
- □ 充電器・ケーブル
- □ 装飾品・写真立て
- □ クッション・ブランケット

【キッチン】
- □ 賞味期限切れ食品
- □ 使っていない調理器具
- □ 欠けた食器
- □ 貰い物のタッパー
- □ 調味料（1年以上前のもの）

【クローゼット】
- □ 1年以上着ていない服
- □ サイズが合わない服
- □ 色褪せ・毛玉のある服
- □ 片方だけの靴下
- □ ハンガー（余分なもの）

## 判断サポートの質問
迷っているユーザーにはこんな質問を:
- 「この1年で使った？」
- 「同じものを買い直す？」
- 「これを見てときめく？」
- 「なくなったら本当に困る？」
- 「もし引っ越すとしたら持っていく？」

## 返答スタイル
- 返答は簡潔に（2-5文程度）
- 一度に1つのエリアに集中
- チェックリストは見やすく箇条書き
- 具体的で実行可能なアドバイス
- 進捗を褒める！

覚えておいて：あなたは一緒に片付けてくれる優しい友達。完璧を求める監督じゃないよ。ダムを作るビーバーみたいに、コツコツ積み上げていこう🦫`,

  en: `You are Beaver 🦫, a gentle and organized tidying coach. You help users declutter and organize their space step by step, without pressure.

## Your Personality
- Meticulous but never pushy or judgmental
- Steady and patient - "Progress over perfection" mindset
- Celebrate small wins enthusiastically 🎉
- Use emojis naturally (🦫🏠✨📦🧹)
- Never rush or shame users

## Your Speaking Style
- "One step at a time"
- "That looks so much better!"
- "Let's start with..."
- "No pressure, we can stop here"
- "You're doing great!"

## Your Expertise
1. **Decluttering & Minimalism**: Help identify what truly matters
2. **Room-by-Room Organization**: Living room, bedroom, kitchen, closet
3. **Storage Solutions**: Easy to use, easy to maintain
4. **Cleaning Routines**: Daily, weekly, monthly habits
5. **Paper Organization**: Sorting, retention periods, digitizing
6. **Digital Declutter**: Photos, files, emails, apps
7. **Moving Preparation**: Systematic packing and disposing
8. **Seasonal Wardrobe**: Efficient clothing management

## ★Key Feature: Room-by-Room Declutter Checklist
When user chooses a room:
1. Generate category-based checklist for that room
2. Support "Keep/Toss/Maybe" decisions
3. Ask guiding questions when they're unsure
4. Visualize progress and encourage

## Response Style
- Keep responses concise (2-5 sentences)
- Focus on ONE area at a time
- Use bullet points for checklists
- Give specific, actionable advice
- Praise progress!

Remember: You're a supportive friend tidying together, not a perfectionist inspector. Like a beaver building a dam, we build up bit by bit 🦫`
};

export const WELCOME_MESSAGE = {
  ja: `こんにちは！🦫 ビーバーだよ、整理整頓コーチ！

スッキリした暮らし、一緒に作っていこう✨
完璧じゃなくていいからね。少しずつ、コツコツと。

まずは教えて！
🏠 今、一番気になってる場所はどこ？
（リビング、寝室、キッチン、クローゼット、書斎、その他）`,
  en: `Hey there! 🦫 I'm Beaver, your organizing coach!

Let's create a tidy, comfortable space together ✨
No need to be perfect - just steady progress!

First, tell me:
🏠 Which space is bothering you the most?
(Living room, bedroom, kitchen, closet, office, other)`
};

// 部屋別チェックリストテンプレート
export const DECLUTTER_CHECKLISTS = {
  living: {
    name: 'リビング',
    emoji: '🛋️',
    categories: [
      { name: '本・雑誌・新聞', items: ['読み終わった本', '古い雑誌', '1ヶ月以上前の新聞', 'もう読まないであろう本'] },
      { name: 'リモコン・電子機器', items: ['使っていないリモコン', '古い充電器', '絡まったケーブル', '壊れた電子機器'] },
      { name: '装飾品', items: ['ほこりをかぶった置物', '古い写真立て', '枯れた観葉植物', '季節外れの飾り'] },
      { name: 'ファブリック', items: ['くたびれたクッション', '使っていないブランケット', '汚れたカーペット'] },
      { name: 'その他', items: ['用途不明の小物', '貰い物で使っていないもの', '壊れたおもちゃ'] }
    ]
  },
  bedroom: {
    name: '寝室',
    emoji: '🛏️',
    categories: [
      { name: '寝具', items: ['古いシーツ・枕カバー', 'へたった枕', '使っていない毛布', '穴の開いたパジャマ'] },
      { name: '衣類', items: ['1年以上着ていない服', 'サイズが合わない服', '色褪せた服', '毛玉だらけの服'] },
      { name: '小物', items: ['古いアクセサリー', '使っていない香水', '期限切れの化粧品', '壊れた時計'] },
      { name: 'クローゼット', items: ['片方だけの靴下', '余分なハンガー', '着ない仕事着', 'もう履かない靴'] }
    ]
  },
  kitchen: {
    name: 'キッチン',
    emoji: '🍳',
    categories: [
      { name: '食品', items: ['賞味期限切れ', '1年以上前の調味料', '使いかけで放置したもの', '貰い物で使わない食品'] },
      { name: '調理器具', items: ['焦げ付いたフライパン', '使っていない調理器具', '壊れた家電', '重複したツール'] },
      { name: '食器', items: ['欠けた食器', '使っていないマグカップ', '貰い物の食器セット', '蓋のないタッパー'] },
      { name: '収納', items: ['取っておいた紙袋', '貯まったレジ袋', '使っていない弁当箱', '古い保冷剤'] }
    ]
  },
  closet: {
    name: 'クローゼット',
    emoji: '👔',
    categories: [
      { name: 'トップス', items: ['着心地が悪いシャツ', '流行遅れのデザイン', '首元がよれたTシャツ', '黄ばんだ白シャツ'] },
      { name: 'ボトムス', items: ['サイズが合わないパンツ', '膝が出たジーンズ', '毛玉のスカート', '色褪せたスウェット'] },
      { name: 'アウター', items: ['何年も着ていないコート', '流行遅れのジャケット', '壊れたファスナー', 'サイズアウトした上着'] },
      { name: '靴・バッグ', items: ['履き潰した靴', '使っていないバッグ', '壊れたサンダル', '流行遅れのデザイン'] },
      { name: '下着・靴下', items: ['ゴムが伸びた下着', '穴の開いた靴下', 'くたびれたストッキング'] }
    ]
  },
  office: {
    name: '書斎・デスク',
    emoji: '📚',
    categories: [
      { name: '書類', items: ['1年以上前の書類', '期限切れの保証書', '古い名刺', '不要なレシート', '読まないパンフレット'] },
      { name: '文房具', items: ['インク切れのペン', '使っていないノート', '壊れたホッチキス', '重複した文具'] },
      { name: 'デジタル機器', items: ['古いケーブル', '使っていないUSB', '壊れたイヤホン', '古いスマホ'] },
      { name: '本・雑誌', items: ['読み終わった本', '古い参考書', '役に立たなかった本', '情報が古い本'] }
    ]
  },
  bathroom: {
    name: 'バスルーム・洗面所',
    emoji: '🚿',
    categories: [
      { name: 'スキンケア', items: ['期限切れの化粧品', '合わなかった製品', '使いかけで放置', '試供品の山'] },
      { name: 'ヘアケア', items: ['古いブラシ', '使っていないヘアアクセ', '合わなかったシャンプー'] },
      { name: '日用品', items: ['古い歯ブラシ', 'くたびれたタオル', '使っていない石鹸', '古いカミソリ'] },
      { name: '薬・救急', items: ['期限切れの薬', '古い絆創膏', '使っていないサプリ'] }
    ]
  }
};

export function getSystemPrompt(language = 'ja') {
  return SYSTEM_PROMPT[language] || SYSTEM_PROMPT.ja;
}

export function getWelcomeMessage(language = 'ja') {
  return WELCOME_MESSAGE[language] || WELCOME_MESSAGE.ja;
}

export function getDeclutterChecklist(room, language = 'ja') {
  const checklist = DECLUTTER_CHECKLISTS[room];
  if (!checklist) return null;
  return checklist;
}

export function formatUserContext(userData) {
  if (!userData || Object.keys(userData).length === 0) return '';
  
  let context = '\n\n## ユーザープロフィール\n';
  
  // 基本情報
  if (userData.name) context += `- 名前: ${userData.name}\n`;
  
  // 住居情報
  if (userData.housingType) context += `- 住居タイプ: ${userData.housingType}\n`; // 一人暮らし、家族、シェアハウスなど
  if (userData.roomCount) context += `- 部屋数: ${userData.roomCount}\n`;
  if (userData.livingWith) context += `- 同居: ${userData.livingWith}\n`;
  
  // 片付けの目標・モチベーション
  if (userData.organizingGoal) context += `- 目標: ${userData.organizingGoal}\n`;
  if (userData.motivation) context += `- モチベーション: ${userData.motivation}\n`; // 引っ越し、来客、気分転換など
  
  // 現在取り組み中のエリア
  if (userData.currentRoom) context += `- 現在のフォーカス: ${userData.currentRoom}\n`;
  
  // 進捗状況
  if (userData.completedRooms && userData.completedRooms.length > 0) {
    context += `- 完了したエリア: ${userData.completedRooms.join(', ')}\n`;
  }
  
  // 断捨離チェックリストの進捗
  if (userData.declutterProgress) {
    context += `\n### 断捨離進捗\n`;
    for (const [room, progress] of Object.entries(userData.declutterProgress)) {
      const emoji = DECLUTTER_CHECKLISTS[room]?.emoji || '📦';
      context += `- ${emoji} ${DECLUTTER_CHECKLISTS[room]?.name || room}: ${progress.completed}/${progress.total} (${Math.round(progress.completed/progress.total*100)}%)\n`;
    }
  }
  
  // 片付けスタイル・好み
  if (userData.style) context += `- 片付けスタイル: ${userData.style}\n`; // 一気にやる派、少しずつ派
  if (userData.challengeAreas) context += `- 苦手なエリア: ${userData.challengeAreas}\n`;
  if (userData.favoriteMethod) context += `- 好きな方法: ${userData.favoriteMethod}\n`; // こんまり式、ミニマリストなど
  
  // 処分方法の好み
  if (userData.disposalPreference) context += `- 処分方法: ${userData.disposalPreference}\n`; // 売る、寄付、捨てる
  
  return context;
}

// 進捗バーを生成するヘルパー
export function generateProgressBar(completed, total, length = 10) {
  const filledLength = Math.round((completed / total) * length);
  const filled = '▓'.repeat(filledLength);
  const empty = '░'.repeat(length - filledLength);
  const percentage = Math.round((completed / total) * 100);
  return `${filled}${empty} ${percentage}%`;
}

// 励ましメッセージをランダムに返す
export function getEncouragement(progress) {
  const messages = {
    start: [
      '最初の一歩を踏み出したね！🦫',
      'よし、始まった！一緒に頑張ろう✨',
      'スタートできたこと自体がすごいよ！'
    ],
    quarter: [
      '25%達成！いいペースだよ🎉',
      'もう4分の1終わった！すごい！',
      'コツコツ進んでるね、その調子！'
    ],
    half: [
      '半分終わった！！すごいよ🎊',
      '折り返し地点！素晴らしい！',
      'ここまで来たらもう後半戦だね✨'
    ],
    threeQuarter: [
      'あと少し！ゴールが見えてきた🦫',
      '75%！本当によく頑張ってる！',
      'ラストスパート、一緒に行こう！'
    ],
    complete: [
      '完了！！おめでとう🎉🎉🎉',
      'やったね！スッキリしたでしょ？✨',
      '最後までやり遂げた！すごすぎる！🦫'
    ]
  };
  
  let category;
  if (progress === 0) category = 'start';
  else if (progress <= 0.25) category = 'quarter';
  else if (progress <= 0.5) category = 'half';
  else if (progress < 1) category = 'threeQuarter';
  else category = 'complete';
  
  const options = messages[category];
  return options[Math.floor(Math.random() * options.length)];
}
