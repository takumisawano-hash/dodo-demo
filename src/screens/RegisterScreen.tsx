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
import { signUp, signInWithOAuth, OAuthProvider } from '../services/supabase';
import { useTheme } from '../theme';

interface Props {
  navigation: any;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<OAuthProvider | null>(null);

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    if (!name.trim()) {
      newErrors.name = '名前を入力してください';
    } else if (name.trim().length < 2) {
      newErrors.name = '名前は2文字以上で入力してください';
    }
    
    if (!email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }
    
    if (!password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (password.length < 8) {
      newErrors.password = 'パスワードは8文字以上で入力してください';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = '大文字、小文字、数字を含めてください';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'パスワードを再入力してください';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const result = await signUp({
        email,
        password,
        username: name.trim().toLowerCase().replace(/\s+/g, '_'),
        displayName: name.trim(),
      });
      
      if (result.success) {
        // Check if email confirmation is required
        if (result.session) {
          // User is immediately logged in
          navigation.replace('Home');
        } else {
          // Email confirmation required
          Alert.alert(
            '登録完了',
            '確認メールを送信しました。メールをご確認いただき、リンクをクリックして登録を完了してください。',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('Login'),
              },
            ]
          );
        }
      } else {
        // Map common Supabase errors to Japanese
        let errorMessage = result.error || '登録に失敗しました';
        if (result.error?.includes('User already registered')) {
          errorMessage = 'このメールアドレスは既に登録されています';
        } else if (result.error?.includes('Password should be at least')) {
          errorMessage = 'パスワードは8文字以上で入力してください';
        } else if (result.error?.includes('Unable to validate email')) {
          errorMessage = '有効なメールアドレスを入力してください';
        }
        Alert.alert('登録エラー', errorMessage);
      }
    } catch (error) {
      Alert.alert('エラー', '予期せぬエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = async (provider: OAuthProvider) => {
    setSocialLoading(provider);
    try {
      const result = await signInWithOAuth(provider);
      
      if (!result.success) {
        Alert.alert(
          '登録エラー',
          result.error || `${provider === 'apple' ? 'Apple' : 'Google'}での登録に失敗しました`
        );
      }
      // Note: For full OAuth implementation, you'll need to:
      // 1. Use expo-web-browser to open the OAuth URL
      // 2. Handle the callback URL with expo-auth-session
      // 3. Or use native sign-in libraries
    } catch (error) {
      Alert.alert('エラー', '予期せぬエラーが発生しました。もう一度お試しください。');
    } finally {
      setSocialLoading(null);
    }
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🦤</Text>
            <Text style={[styles.title, { color: colors.text }]}>DoDo</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>アカウントを作成しよう</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>名前</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: isDark ? '#444' : '#E0E0E0', color: colors.text }, errors.name && styles.inputError]}
                placeholder="山田 太郎"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  clearError('name');
                }}
                autoCapitalize="words"
                editable={!isLoading}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>メールアドレス</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: isDark ? '#444' : '#E0E0E0', color: colors.text }, errors.email && styles.inputError]}
                placeholder="example@email.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearError('email');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>パスワード</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { backgroundColor: colors.card, borderColor: isDark ? '#444' : '#E0E0E0', color: colors.text }, errors.password && styles.inputError]}
                  placeholder="8文字以上（大文字・小文字・数字）"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearError('password');
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
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBars}>
                    <View style={[styles.strengthBar, password.length >= 8 && styles.strengthBarActive]} />
                    <View style={[styles.strengthBar, /[A-Z]/.test(password) && styles.strengthBarActive]} />
                    <View style={[styles.strengthBar, /[a-z]/.test(password) && styles.strengthBarActive]} />
                    <View style={[styles.strengthBar, /\d/.test(password) && styles.strengthBarActive]} />
                  </View>
                </View>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>パスワード確認</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { backgroundColor: colors.card, borderColor: isDark ? '#444' : '#E0E0E0', color: colors.text }, errors.confirmPassword && styles.inputError]}
                  placeholder="パスワードを再入力"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    clearError('confirmPassword');
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Register Button */}
            <TouchableOpacity 
              style={[styles.registerButton, isLoading && styles.buttonDisabled]} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.registerButtonText}>アカウント作成</Text>
              )}
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.termsText}>
              アカウントを作成することで、
              <Text style={styles.termsLink}>利用規約</Text>
              と
              <Text style={styles.termsLink}>プライバシーポリシー</Text>
              に同意したものとみなされます。
            </Text>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? '#444' : '#E0E0E0' }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>または</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? '#444' : '#E0E0E0' }]} />
            </View>

            {/* Social Signup */}
            <TouchableOpacity 
              style={[styles.socialButton, socialLoading === 'apple' && styles.buttonDisabled]}
              onPress={() => handleSocialSignup('apple')}
              disabled={isLoading || socialLoading !== null}
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.socialIcon}>🍎</Text>
                  <Text style={styles.socialButtonText}>Appleで登録</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.socialButton, styles.googleButton, { backgroundColor: colors.card, borderColor: isDark ? '#444' : '#E0E0E0' }, socialLoading === 'google' && styles.buttonDisabled]}
              onPress={() => handleSocialSignup('google')}
              disabled={isLoading || socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Text style={styles.socialIcon}>G</Text>
                  <Text style={[styles.socialButtonText, styles.googleButtonText, { color: colors.text }]}>Googleで登録</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>すでにアカウントをお持ちですか？</Text>
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
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
  },
  logo: {
    fontSize: 56,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 6,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  eyeIcon: {
    fontSize: 20,
  },
  errorText: {
    color: '#E57373',
    fontSize: 12,
    marginTop: 6,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  strengthBarActive: {
    backgroundColor: '#81C784',
  },
  registerButton: {
    backgroundColor: '#FF9800',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 56,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  termsText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  termsLink: {
    color: '#FF9800',
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 14,
    marginBottom: 12,
    minHeight: 52,
  },
  googleButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  socialIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  googleButtonText: {
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
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
});
