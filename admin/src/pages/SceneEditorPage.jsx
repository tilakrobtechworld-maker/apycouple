import React, { useState, useRef, useCallback, Suspense, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, useTexture } from '@react-three/drei';
import {
  Save, Download, Trash2, Type, Image as ImageIcon, Square,
  Upload, Loader2, Check, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../services/api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const DEG = Math.PI / 180;
const uid = () => `obj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// An unreachable/invalid image URL throws inside the render tree, which
// plain try/catch can't intercept - only an error boundary can, and without
// one that failure would take down the whole editor, not just that object.
class TextureErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

// ─── Object Factories ──────────────────────────────────────────────────────────
const newTextObject = () => ({
  id: uid(), type: 'text', content: 'Your Text',
  position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
  color: '#1f2937', fontSize: 0.5,
});
const newImageObject = () => ({
  id: uid(), type: 'image', content: '',
  position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.6, y: 1.6, z: 1 },
  color: '#ffffff', fontSize: 0.5,
});
const newShapeObject = () => ({
  id: uid(), type: 'shape', content: '',
  position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
  color: '#6366f1', fontSize: 0.5,
});

// ─── 3D Object Renderers ───────────────────────────────────────────────────────
function SelectionHalo({ obj }) {
  // <Text> sizes itself from fontSize + content length, not obj.scale, so
  // the halo needs its own rough estimate of the rendered text's footprint
  // instead of reusing scale (which would otherwise be a fixed 1x1 box that
  // rarely matches the actual glyphs).
  const [w, h] = obj.type === 'text'
    ? [Math.max(1, (obj.content?.length || 1) * obj.fontSize * 0.55), obj.fontSize * 1.4]
    : [obj.scale.x, obj.scale.y];

  return (
    <mesh
      position={[obj.position.x, obj.position.y, obj.position.z - 0.03]}
      rotation={[obj.rotation.x * DEG, obj.rotation.y * DEG, obj.rotation.z * DEG]}
      scale={[w * 1.15, h * 1.15, obj.type === 'shape' ? obj.scale.z * 1.15 : 1]}
    >
      {obj.type === 'shape' ? <boxGeometry args={[1, 1, 1]} /> : <planeGeometry args={[1, 1]} />}
      <meshBasicMaterial color="#6366f1" transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}

function ImagePlane({ obj }) {
  const texture = useTexture(obj.content);
  return <meshStandardMaterial map={texture} toneMapped={false} />;
}

function SceneObject({ obj, isSelected, onSelect }) {
  const common = {
    position: [obj.position.x, obj.position.y, obj.position.z],
    rotation: [obj.rotation.x * DEG, obj.rotation.y * DEG, obj.rotation.z * DEG],
    onClick: (e) => { e.stopPropagation(); onSelect(obj.id); },
  };

  return (
    <group>
      {isSelected && <SelectionHalo obj={obj} />}

      {obj.type === 'text' && (
        <Text {...common} fontSize={obj.fontSize} color={obj.color} anchorX="center" anchorY="middle">
          {obj.content || ' '}
        </Text>
      )}

      {obj.type === 'shape' && (
        <mesh {...common} scale={[obj.scale.x, obj.scale.y, obj.scale.z]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={obj.color} />
        </mesh>
      )}

      {obj.type === 'image' && (
        <mesh {...common} scale={[obj.scale.x, obj.scale.y, 1]}>
          <planeGeometry args={[1, 1]} />
          {obj.content ? (
            <TextureErrorBoundary fallback={<meshStandardMaterial color="#fca5a5" />}>
              <Suspense fallback={<meshStandardMaterial color="#e2e8f0" />}>
                <ImagePlane obj={obj} />
              </Suspense>
            </TextureErrorBoundary>
          ) : (
            <meshStandardMaterial color="#e2e8f0" />
          )}
        </mesh>
      )}
    </group>
  );
}

// ─── Template Selection Modal ──────────────────────────────────────────────────
function TemplateModal({ isOpen, onClose, templates, loading, onSelect }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose a 3D Template" size="3xl">
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          No saved templates yet. Build a scene below, then hit "Save Template" to add the first one.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="text-left border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                {t.thumbnail_url ? (
                  <img src={t.thumbnail_url} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-slate-800 truncate">{t.name}</p>
                <p className="text-xs text-slate-400">{(t.scene_config || []).length} objects</p>
              </div>
              <div className="px-3 pb-3">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:underline">
                  <Check size={12} /> Select Template
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Inspector Panel ───────────────────────────────────────────────────────────
function Vec3Fields({ label, value, onChange, step = 0.1, min = -10, max = 10 }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <div className="grid grid-cols-3 gap-1.5 mt-1">
        {['x', 'y', 'z'].map((axis) => (
          <input
            key={axis}
            type="number"
            step={step}
            min={min}
            max={max}
            value={value[axis]}
            onChange={(e) => onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })}
            className="admin-input text-xs px-2 py-1.5"
          />
        ))}
      </div>
    </div>
  );
}

function InspectorPanel({ obj, onUpdate, onDelete, assets, onApplyAsset }) {
  if (!obj) {
    return (
      <div className="p-6 text-center text-sm text-slate-400">
        Click an object in the canvas to edit it.
      </div>
    );
  }

  const patch = (fields) => onUpdate(obj.id, fields);

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {obj.type} selected
        </span>
        <button onClick={() => onDelete(obj.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete object">
          <Trash2 size={14} />
        </button>
      </div>

      {obj.type === 'text' && (
        <div>
          <label className="text-xs font-medium text-slate-500">Text Content</label>
          <textarea
            value={obj.content}
            onChange={(e) => patch({ content: e.target.value })}
            rows={2}
            className="admin-input text-sm mt-1 resize-none w-full"
          />
        </div>
      )}

      {obj.type === 'image' && (
        <div>
          <label className="text-xs font-medium text-slate-500">Image URL</label>
          <input
            value={obj.content}
            onChange={(e) => patch({ content: e.target.value })}
            placeholder="https://… or pick from User Panel"
            className="admin-input text-xs mt-1 w-full"
          />
          {assets.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {assets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onApplyAsset(obj.id, a.url)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${obj.content === a.url ? 'border-indigo-500' : 'border-transparent hover:border-slate-300'}`}
                >
                  <img src={a.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(obj.type === 'text' || obj.type === 'shape') && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500">Color</label>
          <input type="color" value={obj.color} onChange={(e) => patch({ color: e.target.value })} className="w-8 h-8 rounded border border-slate-300 cursor-pointer" />
        </div>
      )}

      {obj.type === 'text' && (
        <div>
          <label className="text-xs font-medium text-slate-500">Font Size: {obj.fontSize.toFixed(2)}</label>
          <input type="range" min={0.1} max={2} step={0.05} value={obj.fontSize} onChange={(e) => patch({ fontSize: parseFloat(e.target.value) })} className="w-full mt-1" />
        </div>
      )}

      <Vec3Fields label="Position" value={obj.position} onChange={(v) => patch({ position: v })} />
      <Vec3Fields label="Rotation (°)" value={obj.rotation} onChange={(v) => patch({ rotation: v })} step={5} min={-180} max={180} />
      <Vec3Fields label="Scale" value={obj.scale} onChange={(v) => patch({ scale: v })} step={0.1} min={0.1} max={5} />
    </div>
  );
}

// ─── User Panel (uploaded assets) ──────────────────────────────────────────────
function UserPanel({ assets, uploading, onUpload }) {
  return (
    <div className="p-4">
      <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium cursor-pointer transition-colors ${uploading ? 'opacity-60 pointer-events-none' : 'border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'}`}>
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {uploading ? 'Uploading…' : 'Upload Photo'}
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
      </label>

      {assets.length === 0 ? (
        <p className="text-xs text-slate-400 text-center mt-6">
          Uploaded photos appear here, and the newest one auto-applies to your image object.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {assets.map((a) => (
            <div key={a.id} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
              <img src={a.url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SceneEditorPage() {
  const [objects, setObjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [assets, setAssets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const glRef = useRef(null);

  const selectedObj = objects.find((o) => o.id === selectedId) || null;

  const addObject = (factory) => {
    const obj = factory();
    setObjects((prev) => [...prev, obj]);
    setSelectedId(obj.id);
  };

  const updateObject = useCallback((id, fields) => {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...fields } : o)));
  }, []);

  const deleteObject = (id) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const openTemplateModal = async () => {
    setShowTemplateModal(true);
    setLoadingTemplates(true);
    try {
      const { data } = await adminApi.getSceneTemplates();
      setTemplates(data.data || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const selectTemplate = (t) => {
    setObjects(t.scene_config || []);
    setSelectedId(null);
    setCurrentTemplate(t);
    setTemplateName(t.name);
    setShowTemplateModal(false);
    toast.success(`"${t.name}" loaded`);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await adminApi.uploadSceneImage(fd);
      const asset = { id: uid(), url: data.data.url };
      setAssets((prev) => [asset, ...prev]);

      // Auto-apply the newest upload to the selected image object, else the
      // first image object in the scene, so the couple never has to
      // manually wire an upload to a mesh themselves.
      const target = (selectedObj?.type === 'image' && selectedObj) || objects.find((o) => o.type === 'image');
      if (target) {
        updateObject(target.id, { content: asset.url });
        toast.success(`Photo uploaded and applied to ${target.id === selectedObj?.id ? 'selected' : 'first'} image object`);
      } else {
        toast.success('Photo uploaded — add an Image object to use it');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const applyAssetToObject = (objId, url) => updateObject(objId, { content: url });

  const saveTemplate = async () => {
    const name = templateName.trim() || currentTemplate?.name;
    if (!name) {
      toast.error('Give this template a name first');
      return;
    }
    setSaving(true);
    try {
      const payload = { name, scene_config: objects };
      if (currentTemplate?.id) {
        await adminApi.updateSceneTemplate(currentTemplate.id, payload);
        toast.success('Template updated');
      } else {
        const { data } = await adminApi.createSceneTemplate(payload);
        setCurrentTemplate(data.data);
        toast.success('Template saved');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const exportSnapshot = () => {
    if (!glRef.current) {
      toast.error('Nothing to export yet');
      return;
    }
    const dataUrl = glRef.current.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${(templateName || 'scene').replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  return (
    <div className="h-[80vh] min-h-[600px] flex flex-col rounded-xl border border-slate-200 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Untitled 3D Template"
            className="admin-input text-sm w-56"
          />
          <Button variant="secondary" size="sm" icon={<Sparkles size={14} />} onClick={openTemplateModal}>Add Theme</Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Type size={14} />} onClick={() => addObject(newTextObject)}>Text</Button>
          <Button variant="secondary" size="sm" icon={<ImageIcon size={14} />} onClick={() => addObject(newImageObject)}>Image</Button>
          <Button variant="secondary" size="sm" icon={<Square size={14} />} onClick={() => addObject(newShapeObject)}>Shape</Button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportSnapshot}>Export</Button>
          <Button variant="primary" size="sm" icon={<Save size={14} />} loading={saving} onClick={saveTemplate}>Save Template</Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: User Panel */}
        <div className="w-56 border-r border-slate-200 bg-white overflow-y-auto flex-shrink-0">
          <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">User Panel</p>
          <UserPanel assets={assets} uploading={uploading} onUpload={handleUpload} />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 bg-slate-100 relative">
          <Canvas
            camera={{ position: [0, 0, 6], fov: 50 }}
            onCreated={({ gl }) => { glRef.current = gl; }}
            onPointerMissed={() => setSelectedId(null)}
          >
            <color attach="background" args={['#f1f5f9']} />
            <ambientLight intensity={0.8} />
            <directionalLight position={[4, 5, 4]} intensity={1.1} />
            <directionalLight position={[-4, -2, -4]} intensity={0.35} />
            <gridHelper args={[10, 20, '#cbd5e1', '#e2e8f0']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -1]} />
            {objects.map((obj) => (
              <SceneObject key={obj.id} obj={obj} isSelected={obj.id === selectedId} onSelect={setSelectedId} />
            ))}
            <OrbitControls makeDefault />
          </Canvas>

          {objects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-slate-400 text-sm">Click "Add Theme" to load a template, or add Text/Image/Shape above.</p>
            </div>
          )}
        </div>

        {/* Right: Inspector */}
        <div className="w-72 border-l border-slate-200 bg-white overflow-y-auto flex-shrink-0">
          <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Inspector</p>
          <InspectorPanel obj={selectedObj} onUpdate={updateObject} onDelete={deleteObject} assets={assets} onApplyAsset={applyAssetToObject} />
        </div>
      </div>

      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        templates={templates}
        loading={loadingTemplates}
        onSelect={selectTemplate}
      />
    </div>
  );
}
