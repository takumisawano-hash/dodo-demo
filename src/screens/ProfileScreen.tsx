import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock user data
const USER = {
  name: 'たくみ',
  email: 'takumi@example.com',
  avatar: null, // Will use initials
  joinDate: '2024年12月',
  subscription: 'Pro',
  totalDays: 45,
};

const STATS = [
  { label: '会話数', value: '128', iconName: 'chatbubbles', color: '#667eea', trend: '+12' },
  { label: '連続日数', value: '14', iconName: 'flame', color: '#FF6B6B', trend: '🔥' },
  { label: '達成目標', value: '23', iconName: 'flag', color: '#4CAF50', trend: '+3' },
];

const WEEKLY_ACTIVITY = [
  { day: '月', value: 80 },
  { day: '火', value: 100 },
  { day: '水', value: 60 },
  { day: '木', value: 90 },
  { day: '金', value: 70 },
  { day: '土', value: 40 },
  { day: '日', value: 85 },
];

const ALL_ACHIEVEMENTS = [
  { id: 1, name: '初チャット', iconName: 'star', unlocked: true, description: '初めてエージェントとチャット', unlockedAt: '2024/12/01' },
  { id: 2, name: '7日連続', iconName: 'calendar', unlocked: true, description: '7日連続でアプリを使用', unlockedAt: '2024/12/08' },
  { id: 3, name: '習慣マスター', iconName: 'trophy', unlocked: false, description: '30日間の習慣を達成', progress: 14, total: 30 },
  { id: 4, name: '語学の達人', iconName: 'book', unlocked: false, description: '100回のレッスン完了', progress: 45, total: 100 },
  { id: 5, name: '早起き鳥', iconName: 'sunny', unlocked: true, description: '朝6時前にチェックイン', unlockedAt: '2024/12/15' },
  { id: 6, name: '健康志向', iconName: 'nutrition', unlocked: false, description: '食事を30日間記録', progress: 8, total: 30 },
  { id: 7, name: 'メンタルマスター', iconName: 'heart', unlocked: false, description: '瞑想を100回完了', progress: 22, total: 100 },
  { id: 8, name: '友達100人', iconName: 'people', unlocked: false, description: '10人の友達を招待', progress: 2, total: 10 },
];

interface Props {
  navigation: any;
}

export default function ProfileScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<typeof ALL_ACHIEVEMENTS[0] | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const unlockedCount = ALL_ACHIEVEMENTS.filter(a => a.unlocked).length;
  const displayedAchievements = showAllAchievements 
    ? ALL_ACHIEVEMENTS 
    : ALL_ACHIEVEMENTS.slice(0, 4);

  const pickImageFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('許可が必要です', 'カメラを使用するには許可が必要です。設定から許可してください。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarImage(result.assets[0].uri);
      setAvatarEmoji(null);
    }
  };

  const pickImageFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('許可が必要です', 'フォトライブラリにアクセスするには許可が必要です。設定から許可してください。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarImage(result.assets[0].uri);
      setAvatarEmoji(null);
    }
  };

  const selectEmoji = () => {
    const emojis = ['😀', '😎', '🦤', '🐨', '🦉', '🦜', '🦢', '🐰', '🦊', '🐻', '🐼', '🦁'];
    Alert.alert(
      '🎨 絵文字を選択',
      '好きな絵文字をタップしてください',
      emojis.map(emoji => ({
        text: emoji,
        onPress: () => {
          setAvatarEmoji(emoji);
          setAvatarImage(null);
        },
      }))
    );
  };

  const handleEditAvatar = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    Alert.alert(
      '📷 プロフィール画像',
      '画像を変更しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '📸 カメラで撮影', onPress: pickImageFromCamera },
        { text: '🖼️ ライブラリから選択', onPress: pickImageFromLibrary },
        { text: '🎨 絵文字を選択', onPress: selectEmoji },
      ]
    );
  };

  const handleViewAllAchievements = () => {
    setShowAllAchievements(!showAllAchievements);
  };

  const handleAchievementPress = (achievement: typeof ALL_ACHIEVEMENTS[0]) => {
    setSelectedAchievement(achievement);
    if (achievement.unlocked) {
      Alert.alert(
        `🏆 ${achievement.name}`,
        `${achievement.description}\n\n達成日: ${achievement.unlockedAt}`,
        [
          { text: 'シェア', onPress: () => handleShareAchievement(achievement) },
          { text: '閉じる' },
        ]
      );
    } else {
      const progressPercent = achievement.progress && achievement.total 
        ? Math.round((achievement.progress / achievement.total) * 100) 
        : 0;
      Alert.alert(
        `🔒 ${achievement.name}`,
        `${achievement.description}\n\n進捗: ${achievement.progress}/${achievement.total} (${progressPercent}%)`,
        [{ text: '閉じる' }]
      );
    }
  };

  const handleShareAchievement = async (achievement: typeof ALL_ACHIEVEMENTS[0]) => {
    try {
      await Share.share({
        message: `🏆 DoDo Appで「${achievement.name}」を達成しました！\n${achievement.description}\n\n#DoDo #自己改善`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleViewDetailedStats = () => {
    Alert.alert(
      '📊 詳細な統計',
      'この機能は今後のアップデートで追加予定です！\n\n現在の統計情報はこのページでご確認いただけます。',
      [{ text: 'OK' }]
    );
  };

  const handleInviteFriends = async () => {
    try {
      const result = await Share.share({
        message: 'DoDo Appで一緒に目標達成しよう！🦤\n\nhttps://dodo-app.example.com/invite?ref=takumi',
        title: 'DoDo Appに招待',
      });
      if (result.action === Share.sharedAction) {
        Alert.alert('🎉 招待完了', '友達を招待しました！');
      }
    } catch (error) {
      Alert.alert('エラー', '招待リンクの共有に失敗しました');
    }
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `🦤 ${USER.name}のDoDo プロフィール\n\n📊 会話数: 128\n🔥 連続記録: 14日\n🏆 実績: ${unlockedCount}/${ALL_ACHIEVEMENTS.length}\n\nDoDo Appで一緒に成長しよう！`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>プロフィール</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShareProfile}>
          <Ionicons name="share-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: scaleAnim }] }]}>
            {avatarImage ? (
              <Image source={{ uri: avatarImage }} style={styles.avatar} />
            ) : avatarEmoji ? (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.emojiAvatar}>{avatarEmoji}</Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(USER.name)}</Text>
              </View>
            )}
            <TouchableOpacity style={[styles.editAvatarButton, { backgroundColor: colors.card }]} onPress={handleEditAvatar}>
              <Ionicons name="camera" size={16} color={colors.text} />
            </TouchableOpacity>
          </Animated.View>
          
          <Text style={[styles.userName, { color: colors.text }]}>{USER.name}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{USER.email}</Text>
          
          <View style={[styles.subscriptionBadge, { backgroundColor: isDark ? '#3D2E00' : '#FFF3E0' }]}>
            <Ionicons name="sparkles" size={14} color="#FB8C00" style={{ marginRight: 6 }} />
            <Text style={styles.subscriptionText}>{USER.subscription}プラン</Text>
          </View>
          
          <View style={styles.membershipInfo}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.joinDate, { color: colors.textSecondary }]}> {USER.joinDate}から利用中</Text>
            <Text style={[styles.totalDays, { color: colors.textSecondary }]}> • {USER.totalDays}日目</Text>
          </View>
        </View>

        {/* Stats Section with Graph */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 統計</Text>
          <TouchableOpacity onPress={handleViewDetailedStats}>
            <Text style={styles.seeAllText}>詳細 →</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsContainer}>
          {STATS.map((stat, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.statCard, { backgroundColor: colors.card }]}
              onPress={handleViewDetailedStats}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconBg, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.iconName as any} size={22} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              <View style={[styles.statTrend, { backgroundColor: stat.color + '15' }]}>
                <Text style={[styles.statTrendText, { color: stat.color }]}>{stat.trend}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weekly Activity Graph */}
        <View style={[styles.weeklyCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.weeklyTitle, { color: colors.text }]}>今週のアクティビティ</Text>
          <View style={styles.weeklyGraph}>
            {WEEKLY_ACTIVITY.map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: `${item.value}%`, 
                        backgroundColor: index === 6 ? '#667eea' : (isDark ? '#4A4A4A' : '#E0E0E0')
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🏆 実績</Text>
            <View style={[styles.achievementCount, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.achievementCountText, { color: colors.primary }]}>{unlockedCount}/{ALL_ACHIEVEMENTS.length}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleViewAllAchievements}>
            <Text style={styles.seeAllText}>
              {showAllAchievements ? '閉じる ↑' : 'すべて →'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.achievementsContainer}>
          {displayedAchievements.map((achievement) => (
            <TouchableOpacity
              key={achievement.id}
              style={[
                styles.achievementCard,
                { backgroundColor: colors.card },
                !achievement.unlocked && [styles.achievementLocked, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }],
              ]}
              onPress={() => handleAchievementPress(achievement)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.achievementIconBg,
                { backgroundColor: achievement.unlocked ? '#FFD700' + '30' : (isDark ? '#333' : '#E0E0E0') }
              ]}>
                <Ionicons 
                  name={achievement.iconName as any} 
                  size={20} 
                  color={achievement.unlocked ? '#FFD700' : colors.textSecondary} 
                />
              </View>
              <View style={styles.achievementContent}>
                <Text style={[
                  styles.achievementName,
                  { color: colors.text },
                  !achievement.unlocked && { color: colors.textSecondary },
                ]}>
                  {achievement.name}
                </Text>
                {!achievement.unlocked && achievement.progress !== undefined && (
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${(achievement.progress / (achievement.total || 1)) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                      {achievement.progress}/{achievement.total}
                    </Text>
                  </View>
                )}
              </View>
              {achievement.unlocked ? (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              ) : (
                <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={[styles.actionsContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={[styles.actionIconBg, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>設定</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}
            onPress={handleViewDetailedStats}
          >
            <View style={[styles.actionIconBg, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
              <Ionicons name="bar-chart-outline" size={20} color={colors.text} />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>詳細な統計</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { borderBottomWidth: 0 }]}
            onPress={handleInviteFriends}
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="gift-outline" size={20} color="#FF9800" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={[styles.actionText, { color: colors.text }]}>友達を招待</Text>
              <Text style={[styles.actionSubtext, { color: colors.textSecondary }]}>招待で1ヶ月無料!</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Profile Card
  profileCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emojiAvatar: {
    fontSize: 50,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  subscriptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FB8C00',
  },
  membershipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  joinDate: {
    fontSize: 13,
  },
  totalDays: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  achievementCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  achievementCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statTrend: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  statTrendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Weekly Activity
  weeklyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  weeklyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  weeklyGraph: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 100,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '60%',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 12,
  },
  
  // Achievements
  achievementsContainer: {
    marginBottom: 24,
    gap: 8,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  achievementLocked: {
    opacity: 0.8,
  },
  achievementIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementName: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Actions
  actionsContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  actionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  actionSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
});
