import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetPassword } from '../services/supabase';
import { useTheme } from '../theme';

interface Props {
  navigation: any;
}

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setError('メールアドレスを入力してください');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('有効なメールアドレスを入力してください');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateEmail()) return;
    
    setIsLoading(true);
    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        setIsSubmitted(true);
      } else {
        // Map common Supabase errors to Japanese
        let errorMessage = result.error || 'パスワードリセットに失敗しました';
        if (result.error?.includes('User not found')) {
          errorMessage = 'このメールアドレスは登録されていません';
        } else if (result.error?.includes('Email rate limit exceeded')) {
          errorMessage = 'メール送信の制限に達しました。しばらく待ってからお試しください';
        }
        Alert.alert('エラー', errorMessage);
      }
    } catch (error) {
      Alert.alert('エラー', '予期せぬエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        Alert.alert('送信完了', 'パスワードリセットメールを再送信しました。');
      } else {
        let errorMessage = result.error || '再送信に失敗しました';
        if (result.error?.includes('Email rate limit exceeded')) {
          errorMessage = 'メール送信の制限に達しました。しばらく待ってからお試しください';
        }
        Alert.alert('エラー', errorMessage);
      }
    } catch (error) {
      Alert.alert('エラー', '予期せぬエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsResending(false);
    }
  };

  if (isSubmitted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>

          <View style={styles.successContent}>
            <Text style={styles.successEmoji}>📧</Text>
            <Text style={[styles.successTitle, { color: colors.text }]}>メールを送信しました</Text>
            <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
              {email} に{'\n'}
              パスワードリセットのリンクを送信しました。{'\n'}
              メールをご確認ください。
            </Text>

            <TouchableOpacity 
              style={[styles.resendButton, isResending && styles.buttonDisabled]}
              onPress={handleResend}
              disabled={isResending}
            >
              {isResending ? (
                <ActivityIndicator color="#FF9800" size="small" />
              ) : (
                <Text style={styles.resendButtonText}>メールが届かない場合は再送信</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backToLoginButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.backToLoginText}>ログイン画面に戻る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🦤</Text>
            <Text style={[styles.title, { color: colors.text }]}>パスワードをリセット</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              アカウントに登録されているメールアドレスを入力してください。{'\n'}
              パスワードリセットのリンクをお送りします。
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>メールアドレス</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: isDark ? '#444' : '#E0E0E0', color: colors.text }, error && styles.inputError]}
                placeholder="example@email.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                editable={!isLoading}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.buttonDisabled]} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>リセットリンクを送信</Text>
              )}
            </TouchableOpacity>

            {/* Info */}
            <View style={[styles.infoContainer, { backgroundColor: isDark ? '#3D2E00' : '#FFF3E0' }]}>
              <Text style={styles.infoEmoji}>💡</Text>
              <Text style={[styles.infoText, { color: isDark ? '#FFB74D' : '#E65100' }]}>
                メールが届かない場合は、迷惑メールフォルダもご確認ください。
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>パスワードを思い出しましたか？</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isLoading}>
              <Text style={styles.footerLink}>ログイン</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#E57373',
  },
  errorText: {
    color: '#E57373',
    fontSize: 12,
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#FF9800',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  infoEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 32,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  footerLink: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Success State Styles
  successContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  successEmoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  resendButton: {
    paddingVertical: 12,
    marginBottom: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  resendButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '500',
  },
  backToLoginButton: {
    backgroundColor: '#FF9800',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  backToLoginText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
