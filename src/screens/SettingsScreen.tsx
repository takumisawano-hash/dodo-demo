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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t, useI18n, getAvailableLanguages, setLanguage, formatDate, LanguageCode } from '../i18n';

interface Props {
  navigation: any;
}

export default function SettingsScreen({ navigation }: Props) {
  const { language, setLanguage: changeLanguage, availableLanguages } = useI18n();
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.logout'), style: 'destructive', onPress: () => {
          console.log('Logging out...');
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

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(err => 
      console.error('Failed to open URL:', err)
    );
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
    textColor = '#333',
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
      style={[styles.settingRow, disabled && styles.settingRowDisabled]} 
      onPress={onPress}
      disabled={isSwitch || disabled}
      activeOpacity={isSwitch || disabled ? 1 : 0.7}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingTitle, 
          { color: textColor },
          disabled && styles.settingTitleDisabled
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, disabled && styles.settingSubtitleDisabled]}>
            {subtitle}
          </Text>
        )}
      </View>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#E0E0E0', true: '#81C784' }}
          thumbColor={switchValue ? '#4CAF50' : '#FFFFFF'}
          disabled={disabled}
        />
      ) : value ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : showArrow ? (
        <Text style={[styles.settingArrow, disabled && styles.settingArrowDisabled]}>→</Text>
      ) : null}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Info Section */}
        <SectionHeader title={t('settings.accountInfo')} />
        <View style={styles.settingsCard}>
          {/* Profile */}
          <TouchableOpacity style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{user.avatar}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>

          {/* Current Plan */}
          <TouchableOpacity 
            style={styles.planRow}
            onPress={() => navigation.navigate('Pricing')}
          >
            <Text style={styles.settingIcon}>👑</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.currentPlan')}</Text>
              <Text style={styles.settingSubtitle}>
                {t('settings.planExpiry', { 
                  plan: subscription.plan, 
                  date: formatDate(subscription.expiresAt) 
                })}
              </Text>
            </View>
            <View style={styles.planChangeBadge}>
              <Text style={styles.planChangeText}>{t('settings.changePlan')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Settings Section */}
        <SectionHeader title={t('settings.appSettings')} />
        <View style={styles.settingsCard}>
          <SettingRow
            icon="🔔"
            title={t('settings.notifications')}
            subtitle={t('settings.notificationsSubtitle')}
            onPress={() => Alert.alert(t('settings.notifications'), t('settings.notificationsSubtitle'))}
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
            subtitle={t('settings.darkModeSubtitle')}
            isSwitch
            switchValue={darkMode}
            onSwitchChange={setDarkMode}
            disabled={true}
          />
        </View>

        {/* Support Section */}
        <SectionHeader title={t('settings.support')} />
        <View style={styles.settingsCard}>
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
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingIcon}>📱</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.appVersion')}</Text>
            </View>
            <Text style={styles.versionText}>v{appVersion}</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('settings.copyright')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 8,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingRowDisabled: {
    opacity: 0.6,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
  settingTitleDisabled: {
    color: '#999',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  settingSubtitleDisabled: {
    color: '#BBB',
  },
  settingValue: {
    fontSize: 14,
    color: '#888',
    marginRight: 8,
  },
  settingArrow: {
    fontSize: 16,
    color: '#CCC',
  },
  settingArrowDisabled: {
    color: '#E0E0E0',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileAvatarText: {
    fontSize: 24,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  profileEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  planChangeBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planChangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  versionText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#CCC',
  },
});
