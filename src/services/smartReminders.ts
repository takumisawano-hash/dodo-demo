/**
 * DoDo Life - スマートリマインダーサービス
 * 各ミニアプリに適したタイミングで親しみやすいプッシュ通知を送信
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ========================================
// 型定義
// ========================================

export type MiniAppType = 
  | 'meal'      // 食事記録
  | 'weight'    // 体重記録
  | 'sleep'     // 睡眠記録
  | 'medicine'  // 服薬記録
  | 'habit'     // 習慣トラッカー
  | 'water'     // 水分記録
  | 'task'      // タスク管理
  | 'budget';   // 家計簿

export interface ReminderConfig {
  appType: MiniAppType;
  enabled: boolean;
  customTimes?: string[]; // HH:MM形式
}

export interface ScheduledReminder {
  identifier: string;
  appType: MiniAppType;
  hour: number;
  minute: number;
  message: string;
}

// ========================================
// ドードーのメッセージテンプレート
// ========================================

const DODO_MESSAGES: Record<MiniAppType, Record<string, string[]>> = {
  meal: {
    morning: [
      'おはよう！朝ごはん食べた？📸',
      '朝ごはんを記録しませんか？🍳',
      'もぐもぐタイム！朝食を記録しよう🌅',
    ],
    lunch: [
      'お昼だよ〜！ご飯を記録しませんか？📸',
      'ランチタイム！何食べた？🍱',
      'お昼ごはん記録しよ〜！🥗',
    ],
    dinner: [
      '夜ごはんの時間！記録しませんか？📸',
      'ディナータイム〜！何食べる？🍽️',
      '今日の晩ごはん、記録しよ！🌙',
    ],
  },
  weight: {
    morning: [
      '今日の体重を記録しよう⚖️',
      'おはよう！体重チェックの時間だよ📊',
      '毎日コツコツ！体重を記録しよう✨',
    ],
  },
  sleep: {
    night: [
      'そろそろ寝る時間だよ😴',
      'おやすみの準備はOK？🌙',
      'いい夢見てね〜💤',
    ],
    wakeup: [
      'よく眠れた？😊',
      'おはよう！昨日の睡眠はどうだった？☀️',
      'グッドモーニング！睡眠を記録しよう🛏️',
    ],
  },
  medicine: {
    default: [
      'お薬飲んだ？💊',
      '薬の時間だよ〜！忘れずにね💊',
      'お薬チェック！飲んだら記録しよう✅',
    ],
  },
  habit: {
    night: [
      '今日の習慣チェックしよう🎯',
      '習慣の振り返りタイム！どれだけできた？📝',
      '今日も頑張ったね！習慣を記録しよう⭐',
    ],
  },
  water: {
    default: [
      'お水飲んだ？💧',
      '水分補給の時間！コップ1杯飲もう🥤',
      'のど乾いてない？お水飲んでね💦',
    ],
  },
  task: {
    morning: [
      '今日のタスク確認しよう✅',
      'おはよう！今日やることをチェック📋',
      '新しい1日！タスクを確認しよう🌟',
    ],
  },
  budget: {
    night: [
      '今日の出費を記録しよう💰',
      'お金の記録タイム！今日は何に使った？📝',
      '家計簿つける時間だよ〜💵',
    ],
  },
};

// ========================================
// デフォルトのリマインダースケジュール
// ========================================

const DEFAULT_SCHEDULES: Record<MiniAppType, Array<{ hour: number; minute: number; key: string }>> = {
  meal: [
    { hour: 8, minute: 0, key: 'morning' },
    { hour: 13, minute: 0, key: 'lunch' },
    { hour: 19, minute: 0, key: 'dinner' },
  ],
  weight: [
    { hour: 7, minute: 0, key: 'morning' },
  ],
  sleep: [
    { hour: 22, minute: 0, key: 'night' },
    { hour: 7, minute: 30, key: 'wakeup' },
  ],
  medicine: [], // ユーザー設定による
  habit: [
    { hour: 21, minute: 0, key: 'night' },
  ],
  water: [
    { hour: 9, minute: 0, key: 'default' },
    { hour: 12, minute: 0, key: 'default' },
    { hour: 15, minute: 0, key: 'default' },
    { hour: 18, minute: 0, key: 'default' },
    { hour: 21, minute: 0, key: 'default' },
  ],
  task: [
    { hour: 9, minute: 0, key: 'morning' },
  ],
  budget: [
    { hour: 20, minute: 0, key: 'night' },
  ],
};

// ========================================
// ストレージキー
// ========================================

const STORAGE_KEYS = {
  REMINDER_CONFIG: 'dodo_reminder_config',
  MEDICINE_TIMES: 'dodo_medicine_times',
  SCHEDULED_IDS: 'dodo_scheduled_reminder_ids',
};

// ========================================
// ユーティリティ関数
// ========================================

/**
 * ランダムにメッセージを選択
 */
function getRandomMessage(appType: MiniAppType, timeKey: string): string {
  const messages = DODO_MESSAGES[appType]?.[timeKey] || DODO_MESSAGES[appType]?.['default'];
  if (!messages || messages.length === 0) {
    return 'リマインダーだよ！📱';
  }
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * アプリタイプに応じたタイトルを取得
 */
function getNotificationTitle(appType: MiniAppType): string {
  const titles: Record<MiniAppType, string> = {
    meal: '🍽️ 食事記録',
    weight: '⚖️ 体重記録',
    sleep: '😴 睡眠記録',
    medicine: '💊 お薬リマインド',
    habit: '🎯 習慣チェック',
    water: '💧 水分補給',
    task: '✅ タスク',
    budget: '💰 家計簿',
  };
  return titles[appType] || 'DoDo Life';
}

// ========================================
// メインクラス
// ========================================

class SmartReminderService {
  private scheduledReminders: ScheduledReminder[] = [];

  /**
   * 通知の権限をリクエスト
   */
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('通知の権限が許可されていません');
      return false;
    }

    // Android用のチャンネル設定
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'リマインダー',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B6B',
    });

    return true;
  }

  /**
   * 通知ハンドラーを設定
   */
  setupNotificationHandlers(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ) {
    // フォアグラウンドでの通知表示設定
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // 通知受信時のリスナー
    if (onNotificationReceived) {
      Notifications.addNotificationReceivedListener(onNotificationReceived);
    }

    // 通知タップ時のリスナー
    if (onNotificationResponse) {
      Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
    }
  }

  /**
   * リマインダー設定を取得
   */
  async getReminderConfig(): Promise<Record<MiniAppType, ReminderConfig>> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.REMINDER_CONFIG);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('リマインダー設定の取得に失敗:', error);
    }

    // デフォルト設定を返す
    const defaultConfig: Record<MiniAppType, ReminderConfig> = {
      meal: { appType: 'meal', enabled: true },
      weight: { appType: 'weight', enabled: true },
      sleep: { appType: 'sleep', enabled: true },
      medicine: { appType: 'medicine', enabled: false },
      habit: { appType: 'habit', enabled: true },
      water: { appType: 'water', enabled: true },
      task: { appType: 'task', enabled: true },
      budget: { appType: 'budget', enabled: true },
    };
    return defaultConfig;
  }

  /**
   * リマインダー設定を保存
   */
  async saveReminderConfig(config: Record<MiniAppType, ReminderConfig>): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDER_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('リマインダー設定の保存に失敗:', error);
    }
  }

  /**
   * 特定のアプリのリマインダーを有効/無効にする
   */
  async toggleReminder(appType: MiniAppType, enabled: boolean): Promise<void> {
    const config = await this.getReminderConfig();
    config[appType] = { ...config[appType], enabled };
    await this.saveReminderConfig(config);
    await this.rescheduleAllReminders();
  }

  /**
   * 服薬リマインダーの時間を設定
   */
  async setMedicineTimes(times: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICINE_TIMES, JSON.stringify(times));
      await this.rescheduleAllReminders();
    } catch (error) {
      console.error('服薬時間の設定に失敗:', error);
    }
  }

  /**
   * 服薬リマインダーの時間を取得
   */
  async getMedicineTimes(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MEDICINE_TIMES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('服薬時間の取得に失敗:', error);
      return [];
    }
  }

  /**
   * 単一の通知をスケジュール
   */
  async scheduleNotification(
    appType: MiniAppType,
    hour: number,
    minute: number,
    messageKey: string
  ): Promise<string | null> {
    try {
      const message = getRandomMessage(appType, messageKey);
      const title = getNotificationTitle(appType);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data: { appType, action: 'open_app' },
          sound: 'default',
          categoryIdentifier: appType,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      this.scheduledReminders.push({
        identifier,
        appType,
        hour,
        minute,
        message,
      });

      return identifier;
    } catch (error) {
      console.error('通知のスケジュールに失敗:', error);
      return null;
    }
  }

  /**
   * 全てのリマインダーをキャンセル
   */
  async cancelAllReminders(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledReminders = [];
      await AsyncStorage.removeItem(STORAGE_KEYS.SCHEDULED_IDS);
    } catch (error) {
      console.error('リマインダーのキャンセルに失敗:', error);
    }
  }

  /**
   * 特定のアプリのリマインダーをキャンセル
   */
  async cancelRemindersForApp(appType: MiniAppType): Promise<void> {
    const toCancel = this.scheduledReminders.filter(r => r.appType === appType);
    
    for (const reminder of toCancel) {
      try {
        await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
      } catch (error) {
        console.error(`通知 ${reminder.identifier} のキャンセルに失敗:`, error);
      }
    }

    this.scheduledReminders = this.scheduledReminders.filter(r => r.appType !== appType);
  }

  /**
   * 全リマインダーを再スケジュール
   */
  async rescheduleAllReminders(): Promise<void> {
    // 既存のリマインダーをキャンセル
    await this.cancelAllReminders();

    // 設定を取得
    const config = await this.getReminderConfig();
    const medicineTimes = await this.getMedicineTimes();

    // 各アプリタイプごとにスケジュール
    for (const appType of Object.keys(config) as MiniAppType[]) {
      if (!config[appType].enabled) continue;

      if (appType === 'medicine') {
        // 服薬は設定された時間で
        for (const time of medicineTimes) {
          const [hour, minute] = time.split(':').map(Number);
          if (!isNaN(hour) && !isNaN(minute)) {
            await this.scheduleNotification(appType, hour, minute, 'default');
          }
        }
      } else {
        // その他はデフォルトスケジュール
        const schedules = DEFAULT_SCHEDULES[appType] || [];
        for (const schedule of schedules) {
          await this.scheduleNotification(appType, schedule.hour, schedule.minute, schedule.key);
        }
      }
    }

    // スケジュール済みIDを保存
    await this.saveScheduledIds();
    
    console.log(`📅 ${this.scheduledReminders.length}件のリマインダーをスケジュールしました`);
  }

  /**
   * スケジュール済みIDを保存
   */
  private async saveScheduledIds(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SCHEDULED_IDS,
        JSON.stringify(this.scheduledReminders)
      );
    } catch (error) {
      console.error('スケジュールIDの保存に失敗:', error);
    }
  }

  /**
   * 即時通知を送信（テスト用）
   */
  async sendTestNotification(appType: MiniAppType): Promise<void> {
    const message = getRandomMessage(appType, 'default');
    const title = getNotificationTitle(appType);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        data: { appType, action: 'test' },
        sound: 'default',
      },
      trigger: null, // 即時送信
    });
  }

  /**
   * スケジュール済みリマインダーの一覧を取得
   */
  async getScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * 初期化
   */
  async initialize(): Promise<boolean> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return false;
    }

    await this.rescheduleAllReminders();
    return true;
  }
}

// ========================================
// シングルトンインスタンス
// ========================================

export const smartReminders = new SmartReminderService();

// ========================================
// React Hooks
// ========================================

import { useState, useEffect, useCallback } from 'react';

/**
 * リマインダー設定を管理するHook
 */
export function useSmartReminders() {
  const [config, setConfig] = useState<Record<MiniAppType, ReminderConfig> | null>(null);
  const [medicineTimes, setMedicineTimesState] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const [reminderConfig, times] = await Promise.all([
      smartReminders.getReminderConfig(),
      smartReminders.getMedicineTimes(),
    ]);
    setConfig(reminderConfig);
    setMedicineTimesState(times);
    setLoading(false);
  };

  const toggleApp = useCallback(async (appType: MiniAppType, enabled: boolean) => {
    await smartReminders.toggleReminder(appType, enabled);
    await loadConfig();
  }, []);

  const setMedicineTimes = useCallback(async (times: string[]) => {
    await smartReminders.setMedicineTimes(times);
    setMedicineTimesState(times);
  }, []);

  const sendTestNotification = useCallback(async (appType: MiniAppType) => {
    await smartReminders.sendTestNotification(appType);
  }, []);

  return {
    config,
    medicineTimes,
    loading,
    toggleApp,
    setMedicineTimes,
    sendTestNotification,
    refresh: loadConfig,
  };
}

// ========================================
// 通知アクション定義（iOSカテゴリ用）
// ========================================

export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('meal', [
    { identifier: 'record', buttonTitle: '記録する', options: { opensAppToForeground: true } },
    { identifier: 'skip', buttonTitle: 'あとで', options: { opensAppToForeground: false } },
  ]);

  await Notifications.setNotificationCategoryAsync('medicine', [
    { identifier: 'taken', buttonTitle: '飲んだ！', options: { opensAppToForeground: false } },
    { identifier: 'snooze', buttonTitle: '10分後', options: { opensAppToForeground: false } },
  ]);

  await Notifications.setNotificationCategoryAsync('water', [
    { identifier: 'drank', buttonTitle: '飲んだ！💧', options: { opensAppToForeground: false } },
    { identifier: 'later', buttonTitle: 'あとで', options: { opensAppToForeground: false } },
  ]);
}

export default smartReminders;
