import { useEffect, useState } from 'react';
import { travelApi } from '../../services/api';
import { Map, Plus, Trash2, Edit2, ExternalLink, Copy, X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const CATEGORIES = ['hotel', 'attraction', 'transport', 'restaurant', 'other'];
const categoryColors = { hotel: 'badge-blue', attraction: 'badge-green', transport: 'badge-yellow', restaurant: 'badge-pink', other: 'badge-gray' };

function TravelForm({ item, onClose, onSaved }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: item || { category: 'hotel' },
  });
  useEffect(() => { if (item) reset(item); }, [item]);
  const onSubmit = async (data) => {
    try {
      if (item?.id) await travelApi.update(item.id, data);
      else await travelApi.create(data);
      toast.success('Travel info saved!');
      onSaved();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{item ? 'Edit' : 'Add'} Travel Info</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Category</label>
            <select {...register('category')} className="input-field">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Title *</label>
            <input {...register('title', { required: true })} placeholder="Hotel Name, Attraction..." className="input-field" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} rows={3} className="input-field resize-none" />
          </div>
          <div>
            <label className="label">Booking/Info Link</label>
            <input {...register('booking_link')} type="url" placeholder="https://booking.com/..." className="input-field" />
          </div>
          <div>
            <label className="label">Google Maps Link</label>
            <input {...register('maps_link')} type="url" placeholder="https://maps.google.com/..." className="input-field" />
          </div>
          <div>
            <label className="label">Discount Code</label>
            <input {...register('discount_code')} placeholder="WEDDING2024" className="input-field" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TravelPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try { const r = await travelApi.getAll(); setItems(r.data.data || []); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this?')) return;
    try { await travelApi.remove(id); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Travel & Hotels</h1>
          <p className="text-sm text-gray-500">{items.length} listings</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
          <Plus className="w-4 h-4" /> Add Info
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No travel info yet. Add hotels, attractions, and transport options for your guests!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 capitalize">{cat}s</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catItems.map(item => (
                <div key={item.id} className="card p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className={`badge text-xs ${categoryColors[item.category] || 'badge-gray'}`}>{item.category}</span>
                      <h3 className="font-semibold text-gray-900 mt-1.5">{item.title}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditItem(item); setShowForm(true); }} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(item.id)} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {item.description && <p className="text-sm text-gray-500 mb-3 leading-relaxed">{item.description}</p>}
                  {item.discount_code && (
                    <div className="flex items-center gap-2 bg-gold-50 border border-gold-200 rounded-xl px-3 py-2 mb-3">
                      <span className="text-xs text-gold-700 font-medium">Discount Code:</span>
                      <span className="font-mono font-bold text-gold-700 text-sm">{item.discount_code}</span>
                      <button onClick={() => { navigator.clipboard.writeText(item.discount_code); toast.success('Copied!'); }} className="ml-auto text-gold-500 hover:text-gold-700"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  <div className="flex gap-3">
                    {item.booking_link && <a href={item.booking_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Book Now</a>}
                    {item.maps_link && <a href={item.maps_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1"><Map className="w-3 h-3" /> View Map</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showForm && <TravelForm item={editItem} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetch(); }} />}
    </div>
  );
}

