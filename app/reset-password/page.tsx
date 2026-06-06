// app/reset-password/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, KeyRound } from 'lucide-react';

function ResetContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { resetPassword } = useAuth();
    const isLoading = useAuthStore((s) => s.isLoading);
    const error = useAuthStore((s) => s.error);

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [done, setDone] = useState(false);

    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !secret || password !== confirm) return;

        const { success } = await resetPassword(userId, secret, password);
        if (success) setDone(true);
    };

    if (!userId || !secret) {
        return (
            <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-sm text-center">
                <XCircle className="mx-auto h-12 w-12 text-red-600" />
                <h1 className="text-xl font-semibold text-red-700">Invalid link</h1>
                <p className="text-sm text-gray-500">Missing reset parameters.</p>
                <button
                    onClick={() => router.push('/forgot-password')}
                    className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                    Request new link
                </button>
            </div>
        );
    }

    if (done) {
        return (
            <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-sm text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                <h1 className="text-xl font-semibold text-green-700">Password updated</h1>
                <p className="text-sm text-gray-500">Your password has been successfully reset.</p>
                <button
                    onClick={() => router.push('/login')}
                    className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                    Log in
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow-sm">
            <div className="text-center">
                <KeyRound className="mx-auto h-12 w-12 text-blue-600" />
                <h1 className="mt-4 text-2xl font-bold">New password</h1>
                <p className="text-sm text-gray-500">Enter a new password for your account.</p>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 pr-10"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400"
                >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            </div>

            <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
            />

            {password && confirm && password !== confirm && (
                <p className="text-sm text-red-600">Passwords do not match</p>
            )}

            <button
                type="submit"
                disabled={isLoading || password !== confirm || password.length < 8}
                className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
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
                <ResetContent />
            </Suspense>
        </div>
    );
}
