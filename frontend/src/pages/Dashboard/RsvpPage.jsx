import { useEffect, useState } from 'react';
import { rsvpApi, eventApi, guestApi } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle, XCircle, Clock, Plus, Trash2, Send, X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TABS = ['Responses', 'Questions', 'Send Invites'];
const QUESTION_TYPE_LABELS = {
  text: 'Text Box',
  select: 'Select Box',
  radio: 'Radio Box',
  checkbox: 'Checkbox',
  number: 'Number Box',
};

function QuestionForm({ question, events, onClose, onSaved }) {
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: question || { question_type: 'text', is_required: false },
  });
  useEffect(() => { if (question) reset(question); }, [question]);
  const qtype = watch('question_type');

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, options: data.options_raw ? data.options_raw.split('\n').map(o => o.trim()).filter(Boolean) : [] };
      if (question?.id) await rsvpApi.updateQuestion(question.id, payload);
      else await rsvpApi.createQuestion(payload);
      toast.success('Question saved!');
      onSaved();
    } catch { toast.error('Failed to save'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{question ? 'Edit Question' : 'Add RSVP Question'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Question Text *</label>
            <input {...register('question_text', { required: true })} placeholder="What is your meal preference?" className="input-field" />
          </div>
          <div>
            <label className="label">Question Type</label>
            <select {...register('question_type')} className="input-field">
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {['select','radio','checkbox'].includes(qtype) && (
            <div>
              <label className="label">Options (one per line)</label>
              <textarea {...register('options_raw')} rows={4} placeholder="Vegetarian&#10;Non-Vegetarian&#10;Vegan" className="input-field resize-none" />
            </div>
          )}
          <div>
            <label className="label">Apply to Event (optional)</label>
            <select {...register('event_id')} className="input-field">
              <option value="">All Events</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input {...register('is_required')} type="checkbox" id="required" className="w-4 h-4" />
            <label htmlFor="required" className="text-sm text-gray-700">Required</label>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 btn-primary">Save Question</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RsvpPage() {
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState([]);
  const [responses, setResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [events, setEvents] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQForm, setShowQForm] = useState(false);
  const [editQ, setEditQ] = useState(null);
  const [filterEvent, setFilterEvent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [inviteMethod, setInviteMethod] = useState('email');
  const [inviteEventId, setInviteEventId] = useState('');

  useEffect(() => {
    Promise.all([rsvpApi.getStats(), rsvpApi.getResponses(), rsvpApi.getQuestions(), eventApi.getAll(), guestApi.getAll({ limit: 500 })])
      .then(([s, r, q, e, g]) => {
        setStats(s.data.data || []);
        setResponses(r.data.data || []);
        setQuestions(q.data.data || []);
        setEvents(e.data.data || []);
        setGuests(g.data.data || []);
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const refreshQuestions = async () => { const r = await rsvpApi.getQuestions(); setQuestions(r.data.data || []); };
  const deleteQuestion = async (id) => {
    if (!confirm('Delete this question?')) return;
    try { await rsvpApi.deleteQuestion(id); toast.success('Deleted'); refreshQuestions(); }
    catch { toast.error('Failed'); }
  };

  const sendInvites = async () => {
    if (selectedGuests.length === 0) { toast.error('Select at least one guest'); return; }
    setSendingInvites(true);
    try {
      await rsvpApi.sendInvites({ guestIds: selectedGuests, method: inviteMethod, eventId: inviteEventId || undefined });
      toast.success(`Invitations sent to ${selectedGuests.length} guests!`);
      setSelectedGuests([]);
    } catch { toast.error('Failed to send invitations'); } finally { setSendingInvites(false); }
  };

  const chartData = stats.map(s => ({ name: s.eventTitle?.substring(0, 12) || 'Event', attending: s.attending || 0, maybe: s.maybe || 0, declined: s.declined || 0, pending: s.pending || 0 }));
  const filteredResponses = responses.filter(r => (!filterEvent || r.event_id === filterEvent) && (!filterStatus || r.attending === filterStatus));

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-serif font-bold text-gray-900">RSVP Management</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${tab === i ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {/* Responses Tab */}
      {tab === 0 && (
        <div className="space-y-6">
          {/* Stats per event */}
          {stats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.map(s => (
                <div key={s.eventId} className="card p-4">
                  <p className="font-medium text-gray-800 text-sm mb-3">{s.eventTitle} <span className="text-gray-400 font-normal">({s.total} invited)</span></p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><p className="text-xl font-bold text-green-600">{s.attending || 0}</p><p className="text-xs text-gray-400">Going</p></div>
                    <div><p className="text-xl font-bold text-yellow-500">{s.maybe || 0}</p><p className="text-xs text-gray-400">Maybe</p></div>
                    <div><p className="text-xl font-bold text-red-500">{s.declined || 0}</p><p className="text-xs text-gray-400">Declined</p></div>
                    <div><p className="text-xl font-bold text-gray-400">{s.pending || 0}</p><p className="text-xs text-gray-400">Pending</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-800 mb-4">RSVP Overview</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="attending" fill="#22c55e" name="Attending" radius={[4,4,0,0]} />
                  <Bar dataKey="maybe" fill="#eab308" name="Maybe" radius={[4,4,0,0]} />
                  <Bar dataKey="declined" fill="#f43f5e" name="Declined" radius={[4,4,0,0]} />
                  <Bar dataKey="pending" fill="#d1d5db" name="Pending" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Filters & Table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex gap-3">
              <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} className="input-field flex-1">
                <option value="">All Events</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-36">
                <option value="">All Status</option>
                <option value="yes">Attending</option>
                <option value="no">Declined</option>
                <option value="maybe">Maybe</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Guest</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Event</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Meal</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Song Request</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredResponses.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">No responses yet</td></tr>
                  ) : filteredResponses.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.guest?.first_name} {r.guest?.last_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.event?.title}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${r.attending === 'yes' ? 'badge-green' : r.attending === 'no' ? 'badge-red' : 'badge-yellow'}`}>{r.attending}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{r.meal_choice || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{r.song_request || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">{r.submitted_at ? format(new Date(r.submitted_at), 'PP') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Questions Tab */}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditQ(null); setShowQForm(true); }} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>
          {questions.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <p>No custom RSVP questions yet. Add meal choices, song requests, and more!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map(q => (
                <div key={q.id} className="card p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-800">{q.question_text}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="badge badge-gray text-xs">{QUESTION_TYPE_LABELS[q.question_type] || q.question_type}</span>
                      {q.is_required && <span className="badge badge-red text-xs">Required</span>}
                      {q.event_id && <span className="badge badge-blue text-xs">{events.find(e => e.id === q.event_id)?.title || 'Specific Event'}</span>}
                    </div>
                    {q.options?.length > 0 && <p className="text-xs text-gray-400 mt-1">Options: {q.options.join(', ')}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditQ(q); setShowQForm(true); }} className="text-gray-400 hover:text-blue-500"><Plus className="w-4 h-4" /></button>
                    <button onClick={() => deleteQuestion(q.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Send Invites Tab */}
      {tab === 2 && (
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Send Invitations</h3>
            <div className="flex gap-4 mb-4">
              {['email', 'sms'].map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={m} checked={inviteMethod === m} onChange={() => setInviteMethod(m)} />
                  <span className="text-sm font-medium capitalize">{m === 'email' ? '📧 Email' : '📱 SMS'}</span>
                </label>
              ))}
            </div>
            <div className="mb-4">
              <label className="label">Invite to Event</label>
              <select
                value={inviteEventId}
                onChange={e => setInviteEventId(e.target.value)}
                className="input-field"
              >
                <option value="">All Events (generic invitation)</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
              {inviteEventId && (
                <p className="text-xs text-gray-400 mt-1">
                  Selected guests will be given access to this event and invited specifically to it.
                </p>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">Select guests to send {inviteMethod} invitations with their personal RSVP link:</p>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl divide-y">
              {guests.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400">No guests yet.</p>
              ) : guests.map(g => (
                <label key={g.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selectedGuests.includes(g.id)} onChange={e => setSelectedGuests(e.target.checked ? [...selectedGuests, g.id] : selectedGuests.filter(id => id !== g.id))} />
                  <span className="text-sm">{g.first_name} {g.last_name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{inviteMethod === 'email' ? g.email || 'No email' : g.phone || 'No phone'}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">{selectedGuests.length} guest{selectedGuests.length !== 1 ? 's' : ''} selected</p>
              <button onClick={sendInvites} disabled={sendingInvites || selectedGuests.length === 0} className="btn-primary flex items-center gap-2 py-2 px-5 text-sm">
                {sendingInvites ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Invitations
              </button>
            </div>
          </div>
        </div>
      )}

      {showQForm && <QuestionForm question={editQ} events={events} onClose={() => setShowQForm(false)} onSaved={() => { setShowQForm(false); refreshQuestions(); }} />}
    </div>
  );
}

