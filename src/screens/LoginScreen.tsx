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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn, signInWithOAuth, OAuthProvider } from '../services/supabase';
import { useTheme } from '../theme';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { ErrorToast, useErrorHandler } from '../components/ErrorDisplay';

interface Props {
  navigation: any;
}

export default function LoginScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { error, handleError, clearError } = useErrorHandler();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<OAuthProvider | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    input: { 
      backgroundColor: colors.surface, 
      borderColor: colors.border,
      color: colors.text,
    },
    card: { backgroundColor: colors.card },
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }
    
    if (!password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (password.length < 6) {
      newErrors.password = 'パスワードは6文字以上で入力してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const result = await signIn({ email, password });
      
      if (result.success) {
        navigation.replace('Home');
      } else {
        // Map common Supabase errors to Japanese
        let errorMessage = result.error || 'ログインに失敗しました';
        if (result.error?.includes('Invalid login credentials')) {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません';
        } else if (result.error?.includes('Email not confirmed')) {
          errorMessage = 'メールアドレスが確認されていません。メールをご確認ください';
        }
        setToastMessage(errorMessage);
      }
    } catch (e) {
      handleError(e);
      setToastMessage('予期せぬエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: OAuthProvider) => {
    setSocialLoading(provider);
    try {
      const result = await signInWithOAuth(provider);
      
      if (!result.success) {
        setToastMessage(result.error || `${provider === 'apple' ? 'Apple' : 'Google'}ログインに失敗しました`);
      }
    } catch (e) {
      handleError(e);
      setToastMessage('予期せぬエラーが発生しました。もう一度お試しください。');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🦤</Text>
            <Text style={[styles.title, dynamicStyles.text]}>DoDo</Text>
            <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>おかえりなさい！</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.text]}>メールアドレス</Text>
              <TextInput
                style={[
                  styles.input, 
                  dynamicStyles.input,
                  errors.email && { borderColor: colors.error }
                ]}
                placeholder="example@email.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.email && <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.text]}>パスワード</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input, 
                    styles.passwordInput, 
                    dynamicStyles.input,
                    errors.password && { borderColor: colors.error }
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={[styles.errorText, { color: colors.error }]}>{errors.password}</Text>}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity 
              style={styles.forgotButton}
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={isLoading}
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>パスワードをお忘れですか？</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity 
              style={[
                styles.loginButton, 
                { backgroundColor: colors.primary },
                isLoading && styles.buttonDisabled
              ]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginButtonText}>ログイン</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, dynamicStyles.textSecondary]}>または</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Social Login */}
            <TouchableOpacity 
              style={[
                styles.socialButton, 
                { backgroundColor: isDark ? '#333' : '#000' },
                socialLoading === 'apple' && styles.buttonDisabled
              ]}
              onPress={() => handleSocialLogin('apple')}
              disabled={isLoading || socialLoading !== null}
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.socialIcon}>🍎</Text>
                  <Text style={styles.socialButtonText}>Appleでログイン</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.socialButton, 
                styles.googleButton, 
                { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border 
                },
                socialLoading === 'google' && styles.buttonDisabled
              ]}
              onPress={() => handleSocialLogin('google')}
              disabled={isLoading || socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Text style={styles.socialIcon}>G</Text>
                  <Text style={[styles.socialButtonText, styles.googleButtonText, dynamicStyles.text]}>Googleでログイン</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, dynamicStyles.textSecondary]}>アカウントをお持ちでないですか？</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={isLoading}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>新規登録</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading Overlay */}
      <LoadingOverlay visible={isLoading && socialLoading !== null} message="ログイン中..." />
      
      {/* Error Toast */}
      <ErrorToast 
        visible={!!toastMessage} 
        message={toastMessage} 
        onDismiss={() => setToastMessage('')} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 32 },
  logo: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 36, fontWeight: 'bold' },
  subtitle: { fontSize: 18, marginTop: 8 },
  form: { flex: 1 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeButton: { position: 'absolute', right: 16, top: 14 },
  eyeIcon: { fontSize: 20 },
  errorText: { fontSize: 12, marginTop: 6 },
  forgotButton: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { fontSize: 14, fontWeight: '500' },
  loginButton: { borderRadius: 25, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 56, shadowColor: '#FF9800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginButtonText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: 16, fontSize: 14 },
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 25, paddingVertical: 14, marginBottom: 12, minHeight: 52 },
  googleButton: { borderWidth: 1 },
  socialIcon: { fontSize: 20, marginRight: 10 },
  socialButtonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  googleButtonText: { color: '#333' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 24 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
});
