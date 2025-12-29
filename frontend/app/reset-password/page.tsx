/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Password Reset Page - Enter new password
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate we have required params
  const isValid = token && email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      setSuccess(true);
      
      // Redirect to signin after 3 seconds
      setTimeout(() => {
        router.push('/signin');
      }, 3000);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-panel p-8 rounded-2xl border border-red-500/30 text-center">
            <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Invalid Reset Link</h1>
            <p className="text-slate-400 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft size={16} />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-panel p-8 rounded-2xl border border-emerald-500/30 text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Password Reset!</h1>
            <p className="text-slate-400 mb-6">
              Your password has been successfully reset. Redirecting to sign in...
            </p>
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <KeyRound className="text-blue-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-slate-400">Enter your new password below</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-white/10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-4 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm"
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
