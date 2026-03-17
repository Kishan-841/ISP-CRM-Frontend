'use client';

import { useRouter } from 'next/navigation';
import { Construction, ArrowLeft, Home } from 'lucide-react';

export default function DashboardNotFound() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center py-20 px-4">
      <div className="text-center max-w-md w-full">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-6">
          <Construction className="w-10 h-10 text-orange-500 dark:text-orange-400" />
        </div>

        {/* Error Code */}
        <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-2">404</h1>

        {/* Title */}
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          This page doesn&apos;t exist yet or is currently under development. Check back later!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
