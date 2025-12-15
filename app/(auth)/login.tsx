import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Link } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      return;
    }
    const result = await signIn(email.trim(), password);
    if (result?.error) {
      const errorMessage = result.error.message;
      if (errorMessage.includes('Invalid login credentials')) {
        Alert.alert(
          'Sign In Failed',
          'The email or password you entered is incorrect. Please check your credentials and try again.',
          [
            { text: 'Try Again', style: 'cancel' },
            { text: 'Reset Password', onPress: handleForgotPassword }
          ]
        );
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address first, then tap "Forgot Password".');
      return;
    }
    
    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'zurb://reset-password',
      });
      
      if (error) {
        console.error('[Login] Password reset error:', error);
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Check Your Email',
          'If an account exists with this email, you will receive a password reset link.'
        );
      }
    } catch (err) {
      console.error('[Login] Password reset exception:', err);
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <LogIn size={48} color="#007AFF" />
          <Text style={styles.title}>ZURB Studio</Text>
          <Text style={styles.subtitle}>Urban Design & Development</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!isLoading}
            testID="email-input"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            editable={!isLoading}
            testID="password-input"
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading || !email.trim() || !password.trim()}
            testID="sign-in-button"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleForgotPassword}
            disabled={isLoading || isResetting}
            style={styles.forgotPassword}
          >
            {isResetting ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity disabled={isLoading}>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#000000',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
  },
  link: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600' as const,
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 32,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500' as const,
  },
});
