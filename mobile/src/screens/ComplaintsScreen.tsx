import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Alert, RefreshControl,
} from 'react-native';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import type { Complaint } from '../types';

export default function ComplaintsScreen() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDocs(query(
        collection(db, 'complaints'),
        where('studentUid', '==', user.uid),
      ));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Complaint));
      setComplaints(data.sort((a, b) => 0)); // firebase doesn't allow ordering without index here
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Please enter both subject and message.');
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'complaints'), {
        studentUid: user.uid,
        studentName: user.name,
        subject: subject.trim(),
        message: message.trim(),
        status: 'pending',
        createdAt: Timestamp.now(),
      });
      Alert.alert('Submitted!', 'Your complaint has been submitted to admin.');
      setModalVisible(false);
      setSubject(''); setMessage('');
      load();
    } catch {
      Alert.alert('Error', 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => status === 'resolved' ? '#059669' : '#d97706';
  const getStatusBg = (status: string) => status === 'resolved' ? '#ecfdf5' : '#fffbeb';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Complaints</Text>
          <Text style={styles.subtitle}>{complaints.length} submitted</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator color="#1e40af" size="large" />
          </View>
        ) : complaints.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No complaints yet</Text>
            <Text style={styles.emptySubtitle}>Use the + button to submit a complaint to admin</Text>
          </View>
        ) : (
          complaints.map(c => (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.subject} numberOfLines={1}>{c.subject}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(c.status) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(c.status) }]}>
                    {c.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.message} numberOfLines={2}>{c.message}</Text>
              {c.response && (
                <View style={styles.responseBox}>
                  <Text style={styles.responseLabel}>Admin Response:</Text>
                  <Text style={styles.responseText}>{c.response}</Text>
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Submit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Complaint</Text>

            <Text style={styles.inputLabel}>Subject *</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Attendance not recorded"
              placeholderTextColor="#94a3b8"
              maxLength={100}
            />

            <Text style={styles.inputLabel}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue in detail..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setModalVisible(false); setSubject(''); setMessage(''); }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  emptySubtitle: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  subject: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a', marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700' },
  message: { color: '#64748b', fontSize: 13, lineHeight: 18 },
  responseBox: { marginTop: 10, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 8 },
  responseLabel: { color: '#059669', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  responseText: { color: '#166534', fontSize: 13 },
  fab: {
    position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1e40af', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28, fontWeight: '300' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  inputLabel: { color: '#64748b', fontSize: 13, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, padding: 12, color: '#0f172a', fontSize: 14,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelText: { color: '#64748b', fontWeight: '600' },
  submitBtn: { flex: 1, backgroundColor: '#1e40af', borderRadius: 12, padding: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '600' },
});
