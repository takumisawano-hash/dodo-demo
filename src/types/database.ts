/**
 * DoDo Life - Database Types
 * Supabaseのテーブル型定義
 */

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };

      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: 'income' | 'expense';
          category: string | null;
          description: string | null;
          date: string;
          receipt_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: 'income' | 'expense';
          category?: string | null;
          description?: string | null;
          date: string;
          receipt_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: 'income' | 'expense';
          category?: string | null;
          description?: string | null;
          date?: string;
          receipt_url?: string | null;
          created_at?: string;
        };
      };

      budgets: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          amount: number;
          month: string; // 'YYYY-MM'
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          amount: number;
          month: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          amount?: number;
          month?: string;
        };
      };

      events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          start_at: string | null;
          end_at: string | null;
          all_day: boolean;
          location: string | null;
          memo: string | null;
          color: string | null;
          repeat_rule: string | null;
          reminder_minutes: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          start_at?: string | null;
          end_at?: string | null;
          all_day?: boolean;
          location?: string | null;
          memo?: string | null;
          color?: string | null;
          repeat_rule?: string | null;
          reminder_minutes?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          start_at?: string | null;
          end_at?: string | null;
          all_day?: boolean;
          location?: string | null;
          memo?: string | null;
          color?: string | null;
          repeat_rule?: string | null;
          reminder_minutes?: number[] | null;
          created_at?: string;
        };
      };

      health_weight: {
        Row: {
          id: string;
          user_id: string;
          weight: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weight: number;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          weight?: number;
          date?: string;
          created_at?: string;
        };
      };

      health_meals: {
        Row: {
          id: string;
          user_id: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          description: string | null;
          calories: number | null;
          photo_url: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          description?: string | null;
          calories?: number | null;
          photo_url?: string | null;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          description?: string | null;
          calories?: number | null;
          photo_url?: string | null;
          date?: string;
          created_at?: string;
        };
      };

      health_exercise: {
        Row: {
          id: string;
          user_id: string;
          exercise_type: string;
          duration_minutes: number | null;
          distance_km: number | null;
          calories: number | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_type: string;
          duration_minutes?: number | null;
          distance_km?: number | null;
          calories?: number | null;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_type?: string;
          duration_minutes?: number | null;
          distance_km?: number | null;
          calories?: number | null;
          date?: string;
          created_at?: string;
        };
      };

      health_water: {
        Row: {
          id: string;
          user_id: string;
          amount_ml: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_ml: number;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount_ml?: number;
          date?: string;
          created_at?: string;
        };
      };

      health_sleep: {
        Row: {
          id: string;
          user_id: string;
          sleep_at: string;
          wake_at: string;
          quality: number | null; // 1-5
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sleep_at: string;
          wake_at: string;
          quality?: number | null;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sleep_at?: string;
          wake_at?: string;
          quality?: number | null;
          date?: string;
          created_at?: string;
        };
      };

      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          due_date: string | null;
          priority: number;
          project: string | null;
          tags: string[] | null;
          completed: boolean;
          completed_at: string | null;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          due_date?: string | null;
          priority?: number;
          project?: string | null;
          tags?: string[] | null;
          completed?: boolean;
          completed_at?: string | null;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          due_date?: string | null;
          priority?: number;
          project?: string | null;
          tags?: string[] | null;
          completed?: boolean;
          completed_at?: string | null;
          parent_id?: string | null;
          created_at?: string;
        };
      };

      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          image_url?: string | null;
          created_at?: string;
        };
      };

      goals: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          target_value: number;
          current_value: number;
          period: string;
          unit: string;
          start_date: string;
          end_date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          target_value: number;
          current_value: number;
          period: string;
          unit: string;
          start_date: string;
          end_date: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          target_value?: number;
          current_value?: number;
          period?: string;
          unit?: string;
          start_date?: string;
          end_date?: string;
          status?: string;
          created_at?: string;
        };
      };

      books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author: string | null;
          status: string;
          rating: number | null;
          review: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          author?: string | null;
          status?: string;
          rating?: number | null;
          review?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          author?: string | null;
          status?: string;
          rating?: number | null;
          review?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};

// Utility types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Convenience aliases
export type User = Tables<'users'>;
export type Transaction = Tables<'transactions'>;
export type Budget = Tables<'budgets'>;
export type Event = Tables<'events'>;
export type HealthWeight = Tables<'health_weight'>;
export type HealthMeal = Tables<'health_meals'>;
export type HealthExercise = Tables<'health_exercise'>;
export type HealthWater = Tables<'health_water'>;
export type HealthSleep = Tables<'health_sleep'>;
export type Task = Tables<'tasks'>;
export type ChatMessage = Tables<'chat_messages'>;
export type Goal = Tables<'goals'>;
export type Book = Tables<'books'>;

// カテゴリ定義
export const TRANSACTION_CATEGORIES = [
  '食費',
  '外食',
  '交通費',
  '日用品',
  '娯楽',
  '医療',
  '教育',
  '美容',
  '衣服',
  '住居',
  '通信',
  '保険',
  '税金',
  'その他',
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const EXERCISE_TYPES = [
  'ランニング',
  'ウォーキング',
  '筋トレ',
  'ヨガ',
  '水泳',
  'サイクリング',
  'その他',
] as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EVENT_COLORS = [
  '#FF6B6B', // red
  '#4ECDC4', // teal
  '#45B7D1', // blue
  '#96CEB4', // green
  '#FFEAA7', // yellow
  '#DDA0DD', // plum
  '#98D8C8', // mint
  '#F7DC6F', // gold
] as const;

export type EventColor = (typeof EVENT_COLORS)[number];
