import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi, guestbookApi } from '../../services/api';
import { Heart, MapPin, Clock, Gift, Map, Camera, BookOpen, ChevronDown, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

// Ambient floating hearts, themed off the couple's own colors - fixed to the
// viewport (not the page's scroll height) so it reads as one continuous
// effect no matter where the guest has scrolled to, sitting above section
// backgrounds (so it isn't just painted over) but below the nav and below
// pointer events so it never blocks clicks/taps.
function FloatingDecor({ colors }) {
  const items = useMemo(() => {
    const palette = [colors.primary || '#f43f5e', colors.secondary || '#eab308', colors.accent || '#8b5cf6'];
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: 4 + ((i * 37) % 92),
      size: 10 + ((i * 7) % 16),
      color: palette[i % palette.length],
      duration: 16 + ((i * 5) % 14),
      delay: (i * 1.7) % 12,
      drift: ((i % 2 === 0 ? 1 : -1) * (20 + (i * 11) % 40)),
    }));
  }, [colors.primary, colors.secondary, colors.accent]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-40" aria-hidden="true">
      {items.map((it) => (
        <motion.div
          key={it.id}
          className="absolute"
          style={{ left: `${it.left}%`, top: '105%' }}
          initial={{ y: 0, x: 0, opacity: 0, rotate: 0 }}
          animate={{ y: '-120vh', x: [0, it.drift, 0], opacity: [0, 0.55, 0.55, 0], rotate: 180 }}
          transition={{ duration: it.duration, delay: it.delay, repeat: Infinity, ease: 'linear' }}
        >
          <Heart size={it.size} style={{ color: it.color }} fill={it.color} fillOpacity={0.6} />
        </motion.div>
      ))}
    </div>
  );
}

// Full-screen photo viewer for the gallery grid - click a thumbnail to open,
// arrow keys/buttons to move between photos, Escape/backdrop click to close.
function GalleryLightbox({ photos, index, onClose, onNav }) {
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNav(1);
      else if (e.key === 'ArrowLeft') onNav(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNav]);

  if (!photo) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors" aria-label="Close">
        <X className="w-7 h-7" />
      </button>

      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onNav(-1); }} className="absolute left-2 md:left-6 text-white/60 hover:text-white p-2 transition-colors" aria-label="Previous photo">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onNav(1); }} className="absolute right-2 md:right-6 text-white/60 hover:text-white p-2 transition-colors" aria-label="Next photo">
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      <motion.img
        key={photo.id}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        src={photo.media_url || photo.thumbnail_url}
        alt={photo.caption || ''}
        className="max-h-[85vh] max-w-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />

      {photo.caption && (
        <p className="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm px-4">{photo.caption}</p>
      )}
    </motion.div>
  );
}

function CountdownTimer({ date }) {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const target = new Date(date);
    const update = () => {
      const now = new Date();
      const days = Math.max(0, differenceInDays(target, now));
      const hours = Math.max(0, differenceInHours(target, now) % 24);
      const mins = Math.max(0, differenceInMinutes(target, now) % 60);
      const secs = Math.max(0, differenceInSeconds(target, now) % 60);
      setTimeLeft({ days, hours, mins, secs });
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [date]);

  const Box = ({ val, label }) => (
    <div className="text-center">
      <div className="text-4xl md:text-6xl font-serif font-bold" style={{ color: 'var(--color-primary)' }}>{String(val).padStart(2, '0')}</div>
      <div className="text-xs uppercase tracking-widest text-gray-500 mt-1">{label}</div>
    </div>
  );

  return (
    <section className="py-16 bg-white text-center">
      <h2 className="text-2xl font-serif font-bold text-gray-700 mb-10">Counting Down To Our Big Day</h2>
      <div className="flex items-center justify-center gap-8 md:gap-16">
        <Box val={timeLeft.days} label="Days" />
        <div className="text-3xl text-gray-300 font-light">:</div>
        <Box val={timeLeft.hours} label="Hours" />
        <div className="text-3xl text-gray-300 font-light">:</div>
        <Box val={timeLeft.mins} label="Minutes" />
        <div className="text-3xl text-gray-300 font-light">:</div>
        <Box val={timeLeft.secs} label="Seconds" />
      </div>
    </section>
  );
}

export default function CoupleWebsite() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guestbookEntries, setGuestbookEntries] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    publicApi.getWebsite(slug).then(r => {
      setData(r.data.data);
      return publicApi.getGuestbook(slug);
    }).then(r => {
      setGuestbookEntries(r.data.data || []);
    }).catch(err => {
      if (err.response?.status === 404) setError('not_found');
      else if (err.response?.status === 403) setError('not_published');
      else setError('error');
    }).finally(() => setLoading(false));
  }, [slug]);

  const submitGuestbook = async (formData) => {
    try {
      await guestbookApi.create(slug, formData);
      toast.success('Message submitted! It will appear after approval 💕');
      reset();
    } catch { toast.error('Failed to submit'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-rose-50"><Loader2 className="w-10 h-10 animate-spin text-primary-400" /></div>;

  if (error === 'not_found') return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50 text-center px-4">
      <div>
        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-serif font-bold text-gray-700">Website Not Found</h1>
        <p className="text-gray-500 mt-2">This wedding website doesn't exist or has been removed.</p>
      </div>
    </div>
  );

  if (error === 'not_published') return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50 text-center px-4">
      <div>
        <Heart className="w-16 h-16 text-primary-300 fill-primary-300 mx-auto mb-4" />
        <h1 className="text-3xl font-serif font-bold text-gray-800">Coming Soon</h1>
        <p className="text-gray-500 mt-2">This couple's wedding website is being prepared. Check back soon!</p>
      </div>
    </div>
  );

  if (!data) return null;

  const { couple, events, registry, travel, gallery } = data;
  const colors = couple.theme_config?.colors || {};
  const fonts = couple.theme_config?.fonts || {};

  const cssVars = {
    '--color-primary': colors.primary || '#f43f5e',
    '--color-secondary': colors.secondary || '#eab308',
    '--color-accent': colors.accent || '#8b5cf6',
    '--color-bg': colors.background || '#ffffff',
    '--color-text': colors.text || '#1f2937',
    '--font-heading': fonts.heading || 'Playfair Display',
    '--font-body': fonts.body || 'Inter',
    fontFamily: fonts.body || 'Inter, sans-serif',
    color: colors.text || '#1f2937',
    background: colors.background || '#fff',
  };

  const navLinks = [{ id: 'story', label: 'Our Story' }, { id: 'events', label: 'Events' }, { id: 'travel', label: 'Travel' }, { id: 'registry', label: 'Registry' }, { id: 'gallery', label: 'Gallery' }, { id: 'guestbook', label: 'Guestbook' }];

  return (
    <div style={cssVars} className="min-h-screen">
      <FloatingDecor colors={colors} />

      {/* Sticky Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 fill-current" style={{ color: colors.primary || '#f43f5e' }} />
            <span className="font-serif font-semibold text-sm">{couple.bride_name} & {couple.groom_name}</span>
          </div>
          <div className="hidden md:flex gap-5 text-xs font-medium">
            {navLinks.map(l => (
              <a key={l.id} href={`#${l.id}`} className="hover:opacity-70 transition-opacity capitalize">{l.label}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <section className="min-h-screen flex items-center justify-center relative pt-14" style={{ background: `linear-gradient(135deg, ${colors.primary || '#f43f5e'}15, ${colors.secondary || '#eab308'}10)` }}>
        {couple.cover_photo_url && <img src={couple.cover_photo_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
        <div className="relative text-center px-4 py-20">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-6">We're Getting Married</p>
          <h1 className="text-5xl md:text-8xl font-bold leading-tight" style={{ fontFamily: fonts.heading || 'Playfair Display', color: colors.text || '#1f2937' }}>
            {couple.bride_name}<br />
            <span className="text-2xl md:text-4xl font-normal italic" style={{ color: colors.primary || '#f43f5e' }}>&amp;</span><br />
            {couple.groom_name}
          </h1>
          {couple.wedding_date && (
            <p className="mt-6 text-lg text-gray-600">{format(new Date(couple.wedding_date), 'MMMM d, yyyy')}</p>
          )}
          {couple.wedding_hashtag && <p className="mt-2 text-gray-400 text-sm">#{couple.wedding_hashtag}</p>}
          <a href="#story" className="mt-12 inline-flex flex-col items-center text-gray-400 hover:text-gray-600 transition-colors">
            <span className="text-xs uppercase tracking-widest mb-2">Scroll Down</span>
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </a>
        </div>
      </section>

      {/* Countdown */}
      {couple.wedding_date && new Date(couple.wedding_date) > new Date() && <CountdownTimer date={couple.wedding_date} />}

      {/* Our Story */}
      {couple.about_story && (
        <section id="story" className="py-20 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-serif font-bold mb-8" style={{ color: colors.text, fontFamily: fonts.heading }}>Our Story</h2>
            <div className="w-16 h-0.5 mx-auto mb-8" style={{ background: colors.primary || '#f43f5e' }} />
            <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-wrap">{couple.about_story}</p>
          </div>
        </section>
      )}

      {/* Events */}
      {events?.length > 0 && (
        <section id="events" className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-4xl font-serif font-bold text-center mb-2" style={{ color: colors.text, fontFamily: fonts.heading }}>Wedding Events</h2>
            <div className="w-16 h-0.5 mx-auto mb-12" style={{ background: colors.primary || '#f43f5e' }} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map(e => (
                <div key={e.id} className="border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: fonts.heading }}>{e.title}</h3>
                  {e.start_time && <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Clock className="w-4 h-4" />{format(new Date(e.start_time), 'PPp')}</div>}
                  {e.venue_name && <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><MapPin className="w-4 h-4" />{e.venue_name}{e.address ? `, ${e.address}` : ''}</div>}
                  {e.dress_code && <p className="text-sm text-gray-400 mt-2">Dress Code: {e.dress_code}</p>}
                  {e.notes && <p className="text-sm text-gray-500 mt-2">{e.notes}</p>}
                  {e.maps_embed_url && <a href={e.maps_embed_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium" style={{ color: colors.primary }}><Map className="w-4 h-4" /> View Map</a>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Travel */}
      {travel?.length > 0 && (
        <section id="travel" className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-4xl font-serif font-bold text-center mb-2" style={{ color: colors.text, fontFamily: fonts.heading }}>Travel & Accommodation</h2>
            <div className="w-16 h-0.5 mx-auto mb-12" style={{ background: colors.primary }} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {travel.map(t => (
                <div key={t.id} className="bg-white rounded-xl p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">{t.category}</p>
                  <h3 className="font-semibold text-gray-900">{t.title}</h3>
                  {t.description && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{t.description}</p>}
                  {t.discount_code && <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2"><p className="text-xs text-yellow-700">Code: <span className="font-mono font-bold">{t.discount_code}</span></p></div>}
                  <div className="flex gap-3 mt-3">
                    {t.booking_link && <a href={t.booking_link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium" style={{ color: colors.primary }}>Book Now →</a>}
                    {t.maps_link && <a href={t.maps_link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-500">View Map →</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Registry */}
      {registry?.length > 0 && (
        <section id="registry" className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-4xl font-serif font-bold text-center mb-2" style={{ color: colors.text, fontFamily: fonts.heading }}>Registry</h2>
            <div className="w-16 h-0.5 mx-auto mb-4" style={{ background: colors.primary }} />
            <p className="text-center text-gray-500 mb-12">Your presence is our greatest gift, but if you'd like to give a little extra:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {registry.filter(r => !r.is_purchased).map(r => (
                <div key={r.id} className="border border-gray-100 rounded-xl p-5 text-center shadow-sm">
                  <Gift className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-xs text-gray-400 uppercase">{r.store_name}</p>
                  <p className="font-semibold text-gray-900 mt-1">{r.item_name}</p>
                  {r.price && <p className="text-primary-500 font-bold mt-1">\${Number(r.price).toLocaleString()}</p>}
                  {r.item_url && <a href={r.item_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-medium border rounded-full px-4 py-1.5 transition-colors hover:text-white" style={{ borderColor: colors.primary, color: colors.primary }}>View Gift</a>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery?.length > 0 && (
        <section id="gallery" className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-4xl font-serif font-bold text-center mb-2" style={{ color: colors.text, fontFamily: fonts.heading }}>Photo Gallery</h2>
            <div className="w-16 h-0.5 mx-auto mb-12" style={{ background: colors.primary }} />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gallery.map((p, i) => (
                <motion.button
                  key={p.id}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: (i % 8) * 0.05 }}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
                >
                  <img src={p.thumbnail_url || p.media_url} alt={p.caption || ''} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  {p.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-xs truncate text-left">{p.caption}</p>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Guestbook */}
      <section id="guestbook" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold text-center mb-2" style={{ color: colors.text, fontFamily: fonts.heading }}>Guestbook</h2>
          <div className="w-16 h-0.5 mx-auto mb-6" style={{ background: colors.primary }} />
          <p className="text-center text-gray-500 mb-10">Leave us a message to cherish forever 💕</p>

          <form onSubmit={handleSubmit(submitGuestbook)} className="card p-6 mb-10">
            <div className="space-y-4">
              <div>
                <label className="label">Your Name *</label>
                <input {...register('author_name', { required: true })} placeholder="Your name" className="input-field" />
              </div>
              <div>
                <label className="label">Your Message *</label>
                <textarea {...register('message_text', { required: true })} rows={4} placeholder="Write a heartfelt message..." className="input-field resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-full font-semibold text-white transition-all" style={{ background: colors.primary || '#f43f5e' }}>
                Submit Message 💌
              </button>
            </div>
          </form>

          {guestbookEntries.length > 0 && (
            <div className="space-y-4">
              {guestbookEntries.map(e => (
                <div key={e.id} className="border border-gray-100 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: colors.primary || '#f43f5e' }}>
                      {e.author_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <p className="font-semibold text-gray-800">{e.author_name}</p>
                  </div>
                  <p className="text-gray-600 leading-relaxed">"{e.message_text}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center border-t border-gray-100">
        <Heart className="w-6 h-6 mx-auto mb-3 fill-current" style={{ color: colors.primary || '#f43f5e' }} />
        <p className="font-serif text-xl text-gray-700">{couple.bride_name} & {couple.groom_name}</p>
        {couple.wedding_date && <p className="text-gray-400 text-sm mt-1">{format(new Date(couple.wedding_date), 'MMMM d, yyyy')}</p>}
        <p className="text-xs text-gray-300 mt-4">Made with ❤️ on AppyCouple</p>
      </footer>

      <AnimatePresence>
        {lightboxIndex !== null && gallery?.length > 0 && (
          <GalleryLightbox
            photos={gallery}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNav={(dir) => setLightboxIndex((idx) => (idx + dir + gallery.length) % gallery.length)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

