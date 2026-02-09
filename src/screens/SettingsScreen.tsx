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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t, useI18n, formatDate } from '../i18n';
import { useTheme } from '../theme';
import { ErrorToast, useErrorHandler } from '../components/ErrorDisplay';
import { notificationService } from '../services/notifications';

interface Props {
  navigation: any;
}

export default function SettingsScreen({ navigation }: Props) {
  const { language, setLanguage: changeLanguage, availableLanguages } = useI18n();
  const { colors, isDark } = useTheme();
  const { error, handleError, clearError } = useErrorHandler();
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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

  const handleLanguageChange = () => {
    const buttons = availableLanguages.map(lang => ({
      text: lang.nativeLabel,
      onPress: () => changeLanguage(lang.code),
    }));
    buttons.push({ text: t('common.cancel'), onPress: () => {} });

    Alert.alert(
      t('settings.selectLanguage'),
      undefined,
      buttons
    );
  };

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      setToastMessage('リンクを開けませんでした');
    }
  };

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
  }) => (
    <TouchableOpacity 
      style={[styles.settingRow, dynamicStyles.border, disabled && styles.settingRowDisabled]} 
      onPress={onPress}
      disabled={isSwitch || disabled}
      activeOpacity={isSwitch || disabled ? 1 : 0.7}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingTitle, 
          { color: textColor || colors.text },
          disabled && { color: colors.textTertiary }
        ]}>
          {title}
        </Text>
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
        <Text style={[styles.settingValue, dynamicStyles.textSecondary]}>{value}</Text>
      ) : showArrow ? (
        <Text style={[styles.settingArrow, { color: colors.textTertiary }]}>→</Text>
      ) : null}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={styles.header}>
        <Text style={[styles.title, dynamicStyles.text]}>{t('settings.title')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Info Section */}
        <SectionHeader title={t('settings.accountInfo')} />
        <View style={[styles.settingsCard, dynamicStyles.card]}>
          {/* Profile */}
          <TouchableOpacity 
            style={[styles.profileRow, dynamicStyles.border]} 
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.profileAvatar, { backgroundColor: colors.progressCardBackground }]}>
              <Text style={styles.profileAvatarText}>{user.avatar}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, dynamicStyles.text]}>{user.name}</Text>
              <Text style={[styles.profileEmail, dynamicStyles.textSecondary]}>{user.email}</Text>
            </View>
            <Text style={[styles.settingArrow, { color: colors.textTertiary }]}>→</Text>
          </TouchableOpacity>

          {/* Current Plan */}
          <TouchableOpacity 
            style={styles.planRow}
            onPress={() => navigation.navigate('Pricing')}
          >
            <Text style={styles.settingIcon}>👑</Text>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, dynamicStyles.text]}>{t('settings.currentPlan')}</Text>
              <Text style={[styles.settingSubtitle, dynamicStyles.textSecondary]}>
                {t('settings.planExpiry', { 
                  plan: subscription.plan, 
                  date: formatDate(subscription.expiresAt) 
                })}
              </Text>
            </View>
            <View style={[styles.planChangeBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.planChangeText}>{t('settings.changePlan')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Settings Section */}
        <SectionHeader title={t('settings.appSettings')} />
        <View style={[styles.settingsCard, dynamicStyles.card]}>
          <SettingRow
            icon="🔔"
            title={t('settings.notifications')}
            subtitle={t('settings.notificationsSubtitle')}
            isSwitch
            switchValue={notifications}
            onSwitchChange={handleNotificationToggle}
          />
          <SettingRow
            icon="🌐"
            title={t('settings.language')}
            value={currentLanguageLabel}
            onPress={handleLanguageChange}
          />
          <SettingRow
            icon="🌙"
            title={t('settings.darkMode')}
            subtitle={isDark ? 'ダークモード有効' : 'システム設定に従う'}
            isSwitch
            switchValue={isDark}
            onSwitchChange={() => {}}
            disabled={true}
          />
        </View>

        {/* Notification Settings */}
        {notifications && (
          <>
            <SectionHeader title="通知設定" />
            <View style={[styles.settingsCard, dynamicStyles.card]}>
              <SettingRow
                icon="🎯"
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
            </View>
          </>
        )}

        {/* Support Section */}
        <SectionHeader title={t('settings.support')} />
        <View style={[styles.settingsCard, dynamicStyles.card]}>
          <SettingRow
            icon="❓"
            title={t('settings.helpFaq')}
            onPress={() => handleOpenLink('https://example.com/help')}
          />
          <SettingRow
            icon="📧"
            title={t('settings.contact')}
            onPress={() => handleOpenLink('mailto:support@example.com')}
          />
          <SettingRow
            icon="📋"
            title={t('settings.terms')}
            onPress={() => handleOpenLink('https://example.com/terms')}
          />
          <SettingRow
            icon="🔒"
            title={t('settings.privacy')}
            onPress={() => handleOpenLink('https://example.com/privacy')}
          />
        </View>

        {/* Other Section */}
        <SectionHeader title={t('settings.other')} />
        <View style={[styles.settingsCard, dynamicStyles.card]}>
          <View style={[styles.settingRow, dynamicStyles.border]}>
            <Text style={styles.settingIcon}>📱</Text>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, dynamicStyles.text]}>{t('settings.appVersion')}</Text>
            </View>
            <Text style={[styles.versionText, dynamicStyles.textSecondary]}>v{appVersion}</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, dynamicStyles.card, loading && styles.buttonDisabled]} 
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={[styles.logoutText, { color: colors.error }]}>{t('settings.logout')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>{t('settings.copyright')}</Text>
        </View>
      </ScrollView>

      <ErrorToast visible={!!toastMessage} message={toastMessage} onDismiss={() => setToastMessage('')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionHeader: { marginBottom: 8, marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  settingsCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  settingRowDisabled: { opacity: 0.6 },
  settingIcon: { fontSize: 20, marginRight: 14 },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 16 },
  settingSubtitle: { fontSize: 13, marginTop: 2 },
  settingValue: { fontSize: 14, marginRight: 8 },
  settingArrow: { fontSize: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1 },
  profileAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  profileAvatarText: { fontSize: 24 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '600' },
  profileEmail: { fontSize: 14, marginTop: 2 },
  planRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  planChangeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  planChangeText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  versionText: { fontSize: 14, fontWeight: '500' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16, marginTop: 16, minHeight: 56, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  logoutIcon: { fontSize: 20, marginRight: 8 },
  logoutText: { fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { fontSize: 12 },
});
