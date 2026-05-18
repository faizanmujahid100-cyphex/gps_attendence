import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import type { AttendanceRecord, AttendanceSession } from '../types';

interface SubjectSummary {
  subject: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  sessions: { date: string; status: string }[];
}

export default function AttendanceScreen() {
  const { user } = useAuthStore();
  const [summaries, setSummaries] = useState<SubjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [recSnap, sessSnap] = await Promise.all([
        getDocs(query(collection(db, 'attendance_records'), where('studentUid', '==', user.uid))),
        getDocs(query(collection(db, 'attendance_sessions'),
          where('semester', '==', user.semester),
          where('section', '==', user.section),
        )),
      ]);

      const records = recSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      const sessions = sessSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));

      const subjectMap: Record<string, SubjectSummary> = {};

      sessions.forEach(session => {
        const subj = session.subject;
        if (!subjectMap[subj]) {
          subjectMap[subj] = { subject: subj, total: 0, present: 0, absent: 0, late: 0, percentage: 0, sessions: [] };
        }
        subjectMap[subj].total++;
        const record = records.find(r => r.sessionId === session.id);
        const status = record?.status ?? 'absent';
        if (status === 'present') subjectMap[subj].present++;
        else if (status === 'absent') subjectMap[subj].absent++;
        else if (status === 'late') { subjectMap[subj].late++; subjectMap[subj].present++; }
        subjectMap[subj].sessions.push({ date: session.date, status });
      });

      Object.values(subjectMap).forEach(s => {
        s.percentage = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
      });

      setSummaries(Object.values(subjectMap).sort((a, b) => a.subject.localeCompare(b.subject)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const getColor = (pct: number) => pct >= 75 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626';
  const getBgColor = (pct: number) => pct >= 75 ? '#ecfdf5' : pct >= 60 ? '#fffbeb' : '#fef2f2';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#059669';
      case 'absent': return '#dc2626';
      case 'late': return '#d97706';
      default: return '#94a3b8';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>Subject-wise breakdown</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={{ padding: 16 }}
      >
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator color="#1e40af" size="large" />
          </View>
        ) : summaries.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No attendance records</Text>
            <Text style={styles.emptySubtitle}>Your attendance will appear here once classes begin</Text>
          </View>
        ) : (
          summaries.map(summary => (
            <View key={summary.subject} style={styles.card}>
              <TouchableOpacity
                onPress={() => setExpanded(expanded === summary.subject ? null : summary.subject)}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subject}>{summary.subject}</Text>
                    <Text style={styles.classCount}>{summary.total} classes · {summary.present} present</Text>
                  </View>
                  <View style={[styles.percentBadge, { backgroundColor: getBgColor(summary.percentage) }]}>
                    <Text style={[styles.percentText, { color: getColor(summary.percentage) }]}>
                      {summary.percentage}%
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBg}>
                  <View
                    style={[styles.progressFill, {
                      width: `${summary.percentage}%` as never,
                      backgroundColor: getColor(summary.percentage),
                    }]}
                  />
                </View>

                {/* Mini Stats */}
                <View style={styles.miniStats}>
                  <View style={styles.miniStat}>
                    <Text style={[styles.miniStatVal, { color: '#059669' }]}>{summary.present}</Text>
                    <Text style={styles.miniStatLabel}>Present</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <Text style={[styles.miniStatVal, { color: '#dc2626' }]}>{summary.absent}</Text>
                    <Text style={styles.miniStatLabel}>Absent</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <Text style={[styles.miniStatVal, { color: '#d97706' }]}>{summary.late}</Text>
                    <Text style={styles.miniStatLabel}>Late</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <Text style={styles.miniStatVal}>{summary.total}</Text>
                    <Text style={styles.miniStatLabel}>Total</Text>
                  </View>
                </View>

                {summary.percentage < 75 && (
                  <View style={styles.warningRow}>
                    <Text style={styles.warningText}>⚠️ Below 75% threshold</Text>
                  </View>
                )}

                <Text style={styles.expandHint}>{expanded === summary.subject ? '▲ Hide history' : '▼ View history'}</Text>
              </TouchableOpacity>

              {/* Session History */}
              {expanded === summary.subject && (
                <View style={styles.historyList}>
                  {summary.sessions
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((sess, i) => (
                      <View key={i} style={styles.historyRow}>
                        <Text style={styles.historyDate}>
                          {new Date(sess.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                        </Text>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(sess.status) }]} />
                        <Text style={[styles.historyStatus, { color: getStatusColor(sess.status) }]}>
                          {sess.status.toUpperCase()}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  emptySubtitle: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  subject: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  classCount: { fontSize: 12, color: '#64748b', marginTop: 2 },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  percentText: { fontSize: 15, fontWeight: 'bold' },
  progressBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginBottom: 12 },
  progressFill: { height: 6, borderRadius: 3 },
  miniStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  miniStatLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  warningRow: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 8, marginBottom: 8 },
  warningText: { color: '#dc2626', fontSize: 12, textAlign: 'center' },
  expandHint: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 4 },
  historyList: { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 8, paddingTop: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  historyDate: { color: '#64748b', fontSize: 13, width: 60 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 8 },
  historyStatus: { fontSize: 13, fontWeight: '600' },
});
