import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Eye, Trash2, ShieldOff, ShieldCheck,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { adminApi } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const PLAN_BADGE = {
  free:    { variant: 'gray',   label: 'Free' },
  premium: { variant: 'info',   label: 'Premium' },
  elite:   { variant: 'gold',   label: 'Elite' },
};

// ─── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(data) {
  const headers = ['Name', 'Email', 'Plan', 'Wedding Date', 'Guests', 'Status'];
  const rows = data.map((c) => [
    `${c.bride_name} & ${c.groom_name}`,
    c.user?.email || '',
    c.user?.subscription_tier || '',
    c.wedding_date || '',
    c.guest_count ?? 0,
    c.user?.is_active ? 'active' : 'suspended',
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

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [couples, setCouples] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null); // { type, id }
  const [actionLoading, setActionLoading] = useState(false);

  const PAGE_SIZE = 10;

  const load = async () => {
    setLoading(true);
    try {
      const { data: body } = await adminApi.getCouples({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        subscription_tier: tierFilter === 'all' ? undefined : tierFilter,
        is_active: statusFilter === 'all' ? undefined : String(statusFilter === 'active'),
      });
      setCouples(body.data || []);
      setTotal(body.pagination?.total ?? (body.data || []).length);
    } catch {
      toast.error('Failed to load couples');
      setCouples([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, search, tierFilter, statusFilter]);

  // Actions
  const handleSuspend = async (id) => {
    setActionLoading(true);
    try {
      await adminApi.suspendCouple(id);
      toast.success('Couple suspended');
      load();
    } catch {
      toast.error('Failed to suspend couple');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleActivate = async (id) => {
    try {
      await adminApi.activateCouple(id);
      toast.success('Couple activated');
      load();
    } catch {
      toast.error('Failed to activate couple');
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await adminApi.deleteCouple(id);
      toast.success('Couple deleted');
      load();
    } catch {
      toast.error('Failed to delete couple');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleBulkAction = async (action) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return toast.error('No couples selected');
    if (action === 'delete') {
      setConfirmAction({ type: 'bulk-delete', ids });
      return;
    }
    try {
      for (const id of ids) {
        action === 'suspend' ? await adminApi.suspendCouple(id) : await adminApi.activateCouple(id);
      }
      toast.success(`${ids.length} couples ${action}d`);
      setSelected(new Set());
      load();
    } catch {
      toast.error(`Failed to ${action} some couples`);
    }
  };

  const handleBulkDelete = async () => {
    const ids = confirmAction?.ids || [];
    setActionLoading(true);
    try {
      for (const id of ids) await adminApi.deleteCouple(id);
      toast.success(`${ids.length} couples deleted`);
      setSelected(new Set());
      load();
    } catch {
      toast.error('Failed to delete some couples');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  // Select helpers
  const handleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleSelectAll = () => {
    if (couples.every((r) => selected.has(r.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(couples.map((r) => r.id)));
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Couple',
      render: (_, row) => (
        <span className="font-medium text-slate-900">
          {row.couple_display_name || `${row.bride_name} & ${row.groom_name}`}
        </span>
      ),
    },
    { key: 'email', label: 'Email', render: (_, row) => row.user?.email || '—' },
    {
      key: 'wedding_date',
      label: 'Wedding Date',
      render: (v) => (v ? format(new Date(v), 'MMM d, yyyy') : '—'),
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (_, row) => {
        const tier = row.user?.subscription_tier || 'free';
        const b = PLAN_BADGE[tier] || PLAN_BADGE.free;
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: 'website_published',
      label: 'Website',
      render: (v) => (
        <Badge variant={v ? 'success' : 'gray'}>
          {v ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'guest_count',
      label: 'Guests',
      render: (v) => <span className="tabular-nums">{(v ?? 0).toLocaleString()}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => (
        <Badge variant={row.user?.is_active ? 'success' : 'danger'} dot>
          {row.user?.is_active ? 'Active' : 'Suspended'}
        </Badge>
      ),
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
          {row.user?.is_active ? (
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
          <p className="text-sm text-slate-500 mt-0.5">{total} couples registered</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={15} />}
          onClick={() => exportCSV(couples)}
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
              placeholder="Search by name or slug…"
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
        data={couples}
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
          total,
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
      <ConfirmDialog
        isOpen={confirmAction?.type === 'bulk-delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleBulkDelete}
        title={`Delete ${confirmAction?.ids?.length || 0} Couples`}
        description="This will permanently delete these couples and all their data including guests, RSVPs, and media. This cannot be undone."
        confirmLabel="Delete Permanently"
        dangerous
        loading={actionLoading}
      />
    </div>
  );
}
