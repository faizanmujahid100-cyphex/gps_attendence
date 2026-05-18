'use client';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';

export function useAuthListener() {
  const { setUser, setLoading, clearUser } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
          setUser(profile);
        } else {
          clearUser();
        }
      } else {
        clearUser();
      }
    });
    return unsubscribe;
  }, [setUser, setLoading, clearUser]);
}

export function useAuth() {
  return useAuthStore();
}
