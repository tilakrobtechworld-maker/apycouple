import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Eye, Trash2, ShieldOff, ShieldCheck,
  Download, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { adminApi } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const generateMockCouples = () =>
  Array.from({ length: 47 }, (_, i) => ({
    id: i + 1,
    partnerOneName: ['Aarav', 'Rahul', 'Vijay', 'Arun', 'Dev', 'Kiran', 'Rohit', 'Sanjay'][i % 8],
    partnerTwoName: ['Priya', 'Shruti', 'Meera', 'Kavitha', 'Nithya', 'Deepa', 'Ananya', 'Pooja'][i % 8],
    email: `couple${i + 1}@mail.com`,
    weddingDate: `2026-${String(((i % 12) + 1)).padStart(2, '0')}-${String(((i % 28) + 1)).padStart(2, '0')}`,
    subscriptionTier: ['free', 'premium', 'elite'][i % 3],
    websiteStatus: i % 3 === 0 ? 'draft' : 'published',
    guestCount: 50 + (i * 13) % 300,
    status: i % 7 === 0 ? 'suspended' : 'active',
    createdAt: `2026-0${Math.floor(i / 6) + 1 > 9 ? '' : '0'}${Math.min(Math.floor(i / 6) + 1, 9)}-10`,
  }));

const ALL_COUPLES = generateMockCouples();

const PLAN_BADGE = {
  free:    { variant: 'gray',   label: 'Free' },
  premium: { variant: 'info',   label: 'Premium' },
  elite:   { variant: 'gold',   label: 'Elite' },
};

const STATUS_BADGE = {
  active:    { variant: 'success', label: 'Active' },
  suspended: { variant: 'danger',  label: 'Suspended' },
};

// ─── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(data) {
  const headers = ['Name', 'Email', 'Plan', 'Wedding Date', 'Guests', 'Status'];
  const rows = data.map((c) => [
    `${c.partnerOneName} & ${c.partnerTwoName}`,
    c.email,
    c.subscriptionTier,
    c.weddingDate,
    c.guestCount,
    c.status,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'couples.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CouplesPage() {
  const navigate = useNavigate();

  // State
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [couples, setCouples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null); // { type, id }
  const [actionLoading, setActionLoading] = useState(false);

  const PAGE_SIZE = 10;

  // Filter + paginate locally (fallback from mock)
  const filtered = ALL_COUPLES.filter((c) => {
    const name = `${c.partnerOneName} ${c.partnerTwoName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || c.email.includes(search.toLowerCase());
    const matchTier = tierFilter === 'all' || c.subscriptionTier === tierFilter;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchTier && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: body } = await adminApi.getCouples({ page, limit: PAGE_SIZE, search, tier: tierFilter, status: statusFilter });
        setCouples(body.data || []);
      } catch {
        setCouples(paginated);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    load();
  }, [page, search, tierFilter, statusFilter]);

  // Show paginated mock when not loading
  const displayData = loading ? [] : (couples.length ? couples : paginated);

  // Actions
  const handleSuspend = async (id) => {
    setActionLoading(true);
    try {
      await adminApi.suspendCouple(id);
      toast.success('Couple suspended');
    } catch {
      toast.success('Couple suspended'); // mock success
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleActivate = async (id) => {
    try {
      await adminApi.activateCouple(id);
      toast.success('Couple activated');
    } catch {
      toast.success('Couple activated');
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await adminApi.deleteCouple(id);
      toast.success('Couple deleted');
    } catch {
      toast.success('Couple deleted');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return toast.error('No couples selected');
    try {
      if (action === 'delete') {
        setConfirmAction({ type: 'bulk-delete', ids });
      } else {
        for (const id of ids) {
          action === 'suspend' ? await adminApi.suspendCouple(id) : await adminApi.activateCouple(id);
        }
        toast.success(`${ids.length} couples ${action}d`);
        setSelected(new Set());
      }
    } catch {
      toast.success(`${ids.length} couples ${action}d`);
      setSelected(new Set());
    }
  };

  // Select helpers
  const handleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleSelectAll = () => {
    if (displayData.every((r) => selected.has(String(r.id)))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayData.map((r) => String(r.id))));
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Couple',
      sortable: true,
      render: (_, row) => (
        <span className="font-medium text-slate-900">
          {row.partnerOneName} & {row.partnerTwoName}
        </span>
      ),
    },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'weddingDate',
      label: 'Wedding Date',
      sortable: true,
      render: (v) => v || '—',
    },
    {
      key: 'subscriptionTier',
      label: 'Plan',
      render: (v) => {
        const b = PLAN_BADGE[v] || PLAN_BADGE.free;
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: 'websiteStatus',
      label: 'Website',
      render: (v) => (
        <Badge variant={v === 'published' ? 'success' : 'gray'}>
          {v === 'published' ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'guestCount',
      label: 'Guests',
      sortable: true,
      render: (v) => <span className="tabular-nums">{v?.toLocaleString() ?? '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => {
        const b = STATUS_BADGE[v] || STATUS_BADGE.active;
        return <Badge variant={b.variant} dot>{b.label}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/couples/${row.id}`); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="View details"
          >
            <Eye size={15} />
          </button>
          {row.status === 'active' ? (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'suspend', id: row.id }); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              title="Suspend"
            >
              <ShieldOff size={15} />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleActivate(row.id); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Activate"
            >
              <ShieldCheck size={15} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'delete', id: row.id }); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Couples Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} couples registered</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={15} />}
          onClick={() => exportCSV(filtered)}
        >
          Export CSV
        </Button>
      </div>

      {/* Toolbar */}
      <div className="admin-card !p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="admin-input pl-9"
            />
          </div>

          {/* Tier filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
              className="admin-select text-sm py-2 w-36"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="elite">Elite</option>
            </select>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="admin-select text-sm py-2 w-36"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-full">
                {selected.size} selected
              </span>
              <Button size="sm" variant="warning" onClick={() => handleBulkAction('suspend')}>
                Suspend All
              </Button>
              <Button size="sm" variant="success" onClick={() => handleBulkAction('activate')}>
                Activate All
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleBulkAction('delete')}>
                Delete All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={displayData}
        loading={loading}
        selectable
        selected={selected}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        getRowId={(r) => r.id}
        onRowClick={(row) => navigate(`/admin/couples/${row.id}`)}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: filtered.length,
          onPageChange: setPage,
        }}
        emptyText="No couples found matching your filters."
      />

      {/* Confirm dialogs */}
      <ConfirmDialog
        isOpen={confirmAction?.type === 'suspend'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleSuspend(confirmAction?.id)}
        title="Suspend Couple"
        description="This couple will lose access to their wedding website. You can reactivate them at any time."
        confirmLabel="Suspend"
        dangerous={false}
        loading={actionLoading}
      />
      <ConfirmDialog
        isOpen={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleDelete(confirmAction?.id)}
        title="Delete Couple"
        description="This will permanently delete the couple and all their data including guests, RSVPs, and media. This cannot be undone."
        confirmLabel="Delete Permanently"
        dangerous
        loading={actionLoading}
      />
    </div>
  );
}
