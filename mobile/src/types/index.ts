export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  name: string;
  rollNo?: string;
  semester?: number;
  section?: string;
  department?: string;
  phone?: string;
  isActive: boolean;
}

export interface GeofenceSettings {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  label: string;
}

export interface Schedule {
  id?: string;
  teacherUid: string;
  subject: string;
  semester: number;
  section: string;
  room: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface AttendanceSession {
  id?: string;
  scheduleId: string;
  teacherUid: string;
  subject: string;
  semester: number;
  section: string;
  date: string;
  status: 'open' | 'closed';
}

export interface AttendanceRecord {
  id?: string;
  sessionId: string;
  studentUid: string;
  status: 'present' | 'absent' | 'late' | 'manual';
  method: 'gps' | 'manual';
  distanceFromCenter?: number;
}

export interface Complaint {
  id?: string;
  studentUid: string;
  studentName: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved';
  response?: string;
}

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Attendance: undefined;
  Profile: undefined;
  Complaints: undefined;
};
