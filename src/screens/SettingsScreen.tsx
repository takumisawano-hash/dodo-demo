import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as StoreReview from 'expo-store-review';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { t, useI18n, formatDate } from '../i18n';
import { useTheme, ThemeMode } from '../theme';
import { ErrorToast, useErrorHandler } from '../components/ErrorDisplay';
import { notificationService } from '../services/notifications';
import { clearAllChatHistories } from '../services/chatHistory';

interface Props {
  navigation: any;
}

export default function SettingsScreen({ navigation }: Props) {
  const { language, setLanguage: changeLanguage, availableLanguages } = useI18n();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { error, handleError, clearError } = useErrorHandler();
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Theme mode visual feedback
  const themeModeIcons: Record<ThemeMode, string> = {
    system: '⚙️',
    light: '☀️',
    dark: '🌙',
  };

  // Mock user data
  const user = {
    name: '山田 太郎',
    email: 'taro.yamada@example.com',
    avatar: '👤',
  };

  // Mock subscription status
  const subscription = {
    plan: 'Pro',
    expiresAt: new Date('2025-03-15'),
    isActive: true,
  };

  const appVersion = '1.0.0';

  // Get current language label
  const currentLanguageLabel = availableLanguages.find(l => l.code === language)?.nativeLabel || '日本語';

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textTertiary: { color: colors.textTertiary },
    card: { backgroundColor: colors.card },
    border: { borderBottomColor: colors.divider },
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      setNotifications(value);
      if (value) {
        const success = await notificationService.initialize();
        if (!success) {
          setNotifications(false);
          setToastMessage('通知の許可が必要です。設定から許可してください。');
        }
      }
    } catch (e) {
      handleError(e);
      setNotifications(!value);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.logout'), style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            // Simulate logout
            await new Promise(resolve => setTimeout(resolve, 500));
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } catch (e) {
            setToastMessage('ログアウトに失敗しました');
          } finally {
            setLoading(false);
          }
        }},
      ]
    );
  };

  // 言語切り替えに確認ダイアログを追加
  const handleLanguageChange = () => {
    const buttons = availableLanguages.map(lang => ({
      text: lang.nativeLabel,
      onPress: () => {
        if (lang.code !== language) {
          // 言語変更の確認ダイアログ
          Alert.alert(
            '言語を変更',
            `言語を「${lang.nativeLabel}」に変更しますか？\nアプリの表示言語が切り替わります。`,
            [
              { text: 'キャンセル', style: 'cancel' },
              { 
                text: '変更する', 
                onPress: () => {
                  changeLanguage(lang.code);
                  setToastMessage(`言語を${lang.nativeLabel}に変更しました`);
                }
              },
            ]
          );
        }
      },
    }));
    buttons.push({ text: t('common.cancel'), onPress: () => {} });

    Alert.alert(
      t('settings.selectLanguage'),
      `現在の言語: ${currentLanguageLabel}`,
      buttons
    );
  };

  // テーマモード切り替え（即時プレビュー付き）
  const handleThemeModeChange = () => {
    const themeModeLabels: Record<ThemeMode, string> = {
      system: '⚙️ システム設定に従う',
      light: '☀️ ライトモード',
      dark: '🌙 ダークモード',
    };

    const currentLabel = themeModeLabels[themeMode];

    const buttons: Array<{ text: string; onPress: () => void; style?: 'cancel' | 'default' | 'destructive' }> = [
      { 
        text: 'システム設定に従う', 
        onPress: () => {
          setThemeMode('system');
          setToastMessage('外観をシステム設定に合わせました');
        }
      },
      { 
        text: 'ライトモード', 
        onPress: () => {
          setThemeMode('light');
          setToastMessage('ライトモードに切り替えました');
        }
      },
      { 
        text: 'ダークモード', 
        onPress: () => {
          setThemeMode('dark');
          setToastMessage('ダークモードに切り替えました');
        }
      },
    ];
    buttons.push({ text: t('common.cancel'), onPress: () => {}, style: 'cancel' });

    Alert.alert(
      '🎨 外観モード',
      `現在: ${currentLabel}`,
      buttons
    );
  };

  const getThemeModeLabel = (): string => {
    switch (themeMode) {
      case 'system': return '⚙️ システム';
      case 'light': return '☀️ ライト';
      case 'dark': return '🌙 ダーク';
      default: return 'システム';
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      setToastMessage('リンクを開けませんでした');
    }
  };

  const handleRequestReview = async () => {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      } else {
        // Store review not available, open store page directly
        if (Platform.OS === 'ios') {
          // Replace with actual App Store ID when published
          await Linking.openURL('https://apps.apple.com/app/id123456789');
        } else if (Platform.OS === 'android') {
          // Replace with actual package name
          await Linking.openURL('market://details?id=com.dodo.app');
        } else {
          setToastMessage('レビュー機能はモバイルアプリでご利用いただけます');
        }
      }
    } catch (e) {
      setToastMessage('レビューページを開けませんでした');
    }
  };

  const handleDeleteConversations = async () => {
    Alert.alert(
      '確認',
      '本当に全ての会話履歴を削除しますか？\nこの操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await clearAllChatHistories();
              setToastMessage('会話履歴を削除しました');
            } catch (e) {
              setToastMessage('削除に失敗しました');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      setLoading(true);

      // Gather user data for export
      const exportData = {
        exportDate: new Date().toISOString(),
        appVersion: appVersion,
        user: {
          name: user.name,
          email: user.email,
        },
        subscription: {
          plan: subscription.plan,
          expiresAt: subscription.expiresAt.toISOString(),
        },
        settings: {
          language: language,
          themeMode: themeMode,
          notifications: notifications,
        },
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `dodo_export_${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        // Web: Download via blob
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        setToastMessage('データをダウンロードしました');
      } else {
        // Mobile: Use file system and sharing
        const file = new File(Paths.cache, fileName);
        await file.write(jsonString);

        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/json',
            dialogTitle: 'データをエクスポート',
          });
        } else {
          setToastMessage('共有機能が利用できません');
        }
      }
    } catch (e) {
      setToastMessage('データのエクスポートに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 設定行コンポーネント（改良版）
  const SettingRow = ({ 
    icon, 
    title, 
    subtitle,
    value, 
    onPress, 
    showArrow = true,
    isSwitch = false,
    switchValue,
    onSwitchChange,
    textColor,
    disabled = false,
    badge,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    value?: string;
    onPress?: () => void;
    showArrow?: boolean;
    isSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    textColor?: string;
    disabled?: boolean;
    badge?: string;
  }) => (
    <TouchableOpacity 
      style={[styles.settingRow, dynamicStyles.border, disabled && styles.settingRowDisabled]} 
      onPress={onPress}
      disabled={isSwitch || disabled}
      activeOpacity={isSwitch || disabled ? 1 : 0.7}
    >
      <View style={[styles.settingIconContainer, { backgroundColor: colors.progressCardBackground }]}>
        <Text style={styles.settingIcon}>{icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <View style={styles.settingTitleRow}>
          <Text style={[
            styles.settingTitle, 
            { color: textColor || colors.text },
            disabled && { color: colors.textTertiary }
          ]}>
            {title}
          </Text>
          {badge && (
            <View style={[styles.settingBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.settingBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: disabled ? colors.textTertiary : colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.border, true: colors.success + '80' }}
          thumbColor={switchValue ? colors.success : colors.surface}
          disabled={disabled}
        />
      ) : value ? (
        <View style={styles.settingValueContainer}>
          <Text style={[styles.settingValue, dynamicStyles.textSecondary]}>{value}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      ) : null}
    </TouchableOpacity>
  );

  // セクションヘッダー（改良版）
  const SectionHeader = ({ title, icon }: { title: string; icon?: string }) => (
    <View style={styles.sectionHeader}>
      {icon && <Text style={styles.sectionIcon}>{icon}</Text>}
      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, dynamicStyles.text]}>{t('settings.title')}</Text>
        <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>アプリの設定をカスタマイズ</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Info Section */}
        <SectionHeader title={t('settings.accountInfo')} icon="👤" />
        <View style={[styles.settingsCard, dynamicStyles.card]}>
          {/* Profile */}
          <TouchableOpacity 
            style={[styles.profileRow, dynamicStyles.border]} 
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.profileAvatar, { backgroundColor: colors.primary + '20' }]}>
              <Text style={styles.profileAvatarText}>{user.avatar}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, dynamicStyles.text]}>{user.name}</Text>
              <Text style={[styles.profileEmail, dynamicStyles.textSecondary]}>{user.email}</Text>
            </View>
            <View style={[styles.profileEditBadge, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="pencil" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Current Plan */}
          <TouchableOpacity 
            style={styles.planRow}
            onPress={() => navigation.navigate('Pricing')}
          >
            <View style={[styles.settingIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.settingIcon}>👑</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, dynamicStyles.text]}>{t('settings.currentPlan')}</Text>
              <Text style={[styles.settingSubtitle, dynamicStyles.textSecondary]}>
                {subscription.plan}プラン • {formatDate(subscription.expiresAt)}まで
              </Text>
            </View>
            <View style={[styles.planChangeBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.planChangeText}>{t('settings.changePlan')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Appearance Section */}
        <SectionHeader title="外観・言語" icon="🎨" />
        <View style={[styles.settingsCard, dynamicStyles.card]}>
          <SettingRow
            icon="🌐"
            title={t('settings.language')}
            subtitle="アプリの表示言語を変更"
            value={currentLanguageLabel}
            onPress={handleLanguageChange}
          />
          <SettingRow
            icon={themeModeIcons[themeMode]}
            title={t('settings.darkMode')}
            subtitle="画面の明るさを調整"
            value={getThemeModeLabel()}
            onPress={handleThemeModeChange}
          />
        </View>

        {/* Notifications Section */}
        <SectionHeader title="通知" icon="🔔" />
        <View style={[styles.settingsCard, dynamicStyles.card]}>
          <SettingRow
            icon="🔔"
            title={t('settings.notifications')}
            subtitle={t('settings.notificationsSubtitle')}
            isSwitch
            switchValue={notifications}
            onSwitchChange={handleNotificationToggle}
          />
          
          {notifications && (
            <>
              <SettingRow
                icon="🚩"
                title="コーチリマインダー"
                subtitle="毎日の進捗確認リマインダー"
                isSwitch
                switchValue={true}
                onSwitchChange={() => {}}
              />
              <SettingRow
                icon="🔥"
                title="ストリーク警告"
                subtitle="連続記録が途切れそうな時に通知"
                isSwitch
                switchValue={true}
                onSwitchChange={() => {}}
              />
              <SettingRow
                icon="🎉"
                title="達成通知"
                subtitle="目標達成時のお祝い通知"
                isSwitch
                switchValue={true}
                onSwitchChange={() => {}}
              />
              <SettingRow
                icon="⏰"
                title="リマインダー設定"
                subtitle="通知時間の詳細設定"
                onPress={() => navigation.navigate('Reminders')}
              />
            </>
          )}
        </View>

        {/* Privacy & Data Section */}
        <SectionHeader title="プライバシー・データ" icon="🔒" />
        <View style={[styles.settingsCard, dynamicStyles.card]}>
          <SettingRow
            icon="📊"
            title="データのエクスポート"
            subtitle="あなたのデータをダウンロード"
            onPress={handleExportData}
            badge="Pro"
          />
          <SettingRow
            icon="🗑️"
            title="会話履歴を削除"
            subtitle="過去のチャット履歴を消去"
            onPress={handleDeleteConversations}
          />
        </View>

        {/* Support Section */}
        <SectionHeader title={t('settings.support')} icon="❓" />
        <View style={[styles.settingsCard, dynamicStyles.card]}>
          <SettingRow
            icon="❓"
            title={t('settings.helpFaq')}
            subtitle="よくある質問と回答"
            onPress={() => handleOpenLink('https://github.com/takumisawano-hash/dodo-demo#readme')}
          />
          <SettingRow
            icon="📧"
            title={t('settings.contact')}
            subtitle="お問い合わせ・フィードバック"
            onPress={() => handleOpenLink('mailto:support@getdodo.app')}
          />
          <SettingRow
            icon="📋"
            title={t('settings.terms')}
            subtitle="サービス利用規約"
            onPress={() => handleOpenLink('https://github.com/takumisawano-hash/dodo-demo/blob/master/legal/terms-of-service-ja.md')}
          />
          <SettingRow
            icon="🔒"
            title={t('settings.privacy')}
            subtitle="プライバシーポリシー"
            onPress={() => handleOpenLink('https://github.com/takumisawano-hash/dodo-demo/blob/master/legal/privacy-policy-ja.md')}
          />
        </View>

        {/* Other Section */}
        <SectionHeader title={t('settings.other')} icon="ℹ️" />
        <View style={[styles.settingsCard, dynamicStyles.card]}>
          <View style={[styles.settingRow, dynamicStyles.border]}>
            <View style={[styles.settingIconContainer, { backgroundColor: colors.progressCardBackground }]}>
              <Text style={styles.settingIcon}>📱</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, dynamicStyles.text]}>{t('settings.appVersion')}</Text>
              <Text style={[styles.settingSubtitle, dynamicStyles.textSecondary]}>最新バージョン</Text>
            </View>
            <View style={[styles.versionBadge, { backgroundColor: colors.success + '20' }]}>
              <Text style={[styles.versionText, { color: colors.success }]}>v{appVersion}</Text>
            </View>
          </View>
          <SettingRow
            icon="⭐"
            title="アプリを評価"
            subtitle="App Storeでレビューを書く"
            onPress={handleRequestReview}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: isDark ? '#3D1B1B' : '#FFEBEE' }, loading && styles.buttonDisabled]} 
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
              <Text style={[styles.logoutText, { color: colors.error }]}>{t('settings.logout')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>🦤 DoDo App</Text>
          <Text style={[styles.footerCopyright, { color: colors.textTertiary }]}>{t('settings.copyright')}</Text>
        </View>
      </ScrollView>

      <ErrorToast visible={!!toastMessage} message={toastMessage} onDismiss={() => setToastMessage('')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  // Section Header
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10, 
    marginTop: 20 
  },
  sectionIcon: { fontSize: 16, marginRight: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  // Settings Card
  settingsCard: { 
    borderRadius: 16, 
    overflow: 'hidden', 
    marginBottom: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 4, 
    elevation: 2 
  },
  
  // Setting Row
  settingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderBottomWidth: 1 
  },
  settingRowDisabled: { opacity: 0.6 },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIcon: { fontSize: 18 },
  settingContent: { flex: 1 },
  settingTitleRow: { flexDirection: 'row', alignItems: 'center' },
  settingTitle: { fontSize: 16, fontWeight: '500' },
  settingBadge: { 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4, 
    marginLeft: 8 
  },
  settingBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  settingSubtitle: { fontSize: 13, marginTop: 2 },
  settingValueContainer: { flexDirection: 'row', alignItems: 'center' },
  settingValue: { fontSize: 14, marginRight: 4 },
  
  // Profile Row
  profileRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 16, 
    borderBottomWidth: 1 
  },
  profileAvatar: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14 
  },
  profileAvatarText: { fontSize: 28 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600' },
  profileEmail: { fontSize: 14, marginTop: 2 },
  profileEditBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Plan Row
  planRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 16 
  },
  planChangeBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  planChangeText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  
  // Version
  versionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  versionText: { fontSize: 14, fontWeight: '600' },
  
  // Logout Button
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: 16, 
    paddingVertical: 16, 
    marginTop: 20, 
    minHeight: 56,
    gap: 8,
  },
  logoutText: { fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
  
  // Footer
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  footerCopyright: { fontSize: 12 },
});
