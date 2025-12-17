import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Loader2, RotateCcw } from 'lucide-react';

interface ModelViewerProps {
  url: string;
  autoRotate?: boolean;
  onSnapshot?: (dataUrl: string) => void;
  className?: string;
}

const ModelViewer: React.FC<ModelViewerProps> = ({ url, autoRotate = true, onSnapshot, className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b); // Slate 800-ish
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // CRITICAL: Prevent page scrolling when interacting on mobile so touch moves rotate model instead of scroll page
    renderer.domElement.style.touchAction = 'none';
    
    mountRef.current.innerHTML = ''; // Clear previous
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2;
    
    // Stop auto-rotation if user interacts
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
    });

    // Update snapshot when interaction ends (e.g. user rotates model to show specific angle)
    controls.addEventListener('end', () => {
      if (onSnapshot) {
         renderer.render(scene, camera);
         const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.8);
         onSnapshot(dataUrl);
      }
    });

    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(2, 5, 2);
    scene.add(dirLight);

    // Load Model
    const loader = new GLTFLoader();
    
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        
        // Auto-center and scale
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Reset position
        model.position.x += (model.position.x - center.x);
        model.position.y += (model.position.y - center.y);
        model.position.z += (model.position.z - center.z);
        
        // Scale to fit
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.set(scale, scale, scale);

        scene.add(model);
        setLoading(false);

        // Take initial snapshot
        if (onSnapshot) {
          setTimeout(() => {
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
                const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.8);
                onSnapshot(dataUrl);
            }
          }, 500);
        }
      },
      undefined,
      (err) => {
        console.error("Error loading model:", err);
        setError("Failed to load model");
        setLoading(false);
      }
    );

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (controls) controls.update();
      if (renderer && scene && camera) renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
      if (mountRef.current && renderer.domElement) {
         // eslint-disable-next-line react-hooks/exhaustive-deps
         if (mountRef.current.contains(renderer.domElement)) {
            mountRef.current.removeChild(renderer.domElement);
         }
      }
    };
  }, [url, autoRotate]);

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.autoRotate = autoRotate;
    }
  };

  return (
    <div className={`relative w-full h-full rounded-lg overflow-hidden group ${className}`}>
      {/* Explicit touch-none class to prevent scroll interference */}
      <div ref={mountRef} className="w-full h-full cursor-move touch-none" />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 backdrop-blur-sm z-10">
          <Loader2 className="animate-spin text-white" size={24} />
          <span className="ml-2 text-sm text-white font-medium">Loading...</span>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 z-10">
          <span className="text-white text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Controls Overlay */}
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
         <button 
           onClick={handleReset}
           className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md backdrop-blur-sm transition-colors"
           title="Reset View"
         >
           <RotateCcw size={14} />
         </button>
      </div>

      <div className="absolute bottom-2 left-2 bg-black/50 text-[10px] text-white px-2 py-1 rounded backdrop-blur pointer-events-none select-none">
        Drag to Rotate • Scroll to Zoom
      </div>
    </div>
  );
};

export default ModelViewer;