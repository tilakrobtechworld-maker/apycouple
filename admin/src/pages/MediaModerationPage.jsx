import React, { useState, useEffect, useCallback } from 'react';
import { Search, Check, X, CheckSquare, Clock, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { adminApi } from '../services/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import Spinner from '../components/ui/Spinner';

// ─── Mock Media Data ───────────────────────────────────────────────────────────
const MOCK_MEDIA = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  url: [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=300',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=300',
    'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=300',
    'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=300',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=300',
    'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=300',
  ][i % 6],
  couple: ['Aarav & Priya', 'Rahul & Shruti', 'Vijay & Meera', 'Arun & Kavitha'][i % 4],
  uploader: ['Aarav K.', 'Priya S.', 'Rahul M.', 'Shruti R.'][i % 4],
  type: i % 5 === 0 ? 'video' : 'photo',
  status: ['pending', 'approved', 'rejected'][i % 3],
  date: `2026-09-${String(Math.max(1, 10 - Math.floor(i / 3))).padStart(2, '0')}`,
}));

const pending = MOCK_MEDIA.filter((m) => m.status === 'pending');
const all = MOCK_MEDIA;

// ─── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total Pending', value: stats.pending, icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
        { label: 'Approved Today', value: stats.approvedToday, icon: Check, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
        { label: 'Rejected Today', value: stats.rejectedToday, icon: X, color: 'text-red-600 bg-red-50 border-red-200' },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className={`flex items-center gap-3 rounded-xl border p-4 ${color}`}>
          <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center">
            <Icon size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium opacity-70">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Pending Photo Grid ────────────────────────────────────────────────────────
function PendingGrid({ media, onApprove, onReject, actionLoading, selected, onToggleSelect }) {
  if (media.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Check size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">All caught up! No pending media.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
      {media.map((item) => {
        const isSelected = selected.has(item.id);
        const loading = actionLoading[item.id];
        return (
          <div
            key={item.id}
            className={`relative group rounded-xl overflow-hidden bg-slate-100 aspect-square border-2 transition-colors cursor-pointer ${isSelected ? 'border-indigo-500' : 'border-transparent'}`}
            onClick={() => onToggleSelect(item.id)}
          >
            <img src={item.url} alt={item.couple} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200" loading="lazy" />

            {/* Select indicator */}
            {isSelected && (
              <div className="absolute top-2 left-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                <Check size={11} className="text-white" />
              </div>
            )}

            {/* Type badge */}
            {item.type === 'video' && (
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">VIDEO</div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/65 transition-all duration-200 flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
              <p className="text-white text-[10px] font-semibold mb-0.5 leading-tight">{item.couple}</p>
              <p className="text-slate-300 text-[9px] mb-2">by {item.uploader} · {item.date}</p>
              <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onApprove(item.id)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-medium transition-colors"
                >
                  {loading ? <Spinner size="sm" color="border-white" /> : <><Check size={11} /> OK</>}
                </button>
                <button
                  onClick={() => onReject(item.id)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[11px] font-medium transition-colors"
                >
                  <X size={11} /> No
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MediaModerationPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [mediaList, setMediaList] = useState(MOCK_MEDIA);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const stats = {
    pending: mediaList.filter((m) => m.status === 'pending').length,
    approvedToday: 8,
    rejectedToday: 3,
  };

  const pendingItems = mediaList.filter((m) => m.status === 'pending');
  const filteredAll = mediaList.filter((m) => {
    const matchSearch = !search || m.couple.toLowerCase().includes(search.toLowerCase()) || m.uploader.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const setStatus = (id, status) =>
    setMediaList((prev) => prev.map((m) => m.id === id ? { ...m, status } : m));

  const handleApprove = async (id) => {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      await adminApi.approveMedia(id);
    } catch { /* graceful */ }
    setStatus(id, 'approved');
    toast.success('Media approved');
    setSelected((p) => { const n = new Set(p); n.delete(id); return n; });
    setActionLoading((p) => ({ ...p, [id]: false }));
  };

  const handleReject = async (id) => {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      await adminApi.rejectMedia(id);
    } catch { /* graceful */ }
    setStatus(id, 'rejected');
    toast.success('Media rejected');
    setSelected((p) => { const n = new Set(p); n.delete(id); return n; });
    setActionLoading((p) => ({ ...p, [id]: false }));
  };

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    for (const id of selected) await handleApprove(id);
    setSelected(new Set());
    toast.success(`${selected.size} items approved`);
  };

  const handleBulkReject = async () => {
    if (selected.size === 0) return;
    for (const id of selected) await handleReject(id);
    setSelected(new Set());
    toast.success(`${selected.size} items rejected`);
  };

  const toggleSelect = (id) => setSelected((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  // All-media table columns
  const columns = [
    {
      key: 'preview',
      label: 'Preview',
      render: (_, row) => (
        <img src={row.url} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100" loading="lazy" />
      ),
    },
    { key: 'couple', label: 'Couple', sortable: true },
    { key: 'uploader', label: 'Uploader' },
    {
      key: 'type',
      label: 'Type',
      render: (v) => <Badge variant={v === 'video' ? 'purple' : 'info'}>{v}</Badge>,
    },
    { key: 'date', label: 'Date', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (v) => (
        <Badge variant={v === 'approved' ? 'success' : v === 'rejected' ? 'danger' : 'warning'} dot>
          {v}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        row.status === 'pending' && (
          <div className="flex gap-1">
            <button onClick={() => handleApprove(row.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Approve"><Check size={14} /></button>
            <button onClick={() => handleReject(row.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Reject"><X size={14} /></button>
          </div>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-xl font-bold text-slate-900">Media Moderation</h1>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {[
            { key: 'pending', label: 'Pending Approval', count: stats.pending },
            { key: 'all', label: 'All Media', count: mediaList.length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                {count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Pending tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
              <span className="text-sm text-indigo-700 font-medium">{selected.size} selected</span>
              <Button size="sm" variant="success" icon={<Check size={14} />} onClick={handleBulkApprove}>
                Approve Selected
              </Button>
              <Button size="sm" variant="danger" icon={<X size={14} />} onClick={handleBulkReject}>
                Reject Selected
              </Button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-slate-500 hover:text-slate-700">
                Clear selection
              </button>
            </div>
          )}
          <PendingGrid
            media={pendingItems}
            onApprove={handleApprove}
            onReject={handleReject}
            actionLoading={actionLoading}
            selected={selected}
            onToggleSelect={toggleSelect}
          />
        </div>
      )}

      {/* All media tab */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="admin-card !p-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by couple or uploader…"
                className="admin-input pl-9"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="admin-select text-sm py-2 w-36"
            >
              <option value="all">All Types</option>
              <option value="photo">Photos</option>
              <option value="video">Videos</option>
            </select>
          </div>

          <DataTable
            columns={columns}
            data={filteredAll}
            loading={loading}
            emptyText="No media found."
          />
        </div>
      )}
    </div>
  );
}
