// hooks/use-auth.ts
'use client';

import { useCallback } from 'react';
import { account } from '@/lib/appwrite';
import { ID, AppwriteException } from 'appwrite';
import { useAuthStore } from '../store/auth-store';

const getOrigin = () =>
  typeof window !== 'undefined' ? window.location.origin : '';

interface AuthResult<T = void> {
  success: boolean;
  error: { message: string; code?: number; type?: string } | null;
  data: T | null;
}

function useAuthWrap() {
  const { setLoading, setError, clearError } = useAuthStore();

  return useCallback(
    async <T,>(fn: () => Promise<T>): Promise<AuthResult<T>> => {
      setLoading(true);
      clearError();
      try {
        const data = await fn();
        return { success: true, data, error: null };
      } catch (err) {
        const error =
          err instanceof AppwriteException
            ? { message: err.message, code: err.code, type: err.type }
            : { message: String(err) };
        setError(error.message);
        return { success: false, data: null, error };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, clearError]
  );
}

export function useAuth() {
  const wrap = useAuthWrap();
  const { setUser } = useAuthStore();

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      const result = await wrap(async () => {
        await account.create({ userId: email, email, password, name });
        await account.createEmailPasswordSession({ email, password });
        await account.createEmailVerification({
          url: `${getOrigin()}/verify-email`,
        });
        return account.get();
      });
      if (result.success && result.data) setUser(result.data);
      return result;
    },
    [wrap, setUser]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await wrap(async () => {
        await account.createEmailPasswordSession({ email, password });
        return account.get();
      });
      if (result.success && result.data) setUser(result.data);
      return result;
    },
    [wrap, setUser]
  );

  const logout = useCallback(async () => {
    const result = await wrap(() => account.deleteSessions());
    if (result.success) setUser(null);
    return result;
  }, [wrap, setUser]);

  const sendVerificationEmail = useCallback(async () => {
    return wrap(() =>
      account.createEmailVerification({
        url: `${getOrigin()}/verify-email`,
      })
    );
  }, [wrap]);

  const verifyEmail = useCallback(
    async (userId: string, secret: string) => {
      const result = await wrap(async () => {
        await account.updateEmailVerification({ userId, secret });
        return account.get();
      });
      if (result.success && result.data) setUser(result.data);
      return result;
    },
    [wrap, setUser]
  );

  const sendMagicLink = useCallback(
    async (email: string) => {
      return wrap(() =>
        account.createMagicURLToken({
          userId: ID.unique(),
          email,
          url: `${getOrigin()}/magic-callback`,
        })
      );
    },
    [wrap]
  );

  const verifyMagicLink = useCallback(
    async (userId: string, secret: string) => {
      const result = await wrap(async () => {
        await account.createSession({ userId, secret });
        return account.get();
      });
      if (result.success && result.data) setUser(result.data);
      return result;
    },
    [wrap, setUser]
  );

  const sendPasswordReset = useCallback(
    async (email: string) => {
      return wrap(() =>
        account.createRecovery({
          email,
          url: `${getOrigin()}/reset-password`,
        })
      );
    },
    [wrap]
  );

  const resetPassword = useCallback(
    async (userId: string, secret: string, password: string) => {
      return wrap(() => account.updateRecovery({ userId, secret, password }));
    },
    [wrap]
  );

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
