import { useEffect, useState } from 'react';
import { guestbookApi } from '../../services/api';
import { BookOpen, Check, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const TABS = ['Approved', 'Pending'];

export default function GuestbookPage() {
  const [tab, setTab] = useState(0);
  const [approved, setApproved] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([guestbookApi.getAll(), guestbookApi.getPending()]);
      setApproved(a.data.data || []);
      setPending(p.data.data || []);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const approve = async (id) => {
    try { await guestbookApi.approve(id); toast.success('Approved!'); fetch(); }
    catch { toast.error('Failed'); }
  };
  const remove = async (id) => {
    if (!confirm('Delete this entry?')) return;
    try { await guestbookApi.remove(id); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const entries = tab === 0 ? approved : pending;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Guestbook</h1>
          <p className="text-sm text-gray-500">{approved.length} messages • {pending.length} pending</p>
        </div>
        {pending.length > 0 && <span className="badge badge-yellow">{pending.length} pending</span>}
      </div>

      <div className="flex border-b border-gray-200">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === i ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}{i === 1 && pending.length > 0 && <span className="ml-1.5 badge badge-red text-xs">{pending.length}</span>}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {tab === 0 ? 'approved' : 'pending'} guestbook entries</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map(e => (
            <div key={e.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm">
                      {e.author_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{e.author_name}</p>
                      <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                  {e.message_text && <p className="text-gray-600 text-sm leading-relaxed">"{e.message_text}"</p>}
                  {e.media_url && <audio src={e.media_url} controls className="mt-2 w-full h-8" />}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {tab === 1 && <button onClick={() => approve(e.id)} className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-500 hover:bg-green-100"><Check className="w-4 h-4" /></button>}
                  <button onClick={() => remove(e.id)} className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

