import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Image as ImageIcon, Upload, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminApi } from '../services/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';

// ─── Starter Themes (created via the real API by "Load Starter Themes") ───────
const STARTER_THEMES = [
  {
    name: 'Ivory Romance',
    description: 'Classic ivory and gold palette for a timeless wedding.',
    color_palette: { primary: '#f5f0e8', secondary: '#c9a84c', accent: '#e8d5b7', background: '#fffdf9', text: '#2c2c2c' },
    font_pair: { heading: 'Playfair Display', body: 'Lato' },
    is_premium: false, sort_order: 1,
  },
  {
    name: 'Midnight Garden',
    description: 'Deep navy and emerald for an enchanting evening affair.',
    color_palette: { primary: '#1a2744', secondary: '#2d6a4f', accent: '#52b788', background: '#0f1e35', text: '#f0f0f0' },
    font_pair: { heading: 'Cormorant Garamond', body: 'Raleway' },
    is_premium: true, sort_order: 2,
  },
  {
    name: 'Blush Blossom',
    description: 'Soft blush and rose gold for a romantic celebration.',
    color_palette: { primary: '#f7cac9', secondary: '#c5a4a4', accent: '#e8a0a0', background: '#fdf6f6', text: '#4a3535' },
    font_pair: { heading: 'Great Vibes', body: 'Montserrat' },
    is_premium: false, sort_order: 3,
  },
  {
    name: 'Sage & Stone',
    description: 'Earthy sage green and warm stone tones. Boho chic.',
    color_palette: { primary: '#87a878', secondary: '#c5b8a0', accent: '#a8956a', background: '#f5f2ec', text: '#3d3830' },
    font_pair: { heading: 'Josefin Sans', body: 'Nunito' },
    is_premium: true, sort_order: 4,
  },
  {
    name: 'Royal Indigo',
    description: 'Regal indigo and gold for a majestic celebration.',
    color_palette: { primary: '#4c3d7a', secondary: '#c9a84c', accent: '#7b6aa0', background: '#f5f3fc', text: '#2a2040' },
    font_pair: { heading: 'Cinzel', body: 'EB Garamond' },
    is_premium: true, sort_order: 5,
  },
  {
    name: 'Minimalist White',
    description: 'Clean, modern minimalist design for the contemporary couple.',
    color_palette: { primary: '#ffffff', secondary: '#2c2c2c', accent: '#888888', background: '#fafafa', text: '#1a1a1a' },
    font_pair: { heading: 'Helvetica Neue', body: 'Inter' },
    is_premium: false, sort_order: 6,
  },
];

// ─── Validation Schema ─────────────────────────────────────────────────────────
const themeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  preview_image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  text_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  heading_font: z.string().min(1, 'Required'),
  body_font: z.string().min(1, 'Required'),
  is_premium: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
});

function formDefaults(initialData) {
  return initialData
    ? {
        name: initialData.name,
        description: initialData.description || '',
        preview_image_url: initialData.preview_image_url || '',
        primary_color: initialData.color_palette?.primary || '#6366f1',
        secondary_color: initialData.color_palette?.secondary || '#818cf8',
        accent_color: initialData.color_palette?.accent || '#a5b4fc',
        background_color: initialData.color_palette?.background || '#ffffff',
        text_color: initialData.color_palette?.text || '#1e293b',
        heading_font: initialData.font_pair?.heading || 'Playfair Display',
        body_font: initialData.font_pair?.body || 'Lato',
        is_premium: initialData.is_premium || false,
        sort_order: initialData.sort_order || 1,
      }
    : {
        name: '', description: '', preview_image_url: '',
        primary_color: '#6366f1', secondary_color: '#818cf8',
        accent_color: '#a5b4fc', background_color: '#ffffff', text_color: '#1e293b',
        heading_font: 'Playfair Display', body_font: 'Lato',
        is_premium: false, sort_order: 1,
      };
}

// ─── Color Picker Field ────────────────────────────────────────────────────────
function ColorField({ label, register, name }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" {...register(name)} className="w-8 h-8 rounded cursor-pointer border border-slate-300" />
        <input
          type="text"
          {...register(name)}
          placeholder="#000000"
          className="admin-input text-xs flex-1"
        />
      </div>
    </div>
  );
}

// ─── Theme Form Modal ──────────────────────────────────────────────────────────
function ThemeFormModal({ isOpen, onClose, initialData, onSave }) {
  const isEditing = !!initialData?.id;
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(themeSchema),
    defaultValues: formDefaults(initialData),
  });

  // This modal is mounted once by the parent and stays mounted while `isOpen`
  // toggles (so it can animate out) - react-hook-form's `defaultValues` are
  // only read at that first mount, so without this, opening "Edit" on a
  // theme after the modal has already mounted once would keep showing
  // whichever values were current the first time it opened.
  useEffect(() => {
    if (isOpen) reset(formDefaults(initialData));
  }, [isOpen, initialData, reset]);

  const previewUrl = watch('preview_image_url');

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await adminApi.uploadThemeImage(fd);
      setValue('preview_image_url', data.data.url, { shouldValidate: true });
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      description: values.description,
      preview_image_url: values.preview_image_url,
      color_palette: {
        primary: values.primary_color,
        secondary: values.secondary_color,
        accent: values.accent_color,
        background: values.background_color,
        text: values.text_color,
      },
      font_pair: { heading: values.heading_font, body: values.body_font },
      is_premium: values.is_premium,
      sort_order: values.sort_order,
    };
    const ok = await onSave(payload, isEditing ? initialData.id : null);
    if (ok) {
      reset();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Theme' : 'Add New Theme'}
      size="2xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={isSubmitting} type="submit" form="theme-form">
            {isEditing ? 'Save Changes' : 'Create Theme'}
          </Button>
        </div>
      }
    >
      <form id="theme-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input label="Theme Name" required error={errors.name?.message} {...register('name')} placeholder="Ivory Romance" />

        <div>
          <label className="text-sm font-medium text-slate-700">Preview Image</label>
          <div className="mt-1 flex items-center gap-3">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                <ImageIcon size={20} className="text-slate-300" />
              </div>
            )}
            <input {...register('preview_image_url')} className="admin-input flex-1" placeholder="https://… (a direct image link)" />
            <label className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${uploading ? 'opacity-60 pointer-events-none' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Uploading…' : 'Upload file'}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
            </label>
          </div>
          {errors.preview_image_url && <p className="text-xs text-red-500 mt-1">{errors.preview_image_url.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea {...register('description')} rows={2} className="admin-input mt-1 resize-none" placeholder="Brief description of this theme…" />
        </div>

        {/* Colors */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Color Palette</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <ColorField label="Primary" register={register} name="primary_color" />
            <ColorField label="Secondary" register={register} name="secondary_color" />
            <ColorField label="Accent" register={register} name="accent_color" />
            <ColorField label="Background" register={register} name="background_color" />
            <ColorField label="Text" register={register} name="text_color" />
          </div>
        </div>

        {/* Fonts */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Font Pair</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Heading Font" error={errors.heading_font?.message} {...register('heading_font')} placeholder="Playfair Display" />
            <Input label="Body Font" error={errors.body_font?.message} {...register('body_font')} placeholder="Lato" />
          </div>
          <p className="text-xs text-slate-400 mt-2">Applied to the couple's website when they pick this theme — they can still override colors/fonts afterward in their Website Editor.</p>
        </div>

        {/* Options */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('is_premium')} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Premium Theme</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Sort Order</label>
            <input type="number" {...register('sort_order')} className="admin-input w-20" min={1} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Theme Card ────────────────────────────────────────────────────────────────
function ThemeCard({ theme, onEdit, onDelete, onToggle }) {
  return (
    <div className="admin-card !p-0 overflow-hidden group hover:shadow-card-hover transition-shadow">
      {/* Preview */}
      <div className="relative aspect-video bg-slate-100">
        {theme.preview_image_url ? (
          <img src={theme.preview_image_url} alt={theme.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={32} className="text-slate-300" />
          </div>
        )}
        {/* Color swatch row */}
        <div className="absolute bottom-0 left-0 right-0 flex h-3">
          {Object.values(theme.color_palette || {}).slice(0, 5).map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-slate-900 text-sm truncate">{theme.name}</h3>
          <div className="flex gap-1 ml-2 flex-shrink-0">
            <Badge variant={theme.is_premium ? 'gold' : 'gray'} size="sm">
              {theme.is_premium ? 'Premium' : 'Free'}
            </Badge>
          </div>
        </div>
        {theme.font_pair && (
          <p className="text-[11px] text-slate-400 mb-3">{theme.font_pair.heading} / {theme.font_pair.body}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onToggle(theme.id)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${theme.is_active ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            {theme.is_active
              ? <><ToggleRight size={18} className="text-emerald-500" /> Active</>
              : <><ToggleLeft size={18} /> Inactive</>
            }
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(theme)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => onDelete(theme.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ThemesPage() {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTheme, setEditTheme] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    try {
      const { data: body } = await adminApi.getThemes();
      setThemes(body.data || []);
    } catch {
      toast.error('Failed to load themes');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (payload, id) => {
    try {
      if (id) {
        await adminApi.updateTheme(id, payload);
        toast.success('Theme updated');
      } else {
        await adminApi.createTheme(payload);
        toast.success('Theme created');
      }
      load();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save theme');
      return false;
    }
  };

  const handleToggle = async (id) => {
    try {
      await adminApi.toggleThemeActive(id);
      setThemes((prev) => prev.map((t) => t.id === id ? { ...t, is_active: !t.is_active } : t));
    } catch {
      toast.error('Failed to toggle theme');
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await adminApi.deleteTheme(deleteId);
      setThemes((prev) => prev.filter((t) => t.id !== deleteId));
      toast.success('Theme deleted');
    } catch {
      toast.error('Failed to delete theme');
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const loadStarterThemes = async () => {
    setSeeding(true);
    try {
      for (const theme of STARTER_THEMES) {
        await adminApi.createTheme(theme);
      }
      toast.success('Starter themes added!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add starter themes');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="admin-card !p-0 overflow-hidden animate-pulse">
            <div className="aspect-video bg-slate-200 animate-shimmer" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Theme Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{themes.length} themes available for couples' websites</p>
        </div>
        <div className="flex gap-2">
          {themes.length === 0 && (
            <Button variant="secondary" icon={<Sparkles size={16} />} loading={seeding} onClick={loadStarterThemes}>
              Load Starter Themes
            </Button>
          )}
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => { setEditTheme(null); setShowForm(true); }}
          >
            Add Theme
          </Button>
        </div>
      </div>

      {themes.length === 0 ? (
        <div className="admin-card text-center py-16 text-slate-400 text-sm">
          No themes yet. Add one, or click "Load Starter Themes" above for 6 ready-made options.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              onEdit={(t) => { setEditTheme(t); setShowForm(true); }}
              onDelete={(id) => setDeleteId(id)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <ThemeFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditTheme(null); }}
        initialData={editTheme}
        onSave={handleSave}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Theme"
        description="This theme will be removed. Couples using it will not lose their existing settings."
        confirmLabel="Delete Theme"
        dangerous
        loading={deleteLoading}
      />
    </div>
  );
}
