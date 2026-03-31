'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useThemeStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useAuthStore();
  const { theme, toggleTheme, initialize: initTheme } = useThemeStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initialize();
    initTheme();
  }, [initialize, initTheme]);

  const getRoleLandingPage = (role) => {
    if (role === 'SALES_DIRECTOR') return '/dashboard/admin-dashboards';
    return '/dashboard';
  };

  useEffect(() => {
    if (isAuthenticated) {
      const user = useAuthStore.getState().user;
      router.push(getRoleLandingPage(user?.role));
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      toast.success('Login successful! Redirecting...');
      const user = useAuthStore.getState().user;
      router.push(getRoleLandingPage(user?.role));
    } else {
      setError(result.error);
      toast.error(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-white dark:bg-slate-900 p-12 flex-col justify-between relative">
        <div>
          <img src="/gazon logo file.png" alt="Gazon Logo" className="h-16 mb-6" />
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">Enterprise Management,Refined.</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg">End-to-end customer lifecycle management — from lead to billing to support.</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Lead to Installation</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Complete sales pipeline with feasibility, docs verification, and NOC provisioning.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Automated Billing</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">GST invoicing, payment tracking, and ledger management on autopilot.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Complaint & Service</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">TAT-tracked complaints, service orders, and post-sale account management.</p>
            </div>
          </div>
        </div>

        <p className="text-slate-400 dark:text-slate-500 text-sm">© 2025 Gazon India. All rights reserved.</p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-orange-600">
        <div className="w-full max-w-md">
          {/* Theme Toggle */}
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-6">
            <img src="/gazon logo file.png" alt="Gazon Logo" className="h-12 brightness-0 invert" />
          </div>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">Sign in to your account to continue</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Email address <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-10 sm:h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:ring-orange-600 focus:border-orange-600"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Password <span className="text-red-500">*</span></Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-10 sm:h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:ring-orange-600 focus:border-orange-600"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 sm:h-11 bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Sign in'}
                </Button>
              </form>

              <p className="text-center text-slate-500 text-sm mt-6">
                Contact your administrator if you need an account
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
