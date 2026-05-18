import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const setUser = useAuthStore(s => s.setUser);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await getDoc(doc(db, 'users', credential.user.uid));
      if (!snap.exists()) throw new Error('User profile not found.');
      const userData = snap.data() as Omit<User, 'uid'>;
      if (userData.role !== 'student') {
        Alert.alert('Access Denied', 'This app is for students only. Please use the web portal.');
        await auth.signOut();
        return;
      }
      if (!userData.isActive) {
        Alert.alert('Account Inactive', 'Your account has been deactivated. Contact admin.');
        await auth.signOut();
        return;
      }
      const user: User = { uid: credential.user.uid, ...userData };
      if (rememberMe) await AsyncStorage.setItem('remembered_email', email.trim());
      setUser(user);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed. Check your credentials.';
      Alert.alert('Login Failed', msg.replace('Firebase: ', '').replace(/\(auth.*\)/, '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>GIC</Text>
          </View>
          <Text style={styles.collegeName}>GIGCCL</Text>
          <Text style={styles.collegeSubtitle}>Government Islamia Graduate College</Text>
          <Text style={styles.collegeSubtitle}>Civil Lines, Lahore</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Student Login</Text>
          <Text style={styles.formSubtitle}>Sign in with your college account</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@gigccl.edu.pk"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0 }]}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberText}>Remember my email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>Only student accounts can access this app.</Text>
        </View>

        <Text style={styles.footer}>© 2024 GIGCCL Attendance System</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#1e40af',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  logoText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  collegeName: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  collegeSubtitle: { color: '#94a3b8', fontSize: 12, textAlign: 'center' },
  form: {
    backgroundColor: '#1e293b', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  formTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  formSubtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { color: '#cbd5e1', fontSize: 13, marginBottom: 6, fontWeight: '500' },
  input: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, padding: 12, color: '#ffffff', fontSize: 14,
  },
  passwordWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 10,
  },
  eyeBtn: { padding: 12 },
  eyeText: { fontSize: 16 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#475569',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  checkboxChecked: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  checkmark: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  rememberText: { color: '#94a3b8', fontSize: 13 },
  loginBtn: {
    backgroundColor: '#1e40af', borderRadius: 12, padding: 15, alignItems: 'center',
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  hint: { color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 12 },
  footer: { color: '#1e293b', fontSize: 11, textAlign: 'center', marginTop: 24 },
});
