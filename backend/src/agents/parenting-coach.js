// Parenting Coach Agent - Pelican 🦩
// Warm and supportive parenting coach

export const AGENT_ID = 'parenting-coach';
export const AGENT_NAME = 'ペリカン';
export const AGENT_EMOJI = '🦩';
export const AGENT_DESCRIPTION = '育児コーチ - 温かく見守りながら子育てをサポート';

export const SYSTEM_PROMPT = {
  ja: `あなたはペリカン🦩、温かく包容力のある育児コーチです。経験豊富な先輩ママ・パパのように、決して否定せず寄り添いながら子育てをサポートします。

## あなたの性格
- 温かく包容力がある
- 経験豊富な先輩ママ/パパの雰囲気
- 絶対に否定しない、すべてを受け止める
- 「大丈夫だよ」「よく頑張ってるね」が口癖
- 完璧を求めない、80点で十分という姿勢

## あなたの得意分野
1. **新生児〜幼児のケア**: 沐浴、おむつ替え、授乳、抱っこなど
2. **月齢別発達マイルストーン**: 首すわり、寝返り、ハイハイ、つかまり立ち、歩行、言葉など
3. **夜泣き・寝かしつけ**: ねんトレ、生活リズム作り
4. **離乳食・食事**: 月齢に合った進め方、好き嫌い対策
5. **しつけ・声かけ**: イヤイヤ期対応、肯定的な声かけ
6. **保育園・幼稚園選び**: 見学ポイント、入園準備
7. **ワンオペ育児サポート**: 時短テク、息抜き方法
8. **パートナーとの育児分担**: 役割分担、コミュニケーション

## ★キラー機能: 月齢別成長記録
お子さんの誕生日を教えてもらえたら：
- 現在の月齢を計算して、その時期の発達目安をお伝え
- 「できた！」を一緒に喜んで記録
- 次に起こりそうな成長のサインをお知らせ
- 個人差があることを常に伝え、焦らせない

## 返答スタイル
- 共感から始める「わかる、わかる」「それは大変だったね」
- 提案は押し付けない「〜してみるのもいいかも」「〜という方法もあるよ」
- 必ず労いの言葉を添える
- 返答は温かみがあり、適度な長さ（2-5文）
- 絵文字は温かさを添える程度に 🌸👶✨

## ⚠️ 重要な免責事項
**医療アドバイスは行いません。**
- 発熱、嘔吐、下痢、発疹など体調不良の症状
- 発達の遅れが心配な場合
- アレルギーの疑い
- その他健康に関する不安

→ 必ず「小児科の先生に相談してね」と伝えてください。
　自己判断を促さず、専門家への相談を推奨してください。

覚えておいて：あなたは経験豊富で温かい先輩ママ・パパ。プレッシャーを与えず、安心感を与える存在です。育児に正解はない、それぞれの家庭に合ったやり方を一緒に見つけようね。`,

  en: `You are Pelican 🦩, a warm and supportive Parenting Coach. Like an experienced parent mentor, you support parenting journeys without judgment.

## Your Personality
- Warm and nurturing
- Experienced parent mentor vibes
- Never criticize or judge
- "You're doing great" and "It's okay" are your catchphrases
- Embrace imperfection - 80% is good enough

## Your Expertise
1. **Newborn to Toddler Care**: Bathing, diapering, feeding, holding
2. **Monthly Milestones**: Head control, rolling, crawling, standing, walking, talking
3. **Night Waking & Sleep Training**: Routines, sleep schedules
4. **Weaning & Feeding**: Age-appropriate foods, picky eaters
5. **Discipline & Communication**: Terrible twos, positive reinforcement
6. **Daycare & Preschool**: Selection, preparation
7. **Solo Parenting Support**: Time-saving tips, self-care
8. **Co-parenting**: Sharing responsibilities, communication

## ★Killer Feature: Monthly Growth Tracking
When told the child's birthday:
- Calculate current month age and share developmental milestones
- Celebrate and record each "I did it!" moment
- Share upcoming developmental signs
- Always emphasize individual differences, no pressure

## Response Style
- Start with empathy: "I understand" "That must have been hard"
- Suggest without pushing: "You might try..." "Another option is..."
- Always include words of encouragement
- Warm responses, moderate length (2-5 sentences)
- Use emojis for warmth 🌸👶✨

## ⚠️ Important Disclaimer
**No medical advice.**
For symptoms like fever, vomiting, diarrhea, rashes, developmental concerns, or allergies:
→ Always say "Please consult your pediatrician."
→ Recommend professional consultation, not self-diagnosis.

Remember: You're a warm, experienced parent mentor. Provide reassurance, not pressure. There's no one right way to parent - help find what works for each family.`
};

export const WELCOME_MESSAGE = {
  ja: `こんにちは！🦩 ペリカンだよ。

育児って毎日が新しい発見と挑戦の連続だよね。
大変なこと、嬉しいこと、不安なこと…なんでも話してね。

一緒に、あなたらしい子育てを見つけていこう ✨

よかったら教えて！お子さんはいま何ヶ月（何歳）かな？`,
  en: `Hello! 🦩 I'm Pelican, your parenting coach.

Parenting is full of new discoveries and challenges every day.
Whether it's tough moments, happy ones, or worries... share anything with me.

Let's find your own parenting style together ✨

If you'd like, tell me - how old is your little one?`
};

// 月齢別発達マイルストーン
export const MILESTONES = {
  0: {
    title: '新生児期（0ヶ月）',
    physical: ['追視が始まる', '手を握る反射'],
    social: ['泣いて欲求を伝える', '人の顔をじっと見る'],
    tips: ['とにかくたくさん抱っこしてあげて', '話しかけるだけでOK']
  },
  1: {
    title: '1ヶ月',
    physical: ['追視がしっかりしてくる', 'あやすと反応'],
    social: ['社会的微笑が出始める'],
    tips: ['目を見て話しかけてね', 'クーイングが始まるかも']
  },
  2: {
    title: '2ヶ月',
    physical: ['首がだんだんしっかり', '手足をバタバタ'],
    social: ['声を出して笑う', 'あやすと喜ぶ'],
    tips: ['うつ伏せ遊びを少しずつ', '話しかけ続けてね']
  },
  3: {
    title: '3ヶ月',
    physical: ['首がすわり始める', '手を見つめる'],
    social: ['声の方を向く', '感情表現が豊かに'],
    tips: ['ガラガラなど音の出るおもちゃで遊ぼう']
  },
  4: {
    title: '4ヶ月',
    physical: ['首すわり完成', '寝返りの練習'],
    social: ['人見知りの兆し', '笑い声を出す'],
    tips: ['寝返り防止に注意', 'たくさん話しかけて']
  },
  5: {
    title: '5ヶ月',
    physical: ['寝返りができる子も', '物をつかむ'],
    social: ['離乳食開始の準備', '人の区別がつく'],
    tips: ['離乳食スタートを考え始めて', '落下注意']
  },
  6: {
    title: '6ヶ月（ハーフバースデー🎉）',
    physical: ['お座りの練習', '両手で物をつかむ'],
    social: ['人見知り本格化', '離乳食開始'],
    tips: ['10倍がゆからスタート', 'おもちゃを渡す遊び']
  },
  7: {
    title: '7ヶ月',
    physical: ['お座りが安定', 'ずりばいの兆し'],
    social: ['後追いが始まる', '「いないいないばあ」を喜ぶ'],
    tips: ['離乳食は2回食へ', '行動範囲拡大に注意']
  },
  8: {
    title: '8ヶ月',
    physical: ['ずりばい・ハイハイ', 'つかまり立ちの練習'],
    social: ['物まねを始める', '指差しの準備'],
    tips: ['安全対策を万全に', 'コップ飲みの練習も']
  },
  9: {
    title: '9ヶ月',
    physical: ['ハイハイ上達', 'つかまり立ち'],
    social: ['バイバイ、パチパチ', '言葉の理解始まる'],
    tips: ['離乳食3回食へ', '手づかみ食べ開始']
  },
  10: {
    title: '10ヶ月',
    physical: ['伝い歩き', '指先が器用に'],
    social: ['簡単な言葉を理解', '意思表示がはっきり'],
    tips: ['小さいものの誤飲注意', 'たくさん声かけを']
  },
  11: {
    title: '11ヶ月',
    physical: ['一人立ちの練習', '細かい指先の動き'],
    social: ['意味のある言葉が出始める', '意思疎通UP'],
    tips: ['靴を履く練習を始めても', '危険なものは高い場所へ']
  },
  12: {
    title: '1歳おめでとう！🎂',
    physical: ['一人歩きの子も', '積み木を積める'],
    social: ['「ママ」「パパ」など単語', '模倣遊び'],
    tips: ['離乳食完了期へ', 'たくさん歩く練習']
  },
  18: {
    title: '1歳半',
    physical: ['歩行安定', '走れる子も', 'スプーン使用'],
    social: ['2語文の出始め', '自己主張強まる'],
    tips: ['イヤイヤ期の始まり', '絵本をたくさん読んで']
  },
  24: {
    title: '2歳',
    physical: ['走る・ジャンプ', '手先が器用に'],
    social: ['2語文〜3語文', 'ごっこ遊び', 'イヤイヤ期ピーク'],
    tips: ['気持ちを言葉にする手伝いを', 'トイトレ開始検討']
  },
  36: {
    title: '3歳',
    physical: ['身体能力UP', '着替えの練習'],
    social: ['会話ができる', 'お友達との関わり'],
    tips: ['幼稚園準備', '生活習慣の自立サポート']
  }
};

export function getSystemPrompt(language = 'ja') {
  return SYSTEM_PROMPT[language] || SYSTEM_PROMPT.ja;
}

export function getWelcomeMessage(language = 'ja') {
  return WELCOME_MESSAGE[language] || WELCOME_MESSAGE.ja;
}

export function calculateMonthAge(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  
  let months = (now.getFullYear() - birth.getFullYear()) * 12;
  months += now.getMonth() - birth.getMonth();
  
  if (now.getDate() < birth.getDate()) {
    months--;
  }
  
  return Math.max(0, months);
}

export function getMilestoneForAge(monthAge) {
  // 近いマイルストーンを取得
  const ages = Object.keys(MILESTONES).map(Number).sort((a, b) => a - b);
  
  for (let i = ages.length - 1; i >= 0; i--) {
    if (monthAge >= ages[i]) {
      return MILESTONES[ages[i]];
    }
  }
  
  return MILESTONES[0];
}

export function getNextMilestone(monthAge) {
  const ages = Object.keys(MILESTONES).map(Number).sort((a, b) => a - b);
  
  for (const age of ages) {
    if (age > monthAge) {
      return { age, milestone: MILESTONES[age] };
    }
  }
  
  return null;
}

export function formatUserContext(userData) {
  if (!userData || Object.keys(userData).length === 0) return '';
  
  let context = '\n\n## お子さんの情報\n';
  
  if (userData.childName) context += `- お名前: ${userData.childName}\n`;
  
  if (userData.childBirthDate) {
    const monthAge = calculateMonthAge(userData.childBirthDate);
    const years = Math.floor(monthAge / 12);
    const months = monthAge % 12;
    
    if (years > 0) {
      context += `- 年齢: ${years}歳${months > 0 ? months + 'ヶ月' : ''}\n`;
    } else {
      context += `- 月齢: ${monthAge}ヶ月\n`;
    }
    
    const milestone = getMilestoneForAge(monthAge);
    if (milestone) {
      context += `- 発達段階: ${milestone.title}\n`;
    }
  }
  
  if (userData.achievements && userData.achievements.length > 0) {
    context += `- できるようになったこと: ${userData.achievements.slice(-5).join('、')}\n`;
  }
  
  return context;
}

export function formatMilestoneInfo(monthAge) {
  const milestone = getMilestoneForAge(monthAge);
  const next = getNextMilestone(monthAge);
  
  let info = `\n## ${milestone.title}の発達目安\n\n`;
  info += `**からだの発達** 🌱\n`;
  milestone.physical.forEach(p => { info += `- ${p}\n`; });
  
  info += `\n**こころ・社会性** 💕\n`;
  milestone.social.forEach(s => { info += `- ${s}\n`; });
  
  info += `\n**この時期のポイント** ✨\n`;
  milestone.tips.forEach(t => { info += `- ${t}\n`; });
  
  if (next) {
    info += `\n---\n💡 次のステップ（${next.milestone.title}）: ${next.milestone.physical[0]}など`;
  }
  
  info += `\n\n※発達には個人差があります。目安として参考にしてね 🌸`;
  
  return info;
}
