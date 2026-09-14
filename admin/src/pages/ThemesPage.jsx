import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Image as ImageIcon } from 'lucide-react';
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

// ─── Default Themes Seed ───────────────────────────────────────────────────────
const DEFAULT_THEMES = [
  {
    id: 1, name: 'Ivory Romance', slug: 'ivory-romance',
    previewImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
    description: 'Classic ivory and gold palette for a timeless wedding.',
    isPremium: false, isActive: true, sortOrder: 1,
    palette: { primary: '#f5f0e8', secondary: '#c9a84c', accent: '#e8d5b7', background: '#fffdf9', text: '#2c2c2c' },
    fonts: { heading: 'Playfair Display', body: 'Lato' },
  },
  {
    id: 2, name: 'Midnight Garden', slug: 'midnight-garden',
    previewImage: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=400',
    description: 'Deep navy and emerald for an enchanting evening affair.',
    isPremium: true, isActive: true, sortOrder: 2,
    palette: { primary: '#1a2744', secondary: '#2d6a4f', accent: '#52b788', background: '#0f1e35', text: '#f0f0f0' },
    fonts: { heading: 'Cormorant Garamond', body: 'Raleway' },
  },
  {
    id: 3, name: 'Blush Blossom', slug: 'blush-blossom',
    previewImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400',
    description: 'Soft blush and rose gold for a romantic celebration.',
    isPremium: false, isActive: true, sortOrder: 3,
    palette: { primary: '#f7cac9', secondary: '#c5a4a4', accent: '#e8a0a0', background: '#fdf6f6', text: '#4a3535' },
    fonts: { heading: 'Great Vibes', body: 'Montserrat' },
  },
  {
    id: 4, name: 'Sage & Stone', slug: 'sage-stone',
    previewImage: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400',
    description: 'Earthy sage green and warm stone tones. Boho chic.',
    isPremium: true, isActive: true, sortOrder: 4,
    palette: { primary: '#87a878', secondary: '#c5b8a0', accent: '#a8956a', background: '#f5f2ec', text: '#3d3830' },
    fonts: { heading: 'Josefin Sans', body: 'Nunito' },
  },
  {
    id: 5, name: 'Royal Indigo', slug: 'royal-indigo',
    previewImage: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400',
    description: 'Regal indigo and gold for a majestic celebration.',
    isPremium: true, isActive: false, sortOrder: 5,
    palette: { primary: '#4c3d7a', secondary: '#c9a84c', accent: '#7b6aa0', background: '#f5f3fc', text: '#2a2040' },
    fonts: { heading: 'Cinzel', body: 'EB Garamond' },
  },
  {
    id: 6, name: 'Minimalist White', slug: 'minimalist-white',
    previewImage: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=400',
    description: 'Clean, modern minimalist design for the contemporary couple.',
    isPremium: false, isActive: true, sortOrder: 6,
    palette: { primary: '#ffffff', secondary: '#2c2c2c', accent: '#888888', background: '#fafafa', text: '#1a1a1a' },
    fonts: { heading: 'Helvetica Neue', body: 'Inter' },
  },
];

// ─── Validation Schema ─────────────────────────────────────────────────────────
const themeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  previewImage: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  headingFont: z.string().min(1, 'Required'),
  bodyFont: z.string().min(1, 'Required'),
  isPremium: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

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

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ─── Theme Form Modal ──────────────────────────────────────────────────────────
function ThemeFormModal({ isOpen, onClose, initialData, onSave }) {
  const isEditing = !!initialData?.id;

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(themeSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || '',
          previewImage: initialData.previewImage || '',
          primaryColor: initialData.palette?.primary || '#6366f1',
          secondaryColor: initialData.palette?.secondary || '#818cf8',
          accentColor: initialData.palette?.accent || '#a5b4fc',
          backgroundColor: initialData.palette?.background || '#ffffff',
          textColor: initialData.palette?.text || '#1e293b',
          headingFont: initialData.fonts?.heading || '',
          bodyFont: initialData.fonts?.body || '',
          isPremium: initialData.isPremium || false,
          sortOrder: initialData.sortOrder || 1,
        }
      : {
          name: '', description: '', previewImage: '',
          primaryColor: '#6366f1', secondaryColor: '#818cf8',
          accentColor: '#a5b4fc', backgroundColor: '#ffffff', textColor: '#1e293b',
          headingFont: 'Playfair Display', bodyFont: 'Lato',
          isPremium: false, sortOrder: 1,
        },
  });

  const nameValue = watch('name');

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      slug: slugify(values.name),
      description: values.description,
      previewImage: values.previewImage,
      isPremium: values.isPremium,
      sortOrder: values.sortOrder,
      palette: {
        primary: values.primaryColor,
        secondary: values.secondaryColor,
        accent: values.accentColor,
        background: values.backgroundColor,
        text: values.textColor,
      },
      fonts: { heading: values.headingFont, body: values.bodyFont },
    };
    await onSave(payload, isEditing ? initialData.id : null);
    reset();
    onClose();
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
        <div className="grid grid-cols-2 gap-4">
          <Input label="Theme Name" required error={errors.name?.message} {...register('name')} placeholder="Ivory Romance" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Slug <span className="text-slate-400 font-normal">(auto)</span></label>
            <input readOnly value={slugify(nameValue || '')} className="admin-input bg-slate-50 text-slate-500" />
          </div>
        </div>

        <Input label="Preview Image URL" error={errors.previewImage?.message} {...register('previewImage')} placeholder="https://…" />
        <div>
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea {...register('description')} rows={2} className="admin-input mt-1 resize-none" placeholder="Brief description of this theme…" />
        </div>

        {/* Colors */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Color Palette</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <ColorField label="Primary" register={register} name="primaryColor" />
            <ColorField label="Secondary" register={register} name="secondaryColor" />
            <ColorField label="Accent" register={register} name="accentColor" />
            <ColorField label="Background" register={register} name="backgroundColor" />
            <ColorField label="Text" register={register} name="textColor" />
          </div>
        </div>

        {/* Fonts */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Font Pair</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Heading Font" error={errors.headingFont?.message} {...register('headingFont')} placeholder="Playfair Display" />
            <Input label="Body Font" error={errors.bodyFont?.message} {...register('bodyFont')} placeholder="Lato" />
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('isPremium')} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Premium Theme</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Sort Order</label>
            <input type="number" {...register('sortOrder')} className="admin-input w-20" min={1} />
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
        {theme.previewImage ? (
          <img src={theme.previewImage} alt={theme.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={32} className="text-slate-300" />
          </div>
        )}
        {/* Color swatch row */}
        <div className="absolute bottom-0 left-0 right-0 flex h-3">
          {Object.values(theme.palette || {}).slice(0, 5).map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-slate-900 text-sm truncate">{theme.name}</h3>
          <div className="flex gap-1 ml-2 flex-shrink-0">
            <Badge variant={theme.isPremium ? 'gold' : 'gray'} size="sm">
              {theme.isPremium ? 'Premium' : 'Free'}
            </Badge>
          </div>
        </div>
        {theme.fonts && (
          <p className="text-[11px] text-slate-400 mb-3">{theme.fonts.heading} / {theme.fonts.body}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onToggle(theme.id)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${theme.isActive ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            {theme.isActive
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

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await adminApi.getThemes();
        const list = data.themes || data;
        setThemes(list.length ? list : DEFAULT_THEMES);
      } catch {
        setThemes(DEFAULT_THEMES);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (payload, id) => {
    try {
      if (id) {
        await adminApi.updateTheme(id, payload);
        setThemes((prev) => prev.map((t) => t.id === id ? { ...t, ...payload } : t));
        toast.success('Theme updated');
      } else {
        const { data } = await adminApi.createTheme(payload).catch(() => ({ data: { ...payload, id: Date.now() } }));
        setThemes((prev) => [...prev, { ...payload, id: data.id || Date.now(), isActive: true }]);
        toast.success('Theme created');
      }
    } catch {
      toast.error('Failed to save theme');
    }
  };

  const handleToggle = async (id) => {
    try {
      await adminApi.toggleThemeActive(id);
      setThemes((prev) => prev.map((t) => t.id === id ? { ...t, isActive: !t.isActive } : t));
      toast.success('Theme status toggled');
    } catch {
      setThemes((prev) => prev.map((t) => t.id === id ? { ...t, isActive: !t.isActive } : t));
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await adminApi.deleteTheme(deleteId);
      setThemes((prev) => prev.filter((t) => t.id !== deleteId));
      toast.success('Theme deleted');
    } catch {
      setThemes((prev) => prev.filter((t) => t.id !== deleteId));
      toast.success('Theme deleted');
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
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
          <p className="text-sm text-slate-500 mt-0.5">{themes.length} themes available</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => { setEditTheme(null); setShowForm(true); }}
        >
          Add Theme
        </Button>
      </div>

      {/* Themes grid */}
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
