import { useEffect, useMemo, useState, lazy, Suspense, createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi, guestbookApi } from '../../services/api';
import { Heart, MapPin, Clock, Gift, Map, Camera, ChevronDown, ChevronLeft, ChevronRight, X, Loader2, Flower2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { getTemplate } from './templates';

// The three.js stack is heavy (~600kB) - only pay for it on websites whose
// theme actually has a 3D model, not on every couple's page load.
const Hero3DModel = lazy(() => import('../../components/public/Hero3DModel'));
// Same idea for the scroll-driven gates intro (only the Royal Gates template).
const GatesHero = lazy(() => import('../../components/public/GatesHero'));

// Shared by every section: the active template's style tokens (see
// templates.js) plus the couple's data and resolved colors/fonts.
const SiteCtx = createContext(null);
const useSite = () => useContext(SiteCtx);

const NAV_LINKS = [{ id: 'story', label: 'Our Story' }, { id: 'events', label: 'Events' }, { id: 'travel', label: 'Travel' }, { id: 'registry', label: 'Registry' }, { id: 'gallery', label: 'Gallery' }, { id: 'guestbook', label: 'Guestbook' }];

// Fills {{bride_name}}-style tokens in a theme's custom HTML with the
// couple's actual data before it's rendered.
function fillPlaceholders(html, couple) {
  const values = {
    bride_name: couple.bride_name || '',
    groom_name: couple.groom_name || '',
    couple_display_name: couple.couple_display_name || `${couple.bride_name || ''} & ${couple.groom_name || ''}`,
    wedding_date: couple.wedding_date ? format(new Date(couple.wedding_date), 'MMMM d, yyyy') : '',
    wedding_hashtag: couple.wedding_hashtag || '',
    cover_photo_url: couple.cover_photo_url || '',
  };
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => (key in values ? values[key] : match));
}

// Ambient floating shapes (hearts / petals / sparkles per template), themed off
// the couple's own colors - fixed to the viewport (not the page's scroll height)
// so it reads as one continuous effect no matter where the guest has scrolled
// to, sitting above section backgrounds (so it isn't just painted over) but
// below the nav and below pointer events so it never blocks clicks/taps.
function FloatingDecor({ colors, shape }) {
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

  if (shape === 'none') return null;
  const Icon = shape === 'petals' ? Flower2 : shape === 'sparkles' ? Sparkles : Heart;

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
          <Icon size={it.size} style={{ color: it.color }} fill={shape === 'sparkles' ? 'none' : it.color} fillOpacity={0.6} />
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

// ─── Building blocks ──────────────────────────────────────────────────────────

function Section({ id, bg = 'A', className = '', children }) {
  const { t } = useSite();
  return (
    <section id={id} className={`${t.pad} ${bg === 'A' ? t.bgA : t.bgB} ${t.secCls} ${className}`}>
      {t.reveal ? (
        // scroll-reveal: content fades/slides up as it enters the viewport
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      ) : children}
    </section>
  );
}

function Divider({ mb = 'mb-12' }) {
  const { t } = useSite();
  const bg = { background: 'var(--color-primary)' };
  const pos = t.center ? 'mx-auto' : '';
  const flex = t.center ? 'justify-center' : '';
  if (t.divider === 'none') return <div className={mb} />;
  if (t.divider === 'ornament') {
    return (
      <div className={`flex items-center gap-3 ${flex} ${mb}`}>
        <span className="h-px w-12" style={bg} />
        <span style={{ color: 'var(--color-primary)' }}>{t.orn}</span>
        <span className="h-px w-12" style={bg} />
      </div>
    );
  }
  if (t.divider === 'double') {
    return (
      <div className={`w-20 ${pos} ${mb}`}>
        <div className="h-px" style={bg} />
        <div className="h-px mt-1" style={bg} />
      </div>
    );
  }
  if (t.divider === 'dots') {
    return <div className={`flex gap-2 ${flex} ${mb}`}>{[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={bg} />)}</div>;
  }
  return <div className={`w-16 h-0.5 ${pos} ${mb}`} style={bg} />;
}

function Title({ children, mb }) {
  const { t, colors, fonts } = useSite();
  return (
    <>
      <h2 className={`${t.h2} mb-2 ${t.center ? 'text-center' : ''}`} style={{ color: colors.text, fontFamily: fonts.heading }}>{children}</h2>
      <Divider mb={mb} />
    </>
  );
}

function CountdownTimer({ date }) {
  const { t, fonts } = useSite();
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
    <div className={`text-center ${t.cdBox}`}>
      <div className={t.cdNum} style={{ color: 'var(--color-primary)', fontFamily: fonts.heading }}>{String(val).padStart(2, '0')}</div>
      <div className={t.cdLabel}>{label}</div>
    </div>
  );
  const Sep = () => <div className={t.cdSep}>:</div>;

  return (
    <section className={`${t.cdSection} text-center px-4`}>
      <h2 className={t.cdTitle} style={{ fontFamily: fonts.heading }}>Counting Down To Our Big Day</h2>
      <div className={`flex items-center justify-center ${t.cdGap}`}>
        <Box val={timeLeft.days} label="Days" />
        <Sep />
        <Box val={timeLeft.hours} label="Hours" />
        <Sep />
        <Box val={timeLeft.mins} label="Minutes" />
        <Sep />
        <Box val={timeLeft.secs} label="Seconds" />
      </div>
    </section>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function Nav() {
  const { t, couple } = useSite();
  const brand = (
    <div className="flex items-center gap-2 justify-center">
      <Heart className="w-4 h-4 fill-current" style={{ color: t.iconColor }} />
      <span className={t.brandCls}>{couple.bride_name} & {couple.groom_name}</span>
    </div>
  );
  const links = NAV_LINKS.map((l) => <a key={l.id} href={`#${l.id}`} className={t.linkCls}>{l.label}</a>);

  if (t.nav === 'pill') {
    return (
      <nav className="fixed top-3 inset-x-3 z-50 flex justify-center">
        <div className={`w-full max-w-3xl h-12 px-5 flex items-center justify-between backdrop-blur ${t.navCls}`} style={t.navStyle}>
          {brand}
          <div className="hidden md:flex gap-5">{links}</div>
        </div>
      </nav>
    );
  }
  if (t.nav === 'center') {
    return (
      <nav className={`fixed top-0 w-full z-50 ${t.navCls}`} style={t.navStyle}>
        <div className="max-w-5xl mx-auto px-4 py-3 text-center">
          {brand}
          <div className="hidden md:flex justify-center gap-7 mt-2">{links}</div>
        </div>
      </nav>
    );
  }
  // 'bar' (classic) and 'minimal' share a shape; the tokens set their look.
  return (
    <nav className={`fixed top-0 w-full z-50 ${t.navCls}`} style={t.navStyle}>
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        {brand}
        <div className="hidden md:flex gap-5">{links}</div>
      </div>
    </nav>
  );
}

// ─── Hero (one variant per template style) ────────────────────────────────────

function Hero() {
  const { t, couple, colors, fonts } = useSite();
  const photo = couple.cover_photo_url;
  const date = couple.wedding_date ? format(new Date(couple.wedding_date), 'MMMM d, yyyy') : null;
  const soft = 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 18%, var(--color-bg)), color-mix(in srgb, var(--color-secondary) 30%, var(--color-bg)))';

  const kicker = <p className={t.kickerCls}>{t.kicker}</p>;
  const names = (color = 'var(--color-text)') => (
    <h1 className={t.h1} style={{ fontFamily: fonts.heading, color }}>
      {couple.bride_name}{t.inlineNames ? ' ' : <br />}
      <span className={t.amp} style={{ color: 'var(--color-primary)' }}>&amp;</span>
      {t.inlineNames ? ' ' : <br />}{couple.groom_name}
    </h1>
  );
  const dateLine = date && <p className={t.dateCls}>{date}</p>;
  const hash = couple.wedding_hashtag && <p className={`mt-2 text-sm ${t.faint}`}>#{couple.wedding_hashtag}</p>;
  const scroll = (
    <a href="#story" className={`mt-12 inline-flex flex-col items-center ${t.faint} hover:opacity-70 transition-opacity`}>
      <span className="text-xs uppercase tracking-widest mb-2">Scroll Down</span>
      <ChevronDown className="w-5 h-5 animate-bounce" />
    </a>
  );
  const model = couple.theme?.model_3d_url && (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto w-[280px] h-[280px] md:w-[420px] md:h-[420px]">
        <Suspense fallback={null}>
          <Hero3DModel url={couple.theme.model_3d_url} />
        </Suspense>
      </div>
    </div>
  );

  switch (t.hero) {
    // Scroll-driven three.js gates that open as you scroll (own tall track).
    case 'gates':
      return (
        <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--color-bg)' }} />}>
          <GatesHero couple={couple} colors={colors} fonts={fonts} t={t} date={date} />
        </Suspense>
      );

    // Full-photo backdrop with a thin inset frame, centered uppercase type.
    case 'frame':
      return (
        <section className="min-h-screen relative flex items-center justify-center pt-28 pb-10 text-white" style={{ background: 'var(--color-text)' }}>
          {photo && <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
          <div className="absolute inset-4 md:inset-8 border border-white/40 pointer-events-none" />
          <div className="absolute inset-6 md:inset-10 border border-white/20 pointer-events-none" />
          {model}
          <div className="relative text-center px-8 py-16">
            {kicker}{names('#fff')}{dateLine}{hash}
          </div>
        </section>
      );

    // Text on one side, photo on the other (stacks on mobile).
    case 'split':
      return (
        <section className="min-h-screen grid md:grid-cols-2 relative pt-14">
          <div className="flex items-center px-6 md:px-16 py-16 order-2 md:order-1">
            <div>{kicker}{names()}{dateLine}{hash}</div>
          </div>
          <div
            className="order-1 md:order-2 h-72 md:h-auto bg-cover bg-center"
            style={{ backgroundImage: photo ? `url(${photo})` : soft }}
          />
          {model}
        </section>
      );

    // Arched portrait between ornamental type.
    case 'arch':
      return (
        <section
          className="min-h-screen relative flex items-center justify-center pt-24 pb-12 text-center"
          style={{ background: 'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-secondary) 35%, transparent), transparent 60%), var(--color-bg)' }}
        >
          {model}
          <div className="relative px-4">
            {kicker}
            <div className="mx-auto w-52 h-64 md:w-64 md:h-80 rounded-t-full border-4 overflow-hidden mb-8 flex items-center justify-center" style={{ borderColor: 'var(--color-secondary)', background: soft }}>
              {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <span className="text-6xl" style={{ color: 'var(--color-secondary)' }}>❁</span>}
            </div>
            {names()}{dateLine}{hash}
          </div>
        </section>
      );

    // Round portrait above script names.
    case 'medallion':
      return (
        <section className="min-h-screen relative flex items-center justify-center pt-24 pb-12 text-center" style={{ background: soft }}>
          {model}
          <div className="relative px-4">
            <div className="mx-auto w-44 h-44 md:w-56 md:h-56 rounded-full border-4 border-white shadow-xl overflow-hidden mb-8 flex items-center justify-center bg-white/60">
              {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <Heart className="w-14 h-14 fill-current" style={{ color: 'var(--color-primary)' }} />}
            </div>
            {kicker}{names()}{dateLine}{hash}{scroll}
          </div>
        </section>
      );

    // Double-bordered crest box on a solid backdrop.
    case 'boxed':
      return (
        <section className="min-h-screen relative flex items-center justify-center pt-28 pb-12 px-4 overflow-hidden">
          {photo && <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
          {model}
          <div className="relative max-w-3xl w-full border-4 border-double p-2" style={{ borderColor: 'var(--color-primary)' }}>
            <div className="border p-8 md:p-16 text-center" style={{ borderColor: 'var(--color-primary)' }}>
              {kicker}{names()}{dateLine}{hash}{scroll}
            </div>
          </div>
        </section>
      );

    // Tilted polaroid card on a pastel backdrop.
    case 'polaroid':
      return (
        <section className="min-h-screen relative flex items-center justify-center pt-20 pb-12 text-center" style={{ background: 'color-mix(in srgb, var(--color-secondary) 45%, var(--color-bg))' }}>
          {model}
          <div className="relative px-4">
            {kicker}
            <div className="mx-auto bg-white p-3 pb-16 shadow-2xl w-64 md:w-80 -rotate-2 relative">
              <div className="aspect-square w-full overflow-hidden flex items-center justify-center" style={{ background: soft }}>
                {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <Heart className="w-14 h-14 fill-current" style={{ color: 'var(--color-primary)' }} />}
              </div>
              <h1 className="absolute bottom-3 inset-x-2 text-2xl md:text-3xl" style={{ fontFamily: fonts.heading, color: '#4B3A2E' }}>
                {couple.bride_name} &amp; {couple.groom_name}
              </h1>
            </div>
            {dateLine}{hash}
          </div>
        </section>
      );

    // Oversized left-aligned names bottom-left over a dark photo.
    case 'left':
      return (
        <section
          className="min-h-screen relative flex items-end pt-14 overflow-hidden"
          style={{ background: 'radial-gradient(circle at 15% 85%, color-mix(in srgb, var(--color-primary) 35%, transparent), transparent 55%), var(--color-bg)' }}
        >
          {photo && (
            <>
              <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--color-bg), transparent 70%)' }} />
            </>
          )}
          {model}
          <div className="relative max-w-6xl mx-auto w-full px-6 pb-16 md:pb-24">
            {kicker}{names()}{dateLine}{hash}
          </div>
        </section>
      );

    // Compact centered header with a wide photo banner underneath.
    case 'banner':
      return (
        <section className="relative pt-28 pb-12 text-center px-4">
          {model}
          <div className="relative">
            {kicker}{names()}{dateLine}{hash}
            {photo && <img src={photo} alt="" className="mt-10 mx-auto w-full max-w-5xl aspect-[16/8] object-cover rounded-2xl shadow-sm" />}
          </div>
        </section>
      );

    // 'center' - the original hero.
    default:
      return (
        <section className="min-h-screen flex items-center justify-center relative pt-14" style={{ background: `linear-gradient(135deg, ${colors.primary || '#f43f5e'}15, ${colors.secondary || '#eab308'}10)` }}>
          {photo && <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
          {model}
          <div className="relative text-center px-4 py-20">
            {kicker}{names()}{dateLine}{hash}{scroll}
          </div>
        </section>
      );
  }
}

// ─── Content sections ─────────────────────────────────────────────────────────

function EventBody({ e, align = 'left' }) {
  const { t, fonts } = useSite();
  const just = align === 'center' ? 'justify-center' : align === 'right' ? 'md:justify-end' : '';
  const row = `flex items-center gap-2 text-sm mb-1 ${t.muted} ${just}`;
  return (
    <>
      <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: fonts.heading }}>{e.title}</h3>
      {e.start_time && <div className={row}><Clock className="w-4 h-4 flex-shrink-0" />{format(new Date(e.start_time), 'PPp')}</div>}
      {e.venue_name && <div className={row}><MapPin className="w-4 h-4 flex-shrink-0" />{e.venue_name}{e.address ? `, ${e.address}` : ''}</div>}
      {e.dress_code && <p className={`text-sm ${t.faint} mt-2`}>Dress Code: {e.dress_code}</p>}
      {e.notes && <p className={`text-sm ${t.muted} mt-2`}>{e.notes}</p>}
      {e.maps_embed_url && (
        <a href={e.maps_embed_url} target="_blank" rel="noopener noreferrer" className={`mt-3 inline-flex items-center gap-1 text-sm font-medium ${just}`} style={{ color: 'var(--color-primary)' }}>
          <Map className="w-4 h-4" /> View Map
        </a>
      )}
    </>
  );
}

function Events({ events }) {
  const { t, fonts } = useSite();

  let body;
  if (t.events === 'list') {
    body = (
      <div>
        {events.map((e) => (
          <div key={e.id} className={`flex gap-5 md:gap-10 py-7 border-b ${t.line}`}>
            {e.start_time && (
              <div className="w-16 md:w-24 flex-shrink-0 text-center">
                <div className="text-4xl md:text-5xl font-light leading-none" style={{ color: 'var(--color-primary)', fontFamily: fonts.heading }}>{format(new Date(e.start_time), 'dd')}</div>
                <div className={`text-[11px] uppercase tracking-widest mt-2 ${t.muted}`}>{format(new Date(e.start_time), 'MMM yyyy')}</div>
              </div>
            )}
            <div className="flex-1 min-w-0"><EventBody e={e} /></div>
          </div>
        ))}
      </div>
    );
  } else if (t.events === 'stack') {
    body = (
      <div className="max-w-2xl mx-auto space-y-8 text-center">
        {events.map((e) => <div key={e.id} className={t.card}><EventBody e={e} align="center" /></div>)}
      </div>
    );
  } else if (t.events === 'timeline') {
    body = (
      <div className="relative">
        <div className="absolute top-0 bottom-0 left-3 md:left-1/2 w-px" style={{ background: 'color-mix(in srgb, var(--color-primary) 45%, transparent)' }} />
        {events.map((e, i) => {
          const even = i % 2 === 1; // left side on desktop
          return (
            <div key={e.id} className={`relative py-4 pl-10 md:pl-0 md:w-1/2 ${even ? 'md:pr-10 md:text-right md:mr-auto' : 'md:pl-10 md:ml-auto'}`}>
              <span
                className={`absolute top-8 left-3 -translate-x-1/2 w-3 h-3 rounded-full ${even ? 'md:left-auto md:right-0 md:translate-x-1/2' : 'md:left-0'}`}
                style={{ background: 'var(--color-primary)' }}
              />
              <div className={t.card}><EventBody e={e} align={even ? 'right' : 'left'} /></div>
            </div>
          );
        })}
      </div>
    );
  } else {
    body = (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((e) => <div key={e.id} className={t.card}><EventBody e={e} /></div>)}
      </div>
    );
  }

  return (
    <Section id="events" bg="B">
      <div className="max-w-5xl mx-auto px-4">
        <Title>Wedding Events</Title>
        {body}
      </div>
    </Section>
  );
}

function GalleryItem({ p, cls, onOpen, children }) {
  return (
    <button type="button" onClick={onOpen} className={`group relative cursor-pointer ${cls}`}>
      {children}
      <img src={p.thumbnail_url || p.media_url} alt={p.caption || ''} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" draggable={false} />
    </button>
  );
}

function Gallery({ gallery, onOpen }) {
  const { t } = useSite();
  const overlay = (p) => (
    <>
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center z-10">
        <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      {p.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <p className="text-white text-xs truncate text-left">{p.caption}</p>
        </div>
      )}
    </>
  );

  let body;
  if (t.gallery === 'grid') {
    body = (
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
        {gallery.map((p, i) => (
          <GalleryItem key={p.id} p={p} onOpen={() => onOpen(i)} cls={`aspect-square overflow-hidden bg-gray-100 ${t.galImg}`}>{overlay(p)}</GalleryItem>
        ))}
      </div>
    );
  } else if (t.gallery === 'polaroid') {
    body = (
      <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-5 md:gap-8">
        {gallery.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(i)}
            className="group relative bg-white p-2 pb-9 shadow-lg w-40 md:w-52 transition-transform duration-300 hover:!rotate-0 hover:scale-105"
            style={{ transform: `rotate(${[-3, 2, -1, 3, -2][i % 5]}deg)` }}
          >
            <img src={p.thumbnail_url || p.media_url} alt={p.caption || ''} className={`w-full aspect-square object-cover ${t.galImg}`} draggable={false} />
            {p.caption && <span className="absolute bottom-2 inset-x-2 text-center text-xs text-neutral-600 truncate">{p.caption}</span>}
          </button>
        ))}
      </div>
    );
  } else {
    // Auto-scrolling marquee: the photo list is rendered twice back to
    // back and animated exactly one set-width to the right on a loop,
    // so the seam between the end of set 1 and the start of set 2 is
    // invisible. Hover pauses it so guests can actually look/click.
    body = (
      <div className="overflow-hidden">
        <div className="flex gap-3 w-max animate-marquee-ltr hover:[animation-play-state:paused]">
          {[...gallery, ...gallery].map((p, i) => (
            <GalleryItem key={`${p.id}-${i}`} p={p} onOpen={() => onOpen(i % gallery.length)} cls={`flex-shrink-0 w-40 h-40 md:w-56 md:h-56 overflow-hidden bg-gray-100 ${t.galImg}`}>{overlay(p)}</GalleryItem>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Section id="gallery" bg="A" className="overflow-hidden">
      <div className="max-w-5xl mx-auto px-4"><Title>Photo Gallery</Title></div>
      {body}
    </Section>
  );
}

function Guestbook({ entries, register, onSubmit }) {
  const { t } = useSite();
  return (
    <Section id="guestbook" bg="B">
      <div className="max-w-3xl mx-auto px-4">
        <Title mb="mb-6">Guestbook</Title>
        <p className={`${t.center ? 'text-center' : ''} ${t.muted} mb-10`}>Leave us a message to cherish forever 💕</p>

        <form onSubmit={onSubmit} className={`${t.formCard} ${t.formCls}`}>
          <div className="space-y-4">
            <div>
              <label className="label">Your Name *</label>
              <input {...register('author_name', { required: true })} placeholder="Your name" className="input-field" />
            </div>
            <div>
              <label className="label">Your Message *</label>
              <textarea {...register('message_text', { required: true })} rows={4} placeholder="Write a heartfelt message..." className="input-field resize-none" />
            </div>
            <button type="submit" className={`w-full py-2.5 font-semibold transition-all ${t.onPrimary} ${t.submit}`} style={{ background: 'var(--color-primary)' }}>
              Submit Message 💌
            </button>
          </div>
        </form>

        {entries.length > 0 && (
          <div className="space-y-4">
            {entries.map((e) => (
              <div key={e.id} className={t.cardEntry}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${t.onPrimary}`} style={{ background: 'var(--color-primary)' }}>
                    {e.author_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <p className="font-semibold">{e.author_name}</p>
                </div>
                <p className={`${t.muted} leading-relaxed`}>"{e.message_text}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  // Run the theme's custom JS (if any) once the page data is in - a fresh
  // <script> element so the browser actually executes it (unlike a script
  // tag inserted via dangerouslySetInnerHTML, which browsers ignore).
  useEffect(() => {
    const js = data?.couple?.theme?.custom_js;
    if (!js) return;
    const script = document.createElement('script');
    script.textContent = js;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [data?.couple?.theme?.custom_js]);

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
  const t = getTemplate(couple.theme?.layout);

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

  const customHtml = couple.theme?.custom_html ? fillPlaceholders(couple.theme.custom_html, couple) : null;
  const customCss = couple.theme?.custom_css;
  const siteFonts = { heading: fonts.heading || 'Playfair Display', body: fonts.body || 'Inter' };

  return (
    <SiteCtx.Provider value={{ t, couple, colors, fonts: siteFonts }}>
      <div style={cssVars} className="min-h-screen">
        {customCss && <style>{customCss}</style>}
        <FloatingDecor colors={colors} shape={t.decor} />

        <Nav />
        <Hero />

        {/* Theme's custom section, if the admin added one */}
        {customHtml && <div dangerouslySetInnerHTML={{ __html: customHtml }} />}

        {/* Countdown */}
        {couple.wedding_date && new Date(couple.wedding_date) > new Date() && <CountdownTimer date={couple.wedding_date} />}

        {/* Our Story */}
        {couple.about_story && (
          <Section id="story" bg="A">
            <div className="max-w-3xl mx-auto px-4">
              <Title mb="mb-8">Our Story</Title>
              <p className={`${t.muted} leading-relaxed text-lg whitespace-pre-wrap ${t.center ? 'text-center' : ''}`}>{couple.about_story}</p>
            </div>
          </Section>
        )}

        {/* Events */}
        {events?.length > 0 && <Events events={events} />}

        {/* Travel */}
        {travel?.length > 0 && (
          <Section id="travel" bg="A">
            <div className="max-w-5xl mx-auto px-4">
              <Title>Travel & Accommodation</Title>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {travel.map(item => (
                  <div key={item.id} className={t.cardTravel}>
                    <p className={`text-xs uppercase tracking-wider ${t.faint} mb-1`}>{item.category}</p>
                    <h3 className="font-semibold">{item.title}</h3>
                    {item.description && <p className={`text-sm ${t.muted} mt-2 leading-relaxed`}>{item.description}</p>}
                    {item.discount_code && <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2"><p className="text-xs text-yellow-700">Code: <span className="font-mono font-bold">{item.discount_code}</span></p></div>}
                    <div className="flex gap-3 mt-3">
                      {item.booking_link && <a href={item.booking_link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>Book Now →</a>}
                      {item.maps_link && <a href={item.maps_link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-500">View Map →</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* Registry */}
        {registry?.length > 0 && (
          <Section id="registry" bg="B">
            <div className="max-w-5xl mx-auto px-4">
              <Title mb="mb-4">Registry</Title>
              <p className={`${t.center ? 'text-center' : ''} ${t.muted} mb-12`}>Your presence is our greatest gift, but if you'd like to give a little extra:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {registry.filter(r => !r.is_purchased).map(r => (
                  <div key={r.id} className={t.cardRegistry}>
                    <Gift className={`w-8 h-8 mx-auto mb-3 ${t.faint}`} />
                    <p className={`text-xs ${t.faint} uppercase`}>{r.store_name}</p>
                    <p className="font-semibold mt-1">{r.item_name}</p>
                    {r.price && <p className="font-bold mt-1" style={{ color: 'var(--color-primary)' }}>${Number(r.price).toLocaleString()}</p>}
                    {r.item_url && <a href={r.item_url} target="_blank" rel="noopener noreferrer" className={`mt-3 inline-block text-sm font-medium border px-4 py-1.5 transition-opacity hover:opacity-70 ${t.btn}`} style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>View Gift</a>}
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* Gallery */}
        {gallery?.length > 0 && <Gallery gallery={gallery} onOpen={setLightboxIndex} />}

        {/* Guestbook */}
        <Guestbook entries={guestbookEntries} register={register} onSubmit={handleSubmit(submitGuestbook)} />

        {/* Footer */}
        <footer className={`py-10 text-center ${t.footer}`}>
          <Heart className="w-6 h-6 mx-auto mb-3 fill-current" style={{ color: 'var(--color-primary)' }} />
          <p className="font-serif text-xl">{couple.bride_name} & {couple.groom_name}</p>
          {couple.wedding_date && <p className={`${t.faint} text-sm mt-1`}>{format(new Date(couple.wedding_date), 'MMMM d, yyyy')}</p>}
          <p className={`text-xs ${t.faint} mt-4`}>Made with ❤️ on SaveTheDate</p>
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
    </SiteCtx.Provider>
  );
}
