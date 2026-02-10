import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { purchaseService } from '../services/purchases';
import { useTheme } from '../theme';

interface Props {
  navigation: any;
  route?: {
    params?: {
      reason?: 'message_limit' | 'agent_locked' | 'feature_locked';
      agentName?: string;
      featureName?: string;
    };
  };
}

export default function PaywallScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  
  const reason = route?.params?.reason || 'message_limit';
  const agentName = route?.params?.agentName;
  const featureName = route?.params?.featureName;

  const getMessage = () => {
    switch (reason) {
      case 'message_limit':
        return {
          emoji: '💬',
          title: '今日のメッセージ上限に達しました',
          description: '無料プランでは1日3メッセージまでです。\nアップグレードして無制限で会話しましょう！',
        };
      case 'agent_locked':
        return {
          emoji: '🔒',
          title: `${agentName || 'このエージェント'}はロックされています`,
          description: '無料プランでは1体のエージェントのみ利用可能です。\nアップグレードして全員と話しましょう！',
        };
      case 'feature_locked':
        return {
          emoji: '⭐',
          title: `${featureName || 'この機能'}はProプラン限定です`,
          description: 'Proプランにアップグレードして\nすべての機能をアンロックしましょう！',
        };
      default:
        return {
          emoji: '🚀',
          title: 'もっと活用しませんか？',
          description: 'アップグレードしてDoDoの全機能を\n体験しましょう！',
        };
    }
  };

  const message = getMessage();

  const handleUpgrade = () => {
    navigation.navigate('Subscription');
  };

  const handleStartTrial = async () => {
    Alert.alert(
      '7日間無料トライアル',
      'Basicプランを7日間無料でお試しいただけます。\n期間中はいつでもキャンセル可能です。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '無料で試す',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Initialize RevenueCat and start free trial (Basic plan)
              await purchaseService.initialize();
              const result = await purchaseService.startFreeTrial();
              
              if (result.success) {
                Alert.alert(
                  '🎉 トライアル開始',
                  '7日間の無料トライアルが開始されました！\nすべての機能をお楽しみください。',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } else if (result.cancelled) {
                // User cancelled, do nothing
              } else {
                Alert.alert('エラー', result.error || 'トライアル開始に失敗しました');
              }
            } catch (error) {
              console.error('Trial error:', error);
              Alert.alert('エラー', 'トライアル開始中にエラーが発生しました');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDismiss = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={[styles.closeButton, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]} onPress={handleDismiss}>
        <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>あとで</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Main Message */}
        <Text style={styles.emoji}>{message.emoji}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{message.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{message.description}</Text>

        {/* Features Preview */}
        <View style={[styles.featuresContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>Basicプランで得られるもの</Text>
          <FeatureItem emoji="💬" text="無制限メッセージ" />
          <FeatureItem emoji="🦤" text="全エージェント利用可能" />
          <FeatureItem emoji="📧" text="メールサポート" />
        </View>

        {/* Price Comparison */}
        <View style={[styles.priceComparison, { backgroundColor: isDark ? '#2A2A2A' : '#FFF8E1' }]}>
          <View style={styles.priceOption}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>月額プラン</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>¥480/月</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceOption}>
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>お得！</Text>
            </View>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>年額プラン</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>¥3,800/年</Text>
            <Text style={styles.savingsText}>2ヶ月分お得 💰</Text>
          </View>
        </View>

        {/* Trial Banner */}
        <View style={[styles.trialBanner, { backgroundColor: isDark ? '#1B3D1B' : '#E8F5E9' }]}>
          <Text style={[styles.trialText, { color: isDark ? '#81C784' : '#2E7D32' }]}>🎁 7日間無料トライアル実施中</Text>
          <Text style={[styles.trialSubtext, { color: isDark ? '#A5D6A7' : '#388E3C' }]}>期間中いつでもキャンセル無料</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleStartTrial}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>7日間無料で試す</Text>
              <Text style={styles.primaryButtonSubtext}>その後 ¥480/月</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: '#FF9800' }]}
          onPress={handleUpgrade}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>すべてのプランを見る</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>今はスキップ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ emoji, text }: { emoji: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={[styles.featureText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#444',
  },
  priceComparison: {
    flexDirection: 'row',
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  priceOption: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  priceDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  priceLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -24,
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bestValueText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  savingsText: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '500',
  },
  trialBanner: {
    marginTop: 20,
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
  },
  trialText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
  },
  trialSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  primaryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  primaryButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF9800',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#999',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
