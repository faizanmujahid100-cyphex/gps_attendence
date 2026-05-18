const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
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
const auth = getAuth(app);
const db = getFirestore(app);

async function setupAdmin() {
  console.log('🔐 Signing in as admin...');

  const credential = await signInWithEmailAndPassword(
    auth,
    'admin@gigccl.edu.pk',
    'Admin@123'
  );

  const uid = credential.user.uid;
  console.log('✅ Signed in. UID:', uid);

  console.log('📝 Writing admin profile to Firestore...');

  await setDoc(doc(db, 'users', uid), {
    uid,
    email: 'admin@gigccl.edu.pk',
    name: 'System Administrator',
    role: 'admin',
    department: 'Administration',
    phone: '+92-42-111-001',
    isActive: true,
    createdAt: Timestamp.now(),
  });

  console.log('✅ Admin profile created in Firestore!');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login → http://localhost:3000/login');
  console.log('Email:    admin@gigccl.edu.pk');
  console.log('Password: Admin@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(0);
}

setupAdmin().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
