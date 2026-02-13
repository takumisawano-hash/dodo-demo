import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Notification categories for DoDo coaches
export type NotificationCategory = 
  | 'coach_reminder'    // Daily coaching reminders
  | 'goal_achieved'     // Goal completion celebrations
  | 'streak_warning'    // Streak about to break
  | 'new_insight'       // Cross-coach insights
  | 'weekly_summary';   // Weekly progress summary

interface ScheduleNotificationOptions {
  title: string;
  body: string;
  data?: Record<string, any>;
  category?: NotificationCategory;
  trigger?: Notifications.NotificationTriggerInput;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private initialized = false;

  // Initialize notifications and request permissions
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Check if physical device (required for push notifications)
      if (!Device.isDevice) {
        if (__DEV__) console.log('Push notifications require a physical device');
        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        if (__DEV__) console.log('Notification permission not granted');
        return false;
      }

      // Get push token (for future server integration)
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'dodo-app', // Replace with actual project ID
        });
        this.expoPushToken = tokenData.data;
        if (__DEV__) console.log('Push token:', this.expoPushToken);
      } catch (e) {
        if (__DEV__) console.log('Could not get push token:', e);
      }

      // Android specific channel setup
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Setup Android notification channels
  private async setupAndroidChannels() {
    await Notifications.setNotificationChannelAsync('coaching', {
      name: 'コーチング',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9800',
      description: 'コーチからのリマインダーとメッセージ',
    });

    await Notifications.setNotificationChannelAsync('achievements', {
      name: '達成',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#4CAF50',
      description: '目標達成の通知',
    });

    await Notifications.setNotificationChannelAsync('insights', {
      name: 'インサイト',
      importance: Notifications.AndroidImportance.LOW,
      description: 'クロスコーチインサイト',
    });
  }

  // Get push token for server registration
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  // Schedule a local notification
  async scheduleNotification(options: ScheduleNotificationOptions): Promise<string | null> {
    try {
      const { title, body, data, category, trigger } = options;

      const channelId = this.getCategoryChannel(category);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { ...data, category },
          sound: true,
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger: trigger || null, // null = immediate
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Schedule daily coach reminder
  async scheduleDailyReminder(
    coachId: string,
    coachName: string,
    hour: number = 9,
    minute: number = 0
  ): Promise<string | null> {
    return this.scheduleNotification({
      title: `${coachName}からのリマインダー 🦤`,
      body: '今日も一緒に頑張りましょう！',
      data: { coachId, screen: 'Chat' },
      category: 'coach_reminder',
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  // Send goal achieved notification
  async notifyGoalAchieved(goalName: string, coachId: string): Promise<string | null> {
    return this.scheduleNotification({
      title: '🎉 目標達成！',
      body: `「${goalName}」を達成しました！素晴らしい！`,
      data: { coachId, type: 'goal_achieved' },
      category: 'goal_achieved',
    });
  }

  // Send streak warning notification
  async notifyStreakWarning(streakDays: number, coachId: string): Promise<string | null> {
    return this.scheduleNotification({
      title: '🔥 ストリークを守ろう！',
      body: `${streakDays}日連続の記録が途切れそうです。今日もチェックインしましょう！`,
      data: { coachId, type: 'streak_warning' },
      category: 'streak_warning',
    });
  }

  // Send cross-coach insight notification
  async notifyInsight(message: string, affectedCoaches: string[]): Promise<string | null> {
    return this.scheduleNotification({
      title: '💡 新しいインサイト',
      body: message,
      data: { coaches: affectedCoaches, type: 'insight' },
      category: 'new_insight',
    });
  }

  // Cancel a scheduled notification
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear badge
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  // Get channel ID for category
  private getCategoryChannel(category?: NotificationCategory): string {
    switch (category) {
      case 'goal_achieved':
      case 'streak_warning':
        return 'achievements';
      case 'new_insight':
      case 'weekly_summary':
        return 'insights';
      default:
        return 'coaching';
    }
  }

  // Add notification received listener
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Add notification response listener (when user taps notification)
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Hook for using notifications in components
import { useEffect, useRef, useCallback } from 'react';

export function useNotifications(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  
  // Store callbacks in refs to avoid re-running effect
  const receivedCallbackRef = useRef(onNotificationReceived);
  const responseCallbackRef = useRef(onNotificationResponse);
  
  receivedCallbackRef.current = onNotificationReceived;
  responseCallbackRef.current = onNotificationResponse;

  useEffect(() => {
    // Initialize on mount
    notificationService.initialize();

    // Set up listeners with stable references
    notificationListener.current = notificationService.addNotificationReceivedListener(
      (notification) => receivedCallbackRef.current?.(notification)
    );

    responseListener.current = notificationService.addNotificationResponseListener(
      (response) => responseCallbackRef.current?.(response)
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return notificationService;
}
