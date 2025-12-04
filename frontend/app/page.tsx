"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await loginUser(email);
      if (user) {
        // Save basic session (Local storage for V1)
        localStorage.setItem('monthaven_user', JSON.stringify(user));
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'ERR_NETWORK') {
         setError('Cannot connect to backend. Is it running?');
      } else if (err.response?.status === 404) {
         setError('User not found. Please ask Admin to seed you.');
      } else {
         setError('Access Denied. Are you seeded in the DB?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Monthaven Command</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Agent Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 mt-1 border rounded-md text-black"
              placeholder="agent@monthaven.com"
              required
              disabled={loading}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'Connecting...' : 'Enter Command Center'}
          </button>
        </form>
      </div>
    </div>
  );
}
