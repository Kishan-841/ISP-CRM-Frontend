'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuthStore } from '@/lib/customerStore';
import { Eye, EyeOff, Sun, Moon, Wifi, Shield, Zap, Headphones, Loader2, User, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useCustomerAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [focused, setFocused] = useState('');

  useEffect(() => {
    initialize();
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/customer-portal/dashboard');
    }
  }, [isAuthenticated, router]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      toast.success('Login successful!');
      router.push('/customer-portal/dashboard');
    } else {
      setError(result.error);
      toast.error(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-700 to-amber-800">
        {/* Abstract background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-white/5" />
          <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] rounded-full bg-white/[0.03]" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Top - Logo */}
          <div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Wifi size={22} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Customer Portal</span>
            </div>
          </div>

          {/* Center - Hero */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Manage your<br />connection with<br />
                <span className="text-orange-200">ease.</span>
              </h1>
              <p className="mt-4 text-orange-100/80 text-lg max-w-md leading-relaxed">
                Access your account, track usage, manage billing, and get support - all in one place.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Zap, text: 'Real-time Usage' },
                { icon: Shield, text: 'Secure Access' },
                { icon: Headphones, text: '24/7 Support' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-white/90">
                  <Icon size={14} className="text-orange-200" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <p className="text-orange-200/50 text-sm">&copy; {new Date().getFullYear()} NetConnect. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950 relative">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-5 right-5 p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="w-full max-w-[440px] px-6 sm:px-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-700 shadow-lg shadow-orange-600/20 mb-4">
              <Wifi size={26} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">NetConnect</h2>
          </div>

          {/* Card container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 p-8 sm:p-10">
            {/* Welcome text */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1.5">Sign in to your customer portal</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Username
                </label>
                <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${
                  focused === 'username'
                    ? 'border-orange-500 ring-[3px] ring-orange-500/10 dark:ring-orange-400/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                } bg-slate-50 dark:bg-slate-800/50`}>
                  <div className="pl-3.5 text-slate-400">
                    <User size={18} />
                  </div>
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocused('username')}
                    onBlur={() => setFocused('')}
                    required
                    autoComplete="username"
                    className="w-full h-12 px-3 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${
                  focused === 'password'
                    ? 'border-orange-500 ring-[3px] ring-orange-500/10 dark:ring-orange-400/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                } bg-slate-50 dark:bg-slate-800/50`}>
                  <div className="pl-3.5 text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused('')}
                    required
                    autoComplete="current-password"
                    className="w-full h-12 px-3 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3">
                  <div className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400">!</span>
                  </div>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-orange-600/25 hover:shadow-orange-600/35 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-6">
            Need help? Contact your service provider
          </p>
        </div>
      </div>
    </div>
  );
}
