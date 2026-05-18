import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';

export default function ProfileScreen() {
  const { user, clearUser } = useAuthStore();
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await signOut(auth);
          clearUser();
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!newPass || !currentPass) { Alert.alert('Error', 'All fields are required.'); return; }
    if (newPass !== confirmPass) { Alert.alert('Error', 'New passwords do not match.'); return; }
    if (newPass.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser!.email!, currentPass);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPass);
      Alert.alert('Success', 'Password changed successfully!');
      setChangingPassword(false);
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to change password.';
      Alert.alert('Error', msg.replace('Firebase: ', '').replace(/\(auth.*\)/, '').trim());
    } finally {
      setLoading(false);
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>My Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Student</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Academic Info</Text>
          <InfoRow label="Roll Number" value={user?.rollNo ?? ''} />
          <InfoRow label="Semester" value={user?.semester ? `Semester ${user.semester}` : ''} />
          <InfoRow label="Section" value={user?.section ? `Section ${user.section}` : ''} />
          <InfoRow label="Phone" value={user?.phone ?? ''} />
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Actions</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setChangingPassword(true)}>
            <Text style={styles.actionBtnText}>🔒 Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn]} onPress={handleLogout}>
            <Text style={styles.logoutText}>🚪 Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfoBox}>
          <Text style={styles.appInfoText}>GIGCCL Attendance System v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2024 Government Islamia Graduate College Civil Lines, Lahore</Text>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={changingPassword} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry value={currentPass} onChangeText={setCurrentPass}
              placeholder="Enter current password" placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry value={newPass} onChangeText={setNewPass}
              placeholder="Min 6 characters" placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry value={confirmPass} onChangeText={setConfirmPass}
              placeholder="Repeat new password" placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setChangingPassword(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1e40af',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  email: { color: '#64748b', fontSize: 13, marginTop: 4 },
  roleBadge: {
    marginTop: 8, backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  roleText: { color: '#1e40af', fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel: { color: '#64748b', fontSize: 14 },
  infoValue: { color: '#0f172a', fontSize: 14, fontWeight: '500' },
  actionBtn: {
    backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, marginBottom: 8, alignItems: 'center',
  },
  actionBtnText: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  logoutBtn: { backgroundColor: '#fef2f2' },
  logoutText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
  appInfoBox: { alignItems: 'center', paddingTop: 8 },
  appInfoText: { color: '#94a3b8', fontSize: 11, textAlign: 'center', marginBottom: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
  inputLabel: { color: '#64748b', fontSize: 13, marginBottom: 6, marginTop: 10 },
  modalInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, padding: 12, color: '#0f172a', fontSize: 14,
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelText: { color: '#64748b', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#1e40af', borderRadius: 12, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});
