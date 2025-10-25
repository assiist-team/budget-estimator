import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

type UserRole = 'owner' | 'admin' | 'customer';

interface UserEntitlements {
  tools: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  entitlements: UserEntitlements;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  hasToolAccess: (toolId: string) => boolean;
}

const DEFAULT_TOOL_ACCESS = ['budget-estimator'];

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeEntitlements(entitlements: UserEntitlements | undefined | null): UserEntitlements {
  if (!entitlements || !Array.isArray(entitlements.tools)) {
    return { tools: DEFAULT_TOOL_ACCESS };
  }

  const uniqueTools = Array.from(new Set([...entitlements.tools, ...DEFAULT_TOOL_ACCESS]));
  return { tools: uniqueTools };
}

async function ensureUserDocument(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    const entitlements = normalizeEntitlements(data.entitlements as UserEntitlements | undefined);
    const role = (data.role as UserRole) ?? 'customer';

    await setDoc(
      userRef,
      {
        email: user.email ?? data.email ?? '',
        displayName: user.displayName ?? data.displayName ?? '',
        role,
        entitlements,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      uid: user.uid,
      email: user.email ?? data.email ?? '',
      displayName: user.displayName ?? data.displayName ?? null,
      role,
      entitlements,
    };
  }

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName,
    role: 'customer',
    entitlements: normalizeEntitlements(undefined),
  };

  await setDoc(userRef, {
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    entitlements: profile.entitlements,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const ensuredProfile = await ensureUserDocument(user);
        setProfile(ensuredProfile);
      } catch (error) {
        console.error('Failed to initialize user profile', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

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
      isAdmin: profile ? ['owner', 'admin'].includes(profile.role) : false,
      signInWithGoogle,
      signOutUser,
      hasToolAccess,
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


