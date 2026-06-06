// app/magic-link/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthStore } from '@/features/auth/store/auth-store';
import Link from 'next/link';

export default function MagicLinkPage() {
  const { sendMagicLink } = useAuth();
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { success } = await sendMagicLink(email);
    if (success) setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-bold">Magic link</h1>

        {sent ? (
          <div className="rounded bg-green-50 p-4 text-green-700">
            Check your email for the magic link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border p-2"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        )}

        <p className="text-center text-sm">
          <Link href="/login" className="text-blue-600">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
