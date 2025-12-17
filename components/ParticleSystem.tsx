import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, Heart, Sun, Cloud, Zap, Disc } from 'lucide-react';
import clsx from 'clsx';

interface ParticleSystemProps {
  onClose: () => void;
}

type ShapeType = 'sphere' | 'heart' | 'flower' | 'saturn' | 'sun' | 'fireworks';

const ParticleSystem: React.FC<ParticleSystemProps> = ({ onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const [currentShape, setCurrentShape] = useState<ShapeType>('heart');
  const [status, setStatus] = useState('Initializing Holo-Deck...');

  useEffect(() => {
    // --- THREE.JS SETUP ---
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.001);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 50;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // --- PARTICLES SETUP ---
    const particleCount = 15000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const targetPositions = new Float32Array(particleCount * 3); // Where particles want to go
    const velocities = new Float32Array(particleCount * 3); // For physics

    // Initialize random positions
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom Shader Material for nice glowing dots
    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // --- SHAPE GENERATORS ---
    const generateShape = (type: ShapeType) => {
      const newTargets = new Float32Array(particleCount * 3);
      const newColors = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        let x = 0, y = 0, z = 0;
        let r = 1, g = 1, b = 1;

        if (type === 'heart') {
          // Heart Formula
          const t = Math.random() * Math.PI * 2;
          const u = Math.random() * Math.PI; // randomness
          const scale = 1.5;
          // Basic 2D heart projected to 3D volume
          // x = 16sin^3(t)
          // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
          const phi = Math.random() * Math.PI * 2;
          const theta = Math.random() * Math.PI;
          
          // Using a reliable 3D heart approximation
          x = 16 * Math.pow(Math.sin(phi), 3);
          y = 13 * Math.cos(phi) - 5 * Math.cos(2 * phi) - 2 * Math.cos(3 * phi) - Math.cos(4 * phi);
          z = (Math.random() - 0.5) * 10; // Thickness

          x *= scale;
          y *= scale;
          z *= scale;

          r = 1.0;
          g = 0.2;
          b = 0.5 + Math.random() * 0.5;
        } 
        else if (type === 'sphere') {
           const radius = 25;
           const phi = Math.acos(-1 + (2 * i) / particleCount);
           const theta = Math.sqrt(particleCount * Math.PI) * phi;
           x = radius * Math.cos(theta) * Math.sin(phi);
           y = radius * Math.sin(theta) * Math.sin(phi);
           z = radius * Math.cos(phi);
           
           r = 0.2; g = 0.8; b = 1.0;
        }
        else if (type === 'flower') {
            // Phyllotaxis
            const spread = 0.5;
            const scale = 10;
            const angle = i * 137.5 * (Math.PI / 180);
            const radius = scale * Math.sqrt(i) * 0.05;
            
            x = radius * Math.cos(angle) * spread * 20;
            y = radius * Math.sin(angle) * spread * 20;
            z = (Math.random() - 0.5) * 5 + Math.sin(radius) * 5;

            r = 1.0; g = 0.5 + Math.random() * 0.5; b = 0.2;
        }
        else if (type === 'saturn') {
            const isRing = Math.random() > 0.4;
            if (isRing) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 30 + Math.random() * 15;
                x = Math.cos(angle) * dist;
                z = Math.sin(angle) * dist;
                y = (Math.random() - 0.5) * 2; // Flat ring
                r = 0.8; g = 0.7; b = 0.4; // Dusty
            } else {
                // Planet body
                const radius = 15;
                const phi = Math.acos(-1 + (2 * Math.random()));
                const theta = Math.sqrt(particleCount * Math.PI) * phi;
                x = radius * Math.cos(theta) * Math.sin(phi);
                y = radius * Math.sin(theta) * Math.sin(phi);
                z = radius * Math.cos(phi);
                r = 0.9; g = 0.8; b = 0.6;
            }
            // Tilt Saturn
            const tilt = 0.4;
            const yOld = y;
            y = y * Math.cos(tilt) - z * Math.sin(tilt);
            z = yOld * Math.sin(tilt) + z * Math.cos(tilt);
        }
        else if (type === 'sun') {
             const radius = 20 + Math.random() * 5; // Corona effect
             const phi = Math.random() * Math.PI * 2;
             const theta = Math.random() * Math.PI;
             x = radius * Math.sin(theta) * Math.cos(phi);
             y = radius * Math.sin(theta) * Math.sin(phi);
             z = radius * Math.cos(theta);
             
             r = 1.0; g = 0.6 + Math.random() * 0.4; b = 0.1;
        }
        else if (type === 'fireworks') {
            // Explosion from center
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const r_dist = 40 * Math.cbrt(Math.random()); // Volume filling
            x = r_dist * Math.sin(phi) * Math.cos(theta);
            y = r_dist * Math.sin(phi) * Math.sin(theta);
            z = r_dist * Math.cos(phi);

            r = Math.random(); g = Math.random(); b = Math.random();
        }

        newTargets[i * 3] = x;
        newTargets[i * 3 + 1] = y;
        newTargets[i * 3 + 2] = z;

        newColors[i * 3] = r;
        newColors[i * 3 + 1] = g;
        newColors[i * 3 + 2] = b;
      }

      // Smoothly update targetPositions
      for(let j=0; j<targetPositions.length; j++) {
        targetPositions[j] = newTargets[j];
        // We will blend colors in the loop
      }
      
      // Update color attribute immediately for snap effect or lerp later
      particles.geometry.attributes.color.array.set(newColors);
      particles.geometry.attributes.color.needsUpdate = true;
    };

    // Initialize with heart
    generateShape('heart');

    // --- WEBCAM & MOTION DETECTION ---
    let motionX = 0;
    let motionY = 0;
    let motionAmount = 0;

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setStatus('Gesture Control Active. Wave your hands!');
        } catch (e) {
            console.error(e);
            setStatus('Camera access denied. Mouse/Touch only.');
        }
    };
    startWebcam();

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    let prevFrameData: Uint8ClampedArray | null = null;
    const detectionCanvas = canvasRef.current;
    detectionCanvas.width = 64; // Low res for performance
    detectionCanvas.height = 48;
    const ctx = detectionCanvas.getContext('2d', { willReadFrequently: true });

    const animate = () => {
        requestAnimationFrame(animate);

        const time = clock.getElapsedTime();
        const positions = particles.geometry.attributes.position.array as Float32Array;
        
        // --- MOTION DETECTION LOGIC ---
        if (videoRef.current.readyState === 4 && ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 64, 48);
            const frameData = ctx.getImageData(0, 0, 64, 48).data;

            if (prevFrameData) {
                let sumX = 0;
                let sumY = 0;
                let totalDiff = 0;

                for (let i = 0; i < frameData.length; i += 4) {
                    // Simple grayscale difference
                    const diff = Math.abs(frameData[i] - prevFrameData[i]) + 
                                 Math.abs(frameData[i+1] - prevFrameData[i+1]) + 
                                 Math.abs(frameData[i+2] - prevFrameData[i+2]);
                    
                    if (diff > 100) { // Threshold
                        const pixelIdx = i / 4;
                        const x = pixelIdx % 64;
                        const y = Math.floor(pixelIdx / 64);
                        sumX += x;
                        sumY += y;
                        totalDiff++;
                    }
                }

                if (totalDiff > 10) {
                    // Map 0-64/48 to -30 to 30 scene coordinates
                    // Mirror X because webcam is mirrored usually
                    const avgX = 1 - (sumX / totalDiff / 64); 
                    const avgY = 1 - (sumY / totalDiff / 48);
                    
                    // Smooth motion
                    motionX += ((avgX - 0.5) * 80 - motionX) * 0.1;
                    motionY += ((avgY - 0.5) * 60 - motionY) * 0.1;
                    motionAmount = Math.min(totalDiff / 100, 2);
                } else {
                    motionAmount *= 0.9; // Decay
                }
            }
            prevFrameData = frameData;
        }

        // --- PARTICLE PHYSICS ---
        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3;
            const px = positions[idx];
            const py = positions[idx + 1];
            const pz = positions[idx + 2];

            const tx = targetPositions[idx];
            const ty = targetPositions[idx + 1];
            const tz = targetPositions[idx + 2];

            // 1. Move towards shape target
            velocities[idx] += (tx - px) * 0.02;
            velocities[idx + 1] += (ty - py) * 0.02;
            velocities[idx + 2] += (tz - pz) * 0.02;

            // 2. Add Noise/Life
            velocities[idx] += Math.sin(time * 2 + py * 0.1) * 0.02;
            velocities[idx + 1] += Math.cos(time * 1.5 + px * 0.1) * 0.02;

            // 3. MOTION INTERACTION (Repel/Attract)
            const dx = px - motionX;
            const dy = py - motionY;
            const dist = Math.sqrt(dx * dx + dy * dy + pz * pz); // 3D distance assuming motion is on Z plane 0 roughly?
            // Actually map motion to Z=10 roughly
            const dz = pz - 20; 
            const dist3d = Math.sqrt(dx*dx + dy*dy + dz*dz);

            if (dist3d < 30) {
                // Expansion force based on motion
                const force = (30 - dist3d) * (0.5 + motionAmount);
                velocities[idx] += (dx / dist3d) * force;
                velocities[idx + 1] += (dy / dist3d) * force;
                velocities[idx + 2] += (dz / dist3d) * force;
                
                // Color flash on touch
                particles.geometry.attributes.color.array[idx] = 1; // R
                particles.geometry.attributes.color.array[idx+1] = 1; // G
                particles.geometry.attributes.color.array[idx+2] = 1; // B
                particles.geometry.attributes.color.needsUpdate = true;
            }

            // Apply Velocity (with damping)
            positions[idx] += velocities[idx];
            positions[idx + 1] += velocities[idx + 1];
            positions[idx + 2] += velocities[idx + 2];

            velocities[idx] *= 0.92; // Friction
            velocities[idx + 1] *= 0.92;
            velocities[idx + 2] *= 0.92;
        }

        particles.geometry.attributes.position.needsUpdate = true;
        
        // Auto Rotation
        particles.rotation.y += 0.002;
        particles.rotation.z += 0.001;

        renderer.render(scene, camera);
    };

    animate();

    // Event listener for shape changing from parent
    const handleShapeChange = (e: CustomEvent) => {
        if(e.detail) generateShape(e.detail);
    };
    window.addEventListener('changeParticleShape', handleShapeChange as EventListener);

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('changeParticleShape', handleShapeChange as EventListener);
        if (mountRef.current && renderer.domElement) {
            mountRef.current.removeChild(renderer.domElement);
        }
        // Stop stream
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line

  // Controls UI
  const setShape = (shape: ShapeType) => {
      setCurrentShape(shape);
      const event = new CustomEvent('changeParticleShape', { detail: shape });
      window.dispatchEvent(event);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white animate-in fade-in duration-700">
        <div ref={mountRef} className="absolute inset-0 z-0"></div>
        
        {/* Overlay UI */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pointer-events-none">
            <div className="pointer-events-auto">
                <h2 className="text-3xl font-black font-['Bangers'] tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 drop-shadow-[0_2px_10px_rgba(0,0,255,0.5)]">
                    HOLO-DECK
                </h2>
                <div className="flex items-center gap-2 mt-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-1 border border-white/10">
                    <div className={clsx("w-2 h-2 rounded-full animate-pulse", status.includes('Active') ? "bg-green-500" : "bg-yellow-500")}></div>
                    <span className="text-xs font-mono text-gray-300 uppercase">{status}</span>
                </div>
            </div>
            <button 
                onClick={onClose}
                className="pointer-events-auto p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all hover:rotate-90"
            >
                <X size={24} />
            </button>
        </div>

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-2xl px-4 pointer-events-none">
            <div className="flex flex-wrap justify-center gap-4 pointer-events-auto">
                <button 
                    onClick={() => setShape('heart')}
                    className={clsx("flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-xl border transition-all", 
                    currentShape === 'heart' ? "bg-pink-500/30 border-pink-400 text-pink-200 shadow-[0_0_20px_rgba(236,72,153,0.3)]" : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/10")}
                >
                    <Heart size={18} className={currentShape === 'heart' ? "fill-current" : ""} />
                    <span className="font-bold text-sm uppercase">Love</span>
                </button>

                <button 
                    onClick={() => setShape('sun')}
                    className={clsx("flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-xl border transition-all", 
                    currentShape === 'sun' ? "bg-orange-500/30 border-orange-400 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.3)]" : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/10")}
                >
                    <Sun size={18} className={currentShape === 'sun' ? "fill-current" : ""} />
                    <span className="font-bold text-sm uppercase">Solar</span>
                </button>

                <button 
                    onClick={() => setShape('saturn')}
                    className={clsx("flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-xl border transition-all", 
                    currentShape === 'saturn' ? "bg-indigo-500/30 border-indigo-400 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.3)]" : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/10")}
                >
                    <Disc size={18} className={currentShape === 'saturn' ? "fill-current" : ""} />
                    <span className="font-bold text-sm uppercase">Cosmos</span>
                </button>

                <button 
                    onClick={() => setShape('flower')}
                    className={clsx("flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-xl border transition-all", 
                    currentShape === 'flower' ? "bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/10")}
                >
                    <Cloud size={18} className={currentShape === 'flower' ? "fill-current" : ""} />
                    <span className="font-bold text-sm uppercase">Nature</span>
                </button>

                <button 
                    onClick={() => setShape('fireworks')}
                    className={clsx("flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-xl border transition-all", 
                    currentShape === 'fireworks' ? "bg-red-500/30 border-red-400 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.3)]" : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/10")}
                >
                    <Zap size={18} className={currentShape === 'fireworks' ? "fill-current" : ""} />
                    <span className="font-bold text-sm uppercase">Burst</span>
                </button>
            </div>
            <p className="text-center text-white/40 text-xs mt-4 uppercase tracking-widest font-medium">
                Move hands to disrupt the field • Select templates to morph
            </p>
        </div>
    </div>
  );
};

export default ParticleSystem;