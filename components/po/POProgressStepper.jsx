'use client';

import React from 'react';
import { Check, X, Clock, Truck, Package, Boxes, CheckCircle2 } from 'lucide-react';
import { getProgressStep, PO_LIFECYCLE_STEPS } from '@/lib/po-utils';

const stepIcons = {
  created: Clock,
  approved: Check,
  sent: Truck,
  receiving: Package,
  inventory: Boxes,
  complete: CheckCircle2
};

export default function POProgressStepper({ status, compact = false }) {
  const currentStep = getProgressStep(status);
  const isRejected = currentStep === -1;

  if (compact) {
    // Compact version - just dots
    return (
      <div className="flex items-center gap-1">
        {PO_LIFECYCLE_STEPS.map((step, index) => (
          <div
            key={step.key}
            className={`h-2 w-2 rounded-full transition-colors ${
              isRejected
                ? 'bg-red-300 dark:bg-red-700'
                : index <= currentStep
                ? 'bg-emerald-500'
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
            title={step.label}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-200 dark:bg-slate-700 -z-10" />
        <div
          className={`absolute left-0 top-4 h-0.5 transition-all duration-500 -z-10 ${
            isRejected ? 'bg-red-400' : 'bg-emerald-500'
          }`}
          style={{
            width: isRejected ? '0%' : `${Math.max(0, (currentStep / (PO_LIFECYCLE_STEPS.length - 1)) * 100)}%`
          }}
        />

        {PO_LIFECYCLE_STEPS.map((step, index) => {
          const Icon = stepIcons[step.key];
          const isCompleted = !isRejected && index <= currentStep;
          const isCurrent = !isRejected && index === currentStep;

          return (
            <div key={step.key} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isRejected && index === 0
                    ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-400'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500'
                    : 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700'
                }`}
              >
                {isRejected && index === 0 ? (
                  <X size={16} className="text-red-500" />
                ) : isCompleted ? (
                  <Check size={16} />
                ) : (
                  <Icon size={16} className={isCurrent ? 'text-emerald-600' : 'text-slate-400'} />
                )}
              </div>
              <span
                className={`text-xs mt-2 font-medium ${
                  isRejected
                    ? 'text-red-500'
                    : isCompleted || isCurrent
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-400'
                }`}
              >
                {step.shortLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rejected message */}
      {isRejected && (
        <div className="mt-3 text-center">
          <span className="text-xs text-red-500 font-medium">
            {status === 'REJECTED' ? 'PO was rejected' : 'Delivery was rejected'}
          </span>
        </div>
      )}
    </div>
  );
}
