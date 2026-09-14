import { useEffect, useState } from 'react';
import { notificationApi, eventApi } from '../../services/api';
import { Bell, Send, Trash2, Loader2, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TYPE_ICONS = { email: Mail, sms: MessageSquare, push: Smartphone, in_app: Bell };
const TYPE_COLORS = { email: 'badge-blue', sms: 'badge-green', push: 'badge-yellow', in_app: 'badge-gray' };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm({
    defaultValues: { notification_type: 'email', target_type: 'all' },
  });
  const targetType = watch('target_type');

  const fetch = async () => {
    try {
      const [n, e] = await Promise.all([notificationApi.getAll(), eventApi.getAll()]);
      setNotifications(n.data.data || []);
      setEvents(e.data.data || []);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const onSubmit = async (data) => {
    try {
      const res = await notificationApi.create(data);
      const id = res.data.data?.id;
      if (id) {
        await notificationApi.send(id);
        toast.success('Notification sent!');
      }
      reset();
      fetch();
    } catch { toast.error('Failed to send notification'); }
  };

  const handleDelete = async (id) => {
    try { await notificationApi.remove(id); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-serif font-bold text-gray-900">Notifications</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Send Form */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Bell className="w-4 h-4" /> Send Notification</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input {...register('title', { required: true })} placeholder="Important Update!" className="input-field" />
            </div>
            <div>
              <label className="label">Message *</label>
              <textarea {...register('message', { required: true })} rows={4} placeholder="Type your message to guests..." className="input-field resize-none" />
            </div>
            <div>
              <label className="label">Notification Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['email', 'sms', 'push', 'in_app'].map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer border border-gray-200 rounded-xl p-3 hover:border-primary-300 transition-colors has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
                    <input {...register('notification_type')} type="radio" value={t} className="text-primary-500" />
                    <span className="text-sm capitalize">{t.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Target</label>
              <select {...register('target_type')} className="input-field">
                <option value="all">All Guests</option>
                <option value="specific_event">Specific Event</option>
              </select>
            </div>
            {targetType === 'specific_event' && (
              <div>
                <label className="label">Event</label>
                <select {...register('target_event_id')} className="input-field">
                  <option value="">Select Event</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
            )}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Now
            </button>
          </form>
        </div>

        {/* History */}
        <div className="lg:col-span-3 card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Notification History</h2>
          </div>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
            : notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No notifications sent yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(n => {
                  const Icon = TYPE_ICONS[n.notification_type] || Bell;
                  return (
                    <div key={n.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`badge text-xs ${TYPE_COLORS[n.notification_type] || 'badge-gray'}`}>{n.notification_type}</span>
                            <span className={`badge text-xs ${n.status === 'sent' ? 'badge-green' : n.status === 'failed' ? 'badge-red' : 'badge-gray'}`}>{n.status}</span>
                            {n.sent_at && <span className="text-xs text-gray-400">{format(new Date(n.sent_at), 'PP p')}</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(n.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

