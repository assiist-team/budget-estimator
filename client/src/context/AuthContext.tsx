import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, initializeFirebase, initializeAuthPersistence, onAuthStateChange } from '../lib/firebase';
import type { UserProfile } from '../services/auth';
import { createOrUpdateUserDocument } from '../services/auth';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  hasToolAccess: (toolId: string) => boolean;
  // Optional aliases for API parity
  signIn?: () => Promise<void>;
  signOut?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === 'true';
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (AUTH_DISABLED) {
      setFirebaseUser(null);
      setProfile({
        uid: 'dev-user',
        email: 'dev@example.com',
        displayName: 'Dev User',
        firstName: 'Dev',
        lastName: 'User',
        phone: '123-456-7890',
        role: 'admin',
        entitlements: { tools: ['budget-estimator', 'roi-estimator'] },
      });
      setLoading(false);
      return () => {};
    }

    initializeFirebase();

    let unsubscribe = () => {};
    (async () => {
      try {
        await initializeAuthPersistence();
      } catch (e) {
        console.error('Failed to initialize auth persistence', e);
      }

      // Prime local state to reduce flicker before the subscription fires
      setFirebaseUser(auth.currentUser);

      unsubscribe = onAuthStateChange(async (user) => {
        setLoading(true);
        setFirebaseUser(user);

        if (!user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        try {
          const ensuredProfile = await createOrUpdateUserDocument(user);
          setProfile(ensuredProfile);
        } catch (error) {
          console.error('Failed to initialize user profile', error);
          setProfile(null);
        } finally {
          setLoading(false);
        }
      });
    })();

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const hasToolAccess = (toolId: string) => {
    return profile?.entitlements.tools.includes(toolId) ?? false;
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      isAdmin: profile ? profile.role === 'admin' : false,
      signInWithGoogle,
      signOutUser,
      hasToolAccess,
      // Optional aliases for API parity
      signIn: signInWithGoogle,
      signOut: signOutUser,
    }),
    [firebaseUser, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}


