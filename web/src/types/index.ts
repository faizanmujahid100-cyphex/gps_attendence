import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'teacher' | 'student';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'manual';
export type AttendanceMethod = 'gps' | 'manual';
export type SessionStatus = 'open' | 'closed';
export type ComplaintStatus = 'pending' | 'resolved';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  rollNo?: string;
  semester?: number;
  section?: string;
  department?: string;
  phone?: string;
  createdAt: Timestamp;
  isActive: boolean;
}

export interface GeofenceSettings {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  label: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface Schedule {
  id?: string;
  teacherUid: string;
  teacherName?: string;
  subject: string;
  semester: number;
  section: string;
  room: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface AttendanceSession {
  id?: string;
  scheduleId: string;
  teacherUid: string;
  subject: string;
  semester: number;
  section: string;
  date: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  status: SessionStatus;
  confirmedByTeacher: boolean;
  confirmedAt?: Timestamp;
}

export interface AttendanceRecord {
  id?: string;
  sessionId: string;
  studentUid: string;
  studentName: string;
  rollNo: string;
  status: AttendanceStatus;
  markedAt: Timestamp;
  method: AttendanceMethod;
  gpsLat?: number;
  gpsLng?: number;
  distanceFromCenter?: number;
  overrideReason?: string;
  overrideBy?: string;
  overrideAt?: Timestamp;
}

export interface Complaint {
  id?: string;
  studentUid: string;
  studentName: string;
  subject: string;
  message: string;
  status: ComplaintStatus;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  response?: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  todayPresentPercent: number;
  activeSessions: number;
}

export interface AttendanceSummary {
  subject: string;
  totalClasses: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}
