import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminAuth } from '../context/AdminAuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

// ─── Validation Schema ─────────────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email, password }) => {
    setServerError('');
    try {
      await login(email, password);
      toast.success('Welcome back! Redirecting…');
      navigate('/admin');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-900/40">
              <Shield size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">AppyCouple Admin</h1>
            <p className="text-slate-400 text-sm">Sign in to manage the platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="admin@appycouple.com"
                  {...register('email')}
                  className={[
                    'w-full pl-9 pr-4 py-2.5 rounded-xl text-sm',
                    'bg-white/10 border text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500',
                    'transition-all duration-150',
                    errors.email ? 'border-red-500' : 'border-white/20',
                  ].join(' ')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={[
                    'w-full pl-9 pr-10 py-2.5 rounded-xl text-sm',
                    'bg-white/10 border text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500',
                    'transition-all duration-150',
                    errors.password ? 'border-red-500' : 'border-white/20',
                  ].join(' ')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={[
                'w-full py-2.5 rounded-xl text-sm font-semibold text-white',
                'bg-indigo-600 hover:bg-indigo-500 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900',
                'flex items-center justify-center gap-2',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-slate-500">
            Admin accounts are created via system seeder only.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          AppyCouple Platform v1.0 — Admin Panel
        </p>
      </div>
    </div>
  );
}
