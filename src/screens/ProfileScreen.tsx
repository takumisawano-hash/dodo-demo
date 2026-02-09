import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

// Mock user data
const USER = {
  name: 'たくみ',
  email: 'takumi@example.com',
  avatar: null, // Will use initials
  joinDate: '2024年12月',
  subscription: 'Pro',
};

const STATS = [
  { label: '会話数', value: '128', iconName: 'chatbubbles' },
  { label: '連続日数', value: '14', iconName: 'flame' },
  { label: '達成目標', value: '23', iconName: 'flag' },
];

const ALL_ACHIEVEMENTS = [
  { id: 1, name: '初チャット', icon: '🌟', unlocked: true, description: '初めてエージェントとチャット' },
  { id: 2, name: '7日連続', icon: '📅', unlocked: true, description: '7日連続でアプリを使用' },
  { id: 3, name: '習慣マスター', icon: '🏆', unlocked: false, description: '30日間の習慣を達成' },
  { id: 4, name: '語学の達人', icon: '📚', unlocked: false, description: '100回のレッスン完了' },
  { id: 5, name: '早起き鳥', icon: '🐦', unlocked: true, description: '朝6時前にチェックイン' },
  { id: 6, name: '健康志向', icon: '🥗', unlocked: false, description: '食事を30日間記録' },
  { id: 7, name: 'メンタルマスター', icon: '🧘', unlocked: false, description: '瞑想を100回完了' },
  { id: 8, name: '友達100人', icon: '👥', unlocked: false, description: '10人の友達を招待' },
];

interface Props {
  navigation: any;
}

export default function ProfileScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const displayedAchievements = showAllAchievements 
    ? ALL_ACHIEVEMENTS 
    : ALL_ACHIEVEMENTS.slice(0, 4);

  const handleEditAvatar = () => {
    Alert.alert(
      'プロフィール画像',
      '画像を変更しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'カメラで撮影', onPress: () => Alert.alert('カメラ', 'カメラ機能は今後実装予定です') },
        { text: 'ライブラリから選択', onPress: () => Alert.alert('ライブラリ', 'ライブラリ機能は今後実装予定です') },
      ]
    );
  };

  const handleViewAllAchievements = () => {
    setShowAllAchievements(!showAllAchievements);
  };

  const handleViewDetailedStats = () => {
    navigation.navigate('Stats');
  };

  const handleInviteFriends = async () => {
    try {
      const result = await Share.share({
        message: 'DoDo Appで一緒に目標達成しよう！🦤\n\nhttps://dodo-app.example.com/invite?ref=takumi',
        title: 'DoDo Appに招待',
      });
      if (result.action === Share.sharedAction) {
        Alert.alert('招待完了', '友達を招待しました！🎉');
      }
    } catch (error) {
      Alert.alert('エラー', '招待リンクの共有に失敗しました');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>プロフィール</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.avatarContainer}>
            {USER.avatar ? (
              <Image source={{ uri: USER.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(USER.name)}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton} onPress={handleEditAvatar}>
              <Text style={styles.editAvatarIcon}>📷</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.userName, { color: colors.text }]}>{USER.name}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{USER.email}</Text>
          
          <View style={[styles.subscriptionBadge, { backgroundColor: isDark ? '#3D2E00' : '#FFF3E0' }]}>
            <Ionicons name="sparkles" size={14} color="#FB8C00" style={{ marginRight: 6 }} />
            <Text style={styles.subscriptionText}>{USER.subscription}プラン</Text>
          </View>
          
          <Text style={[styles.joinDate, { color: colors.textSecondary }]}>{USER.joinDate}から利用中</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>統計</Text>
        </View>
        
        <View style={styles.statsContainer}>
          {STATS.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Ionicons name={stat.iconName as any} size={24} color={colors.text} style={{ marginBottom: 8 }} />
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Achievements Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>実績</Text>
          <TouchableOpacity onPress={handleViewAllAchievements}>
            <Text style={styles.seeAllText}>
              {showAllAchievements ? '閉じる ↑' : 'すべて見る →'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.achievementsContainer}>
          {displayedAchievements.map((achievement) => (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                { backgroundColor: colors.card },
                !achievement.unlocked && [styles.achievementLocked, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }],
              ]}
            >
              <Text style={[
                styles.achievementIcon,
                !achievement.unlocked && styles.achievementIconLocked,
              ]}>
                {achievement.icon}
              </Text>
              <Text style={[
                styles.achievementName,
                { color: colors.text },
                !achievement.unlocked && [styles.achievementNameLocked, { color: colors.textSecondary }],
              ]}>
                {achievement.name}
              </Text>
              {!achievement.unlocked && (
                <Text style={styles.lockedIcon}>🔒</Text>
              )}
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={[styles.actionsContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={[styles.actionText, { color: colors.text }]}>設定</Text>
            <Text style={[styles.actionArrow, { color: colors.textSecondary }]}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}
            onPress={handleViewDetailedStats}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={[styles.actionText, { color: colors.text }]}>詳細な統計</Text>
            <Text style={[styles.actionArrow, { color: colors.textSecondary }]}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}
            onPress={handleInviteFriends}
          >
            <Text style={styles.actionIcon}>🎁</Text>
            <Text style={[styles.actionText, { color: colors.text }]}>友達を招待</Text>
            <Text style={[styles.actionArrow, { color: colors.textSecondary }]}>→</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
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
  // Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  editAvatarIcon: {
    fontSize: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  subscriptionIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  subscriptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FB8C00',
  },
  joinDate: {
    fontSize: 13,
    color: '#AAA',
    marginTop: 12,
  },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF9800',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  // Achievements
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    marginHorizontal: -4,
  },
  achievementCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: '1%',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  achievementLocked: {
    backgroundColor: '#F5F5F5',
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  achievementIconLocked: {
    opacity: 0.4,
  },
  achievementName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  achievementNameLocked: {
    color: '#AAA',
  },
  lockedIcon: {
    fontSize: 12,
  },
  // Actions
  actionsContainer: {
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  actionArrow: {
    fontSize: 16,
    color: '#CCC',
  },
});
