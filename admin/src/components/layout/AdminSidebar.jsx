import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Heart, Palette, Sparkles, Image, Bell,
  CreditCard, Settings, Shield, LogOut, X,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

// ─── Nav Items Config ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/admin',               label: 'Dashboard',         icon: LayoutDashboard, end: true },
  { to: '/admin/couples',       label: 'Couples',           icon: Heart },
  { to: '/admin/themes',        label: 'Themes',            icon: Palette },
  { to: '/admin/card-templates', label: 'Card Templates',   icon: Sparkles },
  { to: '/admin/media',         label: 'Media Moderation',  icon: Image },
  { to: '/admin/notifications', label: 'Notifications',     icon: Bell },
  { to: '/admin/subscriptions', label: 'Subscriptions',     icon: CreditCard },
  { to: '/admin/settings',      label: 'Settings',          icon: Settings },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const { adminUser, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed top-0 left-0 h-full z-40 flex flex-col',
          'w-64 bg-slate-900 border-r border-slate-800',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-sm leading-tight block">SaveTheDate</span>
              <span className="text-indigo-400 text-[10px] font-medium uppercase tracking-wider">Admin Panel</span>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded text-slate-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Main Menu
          </p>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `admin-sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={17} className="flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Admin user info + logout */}
        <div className="flex-shrink-0 border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {adminUser?.name ? adminUser.name[0].toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {adminUser?.name || 'Admin User'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {adminUser?.email || ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all text-sm font-medium"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
