/**
 * GIGCCL Attendance System — Firebase Seed Script
 *
 * Usage:
 *   1. Set your Firebase Admin SDK credentials
 *   2. Run: node firebase/seed.js
 *
 * Creates:
 *   - 1 admin account
 *   - 3 teacher accounts with schedules
 *   - 10 student accounts across 2 semesters/sections
 *   - Default geofence for GIGCCL campus
 */

const admin = require('firebase-admin');

// Initialize with your service account key
// Download from Firebase Console > Project Settings > Service accounts > Generate new private key
const serviceAccount = require('./serviceAccountKey.json'); // Place your key here

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function createUser(email, password, profileData) {
  try {
    const userRecord = await auth.createUser({ email, password });
    await db.collection('users').doc(userRecord.uid).set({
      email,
      ...profileData,
      createdAt: admin.firestore.Timestamp.now(),
    });
    console.log(`✅ Created: ${email} (${profileData.role})`);
    return userRecord.uid;
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      const existing = await auth.getUserByEmail(email);
      await db.collection('users').doc(existing.uid).set({
        email,
        ...profileData,
        createdAt: admin.firestore.Timestamp.now(),
      }, { merge: true });
      console.log(`⚠️  Updated existing: ${email}`);
      return existing.uid;
    }
    throw e;
  }
}

async function seed() {
  console.log('\n🌱 Starting GIGCCL seed...\n');

  // ─── Geofence ───────────────────────────────────────────────────────────────
  await db.collection('geofence_settings').doc('main').set({
    latitude: 31.572329,
    longitude: 74.303710,
    radiusMeters: 150,
    label: 'GIGCCL Main Campus',
    updatedAt: admin.firestore.Timestamp.now(),
    updatedBy: 'system',
  });
  console.log('📍 Geofence set: GIGCCL Main Campus (31.572329, 74.303710, 150m)\n');

  // ─── Admin ───────────────────────────────────────────────────────────────────
  await createUser('admin@gigccl.edu.pk', 'Admin@123', {
    role: 'admin',
    name: 'System Administrator',
    department: 'Administration',
    phone: '+92-42-111-001',
    isActive: true,
  });

  // ─── Teachers ────────────────────────────────────────────────────────────────
  const teacher1Uid = await createUser('dr.khan@gigccl.edu.pk', 'Teacher@123', {
    role: 'teacher',
    name: 'Dr. Ahmad Khan',
    department: 'Computer Science',
    phone: '+92-300-1234567',
    isActive: true,
  });

  const teacher2Uid = await createUser('ms.fatima@gigccl.edu.pk', 'Teacher@123', {
    role: 'teacher',
    name: 'Ms. Fatima Malik',
    department: 'Mathematics',
    phone: '+92-301-2345678',
    isActive: true,
  });

  const teacher3Uid = await createUser('mr.hassan@gigccl.edu.pk', 'Teacher@123', {
    role: 'teacher',
    name: 'Mr. Hassan Raza',
    department: 'Physics',
    phone: '+92-302-3456789',
    isActive: true,
  });

  console.log('\n📚 Creating schedules...');

  // ─── Schedules ───────────────────────────────────────────────────────────────
  const schedules = [
    {
      teacherUid: teacher1Uid,
      subject: 'Data Structures',
      semester: 3,
      section: 'A',
      room: 'CS-101',
      dayOfWeek: 'Monday',
      startTime: '09:00',
      endTime: '10:30',
      isActive: true,
    },
    {
      teacherUid: teacher1Uid,
      subject: 'Data Structures',
      semester: 3,
      section: 'B',
      room: 'CS-102',
      dayOfWeek: 'Wednesday',
      startTime: '11:00',
      endTime: '12:30',
      isActive: true,
    },
    {
      teacherUid: teacher1Uid,
      subject: 'Algorithms',
      semester: 5,
      section: 'A',
      room: 'CS-103',
      dayOfWeek: 'Tuesday',
      startTime: '14:00',
      endTime: '15:30',
      isActive: true,
    },
    {
      teacherUid: teacher2Uid,
      subject: 'Calculus II',
      semester: 3,
      section: 'A',
      room: 'MATH-201',
      dayOfWeek: 'Tuesday',
      startTime: '09:00',
      endTime: '10:30',
      isActive: true,
    },
    {
      teacherUid: teacher2Uid,
      subject: 'Discrete Mathematics',
      semester: 3,
      section: 'B',
      room: 'MATH-202',
      dayOfWeek: 'Thursday',
      startTime: '11:00',
      endTime: '12:30',
      isActive: true,
    },
    {
      teacherUid: teacher3Uid,
      subject: 'Applied Physics',
      semester: 3,
      section: 'A',
      room: 'PHY-301',
      dayOfWeek: 'Wednesday',
      startTime: '14:00',
      endTime: '15:30',
      isActive: true,
    },
  ];

  for (const schedule of schedules) {
    await db.collection('schedules').add(schedule);
    console.log(`  📅 ${schedule.subject} — ${schedule.dayOfWeek} ${schedule.startTime} (Sem ${schedule.semester} Sec ${schedule.section})`);
  }

  // ─── Students ────────────────────────────────────────────────────────────────
  console.log('\n👥 Creating students...');

  const students = [
    // Semester 3, Section A
    { email: 's1.ali@gigccl.edu.pk', name: 'Muhammad Ali Hassan', rollNo: '2022-CS-001', semester: 3, section: 'A' },
    { email: 's2.sara@gigccl.edu.pk', name: 'Sara Iqbal', rollNo: '2022-CS-002', semester: 3, section: 'A' },
    { email: 's3.omar@gigccl.edu.pk', name: 'Omar Farooq', rollNo: '2022-CS-003', semester: 3, section: 'A' },
    { email: 's4.zara@gigccl.edu.pk', name: 'Zara Nawaz', rollNo: '2022-CS-004', semester: 3, section: 'A' },
    { email: 's5.bilal@gigccl.edu.pk', name: 'Bilal Ahmad', rollNo: '2022-CS-005', semester: 3, section: 'A' },
    // Semester 3, Section B
    { email: 's6.noor@gigccl.edu.pk', name: 'Noor Fatima', rollNo: '2022-CS-006', semester: 3, section: 'B' },
    { email: 's7.hamza@gigccl.edu.pk', name: 'Hamza Sheikh', rollNo: '2022-CS-007', semester: 3, section: 'B' },
    { email: 's8.ayesha@gigccl.edu.pk', name: 'Ayesha Siddiqui', rollNo: '2022-CS-008', semester: 3, section: 'B' },
    // Semester 5, Section A
    { email: 's9.tariq@gigccl.edu.pk', name: 'Tariq Mahmood', rollNo: '2020-CS-009', semester: 5, section: 'A' },
    { email: 's10.hira@gigccl.edu.pk', name: 'Hira Baig', rollNo: '2020-CS-010', semester: 5, section: 'A' },
  ];

  for (const student of students) {
    await createUser(student.email, 'Student@123', {
      role: 'student',
      name: student.name,
      rollNo: student.rollNo,
      semester: student.semester,
      section: student.section,
      phone: '',
      isActive: true,
    });
  }

  console.log('\n✅ Seed completed!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login Credentials:');
  console.log('  Admin:   admin@gigccl.edu.pk / Admin@123');
  console.log('  Teacher: dr.khan@gigccl.edu.pk / Teacher@123');
  console.log('  Teacher: ms.fatima@gigccl.edu.pk / Teacher@123');
  console.log('  Student: s1.ali@gigccl.edu.pk / Student@123');
  console.log('  (All students use password: Student@123)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

seed().catch(e => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
