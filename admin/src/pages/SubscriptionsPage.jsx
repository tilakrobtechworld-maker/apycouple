import { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { CreditCard, Crown, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const PLAN_COLORS = { free: '#6b7280', premium: '#4f46e5', elite: '#d97706' };
const PLAN_BADGE = { free: 'bg-gray-100 text-gray-700', premium: 'bg-indigo-100 text-indigo-700', elite: 'bg-yellow-100 text-yellow-700' };

export default function SubscriptionsPage() {
  const [couples, setCouples] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetch = async () => {
    try {
      const [c, s] = await Promise.all([adminApi.getCouples({ limit: 100 }), adminApi.getStats()]);
      setCouples(c.data.data || []);
      setStats(s.data.data);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const updateSub = async (id, tier) => {
    setUpdatingId(id);
    try {
      await adminApi.updateSubscription(id, tier);
      toast.success('Subscription updated!');
      fetch();
    } catch { toast.error('Failed'); } finally { setUpdatingId(null); }
  };

  const planCounts = { free: couples.filter(c => c.User?.subscription_tier === 'free').length, premium: couples.filter(c => c.User?.subscription_tier === 'premium').length, elite: couples.filter(c => c.User?.subscription_tier === 'elite').length };
  const pieData = Object.entries(planCounts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Free Plans', value: planCounts.free, color: 'bg-gray-50 border-gray-200 text-gray-700' },
          { label: 'Premium Plans', value: planCounts.premium, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
          { label: 'Elite Plans', value: planCounts.elite, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Est. MRR', value: `$${((planCounts.premium * 29) + (planCounts.elite * 49)).toLocaleString()}`, color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
            <p className="text-sm opacity-70">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Plan Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={Object.values(PLAN_COLORS)[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Couples Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Couple Subscriptions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Couple</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Current Plan</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Change Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {couples.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.bride_name} & {c.groom_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.User?.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE[c.User?.subscription_tier] || 'bg-gray-100 text-gray-700'}`}>
                        {c.User?.subscription_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {updatingId === c.User?.id ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : (
                        <select value={c.User?.subscription_tier} onChange={e => updateSub(c.User?.id, e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300">
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                          <option value="elite">Elite</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

