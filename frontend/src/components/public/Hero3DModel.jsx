import { Component, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Center, OrbitControls } from '@react-three/drei';

// A bad/unreachable model URL throws inside the Canvas's render tree, which
// plain try/catch can't intercept - only an error boundary can, and without
// one that failure would take down the entire public website page for guests.
class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function Model({ url }) {
  const { scene } = useGLTF(url);
  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

// Renders a couple's theme's 3D model (.glb/.gltf) rotating in the hero -
// purely decorative, so any load failure just renders nothing rather than
// breaking the page.
export default function Hero3DModel({ url, className = '' }) {
  if (!url) return null;

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <ModelErrorBoundary>
        <Canvas camera={{ position: [0, 0, 4], fov: 40 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 3]} intensity={1.2} />
          <directionalLight position={[-3, -2, -3]} intensity={0.4} />
          <Suspense fallback={null}>
            <Model url={url} />
          </Suspense>
          <OrbitControls
            autoRotate
            autoRotateSpeed={2.2}
            enableZoom={false}
            enablePan={false}
            makeDefault
          />
        </Canvas>
      </ModelErrorBoundary>
    </div>
  );
}
