/**
 * AI分類サービス - DoDo Life
 * ユーザー入力をClaudeで解析し、カテゴリ自動判定・データ抽出を行う
 */

import { supabase } from '../lib/supabase';

// 分類カテゴリ
export type Category =
  | 'finance'
  | 'calendar'
  | 'health'
  | 'task'
  | 'book'
  | 'movie'
  | 'place'
  | 'sleep'
  | 'medication'
  | 'habit'
  | 'journal'
  | 'shopping'
  | 'wishlist'
  | 'travel'
  | 'car'
  | 'baby'
  | 'pet'
  | 'plant';

// カテゴリごとのデータ型
export interface FinanceData {
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  description?: string;
  date?: string;
}

export interface CalendarData {
  title: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  location?: string;
  memo?: string;
}

export interface HealthData {
  weight?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealDescription?: string;
  calories?: number;
  exerciseType?: string;
  durationMinutes?: number;
  distanceKm?: number;
  waterMl?: number;
}

export interface TaskData {
  title: string;
  dueDate?: string;
  priority?: number;
  project?: string;
  tags?: string[];
}

export interface BookData {
  title: string;
  author?: string;
  status?: 'reading' | 'completed' | 'want' | 'stopped';
  rating?: number;
  review?: string;
}

export interface MovieData {
  title: string;
  status?: 'watched' | 'want';
  rating?: number;
  review?: string;
}

export interface PlaceData {
  name: string;
  address?: string;
  category?: string;
  rating?: number;
  memo?: string;
}

export interface SleepData {
  sleepAt?: string;
  wakeAt?: string;
  durationHours?: number;
  quality?: number;
}

export interface MedicationData {
  name: string;
  dosage?: string;
  taken?: boolean;
}

export interface HabitData {
  name: string;
  completed?: boolean;
}

export interface JournalData {
  content: string;
  mood?: string;
}

export interface ShoppingData {
  items: string[];
  category?: string;
}

export interface WishlistData {
  name: string;
  price?: number;
  url?: string;
  priority?: number;
}

export interface TravelData {
  destination: string;
  startDate?: string;
  endDate?: string;
}

export interface CarData {
  type: 'fuel' | 'maintenance';
  amount?: number;
  liters?: number;
  odometer?: number;
  description?: string;
}

export interface BabyData {
  babyName?: string;
  type: 'milk' | 'diaper' | 'sleep' | 'growth';
  details?: Record<string, unknown>;
}

export interface PetData {
  petName?: string;
  type: 'meal' | 'walk' | 'health' | 'photo';
  details?: Record<string, unknown>;
}

export interface PlantData {
  plantName?: string;
  type: 'water' | 'fertilize' | 'photo';
}

// AI分類結果の型
export interface ClassifyResult {
  category: Category;
  data:
    | FinanceData
    | CalendarData
    | HealthData
    | TaskData
    | BookData
    | MovieData
    | PlaceData
    | SleepData
    | MedicationData
    | HabitData
    | JournalData
    | ShoppingData
    | WishlistData
    | TravelData
    | CarData
    | BabyData
    | PetData
    | PlantData;
  response: string;
  confidence?: number;
}

// Edge FunctionのURL
const CLASSIFY_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/classify`
  : '';

/**
 * ユーザー入力をAIで分類する
 * @param input ユーザーの入力テキスト
 * @param imageBase64 添付画像（オプション、Base64形式）
 * @returns 分類結果
 */
export async function classifyInput(
  input: string,
  imageBase64?: string
): Promise<ClassifyResult> {
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;

  if (!accessToken) {
    throw new Error('認証が必要です');
  }

  const response = await fetch(CLASSIFY_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      input,
      image: imageBase64,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '分類に失敗しました');
  }

  const result: ClassifyResult = await response.json();
  return result;
}

/**
 * 分類結果をDBに保存する
 * @param result 分類結果
 * @returns 保存されたレコードのID
 */
export async function saveClassifiedData(
  result: ClassifyResult
): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;

  if (!userId) {
    throw new Error('認証が必要です');
  }

  const now = new Date().toISOString();

  // カテゴリに応じたテーブルに保存
  switch (result.category) {
    case 'finance': {
      const data = result.data as FinanceData;
      const { data: record, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: data.amount,
          type: data.type,
          category: data.category,
          description: data.description,
          date: data.date || now.split('T')[0],
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'calendar': {
      const data = result.data as CalendarData;
      const { data: record, error } = await supabase
        .from('events')
        .insert({
          user_id: userId,
          title: data.title,
          start_at: data.startAt,
          end_at: data.endAt,
          all_day: data.allDay ?? false,
          location: data.location,
          memo: data.memo,
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'health': {
      const data = result.data as HealthData;
      // 体重記録
      if (data.weight !== undefined) {
        const { data: record, error } = await supabase
          .from('health_weight')
          .insert({
            user_id: userId,
            weight: data.weight,
            date: now.split('T')[0],
          })
          .select('id')
          .single();
        if (error) throw error;
        return record.id;
      }
      // 食事記録
      if (data.mealType) {
        const { data: record, error } = await supabase
          .from('health_meals')
          .insert({
            user_id: userId,
            meal_type: data.mealType,
            description: data.mealDescription,
            calories: data.calories,
            date: now.split('T')[0],
          })
          .select('id')
          .single();
        if (error) throw error;
        return record.id;
      }
      // 運動記録
      if (data.exerciseType) {
        const { data: record, error } = await supabase
          .from('health_exercise')
          .insert({
            user_id: userId,
            exercise_type: data.exerciseType,
            duration_minutes: data.durationMinutes,
            distance_km: data.distanceKm,
            calories: data.calories,
            date: now.split('T')[0],
          })
          .select('id')
          .single();
        if (error) throw error;
        return record.id;
      }
      // 水分記録
      if (data.waterMl !== undefined) {
        const { data: record, error } = await supabase
          .from('health_water')
          .insert({
            user_id: userId,
            amount_ml: data.waterMl,
            date: now.split('T')[0],
          })
          .select('id')
          .single();
        if (error) throw error;
        return record.id;
      }
      throw new Error('健康データが不正です');
    }

    case 'task': {
      const data = result.data as TaskData;
      const { data: record, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: data.title,
          due_date: data.dueDate,
          priority: data.priority ?? 0,
          project: data.project,
          tags: data.tags,
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'book': {
      const data = result.data as BookData;
      const { data: record, error } = await supabase
        .from('books')
        .insert({
          user_id: userId,
          title: data.title,
          author: data.author,
          status: data.status ?? 'reading',
          rating: data.rating,
          review: data.review,
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'movie': {
      const data = result.data as MovieData;
      const { data: record, error } = await supabase
        .from('movies')
        .insert({
          user_id: userId,
          title: data.title,
          status: data.status ?? 'watched',
          rating: data.rating,
          review: data.review,
          watched_at: now.split('T')[0],
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'place': {
      const data = result.data as PlaceData;
      const { data: record, error } = await supabase
        .from('places')
        .insert({
          user_id: userId,
          name: data.name,
          address: data.address,
          category: data.category,
          rating: data.rating,
          memo: data.memo,
          last_visited_at: now.split('T')[0],
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'sleep': {
      const data = result.data as SleepData;
      const { data: record, error } = await supabase
        .from('health_sleep')
        .insert({
          user_id: userId,
          sleep_at: data.sleepAt,
          wake_at: data.wakeAt,
          quality: data.quality,
          date: now.split('T')[0],
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'medication': {
      const data = result.data as MedicationData;
      // まず薬を検索、なければ作成
      let { data: medication } = await supabase
        .from('medications')
        .select('id')
        .eq('user_id', userId)
        .eq('name', data.name)
        .single();

      if (!medication) {
        const { data: newMed, error } = await supabase
          .from('medications')
          .insert({
            user_id: userId,
            name: data.name,
            dosage: data.dosage,
          })
          .select('id')
          .single();
        if (error) throw error;
        medication = newMed;
      }

      // 服用ログを記録
      const { data: record, error } = await supabase
        .from('medication_logs')
        .insert({
          medication_id: medication.id,
          taken_at: now,
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'habit': {
      const data = result.data as HabitData;
      // まず習慣を検索、なければ作成
      let { data: habit } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('name', data.name)
        .single();

      if (!habit) {
        const { data: newHabit, error } = await supabase
          .from('habits')
          .insert({
            user_id: userId,
            name: data.name,
            frequency: 'daily',
          })
          .select('id')
          .single();
        if (error) throw error;
        habit = newHabit;
      }

      // 習慣ログを記録
      const { data: record, error } = await supabase
        .from('habit_logs')
        .insert({
          habit_id: habit.id,
          date: now.split('T')[0],
          completed: data.completed ?? true,
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'journal': {
      const data = result.data as JournalData;
      const { data: record, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          content: data.content,
          mood: data.mood,
          date: now.split('T')[0],
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'shopping': {
      const data = result.data as ShoppingData;
      const items = data.items.map((name) => ({
        user_id: userId,
        name,
        category: data.category,
      }));
      const { data: records, error } = await supabase
        .from('shopping_items')
        .insert(items)
        .select('id');
      if (error) throw error;
      return records[0].id;
    }

    case 'wishlist': {
      const data = result.data as WishlistData;
      const { data: record, error } = await supabase
        .from('wishlist_items')
        .insert({
          user_id: userId,
          name: data.name,
          price: data.price,
          url: data.url,
          priority: data.priority ?? 0,
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'travel': {
      const data = result.data as TravelData;
      const { data: record, error } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          destination: data.destination,
          start_date: data.startDate,
          end_date: data.endDate,
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'car': {
      const data = result.data as CarData;
      const { data: record, error } = await supabase
        .from('car_records')
        .insert({
          user_id: userId,
          type: data.type,
          amount: data.amount,
          liters: data.liters,
          odometer: data.odometer,
          description: data.description,
          date: now.split('T')[0],
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'baby': {
      const data = result.data as BabyData;
      const { data: record, error } = await supabase
        .from('baby_logs')
        .insert({
          user_id: userId,
          baby_name: data.babyName,
          type: data.type,
          details: data.details,
          datetime: now,
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'pet': {
      const data = result.data as PetData;
      const { data: record, error } = await supabase
        .from('pet_logs')
        .insert({
          user_id: userId,
          pet_name: data.petName,
          type: data.type,
          details: data.details,
          datetime: now,
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    case 'plant': {
      const data = result.data as PlantData;
      const { data: record, error } = await supabase
        .from('plant_logs')
        .insert({
          user_id: userId,
          plant_name: data.plantName,
          type: data.type,
          datetime: now,
        })
        .select('id')
        .single();
      if (error) throw error;
      return record.id;
    }

    default:
      throw new Error(`未対応のカテゴリ: ${result.category}`);
  }
}

/**
 * チャットメッセージを保存する
 * @param role ロール（user/assistant）
 * @param content メッセージ内容
 * @param imageUrl 画像URL（オプション）
 */
export async function saveChatMessage(
  role: 'user' | 'assistant',
  content: string,
  imageUrl?: string
): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;

  if (!userId) {
    throw new Error('認証が必要です');
  }

  const { error } = await supabase.from('chat_messages').insert({
    user_id: userId,
    role,
    content,
    image_url: imageUrl,
  });

  if (error) throw error;
}

/**
 * ユーザー入力を処理し、分類・保存・返答を行う統合関数
 * @param input ユーザーの入力テキスト
 * @param imageBase64 添付画像（オプション）
 * @returns ドードーの返答
 */
export async function processUserInput(
  input: string,
  imageBase64?: string
): Promise<{ response: string; category: Category; recordId: string }> {
  // 1. ユーザーメッセージを保存
  await saveChatMessage('user', input);

  // 2. AIで分類
  const result = await classifyInput(input, imageBase64);

  // 3. 分類結果をDBに保存
  const recordId = await saveClassifiedData(result);

  // 4. AIの返答を保存
  await saveChatMessage('assistant', result.response);

  return {
    response: result.response,
    category: result.category,
    recordId,
  };
}

// カテゴリの絵文字マッピング
export const categoryEmojis: Record<Category, string> = {
  finance: '💰',
  calendar: '📅',
  health: '💪',
  task: '✅',
  book: '📚',
  movie: '🎬',
  place: '📍',
  sleep: '😴',
  medication: '💊',
  habit: '🎯',
  journal: '📝',
  shopping: '🛒',
  wishlist: '🎁',
  travel: '✈️',
  car: '🚗',
  baby: '👶',
  pet: '🐕',
  plant: '🌱',
};

// カテゴリの日本語名マッピング
export const categoryNames: Record<Category, string> = {
  finance: '家計簿',
  calendar: '予定',
  health: '健康',
  task: 'タスク',
  book: '読書',
  movie: '映画',
  place: '訪問記録',
  sleep: '睡眠',
  medication: '服薬',
  habit: '習慣',
  journal: '日記',
  shopping: '買い物',
  wishlist: 'ウィッシュリスト',
  travel: '旅行',
  car: '車',
  baby: '育児',
  pet: 'ペット',
  plant: '植物',
};
