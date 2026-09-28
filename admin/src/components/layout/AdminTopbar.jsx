import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell, Search } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

// ─── Route → Title Map ─────────────────────────────────────────────────────────
const ROUTE_TITLES = {
  '/admin':               'Platform Overview',
  '/admin/couples':       'Couples Management',
  '/admin/themes':        'Theme Management',
  '/admin/notifications': 'Platform Notifications',
  '/admin/subscriptions': 'Subscription Management',
  '/admin/settings':      'Platform Settings',
};

function getTitle(pathname) {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  // Dynamic segments (e.g. /admin/couples/123)
  if (pathname.startsWith('/admin/couples/')) return 'Couple Details';
  return 'Admin Panel';
}

export default function AdminTopbar({ onMenuClick }) {
  const location = useLocation();
  const { adminUser } = useAdminAuth();
  const title = getTitle(location.pathname);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 gap-4 flex-shrink-0 sticky top-0 z-20">
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="text-lg font-semibold text-slate-900 hidden sm:block truncate">
        {title}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Global search */}
      <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg text-sm text-slate-500 w-56 cursor-text">
        <Search size={15} className="flex-shrink-0" />
        <span className="select-none">Quick search…</span>
        <kbd className="ml-auto text-[10px] bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-400">⌘K</kbd>
      </div>

      {/* Notification bell */}
      <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors" aria-label="Notifications">
        <Bell size={19} />
        {/* Badge */}
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
      </button>

      {/* Admin avatar */}
      <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
          {adminUser?.name ? adminUser.name[0].toUpperCase() : 'A'}
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-slate-800 leading-tight">
            {adminUser?.name || 'Admin'}
          </p>
          <p className="text-xs text-slate-400 capitalize">
            {adminUser?.role || 'admin'}
          </p>
        </div>
      </div>
    </header>
  );
}
