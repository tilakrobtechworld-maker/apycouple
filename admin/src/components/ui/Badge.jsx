import React from 'react';
import { clsx } from 'clsx';

/**
 * Badge — pill-shaped status indicator.
 *
 * variants: success | warning | danger | info | gray | gold | indigo
 */
const VARIANTS = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  danger:  'bg-red-50 text-red-700 ring-1 ring-red-200',
  info:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  gray:    'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  gold:    'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
  indigo:  'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  purple:  'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
};

const SIZES = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export default function Badge({ children, variant = 'gray', size = 'md', dot = false, className }) {
  return (
    <span
      className={clsx(
        'badge font-medium rounded-full',
        VARIANTS[variant] || VARIANTS.gray,
        SIZES[size] || SIZES.md,
        className
      )}
    >
      {dot && (
        <span
          className={clsx(
            'mr-1.5 inline-block w-1.5 h-1.5 rounded-full',
            variant === 'success' && 'bg-emerald-500',
            variant === 'warning' && 'bg-amber-500',
            variant === 'danger'  && 'bg-red-500',
            variant === 'info'    && 'bg-blue-500',
            variant === 'gray'    && 'bg-slate-400',
            variant === 'gold'    && 'bg-amber-500',
            variant === 'indigo'  && 'bg-indigo-500',
          )}
        />
      )}
      {children}
    </span>
  );
}
