// app/verify-email/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail } = useAuth();
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');

  const userId = searchParams.get('userId');
  const secret = searchParams.get('secret');

  const handleVerify = async () => {
    if (!userId || !secret) {
      setStatus('error');
      return;
    }

    setStatus('verifying');

    const { success } = await verifyEmail(userId, secret);
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
        <p className="text-sm text-gray-500">Missing verification parameters.</p>
        <button
          onClick={() => router.push('/login')}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-sm text-center">
      {status === 'idle' && (
        <>
          <ShieldCheck className="mx-auto h-12 w-12 text-blue-600" />
          <h1 className="text-xl font-semibold">Verify your email</h1>
          <p className="text-sm text-gray-500">
            Click the button below to confirm your email address.
          </p>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          <button
            onClick={handleVerify}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Confirm email address
          </button>
        </>
      )}

      {status === 'verifying' && (
        <>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <h1 className="text-xl font-semibold">Verifying...</h1>
          <p className="text-sm text-gray-500">Please wait while we confirm your email.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="text-xl font-semibold text-green-700">Email verified!</h1>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="mx-auto h-12 w-12 text-red-600" />
          <h1 className="text-xl font-semibold text-red-700">Verification failed</h1>
          <p className="text-sm text-gray-500">
            The link is invalid, expired, or has already been used.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Back to login
          </button>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
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
        <VerifyContent />
      </Suspense>
    </div>
  );
}
