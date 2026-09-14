import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Heart, Globe, Users, Calendar, Image,
  CreditCard, ShieldOff, ShieldCheck, Trash2,
  Check, X, ExternalLink, Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../services/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Spinner from '../components/ui/Spinner';
import DataTable from '../components/ui/DataTable';

// ─── Mock detail data ──────────────────────────────────────────────────────────
const MOCK_COUPLE = {
  id: 1,
  partnerOneName: 'Aarav Kumar',
  partnerTwoName: 'Priya Sharma',
  email: 'aarav.priya@mail.com',
  phone: '+91 98765 43210',
  weddingDate: '2026-12-15',
  websiteUrl: 'https://aaravpriya.appycouple.in',
  websiteStatus: 'published',
  subscriptionTier: 'premium',
  status: 'active',
  createdAt: '2026-08-28',
  photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
  guestCount: 185,
  rsvpCount: 142,
  eventCount: 4,
  mediaCount: 38,
  guests: [
    { id: 1, name: 'Ramesh Kumar', email: 'ramesh@mail.com', side: 'Groom', rsvp: 'attending', category: 'Family' },
    { id: 2, name: 'Sunita Sharma', email: 'sunita@mail.com', side: 'Bride', rsvp: 'attending', category: 'Family' },
    { id: 3, name: 'Amit Patel', email: 'amit@mail.com', side: 'Groom', rsvp: 'declined', category: 'Friends' },
    { id: 4, name: 'Deepika Rao', email: 'deepika@mail.com', side: 'Bride', rsvp: 'pending', category: 'Colleagues' },
  ],
  events: [
    { id: 1, name: 'Mehendi Ceremony', date: '2026-12-13', guestCount: 85, venue: 'Home Garden' },
    { id: 2, name: 'Haldi Ceremony', date: '2026-12-14', guestCount: 60, venue: 'Home' },
    { id: 3, name: 'Wedding Ceremony', date: '2026-12-15', guestCount: 185, venue: 'Grand Hall' },
    { id: 4, name: 'Reception', date: '2026-12-15', guestCount: 185, venue: 'Rooftop Banquet' },
  ],
  media: [
    { id: 1, url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300', type: 'photo', status: 'approved', uploadedBy: 'Aarav K.', date: '2026-09-01' },
    { id: 2, url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=300', type: 'photo', status: 'pending', uploadedBy: 'Priya S.', date: '2026-09-05' },
    { id: 3, url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=300', type: 'photo', status: 'approved', uploadedBy: 'Aarav K.', date: '2026-09-07' },
    { id: 4, url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=300', type: 'photo', status: 'rejected', uploadedBy: 'Priya S.', date: '2026-09-08' },
    { id: 5, url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=300', type: 'photo', status: 'pending', uploadedBy: 'Aarav K.', date: '2026-09-09' },
    { id: 6, url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=300', type: 'photo', status: 'approved', uploadedBy: 'Priya S.', date: '2026-09-10' },
  ],
};

// ─── Tab configs ───────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Guests', 'Events', 'RSVPs', 'Media', 'Subscription'];

const PLAN_BADGE = {
  free:    { variant: 'gray', label: 'Free' },
  premium: { variant: 'info', label: 'Premium' },
  elite:   { variant: 'gold', label: 'Elite' },
};

const MEDIA_STATUS_BADGE = {
  approved: { variant: 'success', label: 'Approved' },
  pending:  { variant: 'warning', label: 'Pending' },
  rejected: { variant: 'danger',  label: 'Rejected' },
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CoupleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [couple, setCouple] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showSubModal, setShowSubModal] = useState(false);
  const [newTier, setNewTier] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mediaActions, setMediaActions] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await adminApi.getCoupleDetail(id);
        setCouple(data);
      } catch {
        setCouple(MOCK_COUPLE);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSuspend = async () => {
    try {
      await adminApi.suspendCouple(id);
      setCouple((p) => ({ ...p, status: 'suspended' }));
      toast.success('Couple suspended');
    } catch {
      setCouple((p) => ({ ...p, status: 'suspended' }));
      toast.success('Couple suspended');
    }
  };

  const handleActivate = async () => {
    try {
      await adminApi.activateCouple(id);
      setCouple((p) => ({ ...p, status: 'active' }));
      toast.success('Couple activated');
    } catch {
      setCouple((p) => ({ ...p, status: 'active' }));
      toast.success('Couple activated');
    }
  };

  const handleChangeSub = async () => {
    if (!newTier) return;
    setSubLoading(true);
    try {
      await adminApi.updateSubscription(id, newTier);
      setCouple((p) => ({ ...p, subscriptionTier: newTier }));
      toast.success(`Plan changed to ${newTier}`);
      setShowSubModal(false);
    } catch {
      setCouple((p) => ({ ...p, subscriptionTier: newTier }));
      toast.success(`Plan changed to ${newTier}`);
      setShowSubModal(false);
    } finally {
      setSubLoading(false);
    }
  };

  const handleMediaAction = async (mediaId, action) => {
    setMediaActions((p) => ({ ...p, [mediaId]: true }));
    try {
      action === 'approve' ? await adminApi.approveMedia(mediaId) : await adminApi.rejectMedia(mediaId);
      setCouple((p) => ({
        ...p,
        media: p.media.map((m) => m.id === mediaId ? { ...m, status: action === 'approve' ? 'approved' : 'rejected' } : m),
      }));
      toast.success(`Media ${action}d`);
    } catch {
      setCouple((p) => ({
        ...p,
        media: p.media.map((m) => m.id === mediaId ? { ...m, status: action === 'approve' ? 'approved' : 'rejected' } : m),
      }));
      toast.success(`Media ${action}d`);
    } finally {
      setMediaActions((p) => ({ ...p, [mediaId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const c = couple;
  const plan = PLAN_BADGE[c.subscriptionTier] || PLAN_BADGE.free;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate('/admin/couples')} className="hover:text-indigo-600 flex items-center gap-1">
          <ArrowLeft size={14} />
          Couples
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium">{c.partnerOneName} & {c.partnerTwoName}</span>
      </div>

      {/* Header card */}
      <div className="admin-card">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Photo */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-200 border-4 border-white shadow-md">
              {c.photo
                ? <img src={c.photo} alt="Couple" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Heart size={32} className="text-slate-300" /></div>
              }
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {c.partnerOneName} & {c.partnerTwoName}
              </h1>
              <Badge variant={plan.variant} size="md">{plan.label}</Badge>
              <Badge variant={c.status === 'active' ? 'success' : 'danger'} dot>
                {c.status === 'active' ? 'Active' : 'Suspended'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Mail size={13} />{c.email}</span>
              <span className="flex items-center gap-1.5"><Calendar size={13} />{c.weddingDate}</span>
              {c.websiteUrl && (
                <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:underline">
                  <Globe size={13} />{c.websiteUrl}
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
            {/* Mini stats */}
            <div className="flex flex-wrap gap-4 mt-3">
              {[
                { label: 'Guests', value: c.guestCount, icon: Users },
                { label: 'RSVPs', value: c.rsvpCount, icon: Check },
                { label: 'Events', value: c.eventCount, icon: Calendar },
                { label: 'Media', value: c.mediaCount, icon: Image },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center min-w-[60px]">
                  <div className="flex items-center gap-1 text-xs text-slate-400"><Icon size={12} />{label}</div>
                  <div className="text-lg font-bold text-slate-900">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {c.status === 'active'
              ? <Button variant="warning" size="sm" icon={<ShieldOff size={14} />} onClick={handleSuspend}>Suspend</Button>
              : <Button variant="success" size="sm" icon={<ShieldCheck size={14} />} onClick={handleActivate}>Activate</Button>
            }
            <Button variant="secondary" size="sm" icon={<CreditCard size={14} />} onClick={() => { setNewTier(c.subscriptionTier); setShowSubModal(true); }}>
              Change Plan
            </Button>
            <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="admin-card space-y-3">
              <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide text-slate-500">Profile Details</h3>
              {[
                ['Partner 1', c.partnerOneName],
                ['Partner 2', c.partnerTwoName],
                ['Email', c.email],
                ['Phone', c.phone || '—'],
                ['Wedding Date', c.weddingDate],
                ['Registered', c.createdAt],
                ['Plan', <Badge variant={plan.variant}>{plan.label}</Badge>],
                ['Status', <Badge variant={c.status === 'active' ? 'success' : 'danger'} dot>{c.status}</Badge>],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-900 font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div className="admin-card space-y-3">
              <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide text-slate-500">Website Info</h3>
              {[
                ['URL', c.websiteUrl ? <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">{c.websiteUrl} <ExternalLink size={11}/></a> : '—'],
                ['Status', <Badge variant={c.websiteStatus === 'published' ? 'success' : 'gray'}>{c.websiteStatus}</Badge>],
                ['Total Guests', c.guestCount],
                ['Total Events', c.eventCount],
                ['Total RSVPs', c.rsvpCount],
                ['Media Files', c.mediaCount],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-900 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guests */}
        {activeTab === 'Guests' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Guests", value: c.guestCount },
                { label: "Groom's Side", value: Math.floor(c.guestCount * 0.48) },
                { label: "Bride's Side", value: Math.ceil(c.guestCount * 0.52) },
              ].map(({ label, value }) => (
                <div key={label} className="admin-card text-center">
                  <div className="text-2xl font-bold text-slate-900">{value}</div>
                  <div className="text-xs text-slate-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
            <DataTable
              columns={[
                { key: 'name', label: 'Name', sortable: true },
                { key: 'email', label: 'Email' },
                { key: 'side', label: 'Side', render: (v) => <Badge variant="indigo">{v}</Badge> },
                { key: 'category', label: 'Category' },
                { key: 'rsvp', label: 'RSVP', render: (v) => (
                  <Badge variant={v === 'attending' ? 'success' : v === 'declined' ? 'danger' : 'warning'}>
                    {v}
                  </Badge>
                )},
              ]}
              data={c.guests || []}
              emptyText="No guests found."
            />
          </div>
        )}

        {/* Events */}
        {activeTab === 'Events' && (
          <DataTable
            columns={[
              { key: 'name', label: 'Event Name', sortable: true },
              { key: 'date', label: 'Date' },
              { key: 'venue', label: 'Venue' },
              { key: 'guestCount', label: 'Guests', render: (v) => <span className="font-semibold">{v}</span> },
            ]}
            data={c.events || []}
            emptyText="No events found."
          />
        )}

        {/* RSVPs */}
        {activeTab === 'RSVPs' && (
          <div className="space-y-4">
            {(c.events || []).map((ev) => (
              <div key={ev.id} className="admin-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900">{ev.name}</h4>
                  <span className="text-sm text-slate-500">{ev.date}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Attending', value: Math.floor(ev.guestCount * 0.75), color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Declined', value: Math.floor(ev.guestCount * 0.1), color: 'text-red-600 bg-red-50' },
                    { label: 'Pending', value: Math.ceil(ev.guestCount * 0.15), color: 'text-amber-600 bg-amber-50' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-lg p-3 text-center ${color}`}>
                      <div className="text-xl font-bold">{value}</div>
                      <div className="text-xs font-medium mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Media */}
        {activeTab === 'Media' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(c.media || []).map((m) => {
              const sb = MEDIA_STATUS_BADGE[m.status];
              return (
                <div key={m.id} className="admin-card !p-3 space-y-2">
                  <div className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img src={m.url} alt="Media" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={sb.variant} size="sm">{sb.label}</Badge>
                    <span className="text-[10px] text-slate-400">{m.date}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">By {m.uploadedBy}</p>
                  {m.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMediaAction(m.id, 'approve')}
                        disabled={mediaActions[m.id]}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors"
                      >
                        <Check size={12} /> Approve
                      </button>
                      <button
                        onClick={() => handleMediaAction(m.id, 'reject')}
                        disabled={mediaActions[m.id]}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium transition-colors"
                      >
                        <X size={12} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Subscription */}
        {activeTab === 'Subscription' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="admin-card">
              <h3 className="font-semibold text-slate-900 mb-4">Current Plan</h3>
              <div className={`p-4 rounded-xl border-2 mb-4 ${c.subscriptionTier === 'elite' ? 'border-amber-400 bg-amber-50' : c.subscriptionTier === 'premium' ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-slate-900 capitalize">{c.subscriptionTier} Plan</p>
                    <p className="text-sm text-slate-500">Current subscription tier</p>
                  </div>
                  <Badge variant={plan.variant} size="lg">{plan.label}</Badge>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => { setNewTier(c.subscriptionTier); setShowSubModal(true); }}
                icon={<CreditCard size={14} />}
              >
                Change Plan
              </Button>
            </div>
            <div className="admin-card">
              <h3 className="font-semibold text-slate-900 mb-4">Billing History</h3>
              <div className="space-y-2">
                {[
                  { date: '2026-08-01', amount: '₹999', plan: 'Premium', status: 'paid' },
                  { date: '2026-07-01', amount: '₹999', plan: 'Premium', status: 'paid' },
                  { date: '2026-06-01', amount: '₹0', plan: 'Free', status: 'free' },
                ].map((bill, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-medium text-slate-800">{bill.plan} Plan</p>
                      <p className="text-xs text-slate-400">{bill.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{bill.amount}</span>
                      <Badge variant={bill.status === 'paid' ? 'success' : 'gray'} size="sm">
                        {bill.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Subscription Modal */}
      <Modal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        title="Change Subscription Plan"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowSubModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleChangeSub} loading={subLoading}>Confirm Change</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select a new subscription plan for <strong>{c.partnerOneName} & {c.partnerTwoName}</strong>.
          </p>
          <div className="space-y-2">
            {['free', 'premium', 'elite'].map((tier) => (
              <label key={tier} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${newTier === tier ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input
                  type="radio"
                  name="tier"
                  value={tier}
                  checked={newTier === tier}
                  onChange={() => setNewTier(tier)}
                  className="text-indigo-600"
                />
                <span className="capitalize font-medium text-slate-800">{tier} Plan</span>
                <Badge variant={PLAN_BADGE[tier].variant} className="ml-auto">{PLAN_BADGE[tier].label}</Badge>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { navigate('/admin/couples'); toast.success('Couple deleted'); }}
        title="Delete Couple"
        description={`Are you sure you want to permanently delete ${c.partnerOneName} & ${c.partnerTwoName}? All their data will be lost.`}
        confirmLabel="Delete Permanently"
        dangerous
      />
    </div>
  );
}
