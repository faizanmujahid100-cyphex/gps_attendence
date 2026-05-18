import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User, UserRole } from '@/types';

export async function loginUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
  if (!userDoc.exists()) throw new Error('User profile not found.');
  const userData = userDoc.data() as User;
  if (!userData.isActive) throw new Error('Account is deactivated. Contact admin.');
  return { uid: credential.user.uid, ...userData };
}

export async function logoutUser() {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as User;
}

export async function createUserAccount(
  email: string,
  password: string,
  role: UserRole,
  profileData: Omit<User, 'uid' | 'email' | 'role' | 'createdAt'>
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user: Omit<User, 'uid'> = {
    email,
    role,
    createdAt: Timestamp.now(),
    ...profileData,
  };
  await setDoc(doc(db, 'users', credential.user.uid), user);
  return credential.user.uid;
}

export async function changeUserPassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Not authenticated');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export function getRoleRedirect(role: UserRole): string {
  switch (role) {
    case 'admin': return '/admin/dashboard';
    case 'teacher': return '/teacher/dashboard';
    case 'student': return '/student/home';
    default: return '/login';
  }
}
