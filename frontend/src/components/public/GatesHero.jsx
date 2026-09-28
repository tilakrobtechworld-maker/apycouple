import { Component, Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Sparkles, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// Scroll-driven hero for the "Royal Gates" template: a tall scroll track holds a
// sticky full-screen three.js scene. As the guest scrolls, two massive old-world
// wooden gates (iron-strapped, brass-studded, set in an aged stone arch and lit by
// flickering torches) swing open, the camera glides through them, the couple's
// names appear in the light behind, and the scene dissolves into the rest of the page.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => x * x * (3 - 2 * x);

// Anything inside the WebGL scene can throw (e.g. a bad cover-photo URL) and
// plain try/catch can't intercept that - a boundary keeps the page alive.
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback ?? null : this.props.children; }
}

// ─── Geometry constants ───────────────────────────────────────────────────────
const W = 1.6;      // width of one gate leaf (opening is 2W wide)
const FLOOR = -2.1; // ground level
const Y0 = 0.6;     // where the round arch springs from

// Round-arched opening outline, `r` wide on each side of centre.
const archPath = (r, path = new THREE.Path(), bottom = FLOOR) => {
  path.moveTo(-r, bottom);
  path.lineTo(r, bottom);
  path.lineTo(r, Y0);
  path.absarc(0, Y0, r, 0, Math.PI, false);
  path.lineTo(-r, bottom);
  return path;
};

// ─── Procedural aged textures (no network, no image assets) ───────────────────
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const woodTexture = () => canvasTexture(512, (g, S) => {
  const r = rng(11);
  const planks = 6;
  const pw = S / planks;
  for (let i = 0; i < planks; i++) {
    const x0 = i * pw;
    g.fillStyle = `hsl(${22 + r() * 6} ${38 + r() * 10}% ${20 + r() * 8}%)`;
    g.fillRect(x0, 0, pw, S);
    for (let k = 0; k < 70; k++) { // wavy grain
      const x = x0 + r() * pw;
      g.strokeStyle = `rgba(15,7,3,${0.08 + r() * 0.2})`;
      g.lineWidth = 0.5 + r() * 1.6;
      g.beginPath();
      g.moveTo(x, 0);
      for (let y = 32; y <= S; y += 32) g.lineTo(x + (r() - 0.5) * 5, y);
      g.stroke();
    }
    for (let k = 0; k < 2; k++) { // knots
      const kx = x0 + pw * (0.25 + r() * 0.5), ky = r() * S;
      g.strokeStyle = 'rgba(12,5,2,0.55)';
      for (let rr = 3; rr < 11; rr += 3) { g.lineWidth = 1.2; g.beginPath(); g.ellipse(kx, ky, rr * 0.7, rr * 1.4, 0, 0, Math.PI * 2); g.stroke(); }
    }
    g.fillStyle = 'rgba(8,4,2,0.9)'; // gap between planks
    g.fillRect(x0, 0, 3, S);
  }
  for (let i = 0; i < 2500; i++) { // dust / wear
    g.fillStyle = `rgba(255,225,180,${r() * 0.05})`;
    g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 3);
  }
});

const stoneTexture = () => canvasTexture(512, (g, S) => {
  const r = rng(29);
  const rows = 4;
  const rh = S / rows;
  g.fillStyle = '#2a251f';
  g.fillRect(0, 0, S, S);
  for (let row = 0; row < rows; row++) {
    let x = -(row % 2) * (S / 4);
    while (x < S) {
      const bw = 130 + r() * 110;
      g.fillStyle = `hsl(${32 + r() * 8} ${9 + r() * 7}% ${40 + r() * 13}%)`;
      g.fillRect(x + 2, row * rh + 2, bw - 4, rh - 4);
      x += bw;
    }
  }
  for (let i = 0; i < 5000; i++) { // weathering speckle
    g.fillStyle = r() > 0.5 ? `rgba(0,0,0,${r() * 0.14})` : `rgba(255,245,225,${r() * 0.07})`;
    g.fillRect(r() * S, r() * S, 1 + r() * 2.5, 1 + r() * 2.5);
  }
  for (let i = 0; i < 6; i++) { // soot / damp stains
    const sx = r() * S, sy = r() * S; // same centre for both circles, or the gradient becomes a cone
    const gr = g.createRadialGradient(sx, sy, 0, sx, sy, 60 + r() * 80);
    gr.addColorStop(0, 'rgba(10,8,5,0.16)'); gr.addColorStop(1, 'rgba(10,8,5,0)');
    g.fillStyle = gr; g.fillRect(sx - 160, sy - 160, 320, 320);
  }
});

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

// ─── Scene parts ──────────────────────────────────────────────────────────────

// Many small brass studs/rivets as a single instanced mesh.
function Studs({ points, material, radius = 0.05 }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    points.forEach(([x, y, z], i) => {
      m.makeScale(1, 1, 0.6).setPosition(x, y, z);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [points]);
  return (
    <instancedMesh ref={ref} args={[null, null, points.length]} material={material}>
      <sphereGeometry args={[radius, 10, 8]} />
    </instancedMesh>
  );
}

// One leaf of the gate, hinge at origin extending toward +x. Its top edge is a
// quarter-circle so the two leaves together close into a round-arched door.
function Leaf({ mats }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, FLOOR);
    s.lineTo(W, FLOOR);
    s.lineTo(W, Y0 + W);
    s.absarc(W, Y0, W, Math.PI / 2, Math.PI, false);
    s.lineTo(0, FLOOR);
    return new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1, curveSegments: 28 });
  }, []);
  const archBand = useMemo(() => {
    const r = W - 0.07;
    const pts = Array.from({ length: 25 }, (_, i) => {
      const a = Math.PI / 2 + (i / 24) * (Math.PI / 2);
      return new THREE.Vector3(W + r * Math.cos(a), Y0 + r * Math.sin(a), 0);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.03, 6);
  }, []);
  const strapYs = [-1.55, -0.5, 0.42];
  const rivets = useMemo(() => {
    const p = [];
    strapYs.forEach((y) => { for (let i = 0; i < 8; i++) p.push([0.2 + i * 0.18, y, 0.1]); });
    [-1.95, -1.03, -0.05, 0.95, 1.3].forEach((y) => { for (let i = 0; i < 4; i++) p.push([0.32 + i * 0.38, y, 0.095]); });
    return p;
  }, []);

  return (
    <group position={[0, 0, -0.07]}>
      <mesh geometry={geo} material={mats.wood} />
      {/* everything below sits on the plank face (front of the wood is at z ~ 0.155) */}
      <group position={[0, 0, 0.085]}>
        {/* iron border: hinge edge, meeting edge and the arched top */}
        <mesh position={[0.05, (FLOOR + Y0) / 2, 0.085]} material={mats.iron}><boxGeometry args={[0.1, Y0 - FLOOR, 0.04]} /></mesh>
        <mesh position={[W - 0.05, (FLOOR + Y0 + W) / 2, 0.085]} material={mats.iron}><boxGeometry args={[0.1, Y0 + W - FLOOR, 0.04]} /></mesh>
        <mesh geometry={archBand} material={mats.iron} position={[0, 0, 0.085]} />
        {/* horizontal iron straps */}
        {strapYs.map((y) => (
          <mesh key={y} position={[W / 2, y, 0.085]} material={mats.iron}><boxGeometry args={[W - 0.1, 0.15, 0.03]} /></mesh>
        ))}
        {/* hinges */}
        {[-1.55, -0.5, 0.42].map((y) => (
          <group key={y} position={[0, y, 0.11]}>
            <mesh position={[0.3, 0, 0]} material={mats.iron}><boxGeometry args={[0.6, 0.09, 0.03]} /></mesh>
            <mesh material={mats.iron}><cylinderGeometry args={[0.055, 0.055, 0.22, 10]} /></mesh>
          </group>
        ))}
        <Studs points={rivets} material={mats.brass} />
        {/* lion-head boss + ring knocker */}
        <group position={[W - 0.42, -0.32, 0.09]}>
          <mesh material={mats.brass}><sphereGeometry args={[0.12, 16, 12]} /></mesh>
          <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]} material={mats.brass}><coneGeometry args={[0.05, 0.1, 10]} /></mesh>
          <mesh position={[0, -0.2, 0.02]} material={mats.brass}><torusGeometry args={[0.19, 0.03, 10, 36]} /></mesh>
        </group>
      </group>
    </group>
  );
}

// Wall-mounted torch with a flickering flame and light.
function Torch({ x, mats, seed }) {
  const light = useRef();
  const flame = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + seed;
    const f = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 5.3) + 0.08 * Math.sin(t * 29);
    light.current.intensity = 7 * f;
    flame.current.scale.set(1, 0.9 + 0.25 * f, 1);
  });
  return (
    <group position={[x, 0.2, 0.55]}>
      <mesh position={[0, -0.05, -0.15]} material={mats.iron}><boxGeometry args={[0.1, 0.1, 0.35]} /></mesh>
      <mesh position={[0, 0, 0]} rotation={[0.12, 0, 0]} material={mats.wood}><cylinderGeometry args={[0.055, 0.04, 0.6, 10]} /></mesh>
      <mesh position={[0, 0.34, 0]} material={mats.iron}><cylinderGeometry args={[0.09, 0.05, 0.12, 12]} /></mesh>
      <mesh ref={flame} position={[0, 0.5, 0]}>
        <coneGeometry args={[0.09, 0.3, 12]} />
        <meshBasicMaterial color="#ffa53a" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.55, 0.15]} color="#ff9a3c" intensity={7} distance={7} decay={2} />
    </group>
  );
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

  const { mats, wallGeos, ringGeo } = useMemo(() => {
    const wood = woodTexture();
    wood.repeat.set(1 / W, 1 / (Y0 + W - FLOOR));
    const stone = stoneTexture();
    stone.repeat.set(0.28, 0.28);
    const floorTex = stoneTexture();
    floorTex.repeat.set(0.5, 0.5);
    // The wall around the arch is built from small pieces (rectangles + two
    // corner "spandrels") instead of one big polygon with a hole - the latter
    // triangulates into very long slivers that show up as texture artifacts.
    const R = W + 0.4; // outer radius of the arch ring
    const rect = (x0, y0, x1, y1) => {
      const s = new THREE.Shape();
      s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath();
      return s;
    };
    const spandrel = (sign) => {
      const s = new THREE.Shape();
      s.moveTo(sign * R, Y0); s.lineTo(sign * R, Y0 + R); s.lineTo(0, Y0 + R);
      s.absarc(0, Y0, R, Math.PI / 2, sign > 0 ? 0 : Math.PI, sign > 0);
      return s;
    };
    const wallShapes = [rect(-30, -8, -R, 9), rect(R, -8, 30, 9), rect(-R, Y0 + R, R, 9), spandrel(1), spandrel(-1)];
    const ring = new THREE.Shape();
    // outer edge reaches below the floor so the opening's bottom edge doesn't
    // coincide with it (a degenerate hole makes the triangulation spill over)
    archPath(W + 0.4, ring, FLOOR - 1);
    ring.holes.push(archPath(W));
    return {
      mats: {
        wood: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.88, metalness: 0.02, color: '#c9a483' }),
        iron: new THREE.MeshStandardMaterial({ color: '#25211d', roughness: 0.55, metalness: 0.85 }),
        brass: new THREE.MeshStandardMaterial({ color: '#b98d3a', roughness: 0.35, metalness: 1, envMapIntensity: 1.2 }),
        stone: new THREE.MeshStandardMaterial({ map: stone, roughness: 0.95, metalness: 0, color: '#d8ccb8' }),
        ring: new THREE.MeshStandardMaterial({ map: stone, roughness: 0.9, metalness: 0, color: '#eadfc9' }),
        floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.05, color: '#8a7f70' }),
      },
      wallGeos: wallShapes.map((s) => new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false, curveSegments: 40 })),
      ringGeo: new THREE.ExtrudeGeometry(ring, { depth: 1.1, bevelEnabled: false, curveSegments: 40 }),
    };
  }, []);

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
      <ambientLight intensity={0.55} color="#ffe6c4" />
      <directionalLight position={[2, 3, 6]} intensity={1.3} color="#ffd9a3" />
      <pointLight ref={back} position={[0, 1, -3]} color="#ffd58a" intensity={1} distance={22} decay={2} />

      <Environment resolution={128}>
        <Lightformer form="rect" intensity={1.8} position={[0, 3, 4]} scale={[9, 2, 1]} color="#ffd9a0" />
        <Lightformer form="rect" intensity={1} position={[-5, 0, 2]} scale={[2, 7, 1]} color="#ffb060" />
        <Lightformer form="rect" intensity={1} position={[5, 0, 2]} scale={[2, 7, 1]} color="#ffb060" />
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
      <Sparkles count={90} scale={[12, 7, 9]} size={3} speed={0.3} color="#ffcf80" position={[0, 0, -2]} />

      <group scale={gs}>
        {/* aged stone wall with a round-arched opening, plus a raised stone arch ring */}
        {wallGeos.map((g, i) => <mesh key={i} geometry={g} material={mats.stone} position={[0, 0, -0.65]} />)}
        <mesh geometry={ringGeo} material={mats.ring} position={[0, 0, -0.65]} />
        {/* flagstone floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, -6]} material={mats.floor}>
          <planeGeometry args={[40, 30]} />
        </mesh>
        <Torch x={-(W + 1.1)} mats={mats} seed={0} />
        <Torch x={W + 1.1} mats={mats} seed={2.4} />
        {/* the two leaves, hinged at the outer edges, swinging away from the viewer */}
        <group ref={left} position={[-W, 0, 0]}><Leaf mats={mats} /></group>
        <group ref={right} position={[W, 0, 0]} scale={[-1, 1, 1]}><Leaf mats={mats} /></group>
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
