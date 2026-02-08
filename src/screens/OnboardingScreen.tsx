import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// 人気エージェント（ステップ4用）
const POPULAR_AGENTS = [
  {
    id: 'fitness-coach',
    emoji: '💪',
    name: 'フィットネスコーチ',
    description: '運動習慣をサポート',
    color: '#FF6B6B',
  },
  {
    id: 'language-sensei',
    emoji: '🗣️',
    name: '語学マスター',
    description: '毎日の学習を応援',
    color: '#4ECDC4',
  },
  {
    id: 'productivity-guru',
    emoji: '📈',
    name: '習慣コーチ',
    description: '目標達成をサポート',
    color: '#9B59B6',
  },
];

interface OnboardingSlide {
  id: string;
  type: 'welcome' | 'features' | 'howto' | 'select-agent';
  title: string;
  subtitle?: string;
  color: string;
  bgColor: string;
}

const ONBOARDING_DATA: OnboardingSlide[] = [
  {
    id: '1',
    type: 'welcome',
    title: 'DoDo へようこそ！🦤',
    subtitle: 'あなた専用のAIコーチが\n目標達成をサポートします',
    color: '#FF9800',
    bgColor: '#FFF3E0',
  },
  {
    id: '2',
    type: 'features',
    title: 'こんなことができます',
    color: '#81C784',
    bgColor: '#E8F5E9',
  },
  {
    id: '3',
    type: 'howto',
    title: '話しかけるだけでOK！',
    subtitle: 'ボタンをタップして簡単スタート',
    color: '#BA68C8',
    bgColor: '#F3E5F5',
  },
  {
    id: '4',
    type: 'select-agent',
    title: '最初のコーチを選ぼう',
    subtitle: 'あとで変更もできます',
    color: '#FFB74D',
    bgColor: '#FFF3E0',
  },
];

interface Props {
  onComplete: (selectedAgentId?: string) => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else if (selectedAgent) {
      onComplete(selectedAgent);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
  };

  const handleAgentSelectAndComplete = (agentId: string) => {
    setSelectedAgent(agentId);
    // 少し遅延を入れてから完了
    setTimeout(() => {
      onComplete(agentId);
    }, 300);
  };

  // ステップ1: ウェルカム画面
  const renderWelcome = (item: OnboardingSlide) => (
    <View style={[styles.slide, { backgroundColor: item.bgColor }]}>
      <View style={styles.content}>
        {/* 複数のエージェント絵文字 */}
        <View style={styles.agentEmojisContainer}>
          <Text style={styles.agentEmoji}>🤖</Text>
          <Text style={[styles.agentEmoji, styles.centerEmoji]}>🦤</Text>
          <Text style={styles.agentEmoji}>🎯</Text>
        </View>
        <View style={styles.secondaryEmojis}>
          <Text style={styles.smallEmoji}>💪</Text>
          <Text style={styles.smallEmoji}>📚</Text>
          <Text style={styles.smallEmoji}>🏃</Text>
          <Text style={styles.smallEmoji}>✨</Text>
        </View>
        <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
        <Text style={styles.welcomeSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  // ステップ2: 機能紹介
  const renderFeatures = (item: OnboardingSlide) => (
    <View style={[styles.slide, { backgroundColor: item.bgColor }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
        
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>📝</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureCheck}>✅ 毎日の記録をサポート</Text>
              <Text style={styles.featureDesc}>活動や気分を簡単に記録</Text>
            </View>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>📅</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureCheck}>✅ 週間プランを自動作成</Text>
              <Text style={styles.featureDesc}>あなたに合った計画を提案</Text>
            </View>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>🔔</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureCheck}>✅ リマインダーで習慣化</Text>
              <Text style={styles.featureDesc}>忘れずに続けられる</Text>
            </View>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureCheck}>✅ 進捗を可視化</Text>
              <Text style={styles.featureDesc}>成長が目に見える</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  // ステップ3: 使い方
  const renderHowTo = (item: OnboardingSlide) => (
    <View style={[styles.slide, { backgroundColor: item.bgColor }]}>
      <View style={styles.content}>
        <Text style={styles.howtoEmoji}>💬</Text>
        <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
        <Text style={styles.howtoSubtitle}>{item.subtitle}</Text>
        
        {/* クイックアクションボタンのプレビュー */}
        <View style={styles.quickActionsPreview}>
          <Text style={styles.previewLabel}>ワンタップで操作</Text>
          <View style={styles.previewButtons}>
            <View style={[styles.previewButton, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.previewButtonEmoji}>📝</Text>
              <Text style={styles.previewButtonText}>記録</Text>
            </View>
            <View style={[styles.previewButton, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.previewButtonEmoji}>📊</Text>
              <Text style={styles.previewButtonText}>進捗</Text>
            </View>
            <View style={[styles.previewButton, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.previewButtonEmoji}>💡</Text>
              <Text style={styles.previewButtonText}>アドバイス</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.tipContainer}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            わからなくなったら{'\n'}
            「何ができる？」と聞いてね
          </Text>
        </View>
      </View>
    </View>
  );

  // ステップ4: エージェント選択
  const renderSelectAgent = (item: OnboardingSlide) => (
    <View style={[styles.slide, { backgroundColor: item.bgColor }]}>
      <View style={styles.content}>
        <Text style={styles.selectEmoji}>🎯</Text>
        <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
        <Text style={styles.selectSubtitle}>{item.subtitle}</Text>
        
        <View style={styles.agentsContainer}>
          {POPULAR_AGENTS.map((agent) => (
            <TouchableOpacity
              key={agent.id}
              style={[
                styles.agentCard,
                selectedAgent === agent.id && styles.agentCardSelected,
                selectedAgent === agent.id && { borderColor: agent.color },
              ]}
              onPress={() => handleAgentSelectAndComplete(agent.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.agentAvatarContainer, { backgroundColor: agent.color + '20' }]}>
                <Text style={styles.agentCardEmoji}>{agent.emoji}</Text>
              </View>
              <Text style={styles.agentName}>{agent.name}</Text>
              <Text style={styles.agentDescription}>{agent.description}</Text>
              {selectedAgent === agent.id && (
                <View style={[styles.selectedBadge, { backgroundColor: agent.color }]}>
                  <Text style={styles.selectedBadgeText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: OnboardingSlide }) => {
    switch (item.type) {
      case 'welcome':
        return renderWelcome(item);
      case 'features':
        return renderFeatures(item);
      case 'howto':
        return renderHowTo(item);
      case 'select-agent':
        return renderSelectAgent(item);
      default:
        return null;
    }
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {ONBOARDING_DATA.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: ONBOARDING_DATA[currentIndex].color,
              },
            ]}
          />
        );
      })}
    </View>
  );

  const isLastSlide = currentIndex === ONBOARDING_DATA.length - 1;
  const currentColor = ONBOARDING_DATA[currentIndex].color;
  const showNextButton = !isLastSlide; // 最後はエージェント選択で完了

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>スキップ</Text>
          </TouchableOpacity>
        )}
        {isLastSlide && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>あとで選ぶ</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {renderDots()}

      <View style={styles.footer}>
        {showNextButton && (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: currentColor }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>次へ →</Text>
          </TouchableOpacity>
        )}
        {isLastSlide && (
          <View style={styles.selectHint}>
            <Text style={styles.selectHintText}>
              👆 タップしてコーチを選択
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#888',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  
  // ステップ1: ウェルカム
  agentEmojisContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  agentEmoji: {
    fontSize: 48,
    marginHorizontal: 8,
  },
  centerEmoji: {
    fontSize: 72,
  },
  secondaryEmojis: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  smallEmoji: {
    fontSize: 28,
    marginHorizontal: 8,
    opacity: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    lineHeight: 28,
  },
  
  // ステップ2: 機能紹介
  featuresContainer: {
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureCheck: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: '#888',
  },
  
  // ステップ3: 使い方
  howtoEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  howtoSubtitle: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  quickActionsPreview: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  previewButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    width: 80,
  },
  previewButtonEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  previewButtonText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(186, 104, 200, 0.15)',
    padding: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#7B1FA2',
    lineHeight: 22,
    flex: 1,
  },
  
  // ステップ4: エージェント選択
  selectEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  selectSubtitle: {
    fontSize: 15,
    color: '#888',
    marginBottom: 24,
  },
  agentsContainer: {
    width: '100%',
    gap: 12,
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  agentCardSelected: {
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  agentAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  agentCardEmoji: {
    fontSize: 28,
  },
  agentName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  agentDescription: {
    fontSize: 13,
    color: '#888',
    position: 'absolute',
    left: 86,
    bottom: 16,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // 共通
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    minHeight: 70,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  selectHint: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  selectHintText: {
    fontSize: 16,
    color: '#FFB74D',
    fontWeight: '500',
  },
});
