import { useEffect, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { mediaApi } from '../../services/api';
import { Camera, Upload, X, Star, Trash2, Loader2, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';

// socket.io connects to the backend origin, not the API path (strip trailing /api)
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '') || '/';

const TABS = ['Gallery', 'Live Stream'];

function PhotoGrid({ photos, onDelete, onFeature, showActions = true }) {
  const [lightbox, setLightbox] = useState(null);

  if (photos.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p>No photos here yet</p>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map(p => (
          <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100 cursor-pointer" onClick={() => setLightbox(p)}>
            <img src={p.thumbnail_url || p.media_url} alt={p.caption || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            {p.is_featured && <div className="absolute top-2 left-2"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /></div>}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              {showActions && onFeature && <button onClick={e => { e.stopPropagation(); onFeature(p.id); }} className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white hover:bg-yellow-600"><Star className="w-4 h-4" /></button>}
              {showActions && onDelete && <button onClick={e => { e.stopPropagation(); onDelete(p.id); }} className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"><Trash2 className="w-4 h-4" /></button>}
            </div>
            {p.uploader_name && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity"><p className="text-white text-xs">{p.uploader_name}</p></div>}
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
          <img src={lightbox.media_url} alt={lightbox.caption || ''} className="max-h-[90vh] max-w-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          {lightbox.caption && <p className="absolute bottom-4 text-white/80 text-sm">{lightbox.caption}</p>}
        </div>
      )}
    </>
  );
}

function LiveStream({ coupleId }) {
  const [photos, setPhotos] = useState([]);
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    mediaApi.getAll({ approved: true, limit: 50 }).then(r => setPhotos(r.data.data || [])).catch(() => {});
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('join-couple', coupleId);
    socket.on('new_photo', (photo) => setPhotos(prev => [photo, ...prev]));
    return () => socket.disconnect();
  }, [coupleId]);

  useEffect(() => {
    if (photos.length < 2) return;
    intervalRef.current = setInterval(() => setCurrent(c => (c + 1) % photos.length), 5000);
    return () => clearInterval(intervalRef.current);
  }, [photos.length]);

  const StreamView = () => (
    <div className={`bg-black flex flex-col items-center justify-center ${fullscreen ? 'fixed inset-0 z-50' : 'aspect-video rounded-2xl'} relative overflow-hidden`}>
      {photos.length === 0 ? (
        <div className="text-white/50 text-center p-8">
          <Camera className="w-16 h-16 mx-auto mb-4" />
          <p className="text-xl">Waiting for photos...</p>
          <p className="text-sm mt-2">Photos guests upload will appear here automatically</p>
        </div>
      ) : (
        <>
          <img src={photos[current]?.media_url} alt="" className="w-full h-full object-contain" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
            <p className="text-white text-lg font-medium">{photos[current]?.uploader_name}</p>
            {photos[current]?.caption && <p className="text-white/70 text-sm mt-1">{photos[current].caption}</p>}
          </div>
          <div className="absolute bottom-4 right-4 flex gap-1">
            {photos.slice(0, Math.min(8, photos.length)).map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current % Math.min(8, photos.length) ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
      {fullscreen && <button onClick={() => setFullscreen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 rounded-full p-2"><X className="w-5 h-5" /></button>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Live Photo Stream</h3>
          <p className="text-sm text-gray-500">{photos.length} photos • Auto-advances every 5 seconds</p>
        </div>
        <button onClick={() => setFullscreen(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">
          <Maximize2 className="w-4 h-4" /> Full Screen
        </button>
      </div>
      <StreamView />
      {fullscreen && <StreamView />}
    </div>
  );
}

export default function MediaPage() {
  const { coupleProfile } = useAuth();
  const [tab, setTab] = useState(0);
  const [approved, setApproved] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchMedia = async () => {
    try {
      const aRes = await mediaApi.getAll({ approved: true });
      setApproved(aRes.data.data || []);
    } catch {}
  };

  useEffect(() => { fetchMedia(); }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [], 'video/*': [] },
    onDrop: async (files) => {
      setUploading(true);
      try {
        for (const file of files) {
          const fd = new FormData(); fd.append('media', file);
          await mediaApi.upload(fd);
        }
        toast.success(`${files.length} file(s) uploaded!`);
        fetchMedia();
      } catch { toast.error('Upload failed'); } finally { setUploading(false); }
    },
  });

  const handleDelete = async (id) => {
    if (!confirm('Delete this photo?')) return;
    try { await mediaApi.remove(id); toast.success('Deleted'); fetchMedia(); }
    catch { toast.error('Failed'); }
  };
  const handleFeature = async (id) => {
    try { await mediaApi.toggleFeatured(id); toast.success('Updated!'); fetchMedia(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Photo Gallery</h1>
          <p className="text-sm text-gray-500 mt-1">{approved.length} photos</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 relative ${tab === i ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-4">
          <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
            <input {...getInputProps()} />
            {uploading ? <><Loader2 className="w-6 h-6 animate-spin text-primary-400 mx-auto mb-2" /><p className="text-sm text-gray-500">Uploading...</p></>
              : <><Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-500">Drop photos here or click to upload</p></>}
          </div>
          <PhotoGrid photos={approved} onDelete={handleDelete} onFeature={handleFeature} />
        </div>
      )}

      {tab === 1 && <LiveStream coupleId={coupleProfile?.id} />}
    </div>
  );
}

