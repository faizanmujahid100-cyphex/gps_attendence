import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './src/lib/firebase';
import { useAuthStore } from './src/store/authStore';
import AppNavigator from './src/navigation/AppNavigator';
import type { User } from './src/types';

export default function App() {
  const { setUser, clearUser } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const userData = snap.data() as Omit<User, 'uid'>;
            if (userData.role === 'student' && userData.isActive) {
              setUser({ uid: firebaseUser.uid, ...userData });
            } else {
              await auth.signOut();
              clearUser();
            }
          } else {
            clearUser();
          }
        } catch {
          clearUser();
        }
      } else {
        clearUser();
      }
    });
    return unsubscribe;
  }, [setUser, clearUser]);

  return (
    <>
      <StatusBar style="light" backgroundColor="#1e40af" />
      <AppNavigator />
    </>
  );
}
