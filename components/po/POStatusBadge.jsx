'use client';

import React from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { getStatusLabel, getStatusColors, getStatusShortLabel } from '@/lib/po-utils';

const statusIcons = {
  PENDING_ADMIN: Clock,
  PENDING_SUPER_ADMIN: Clock,
  APPROVED: CheckCircle,
  PENDING_RECEIPT: Truck,
  RECEIVED: Package,
  PARTIALLY_RECEIVED: Package,
  RECEIPT_REJECTED: XCircle,
  REJECTED: XCircle,
  COMPLETED: CheckCircle
};

export default function POStatusBadge({
  status,
  size = 'default', // 'sm', 'default', 'lg'
  showIcon = true,
  showLabel = true,
  variant = 'default' // 'default', 'outline', 'minimal'
}) {
  const colors = getStatusColors(status);
  const Icon = statusIcons[status] || AlertCircle;
  const label = showLabel ? getStatusLabel(status) : '';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const iconSizes = {
    sm: 12,
    default: 14,
    lg: 16
  };

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-1.5 ${colors.text}`}>
        {showIcon && <Icon size={iconSizes[size]} />}
        {showLabel && <span className="font-medium">{label}</span>}
      </div>
    );
  }

  if (variant === 'outline') {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full border ${colors.border} ${colors.text} ${sizeClasses[size]}`}>
        {showIcon && <Icon size={iconSizes[size]} />}
        {showLabel && <span className="font-medium">{label}</span>}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full ${colors.bg} ${colors.text} ${sizeClasses[size]}`}>
      {showIcon && <Icon size={iconSizes[size]} />}
      {showLabel && <span className="font-medium">{label}</span>}
    </div>
  );
}

// Compact version for tables
export function POStatusDot({ status }) {
  const colors = getStatusColors(status);
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors.bg.replace('100', '500').replace('900/30', '500')}`} />
      <span className={`text-sm font-medium ${colors.text}`}>
        {getStatusShortLabel(status)}
      </span>
    </div>
  );
}
