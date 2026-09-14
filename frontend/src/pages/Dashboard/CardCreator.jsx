import { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { cardApi, cardTemplateApi } from '../../services/api';
import CardElementRenderer from '../../components/card/CardElementRenderer';
import CardCanvasView from '../../components/card/CardCanvasView';
import {
  Type, Image as ImageIcon, Square, Circle, Trash2, ChevronUp, ChevronDown,
  Download, FileImage, Globe, Eye, EyeOff, Loader2, Check, Lock, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DISPLAY_WIDTH = 380;
const GOOGLE_FONTS = ['Playfair Display', 'Cormorant Garamond', 'Great Vibes', 'Dancing Script', 'Lato', 'Montserrat', 'Open Sans', 'Raleway', 'Inter'];

const scaleElements = (els, factor) =>
  els.map((el) => ({
    ...el,
    x: el.x * factor,
    y: el.y * factor,
    width: el.width * factor,
    height: el.height * factor,
    style: {
      ...el.style,
      fontSize: el.style?.fontSize ? el.style.fontSize * factor : el.style?.fontSize,
      borderRadius: el.style?.borderRadius ? el.style.borderRadius * factor : el.style?.borderRadius,
    },
  }));

const newElement = (type, center) => {
  const base = { id: `el-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, rotation: 0, zIndex: 10 };
  if (type === 'text') {
    return { ...base, type, x: center.x - 90, y: center.y - 20, width: 180, height: 40, content: 'Your text here', style: { fontFamily: 'Lato', fontSize: 18, color: '#1f2937', textAlign: 'center', fontWeight: 400 } };
  }
  if (type === 'image') {
    return { ...base, type, x: center.x - 70, y: center.y - 70, width: 140, height: 140, content: '', style: { objectFit: 'cover', borderRadius: 8 } };
  }
  return { ...base, type: 'shape', x: center.x - 50, y: center.y - 50, width: 100, height: 100, content: '', style: { background: '#f43f5e', shapeType: 'rectangle', opacity: 1 } };
};

export default function CardCreator() {
  const [templates, setTemplates] = useState([]);
  const [card, setCard] = useState(null);
  const [scale, setScale] = useState(1);
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    Promise.all([cardTemplateApi.getAll(), cardApi.getMine()])
      .then(([tRes, cRes]) => {
        const c = cRes.data.data;
        const s = DISPLAY_WIDTH / c.canvas_width;
        setTemplates(tRes.data.data || []);
        setCard(c);
        setScale(s);
        setElements(scaleElements(c.elements || [], s));
      })
      .catch(() => toast.error('Failed to load card'))
      .finally(() => setLoading(false));
  }, []);

  const displayHeight = card ? card.canvas_height * scale : 0;
  const selected = elements.find((e) => e.id === selectedId) || null;

  const applyTemplate = (template) => {
    if (elements.length > 0 && !confirm('This replaces your current design with the template layout. Continue?')) return;
    setElements(scaleElements(template.default_elements || [], scale));
    setCard((c) => ({ ...c, template_id: template.id, background_color: template.background_color, background_image_url: template.background_image_url }));
    setSelectedId(null);
  };

  const updateElement = (id, patch) => setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  const updateStyle = (id, styleUpdate) => setElements((prev) => prev.map((el) => (el.id === id ? { ...el, style: { ...el.style, ...styleUpdate } } : el)));

  const addElement = (type) => {
    const el = newElement(type, { x: DISPLAY_WIDTH / 2, y: displayHeight / 2 });
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const deleteSelected = () => {
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const reorder = (dir) => {
    if (!selected) return;
    const zs = elements.map((e) => e.zIndex || 0);
    const target = dir === 'front' ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
    updateElement(selected.id, { zIndex: target });
  };

  const save = async () => {
    setSaving(true);
    try {
      const realElements = scaleElements(elements, 1 / scale);
      await cardApi.updateMine({
        template_id: card.template_id,
        elements: realElements,
        background_color: card.background_color,
        background_image_url: card.background_image_url,
      });
      toast.success('Card saved!');
    } catch { toast.error('Failed to save card'); } finally { setSaving(false); }
  };

  const togglePublish = async () => {
    setPublishing(true);
    try {
      if (card.is_published) {
        const { data } = await cardApi.unpublish();
        setCard((c) => ({ ...c, is_published: data.data.is_published }));
        toast.success('Card unpublished');
      } else {
        await save();
        const { data } = await cardApi.publish();
        setCard((c) => ({ ...c, is_published: data.data.is_published, custom_slug: data.data.custom_slug }));
        toast.success('🎉 Card is live!');
      }
    } catch { toast.error('Failed'); } finally { setPublishing(false); }
  };

  const exportImage = async () => {
    if (!exportRef.current) return null;
    const canvas = await html2canvas(exportRef.current, { backgroundColor: null, scale: 1 });
    return canvas;
  };

  const downloadPNG = async () => {
    setExporting(true);
    try {
      const canvas = await exportImage();
      const link = document.createElement('a');
      link.download = 'wedding-card.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  const downloadPDF = async () => {
    setExporting(true);
    try {
      const canvas = await exportImage();
      const pdf = new jsPDF({ orientation: card.canvas_height >= card.canvas_width ? 'portrait' : 'landscape', unit: 'px', format: [card.canvas_width, card.canvas_height] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, card.canvas_width, card.canvas_height);
      pdf.save('wedding-card.pdf');
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
    </div>
  );

  const websiteOrigin = window.location.origin;
  const cardLink = card?.custom_slug ? `${websiteOrigin}/card/${card.custom_slug}` : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Card Creator</h1>
          <p className="text-sm text-gray-500 mt-1">Design a digital wedding invitation card</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {cardLink && (
            <a href={cardLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary-500 hover:underline">
              <Globe className="w-4 h-4" /> View Card
            </a>
          )}
          <button onClick={downloadPNG} disabled={exporting} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">
            <FileImage className="w-4 h-4" /> PNG
          </button>
          <button onClick={downloadPDF} disabled={exporting} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={togglePublish} disabled={publishing} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${card?.is_published ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : card?.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {card?.is_published ? 'Unpublish' : 'Publish Card'}
          </button>
          <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
          </button>
        </div>
      </div>

      {card?.is_published && cardLink && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <p className="text-sm text-green-700">Your card is <strong>live</strong> at <a href={cardLink} target="_blank" rel="noopener noreferrer" className="underline font-mono">{cardLink}</a></p>
        </div>
      )}

      {/* Template picker */}
      <div className="card p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Templates</p>
        {templates.length === 0 ? (
          <p className="text-sm text-gray-400">No card templates available yet — check back soon.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {templates.map((t) => (
              <div key={t.id} onClick={() => !t.is_premium && applyTemplate(t)}
                className={`flex-shrink-0 w-28 border-2 rounded-xl overflow-hidden cursor-pointer transition-all ${card?.template_id === t.id ? 'border-primary-500 shadow-md' : 'border-gray-100 hover:border-gray-300'} ${t.is_premium ? 'opacity-75' : ''}`}>
                <div className="h-16 flex items-center justify-center relative" style={{ background: t.background_image_url ? `url(${t.background_image_url}) center/cover` : t.background_color }}>
                  {t.is_premium && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Lock className="w-4 h-4 text-white" /></div>}
                </div>
                <p className="text-xs font-medium text-gray-800 truncate p-1.5">{t.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_260px] gap-6">
        {/* Toolbar + Layers */}
        <div className="card p-4 space-y-4 lg:order-1">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Element</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => addElement('text')} className="flex flex-col items-center gap-1 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs"><Type className="w-4 h-4" /> Text</button>
              <button onClick={() => addElement('image')} className="flex flex-col items-center gap-1 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs"><ImageIcon className="w-4 h-4" /> Photo</button>
              <button onClick={() => addElement('shape')} className="flex flex-col items-center gap-1 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs"><Square className="w-4 h-4" /> Shape</button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Layers ({elements.length})</p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {[...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)).map((el) => (
                <button key={el.id} onClick={() => setSelectedId(el.id)}
                  className={`w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded-lg ${selectedId === el.id ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-50 text-gray-600'}`}>
                  {el.type === 'text' ? <Type className="w-3 h-3 flex-shrink-0" /> : el.type === 'image' ? <ImageIcon className="w-3 h-3 flex-shrink-0" /> : el.type === 'icon' ? <Sparkles className="w-3 h-3 flex-shrink-0" /> : <Square className="w-3 h-3 flex-shrink-0" />}
                  <span className="truncate">{el.type === 'text' ? (el.content || 'Text') : el.type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex justify-center lg:order-2">
          <div
            className="relative border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-shrink-0"
            style={{ width: DISPLAY_WIDTH, height: displayHeight, background: card?.background_image_url ? `url(${card.background_image_url}) center/cover` : card?.background_color }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
          >
            {elements.map((el) => (
              <Rnd
                key={el.id}
                size={{ width: el.width, height: el.height }}
                position={{ x: el.x, y: el.y }}
                style={{ zIndex: el.zIndex || 0, outline: selectedId === el.id ? '2px solid #f43f5e' : 'none' }}
                bounds="parent"
                onDragStop={(e, d) => updateElement(el.id, { x: d.x, y: d.y })}
                onResizeStop={(e, dir, ref, delta, pos) => updateElement(el.id, { width: parseFloat(ref.style.width), height: parseFloat(ref.style.height), x: pos.x, y: pos.y })}
                onMouseDown={() => setSelectedId(el.id)}
              >
                <CardElementRenderer element={el} />
              </Rnd>
            ))}
          </div>
        </div>

        {/* Properties panel */}
        <div className="card p-4 lg:order-3">
          {!selected ? (
            <p className="text-sm text-gray-400 text-center py-8">Select an element to edit its properties</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase">{selected.type} properties</p>
                <div className="flex gap-1">
                  <button onClick={() => reorder('front')} title="Bring to front" className="p-1 text-gray-400 hover:text-gray-700"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => reorder('back')} title="Send to back" className="p-1 text-gray-400 hover:text-gray-700"><ChevronDown className="w-4 h-4" /></button>
                  <button onClick={deleteSelected} title="Delete" className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {selected.type === 'text' && (
                <>
                  <div>
                    <label className="label">Text</label>
                    <textarea value={selected.content} onChange={(e) => updateElement(selected.id, { content: e.target.value })} className="input-field" rows={2} />
                  </div>
                  <div>
                    <label className="label">Font</label>
                    <select value={selected.style.fontFamily} onChange={(e) => updateStyle(selected.id, { fontFamily: e.target.value })} className="input-field">
                      {GOOGLE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Size: {selected.style.fontSize}px</label>
                    <input type="range" min={8} max={60} value={selected.style.fontSize} onChange={(e) => updateStyle(selected.id, { fontSize: parseInt(e.target.value, 10) })} className="w-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">Color</label>
                    <input type="color" value={selected.style.color} onChange={(e) => updateStyle(selected.id, { color: e.target.value })} className="w-8 h-8 rounded border border-gray-200" />
                  </div>
                  <div className="flex gap-2">
                    {['left', 'center', 'right'].map((a) => (
                      <button key={a} onClick={() => updateStyle(selected.id, { textAlign: a })} className={`flex-1 py-1.5 text-xs rounded-lg border ${selected.style.textAlign === a ? 'bg-primary-50 border-primary-300 text-primary-600' : 'border-gray-200 text-gray-500'}`}>{a}</button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={selected.style.fontWeight >= 700} onChange={(e) => updateStyle(selected.id, { fontWeight: e.target.checked ? 700 : 400 })} /> Bold
                  </label>
                </>
              )}

              {selected.type === 'image' && (
                <>
                  <div>
                    <label className="label">Image URL</label>
                    <input value={selected.content} onChange={(e) => updateElement(selected.id, { content: e.target.value })} placeholder="https://…" className="input-field" />
                  </div>
                  <div>
                    <label className="label">Corner Radius: {selected.style.borderRadius || 0}px</label>
                    <input type="range" min={0} max={100} value={selected.style.borderRadius || 0} onChange={(e) => updateStyle(selected.id, { borderRadius: parseInt(e.target.value, 10) })} className="w-full" />
                  </div>
                </>
              )}

              {selected.type === 'shape' && (
                <>
                  <div>
                    <label className="label">Shape</label>
                    <div className="flex gap-2">
                      <button onClick={() => updateStyle(selected.id, { shapeType: 'rectangle' })} className={`flex-1 py-2 rounded-lg border flex items-center justify-center ${selected.style.shapeType !== 'circle' ? 'bg-primary-50 border-primary-300' : 'border-gray-200'}`}><Square className="w-4 h-4" /></button>
                      <button onClick={() => updateStyle(selected.id, { shapeType: 'circle' })} className={`flex-1 py-2 rounded-lg border flex items-center justify-center ${selected.style.shapeType === 'circle' ? 'bg-primary-50 border-primary-300' : 'border-gray-200'}`}><Circle className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">Color</label>
                    <input type="color" value={selected.style.background} onChange={(e) => updateStyle(selected.id, { background: e.target.value })} className="w-8 h-8 rounded border border-gray-200" />
                  </div>
                  <div>
                    <label className="label">Opacity: {Math.round((selected.style.opacity ?? 1) * 100)}%</label>
                    <input type="range" min={0} max={100} value={Math.round((selected.style.opacity ?? 1) * 100)} onChange={(e) => updateStyle(selected.id, { opacity: parseInt(e.target.value, 10) / 100 })} className="w-full" />
                  </div>
                </>
              )}

              {selected.type === 'icon' && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">Color</label>
                    <input type="color" value={selected.style.color || '#c0392b'} onChange={(e) => updateStyle(selected.id, { color: e.target.value })} className="w-8 h-8 rounded border border-gray-200" />
                  </div>
                  <div>
                    <label className="label">Opacity: {Math.round((selected.style.opacity ?? 1) * 100)}%</label>
                    <input type="range" min={0} max={100} value={Math.round((selected.style.opacity ?? 1) * 100)} onChange={(e) => updateStyle(selected.id, { opacity: parseInt(e.target.value, 10) / 100 })} className="w-full" />
                  </div>
                </>
              )}

              <div>
                <label className="label">Rotation: {selected.rotation || 0}°</label>
                <input type="range" min={-180} max={180} value={selected.rotation || 0} onChange={(e) => updateElement(selected.id, { rotation: parseInt(e.target.value, 10) })} className="w-full" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden full-resolution snapshot used for PNG/PDF export */}
      <div style={{ position: 'fixed', left: -99999, top: 0 }}>
        {card && (
          <CardCanvasView
            innerRef={exportRef}
            elements={scaleElements(elements, 1 / scale)}
            canvasWidth={card.canvas_width}
            canvasHeight={card.canvas_height}
            backgroundColor={card.background_color}
            backgroundImageUrl={card.background_image_url}
            scale={1}
          />
        )}
      </div>
    </div>
  );
}
