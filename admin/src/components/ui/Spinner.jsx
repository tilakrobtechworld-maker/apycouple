import React from 'react';

/**
 * Spinner — animated loading indicator.
 *
 * Props:
 *  size    'sm' | 'md' | 'lg' | 'xl'
 *  color   Tailwind border color class (default: 'border-indigo-600')
 */
const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
  xl: 'w-14 h-14 border-4',
};

export default function Spinner({ size = 'md', color = 'border-indigo-600', className = '' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${SIZES[size] || SIZES.md} ${color} rounded-full border-t-transparent animate-spin ${className}`}
    />
  );
}
