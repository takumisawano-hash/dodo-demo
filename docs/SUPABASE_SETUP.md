# DoDo App - Supabase セットアップガイド

## 概要

DoDoアプリはSupabaseをバックエンドとして使用します。このドキュメントでは、テーブル設計とセットアップ手順を説明します。

## 必要な環境変数

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## テーブル設計

### 1. user_profiles - ユーザープロフィール

```sql
-- ユーザープロフィールテーブル
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- RLS (Row Level Security) ポリシー
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Public profiles are viewable by everyone"
  ON user_profiles FOR SELECT
  USING (true);

-- 本人のみ編集可能
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- 本人のみ挿入可能
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 本人のみ削除可能
CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  USING (auth.uid() = id);
```

### 2. slot_configs - スロット設定

```sql
-- スロット設定テーブル
CREATE TABLE slot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 10),
  name TEXT NOT NULL,
  character_id TEXT,
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 各ユーザーのスロット番号は一意
  UNIQUE (user_id, slot_number)
);

-- インデックス
CREATE INDEX idx_slot_configs_user_id ON slot_configs(user_id);
CREATE INDEX idx_slot_configs_active ON slot_configs(user_id, is_active) WHERE is_active = true;

-- RLS ポリシー
ALTER TABLE slot_configs ENABLE ROW LEVEL SECURITY;

-- 本人のみ閲覧可能
CREATE POLICY "Users can view own slots"
  ON slot_configs FOR SELECT
  USING (auth.uid() = user_id);

-- 本人のみ挿入可能
CREATE POLICY "Users can insert own slots"
  ON slot_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 本人のみ更新可能
CREATE POLICY "Users can update own slots"
  ON slot_configs FOR UPDATE
  USING (auth.uid() = user_id);

-- 本人のみ削除可能
CREATE POLICY "Users can delete own slots"
  ON slot_configs FOR DELETE
  USING (auth.uid() = user_id);
```

### 3. conversations - 会話

```sql
-- 会話テーブル
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES slot_configs(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_slot_id ON conversations(slot_id);
CREATE INDEX idx_conversations_updated_at ON conversations(user_id, updated_at DESC);

-- RLS ポリシー
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 本人のみ閲覧可能
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

-- 本人のみ挿入可能
CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 本人のみ更新可能
CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- 本人のみ削除可能
CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);
```

### 4. conversation_messages - 会話メッセージ

```sql
-- 会話メッセージテーブル
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX idx_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX idx_messages_created_at ON conversation_messages(conversation_id, created_at);

-- RLS ポリシー
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- 会話の所有者のみ閲覧可能
CREATE POLICY "Users can view messages of own conversations"
  ON conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- 会話の所有者のみ挿入可能
CREATE POLICY "Users can insert messages to own conversations"
  ON conversation_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- 会話の所有者のみ削除可能
CREATE POLICY "Users can delete messages from own conversations"
  ON conversation_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );
```

## 自動更新トリガー

```sql
-- updated_at を自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slot_configs_updated_at
  BEFORE UPDATE ON slot_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 新規ユーザー用の自動プロフィール作成

```sql
-- 新規ユーザー登録時に自動でプロフィールを作成
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'display_name'
  );
  
  -- デフォルトスロットを作成
  INSERT INTO slot_configs (user_id, slot_number, name, is_active)
  VALUES 
    (NEW.id, 1, 'Default', true),
    (NEW.id, 2, 'Slot 2', false),
    (NEW.id, 3, 'Slot 3', false);
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users テーブルへのトリガー
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名とパスワードを設定
4. リージョンを選択（Tokyo推奨）

### 2. データベースのセットアップ

1. Supabaseダッシュボードで **SQL Editor** を開く
2. 上記のSQLを順番に実行:
   - テーブル作成
   - インデックス作成
   - RLSポリシー設定
   - トリガー設定

### 3. 環境変数の設定

1. ダッシュボードの **Settings > API** を開く
2. 以下の値をコピー:
   - Project URL → `EXPO_PUBLIC_SUPABASE_URL`
   - anon public key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

3. `.env` ファイルを作成:

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. 依存関係のインストール

```bash
npm install @supabase/supabase-js
```

### 5. 動作確認

```typescript
import { supabase, signUp, signIn } from './src/services/supabase';
import { getUserProfile, getSlotConfigs } from './src/services/database';

// テスト: サインアップ
const result = await signUp({
  email: 'test@example.com',
  password: 'password123',
  username: 'testuser'
});

if (result.success) {
  console.log('User created:', result.user?.id);
  
  // プロフィールとスロットは自動作成される
  const profile = await getUserProfile(result.user!.id);
  const slots = await getSlotConfigs(result.user!.id);
  
  console.log('Profile:', profile.data);
  console.log('Slots:', slots.data);
}
```

## ER図

```
┌─────────────────┐       ┌─────────────────┐
│   auth.users    │       │  user_profiles  │
│─────────────────│       │─────────────────│
│ id (PK)         │──1:1──│ id (PK, FK)     │
│ email           │       │ username        │
│ ...             │       │ display_name    │
└─────────────────┘       │ avatar_url      │
        │                 │ bio             │
        │                 └─────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────┐       ┌─────────────────┐
│  slot_configs   │       │  conversations  │
│─────────────────│       │─────────────────│
│ id (PK)         │──1:N──│ id (PK)         │
│ user_id (FK)    │       │ user_id (FK)    │
│ slot_number     │       │ slot_id (FK)    │
│ name            │       │ title           │
│ character_id    │       └────────┬────────┘
│ system_prompt   │                │
│ is_active       │                │ 1:N
└─────────────────┘                ▼
                          ┌─────────────────────┐
                          │ conversation_messages│
                          │─────────────────────│
                          │ id (PK)             │
                          │ conversation_id (FK)│
                          │ role                │
                          │ content             │
                          └─────────────────────┘
```

## トラブルシューティング

### RLSエラー

```
new row violates row-level security policy
```

→ 認証されていない状態でデータにアクセスしようとしています。`supabase.auth.signIn()` でログインしてください。

### 外部キー制約エラー

```
insert or update violates foreign key constraint
```

→ 参照先のレコードが存在しません。親テーブルに先にデータを作成してください。

### 重複エラー

```
duplicate key value violates unique constraint
```

→ 既に同じユーザー名やスロット番号が存在します。別の値を使用してください。

## 本番環境の注意点

1. **RLSを無効にしない** - 本番では必ずRLSを有効にしてください
2. **anon keyは公開可能** - クライアントサイドで使用するキーなので公開OK
3. **service_role keyは秘密** - サーバーサイドでのみ使用し、絶対に公開しない
4. **バックアップ設定** - Supabaseダッシュボードでバックアップを有効化
