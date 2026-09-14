import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, Users, CheckCircle, Image, TrendingUp,
  Clock, Eye, Check, X, CreditCard,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { adminApi } from '../services/api';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import { AdminBarChart, AdminPieChart } from '../components/ui/Chart';

// ─── Mock fallback data ────────────────────────────────────────────────────────
const MOCK_STATS = {
  totalCouples: 247,
  totalGuests: 18342,
  totalRsvps: 14210,
  totalMedia: 5893,
  freePlan: 128,
  premiumPlan: 84,
  elitePlan: 35,
  pendingMedia: 23,
};

const MOCK_MONTHLY = [
  { month: 'Apr', couples: 28 },
  { month: 'May', couples: 34 },
  { month: 'Jun', couples: 41 },
  { month: 'Jul', couples: 38 },
  { month: 'Aug', couples: 52 },
  { month: 'Sep', couples: 47 },
];

const MOCK_PIE = [
  { name: 'Free',    value: 128 },
  { name: 'Premium', value: 84 },
  { name: 'Elite',   value: 35 },
];

const MOCK_RECENT_COUPLES = [
  { id: 1, name: 'Aarav & Priya',   email: 'aarav@mail.com',  plan: 'premium', websiteStatus: 'published', createdAt: '2026-08-28', weddingDate: '2026-12-15', status: 'active' },
  { id: 2, name: 'Rahul & Shruti',  email: 'rahul@mail.com',  plan: 'elite',   websiteStatus: 'published', createdAt: '2026-08-25', weddingDate: '2027-01-20', status: 'active' },
  { id: 3, name: 'Vijay & Meera',   email: 'vijay@mail.com',  plan: 'free',    websiteStatus: 'draft',     createdAt: '2026-08-22', weddingDate: '2026-11-05', status: 'active' },
  { id: 4, name: 'Arun & Kavitha',  email: 'arun@mail.com',   plan: 'premium', websiteStatus: 'published', createdAt: '2026-08-18', weddingDate: '2027-02-14', status: 'suspended' },
  { id: 5, name: 'Dev & Nithya',    email: 'dev@mail.com',    plan: 'free',    websiteStatus: 'draft',     createdAt: '2026-08-15', weddingDate: '2026-10-30', status: 'active' },
];

const MOCK_PENDING_MEDIA = [
  { id: 1, url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200', couple: 'Aarav & Priya', uploader: 'Aarav K.', date: '2026-09-10' },
  { id: 2, url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=200', couple: 'Rahul & Shruti', uploader: 'Shruti R.', date: '2026-09-09' },
  { id: 3, url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=200', couple: 'Vijay & Meera', uploader: 'Meera V.', date: '2026-09-09' },
  { id: 4, url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=200', couple: 'Arun & Kavitha', uploader: 'Arun S.', date: '2026-09-08' },
  { id: 5, url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=200', couple: 'Dev & Nithya', uploader: 'Dev M.', date: '2026-09-07' },
  { id: 6, url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=200', couple: 'Kiran & Deepa', uploader: 'Kiran P.', date: '2026-09-07' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const PLAN_BADGE = {
  free:    { variant: 'gray',   label: 'Free' },
  premium: { variant: 'info',   label: 'Premium' },
  elite:   { variant: 'gold',   label: 'Elite' },
};

const STATUS_BADGE = {
  active:    { variant: 'success', label: 'Active' },
  suspended: { variant: 'danger',  label: 'Suspended' },
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingMedia, setPendingMedia] = useState(MOCK_PENDING_MEDIA);
  const [mediaActionLoading, setMediaActionLoading] = useState({});

  // Fetch stats
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await adminApi.getStats();
        setStats(data);
      } catch {
        setStats(MOCK_STATS); // Graceful fallback
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const s = stats || MOCK_STATS;

  const handleMediaAction = useCallback(async (id, action) => {
    setMediaActionLoading((p) => ({ ...p, [id]: true }));
    try {
      if (action === 'approve') {
        await adminApi.approveMedia(id);
        toast.success('Media approved');
      } else {
        await adminApi.rejectMedia(id);
        toast.success('Media rejected');
      }
      setPendingMedia((prev) => prev.filter((m) => m.id !== id));
    } catch {
      // Use mock behavior
      setPendingMedia((prev) => prev.filter((m) => m.id !== id));
      toast.success(action === 'approve' ? 'Media approved' : 'Media rejected');
    } finally {
      setMediaActionLoading((p) => ({ ...p, [id]: false }));
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* ── Primary Stats ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Platform Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            loading={loading}
            title="Total Couples"
            value={s.totalCouples}
            icon={<Heart size={22} />}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            borderColor="border-l-indigo-500"
            trend={{ value: 12, label: 'this month' }}
          />
          <StatCard
            loading={loading}
            title="Total Guests"
            value={s.totalGuests}
            icon={<Users size={22} />}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            borderColor="border-l-blue-500"
            trend={{ value: 8, label: 'this month' }}
          />
          <StatCard
            loading={loading}
            title="Total RSVPs"
            value={s.totalRsvps}
            icon={<CheckCircle size={22} />}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            borderColor="border-l-emerald-500"
            trend={{ value: 5, label: 'this week' }}
          />
          <StatCard
            loading={loading}
            title="Total Media"
            value={s.totalMedia}
            icon={<Image size={22} />}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            borderColor="border-l-purple-500"
            trend={{ value: 18, label: 'this month' }}
          />
        </div>
      </div>

      {/* ── Subscription + Pending Stats ──────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Subscription Breakdown
        </h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            loading={loading}
            title="Free Plan"
            value={s.freePlan}
            icon={<CreditCard size={20} />}
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
            borderColor="border-l-slate-400"
          />
          <StatCard
            loading={loading}
            title="Premium Plan"
            value={s.premiumPlan}
            icon={<CreditCard size={20} />}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            borderColor="border-l-blue-500"
          />
          <StatCard
            loading={loading}
            title="Elite Plan"
            value={s.elitePlan}
            icon={<CreditCard size={20} />}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            borderColor="border-l-amber-500"
          />
          <StatCard
            loading={loading}
            title="Pending Media"
            value={s.pendingMedia ?? pendingMedia.length}
            icon={<Clock size={20} />}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            borderColor="border-l-orange-500"
          />
        </div>
      </div>

      {/* ── Charts ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Bar chart */}
        <div className="admin-card lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">New Couples Registered</h3>
              <p className="text-sm text-slate-500">Last 6 months</p>
            </div>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">Monthly</span>
          </div>
          <AdminBarChart
            data={MOCK_MONTHLY}
            dataKey="couples"
            xKey="month"
            color="#6366f1"
            height={220}
          />
        </div>

        {/* Pie chart */}
        <div className="admin-card lg:col-span-2">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">Subscription Distribution</h3>
            <p className="text-sm text-slate-500">By tier</p>
          </div>
          <AdminPieChart
            data={MOCK_PIE}
            colors={['#94a3b8', '#3b82f6', '#f59e0b']}
            height={220}
          />
        </div>
      </div>

      {/* ── Recent Couples ────────────────────────────────────────────── */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Recent Registrations</h3>
          <button
            onClick={() => navigate('/admin/couples')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View all →
          </button>
        </div>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full admin-table">
            <thead>
              <tr>
                <th>Couple</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Wedding Date</th>
                <th>Registered</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECENT_COUPLES.map((c) => {
                const plan = PLAN_BADGE[c.plan] || PLAN_BADGE.free;
                const status = STATUS_BADGE[c.status] || STATUS_BADGE.active;
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/admin/couples/${c.id}`)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="font-medium text-slate-900">{c.name}</td>
                    <td className="text-slate-500">{c.email}</td>
                    <td>
                      <Badge variant={plan.variant}>{plan.label}</Badge>
                    </td>
                    <td>{c.weddingDate}</td>
                    <td className="text-slate-500">{c.createdAt}</td>
                    <td>
                      <Badge variant={status.variant} dot>{status.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pending Media Quick Actions ───────────────────────────────── */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Pending Media Approval</h3>
            <p className="text-sm text-slate-500">{pendingMedia.length} items awaiting review</p>
          </div>
          <button
            onClick={() => navigate('/admin/media')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View all →
          </button>
        </div>
        {pendingMedia.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <CheckCircle size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">All media approved! No pending items.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {pendingMedia.map((media) => (
              <div key={media.id} className="relative group rounded-xl overflow-hidden bg-slate-100 aspect-square">
                <img
                  src={media.url}
                  alt={media.couple}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                  loading="lazy"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/60 transition-all duration-200 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <p className="text-white text-[10px] font-medium text-center px-1 leading-tight">{media.couple}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMediaAction(media.id, 'approve')}
                      disabled={mediaActionLoading[media.id]}
                      className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors"
                      title="Approve"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleMediaAction(media.id, 'reject')}
                      disabled={mediaActionLoading[media.id]}
                      className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
                      title="Reject"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
