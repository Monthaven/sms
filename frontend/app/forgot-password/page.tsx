/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Forgot Password Page - Request password reset
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send reset email');
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-panel p-8 rounded-2xl border border-emerald-500/30 text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Check Your Email</h1>
            <p className="text-slate-400 mb-6">
              If an account exists with <span className="text-white">{email}</span>, you'll receive a password reset link shortly.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setSuccess(false); setEmail(''); }}
                className="w-full px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Try Different Email
              </button>
              <Link
                href="/signin"
                className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors text-center"
              >
                Back to Sign In
              </Link>
            </div>
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
            <Mail className="text-blue-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Forgot Password?</h1>
          <p className="text-slate-400">No worries, we'll send you reset instructions.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-white/10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="w-full mt-6 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
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
