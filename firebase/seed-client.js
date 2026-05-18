/**
 * GIGCCL Seed Script (Client SDK — no service account needed)
 * Uses Firebase Auth REST API + Firestore client SDK
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCvi_BLZRsmNSgBgLTgI05537gK6UaBs1U",
  authDomain: "gigcclgpsattendence.firebaseapp.com",
  projectId: "gigcclgpsattendence",
  storageBucket: "gigcclgpsattendence.firebasestorage.app",
  messagingSenderId: "803240081478",
  appId: "1:803240081478:web:2b2fbc111541385ced3247"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const API_KEY = firebaseConfig.apiKey;

// Create user via REST API (doesn't affect current auth state)
async function createAuthUser(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (data.error) {
    if (data.error.message === 'EMAIL_EXISTS') {
      console.log(`  ⚠️  Already exists: ${email}`);
      // Get existing UID
      const res2 = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );
      const data2 = await res2.json();
      return data2.localId;
    }
    throw new Error(data.error.message);
  }
  return data.localId;
}

async function seed() {
  console.log('\n🌱 Seeding GIGCCL database...\n');

  // ─── Geofence ──────────────────────────────────────────────────────────────
  await setDoc(doc(db, 'geofence_settings', 'main'), {
    latitude: 31.572329,
    longitude: 74.303710,
    radiusMeters: 150,
    label: 'GIGCCL Main Campus',
    updatedAt: Timestamp.now(),
    updatedBy: 'system',
  });
  console.log('📍 Geofence set: GIGCCL Main Campus (150m radius)\n');

  // ─── Teachers ──────────────────────────────────────────────────────────────
  console.log('👨‍🏫 Creating teachers...');

  const teacher1Uid = await createAuthUser('dr.khan@gigccl.edu.pk', 'Teacher@123');
  await setDoc(doc(db, 'users', teacher1Uid), {
    email: 'dr.khan@gigccl.edu.pk',
    name: 'Dr. Ahmad Khan',
    role: 'teacher',
    department: 'Computer Science',
    phone: '+92-300-1234567',
    isActive: true,
    createdAt: Timestamp.now(),
  });
  console.log('  ✅ Dr. Ahmad Khan (Computer Science)');

  const teacher2Uid = await createAuthUser('ms.fatima@gigccl.edu.pk', 'Teacher@123');
  await setDoc(doc(db, 'users', teacher2Uid), {
    email: 'ms.fatima@gigccl.edu.pk',
    name: 'Ms. Fatima Malik',
    role: 'teacher',
    department: 'Mathematics',
    phone: '+92-301-2345678',
    isActive: true,
    createdAt: Timestamp.now(),
  });
  console.log('  ✅ Ms. Fatima Malik (Mathematics)');

  const teacher3Uid = await createAuthUser('mr.hassan@gigccl.edu.pk', 'Teacher@123');
  await setDoc(doc(db, 'users', teacher3Uid), {
    email: 'mr.hassan@gigccl.edu.pk',
    name: 'Mr. Hassan Raza',
    role: 'teacher',
    department: 'Physics',
    phone: '+92-302-3456789',
    isActive: true,
    createdAt: Timestamp.now(),
  });
  console.log('  ✅ Mr. Hassan Raza (Physics)');

  // ─── Schedules ─────────────────────────────────────────────────────────────
  console.log('\n📅 Creating schedules...');

  const schedules = [
    { teacherUid: teacher1Uid, subject: 'Data Structures',      semester: 3, section: 'A', room: 'CS-101',   dayOfWeek: 'Monday',    startTime: '09:00', endTime: '10:30' },
    { teacherUid: teacher1Uid, subject: 'Data Structures',      semester: 3, section: 'B', room: 'CS-102',   dayOfWeek: 'Wednesday', startTime: '11:00', endTime: '12:30' },
    { teacherUid: teacher1Uid, subject: 'Algorithms',           semester: 5, section: 'A', room: 'CS-103',   dayOfWeek: 'Tuesday',   startTime: '14:00', endTime: '15:30' },
    { teacherUid: teacher2Uid, subject: 'Calculus II',          semester: 3, section: 'A', room: 'MATH-201', dayOfWeek: 'Tuesday',   startTime: '09:00', endTime: '10:30' },
    { teacherUid: teacher2Uid, subject: 'Discrete Mathematics', semester: 3, section: 'B', room: 'MATH-202', dayOfWeek: 'Thursday',  startTime: '11:00', endTime: '12:30' },
    { teacherUid: teacher3Uid, subject: 'Applied Physics',      semester: 3, section: 'A', room: 'PHY-301',  dayOfWeek: 'Wednesday', startTime: '14:00', endTime: '15:30' },
  ];

  for (const s of schedules) {
    await setDoc(doc(db, 'schedules', `${s.teacherUid}-${s.subject}-${s.section}`), {
      ...s, isActive: true,
    });
    console.log(`  ✅ ${s.subject} — ${s.dayOfWeek} ${s.startTime} (Sem ${s.semester} Sec ${s.section})`);
  }

  // ─── Students ──────────────────────────────────────────────────────────────
  console.log('\n👥 Creating students...');

  const students = [
    { email: 's1.ali@gigccl.edu.pk',    name: 'Muhammad Ali Hassan', rollNo: '2022-CS-001', semester: 3, section: 'A' },
    { email: 's2.sara@gigccl.edu.pk',   name: 'Sara Iqbal',          rollNo: '2022-CS-002', semester: 3, section: 'A' },
    { email: 's3.omar@gigccl.edu.pk',   name: 'Omar Farooq',         rollNo: '2022-CS-003', semester: 3, section: 'A' },
    { email: 's4.zara@gigccl.edu.pk',   name: 'Zara Nawaz',          rollNo: '2022-CS-004', semester: 3, section: 'A' },
    { email: 's5.bilal@gigccl.edu.pk',  name: 'Bilal Ahmad',         rollNo: '2022-CS-005', semester: 3, section: 'A' },
    { email: 's6.noor@gigccl.edu.pk',   name: 'Noor Fatima',         rollNo: '2022-CS-006', semester: 3, section: 'B' },
    { email: 's7.hamza@gigccl.edu.pk',  name: 'Hamza Sheikh',        rollNo: '2022-CS-007', semester: 3, section: 'B' },
    { email: 's8.ayesha@gigccl.edu.pk', name: 'Ayesha Siddiqui',     rollNo: '2022-CS-008', semester: 3, section: 'B' },
    { email: 's9.tariq@gigccl.edu.pk',  name: 'Tariq Mahmood',       rollNo: '2020-CS-009', semester: 5, section: 'A' },
    { email: 's10.hira@gigccl.edu.pk',  name: 'Hira Baig',           rollNo: '2020-CS-010', semester: 5, section: 'A' },
  ];

  for (const student of students) {
    const uid = await createAuthUser(student.email, 'Student@123');
    await setDoc(doc(db, 'users', uid), {
      email: student.email,
      name: student.name,
      rollNo: student.rollNo,
      semester: student.semester,
      section: student.section,
      role: 'student',
      phone: '',
      isActive: true,
      createdAt: Timestamp.now(),
    });
    console.log(`  ✅ ${student.name} (${student.rollNo})`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seed complete! All accounts created.\n');
  console.log('ADMIN    → admin@gigccl.edu.pk     / Admin@123');
  console.log('TEACHER  → dr.khan@gigccl.edu.pk  / Teacher@123');
  console.log('TEACHER  → ms.fatima@gigccl.edu.pk / Teacher@123');
  console.log('TEACHER  → mr.hassan@gigccl.edu.pk / Teacher@123');
  console.log('STUDENT  → s1.ali@gigccl.edu.pk   / Student@123');
  console.log('         → (s2–s10 same pattern)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});
