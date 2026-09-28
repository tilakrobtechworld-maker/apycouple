import { Component, Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Sparkles, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// Scroll-driven hero for the "Royal Gates" template: a tall scroll track holds a
// sticky full-screen three.js scene. As the guest scrolls, two ornate gates swing
// open, the camera glides through them, the couple's names appear in the light
// behind, and the scene dissolves into the rest of the page.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => x * x * (3 - 2 * x);

// Anything inside the WebGL scene can throw (e.g. a bad cover-photo URL) and
// plain try/catch can't intercept that - a boundary keeps the page alive.
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback ?? null : this.props.children; }
}

const GOLD = { color: '#c9a13b', metalness: 1, roughness: 0.3, envMapIntensity: 1.3 };
const W = 1.6; // width of one gate leaf
const H = 4.2; // height of the gate

// One leaf of the gate, drawn hinge-at-origin extending toward +x.
function Leaf() {
  const bars = 6;
  return (
    <group position={[W / 2, 0, 0]}>
      {/* frame */}
      <mesh position={[-W / 2 + 0.06, 0, 0]}><boxGeometry args={[0.12, H, 0.12]} /><meshStandardMaterial {...GOLD} /></mesh>
      <mesh position={[W / 2 - 0.06, 0, 0]}><boxGeometry args={[0.12, H, 0.12]} /><meshStandardMaterial {...GOLD} /></mesh>
      {[H / 2 - 0.07, 0, -H / 2 + 0.07].map((y) => (
        <mesh key={y} position={[0, y, 0]}><boxGeometry args={[W, 0.14, 0.12]} /><meshStandardMaterial {...GOLD} /></mesh>
      ))}
      {/* bars with spear tips */}
      {Array.from({ length: bars }, (_, i) => {
        const x = -W / 2 + ((i + 1) * W) / (bars + 1);
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh><cylinderGeometry args={[0.022, 0.022, H, 10]} /><meshStandardMaterial {...GOLD} /></mesh>
            <mesh position={[0, H / 2 + 0.09, 0]}><coneGeometry args={[0.055, 0.2, 10]} /><meshStandardMaterial {...GOLD} /></mesh>
          </group>
        );
      })}
      {/* medallion */}
      <mesh position={[0, 0, 0.02]}><torusGeometry args={[0.36, 0.03, 12, 48]} /><meshStandardMaterial {...GOLD} /></mesh>
      <mesh position={[0, 0, 0.02]}><torusGeometry args={[0.2, 0.02, 12, 40]} /><meshStandardMaterial {...GOLD} /></mesh>
      <mesh position={[0, 0, 0.02]}><sphereGeometry args={[0.07, 16, 16]} /><meshStandardMaterial {...GOLD} /></mesh>
    </group>
  );
}

// Soft warm radial glow used as the "light behind the gates".
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,236,190,1)');
    grad.addColorStop(0.35, 'rgba(255,205,120,0.55)');
    grad.addColorStop(1, 'rgba(255,190,90,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
}

function PhotoPlane({ url, matRef }) {
  const tex = useTexture(url);
  return (
    <mesh position={[0, 0.6, -8.4]}>
      <planeGeometry args={[13, 8.5]} />
      <meshBasicMaterial ref={matRef} map={tex} transparent opacity={0} toneMapped={false} />
    </mesh>
  );
}

function Scene({ progress, photo, bg }) {
  const left = useRef();
  const right = useRef();
  const glow = useRef();
  const back = useRef();
  const photoMat = useRef();
  const size = useThree((s) => s.size);
  const glowTex = useGlowTexture();
  const aspect = size.width / size.height;
  const gs = Math.min(1.5, Math.max(1, aspect * 0.9)); // scale the gates up on wide screens
  const startZ = aspect < 1 ? 8.6 : 7.4;

  useFrame((state) => {
    const p = progress.get();
    const open = ease(clamp((p - 0.12) / 0.5));
    const angle = open * Math.PI * 0.46;
    left.current.rotation.y = angle;
    right.current.rotation.y = -angle;

    // glide through the opened gates
    const cam = state.camera;
    cam.position.z = startZ - ease(clamp((p - 0.05) / 0.82)) * (startZ - 1.2);
    cam.position.x += (state.pointer.x * 0.35 - cam.position.x) * 0.05;
    cam.position.y += (0.2 + state.pointer.y * 0.2 - cam.position.y) * 0.05;
    cam.lookAt(0, 0.1, -4);

    back.current.intensity = 1 + open * 90;
    glow.current.material.opacity = 0.2 + open * 0.8;
    if (photoMat.current) photoMat.current.opacity = open * 0.85;
  });

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 8, 26]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 6]} intensity={1.4} color="#ffe9c4" />
      <pointLight ref={back} position={[0, 1, -3]} color="#ffd58a" intensity={1} distance={22} decay={2} />

      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 3, 4]} scale={[9, 2, 1]} color="#ffe2a8" />
        <Lightformer form="rect" intensity={1.2} position={[-5, 0, 2]} scale={[2, 7, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.2} position={[5, 0, 2]} scale={[2, 7, 1]} color="#ffffff" />
      </Environment>

      {/* what's behind the gates */}
      <mesh ref={glow} position={[0, 0.4, -9]}>
        <planeGeometry args={[34, 22]} />
        <meshBasicMaterial map={glowTex} transparent opacity={0.2} depthWrite={false} toneMapped={false} />
      </mesh>
      {photo && (
        <Boundary>
          <Suspense fallback={null}><PhotoPlane url={photo} matRef={photoMat} /></Suspense>
        </Boundary>
      )}
      <Sparkles count={110} scale={[12, 7, 9]} size={3.5} speed={0.35} color="#ffd98a" position={[0, 0, -2]} />

      <group scale={gs}>
        {/* wall + lintel around the opening */}
        <mesh position={[-(W + 15), 0, -0.2]}><boxGeometry args={[30, 14, 0.8]} /><meshStandardMaterial color="#141a33" roughness={0.9} /></mesh>
        <mesh position={[W + 15, 0, -0.2]}><boxGeometry args={[30, 14, 0.8]} /><meshStandardMaterial color="#141a33" roughness={0.9} /></mesh>
        <mesh position={[0, H / 2 + 3, -0.2]}><boxGeometry args={[W * 2, 6, 0.8]} /><meshStandardMaterial color="#141a33" roughness={0.9} /></mesh>
        {/* gold trim + finials */}
        <mesh position={[0, H / 2 + 0.06, 0.25]}><boxGeometry args={[W * 2 + 0.5, 0.16, 0.1]} /><meshStandardMaterial {...GOLD} /></mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * (W + 0.06), 0, 0.25]}><boxGeometry args={[0.14, H + 0.3, 0.1]} /><meshStandardMaterial {...GOLD} /></mesh>
            <mesh position={[s * (W + 0.06), H / 2 + 0.32, 0.25]}><sphereGeometry args={[0.16, 20, 20]} /><meshStandardMaterial {...GOLD} /></mesh>
          </group>
        ))}
        {/* floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -H / 2, -6]}>
          <planeGeometry args={[40, 30]} /><meshStandardMaterial color="#0c1024" roughness={0.6} metalness={0.2} />
        </mesh>
        {/* the two leaves, hinged at the outer edges, swinging away from the viewer */}
        <group ref={left} position={[-W, 0, 0.05]}><Leaf /></group>
        <group ref={right} position={[W, 0, 0.05]} scale={[-1, 1, 1]}><Leaf /></group>
      </group>
    </>
  );
}

// Names/date/hash simply centered on a dark backdrop (no WebGL, or reduced motion).
function StaticHero({ couple, t, fonts, date }) {
  return (
    <section
      className="min-h-screen flex items-center justify-center text-center px-4 pt-20 relative overflow-hidden"
      style={{ background: 'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--color-primary) 30%, transparent), transparent 60%), var(--color-bg)' }}
    >
      <div>
        <p className={t.kickerCls}>{t.kicker}</p>
        <h1 className={t.h1} style={{ fontFamily: fonts.heading, color: 'var(--color-text)' }}>
          {couple.bride_name}{t.inlineNames ? ' ' : <br />}
          <span className={t.amp} style={{ color: 'var(--color-primary)' }}>&amp;</span>
          {t.inlineNames ? ' ' : <br />}{couple.groom_name}
        </h1>
        {date && <p className={t.dateCls}>{date}</p>}
        {couple.wedding_hashtag && <p className={`mt-2 text-sm ${t.faint}`}>#{couple.wedding_hashtag}</p>}
      </div>
    </section>
  );
}

function GatesScroll({ couple, colors, fonts, t, date }) {
  const track = useRef(null);
  const inView = useInView(track, { margin: '200px 0px' });
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 });

  const monogramOpacity = useTransform(progress, [0, 0.1], [1, 0]);
  const hintOpacity = useTransform(progress, [0, 0.06], [1, 0]);
  const namesOpacity = useTransform(progress, [0.3, 0.44, 0.7, 0.84], [0, 1, 1, 0]);
  const namesScale = useTransform(progress, [0.3, 0.6], [0.86, 1]);
  const namesY = useTransform(progress, [0.3, 0.6, 0.84], [30, 0, -30]);
  const fadeOut = useTransform(progress, [0.82, 1], [0, 1]);

  const bg = colors.background || '#0B1020';

  return (
    <div ref={track} className="relative" style={{ height: '340vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden" style={{ background: bg }}>
        <Boundary>
          <Canvas camera={{ position: [0, 0.2, 7.4], fov: 50 }} dpr={[1, 1.5]} frameloop={inView ? 'always' : 'never'}>
            <Scene progress={progress} photo={couple.cover_photo_url} bg={bg} />
          </Canvas>
        </Boundary>

        {/* monogram on the closed gates */}
        <motion.div style={{ opacity: monogramOpacity }} className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center pointer-events-none">
          <p className={`${t.kickerCls} !mb-4`} style={{ color: 'var(--color-primary)' }}>{t.kicker}</p>
          <p className="text-5xl md:text-7xl tracking-[0.2em]" style={{ fontFamily: fonts.heading, color: 'var(--color-primary)', textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
            {(couple.bride_name || '')[0]} &amp; {(couple.groom_name || '')[0]}
          </p>
        </motion.div>

        {/* names revealed as the gates open */}
        <motion.div style={{ opacity: namesOpacity, scale: namesScale, y: namesY }} className="absolute inset-0 z-10 flex items-center justify-center text-center px-4 pointer-events-none">
          <div style={{ textShadow: '0 2px 30px rgba(0,0,0,0.7)' }}>
            <h1 className={t.h1} style={{ fontFamily: fonts.heading, color: '#fff7e0' }}>
              {couple.bride_name}{t.inlineNames ? ' ' : <br />}
              <span className={t.amp} style={{ color: 'var(--color-primary)' }}>&amp;</span>
              {t.inlineNames ? ' ' : <br />}{couple.groom_name}
            </h1>
            {date && <p className={t.dateCls} style={{ color: '#fff7e0' }}>{date}</p>}
            {couple.wedding_hashtag && <p className="mt-2 text-sm" style={{ color: '#fff7e0', opacity: 0.7 }}>#{couple.wedding_hashtag}</p>}
          </div>
        </motion.div>

        <motion.div style={{ opacity: hintOpacity }} className="absolute bottom-8 inset-x-0 z-10 flex flex-col items-center text-xs uppercase tracking-[0.3em] pointer-events-none" aria-hidden="true">
          <span style={{ color: 'var(--color-primary)' }}>Scroll to open</span>
          <ChevronDown className="w-5 h-5 mt-2 animate-bounce" style={{ color: 'var(--color-primary)' }} />
        </motion.div>

        {/* dissolve into the page */}
        <motion.div style={{ opacity: fadeOut, background: 'var(--color-bg)' }} className="absolute inset-0 z-20 pointer-events-none" />
      </div>
    </div>
  );
}

export default function GatesHero(props) {
  const reduce = useReducedMotion();
  const webgl = useMemo(() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { return false; }
  }, []);

  if (reduce || !webgl) return <StaticHero {...props} />;
  return <GatesScroll {...props} />;
}
