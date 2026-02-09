import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';

// ----------------------------------------
// Types
// ----------------------------------------
interface Props {
  visible: boolean;
  onClose: () => void;
  onPurchase: () => void;
  agentEmoji: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ----------------------------------------
// メッセージパック購入モーダル
// ----------------------------------------
export default function MessagePackModal({
  visible,
  onClose,
  onPurchase,
  agentEmoji,
}: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // スライドイン
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // スライドアウト
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  // 購入ボタン押下時のAlert確認
  const handlePurchasePress = () => {
    Alert.alert(
      'メッセージパックを購入',
      '+50回のメッセージを¥200で購入しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '購入する',
          onPress: () => {
            onPurchase();
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* 背景オーバーレイ */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* モーダルコンテンツ */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* ドラッグハンドル */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* エージェント絵文字 */}
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{agentEmoji}</Text>
        </View>

        {/* タイトル */}
        <Text style={styles.title}>今日はたくさん話したね！🌙</Text>

        {/* 説明 */}
        <Text style={styles.description}>
          今日のメッセージ上限に達しました。{'\n'}
          追加パックを購入するか、明日また話しましょう！
        </Text>

        {/* ボタン */}
        <View style={styles.buttonContainer}>
          {/* プライマリボタン（購入） */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePurchasePress}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>+50回追加（¥200）</Text>
          </TouchableOpacity>

          {/* セカンダリボタン（閉じる） */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>明日また話そう</Text>
          </TouchableOpacity>
        </View>

        {/* 注意書き */}
        <Text style={styles.note}>
          購入したパックは今日中有効です
        </Text>
      </Animated.View>
    </Modal>
  );
}

// ----------------------------------------
// Styles
// ----------------------------------------
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },

  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },

  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
  },

  emojiContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  emoji: {
    fontSize: 64,
    textAlign: 'center',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },

  description: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },

  buttonContainer: {
    gap: 12,
  },

  primaryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },

  secondaryButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666666',
    fontSize: 17,
    fontWeight: '500',
  },

  note: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginTop: 16,
  },
});
