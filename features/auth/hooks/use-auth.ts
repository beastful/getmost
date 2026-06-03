"use client"

import { useEffect, useState } from 'react';
import { account } from '@/lib/appwrite';
import { ID, Models } from 'appwrite'; // Import ID helper
import { useRouter } from 'next/navigation';

interface UseAuthReturn {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  verifyEmail: (userId: string, secret: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (userId: string, secret: string) => Promise<void>; // NEW: required for callback
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resetPassword: (userId: string, secret: string, password: string) => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Create the user
      const newUser = await account.create({
        userId: ID.unique(),
        email,
        password,
        name
      });

      // 2. Create a session (required before sending verification)
      await account.createEmailPasswordSession({ email, password });

      // 3. Now send verification email
      await account.createEmailVerification({
        url: `${window.location.origin}/verify-email`
      });

      const currentUser = await account.get();
      setUser(currentUser);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await account.createEmailPasswordSession({ email, password });
      const currentUser = await account.get();
      setUser(currentUser);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    setLoading(true);
    setError(null);
    try {
      await account.createEmailVerification({
        url: `${window.location.origin}/verify-email`
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (userId: string, secret: string) => {
    setLoading(true);
    setError(null);
    try {
      await account.updateEmailVerification({ userId, secret });
      const refreshedUser = await account.get();
      setUser(refreshedUser);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendMagicLink = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await account.createMagicURLToken({
        userId: ID.unique(),
        email,
        url: `${window.location.origin}/magic-callback`
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // NEW: Call this on your /magic-callback page when user clicks the link
  const verifyMagicLink = async (userId: string, secret: string) => {
    setLoading(true);
    try {
      await account.createSession({ userId, secret });
      const currentUser = await account.get();
      setUser(currentUser);
      router.push('/dashboard');
    } catch (err: any) {
      // Token invalid but user already has session? Then it's fine.
      if (err?.type === 'user_invalid_token') {
        const existingUser = await account.get().catch(() => null);
        if (existingUser) {
          setUser(existingUser);
          router.push('/dashboard');
          return;
        }
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await account.deleteSessions();
      setUser(null);
      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await account.createRecovery({
        email,
        url: `${window.location.origin}/reset-password`,
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (userId: string, secret: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await account.updateRecovery({
        userId,
        secret,
        password,
        // passwordAgain: password, // Uncomment if your SDK version requires this field
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    sendVerificationEmail,
    verifyEmail,
    sendMagicLink,
    verifyMagicLink, // Export the new handler
    sendPasswordReset, // add
    resetPassword,     // add
    logout,
  };
};
