import { useEffect, useState } from 'react';
import { coupleApi, themeApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Layout, Globe, Eye, EyeOff, Check, Loader2, Palette, Type, Layers, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_SECTIONS = ['hero', 'countdown', 'story', 'events', 'party', 'travel', 'registry', 'gallery', 'guestbook', 'faq'];
const SECTION_LABELS = { hero:'Hero Banner', countdown:'Countdown Timer', story:'Our Story', events:'Event Schedule', party:'Wedding Party', travel:'Travel & Hotels', registry:'Registry', gallery:'Photo Gallery', guestbook:'Guestbook', faq:'FAQ' };

const TABS = ['Theme', 'Colors', 'Fonts', 'Sections'];

const GOOGLE_FONTS = ['Playfair Display', 'Cormorant Garamond', 'Great Vibes', 'Dancing Script', 'Lato', 'Montserrat', 'Open Sans', 'Raleway'];

export default function WebsiteEditor() {
  const { coupleProfile, updateProfile } = useAuth();
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState(coupleProfile?.theme_id || null);
  const [colors, setColors] = useState(coupleProfile?.theme_config?.colors || { primary: '#f43f5e', secondary: '#eab308', accent: '#8b5cf6', background: '#ffffff', text: '#1f2937' });
  const [fonts, setFonts] = useState(coupleProfile?.theme_config?.fonts || { heading: 'Playfair Display', body: 'Inter' });
  const [sections, setSections] = useState(coupleProfile?.sections_order || DEFAULT_SECTIONS);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    Promise.all([themeApi.getAll()]).then(([t]) => {
      setThemes(t.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await coupleApi.updateTheme({ theme_id: selectedTheme, theme_config: { colors, fonts }, sections_order: sections });
      toast.success('Website settings saved!');
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const togglePublish = async () => {
    setPublishing(true);
    try {
      if (coupleProfile?.website_published) {
        await coupleApi.unpublishWebsite();
        updateProfile({ ...coupleProfile, website_published: false });
        toast.success('Website unpublished');
      } else {
        await coupleApi.publishWebsite();
        updateProfile({ ...coupleProfile, website_published: true });
        toast.success('🎉 Website is now live!');
      }
    } catch { toast.error('Failed'); } finally { setPublishing(false); }
  };

  const moveSection = (i, dir) => {
    const arr = [...sections];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setSections(arr);
  };

  const websiteUrl = coupleProfile?.custom_slug ? `${window.location.origin}/w/${coupleProfile.custom_slug}` : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Website Editor</h1>
          <p className="text-sm text-gray-500 mt-1">Customize your wedding website's look and sections</p>
        </div>
        <div className="flex gap-3 items-center">
          {websiteUrl && (
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary-500 hover:underline">
              <Globe className="w-4 h-4" /> View Website
            </a>
          )}
          <button onClick={togglePublish} disabled={publishing} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${coupleProfile?.website_published ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : coupleProfile?.website_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {coupleProfile?.website_published ? 'Unpublish' : 'Publish Website'}
          </button>
          <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
          </button>
        </div>
      </div>

      {coupleProfile?.website_published && websiteUrl && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <p className="text-sm text-green-700">Your website is <strong>live</strong> at <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="underline font-mono">{websiteUrl}</a></p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card overflow-hidden">
            <div className="flex border-b border-gray-100">
              {TABS.map((t, i) => (
                <button key={t} onClick={() => setTab(i)} className={`flex-1 py-3 text-xs font-medium transition-colors ${tab === i ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
              ))}
            </div>
            <div className="p-4">
              {/* Theme Tab */}
              {tab === 0 && (
                loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div> :
                <div className="grid grid-cols-2 gap-3">
                  {themes.length === 0 ? (
                    <p className="col-span-2 text-sm text-gray-400 text-center py-4">No themes available yet</p>
                  ) : themes.map(t => (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (t.is_premium) return;
                        setSelectedTheme(t.id);
                        if (t.color_palette) setColors((c) => ({ ...c, ...t.color_palette }));
                        if (t.font_pair) setFonts((f) => ({ ...f, ...t.font_pair }));
                      }}
                      className={`border-2 rounded-xl overflow-hidden cursor-pointer transition-all ${selectedTheme === t.id ? 'border-primary-500 shadow-md' : 'border-gray-100 hover:border-gray-300'} ${t.is_premium ? 'opacity-75' : ''}`}
                    >
                      <div className="aspect-video bg-gradient-to-br from-rose-100 to-gold-100 flex items-center justify-center relative">
                        {t.preview_image_url ? <img src={t.preview_image_url} alt={t.name} className="w-full h-full object-cover" /> : t.color_palette ? (
                          <div className="absolute inset-0 flex flex-col" style={{ background: t.color_palette.background }}>
                            <div className="flex-1 flex items-center justify-center text-lg" style={{ color: t.color_palette.text, fontFamily: t.font_pair?.heading }}>{t.name.split(' ')[0]}</div>
                            <div className="flex h-2">{['primary', 'secondary', 'accent'].map(k => <div key={k} className="flex-1" style={{ background: t.color_palette[k] }} />)}</div>
                          </div>
                        ) : <Palette className="w-6 h-6 text-gray-400" />}
                        {t.is_premium && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Lock className="w-5 h-5 text-white" /></div>}
                        {selectedTheme === t.id && <div className="absolute top-1 right-1 bg-primary-500 rounded-full p-0.5"><Check className="w-3 h-3 text-white" /></div>}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-800 truncate">{t.name}</p>
                        {t.is_premium && <span className="text-xs text-gold-600 font-medium">Premium</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Colors Tab */}
              {tab === 1 && (
                <div className="space-y-4">
                  {Object.entries(colors).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 capitalize">{key} Color</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-mono">{val}</span>
                        <input type="color" value={val} onChange={e => setColors(c => ({ ...c, [key]: e.target.value }))} className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Fonts Tab */}
              {tab === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Heading Font</label>
                    <select value={fonts.heading} onChange={e => setFonts(f => ({ ...f, heading: e.target.value }))} className="input-field">
                      {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <p className="mt-2 text-lg font-serif" style={{ fontFamily: fonts.heading }}>Preview Heading</p>
                  </div>
                  <div>
                    <label className="label">Body Font</label>
                    <select value={fonts.body} onChange={e => setFonts(f => ({ ...f, body: e.target.value }))} className="input-field">
                      {['Inter', 'Lato', 'Open Sans', 'Roboto', 'Nunito', 'Raleway', 'Montserrat'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <p className="mt-2 text-sm" style={{ fontFamily: fonts.body }}>This is how your body text will look to guests.</p>
                  </div>
                </div>
              )}

              {/* Sections Tab */}
              {tab === 3 && (
                <div className="space-y-2">
                  {sections.map((sec, i) => (
                    <div key={sec} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <Layers className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{SECTION_LABELS[sec] || sec}</span>
                      <div className="flex gap-1">
                        <button onClick={() => moveSection(i, -1)} disabled={i === 0} className="w-5 h-5 text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs">↑</button>
                        <button onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1} className="w-5 h-5 text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs">↓</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden sticky top-6">
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div>
              <div className="flex-1 bg-white rounded-full px-4 py-1 text-xs text-gray-400 text-center font-mono">
                {websiteUrl || 'savethedate.com/w/your-slug'}
              </div>
            </div>
            <div className="p-0 overflow-hidden" style={{ height: '500px' }}>
              <div className="w-full h-full overflow-y-auto" style={{ background: colors.background }}>
                {/* Simplified Preview */}
                <div className="h-40 flex items-center justify-center text-center p-6" style={{ background: `linear-gradient(135deg, ${colors.primary}22, ${colors.secondary}22)` }}>
                  <div>
                    <p style={{ fontFamily: fonts.heading, color: colors.text, fontSize: '1.5rem', fontWeight: 700 }}>
                      {coupleProfile?.bride_name} & {coupleProfile?.groom_name}
                    </p>
                    <p style={{ color: colors.primary, fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {coupleProfile?.wedding_date ? new Date(coupleProfile.wedding_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Your Wedding Date'}
                    </p>
                    {coupleProfile?.wedding_hashtag && <p style={{ color: colors.text, opacity: 0.6, fontSize: '0.75rem', marginTop: '0.25rem' }}>#{coupleProfile.wedding_hashtag}</p>}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {sections.map(s => (
                    <div key={s} className="border border-dashed rounded-lg p-3 text-center" style={{ borderColor: colors.primary + '40' }}>
                      <p style={{ fontFamily: fonts.body, color: colors.text, opacity: 0.7, fontSize: '0.75rem' }}>{SECTION_LABELS[s] || s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

