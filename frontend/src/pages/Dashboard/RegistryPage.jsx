import { useEffect, useState } from 'react';
import { registryApi } from '../../services/api';
import { Gift, Plus, Trash2, Edit2, ExternalLink, Check, X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const ITEM_TYPES = ['product', 'cash_fund', 'honeymoon_fund'];

function RegistryForm({ item, onClose, onSaved }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: item || { item_type: 'product', is_purchased: false },
  });
  useEffect(() => { if (item) reset(item); }, [item]);

  const onSubmit = async (data) => {
    try {
      if (item?.id) await registryApi.update(item.id, data);
      else await registryApi.create(data);
      toast.success('Registry item saved!');
      onSaved();
    } catch { toast.error('Failed to save'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{item ? 'Edit Item' : 'Add Registry Item'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Type</label>
            <select {...register('item_type')} className="input-field">
              {ITEM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Store Name *</label>
            <input {...register('store_name', { required: true })} placeholder="Amazon, Zola, Target..." className="input-field" />
          </div>
          <div>
            <label className="label">Store URL</label>
            <input {...register('store_url')} type="url" placeholder="https://..." className="input-field" />
          </div>
          <div>
            <label className="label">Item Name *</label>
            <input {...register('item_name', { required: true })} placeholder="Dinner Set, Honeymoon Fund..." className="input-field" />
          </div>
          <div>
            <label className="label">Item URL</label>
            <input {...register('item_url')} type="url" className="input-field" />
          </div>
          <div>
            <label className="label">Price</label>
            <input {...register('price')} type="number" step="0.01" placeholder="0.00" className="input-field" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} rows={2} className="input-field resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary">Save Item</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const typeColors = { product: 'badge-blue', cash_fund: 'badge-green', honeymoon_fund: 'badge-pink' };

export default function RegistryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterType, setFilterType] = useState('');

  const fetch = async () => {
    setLoading(true);
    try { const r = await registryApi.getAll(); setItems(r.data.data || []); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try { await registryApi.remove(id); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const togglePurchased = async (id) => {
    try { await registryApi.markPurchased(id); fetch(); }
    catch { toast.error('Failed'); }
  };

  const filtered = filterType ? items.filter(i => i.item_type === filterType) : items;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Registry</h1>
          <p className="text-sm text-gray-500">{items.length} items • {items.filter(i => i.is_purchased).length} purchased</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', ...ITEM_TYPES].map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterType === t ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}>
            {t ? t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'All'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No registry items yet. Add items from stores or create a cash fund!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className={`card p-5 ${item.is_purchased ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`badge text-xs ${typeColors[item.item_type] || 'badge-gray'}`}>{item.item_type.replace('_', ' ')}</span>
                  <p className="font-semibold text-gray-900 mt-2">{item.item_name}</p>
                  <p className="text-sm text-gray-500">{item.store_name}</p>
                </div>
                {item.price && <p className="font-bold text-primary-500 text-lg">\${Number(item.price).toLocaleString()}</p>}
              </div>
              {item.notes && <p className="text-xs text-gray-400 mb-3">{item.notes}</p>}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {item.item_url && <a href={item.item_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View Item</a>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => togglePurchased(item.id)} title={item.is_purchased ? 'Mark as Not Purchased' : 'Mark as Purchased'} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${item.is_purchased ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'}`}>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditItem(item); setShowForm(true); }} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(item.id)} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <RegistryForm item={editItem} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetch(); }} />}
    </div>
  );
}

