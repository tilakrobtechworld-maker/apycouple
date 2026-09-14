import React from 'react';
import Spinner from './Spinner';

/**
 * Button — admin action button.
 *
 * Props:
 *  variant  'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
 *  size     'sm' | 'md' | 'lg'
 *  loading  bool
 *  icon     ReactNode (left icon)
 *  iconRight ReactNode (right icon)
 *  ...rest  — forwarded to <button>
 */
const VARIANTS = {
  primary:   'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 border-transparent shadow-sm',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 focus:ring-indigo-500 border-slate-300 shadow-sm',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent shadow-sm',
  ghost:     'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-400 border-transparent',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 border-transparent shadow-sm',
  warning:   'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400 border-transparent shadow-sm',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  className = '',
  disabled,
  type = 'button',
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium rounded-lg border',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        'transition-all duration-150 select-none',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <Spinner
          size="sm"
          color={variant === 'secondary' || variant === 'ghost' ? 'border-slate-500' : 'border-white'}
        />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
}
