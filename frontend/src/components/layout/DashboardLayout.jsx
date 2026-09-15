import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  LayoutDashboard, Users, Calendar, CheckSquare, Camera, BookOpen,
  Gift, Map, Layout, Sparkles, Bell, Settings, LogOut, Heart, Menu, X, ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/guests', icon: Users, label: 'Guest List' },
  { to: '/dashboard/events', icon: Calendar, label: 'Events' },
  { to: '/dashboard/rsvp', icon: CheckSquare, label: 'RSVPs' },
  { to: '/dashboard/media', icon: Camera, label: 'Photo Gallery' },
  { to: '/dashboard/guestbook', icon: BookOpen, label: 'Guestbook' },
  { to: '/dashboard/registry', icon: Gift, label: 'Registry' },
  { to: '/dashboard/travel', icon: Map, label: 'Travel & Hotels' },
  { to: '/dashboard/website', icon: Layout, label: 'Website Editor' },
  { to: '/dashboard/cards', icon: Sparkles, label: 'Card Creator' },
  { to: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function DashboardLayout() {
  const { coupleProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const weddingDate = coupleProfile?.wedding_date ? new Date(coupleProfile.wedding_date) : null;
  const daysLeft = weddingDate ? Math.ceil((weddingDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

  const handleLogout = () => { logout(); navigate('/'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary-500 fill-primary-500" />
          <span className="text-lg font-serif font-bold text-gray-900">SaveTheDate</span>
        </div>
        {coupleProfile && (
          <div className="mt-4 bg-primary-50 rounded-xl p-3">
            <p className="font-semibold text-gray-800 text-sm truncate">{coupleProfile.couple_display_name || `${coupleProfile.bride_name} & ${coupleProfile.groom_name}`}</p>
            {daysLeft !== null && (
              <p className="text-xs text-primary-600 mt-1 font-medium">
                {daysLeft > 0 ? `${daysLeft} days to go! 💕` : daysLeft === 0 ? 'Today is the day! 🎉' : 'Just married! 🥂'}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {coupleProfile.custom_slug ? `savethedate.com/w/${coupleProfile.custom_slug}` : 'No website yet'}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-primary-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all w-full">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white h-full shadow-xl">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {coupleProfile?.custom_slug && (
              <a href={`/w/${coupleProfile.custom_slug}`} target="_blank" rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium">
                View Website <ChevronRight className="w-3 h-3" />
              </a>
            )}
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-500 fill-primary-500" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

