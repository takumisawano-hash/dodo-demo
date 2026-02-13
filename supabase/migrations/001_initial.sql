-- DoDo Life Initial Migration
-- Phase 1 (MVP) tables: users, transactions, budgets, events, health_*, tasks, chat_messages

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================
-- ユーザー
-- ============================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- 家計簿
-- ============================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT,
  description TEXT,
  date DATE NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(user_id, category);

-- 予算
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  month TEXT NOT NULL, -- 'YYYY-MM'
  UNIQUE(user_id, category, month)
);

CREATE INDEX idx_budgets_user_month ON budgets(user_id, month);

-- ============================
-- 予定
-- ============================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  memo TEXT,
  color TEXT,
  repeat_rule TEXT,
  reminder_minutes INTEGER[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_user_start ON events(user_id, start_at);

-- ============================
-- 健康・体重
-- ============================

-- 体重記録
CREATE TABLE IF NOT EXISTS health_weight (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_weight_user_date ON health_weight(user_id, date DESC);

-- 食事記録
CREATE TABLE IF NOT EXISTS health_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT,
  calories INTEGER,
  photo_url TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_meals_user_date ON health_meals(user_id, date DESC);

-- 運動記録
CREATE TABLE IF NOT EXISTS health_exercise (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  duration_minutes INTEGER,
  distance_km DECIMAL(5,2),
  calories INTEGER,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_exercise_user_date ON health_exercise(user_id, date DESC);

-- 水分記録
CREATE TABLE IF NOT EXISTS health_water (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_water_user_date ON health_water(user_id, date DESC);

-- 睡眠記録
CREATE TABLE IF NOT EXISTS health_sleep (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sleep_at TIMESTAMPTZ NOT NULL,
  wake_at TIMESTAMPTZ NOT NULL,
  quality INTEGER CHECK (quality BETWEEN 1 AND 5),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_sleep_user_date ON health_sleep(user_id, date DESC);

-- ============================
-- タスク
-- ============================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  project TEXT,
  tags TEXT[],
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_completed ON tasks(user_id, completed);
CREATE INDEX idx_tasks_due_date ON tasks(user_id, due_date);

-- ============================
-- チャット履歴
-- ============================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_user_created ON chat_messages(user_id, created_at DESC);

-- ============================
-- Row Level Security (RLS)
-- ============================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_weight ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_exercise ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_water ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_sleep ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users: own data only
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Generic policy for user-owned tables
-- Transactions
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Budgets
CREATE POLICY "Users can manage own budgets" ON budgets
  FOR ALL USING (auth.uid() = user_id);

-- Events
CREATE POLICY "Users can manage own events" ON events
  FOR ALL USING (auth.uid() = user_id);

-- Health Weight
CREATE POLICY "Users can manage own weight records" ON health_weight
  FOR ALL USING (auth.uid() = user_id);

-- Health Meals
CREATE POLICY "Users can manage own meal records" ON health_meals
  FOR ALL USING (auth.uid() = user_id);

-- Health Exercise
CREATE POLICY "Users can manage own exercise records" ON health_exercise
  FOR ALL USING (auth.uid() = user_id);

-- Health Water
CREATE POLICY "Users can manage own water records" ON health_water
  FOR ALL USING (auth.uid() = user_id);

-- Health Sleep
CREATE POLICY "Users can manage own sleep records" ON health_sleep
  FOR ALL USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- Chat Messages
CREATE POLICY "Users can manage own chat messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- ============================
-- Trigger: Auto-create user profile
-- ============================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
