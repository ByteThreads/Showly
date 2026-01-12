'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  GoogleAuthProvider as GoogleAuthProviderType,
  OAuthCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { posthog } from './posthog';
import type { Agent } from '@/types/database';

interface AuthContextType {
  user: User | null;
  agent: Agent | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  linkAccountWithCredential: (email: string, password: string, credential: any) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  agent: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  linkAccountWithCredential: async () => {},
  resetPassword: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch agent data from Firestore
  async function fetchAgentData(uid: string) {
    try {
      const agentDoc = await getDoc(doc(db, 'agents', uid));
      if (agentDoc.exists()) {
        const data = agentDoc.data();
        // Convert Firestore Timestamps to JavaScript Dates
        const agentData = {
          id: agentDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          trialStartDate: data.trialStartDate?.toDate?.() || data.trialStartDate,
          subscriptionEndDate: data.subscriptionEndDate?.toDate?.() || data.subscriptionEndDate,
        } as Agent;
        setAgent(agentData);
      }
    } catch (error) {
      console.error('Error fetching agent data:', error);
    }
  }

  // Listen to auth state changes
  useEffect(() => {
    console.log('[AuthContext] Setting up auth listener...');

    // Clear stale auth data if app version changed
    const APP_VERSION = '1.0.1'; // Increment this when auth changes are deployed
    const storedVersion = localStorage.getItem('app_version');

    if (storedVersion !== APP_VERSION) {
      console.log('[AuthContext] App version changed, clearing stale auth data...');
      // Clear all IndexedDB databases used by Firebase
      if (typeof indexedDB !== 'undefined') {
        indexedDB.databases?.().then(databases => {
          databases.forEach(db => {
            if (db.name?.includes('firebase')) {
              console.log('[AuthContext] Deleting Firebase database:', db.name);
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
      // Clear localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('firebase:')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('app_version', APP_VERSION);
      console.log('[AuthContext] Stale auth data cleared, version updated to', APP_VERSION);
    }

    // Timeout fallback in case Firebase never initializes
    const timeout = setTimeout(() => {
      console.error('[AuthContext] Firebase auth timeout - forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout); // Cancel timeout if auth state changes
      console.log('[AuthContext] Auth state changed:', user ? `User ${user.uid}` : 'No user');
      setUser(user);

      if (user) {
        console.log('[AuthContext] Fetching agent data for user:', user.uid);
        await fetchAgentData(user.uid);

        // Identify user in PostHog
        posthog.identify(user.uid, {
          email: user.email || undefined,
        });
      } else {
        setAgent(null);
        // Reset PostHog on sign out
        posthog.reset();
      }

      console.log('[AuthContext] Setting loading to false');
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Sign in existing user
  async function signIn(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  // Sign up new user
  async function signUp(email: string, password: string, name: string, phone: string) {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create agent document in Firestore
      const agentData: Omit<Agent, 'id'> = {
        email: user.email!,
        name,
        phone,
        subscriptionStatus: 'trial',
        trialStartDate: new Date(),
        trialShowingsCount: 0,
        isFounderCustomer: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          defaultShowingDuration: 30,
          bufferTime: 15,
          bookingWindow: 14,  // 2 weeks ahead by default
          workingHours: {
            monday: { start: '09:00', end: '17:00', enabled: true },
            tuesday: { start: '09:00', end: '17:00', enabled: true },
            wednesday: { start: '09:00', end: '17:00', enabled: true },
            thursday: { start: '09:00', end: '17:00', enabled: true },
            friday: { start: '09:00', end: '17:00', enabled: true },
            saturday: { start: '10:00', end: '16:00', enabled: false },
            sunday: { start: '10:00', end: '16:00', enabled: false },
          },
          smsReminders: true,
          emailReminders: true,
          googleCalendarSync: false,
        },
      };

      await setDoc(doc(db, 'agents', user.uid), agentData);

      // Track signup
      posthog.capture('user_signed_up', {
        method: 'email',
      });

      // Fetch the newly created agent data
      await fetchAgentData(user.uid);
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  }

  // Sign in with Google
  async function signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Check if agent document exists
      const agentDoc = await getDoc(doc(db, 'agents', result.user.uid));

      if (!agentDoc.exists()) {
        console.log('[AuthContext] Creating new agent document...');
        // New user - create agent document
        const agentData: Omit<Agent, 'id'> = {
          email: result.user.email!,
          name: result.user.displayName || 'Agent',
          phone: result.user.phoneNumber || '',
          photoURL: result.user.photoURL || undefined,
          subscriptionStatus: 'trial',
          trialStartDate: new Date(),
          trialShowingsCount: 0,
          isFounderCustomer: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: {
            defaultShowingDuration: 30,
            bufferTime: 15,
            bookingWindow: 14,
            workingHours: {
              monday: { start: '09:00', end: '17:00', enabled: true },
              tuesday: { start: '09:00', end: '17:00', enabled: true },
              wednesday: { start: '09:00', end: '17:00', enabled: true },
              thursday: { start: '09:00', end: '17:00', enabled: true },
              friday: { start: '09:00', end: '17:00', enabled: true },
              saturday: { start: '10:00', end: '16:00', enabled: false },
              sunday: { start: '10:00', end: '16:00', enabled: false },
            },
            smsReminders: true,
            emailReminders: true,
            googleCalendarSync: false,
          },
        };

        await setDoc(doc(db, 'agents', result.user.uid), agentData);
        console.log('[AuthContext] Agent document created');

        // Track signup for new users
        posthog.capture('user_signed_up', {
          method: 'google',
        });
      }

      // Fetch agent data
      await fetchAgentData(result.user.uid);
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  }

  // Sign in with Apple
  async function signInWithApple() {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const result = await signInWithPopup(auth, provider);

      // Check if agent document exists
      const agentDoc = await getDoc(doc(db, 'agents', result.user.uid));

      if (!agentDoc.exists()) {
        console.log('[AuthContext] Creating new agent document...');
        // New user - create agent document
        const agentData: Omit<Agent, 'id'> = {
          email: result.user.email!,
          name: result.user.displayName || 'Agent',
          phone: result.user.phoneNumber || '',
          photoURL: result.user.photoURL || undefined,
          subscriptionStatus: 'trial',
          trialStartDate: new Date(),
          trialShowingsCount: 0,
          isFounderCustomer: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: {
            defaultShowingDuration: 30,
            bufferTime: 15,
            bookingWindow: 14,
            workingHours: {
              monday: { start: '09:00', end: '17:00', enabled: true },
              tuesday: { start: '09:00', end: '17:00', enabled: true },
              wednesday: { start: '09:00', end: '17:00', enabled: true },
              thursday: { start: '09:00', end: '17:00', enabled: true },
              friday: { start: '09:00', end: '17:00', enabled: true },
              saturday: { start: '10:00', end: '16:00', enabled: false },
              sunday: { start: '10:00', end: '16:00', enabled: false },
            },
            smsReminders: true,
            emailReminders: true,
            googleCalendarSync: false,
          },
        };

        await setDoc(doc(db, 'agents', result.user.uid), agentData);
        console.log('[AuthContext] Agent document created');

        // Track signup for new users
        posthog.capture('user_signed_up', {
          method: 'apple',
        });
      }

      // Fetch agent data
      await fetchAgentData(result.user.uid);
    } catch (error: any) {
      console.error('Apple sign in error:', error);
      throw new Error(error.message || 'Failed to sign in with Apple');
    }
  }

  // Link account with credential (for account linking)
  async function linkAccountWithCredential(email: string, password: string, credential: any) {
    try {
      // First, sign in with email/password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Link the credential to the existing account
      await linkWithCredential(user, credential);

      // Fetch agent data
      await fetchAgentData(user.uid);
    } catch (error: any) {
      console.error('Account linking error:', error);
      throw new Error(error.message || 'Failed to link accounts');
    }
  }

  // Reset password
  async function resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  // Sign out
  async function signOut() {
    try {
      await firebaseSignOut(auth);
      setAgent(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  const value = {
    user,
    agent,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    linkAccountWithCredential,
    resetPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
