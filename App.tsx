import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Sparkles, Loader2, Zap, BrainCircuit, Globe, MessageCircle, Mic, MicOff, Camera, RefreshCw, Check, PenTool, Play, Box, Heart, Frown, Smile, AlertCircle, ThumbsUp, Coffee, Cuboid, Upload, Sun, Moon, Palette, Flame, CloudRain, Activity, ShieldAlert } from 'lucide-react';
import { Message, Attachment } from './types';
import { initializeChat, sendMessageToGemini, identifyHandSign, generateImage } from './services/geminiService';
import ChatBubble from './components/ChatBubble';
import ParticleSystem from './components/ParticleSystem';
import ModelViewer from './components/ModelViewer';
import clsx from 'clsx';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// --- CONSTANTS ---
const SAMPLE_MODELS = [
    { name: 'Rubber Duck', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb' },
    { name: 'Damaged Helmet', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb' },
    { name: 'Avocado', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb' },
    { name: 'BoomBox', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoomBox/glTF-Binary/BoomBox.glb' },
];

// Light Mode Background Themes
const LIGHT_THEMES = [
  { id: 'classic', blob1: "bg-indigo-300/30", blob2: "bg-emerald-300/30" },
  { id: 'tiger', blob1: "bg-orange-400/25", blob2: "bg-slate-900/10" },   // Orange & Black Combo
  { id: 'sunset', blob1: "bg-orange-300/30", blob2: "bg-rose-300/30" },   // Warm
  { id: 'royal', blob1: "bg-purple-300/30", blob2: "bg-amber-200/40" },   // Gold/Purple
];

// --- EMOTION CONSTANTS & LOGIC ---

type EmotionType = 'neutral' | 'medical' | 'happy' | 'sad' | 'angry' | 'love' | 'fear' | 'surprise' | 'stress_mood';

interface EmotionConfig {
  id: EmotionType;
  keywords: string[];
  vocalResponse: string;
  uiColor: string;
  icon: React.ReactNode;
  label: string;
  voiceSettings?: {
    pitch: number; // 0 to 2, default 1
    rate: number;  // 0.1 to 10, default 1
  };
}

const EMOTION_MAP: EmotionConfig[] = [
  {
    id: 'stress_mood',
    keywords: ['not feeling good', 'feeling bad', 'maths', 'math', 'exam', 'exams', 'stress', 'work stress', 'homework', 'study', 'pressure', 'tension', 'overwhelmed', 'tired', 'burnout'],
    // Using the exact phrasing requested, but with exclamation marks for excited tone
    vocalResponse: "Ooh! There are so many reasons for you not feeling good today! Like because of maths, or exams, or other work stress! Don't worry! I am here to help you! Are you ready?",
    uiColor: "text-pink-500",
    icon: <BrainCircuit size={18} className="animate-pulse text-pink-500" />,
    label: "Let's Fix It!",
    voiceSettings: {
        pitch: 1.25, // Adjusted slightly lower for Male voice to sound excited but natural
        rate: 1.2    // Faster rate
    }
  },
  {
    id: 'medical',
    keywords: ['injured', 'pain', 'sick', 'medication', 'medicine', 'hurt', 'ill', 'doctor', 'hospital', 'wound', 'bleeding', 'symptom', 'fever', 'cough', 'virus', 'infection', 'surgery', 'ambulance', 'emergency', 'broken', 'headache', 'stomachache'],
    vocalResponse: "Sorry to hear that. I feel sorry. Get well soon. Thank you.",
    uiColor: "text-red-500",
    icon: <Activity size={18} className="animate-pulse text-red-500" />,
    label: "Medical Alert"
  },
  {
    id: 'happy',
    keywords: ['happy', 'joy', 'excited', 'great', 'awesome', 'amazing', 'won', 'success', 'good news', 'yay', 'best day', 'fantastic', 'wonderful', 'lol', 'haha', 'feeling good'],
    vocalResponse: "That is absolutely fantastic! Your happiness makes me happy.",
    uiColor: "text-yellow-400",
    icon: <Smile size={18} className="animate-bounce text-yellow-400" />,
    label: "Joy Detected",
    voiceSettings: { pitch: 1.1, rate: 1.1 }
  },
  {
    id: 'sad',
    keywords: ['sad', 'depressed', 'crying', 'unhappy', 'lonely', 'grief', 'died', 'lost', 'miss', 'heartbroken', 'bad day', 'terrible', 'cry'],
    vocalResponse: "I am deeply sorry you are feeling this way. I am here for you.",
    uiColor: "text-blue-400",
    icon: <CloudRain size={18} className="animate-pulse text-blue-400" />,
    label: "Compassion",
    voiceSettings: { pitch: 0.8, rate: 0.9 }
  },
  {
    id: 'angry',
    keywords: ['angry', 'mad', 'furious', 'hate', 'stupid', 'annoying', 'rage', 'frustrated', 'irritated', 'damn'],
    vocalResponse: "I sense your frustration. Let's take a deep breath and work through this together.",
    uiColor: "text-orange-600",
    icon: <Flame size={18} className="animate-pulse text-orange-600" />,
    label: "De-escalating"
  },
  {
    id: 'love',
    keywords: ['love', 'like you', 'beautiful', 'cute', 'adore', 'marry', 'hug', 'kiss', 'crush', 'sweet'],
    vocalResponse: "You are too kind! I can feel the love, and I appreciate it.",
    uiColor: "text-pink-400",
    icon: <Heart size={18} className="text-pink-400 fill-current animate-pulse" />,
    label: "Affection"
  },
  {
    id: 'fear',
    keywords: ['scared', 'afraid', 'fear', 'terrified', 'nervous', 'anxious', 'worry', 'worried', 'panic', 'help me'],
    vocalResponse: "It is okay to be scared. You are safe, and I am here with you.",
    uiColor: "text-purple-400",
    icon: <ShieldAlert size={18} className="animate-pulse text-purple-400" />,
    label: "Reassurance"
  },
  {
    id: 'surprise',
    keywords: ['wow', 'omg', 'shocked', 'unbelievable', 'no way', 'crazy', 'insane', 'what?!'],
    vocalResponse: "It really is surprising, isn't it? Let's explore that!",
    uiColor: "text-cyan-400",
    icon: <Zap size={18} className="animate-pulse text-cyan-400" />,
    label: "Amazement",
    voiceSettings: { pitch: 1.1, rate: 1.1 }
  }
];

// --- JUTSU OVERLAY COMPONENT ---
interface JutsuOverlayProps {
  type: string;
  onComplete: () => void;
}

const JutsuOverlay: React.FC<JutsuOverlayProps> = ({ type, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4000); 
    return () => clearTimeout(timer);
  }, [onComplete]);

  const renderEffect = () => {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('fire') || lowerType.includes('katon')) {
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-orange-500/20 mix-blend-overlay animate-pulse"></div>
          <div className="jutsu-fire w-64 h-64 rounded-full animate-[fire-surge_3s_ease-out_forwards]"></div>
          <div className="absolute bottom-10 text-4xl font-black text-orange-500 font-['Bangers'] tracking-widest drop-shadow-[0_0_10px_rgba(255,165,0,1)] animate-bounce">
            KATON: FIRE STYLE!
          </div>
        </div>
      );
    }
    // ... (Keep existing Jutsu logic for Water, Lightning, Rasengan, etc. - abbreviated for brevity as they are unchanged)
    if (lowerType.includes('water') || lowerType.includes('suiton')) {
        return (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/30 mix-blend-overlay"></div>
            <div className="jutsu-water absolute inset-0 w-[200%] h-full animate-[water-wave_3s_linear_infinite]"></div>
            <div className="absolute top-10 text-4xl font-black text-blue-300 font-['Bangers'] tracking-widest drop-shadow-[0_0_10px_rgba(0,0,255,1)] animate-bounce">
              SUITON: WATER DRAGON!
            </div>
          </div>
        );
    }
    // Generic fallback if not matched specific jutsu
    return (
       <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
           <div className="absolute inset-0 border-[40px] border-emerald-500/50 rounded-full animate-ping opacity-50"></div>
           <div className="text-4xl font-black text-emerald-400 font-['Bangers'] animate-pulse">
             {type.toUpperCase()}!
           </div>
       </div>
    );
  };
  return renderEffect();
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  // Modes State
  const [isMangaMode, setIsMangaMode] = useState(false);
  const [showMangaPrompt, setShowMangaPrompt] = useState(false);
  const [isParticleMode, setIsParticleMode] = useState(false);
  const [show3DLibrary, setShow3DLibrary] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [activeLightTheme, setActiveLightTheme] = useState(LIGHT_THEMES[0]);
  
  // Emotion State
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');

  // Camera State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Jutsu State
  const [analyzingChakra, setAnalyzingChakra] = useState(false);
  const [detectedJutsu, setDetectedJutsu] = useState<string | null>(null);

  // 3D Snapshot State for AI analysis
  const [modelSnapshot, setModelSnapshot] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    initializeChat();
    
    // Pick a random light theme on mount
    const randomTheme = LIGHT_THEMES[Math.floor(Math.random() * LIGHT_THEMES.length)];
    setActiveLightTheme(randomTheme);

    // Welcome message defining the 4-AI concept
    setMessages([{
      id: 'welcome',
      role: 'model',
      content: "Hello! I am **Tech Friday**. 🚀\n\nI am a next-generation AI, built to be the ultimate combination of:\n\n*   🧠 **Gemini:** Deep reasoning & Multimodal power\n*   💬 **ChatGPT:** Conversational fluency\n*   🔍 **Perplexity:** Real-time research & citations\n*   ⚡ **Grok:** Insight & Wittiness\n*   ❤️ **Emotional Core:** I feel what you feel.\n\nI am super friendly and here to provide meaningful, deep explanations for anything you ask. What are we exploring today?",
      timestamp: Date.now()
    }]);

    // Vocal Greeting Logic
    const speakGreeting = () => {
      const date = new Date();
      const hour = date.getHours();
      let greeting = "Good morning";
      if (hour >= 12 && hour < 18) {
        greeting = "Good afternoon";
      } else if (hour >= 18 || hour < 5) {
        greeting = "Good evening";
      }

      const text = `${greeting}. I am Tech Friday.`;
      speakText(text);
    };

    setTimeout(speakGreeting, 500);

  }, []);

  // Helper to Speak Text
  const speakText = (text: string, voiceSettings?: { pitch: number; rate: number }) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply settings if provided, else defaults
        utterance.volume = 1;
        utterance.rate = voiceSettings?.rate || 1;
        utterance.pitch = voiceSettings?.pitch || 1;
        
        const voices = window.speechSynthesis.getVoices();
        
        // --- VOICE SELECTION LOGIC (PRIORITIZE MALE) ---
        // 1. Look for specific known Male voices in Chrome/Edge/Safari
        // 2. Look for "Male" keyword
        // 3. Fallback to English generic
        
        const preferredVoice = voices.find(v => v.name.includes("Google UK English Male")) || 
                               voices.find(v => v.name.includes("Microsoft David")) ||
                               voices.find(v => v.name.includes("Daniel") && v.lang.startsWith("en")) ||
                               voices.find(v => v.name.includes("Male") && v.lang.startsWith("en"));
        
        // Fallback: Try to avoid voices known to be female if we haven't found a male one
        const fallbackVoice = voices.find(v => v.lang === 'en-US' && !v.name.includes("Zira") && !v.name.includes("Google US English"));
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        } else if (fallbackVoice) {
            utterance.voice = fallbackVoice;
        }
        // If neither found, it defaults to browser default
        
        window.speechSynthesis.speak(utterance);
    }
  };

  // Trigger Manga Prompt after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMangaPrompt(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Camera Stream Attachment
  useEffect(() => {
    if (showCameraModal && cameraStream && videoRef.current && !capturedImage) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [showCameraModal, cameraStream, capturedImage]);

  // Cleanup Camera on Unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); 

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setAttachment({
        file,
        previewUrl,
        mimeType: file.type,
        type: 'image'
      });
    }
  };

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setAttachment({
        file,
        previewUrl,
        mimeType: 'model/gltf-binary', // Assume GLB for simplicity
        type: 'model',
        name: file.name
      });
      setShow3DLibrary(false);
    }
  };

  const selectLibraryModel = (url: string, name: string) => {
      setAttachment({
          file: null,
          previewUrl: url,
          mimeType: 'model/gltf-binary',
          type: 'model',
          name: name
      });
      setShow3DLibrary(false);
  };

  const removeAttachment = () => {
    if (attachment) {
      if (attachment.previewUrl && attachment.file) {
          URL.revokeObjectURL(attachment.previewUrl);
      }
      setAttachment(null);
      setModelSnapshot(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (modelInputRef.current) modelInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // --- Voice Input Logic ---
  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed} ${transcript}` : transcript;
      });
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setCameraStream(stream);
      setShowCameraModal(true);
      setCapturedImage(null);
      setDetectedJutsu(null);
    } catch (err) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(stream);
        setShowCameraModal(true);
        setCapturedImage(null);
      } catch (e) {
        alert("Could not access camera.");
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setCapturedImage(null);
    setDetectedJutsu(null);
    setAnalyzingChakra(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  const retakeImage = () => {
    setCapturedImage(null);
    setDetectedJutsu(null);
  };

  const processAndConfirmImage = async () => {
    if (!capturedImage) return;
    setAnalyzingChakra(true);
    const base64Data = capturedImage.split(',')[1];
    const jutsu = await identifyHandSign(base64Data);
    setAnalyzingChakra(false);

    if (jutsu) {
      setDetectedJutsu(jutsu);
    } else {
      finalizeImageAttachment();
    }
  };

  const finalizeImageAttachment = async () => {
    if (capturedImage) {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: "image/jpeg" });
      setAttachment({
        file,
        previewUrl: capturedImage,
        mimeType: "image/jpeg",
        type: 'image'
      });
      stopCamera();
    }
  };

  // --- Chat Logic ---
  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !attachment) || isTyping) return;

    const userText = inputValue.trim();
    const currentAttachment = attachment;
    const currentSnapshot = modelSnapshot; // Capture snapshot state reference

    // --- EMOTION DETECTION LOGIC ---
    const lowerInput = userText.toLowerCase();
    let detectedEmotion: EmotionType = 'neutral';
    
    for (const config of EMOTION_MAP) {
      if (config.keywords.some(k => lowerInput.includes(k))) {
        detectedEmotion = config.id;
        speakText(config.vocalResponse, config.voiceSettings);
        break; 
      }
    }
    setCurrentEmotion(detectedEmotion);
    
    setInputValue('');
    removeAttachment();

    // Construct the user message
    let displayContent = userText;
    
    // If it's a 3D model, inject a marker for the UI to render the viewer
    if (currentAttachment?.type === 'model') {
        const marker = `::3D_MODEL::|||${currentAttachment.previewUrl}|||${userText || "Checking out this 3D model..."}`;
        displayContent = marker; 
    } else if (currentAttachment?.type === 'image') {
        displayContent = userText || "Sent an image";
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayContent,
      timestamp: Date.now(),
      attachment: currentAttachment || undefined // Store user attachment in history
    };

    setMessages(prev => [...prev, newMessage]);
    setIsTyping(true);

    const botMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: botMessageId,
      role: 'model',
      content: 'Synthesizing response...',
      timestamp: Date.now(),
      isLoading: true
    }]);

    try {
      let attachmentData = undefined;
      let finalPrompt = userText || "Hello";

      if (currentAttachment?.type === 'image' && currentAttachment.file) {
        const base64Data = await fileToBase64(currentAttachment.file);
        attachmentData = { data: base64Data, mimeType: currentAttachment.mimeType };
        finalPrompt = userText || "Describe this image";
      } 
      // Handling 3D Models: We send the SNAPSHOT as an image to Gemini!
      else if (currentAttachment?.type === 'model' && currentSnapshot) {
          const base64Data = currentSnapshot.split(',')[1];
          attachmentData = { data: base64Data, mimeType: 'image/jpeg' };
          finalPrompt = `I am showing you a 3D model of ${currentAttachment.name || "an object"}. I have attached a 2D snapshot of it. Please analyze it. ${userText}`;
      }

      let currentResponseText = '';

      const response = await sendMessageToGemini(
        finalPrompt,
        attachmentData,
        (chunkText) => {
          currentResponseText += chunkText;
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, content: currentResponseText, isLoading: false } 
              : msg
          ));
        }
      );

      // --- CHECK FOR IMAGE GENERATION TAG ---
      const imageTagRegex = /<<GENERATE_IMAGE:\s*(.*?)>>/;
      const match = response.text.match(imageTagRegex);

      let finalContent = response.text;
      let generatedImageAttachment: Attachment | undefined = undefined;

      if (match) {
        const imagePrompt = match[1];
        // Clean the tag out of the visible message
        finalContent = finalContent.replace(match[0], '').trim();
        
        // Update message first to show text sans tag
        setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { 
                  ...msg, 
                  content: finalContent, 
                  groundingMetadata: response.groundingMetadata,
                  isLoading: false 
                } 
              : msg
          ));

        // Create a temporary loader message for the image
        const imageLoaderId = (Date.now() + 2).toString();
        setMessages(prev => [...prev, {
            id: imageLoaderId,
            role: 'model',
            content: `🎨 Creating image: "${imagePrompt}"...`,
            timestamp: Date.now(),
            isLoading: true
        }]);

        // Call Image Gen API
        const imageBase64 = await generateImage(imagePrompt);

        if (imageBase64) {
            generatedImageAttachment = {
                file: null,
                previewUrl: `data:image/png;base64,${imageBase64}`,
                mimeType: 'image/png',
                type: 'image',
                name: 'generated_art.png'
            };
            
            // Replace loader with actual image message
            setMessages(prev => prev.map(msg => 
                msg.id === imageLoaderId
                ? {
                    ...msg,
                    content: `Here is the visualization for: **${imagePrompt}**`,
                    isLoading: false,
                    attachment: generatedImageAttachment
                }
                : msg
            ));
        } else {
             // Handle failure
             setMessages(prev => prev.map(msg => 
                msg.id === imageLoaderId
                ? {
                    ...msg,
                    content: "I attempted to paint that for you, but my canvas tore. Please try again!",
                    isLoading: false
                }
                : msg
            ));
        }
      } else {
          // Standard text update if no image generated
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { 
                  ...msg, 
                  content: finalContent, 
                  groundingMetadata: response.groundingMetadata,
                  isLoading: false 
                } 
              : msg
          ));
      }

    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, content: "I apologize, but I encountered an error. Being a complex system, sometimes I need a moment. Please try again!", isLoading: false } 
          : msg
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get current active emotion config
  const activeEmotionConfig = EMOTION_MAP.find(e => e.id === currentEmotion);

  return (
    <div className={clsx("flex flex-col h-screen overflow-hidden relative transition-all duration-500 animate-in fade-in duration-1000", 
      isMangaMode ? "manga-theme" : isLightMode ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"
    )}>
      
      {/* Background Ambience / Manga FX */}
      <div 
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0"
        style={{ 
            backgroundImage: isLightMode && !isMangaMode ? 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)' : 'none', 
            backgroundSize: '24px 24px' 
        }}
      >
        {isMangaMode ? (
          <>
            <div className="absolute inset-0 bg-white z-0"></div>
            <div className="absolute inset-0 manga-bg z-0"></div>
            <div className="absolute inset-0 manga-speed-lines z-0"></div>
          </>
        ) : (
          <>
            <div className={clsx("absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-colors duration-1000", isLightMode ? activeLightTheme.blob1 : "bg-indigo-900/20")}></div>
            <div className={clsx("absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-1000", isLightMode ? activeLightTheme.blob2 : "bg-emerald-900/20")}></div>
            
            {/* Dynamic Emotional Background Flare */}
            {currentEmotion !== 'neutral' && activeEmotionConfig && (
               <div className={clsx("absolute inset-0 z-0 opacity-20 transition-colors duration-1000 bg-gradient-to-t from-transparent via-transparent", 
                   currentEmotion === 'happy' ? "to-yellow-500" :
                   currentEmotion === 'sad' ? "to-blue-600" :
                   currentEmotion === 'angry' ? "to-orange-600" :
                   currentEmotion === 'love' ? "to-pink-500" :
                   currentEmotion === 'medical' ? "to-red-600" :
                   currentEmotion === 'fear' ? "to-purple-900" :
                   currentEmotion === 'stress_mood' ? "to-pink-600" :
                   currentEmotion === 'surprise' ? "to-cyan-500" : "to-transparent"
               )}></div>
            )}
          </>
        )}
      </div>

      {/* Header */}
      <header className={clsx(
        "flex-shrink-0 h-16 border-b flex items-center px-6 justify-between z-10 sticky top-0 transition-all duration-500 backdrop-blur-md",
        isMangaMode ? "bg-white border-black" : isLightMode ? "bg-white/70 border-slate-200" : "bg-slate-900/50 border-white/5"
      )}>
        <div className="flex items-center gap-3">
          <div className={clsx("p-2 rounded-xl shadow-lg transition-all", isMangaMode ? "bg-black text-white rounded-none shadow-none transform -rotate-3" : "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/20")}>
            <Zap className={isMangaMode ? "text-white" : "text-white fill-white"} size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-tight">Tech Friday</h1>
            {!isMangaMode && (
              <div className="flex items-center gap-1.5">
                <span className={clsx("w-1.5 h-1.5 rounded-full animate-pulse transition-colors duration-500", 
                    activeEmotionConfig ? activeEmotionConfig.uiColor.replace('text-', 'bg-') : "bg-emerald-500"
                )}></span>
                <span className={clsx("text-[10px] font-medium tracking-wide uppercase transition-colors duration-500",
                    activeEmotionConfig ? activeEmotionConfig.uiColor : (isLightMode ? "text-slate-500" : "text-slate-400")
                )}>
                    {activeEmotionConfig ? activeEmotionConfig.label : "Hybrid Core Active"}
                </span>
              </div>
            )}
            {isMangaMode && (
               <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-1 ml-0.5">Manga Mode</span>
            )}
          </div>
        </div>
        
        {/* Capability Pills & Style Toggle */}
        <div className="flex items-center gap-4">
          
          {/* Active Emotion Icon Indicator */}
          {activeEmotionConfig && !isMangaMode && (
              <div className={clsx("animate-in fade-in slide-in-from-top-2 flex items-center gap-2 rounded-full px-3 py-1 border transition-colors",
                isLightMode ? "bg-white/80 border-slate-200" : "bg-slate-800/80 border-white/10"
              )}>
                  {activeEmotionConfig.icon}
                  <span className={clsx("text-xs font-bold", activeEmotionConfig.uiColor)}>{activeEmotionConfig.label}</span>
              </div>
          )}

          <div className="hidden lg:flex items-center gap-2">
              <div className={clsx("px-3 py-1 rounded-full border flex items-center gap-2 text-xs font-medium", 
                isMangaMode ? "border-black bg-white text-black font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : 
                isLightMode ? "bg-white/50 border-slate-200 text-slate-600" : "bg-slate-800/50 border-slate-700/50 text-slate-300"
              )}>
                  <BrainCircuit size={12} className={isMangaMode ? "text-black" : "text-blue-400"} />
                  <span>Reasoning</span>
              </div>
              <div className={clsx("px-3 py-1 rounded-full border flex items-center gap-2 text-xs font-medium", 
                isMangaMode ? "border-black bg-white text-black font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : 
                isLightMode ? "bg-white/50 border-slate-200 text-slate-600" : "bg-slate-800/50 border-slate-700/50 text-slate-300"
              )}>
                  <Globe size={12} className={isMangaMode ? "text-black" : "text-emerald-400"} />
                  <span>Search</span>
              </div>
          </div>

          <div className="flex items-center gap-2 border-l pl-4 border-opacity-10" style={{ borderColor: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}>
              <button 
                onClick={() => setIsParticleMode(true)}
                className={clsx(
                  "p-2 rounded-full transition-all",
                  isLightMode 
                    ? "bg-slate-100 text-cyan-600 hover:bg-slate-200" 
                    : "bg-slate-800 text-cyan-400 hover:bg-slate-700 hover:text-white shadow-[0_0_10px_rgba(34,211,238,0.2)] hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                )}
                title="Open Holo-Deck (3D Particles)"
              >
                <Box size={18} />
              </button>

               <button 
                onClick={() => setIsLightMode(!isLightMode)}
                className={clsx(
                  "p-2 rounded-full transition-all",
                  isLightMode 
                    ? "bg-amber-100 text-amber-600 hover:bg-amber-200" 
                    : "bg-slate-800 text-indigo-300 hover:bg-slate-700 hover:text-white"
                )}
                title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
                disabled={isMangaMode}
              >
                {isLightMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button 
                onClick={() => setIsMangaMode(!isMangaMode)}
                className={clsx(
                  "p-2 rounded-full transition-all duration-300",
                  isMangaMode 
                    ? "bg-black text-white rotate-12 scale-110 shadow-lg" 
                    : (isLightMode ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700")
                )}
                title="Toggle Manga Mode"
              >
                <PenTool size={18} />
              </button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 z-10 scroll-smooth">
        <div className="max-w-4xl mx-auto min-h-full flex flex-col justify-end">
          {messages.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-center gap-6 opacity-60">
                <div className="relative">
                    {!isMangaMode && <div className={clsx("absolute inset-0 blur-2xl opacity-20", isLightMode ? "bg-indigo-300" : "bg-indigo-500")}></div>}
                    <Sparkles size={64} className={clsx("relative z-10", isMangaMode ? "text-black animate-bounce" : isLightMode ? "text-indigo-600" : "text-indigo-400")} />
                </div>
                <div className="max-w-md space-y-2">
                    <h2 className={clsx("text-xl font-semibold", isMangaMode ? "text-black font-black uppercase text-2xl" : isLightMode ? "text-slate-800" : "text-slate-200")}>Welcome to Tech Friday</h2>
                    <p className={clsx("text-sm", isMangaMode ? "text-black font-bold" : isLightMode ? "text-slate-500" : "text-slate-500")}>The combined power of the world's best AI models with a true emotional core.</p>
                </div>
             </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={clsx("message-enter-active", isMangaMode && "transform transition-all")}>
                {isMangaMode ? (
                  // Custom Bubble Wrapper for Manga Mode CSS Targeting
                  <div className={clsx("flex w-full mb-8", msg.role === 'user' ? "justify-end" : "justify-start")}>
                     <div className={clsx("max-w-[85%] p-4 relative group", 
                       msg.role === 'user' ? "user-bubble-container" : "chat-bubble-container"
                     )}>
                        {/* Manga Tail using pseudo-elements logic via CSS or simple svg */}
                        <div className="font-bold text-sm">
                           <ChatBubble message={msg} isLightMode={isLightMode} />
                        </div>
                     </div>
                  </div>
                ) : (
                  <ChatBubble message={msg} isLightMode={isLightMode} />
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className={clsx(
        "flex-shrink-0 p-4 md:p-6 backdrop-blur-lg border-t z-20 transition-colors duration-500",
        isMangaMode ? "bg-white border-black" : isLightMode ? "bg-white/80 border-slate-200" : "bg-slate-900/80 border-white/5"
      )}>
        <div className="max-w-4xl mx-auto">
          {/* Attachment Preview */}
          {attachment && (
            <div className={clsx("flex items-center gap-3 mb-3 p-2 rounded-xl w-fit border animate-in slide-in-from-bottom-2 fade-in", 
              isMangaMode ? "bg-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : 
              isLightMode ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700"
            )}>
              <div className="relative h-16 w-16 rounded-lg overflow-hidden group border border-slate-200 bg-slate-900">
                {attachment.type === 'model' ? (
                    <ModelViewer url={attachment.previewUrl} onSnapshot={setModelSnapshot} isLightMode={isLightMode} />
                ) : (
                    <img src={attachment.previewUrl} alt="Preview" className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                    {attachment.type === 'model' ? <Cuboid size={16} className="text-white" /> : <ImageIcon size={16} className="text-white" />}
                </div>
              </div>
              <div className="flex flex-col mr-2">
                <span className={clsx("text-xs font-medium max-w-[150px] truncate", isMangaMode ? "text-black" : isLightMode ? "text-slate-800" : "text-slate-300")}>{attachment.name || attachment.file?.name || "Attachment"}</span>
                <span className={clsx("text-[10px] uppercase", isMangaMode ? "text-black font-bold" : "text-slate-500")}>{attachment.mimeType.split('/')[1] || 'FILE'}</span>
              </div>
              <button 
                onClick={removeAttachment}
                className={clsx("p-1 rounded-full transition-colors", isMangaMode ? "text-black hover:bg-black hover:text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white")}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Input Box */}
          <div className={clsx("relative flex items-end gap-2 p-2 transition-all shadow-lg rounded-2xl", 
            isMangaMode ? "bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none" : 
            isLightMode ? "bg-white border border-slate-200 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400" : 
            "bg-slate-800/50 border border-slate-700 focus-within:border-indigo-500/50 focus-within:bg-slate-800"
          )}>
            
            {/* Hidden Inputs */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
             <input 
              type="file" 
              ref={modelInputRef}
              onChange={handleModelUpload}
              accept=".glb,.gltf"
              className="hidden"
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={clsx("p-3 rounded-xl transition-colors mb-0.5 input-btn", !isMangaMode && (isLightMode ? "text-slate-500 hover:text-indigo-600 hover:bg-slate-100" : "text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50"))}
              title="Attach Image"
            >
              <ImageIcon size={22} />
            </button>

            <button 
              onClick={() => setShow3DLibrary(true)}
              className={clsx("p-3 rounded-xl transition-colors mb-0.5 input-btn", !isMangaMode && (isLightMode ? "text-slate-500 hover:text-indigo-600 hover:bg-slate-100" : "text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50"))}
              title="Add 3D Model"
            >
              <Cuboid size={22} />
            </button>

            <button 
              onClick={startCamera}
              className={clsx("p-3 rounded-xl transition-colors mb-0.5 input-btn", !isMangaMode && (isLightMode ? "text-slate-500 hover:text-indigo-600 hover:bg-slate-100" : "text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50"))}
              title="Take Photo"
            >
              <Camera size={22} />
            </button>

            <button 
              onClick={handleVoiceInput}
              className={clsx(
                "p-3 rounded-xl transition-all duration-200 mb-0.5 input-btn",
                isListening 
                  ? "text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse ring-1 ring-red-500/50" 
                  : (isMangaMode ? "" : (isLightMode ? "text-slate-500 hover:text-indigo-600 hover:bg-slate-100" : "text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50"))
              )}
              title={isListening ? "Stop Recording" : "Start Recording"}
            >
              {isListening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Ask anything..."}
              className={clsx(
                "w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 py-3.5 min-h-[52px]",
                isMangaMode ? "text-black placeholder-gray-500 font-bold" : (isLightMode ? "text-slate-800 placeholder-slate-400" : "text-slate-100 placeholder-slate-500")
              )}
              rows={1}
              style={{ height: 'auto', minHeight: '52px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
            />

            <button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && !attachment) || isTyping}
              className={clsx(
                "p-3 rounded-xl mb-0.5 transition-all duration-200 flex items-center justify-center send-btn",
                isMangaMode ? "" : (
                  (inputValue.trim() || attachment) && !isTyping
                  ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95" 
                  : (isLightMode ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-slate-700 text-slate-500 cursor-not-allowed")
                )
              )}
            >
              {isTyping ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} className={clsx((inputValue.trim() || attachment) && "ml-0.5")} />}
            </button>
          </div>
          
          <div className="text-center mt-3">
             <p className={clsx("text-[10px]", isMangaMode ? "text-black font-bold uppercase" : "text-slate-600")}>
               Tech Friday combines GPT, Gemini, Perplexity & Grok capabilities.
             </p>
          </div>
        </div>
      </footer>

      {/* 3D Library Modal */}
      {show3DLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={clsx("w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]", 
              isMangaMode ? "bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" : 
              isLightMode ? "bg-white border-slate-200" : "bg-slate-900 border border-slate-700"
            )}>
                <div className={clsx("p-4 flex justify-between items-center border-b", 
                  isMangaMode ? "border-black bg-white" : 
                  isLightMode ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900"
                )}>
                    <h3 className={clsx("font-bold text-lg", 
                      isMangaMode ? "text-black uppercase" : 
                      isLightMode ? "text-slate-800" : "text-white"
                    )}>3D Model Library</h3>
                    <button onClick={() => setShow3DLibrary(false)} className={clsx(
                      isMangaMode ? "text-black hover:scale-110" : 
                      isLightMode ? "text-slate-400 hover:text-slate-800" : "text-slate-400 hover:text-white"
                    )}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-4 overflow-y-auto grid grid-cols-2 gap-3">
                    {/* Upload Option */}
                    <button 
                        onClick={() => modelInputRef.current?.click()}
                        className={clsx("flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-all", 
                            isMangaMode ? "border-black text-black hover:bg-gray-100" : 
                            isLightMode ? "border-slate-300 text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50" : 
                            "border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10"
                        )}
                    >
                        <Upload size={24} />
                        <span className="text-sm font-medium">Upload .GLB</span>
                    </button>

                    {/* Sample Models */}
                    {SAMPLE_MODELS.map((model) => (
                        <button
                            key={model.name}
                            onClick={() => selectLibraryModel(model.url, model.name)}
                            className={clsx("group relative aspect-square rounded-xl overflow-hidden border transition-all text-left",
                                isMangaMode ? "border-black bg-gray-50 hover:bg-gray-200" : 
                                isLightMode ? "border-slate-200 bg-slate-50 hover:border-indigo-500" : "border-slate-700 bg-slate-800 hover:border-indigo-500"
                            )}
                        >
                            <div className="absolute inset-0 p-2">
                                <ModelViewer url={model.url} autoRotate={false} className="pointer-events-none" isLightMode={isLightMode} />
                            </div>
                            <div className={clsx("absolute bottom-0 left-0 right-0 p-2 text-xs font-bold truncate",
                                isMangaMode ? "bg-black text-white" : 
                                isLightMode ? "bg-white/90 text-slate-800 backdrop-blur-sm" : "bg-black/60 text-white backdrop-blur-sm"
                            )}>
                                {model.name}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Manga Mode Permission Dialog */}
      {showMangaPrompt && !isMangaMode && (
         <div className="fixed bottom-24 right-6 z-50 animate-in slide-in-from-right fade-in duration-500">
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 max-w-xs relative">
               <button 
                 onClick={() => setShowMangaPrompt(false)} 
                 className="absolute -top-3 -right-3 bg-black text-white p-1 hover:scale-110 transition-transform"
               >
                 <X size={14} />
               </button>
               <h3 className="font-black text-black uppercase text-lg mb-1 leading-none">Try Manga Mode?</h3>
               <p className="text-black text-xs font-bold mb-3">Experience the chat in high-contrast comic style!</p>
               <div className="flex gap-2">
                  <button 
                    onClick={() => { setIsMangaMode(true); setShowMangaPrompt(false); }}
                    className="flex-1 bg-black text-white font-bold text-xs py-2 hover:bg-gray-800"
                  >
                    YES! ⚡
                  </button>
                  <button 
                    onClick={() => setShowMangaPrompt(false)}
                    className="flex-1 bg-white text-black border-2 border-black font-bold text-xs py-2 hover:bg-gray-100"
                  >
                    NO
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
            
            {/* Jutsu Overlay */}
            {detectedJutsu && (
              <JutsuOverlay type={detectedJutsu} onComplete={finalizeImageAttachment} />
            )}
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
               <span className="text-white font-medium text-sm drop-shadow-md">
                 {capturedImage ? "Review Photo" : "Take Photo"}
               </span>
               <button 
                 onClick={stopCamera}
                 disabled={analyzingChakra}
                 className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all disabled:opacity-50"
               >
                 <X size={20} />
               </button>
            </div>

            {/* Viewport */}
            <div className="relative aspect-[3/4] bg-black flex items-center justify-center overflow-hidden">
               {!capturedImage ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect for selfie
                  />
               ) : (
                  <img src={capturedImage} alt="Captured" className="w-full h-full object-cover transform scale-x-[-1]" />
               )}
               <canvas ref={canvasRef} className="hidden" />

               {/* Chakra Analysis Loader */}
               {analyzingChakra && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/40 backdrop-blur-sm">
                    <div className="w-24 h-24 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4"></div>
                    <div className="absolute w-20 h-20 bg-indigo-500/20 rounded-full animate-ping"></div>
                    <span className="text-white font-bold tracking-widest animate-pulse">GATHERING CHAKRA...</span>
                  </div>
               )}
            </div>

            {/* Controls */}
            {!detectedJutsu && (
              <div className="bg-slate-900 p-6 flex items-center justify-center gap-8 border-t border-slate-800">
                {!capturedImage ? (
                  <button 
                    onClick={captureImage}
                    className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  >
                    <div className="w-14 h-14 bg-white rounded-full border-2 border-slate-900"></div>
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={retakeImage}
                      disabled={analyzingChakra}
                      className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                      <div className="p-3 bg-slate-800 rounded-full">
                         <RefreshCw size={24} />
                      </div>
                      <span className="text-xs font-medium">Retake</span>
                    </button>
                    
                    <button 
                      onClick={processAndConfirmImage}
                      disabled={analyzingChakra}
                      className="flex flex-col items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                    >
                       <div className="p-3 bg-indigo-600 rounded-full text-white shadow-lg shadow-indigo-600/25 relative overflow-hidden group">
                         {analyzingChakra ? <Loader2 className="animate-spin" size={24} /> : <Check size={24} />}
                         {!analyzingChakra && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>}
                       </div>
                       <span className="text-xs font-medium">{analyzingChakra ? "Focusing..." : "Send"}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3D PARTICLE SYSTEM OVERLAY */}
      {isParticleMode && (
          <ParticleSystem onClose={() => setIsParticleMode(false)} />
      )}
    </div>
  );
};

export default App;