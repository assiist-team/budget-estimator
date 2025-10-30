import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../lib/firebase';

export type UserRole = 'admin' | 'user';

export interface UserEntitlements {
  tools: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: UserRole;
  entitlements: UserEntitlements;
}

const DEFAULT_TOOL_ACCESS = ['budget-estimator', 'roi-estimator'];

export function normalizeEntitlements(entitlements?: UserEntitlements | null): UserEntitlements {
  if (!entitlements || !Array.isArray(entitlements.tools)) {
    return { tools: DEFAULT_TOOL_ACCESS };
  }
  const uniqueTools = Array.from(new Set([...entitlements.tools, ...DEFAULT_TOOL_ACCESS]));
  return { tools: uniqueTools };
}

export async function createOrUpdateUserDocument(firebaseUser: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as any;
    const role: UserRole = (data.role as UserRole) ?? 'user';
    const entitlements = normalizeEntitlements(data.entitlements as UserEntitlements | undefined);

    await setDoc(
      userRef,
      {
        email: firebaseUser.email ?? data.email ?? '',
        displayName: firebaseUser.displayName ?? data.displayName ?? '',
        role,
        entitlements,
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? data.email ?? '',
      displayName: firebaseUser.displayName ?? data.displayName ?? null,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      phone: data.phone ?? null,
      role,
      entitlements,
    };
  }

  // To avoid needing list permissions on the users collection, we'll default all new
  // users to 'customer' role. The first user can be promoted to 'owner' manually
  // in the Firebase console.
  const role: UserRole = 'user';
  const entitlements = normalizeEntitlements(undefined);

  const [firstName, ...lastNameParts] = (firebaseUser.displayName ?? '').split(' ');
  const lastName = lastNameParts.join(' ');

  const profile: UserProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    displayName: firebaseUser.displayName ?? null,
    firstName: firstName ?? null,
    lastName: lastName ?? null,
    phone: firebaseUser.phoneNumber ?? null,
    role,
    entitlements,
  };

  await setDoc(userRef, {
    email: profile.email,
    displayName: profile.displayName,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    role: profile.role,
    entitlements: profile.entitlements,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  });

  return profile;
}

export async function updateUserContactInfo(uid: string, data: { phone?: string | null; firstName?: string | null, lastName?: string | null }): Promise<void> {
  const userRef = doc(db, 'users', uid);

  const updateData: { [key: string]: any } = {
    updatedAt: serverTimestamp(),
  };

  if (data.firstName) {
    updateData.firstName = data.firstName;
  }
  if (data.lastName) {
    updateData.lastName = data.lastName;
  }
  if (data.phone) {
    updateData.phone = data.phone;
  }

  // A user's displayName should be their full name if we have it, otherwise their email.
  const existingDoc = await getDoc(userRef);
  const existingData = existingDoc.data();
  const firstName = data.firstName ?? existingData?.firstName;
  const lastName = data.lastName ?? existingData?.lastName;

  if (firstName && lastName) {
    updateData.displayName = `${firstName} ${lastName}`;
  } else if (firstName) {
    updateData.displayName = firstName;
  }


  await setDoc(userRef, updateData, { merge: true });
}


