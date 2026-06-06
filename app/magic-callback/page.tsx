// app/magic-callback/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { CheckCircle2, XCircle, Loader2, LogIn } from 'lucide-react';

function MagicContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyMagicLink } = useAuth();
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const userId = searchParams.get('userId');
  const secret = searchParams.get('secret');

  const handleLogin = async () => {
    if (!userId || !secret) {
      setStatus('error');
      return;
    }

    setStatus('processing');

    const { success } = await verifyMagicLink(userId, secret);
    if (success) {
      setStatus('success');
      setTimeout(() => router.push('/dashboard'), 2000);
    } else {
      setStatus('error');
    }
  };

  if (!userId || !secret) {
    return (
      <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-sm text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-600" />
        <h1 className="text-xl font-semibold text-red-700">Invalid link</h1>
        <p className="text-sm text-gray-500">Missing login parameters.</p>
        <button
          onClick={() => router.push('/magic-link')}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Request new link
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-sm text-center">
      {status === 'idle' && (
        <>
          <LogIn className="mx-auto h-12 w-12 text-blue-600" />
          <h1 className="text-xl font-semibold">Complete login</h1>
          <p className="text-sm text-gray-500">
            Click the button below to log in to your account.
          </p>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          <button
            onClick={handleLogin}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Log in
          </button>
        </>
      )}

      {status === 'processing' && (
        <>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <h1 className="text-xl font-semibold">Logging in...</h1>
          <p className="text-sm text-gray-500">Please wait while we authenticate you.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="text-xl font-semibold text-green-700">Welcome back!</h1>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="mx-auto h-12 w-12 text-red-600" />
          <h1 className="text-xl font-semibold text-red-700">Login failed</h1>
          <p className="text-sm text-gray-500">
            The magic link is invalid, expired, or has already been used.
          </p>
          <button
            onClick={() => router.push('/magic-link')}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Request new link
          </button>
        </>
      )}
    </div>
  );
}

export default function MagicCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
            <p className="mt-4 text-sm text-gray-500">Loading...</p>
          </div>
        }
      >
        <MagicContent />
      </Suspense>
    </div>
  );
}
