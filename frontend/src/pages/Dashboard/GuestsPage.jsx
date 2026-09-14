import { useEffect, useState, useCallback } from 'react';
import { guestApi, eventApi } from '../../services/api';
import { Users, Plus, Upload, Download, Search, Filter, Trash2, Edit2, X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

const SIDES = ['bride', 'groom', 'mutual'];
const CATEGORIES = ['vip', 'family', 'friend', 'colleague', 'other'];

function GuestFormModal({ guest, onClose, onSaved }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: guest || { side: 'mutual', category: 'friend', plus_one_allowed: false },
  });

  useEffect(() => { if (guest) reset(guest); }, [guest]);

  const onSubmit = async (data) => {
    try {
      if (guest?.id) await guestApi.update(guest.id, data);
      else await guestApi.create(data);
      toast.success(guest ? 'Guest updated!' : 'Guest added!');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save guest');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{guest ? 'Edit Guest' : 'Add Guest'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input {...register('first_name', { required: true })} className="input-field" />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input {...register('last_name', { required: true })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input-field" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...register('phone')} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Side</label>
              <select {...register('side')} className="input-field">
                {SIDES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select {...register('category')} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Dietary Restrictions</label>
            <input {...register('dietary_restrictions')} placeholder="Vegetarian, Vegan, Gluten-free..." className="input-field" />
          </div>
          <div className="flex items-center gap-2">
            <input {...register('plus_one_allowed')} type="checkbox" id="plus_one" className="w-4 h-4 text-primary-500" />
            <label htmlFor="plus_one" className="text-sm text-gray-700">Allow Plus One</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {guest ? 'Update' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    onDrop: (files) => setFile(files[0]),
  });

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await guestApi.importCSV(fd);
      setResult(res.data.data);
      toast.success(`Imported ${res.data.data.created} guests!`);
      onImported();
    } catch (err) {
      toast.error('Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Import Guests from CSV</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">CSV should have columns: first_name, last_name, email, phone, side, category</p>
          {!result ? (
            <>
              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                {file ? <p className="text-sm font-medium text-gray-700">{file.name}</p> : <p className="text-sm text-gray-500">Drop CSV file here or click to browse</p>}
              </div>
              <button onClick={handleImport} disabled={!file || loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : 'Import Guests'}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-green-600">{result.created}</p><p className="text-xs text-green-600">Created</p></div>
                <div className="bg-yellow-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-yellow-600">{result.duplicates}</p><p className="text-xs text-yellow-600">Duplicates</p></div>
                <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-red-600">{result.errors?.length || 0}</p><p className="text-xs text-red-600">Errors</p></div>
              </div>
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuestsPage() {
  const [guests, setGuests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editGuest, setEditGuest] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState([]);
  const limit = 20;

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await guestApi.getAll({ search, side: sideFilter, category: categoryFilter, page, limit });
      setGuests(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [search, sideFilter, categoryFilter, page]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this guest?')) return;
    try {
      await guestApi.remove(id);
      toast.success('Guest deleted');
      fetchGuests();
    } catch { toast.error('Failed to delete'); }
  };

  const handleExport = async () => {
    try {
      const res = await guestApi.exportCSV();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'guests.csv'; a.click();
    } catch { toast.error('Export failed'); }
  };

  const sideBadge = (s) => ({ bride: 'badge-pink', groom: 'badge-blue', mutual: 'badge-gray' }[s] || 'badge-gray');
  const rsvpBadge = (s) => ({ yes: 'badge-green', no: 'badge-red', maybe: 'badge-yellow' }[s] || 'badge-gray');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Guest List</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total guests</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setEditGuest(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
            <Plus className="w-4 h-4" /> Add Guest
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email..." className="input-field pl-9" />
          </div>
          <select value={sideFilter} onChange={e => { setSideFilter(e.target.value); setPage(1); }} className="input-field md:w-36">
            <option value="">All Sides</option>
            {SIDES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} className="input-field md:w-40">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-8">
                  <input type="checkbox" onChange={e => setSelected(e.target.checked ? guests.map(g => g.id) : [])} className="w-4 h-4" />
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Side</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">RSVP</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-400 mx-auto" /></td></tr>
              ) : guests.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No guests found. Add your first guest!</p>
                </td></tr>
              ) : guests.map(g => (
                <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.includes(g.id)} onChange={e => setSelected(e.target.checked ? [...selected, g.id] : selected.filter(id => id !== g.id))} className="w-4 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{g.first_name} {g.last_name}</p>
                    {g.plus_one_allowed && <p className="text-xs text-gray-400">+1 allowed{g.plus_one_name ? `: ${g.plus_one_name}` : ''}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{g.email || '—'}</td>
                  <td className="px-4 py-3"><span className={`badge ${sideBadge(g.side)}`}>{g.side}</span></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><span className="badge badge-gray">{g.category}</span></td>
                  <td className="px-4 py-3">
                    {g.RsvpSubmissions?.length > 0
                      ? <span className={`badge ${rsvpBadge(g.RsvpSubmissions[0]?.attending)}`}>{g.RsvpSubmissions[0]?.attending}</span>
                      : <span className="badge badge-gray">Pending</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditGuest(g); setShowForm(true); }} className="text-gray-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(g.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50">Previous</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total} className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {showForm && <GuestFormModal guest={editGuest} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchGuests(); }} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={fetchGuests} />}
    </div>
  );
}

