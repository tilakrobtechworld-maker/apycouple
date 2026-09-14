import { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { Bell, Send, Trash2, Loader2, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TYPE_COLORS = { email: 'bg-blue-100 text-blue-700', sms: 'bg-green-100 text-green-700', push: 'bg-yellow-100 text-yellow-700', in_app: 'bg-gray-100 text-gray-700' };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: { notification_type: 'email', target: 'all' } });

  const fetch = async () => {
    try { const r = await adminApi.getNotifications(); setNotifications(r.data.data || []); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const onSubmit = async (data) => {
    if (!confirm(`Send ${data.notification_type} to ${data.target === 'all' ? 'ALL couples' : `${data.target} plan users`}?`)) return;
    try {
      await adminApi.broadcastNotification(data);
      toast.success('Notification broadcast sent!');
      reset();
      fetch();
    } catch { toast.error('Failed to send'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Platform Notifications</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Send Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Bell className="w-4 h-4" /> Broadcast Notification</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input {...register('title', { required: true })} placeholder="Platform announcement..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
              <textarea {...register('message', { required: true })} rows={4} placeholder="Your message to couples..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['email', 'sms', 'push', 'in_app'].map(t => (
                  <label key={t} className="flex items-center gap-2 border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 transition-colors">
                    <input {...register('notification_type')} type="radio" value={t} />
                    <span className="text-sm capitalize">{t.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
              <select {...register('target')} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="all">All Couples</option>
                <option value="free">Free Plan Only</option>
                <option value="premium">Premium Plan Only</option>
                <option value="elite">Elite Plan Only</option>
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Broadcast
            </button>
          </form>
        </div>

        {/* History */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Notification History</h2>
          </div>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
            : notifications.length === 0
            ? <div className="text-center py-12 text-gray-400"><Bell className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No broadcasts sent yet</p></div>
            : <div className="divide-y divide-gray-50">
              {notifications.map(n => (
                <div key={n.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[n.notification_type]}`}>{n.notification_type}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${n.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{n.status}</span>
                        {n.sent_at && <span className="text-xs text-gray-400">{format(new Date(n.sent_at), 'PP')}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </div>
  );
}

