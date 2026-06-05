// hooks/useAuth.ts
'use client';

import { useCallback } from 'react';
import { account } from '@/lib/appwrite';
import { ID, AppwriteException } from 'appwrite';
import { useAuthStore } from '@/features/auth/store/auth-store';

const getOrigin = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
};

interface AuthError {
  message: string;
  code?: number;
  type?: string;
}

export function useAuth() {
  const { setUser, setLoading, setError, clearError } = useAuthStore();

  const wrap = useCallback(async <T,>(
    fn: () => Promise<T>
  ): Promise<{ data: T | null; error: AuthError | null }> => {
    setLoading(true);
    clearError();
    try {
      const data = await fn();
      return { data, error: null };
    } catch (err) {
      const error = err instanceof AppwriteException
        ? { message: err.message, code: err.code, type: err.type }
        : { message: String(err) };
      setError(error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, clearError]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const { data: newUser, error } = await wrap(async () => {
      const user = await account.create({
        userId: ID.unique(),
        email,
        password,
        name,
      });
      await account.createEmailPasswordSession({ email, password });
      await account.createEmailVerification({
        url: `${getOrigin()}/verify-email`,
      });
      return user;
    });
    
    if (newUser) {
      const { data: currentUser } = await wrap(() => account.get());
      if (currentUser) setUser(currentUser);
    }
    
    return { success: !error, error };
  }, [wrap, setUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await wrap(async () => {
      await account.createEmailPasswordSession({ email, password });
      const user = await account.get();
      setUser(user);
    });
    return { success: !error, error };
  }, [wrap, setUser]);

  const logout = useCallback(async () => {
    const { error } = await wrap(() => account.deleteSessions());
    if (!error) setUser(null);
    return { success: !error, error };
  }, [wrap, setUser]);

  const sendVerificationEmail = useCallback(async () => {
    return wrap(() => account.createEmailVerification({
      url: `${getOrigin()}/verify-email`,
    }));
  }, [wrap]);

  const verifyEmail = useCallback(async (userId: string, secret: string) => {
    const { error } = await wrap(async () => {
      await account.updateEmailVerification({ userId, secret });
      const user = await account.get();
      setUser(user);
    });
    return { success: !error, error };
  }, [wrap, setUser]);

  const sendMagicLink = useCallback(async (email: string) => {
    return wrap(() => account.createMagicURLToken({
      userId: ID.unique(),
      email,
      url: `${getOrigin()}/magic-callback`,
    }));
  }, [wrap]);

  const verifyMagicLink = useCallback(async (userId: string, secret: string) => {
    const { error } = await wrap(async () => {
      await account.createSession({ userId, secret });
      const user = await account.get();
      setUser(user);
    });
    return { success: !error, error };
  }, [wrap, setUser]);

  const sendPasswordReset = useCallback(async (email: string) => {
    return wrap(() => account.createRecovery({
      email,
      url: `${getOrigin()}/reset-password`,
    }));
  }, [wrap]);

  const resetPassword = useCallback(async (userId: string, secret: string, password: string) => {
    return wrap(() => account.updateRecovery({ userId, secret, password }));
  }, [wrap]);

  return {
    signUp,
    signIn,
    logout,
    sendVerificationEmail,
    verifyEmail,
    sendMagicLink,
    verifyMagicLink,
    sendPasswordReset,
    resetPassword,
  };
}
