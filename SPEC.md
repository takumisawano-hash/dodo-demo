# DoDo Life - 完全仕様書

## コンセプト
1体のAIドードー🦤に何でも送ると自動分類して記録。
各カテゴリは「ミニアプリ」として専用UIで表示。
ミニアプリは日本の人気アプリの機能を80%以上再現する。

## 技術スタック
- **フレームワーク**: Expo + React Native (iOS/Android両対応)
- **バックエンド**: Supabase (DB + Auth + Edge Functions)
- **AI**: Claude API (自動分類・OCR・会話)
- **課金**: RevenueCat

## 画面構成
ボトムタブ: 🦤チャット / 📊ダッシュボード / 📁ミニアプリ一覧 / ⚙️設定

---

## ミニアプリ一覧（20個）

### Phase 1 (MVP) - 必須3個
1. 💰 **家計簿** - MoneyForward模倣
2. 📅 **予定** - TimeTree模倣
3. 💪 **健康・体重** - あすけん模倣

### Phase 2 - 重要7個
4. ✅ **タスク・ToDo** - Todoist模倣
5. 📚 **読書記録** - 読書メーター模倣
6. 🎬 **映画・ドラマ記録** - Filmarks模倣
7. 📍 **訪問記録** - Googleマップ保存模倣
8. 🏃 **運動・ワークアウト** - Nike Run模倣
9. 😴 **睡眠記録** - Sleep Cycle模倣
10. 💊 **服薬・サプリ** - お薬手帳模倣

### Phase 3 - 拡張7個
11. 🎯 **習慣トラッカー** - Habitify模倣
12. 📝 **日記・ジャーナル** - Day One模倣
13. 🛒 **買い物リスト** - Bring!模倣
14. 🎁 **ウィッシュリスト** - Amazon模倣
15. ✈️ **旅行計画** - TripIt模倣
16. 🚗 **車・給油記録** - Fuelio模倣
17. 💳 **ポイント・会員証** - 各種ポイントアプリ模倣

### Phase 4 - 特化3個
18. 👶 **育児記録** - ぴよログ模倣
19. 🐕 **ペット記録** - ペットノート模倣
20. 🌱 **植物・ガーデニング** - Planta模倣

---

## 各ミニアプリ詳細仕様

### 1. 💰 家計簿 (MoneyForward模倣 80%)

**必須機能:**
- 収入・支出の記録（金額、カテゴリ、日付、メモ）
- カテゴリ自動分類（食費、交通費、娯楽、日用品、etc）
- レシート写真からOCR自動入力
- 月別・カテゴリ別の円グラフ・棒グラフ
- 月の予算設定と残り表示
- カレンダービューで日別支出確認
- 収支サマリー（今月の収入・支出・残高）
- 過去データの検索・フィルタ

**UI構成:**
- トップ: 今月の収支サマリー（収入・支出・残高）
- 中央: 最近の取引リスト（スクロール）
- 下部: 「+」FABボタンで手動追加
- タブ: 一覧 / グラフ / カレンダー / 予算

**カテゴリ:**
食費、外食、交通費、日用品、娯楽、医療、教育、美容、衣服、住居、通信、保険、税金、その他

**入力例:**
- 「ランチ800円」→ 外食カテゴリで記録
- 「電車320円」→ 交通費で記録
- レシート写真 → OCRで金額・店名抽出

---

### 2. 📅 予定 (TimeTree模倣 80%)

**必須機能:**
- 予定の追加（タイトル、日時、場所、メモ）
- 月表示カレンダー
- 週表示カレンダー
- 日表示（タイムライン）
- 繰り返し予定（毎日、毎週、毎月、毎年）
- リマインダー通知（5分前、15分前、1時間前、1日前）
- 予定の色分け（8色）
- 終日予定対応
- 今日の予定ウィジェット

**UI構成:**
- トップ: 今日・明日の予定サマリー
- 中央: カレンダービュー（月/週/日切替）
- 予定タップで詳細表示
- 「+」ボタンで新規作成

**入力例:**
- 「明日14時歯医者」→ 予定に追加
- 「毎週月曜にジム」→ 繰り返し予定
- 「来週金曜飲み会@渋谷」→ 場所付き予定

---

### 3. 💪 健康・体重 (あすけん模倣 80%)

**必須機能:**
- 体重記録・グラフ表示（折れ線グラフ）
- 目標体重設定
- 食事記録（朝・昼・夜・間食）
- 食事写真からAIカロリー推定
- カロリー収支表示（摂取カロリー - 基礎代謝 - 運動）
- 運動記録（種類、時間、消費カロリー）
- 水分摂取記録（コップ単位）
- 週間・月間レポート
- BMI自動計算

**UI構成:**
- トップ: 今日のサマリー（体重、カロリー、水分）
- 体重推移グラフ（期間切替）
- 食事タイムライン
- 記録ボタン群（体重、食事、運動、水分）

**入力例:**
- 「体重62.5kg」→ 体重記録
- 食事写真 → AI分析してカロリー推定
- 「30分走った」→ 運動記録

---

### 4. ✅ タスク・ToDo (Todoist模倣 80%)

**必須機能:**
- タスク追加（タイトル、期限、優先度）
- プロジェクト・フォルダ分類
- タグ・ラベル
- 繰り返しタスク
- 今日・明日・今週・全てのビュー
- 完了チェック・取り消し
- サブタスク対応
- 期限切れ通知

**入力例:**
- 「牛乳買う」→ タスク追加
- 「金曜までにレポート」→ 期限付きタスク

---

### 5. 📚 読書記録 (読書メーター模倣 80%)

**必須機能:**
- 本の登録（タイトル、著者、ISBN、表紙写真）
- ステータス管理（読書中・読了・積読・中断）
- 感想・評価（5段階★）
- 読書ページ数・進捗率
- 読了日記録
- 月間・年間読書冊数グラフ
- 本棚表示（グリッド）

**入力例:**
- 「〇〇読み始めた」→ 読書中に追加
- 「〇〇読み終わった★4」→ 読了+評価
- 本の表紙写真 → ISBNスキャンで登録

---

### 6. 🎬 映画・ドラマ記録 (Filmarks模倣 80%)

**必須機能:**
- 作品登録（タイトル、ポスター自動取得）
- 視聴日記録
- 感想・評価（5段階★）
- ステータス（観たい・観た）
- ジャンル別表示
- 視聴統計（月間・年間）

**入力例:**
- 「〇〇観た」→ 視聴記録
- 「〇〇面白かった★5」→ 評価付き

---

### 7. 📍 訪問記録 (Googleマップ保存模倣 80%)

**必須機能:**
- 場所の記録（店名、住所、写真）
- カテゴリ（飲食、観光、ショップ、カフェ等）
- 評価・メモ
- 地図上にピン表示
- 「また行きたい」リスト
- 訪問回数カウント

**入力例:**
- 写真+「ここ良かった」→ 場所記録
- 「〇〇行った」→ 訪問記録

---

### 8. 🏃 運動・ワークアウト (Nike Run模倣 80%)

**必須機能:**
- 運動記録（種類、時間、距離）
- 消費カロリー自動計算
- 運動種類（ランニング、ウォーキング、筋トレ、ヨガ、水泳等）
- 週間・月間グラフ
- 連続記録日数（ストリーク）

**入力例:**
- 「5km走った」→ ランニング記録
- 「筋トレ30分」→ 筋トレ記録

---

### 9. 😴 睡眠記録 (Sleep Cycle模倣 80%)

**必須機能:**
- 睡眠時間記録（就寝・起床時刻）
- 睡眠品質評価（1-5）
- 週間・月間グラフ
- 平均睡眠時間表示
- 目標睡眠時間設定
- 睡眠負債計算

**入力例:**
- 「7時間寝た」→ 睡眠記録
- 「23時に寝て7時に起きた」→ 詳細記録

---

### 10. 💊 服薬・サプリ (お薬手帳模倣 80%)

**必須機能:**
- 薬・サプリ登録（名前、用量、頻度）
- 服用記録・チェック
- リマインダー通知
- 残量管理・補充アラート
- 服用履歴カレンダー

**入力例:**
- 「薬飲んだ」→ 服用チェック
- 「ビタミンC飲んだ」→ サプリ記録

---

### 11-20: 同様のフォーマットで機能定義（省略）

---

## DB設計 (Supabase)

```sql
-- ユーザー
users (
  id UUID PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP
)

-- 家計簿
transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  amount INTEGER NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  category TEXT,
  description TEXT,
  date DATE,
  receipt_url TEXT,
  created_at TIMESTAMP
)

-- 予算
budgets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  category TEXT,
  amount INTEGER,
  month TEXT -- 'YYYY-MM'
)

-- 予定
events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  title TEXT NOT NULL,
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  memo TEXT,
  color TEXT,
  repeat_rule TEXT,
  reminder_minutes INTEGER[],
  created_at TIMESTAMP
)

-- 体重記録
health_weight (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  weight DECIMAL(5,2),
  date DATE,
  created_at TIMESTAMP
)

-- 食事記録
health_meals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT,
  calories INTEGER,
  photo_url TEXT,
  date DATE,
  created_at TIMESTAMP
)

-- 運動記録
health_exercise (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  exercise_type TEXT,
  duration_minutes INTEGER,
  distance_km DECIMAL(5,2),
  calories INTEGER,
  date DATE,
  created_at TIMESTAMP
)

-- 水分記録
health_water (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  amount_ml INTEGER,
  date DATE,
  created_at TIMESTAMP
)

-- 睡眠記録
health_sleep (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  sleep_at TIMESTAMP,
  wake_at TIMESTAMP,
  quality INTEGER CHECK (quality BETWEEN 1 AND 5),
  date DATE,
  created_at TIMESTAMP
)

-- タスク
tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  title TEXT NOT NULL,
  due_date TIMESTAMP,
  priority INTEGER DEFAULT 0,
  project TEXT,
  tags TEXT[],
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  parent_id UUID REFERENCES tasks,
  created_at TIMESTAMP
)

-- 読書記録
books (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  cover_url TEXT,
  status TEXT CHECK (status IN ('reading', 'completed', 'want', 'stopped')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  pages_total INTEGER,
  pages_read INTEGER,
  started_at DATE,
  completed_at DATE,
  created_at TIMESTAMP
)

-- 映画記録
movies (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  title TEXT NOT NULL,
  poster_url TEXT,
  status TEXT CHECK (status IN ('watched', 'want')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  watched_at DATE,
  created_at TIMESTAMP
)

-- 訪問記録
places (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  category TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  memo TEXT,
  photo_urls TEXT[],
  visit_count INTEGER DEFAULT 1,
  want_to_revisit BOOLEAN DEFAULT FALSE,
  last_visited_at DATE,
  created_at TIMESTAMP
)

-- 服薬記録
medications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  remaining INTEGER,
  created_at TIMESTAMP
)

medication_logs (
  id UUID PRIMARY KEY,
  medication_id UUID REFERENCES medications,
  taken_at TIMESTAMP,
  created_at TIMESTAMP
)

-- 習慣
habits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  name TEXT NOT NULL,
  frequency TEXT, -- 'daily', 'weekly:mon,wed,fri'
  created_at TIMESTAMP
)

habit_logs (
  id UUID PRIMARY KEY,
  habit_id UUID REFERENCES habits,
  date DATE,
  completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP
)

-- 日記
journal_entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  content TEXT,
  mood TEXT,
  photo_urls TEXT[],
  date DATE,
  created_at TIMESTAMP
)

-- 買い物リスト
shopping_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  name TEXT NOT NULL,
  category TEXT,
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
)

-- ウィッシュリスト
wishlist_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  name TEXT NOT NULL,
  price INTEGER,
  url TEXT,
  photo_url TEXT,
  priority INTEGER DEFAULT 0,
  purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
)

-- 旅行計画
trips (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  destination TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  budget INTEGER,
  created_at TIMESTAMP
)

trip_items (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips,
  type TEXT, -- 'flight', 'hotel', 'activity', 'checklist'
  title TEXT,
  datetime TIMESTAMP,
  details JSONB,
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
)

-- 車記録
car_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  type TEXT CHECK (type IN ('fuel', 'maintenance')),
  amount INTEGER,
  liters DECIMAL(5,2),
  odometer INTEGER,
  description TEXT,
  date DATE,
  created_at TIMESTAMP
)

-- ポイントカード
point_cards (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  name TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  barcode_data TEXT,
  expiry_date DATE,
  created_at TIMESTAMP
)

-- 育児記録
baby_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  baby_name TEXT,
  type TEXT, -- 'milk', 'diaper', 'sleep', 'growth'
  details JSONB,
  datetime TIMESTAMP,
  created_at TIMESTAMP
)

-- ペット記録
pet_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  pet_name TEXT,
  type TEXT, -- 'meal', 'walk', 'health', 'photo'
  details JSONB,
  datetime TIMESTAMP,
  created_at TIMESTAMP
)

-- 植物記録
plant_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  plant_name TEXT,
  type TEXT, -- 'water', 'fertilize', 'photo'
  photo_url TEXT,
  datetime TIMESTAMP,
  created_at TIMESTAMP
)

-- チャット履歴
chat_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP
)
```

---

## AI自動分類ロジック

ユーザー入力 → Claude API で解析 → カテゴリ判定 → 該当テーブルに記録

### 分類プロンプト

```
ユーザーの入力を分析し、以下のカテゴリに分類してください:

カテゴリ:
- finance: 家計簿（お金、支出、収入、買い物）
- calendar: 予定（〇〇に行く、会議、約束）
- health: 健康（体重、食事、運動、水分）
- task: タスク（〇〇する、買う、やること）
- book: 読書（本、読む）
- movie: 映画（観た、映画、ドラマ）
- place: 場所（行った、店、レストラン）
- sleep: 睡眠（寝た、起きた）
- medication: 服薬（薬、サプリ、飲んだ）
- habit: 習慣（〇〇した、毎日の行動）
- journal: 日記（今日は〇〇、気分）
- shopping: 買い物リスト（買わなきゃ、必要）
- wishlist: 欲しいもの（欲しい、買いたい）
- travel: 旅行（旅行、行く予定の場所）
- car: 車（ガソリン、給油、メンテ）
- baby: 育児（ミルク、おむつ）
- pet: ペット（散歩、ご飯、ペット名）
- plant: 植物（水やり、植物名）

JSON形式で返答:
{
  "category": "カテゴリ名",
  "data": { 抽出したデータ },
  "response": "ドードーとしての返答"
}
```

---

## ドードーのキャラクター設定

- タメ口で親しみやすい
- 絵文字多め 🦤💪✨
- たまに自虐「僕みたいに絶滅しないでね」「継続は大事だよ、僕は続けられなかったから...」
- 励まし上手「すごい！」「いいね！」
- 記録後は必ず確認メッセージ

---

## 開発分担（サブエージェント）

1. **Core Agent**: プロジェクト初期化、ナビゲーション、共通コンポーネント
2. **DB Agent**: Supabaseスキーマ、マイグレーション
3. **AI Agent**: Edge Function、自動分類ロジック
4. **Chat Agent**: チャット画面、メッセージUI
5. **Finance Agent**: 家計簿ミニアプリ
6. **Calendar Agent**: 予定ミニアプリ
7. **Health Agent**: 健康ミニアプリ
8. **Task Agent**: タスクミニアプリ
