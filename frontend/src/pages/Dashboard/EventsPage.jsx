import { useEffect, useState } from 'react';
import { eventApi, guestApi } from '../../services/api';
import { Plus, MapPin, Clock, Users, X, Loader2, Calendar, Trash2, Edit2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EVENT_TYPES = ['ceremony','reception','sangeet','haldi','mehendi','rehearsal','engagement','other'];

function EventForm({ event, onClose, onSaved }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: event || { event_type: 'ceremony', is_public: true },
  });
  useEffect(() => { if (event) reset(event); }, [event]);

  const onSubmit = async (data) => {
    try {
      if (event?.id) await eventApi.update(event.id, data);
      else await eventApi.create(data);
      toast.success(event ? 'Event updated!' : 'Event created!');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save event'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{event ? 'Edit Event' : 'Add Event'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Event Title *</label>
            <input {...register('title', { required: true })} placeholder="Wedding Ceremony" className="input-field" />
          </div>
          <div>
            <label className="label">Event Type</label>
            <select {...register('event_type')} className="input-field">
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Venue Name *</label>
            <input {...register('venue_name', { required: true })} placeholder="The Grand Ballroom" className="input-field" />
          </div>
          <div>
            <label className="label">Address</label>
            <input {...register('address')} placeholder="123 Wedding Lane, Mumbai" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date & Time *</label>
              <input {...register('start_time', { required: true })} type="datetime-local" className="input-field" />
            </div>
            <div>
              <label className="label">End Date & Time</label>
              <input {...register('end_time')} type="datetime-local" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Dress Code</label>
            <input {...register('dress_code')} placeholder="Black Tie, Smart Casual..." className="input-field" />
          </div>
          <div>
            <label className="label">Additional Notes</label>
            <textarea {...register('notes')} rows={3} className="input-field resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input {...register('is_public')} type="checkbox" id="is_public" className="w-4 h-4" />
            <label htmlFor="is_public" className="text-sm text-gray-700">Show on public website</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {event ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const typeColors = { ceremony:'bg-primary-100 text-primary-700', reception:'bg-purple-100 text-purple-700', sangeet:'bg-orange-100 text-orange-700', haldi:'bg-yellow-100 text-yellow-700', mehendi:'bg-green-100 text-green-700', rehearsal:'bg-blue-100 text-blue-700', engagement:'bg-pink-100 text-pink-700', other:'bg-gray-100 text-gray-700' };

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [eventGuests, setEventGuests] = useState({});

  const fetchEvents = async () => {
    setLoading(true);
    try { const res = await eventApi.getAll(); setEvents(res.data.data || []); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    try { await eventApi.remove(id); toast.success('Event deleted'); fetchEvents(); }
    catch { toast.error('Failed'); }
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!eventGuests[id]) {
      try {
        const res = await eventApi.getEventGuests(id);
        setEventGuests(prev => ({ ...prev, [id]: res.data.data || [] }));
      } catch {}
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-1">{events.length} event{events.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditEvent(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
      ) : events.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No events yet</p>
          <p className="text-sm mt-1">Add your first wedding event to get started</p>
          <button onClick={() => { setEditEvent(null); setShowForm(true); }} className="btn-primary mt-4 text-sm">
            Add First Event
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(e => (
            <div key={e.id} className="card overflow-hidden">
              <div className="p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-lg">{e.title}</h3>
                    <span className={`badge text-xs ${typeColors[e.event_type] || typeColors.other}`}>{e.event_type}</span>
                    {!e.is_public && <span className="badge badge-gray text-xs">Private</span>}
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-gray-500">
                    {e.venue_name && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{e.venue_name}{e.address ? ` — ${e.address}` : ''}</div>}
                    {e.start_time && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{format(new Date(e.start_time), 'PPp')}{e.end_time ? ` → ${format(new Date(e.end_time), 'p')}` : ''}</div>}
                    {e.dress_code && <p className="text-xs text-gray-400">Dress Code: {e.dress_code}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleExpand(e.id)} className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition-colors">
                    <Users className="w-3.5 h-3.5" /> Guests
                  </button>
                  <button onClick={() => { setEditEvent(e); setShowForm(true); }} className="text-gray-400 hover:text-blue-500 transition-colors p-1.5"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(e.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1.5"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {expandedId === e.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-3">Assigned Guests ({eventGuests[e.id]?.length || 0})</p>
                  {!eventGuests[e.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : eventGuests[e.id].length === 0 ? (
                    <p className="text-sm text-gray-400">No guests assigned to this event yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {eventGuests[e.id].map(g => (
                        <span key={g.id} className="badge badge-gray text-xs">{g.first_name} {g.last_name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && <EventForm event={editEvent} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchEvents(); }} />}
    </div>
  );
}

