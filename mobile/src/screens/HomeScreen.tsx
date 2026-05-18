import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  ScrollView, RefreshControl, SafeAreaView, Animated,
} from 'react-native';
import * as Location from 'expo-location';
import { collection, query, where, getDocs, addDoc, getDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { haversineDistance } from '../lib/haversine';
import type { GeofenceSettings, Schedule, AttendanceSession } from '../types';

type AttendanceState = 'idle' | 'checking' | 'present' | 'outside' | 'no_session' | 'already_marked';

const getDayOfWeek = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

const todayStr = () => new Date().toISOString().split('T')[0];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [attendanceState, setAttendanceState] = useState<AttendanceState>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overallAttendance, setOverallAttendance] = useState<number>(0);
  const pulseAnim = useState(new Animated.Value(1))[0];

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // Load today's schedule
      const schedSnap = await getDocs(query(
        collection(db, 'schedules'),
        where('semester', '==', user.semester),
        where('section', '==', user.section),
        where('dayOfWeek', '==', getDayOfWeek()),
        where('isActive', '==', true),
      ));
      setTodaySchedule(schedSnap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule)));

      // Load overall attendance %
      const recSnap = await getDocs(query(
        collection(db, 'attendance_records'),
        where('studentUid', '==', user.uid),
      ));
      const recs = recSnap.docs.map(d => d.data());
      const present = recs.filter(r => r.status === 'present' || r.status === 'late').length;
      setOverallAttendance(recs.length > 0 ? Math.round((present / recs.length) * 100) : 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (attendanceState === 'checking') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [attendanceState, pulseAnim]);

  const markAttendance = async () => {
    if (!user) return;
    setAttendanceState('checking');

    try {
      // Check location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is required to mark attendance. Please enable it in settings.');
        setAttendanceState('idle');
        return;
      }

      // Get GPS coordinates
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      // Get geofence settings
      const geofenceSnap = await getDoc(doc(db, 'geofence_settings', 'main'));
      if (!geofenceSnap.exists()) {
        Alert.alert('Error', 'Campus location not configured. Contact admin.');
        setAttendanceState('idle');
        return;
      }
      const geofence = geofenceSnap.data() as GeofenceSettings;

      // Calculate distance
      const dist = Math.round(haversineDistance(latitude, longitude, geofence.latitude, geofence.longitude));
      setDistance(dist);

      const isInside = dist <= geofence.radiusMeters;

      // Find active session for student
      const today = todayStr();
      const sessSnap = await getDocs(query(
        collection(db, 'attendance_sessions'),
        where('semester', '==', user.semester),
        where('section', '==', user.section),
        where('date', '==', today),
        where('status', '==', 'open'),
      ));

      if (sessSnap.empty) {
        setAttendanceState('no_session');
        return;
      }

      const session = { id: sessSnap.docs[0].id, ...sessSnap.docs[0].data() } as AttendanceSession;

      // Check if already marked
      const existingSnap = await getDocs(query(
        collection(db, 'attendance_records'),
        where('sessionId', '==', session.id),
        where('studentUid', '==', user.uid),
      ));

      if (!existingSnap.empty) {
        setAttendanceState('already_marked');
        return;
      }

      // Mark attendance
      await addDoc(collection(db, 'attendance_records'), {
        sessionId: session.id,
        studentUid: user.uid,
        studentName: user.name,
        rollNo: user.rollNo ?? '',
        status: isInside ? 'present' : 'absent',
        markedAt: Timestamp.now(),
        method: 'gps',
        gpsLat: latitude,
        gpsLng: longitude,
        distanceFromCenter: dist,
      });

      setAttendanceState(isInside ? 'present' : 'outside');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to get location.';
      Alert.alert('Error', msg);
      setAttendanceState('idle');
    }
  };

  const getButtonConfig = () => {
    switch (attendanceState) {
      case 'checking': return { bg: '#6366f1', text: 'Checking...', icon: '📍' };
      case 'present': return { bg: '#059669', text: 'PRESENT ✓', icon: '✅' };
      case 'outside': return { bg: '#dc2626', text: 'Outside Campus', icon: '❌' };
      case 'no_session': return { bg: '#d97706', text: 'No Active Class', icon: '⏰' };
      case 'already_marked': return { bg: '#0284c7', text: 'Already Marked', icon: 'ℹ️' };
      default: return { bg: '#1e40af', text: 'MARK ATTENDANCE', icon: '📍' };
    }
  };

  const btnConfig = getButtonConfig();

  const getAttendanceColor = (pct: number) => pct >= 75 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name?.split(' ')[0]} 👋</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        {/* Attendance Card */}
        <View style={styles.section}>
          <View style={styles.gpsCard}>
            <Text style={styles.cardTitle}>GPS Attendance</Text>
            <Text style={styles.cardSubtitle}>
              {attendanceState === 'idle' ? 'Press the button when you are in class' :
               attendanceState === 'checking' ? 'Getting your location...' :
               attendanceState === 'present' ? 'Your attendance has been recorded' :
               attendanceState === 'outside' ? `You are ${distance}m away from campus` :
               attendanceState === 'no_session' ? 'No active class found for your section' :
               'Your attendance was already marked'}
            </Text>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.gpsButton, { backgroundColor: btnConfig.bg }]}
                onPress={attendanceState === 'idle' ? markAttendance : undefined}
                disabled={attendanceState !== 'idle'}
              >
                {attendanceState === 'checking' ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <>
                    <Text style={styles.gpsIcon}>{btnConfig.icon}</Text>
                    <Text style={styles.gpsButtonText}>{btnConfig.text}</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {(attendanceState === 'present' || attendanceState === 'outside') && (
              <View style={styles.distanceRow}>
                <Text style={styles.distanceText}>
                  Distance from campus: <Text style={{ fontWeight: 'bold' }}>{distance}m</Text>
                </Text>
              </View>
            )}

            {attendanceState !== 'idle' && (
              <TouchableOpacity onPress={() => { setAttendanceState('idle'); setDistance(null); }} style={styles.resetBtn}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Overall Attendance */}
        <View style={styles.section}>
          <View style={styles.statsCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statsLabel}>Overall Attendance</Text>
              <Text style={[styles.statsValue, { color: getAttendanceColor(overallAttendance) }]}>
                {overallAttendance}%
              </Text>
            </View>
            <View style={styles.progressRing}>
              <Text style={[styles.progressText, { color: getAttendanceColor(overallAttendance) }]}>
                {overallAttendance}%
              </Text>
            </View>
          </View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
          {loading ? (
            <ActivityIndicator color="#1e40af" />
          ) : todaySchedule.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No classes today</Text>
            </View>
          ) : (
            todaySchedule.map(sch => (
              <View key={sch.id} style={styles.scheduleCard}>
                <View style={styles.scheduleTime}>
                  <Text style={styles.scheduleTimeText}>{sch.startTime}</Text>
                  <Text style={styles.scheduleTimeSmall}>{sch.endTime}</Text>
                </View>
                <View style={styles.scheduleDivider} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleSubject}>{sch.subject}</Text>
                  <Text style={styles.scheduleRoom}>Room {sch.room}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  greeting: { color: '#64748b', fontSize: 14 },
  name: { color: '#0f172a', fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e40af',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  section: { paddingHorizontal: 20, marginTop: 16 },
  gpsCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  gpsButton: {
    width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  gpsIcon: { fontSize: 32, marginBottom: 8 },
  gpsButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  distanceRow: { marginTop: 16 },
  distanceText: { color: '#64748b', fontSize: 13 },
  resetBtn: { marginTop: 12 },
  resetText: { color: '#1e40af', fontSize: 13 },
  statsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, flexDirection: 'row',
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statsLabel: { color: '#64748b', fontSize: 13, marginBottom: 4 },
  statsValue: { fontSize: 32, fontWeight: 'bold' },
  progressRing: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  progressText: { fontSize: 14, fontWeight: 'bold' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#fff', borderRadius: 16 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  scheduleCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row',
    alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  scheduleTime: { alignItems: 'center', minWidth: 50 },
  scheduleTimeText: { fontSize: 14, fontWeight: '700', color: '#1e40af' },
  scheduleTimeSmall: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  scheduleDivider: { width: 1, height: 36, backgroundColor: '#e2e8f0', marginHorizontal: 14 },
  scheduleSubject: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  scheduleRoom: { fontSize: 12, color: '#64748b', marginTop: 2 },
});
