import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * StatCard — displays a single platform metric with optional trend.
 *
 * Props:
 *  title        string   — metric label
 *  value        string|number — main value to display
 *  icon         ReactNode — icon element
 *  iconBg       string   — Tailwind bg class for icon wrapper, e.g. 'bg-indigo-100'
 *  iconColor    string   — Tailwind text class for icon, e.g. 'text-indigo-600'
 *  borderColor  string   — Tailwind border-l color class, e.g. 'border-indigo-500'
 *  trend        object?  — { value: number, label?: string } positive=up, negative=down
 *  loading      bool?    — show skeleton state
 */
export default function StatCard({
  title,
  value,
  icon,
  iconBg = 'bg-indigo-100',
  iconColor = 'text-indigo-600',
  borderColor = 'border-indigo-500',
  trend,
  loading = false,
}) {
  const isUp = trend?.value >= 0;

  if (loading) {
    return (
      <div className="admin-card border-l-4 border-slate-200 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-slate-200 rounded w-24 animate-shimmer" />
            <div className="h-7 bg-slate-200 rounded w-16 animate-shimmer" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-200 animate-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-card border-l-4 ${borderColor} hover:shadow-card-hover transition-shadow duration-200`}>
      <div className="flex items-center justify-between">
        {/* Left: text info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${isUp ? 'trend-up' : 'trend-down'}`}>
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && <span className="text-slate-500 font-normal">&nbsp;{trend.label}</span>}
            </div>
          )}
        </div>

        {/* Right: icon */}
        <div className={`ml-4 flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </div>
  );
}
