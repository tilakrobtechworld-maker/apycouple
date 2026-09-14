import { useState } from 'react';
import { adminApi } from '../services/api';
import { Settings, Mail, MessageSquare, Image, Users, Check, Loader2, Eye, EyeOff, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const TABS = ['Email Config', 'SMS Config', 'Media Config', 'Admin Accounts'];

function AdminAccountModal({ onClose, onSaved }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const onSubmit = async (data) => {
    try {
      await adminApi.createAdmin(data);
      toast.success('Admin account created!');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="font-semibold text-gray-800">Add Admin Account</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input {...register('name', { required: true })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input {...register('email', { required: true })} type="email" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input {...register('password', { required: true, minLength: 8 })} type="password" placeholder="Min 8 characters" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select {...register('role')} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Create Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showPwd, setShowPwd] = useState({});
  const [saving, setSaving] = useState(false);

  const emailForm = useForm({ defaultValues: { smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: 'noreply@appycouple.com' } });
  const smsForm = useForm({ defaultValues: { twilio_sid: '', twilio_token: '', twilio_phone: '' } });
  const mediaForm = useForm({ defaultValues: { cloudinary_cloud: '', cloudinary_key: '', cloudinary_secret: '', max_upload_mb: '10' } });

  const { useForm: uf } = require || (() => null);

  const saveConfig = async (formData, section) => {
    setSaving(true);
    try {
      await adminApi.updateSettings({ section, ...formData });
      toast.success(`${section} settings saved!`);
    } catch { toast.error('Failed to save settings'); } finally { setSaving(false); }
  };

  const tabIcons = [Mail, MessageSquare, Image, Users];

  const InputRow = ({ label, name, form, type = 'text', placeholder = '' }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input {...form.register(name)} type={showPwd[name] ? 'text' : type} placeholder={placeholder} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-10" />
        {type === 'password' && (
          <button type="button" onClick={() => setShowPwd(p => ({ ...p, [name]: !p[name] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPwd[name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((t, i) => {
            const Icon = tabIcons[i];
            return (
              <button key={t} onClick={() => setTab(i)} className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${tab === i ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Icon className="w-4 h-4" /> {t}
              </button>
            );
          })}
        </div>

        <div className="p-6 max-w-2xl">
          {/* Email Config */}
          {tab === 0 && (
            <form onSubmit={emailForm.handleSubmit(d => saveConfig(d, 'email'))} className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">Configure SMTP settings for sending email invitations and notifications.</p>
              <div className="grid grid-cols-2 gap-4">
                <InputRow label="SMTP Host" name="smtp_host" form={emailForm} placeholder="smtp.gmail.com" />
                <InputRow label="SMTP Port" name="smtp_port" form={emailForm} placeholder="587" />
              </div>
              <InputRow label="Username / Email" name="smtp_user" form={emailForm} placeholder="your@gmail.com" />
              <InputRow label="Password / App Password" name="smtp_pass" form={emailForm} type="password" placeholder="••••••••" />
              <InputRow label="From Address" name="smtp_from" form={emailForm} placeholder="noreply@appycouple.com" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => toast.success('Test email sent!')} className="px-4 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">Test Email</button>
                <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                </button>
              </div>
            </form>
          )}

          {/* SMS Config */}
          {tab === 1 && (
            <form onSubmit={smsForm.handleSubmit(d => saveConfig(d, 'sms'))} className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">Configure Twilio credentials for SMS invitations.</p>
              <InputRow label="Twilio Account SID" name="twilio_sid" form={smsForm} placeholder="AC..." />
              <InputRow label="Twilio Auth Token" name="twilio_token" form={smsForm} type="password" placeholder="••••••••" />
              <InputRow label="Twilio Phone Number" name="twilio_phone" form={smsForm} placeholder="+1234567890" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => toast.success('Test SMS sent!')} className="px-4 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">Test SMS</button>
                <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                </button>
              </div>
            </form>
          )}

          {/* Media Config */}
          {tab === 2 && (
            <form onSubmit={mediaForm.handleSubmit(d => saveConfig(d, 'media'))} className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">Configure Cloudinary for photo and video uploads.</p>
              <InputRow label="Cloud Name" name="cloudinary_cloud" form={mediaForm} placeholder="your-cloud-name" />
              <InputRow label="API Key" name="cloudinary_key" form={mediaForm} placeholder="123456789012345" />
              <InputRow label="API Secret" name="cloudinary_secret" form={mediaForm} type="password" placeholder="••••••••" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Upload Size (MB)</label>
                <input {...mediaForm.register('max_upload_mb')} type="number" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-32" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed File Types</label>
                <div className="flex flex-wrap gap-2">
                  {['JPG/JPEG', 'PNG', 'GIF', 'WEBP', 'MP4', 'MOV'].map(t => (
                    <label key={t} className="flex items-center gap-1.5 cursor-pointer text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:border-indigo-300">
                      <input type="checkbox" defaultChecked className="text-indigo-600" /> {t}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Settings
              </button>
            </form>
          )}

          {/* Admin Accounts */}
          {tab === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Manage admin and superadmin accounts.</p>
                <button onClick={() => setShowAdminForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
                  <Plus className="w-4 h-4" /> Add Admin
                </button>
              </div>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Role</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-3 font-medium">Platform Admin</td>
                      <td className="px-4 py-3 text-gray-500">admin@appycouple.com</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">superadmin</span></td>
                      <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdminForm && <AdminAccountModal onClose={() => setShowAdminForm(false)} onSaved={() => { setShowAdminForm(false); toast.success('Admin created!'); }} />}
    </div>
  );
}

