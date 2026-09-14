import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { coupleApi, guestApi, mediaApi, rsvpApi } from '../../services/api';
import { Users, CheckCircle, Camera, Calendar, Heart, Plus, Upload } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function DashboardHome() {
  const { coupleProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentRsvps, setRecentRsvps] = useState([]);
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      coupleApi.getDashboardStats(),
      rsvpApi.getResponses({ limit: 5 }),
      mediaApi.getAll({ limit: 6, approved: true }),
    ]).then(([statsRes, rsvpRes, mediaRes]) => {
      setStats(statsRes.data.data);
      setRecentRsvps(rsvpRes.data.data || []);
      setRecentPhotos(mediaRes.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const weddingDate = coupleProfile?.wedding_date ? new Date(coupleProfile.wedding_date) : null;
  const daysLeft = weddingDate ? Math.ceil((weddingDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

  const statCards = [
    { label: 'Total Guests', value: stats?.totalGuests ?? 0, icon: Users, color: 'bg-blue-50 text-blue-600', href: '/dashboard/guests' },
    { label: 'Attending', value: stats?.attending ?? 0, icon: CheckCircle, color: 'bg-green-50 text-green-600', href: '/dashboard/rsvp' },
    { label: 'Photos', value: stats?.photos ?? 0, icon: Camera, color: 'bg-purple-50 text-purple-600', href: '/dashboard/media' },
    { label: 'Days Until Wedding', value: daysLeft ?? '--', icon: Calendar, color: 'bg-primary-50 text-primary-600', href: null },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="card p-6 bg-gradient-to-r from-primary-500 to-rose-400 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold">
              Welcome back, {coupleProfile?.bride_name} & {coupleProfile?.groom_name}! 💕
            </h1>
            {weddingDate && (
              <p className="mt-1 text-rose-100">
                {daysLeft > 0 ? `${daysLeft} days until your wedding on ${format(weddingDate, 'MMMM d, yyyy')}` :
                 daysLeft === 0 ? '🎉 Today is your wedding day!' : `You got married on ${format(weddingDate, 'MMMM d, yyyy')} 🥂`}
              </p>
            )}
          </div>
          <Heart className="w-12 h-12 text-white/30 fill-white/30 hidden md:block" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-3xl font-bold font-serif text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            {s.href && (
              <Link to={s.href} className="text-xs text-primary-500 hover:text-primary-600 font-medium mt-3 inline-block">
                View all →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/dashboard/guests', icon: Plus, label: 'Add Guest', color: 'border-blue-200 hover:border-blue-400 text-blue-600 hover:bg-blue-50' },
              { to: '/dashboard/events', icon: Calendar, label: 'New Event', color: 'border-purple-200 hover:border-purple-400 text-purple-600 hover:bg-purple-50' },
              { to: '/dashboard/media', icon: Upload, label: 'Upload Photo', color: 'border-green-200 hover:border-green-400 text-green-600 hover:bg-green-50' },
              { to: '/dashboard/website', icon: Heart, label: 'Edit Website', color: 'border-primary-200 hover:border-primary-400 text-primary-600 hover:bg-primary-50' },
            ].map(a => (
              <Link key={a.label} to={a.to} className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all text-center ${a.color}`}>
                <a.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent RSVPs */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent RSVPs</h2>
            <Link to="/dashboard/rsvp" className="text-xs text-primary-500 hover:underline">View all</Link>
          </div>
          {recentRsvps.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No RSVPs yet. Send invitations to your guests!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRsvps.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{r.Guest?.first_name} {r.Guest?.last_name}</p>
                    <p className="text-xs text-gray-400">{r.Event?.title} • {formatDistanceToNow(new Date(r.submitted_at), { addSuffix: true })}</p>
                  </div>
                  <span className={`badge ${r.attending === 'yes' ? 'badge-green' : r.attending === 'no' ? 'badge-red' : 'badge-yellow'}`}>
                    {r.attending}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Photos */}
      {recentPhotos.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Photos</h2>
            <Link to="/dashboard/media" className="text-xs text-primary-500 hover:underline">View gallery</Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {recentPhotos.map(p => (
              <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={p.thumbnail_url || p.media_url} alt={p.caption || 'Photo'} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

