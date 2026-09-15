import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ─── Credentials (personal app — kept simple) ───
const VALID_USERNAME = 'Fouad';
const VALID_PASSWORD = 'android2002';
const AUTH_KEY       = '@is_authenticated';

export default function Login({ onLogin }) {
  const [username,       setUsername]       = useState('');
  const [password,       setPassword]       = useState('');
  const [showPassword,   setShowPassword]   = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [biometricAvail, setBiometricAvail] = useState(false);
  const [shakeAnim]                         = useState(new Animated.Value(0));

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const compatible  = await LocalAuthentication.hasHardwareAsync();
      const enrolled    = await LocalAuthentication.isEnrolledAsync();
      const canUseBio   = compatible && enrolled;
      setBiometricAvail(canUseBio);

      // Auto-prompt fingerprint if previously logged in
      if (canUseBio) {
        const wasAuthed = await AsyncStorage.getItem(AUTH_KEY);
        if (wasAuthed === 'true') {
          handleBiometric(true);
        }
      }
    } catch (_) {}
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Incomplete', 'Please enter both username and password.');
      return;
    }

    setLoading(true);
    // Small delay for UX feel
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      await AsyncStorage.setItem(AUTH_KEY, 'true');
      onLogin();
    } else {
      shake();
      Alert.alert('Wrong credentials', 'Username or password is incorrect.');
      setPassword('');
    }
  };

  const handleBiometric = async (silent = false) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:  'Verify your fingerprint',
        fallbackLabel:  'Use password',
        cancelLabel:    'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await AsyncStorage.setItem(AUTH_KEY, 'true');
        onLogin();
      } else if (!silent && result.error !== 'user_cancel') {
        Alert.alert('Failed', 'Biometric authentication failed. Try password.');
      }
    } catch (e) {
      if (!silent) Alert.alert('Error', 'Biometric authentication unavailable.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        {/* ── Logo / Header ── */}
        <View style={styles.logoBlock}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="wallet" size={40} color="#24D28D" />
          </View>
          <Text style={styles.appName}>Meri Budget</Text>
          <Text style={styles.tagline}>Your personal finance tracker</Text>
        </View>

        {/* ── Form Card ── */}
        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={styles.cardTitle}>Welcome back, Fouad 👋</Text>

          {/* Username */}
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="account-outline" size={20} color="#8ea1a3" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#8ea1a3"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="lock-outline" size={20} color="#8ea1a3" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#8ea1a3"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#8ea1a3"
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#0F2426" />
              : <Text style={styles.loginBtnText}>Login</Text>
            }
          </TouchableOpacity>

          {/* Fingerprint Button */}
          {biometricAvail && (
            <TouchableOpacity style={styles.bioBtn} onPress={() => handleBiometric(false)}>
              <MaterialCommunityIcons name="fingerprint" size={32} color="#24D28D" />
              <Text style={styles.bioBtnText}>Use Fingerprint</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <Text style={styles.footer}>🔒 Your data stays on this device</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2426',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 30,
  },

  // Logo
  logoBlock:  { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1B3735',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#24D28D', shadowOpacity: 0.3,
    shadowRadius: 12, elevation: 8,
  },
  appName:  { color: '#fff',     fontSize: 28, fontWeight: 'bold',  marginBottom: 6 },
  tagline:  { color: '#8ea1a3', fontSize: 14 },

  // Card
  card: {
    backgroundColor: '#1B3735',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 24 },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162C2A',
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
  },
  eyeBtn: { paddingLeft: 8 },

  // Login button
  loginBtn: {
    backgroundColor: '#24D28D',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: { color: '#0F2426', fontWeight: 'bold', fontSize: 16 },

  // Biometric button
  bioBtn: {
    alignItems: 'center',
    marginTop: 24,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#24D28D22',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  bioBtnText: { color: '#24D28D', fontSize: 15, fontWeight: '500' },

  footer: { color: '#8ea1a3', fontSize: 12, textAlign: 'center' },
});
