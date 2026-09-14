import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import {
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Image as ImageIcon, Upload, Loader2, Square,
  Heart, Sparkles, Sparkle, Star, Flower2, Flower, Feather, Leaf, Sun, Moon,
  Music2, Bird, Crown, Gift, Cake, Wine, Camera, PartyPopper, Gem, Flame,
  Diamond, Ribbon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminApi } from '../services/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';

// Sticker/icon picker - keep this map in sync with the couple-facing renderer
// at frontend/src/components/card/CardElementRenderer.jsx's DECOR_ICONS.
const DECOR_ICONS = {
  Heart, Sparkles, Sparkle, Star, Flower2, Flower, Feather, Leaf, Sun, Moon,
  Music2, Bird, Crown, Gift, Cake, Wine, Camera, PartyPopper, Gem, Flame,
  Diamond, Ribbon,
};

// ─── Validation Schema ─────────────────────────────────────────────────────────
// Mirrors the { id, type, x, y, width, height, rotation, zIndex, content, style }
// shape the couple-side Card Creator already reads/writes (backend/src/models/
// CardTemplate.js) - these become movable/editable elements on the couple's
// card the moment they pick this template, with no other code changes needed.
const elementSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'shape', 'icon']),
  x: z.coerce.number(),
  y: z.coerce.number(),
  width: z.coerce.number().min(1),
  height: z.coerce.number().min(1),
  rotation: z.coerce.number().optional().default(0),
  zIndex: z.coerce.number().optional().default(1),
  content: z.string().optional(),
  style: z
    .object({
      background: z.string().optional(),
      shapeType: z.enum(['rectangle', 'circle']).optional(),
      color: z.string().optional(),
      opacity: z.coerce.number().optional(),
    })
    .optional(),
});

const templateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  preview_image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  text_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  heading_font: z.string().min(1, 'Required'),
  body_font: z.string().min(1, 'Required'),
  canvas_width: z.coerce.number().int().min(200),
  canvas_height: z.coerce.number().int().min(200),
  is_premium: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
  default_elements: z.array(elementSchema).optional().default([]),
});

const newImageElement = () => ({
  id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: 'image',
  x: 100, y: 100, width: 200, height: 200, rotation: 0, zIndex: 5,
  content: '',
  style: { opacity: 1 },
});

const newShapeElement = () => ({
  id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: 'shape',
  x: 100, y: 100, width: 150, height: 150, rotation: 0, zIndex: 5,
  content: '',
  style: { background: '#f43f5e', shapeType: 'rectangle', opacity: 1 },
});

const newIconElement = (iconName) => ({
  id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: 'icon',
  x: 100, y: 100, width: 80, height: 80, rotation: 0, zIndex: 5,
  content: iconName,
  style: { color: '#c0392b', opacity: 1 },
});

// ─── Color Field (swatch + hex text, kept in sync) ─────────────────────────────
// A bare `<input type="color">` and `<input type="text">` both registered to
// the same RHF field name look right but silently fall out of sync — each is
// an independent uncontrolled DOM node, so picking a color in the swatch
// doesn't update what the text box displays (or vice versa), and whichever
// one last wrote to the ref isn't reliably what ends up submitted. Making
// both inputs fully controlled off the one watch()'d value, through the same
// setValue() call, removes the ambiguity — there's only one source of truth.
function ColorField({ label, watch, setValue, name }) {
  const value = watch(name) || '';
  const set = (v) => setValue(name, v, { shouldValidate: true, shouldDirty: true });
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={(e) => set(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-slate-300 flex-shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => set(e.target.value)}
          className="admin-input text-xs flex-1"
        />
      </div>
    </div>
  );
}

// ─── Template Form Modal ───────────────────────────────────────────────────────
function formDefaults(initialData) {
  return initialData
    ? {
        name: initialData.name,
        description: initialData.description || '',
        preview_image_url: initialData.preview_image_url || '',
        background_color: initialData.background_color || '#fffaf0',
        text_color: initialData.text_color || '#2c2c2c',
        heading_font: initialData.heading_font || 'Playfair Display',
        body_font: initialData.body_font || 'Lato',
        canvas_width: initialData.canvas_width || 1080,
        canvas_height: initialData.canvas_height || 1350,
        is_premium: initialData.is_premium || false,
        sort_order: initialData.sort_order || 0,
        default_elements: initialData.default_elements || [],
      }
    : {
        name: '', description: '', preview_image_url: '',
        background_color: '#fffaf0', text_color: '#2c2c2c',
        heading_font: 'Playfair Display', body_font: 'Lato',
        canvas_width: 1080, canvas_height: 1350,
        is_premium: false, sort_order: 0,
        default_elements: [],
      };
}

function TemplateFormModal({ isOpen, onClose, initialData, onSave }) {
  const isEditing = !!initialData?.id;
  const [uploading, setUploading] = useState(false);
  const [elementUploading, setElementUploading] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: formDefaults(initialData),
  });
  const { fields: elementFields, append: appendElement, remove: removeElement } = useFieldArray({
    control,
    name: 'default_elements',
  });

  // This modal is mounted once by the parent and stays mounted while `isOpen`
  // toggles (so it can animate out) - react-hook-form's `defaultValues` are
  // only read at that first mount, so without this, opening "Edit" on a
  // template after the modal has already mounted once would keep showing
  // whichever values were current the first time it opened.
  useEffect(() => {
    if (isOpen) {
      reset(formDefaults(initialData));
      setSelectedIndex(null);
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (values) => {
    const ok = await onSave(values, isEditing ? initialData.id : null);
    if (ok) {
      reset();
      onClose();
    }
  };

  const previewUrl = watch('preview_image_url');

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await adminApi.uploadCardTemplateImage(fd);
      setValue('preview_image_url', data.data.url, { shouldValidate: true });
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleElementImageUpload = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setElementUploading(index);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await adminApi.uploadCardTemplateImage(fd);
      setValue(`default_elements.${index}.content`, data.data.url, { shouldValidate: true, shouldDirty: true });
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setElementUploading(null);
      e.target.value = '';
    }
  };

  const canvasWidth = watch('canvas_width') || 1080;
  const canvasHeight = watch('canvas_height') || 1350;
  const watchedElements = watch('default_elements') || [];
  const previewBg = watch('background_color');
  const previewBoxWidth = 280;
  const previewBoxHeight = Math.round(previewBoxWidth * (canvasHeight / canvasWidth));
  const previewScale = previewBoxWidth / canvasWidth;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Card Template' : 'Add Card Template'}
      size="2xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={isSubmitting} type="submit" form="card-template-form">
            {isEditing ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      }
    >
      <form id="card-template-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input label="Template Name" required error={errors.name?.message} {...register('name')} placeholder="Golden Bloom" />

        <div>
          <label className="text-sm font-medium text-slate-700">Design Image</label>
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
          <p className="text-xs text-slate-400 mt-2">
            Upload your exported design file directly (recommended — Canva share links don't work as direct images), or paste a direct image URL. This becomes the card's actual background for couples, and its colors below are auto-detected from it — leave it empty to use a plain color background instead.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea {...register('description')} rows={2} className="admin-input mt-1 resize-none" placeholder="Brief description of this card style…" />
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Canvas Size (px)</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Width" type="number" error={errors.canvas_width?.message} {...register('canvas_width')} />
            <Input label="Height" type="number" error={errors.canvas_height?.message} {...register('canvas_height')} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Colors <span className="text-slate-400 font-normal">(used only if no design image is set above)</span></h4>
          <div className="grid grid-cols-2 gap-4">
            <ColorField label="Background" watch={watch} setValue={setValue} name="background_color" />
            <ColorField label="Default Text Color" watch={watch} setValue={setValue} name="text_color" />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Starter Fonts</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Heading Font" error={errors.heading_font?.message} {...register('heading_font')} placeholder="Playfair Display" />
            <Input label="Body Font" error={errors.body_font?.message} {...register('body_font')} placeholder="Lato" />
          </div>
          <p className="text-xs text-slate-400 mt-2">Used to generate the template's default text layout — couples can restyle everything afterward in the Card Creator.</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 gap-3">
            <h4 className="text-sm font-semibold text-slate-700">
              Design Elements <span className="text-slate-400 font-normal">(decorations placed on the card — couples can move/resize these)</span>
            </h4>
            <div className="flex gap-2 flex-shrink-0">
              <Button type="button" variant="secondary" size="sm" icon={<ImageIcon size={13} />} onClick={() => { appendElement(newImageElement()); setSelectedIndex(elementFields.length); }}>Image</Button>
              <Button type="button" variant="secondary" size="sm" icon={<Square size={13} />} onClick={() => { appendElement(newShapeElement()); setSelectedIndex(elementFields.length); }}>Shape</Button>
            </div>
          </div>

          {/* Sticker gallery - click to drop a ready-made decorative icon onto the canvas below */}
          <div className="mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-9 sm:grid-cols-11 gap-1">
            {Object.entries(DECOR_ICONS).map(([name, Icon]) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => { appendElement(newIconElement(name)); setSelectedIndex(elementFields.length); }}
                className="aspect-square flex items-center justify-center rounded text-slate-500 hover:bg-white hover:text-rose-500 hover:shadow-sm transition-colors"
              >
                <Icon size={16} />
              </button>
            ))}
          </div>

          {elementFields.length > 0 && (
            <>
              <p className="text-xs text-slate-400 mb-2">Drag to move, drag a corner to resize. Click a piece to edit its color/rotation below.</p>
              <div
                className="relative mb-4 border border-slate-200 rounded-lg overflow-hidden bg-slate-100 select-none"
                style={{ width: previewBoxWidth, height: previewBoxHeight, backgroundColor: previewBg }}
              >
                {watchedElements.map((el, i) => (
                  <Rnd
                    key={elementFields[i]?.id || i}
                    bounds="parent"
                    size={{ width: Math.max(1, (el.width || 1) * previewScale), height: Math.max(1, (el.height || 1) * previewScale) }}
                    position={{ x: (el.x || 0) * previewScale, y: (el.y || 0) * previewScale }}
                    style={{ zIndex: el.zIndex || 1, outline: selectedIndex === i ? '2px solid #6366f1' : 'none' }}
                    onDragStart={() => setSelectedIndex(i)}
                    onDragStop={(e, d) => {
                      setValue(`default_elements.${i}.x`, Math.round(d.x / previewScale), { shouldDirty: true });
                      setValue(`default_elements.${i}.y`, Math.round(d.y / previewScale), { shouldDirty: true });
                    }}
                    onResizeStart={() => setSelectedIndex(i)}
                    onResizeStop={(e, dir, ref, delta, position) => {
                      setValue(`default_elements.${i}.width`, Math.round(ref.offsetWidth / previewScale), { shouldDirty: true });
                      setValue(`default_elements.${i}.height`, Math.round(ref.offsetHeight / previewScale), { shouldDirty: true });
                      setValue(`default_elements.${i}.x`, Math.round(position.x / previewScale), { shouldDirty: true });
                      setValue(`default_elements.${i}.y`, Math.round(position.y / previewScale), { shouldDirty: true });
                    }}
                  >
                    {el.type === 'image' ? (
                      el.content
                        ? <img src={el.content} alt="" className="w-full h-full object-contain" draggable={false} />
                        : <div className="w-full h-full bg-slate-200 border border-dashed border-slate-300" />
                    ) : el.type === 'icon' ? (
                      (() => {
                        const Icon = DECOR_ICONS[el.content] || Sparkles;
                        return <Icon className="w-full h-full" color={el.style?.color || '#c0392b'} style={{ opacity: el.style?.opacity ?? 1 }} />;
                      })()
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{
                          background: el.style?.background || '#f43f5e',
                          borderRadius: el.style?.shapeType === 'circle' ? '50%' : 0,
                          opacity: el.style?.opacity ?? 1,
                        }}
                      />
                    )}
                  </Rnd>
                ))}
              </div>
            </>
          )}

          {elementFields.length > 0 && selectedIndex != null && elementFields[selectedIndex] && (() => {
            const index = selectedIndex;
            const type = watch(`default_elements.${index}.type`);
            return (
              <div key={elementFields[index].id} className="border border-indigo-200 bg-indigo-50/40 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {type === 'image' ? 'Image' : type === 'icon' ? `Icon (${watch(`default_elements.${index}.content`)})` : 'Shape'} — selected
                  </span>
                  <button type="button" onClick={() => { removeElement(index); setSelectedIndex(null); }} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Remove element">
                    <Trash2 size={14} />
                  </button>
                </div>

                {type === 'image' && (
                  <div className="flex items-center gap-2">
                    <input {...register(`default_elements.${index}.content`)} className="admin-input text-xs flex-1" placeholder="https://… (a direct image link)" />
                    <label className={`flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded border text-xs cursor-pointer transition-colors ${elementUploading === index ? 'opacity-60 pointer-events-none' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                      {elementUploading === index ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleElementImageUpload(index, e)} disabled={elementUploading === index} />
                    </label>
                  </div>
                )}
                {type === 'shape' && (
                  <ColorField label="Shape Color" watch={watch} setValue={setValue} name={`default_elements.${index}.style.background`} />
                )}
                {type === 'icon' && (
                  <ColorField label="Icon Color" watch={watch} setValue={setValue} name={`default_elements.${index}.style.color`} />
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Input label="Rotation (°)" type="number" {...register(`default_elements.${index}.rotation`)} />
                  <Input label="Layer (z-index)" type="number" {...register(`default_elements.${index}.zIndex`)} />
                </div>
              </div>
            );
          })()}

          {elementFields.length === 0 && (
            <p className="text-xs text-slate-400">No extra elements — the couple will start with just the default heading/date text for this template.</p>
          )}
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('is_premium')} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Premium Template</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Sort Order</label>
            <input type="number" {...register('sort_order')} className="admin-input w-20" min={0} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Template Card ─────────────────────────────────────────────────────────────
function TemplateCard({ template, onEdit, onDelete, onToggle }) {
  return (
    <div className="admin-card !p-0 overflow-hidden group hover:shadow-card-hover transition-shadow">
      <div className="relative aspect-[4/5] bg-slate-100" style={{ background: template.background_image_url ? undefined : template.background_color }}>
        {template.preview_image_url ? (
          <img src={template.preview_image_url} alt={template.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={32} className="text-slate-300" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-slate-900 text-sm truncate">{template.name}</h3>
          <Badge variant={template.is_premium ? 'gold' : 'gray'} size="sm">
            {template.is_premium ? 'Premium' : 'Free'}
          </Badge>
        </div>
        {template.description && <p className="text-[11px] text-slate-400 mb-3 line-clamp-2">{template.description}</p>}

        <div className="flex items-center justify-between">
          <button
            onClick={() => onToggle(template.id)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${template.is_active ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            {template.is_active
              ? <><ToggleRight size={18} className="text-emerald-500" /> Active</>
              : <><ToggleLeft size={18} /> Inactive</>
            }
          </button>
          <div className="flex gap-1">
            <button onClick={() => onEdit(template)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit">
              <Edit2 size={14} />
            </button>
            <button onClick={() => onDelete(template.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CardTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = async () => {
    try {
      const { data: body } = await adminApi.getCardTemplates();
      setTemplates(body.data || []);
    } catch {
      toast.error('Failed to load card templates');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (values, id) => {
    const payload = {
      name: values.name,
      description: values.description,
      preview_image_url: values.preview_image_url,
      background_color: values.background_color,
      text_color: values.text_color,
      heading_font: values.heading_font,
      body_font: values.body_font,
      canvas_width: values.canvas_width,
      canvas_height: values.canvas_height,
      is_premium: values.is_premium,
      sort_order: values.sort_order,
    };
    if (id) {
      // Editing: always send the current elements, even if the admin cleared
      // them all intentionally - this is the template's real, current state.
      payload.default_elements = values.default_elements || [];
    } else if (values.default_elements && values.default_elements.length > 0) {
      // Creating: only override the backend's auto-generated heading/date
      // starter layout when the admin actually added elements here.
      payload.default_elements = values.default_elements;
    }
    try {
      if (id) {
        await adminApi.updateCardTemplate(id, payload);
        toast.success('Template updated');
      } else {
        await adminApi.createCardTemplate(payload);
        toast.success('Template created');
      }
      load();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
      return false;
    }
  };

  const handleToggle = async (id) => {
    try {
      await adminApi.toggleCardTemplateActive(id);
      setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, is_active: !t.is_active } : t));
    } catch {
      toast.error('Failed to toggle template');
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await adminApi.deleteCardTemplate(deleteId);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-card !p-0 overflow-hidden animate-pulse">
            <div className="aspect-[4/5] bg-slate-200 animate-shimmer" />
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Card Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">{templates.length} templates available for the Card Creator</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => { setEditTemplate(null); setShowForm(true); }}
        >
          Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="admin-card text-center py-16 text-slate-400 text-sm">
          No card templates yet. Add one so couples can start designing their wedding card.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={(t) => { setEditTemplate(t); setShowForm(true); }}
              onDelete={(id) => setDeleteId(id)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      <TemplateFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditTemplate(null); }}
        initialData={editTemplate}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Card Template"
        description="This template will be removed. Couples already using it will keep their existing card design."
        confirmLabel="Delete Template"
        dangerous
        loading={deleteLoading}
      />
    </div>
  );
}
