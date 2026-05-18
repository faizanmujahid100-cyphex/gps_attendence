import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  QueryConstraint,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  User,
  Schedule,
  AttendanceSession,
  AttendanceRecord,
  GeofenceSettings,
  Complaint,
} from '@/types';

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUsers(role?: string): Promise<User[]> {
  const constraints: QueryConstraint[] = [];
  if (role) constraints.push(where('role', '==', role));
  constraints.push(where('isActive', '==', true));
  const snap = await getDocs(query(collection(db, 'users'), ...constraints));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
}

export async function getUserById(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as User;
}

export async function updateUser(uid: string, data: Partial<User>) {
  await updateDoc(doc(db, 'users', uid), data);
}

export async function deactivateUser(uid: string) {
  await updateDoc(doc(db, 'users', uid), { isActive: false });
}

// ─── Geofence ────────────────────────────────────────────────────────────────

export async function getGeofence(): Promise<GeofenceSettings | null> {
  const snap = await getDoc(doc(db, 'geofence_settings', 'main'));
  if (!snap.exists()) return null;
  return snap.data() as GeofenceSettings;
}

export async function updateGeofence(
  data: Omit<GeofenceSettings, 'updatedAt' | 'updatedBy'>,
  adminUid: string
) {
  await setDoc(doc(db, 'geofence_settings', 'main'), {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: adminUid,
  });
}

// ─── Schedules ───────────────────────────────────────────────────────────────

export async function getSchedules(teacherUid?: string): Promise<Schedule[]> {
  const constraints: QueryConstraint[] = [where('isActive', '==', true)];
  if (teacherUid) constraints.push(where('teacherUid', '==', teacherUid));
  const snap = await getDocs(query(collection(db, 'schedules'), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule));
}

export async function addSchedule(schedule: Omit<Schedule, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'schedules'), schedule);
  return ref.id;
}

export async function updateSchedule(id: string, data: Partial<Schedule>) {
  await updateDoc(doc(db, 'schedules', id), data);
}

export async function deleteSchedule(id: string) {
  await updateDoc(doc(db, 'schedules', id), { isActive: false });
}

// ─── Attendance Sessions ──────────────────────────────────────────────────────

export async function getAttendanceSessions(filters?: {
  teacherUid?: string;
  date?: string;
  status?: string;
}): Promise<AttendanceSession[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.teacherUid) constraints.push(where('teacherUid', '==', filters.teacherUid));
  if (filters?.date) constraints.push(where('date', '==', filters.date));
  if (filters?.status) constraints.push(where('status', '==', filters.status));
  constraints.push(orderBy('startTime', 'desc'));
  const snap = await getDocs(query(collection(db, 'attendance_sessions'), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));
}

export async function createSession(session: Omit<AttendanceSession, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'attendance_sessions'), session);
  return ref.id;
}

export async function updateSession(id: string, data: Partial<AttendanceSession>) {
  await updateDoc(doc(db, 'attendance_sessions', id), data);
}

export async function getSessionById(id: string): Promise<AttendanceSession | null> {
  const snap = await getDoc(doc(db, 'attendance_sessions', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AttendanceSession;
}

// ─── Attendance Records ───────────────────────────────────────────────────────

export async function getAttendanceRecords(filters?: {
  sessionId?: string;
  studentUid?: string;
}): Promise<AttendanceRecord[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.sessionId) constraints.push(where('sessionId', '==', filters.sessionId));
  if (filters?.studentUid) constraints.push(where('studentUid', '==', filters.studentUid));
  constraints.push(orderBy('markedAt', 'desc'));
  const snap = await getDocs(query(collection(db, 'attendance_records'), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
}

export async function upsertAttendanceRecord(
  sessionId: string,
  studentUid: string,
  data: Partial<AttendanceRecord>
): Promise<void> {
  const q = query(
    collection(db, 'attendance_records'),
    where('sessionId', '==', sessionId),
    where('studentUid', '==', studentUid),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'attendance_records'), {
      sessionId,
      studentUid,
      markedAt: Timestamp.now(),
      ...data,
    });
  } else {
    await updateDoc(snap.docs[0].ref, data);
  }
}

export async function updateAttendanceRecord(id: string, data: Partial<AttendanceRecord>) {
  await updateDoc(doc(db, 'attendance_records', id), data);
}

export async function batchMarkAbsent(
  sessionId: string,
  students: { uid: string; name: string; rollNo: string }[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const student of students) {
    const ref = doc(collection(db, 'attendance_records'));
    batch.set(ref, {
      sessionId,
      studentUid: student.uid,
      studentName: student.name,
      rollNo: student.rollNo,
      status: 'absent',
      markedAt: Timestamp.now(),
      method: 'manual',
    });
  }
  await batch.commit();
}

// ─── Complaints ───────────────────────────────────────────────────────────────

export async function getComplaints(studentUid?: string): Promise<Complaint[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
  if (studentUid) constraints.push(where('studentUid', '==', studentUid));
  const snap = await getDocs(query(collection(db, 'complaints'), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Complaint));
}

export async function addComplaint(complaint: Omit<Complaint, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'complaints'), complaint);
  return ref.id;
}

export async function resolveComplaint(id: string, response: string) {
  await updateDoc(doc(db, 'complaints', id), {
    status: 'resolved',
    response,
    resolvedAt: Timestamp.now(),
  });
}

// ─── Realtime ────────────────────────────────────────────────────────────────

export function subscribeToSession(
  sessionId: string,
  callback: (records: AttendanceRecord[]) => void
) {
  return onSnapshot(
    query(collection(db, 'attendance_records'), where('sessionId', '==', sessionId)),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)))
  );
}

export function subscribeToActiveSessions(callback: (sessions: AttendanceSession[]) => void) {
  return onSnapshot(
    query(collection(db, 'attendance_sessions'), where('status', '==', 'open')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession)))
  );
}
