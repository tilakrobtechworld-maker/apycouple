import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { coupleApi, authApi } from '../../services/api';
import { useForm } from 'react-hook-form';
import { User, Calendar, Lock, CreditCard, Loader2, Check, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['Profile', 'Wedding Details', 'Change Password', 'Subscription'];

export default function SettingsPage() {
  const { coupleProfile, user, updateProfile } = useAuth();
  const [tab, setTab] = useState(0);

  const profileForm = useForm({ defaultValues: { bride_name: coupleProfile?.bride_name, groom_name: coupleProfile?.groom_name, couple_display_name: coupleProfile?.couple_display_name } });
  const detailsForm = useForm({ defaultValues: { wedding_date: coupleProfile?.wedding_date?.substring(0, 10), wedding_hashtag: coupleProfile?.wedding_hashtag, custom_slug: coupleProfile?.custom_slug, about_story: coupleProfile?.about_story } });
  const passwordForm = useForm();

  const saveProfile = async (data) => {
    try {
      const res = await coupleApi.updateProfile(data);
      updateProfile(res.data.data);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update'); }
  };

  const saveDetails = async (data) => {
    try {
      const res = await coupleApi.updateProfile(data);
      updateProfile(res.data.data);
      toast.success('Details updated!');
    } catch { toast.error('Failed to update'); }
  };

  const changePassword = async (data) => {
    if (data.newPassword !== data.confirmNew) { toast.error("Passwords don't match"); return; }
    try {
      await authApi.changePassword({ oldPassword: data.oldPassword, newPassword: data.newPassword });
      toast.success('Password changed!');
      passwordForm.reset();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const plans = [
    { name: 'Free', price: '\$0', features: ['1 Event', '50 Guests', 'Basic RSVP'], current: user?.subscription_tier === 'free' },
    { name: 'Premium', price: '\$29/mo', features: ['5 Events', 'Unlimited Guests', 'Email Invitations'], current: user?.subscription_tier === 'premium' },
    { name: 'Elite', price: '\$49/mo', features: ['Unlimited Events', 'SMS Invitations', 'Custom Domain'], current: user?.subscription_tier === 'elite' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-serif font-bold text-gray-900">Settings</h1>

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${tab === i ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      <div className="max-w-2xl">
        {tab === 0 && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Couple Profile</h2>
            <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input value={user?.email || ''} disabled className="input-field bg-gray-50 text-gray-400" />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Bride's Name</label>
                  <input {...profileForm.register('bride_name')} className="input-field" />
                </div>
                <div>
                  <label className="label">Groom's Name</label>
                  <input {...profileForm.register('groom_name')} className="input-field" />
                </div>
              </div>
              <div>
                <label className="label">Display Name (optional)</label>
                <input {...profileForm.register('couple_display_name')} placeholder="Priya & Rahul" className="input-field" />
                <p className="text-xs text-gray-400 mt-1">Shown in the sidebar and website</p>
              </div>
              <button type="submit" className="btn-primary flex items-center gap-2 py-2 px-5 text-sm">
                <Check className="w-4 h-4" /> Save Profile
              </button>
            </form>
          </div>
        )}

        {tab === 1 && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Wedding Details</h2>
            <form onSubmit={detailsForm.handleSubmit(saveDetails)} className="space-y-4">
              <div>
                <label className="label">Wedding Date</label>
                <input {...detailsForm.register('wedding_date')} type="date" className="input-field" />
              </div>
              <div>
                <label className="label">Wedding Hashtag</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">#</span>
                  <input {...detailsForm.register('wedding_hashtag')} placeholder="PriyaRahulForever" className="input-field pl-7" />
                </div>
              </div>
              <div>
                <label className="label">Website URL Slug</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">savethedate.com/w/</span>
                  <input {...detailsForm.register('custom_slug')} placeholder="priya-and-rahul" className="input-field pl-36" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Use lowercase letters, numbers, and hyphens only</p>
              </div>
              <div>
                <label className="label">Our Story</label>
                <textarea {...detailsForm.register('about_story')} rows={5} placeholder="How did you two meet? Tell your love story..." className="input-field resize-none" />
              </div>
              <button type="submit" className="btn-primary flex items-center gap-2 py-2 px-5 text-sm">
                <Check className="w-4 h-4" /> Save Details
              </button>
            </form>
          </div>
        )}

        {tab === 2 && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h2>
            <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input {...passwordForm.register('oldPassword', { required: true })} type="password" className="input-field" />
              </div>
              <div>
                <label className="label">New Password</label>
                <input {...passwordForm.register('newPassword', { required: true, minLength: 6 })} type="password" className="input-field" />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input {...passwordForm.register('confirmNew', { required: true })} type="password" className="input-field" />
              </div>
              <button type="submit" disabled={passwordForm.formState.isSubmitting} className="btn-primary flex items-center gap-2 py-2 px-5 text-sm">
                {passwordForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Change Password
              </button>
            </form>
          </div>
        )}

        {tab === 3 && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Crown className="w-4 h-4" /> Subscription Plan</h2>
            <div className="space-y-3">
              {plans.map(p => (
                <div key={p.name} className={`border-2 rounded-xl p-4 ${p.current ? 'border-primary-500 bg-primary-50' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        {p.current && <span className="badge badge-pink text-xs">Current Plan</span>}
                      </div>
                      <p className="text-primary-600 font-bold mt-0.5">{p.price}</p>
                      <ul className="mt-2 space-y-1">
                        {p.features.map(f => <li key={f} className="text-xs text-gray-500 flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />{f}</li>)}
                      </ul>
                    </div>
                    {!p.current && <button className="text-sm font-medium text-primary-500 border border-primary-300 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition-colors">Upgrade</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

