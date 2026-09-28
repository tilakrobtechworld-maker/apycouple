import { useEffect, useState, useMemo } from 'react';
import { guestApi, rsvpApi } from '../../services/api';
import { Search, Loader2, Users, Clock, Download } from 'lucide-react';
import { format } from 'date-fns';

const TRAVEL_ICONS = { flight: '✈️', train: '🚆', ship: '🚢', other: '🧳' };
const TRAVEL_MODES = ['flight', 'train', 'ship', 'other'];

function TravelLegDetails({ place, number, gate, ticket }) {
  const parts = [
    place,
    number && `No. ${number}`,
    gate && `Gate/Terminal ${gate}`,
    ticket && `Ticket: ${ticket}`,
  ].filter(Boolean);
  if (parts.length === 0) return '—';
  return <div className="space-y-0.5">{parts.map((p, i) => <p key={i}>{p}</p>)}</div>;
}

export default function LogisticsPage() {
  const [guests, setGuests] = useState([]);
  const [responses, setResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  useEffect(() => {
    Promise.all([
      guestApi.getAll({ limit: 500 }),
      rsvpApi.getResponses({ limit: 500 }),
      rsvpApi.getQuestions(),
    ])
      .then(([g, r, q]) => {
        setGuests(g.data.data || []);
        setResponses(r.data.data || []);
        setQuestions(q.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const questionText = useMemo(() => {
    const m = {};
    questions.forEach(q => { m[q.id] = q.question_text; });
    return m;
  }, [questions]);

  // RSVP answers live on the per-event submission (custom_answers), but a
  // guest only fills them out once - merge across their submissions so the
  // Logistics view can show one row per guest, same as arrival/travel info.
  const answersByGuest = useMemo(() => {
    const m = {};
    responses.forEach(r => {
      if (!r.custom_answers) return;
      const bucket = (m[r.guest_id] ||= {});
      Object.entries(r.custom_answers).forEach(([qId, val]) => {
        if (val !== undefined && val !== null && val !== '') bucket[qId] = val;
      });
    });
    return m;
  }, [responses]);

  const filtered = useMemo(() => {
    return guests
      .filter(g => !modeFilter || g.travel_mode === modeFilter)
      .filter(g => !search || `${g.first_name} ${g.last_name || ''}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (!a.arrival_datetime && !b.arrival_datetime) return 0;
        if (!a.arrival_datetime) return 1;
        if (!b.arrival_datetime) return -1;
        return new Date(a.arrival_datetime) - new Date(b.arrival_datetime);
      });
  }, [guests, search, modeFilter]);

  const stats = useMemo(() => {
    const withArrival = guests.filter(g => g.arrival_datetime);
    const totalHeadcount = guests.reduce((sum, g) => sum + (g.party_size || 1), 0);
    const modeBreakdown = TRAVEL_MODES.reduce((acc, m) => {
      acc[m] = guests.filter(g => g.travel_mode === m).length;
      return acc;
    }, {});
    return { withArrival: withArrival.length, totalHeadcount, modeBreakdown };
  }, [guests]);

  const handleExport = () => {
    const headers = [
      'First Name', 'Last Name', 'Email', 'Phone',
      'Travel Mode', 'Party Size (PAX)', 'Party Member Names', 'Luggage Count',
      'Arrival Date & Time', 'Arrival Airport/Station', 'Arrival Flight/Train No.', 'Arrival Terminal/Platform', 'Arrival Ticket Details',
      'Departure Date & Time', 'Departure Airport/Station', 'Departure Flight/Train No.', 'Departure Terminal/Platform', 'Departure Ticket Details',
      ...questions.map(q => q.question_text),
    ];
    const fmt = (d) => (d ? format(new Date(d), 'yyyy-MM-dd HH:mm') : '');
    const rows = filtered.map(g => {
      const answers = answersByGuest[g.id] || {};
      return [
        g.first_name || '',
        g.last_name || '',
        g.email || '',
        g.phone || '',
        g.travel_mode || '',
        g.party_size || 1,
        (g.party_member_names || []).join(', '),
        g.luggage_count ?? '',
        fmt(g.arrival_datetime),
        g.arrival_location || '',
        g.travel_details || '',
        g.arrival_terminal || '',
        g.arrival_ticket_details || '',
        fmt(g.departure_datetime),
        g.departure_location || '',
        g.departure_travel_number || '',
        g.departure_terminal || '',
        g.departure_ticket_details || '',
        ...questions.map(q => answers[q.id] ?? ''),
      ];
    });
    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest-logistics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Logistics</h1>
          <p className="text-sm text-gray-500 mt-1">Arrival, travel, and headcount details guests shared through their RSVP.</p>
        </div>
        <button onClick={handleExport} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm flex-shrink-0">
          <Download className="w-4 h-4" /> Export to Excel
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-primary-500" /></div>
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.withArrival} / {guests.length}</p>
            <p className="text-xs text-gray-400">Guests with arrival info</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-primary-500" /></div>
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.totalHeadcount}</p>
            <p className="text-xs text-gray-400">Total expected headcount</p>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-2">By travel mode</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {TRAVEL_MODES.filter(m => stats.modeBreakdown[m] > 0).map(m => (
              <span key={m} className="text-xs text-gray-600">{TRAVEL_ICONS[m]} {m} ({stats.modeBreakdown[m]})</span>
            ))}
            {Object.values(stats.modeBreakdown).every(c => c === 0) && <span className="text-xs text-gray-400">No travel info yet</span>}
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guest..." className="input-field pl-9" />
          </div>
          <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="input-field sm:w-48">
            <option value="">All travel modes</option>
            {TRAVEL_MODES.map(m => <option key={m} value={m}>{TRAVEL_ICONS[m]} {m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Guest</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Arrival</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Travel</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Departure</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Arrival Details</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Departure Details</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">PAX / Luggage</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">RSVP Answers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No guests found</td></tr>
              ) : filtered.map(g => {
                const answers = answersByGuest[g.id] || {};
                const answerEntries = Object.entries(answers);
                return (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{g.first_name} {g.last_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{g.email || g.phone || '—'}</td>
                    <td className="px-4 py-3">
                      {g.arrival_datetime ? (
                        <span className="text-gray-700">{format(new Date(g.arrival_datetime), 'PPp')}</span>
                      ) : (
                        <span className="badge badge-yellow">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{g.travel_mode ? `${TRAVEL_ICONS[g.travel_mode] || ''} ${g.travel_mode}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {g.departure_datetime ? format(new Date(g.departure_datetime), 'PPp') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                      <TravelLegDetails place={g.arrival_location} number={g.travel_details} gate={g.arrival_terminal} ticket={g.arrival_ticket_details} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                      <TravelLegDetails place={g.departure_location} number={g.departure_travel_number} gate={g.departure_terminal} ticket={g.departure_ticket_details} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {g.party_size || 1} pax{g.luggage_count != null && <span className="text-gray-400"> · {g.luggage_count} bags</span>}
                      {g.party_member_names?.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{g.party_member_names.join(', ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {answerEntries.length === 0 ? '—' : (
                        <div className="space-y-0.5">
                          {answerEntries.map(([qId, val]) => (
                            <p key={qId} className="text-xs"><span className="text-gray-400">{questionText[qId] || 'Question'}:</span> {String(val)}</p>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
