-- ========================================
-- DoDo App - Chat History & User Profiles
-- Supabase Migration
-- ========================================

-- ----------------------------------------
-- 1. 会話履歴テーブル
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coach_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  image_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_coach 
  ON chat_messages(user_id, coach_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created 
  ON chat_messages(created_at DESC);

-- RLS（行レベルセキュリティ）
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のメッセージのみアクセス可能
CREATE POLICY "Users can view own messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------
-- 2. ユーザープロフィール（コーチごと）
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS user_coach_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coach_id TEXT NOT NULL,
  
  -- ユーザー情報
  display_name TEXT,
  goals JSONB DEFAULT '[]'::jsonb,
  current_status JSONB DEFAULT '{}'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  important_events JSONB DEFAULT '[]'::jsonb,
  
  -- コーチの記憶
  memory_summary TEXT,
  last_summary_at TIMESTAMPTZ,
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- ユニーク制約
  UNIQUE(user_id, coach_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_coach_profiles_user 
  ON user_coach_profiles(user_id);

-- RLS
ALTER TABLE user_coach_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profiles" ON user_coach_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles" ON user_coach_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles" ON user_coach_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles" ON user_coach_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------
-- 3. コーチリクエストテーブル（新コーチ要望）
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS coach_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE coach_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert requests" ON coach_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can view requests" ON coach_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ----------------------------------------
-- 4. 更新トリガー
-- ----------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_coach_profiles_updated_at
  BEFORE UPDATE ON user_coach_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------
-- 5. セキュリティログテーブル（オプション）
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  coach_id TEXT,
  event_type TEXT NOT NULL,
  message_preview TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS（管理者のみ閲覧可能）
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security logs" ON security_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "System can insert security logs" ON security_logs
  FOR INSERT WITH CHECK (true);
