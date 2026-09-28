import { useEffect, useState, useMemo } from 'react';
import { guestApi, rsvpApi } from '../../services/api';
import { Search, Loader2, Users, Clock, Download } from 'lucide-react';
import { format } from 'date-fns';

const TRAVEL_ICONS = { flight: '✈️', train: '🚆', ship: '🚢', other: '🧳' };
const TRAVEL_MODES = ['flight', 'train', 'ship', 'other'];

const fmtDate = (v) => (v ? format(new Date(v), 'dd MMM yyyy') : '');
const fmtTime = (v) => (v ? format(new Date(v), 'hh:mm a') : '');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

// One column per detail, spreadsheet style. The same list drives the on-screen
// table and the Excel/CSV export so they can never drift apart.
// `value(g, answers)` is the plain cell value; `num` right-aligns/totals.
const buildColumns = (questions) => {
  const leg = (group, p) => [
    { group, label: 'Date', value: (g) => fmtDate(g[p.dt]), pending: p.dt === 'arrival_datetime' },
    { group, label: 'Time', value: (g) => fmtTime(g[p.dt]) },
    { group, label: 'Airport / Station', value: (g) => g[p.place] || '' },
    { group, label: 'Flight / Train No.', value: (g) => g[p.number] || '' },
    { group, label: 'Terminal / Platform', value: (g) => g[p.gate] || '' },
    { group, label: 'Ticket Details', value: (g) => g[p.ticket] || '' },
  ];
  return [
    { group: 'Guest', label: 'Name', value: (g) => `${g.first_name || ''} ${g.last_name || ''}`.trim(), sticky: true, bold: true },
    { group: 'Guest', label: 'Email', value: (g) => g.email || '' },
    { group: 'Guest', label: 'Phone', value: (g) => g.phone || '' },
    { group: 'Travel', label: 'Mode', value: (g) => cap(g.travel_mode), icon: (g) => TRAVEL_ICONS[g.travel_mode] },
    { group: 'Travel', label: 'PAX', value: (g) => g.party_size || 1, num: true, total: true },
    { group: 'Travel', label: 'Party Members', value: (g) => (g.party_member_names || []).join(', ') },
    { group: 'Travel', label: 'Luggage', value: (g) => (g.luggage_count ?? ''), num: true, total: true },
    ...leg('Arrival', { dt: 'arrival_datetime', place: 'arrival_location', number: 'travel_details', gate: 'arrival_terminal', ticket: 'arrival_ticket_details' }),
    ...leg('Departure', { dt: 'departure_datetime', place: 'departure_location', number: 'departure_travel_number', gate: 'departure_terminal', ticket: 'departure_ticket_details' }),
    ...questions.map((q) => ({ group: 'RSVP Answers', label: q.question_text, value: (g, a) => a[q.id] ?? '' })),
  ];
};

const GROUP_STYLE = {
  Guest: 'bg-slate-200 text-slate-800',
  Travel: 'bg-sky-100 text-sky-800',
  Arrival: 'bg-emerald-100 text-emerald-800',
  Departure: 'bg-amber-100 text-amber-800',
  'RSVP Answers': 'bg-violet-100 text-violet-800',
};

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

  const columns = useMemo(() => buildColumns(questions), [questions]);

  // Consecutive columns of the same group share one header cell.
  const groups = useMemo(() => {
    const out = [];
    columns.forEach((c) => {
      const last = out[out.length - 1];
      if (last && last.name === c.group) last.count += 1;
      else out.push({ name: c.group, count: 1 });
    });
    return out;
  }, [columns]);

  const totals = useMemo(() => columns.map((c) => (
    c.total ? filtered.reduce((sum, g) => sum + (Number(c.value(g, answersByGuest[g.id] || {})) || 0), 0) : null
  )), [columns, filtered, answersByGuest]);

  const handleExport = () => {
    const headers = ['#', ...columns.map(c => (c.group === 'Arrival' || c.group === 'Departure' ? `${c.group} ${c.label}` : c.label))];
    const rows = filtered.map((g, i) => {
      const answers = answersByGuest[g.id] || {};
      return [i + 1, ...columns.map(c => c.value(g, answers))];
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

  const cell = 'border border-gray-300 px-3 py-1.5 whitespace-nowrap';
  const head = 'border border-gray-300 px-3 py-2 whitespace-nowrap font-semibold text-gray-700 bg-gray-100';

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

      {/* Filters & spreadsheet */}
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

        <div className="overflow-auto max-h-[70vh]">
          <table className="border-collapse text-sm min-w-full">
            <thead>
              {/* group row */}
              <tr>
                <th rowSpan={2} className={`${head} sticky top-0 left-0 z-30 w-12 min-w-[48px] text-center`}>#</th>
                {groups.map((g) => (
                  <th key={g.name} colSpan={g.count} className={`border border-gray-300 px-3 py-1.5 text-center font-semibold sticky top-0 z-20 h-[33px] ${GROUP_STYLE[g.name] || 'bg-gray-200 text-gray-800'}`}>{g.name}</th>
                ))}
              </tr>
              {/* column row */}
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={`${c.group}-${c.label}-${i}`}
                    className={`${head} sticky top-[33px] z-20 text-left ${c.num ? 'text-center' : ''} ${c.sticky ? 'left-12 z-30 min-w-[160px]' : ''}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="text-center py-10 text-gray-400 border border-gray-200">No guests found</td></tr>
              ) : filtered.map((g, i) => {
                const answers = answersByGuest[g.id] || {};
                return (
                  <tr key={g.id} className="odd:bg-white even:bg-gray-50 hover:bg-primary-50/50">
                    <td className={`${cell} sticky left-0 z-10 bg-gray-100 text-center text-gray-500 font-medium`}>{i + 1}</td>
                    {columns.map((c, ci) => {
                      const v = c.value(g, answers);
                      const empty = v === '' || v === null || v === undefined;
                      return (
                        <td
                          key={ci}
                          className={`${cell} ${c.num ? 'text-center' : ''} ${c.bold ? 'font-medium text-gray-900' : 'text-gray-700'} ${c.sticky ? 'sticky left-12 z-10 bg-white' : ''}`}
                        >
                          {c.pending && empty
                            ? <span className="badge badge-yellow">Pending</span>
                            : <>{!empty && c.icon && c.icon(g) ? `${c.icon(g)} ` : ''}{empty ? '' : String(v)}</>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="font-semibold">
                  <td className={`${cell} sticky bottom-0 left-0 z-20 bg-gray-200`} />
                  {columns.map((c, ci) => (
                    <td key={ci} className={`${cell} sticky bottom-0 z-10 bg-gray-200 text-gray-800 ${c.num ? 'text-center' : ''} ${c.sticky ? 'left-12 z-20' : ''}`}>
                      {ci === 0 ? 'Total' : totals[ci] !== null ? totals[ci] : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
