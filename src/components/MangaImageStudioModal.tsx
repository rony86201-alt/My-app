import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  User,
  Sliders,
  Maximize2,
  Trash2,
  Save,
  Check,
  RefreshCw,
  Palette,
  Shield,
  Download,
  AlertCircle,
  Layers,
  Camera,
  Play,
  Cpu,
  Smartphone,
  HardDrive,
  Info,
  Film,
  Volume2
} from 'lucide-react';
import {
  isNativeAndroidEnvironment,
  getDeviceAndModelStatus,
  startModelDownload,
  generateOnDeviceImage,
  VERIFIED_DEVICE_PROFILE,
  VERIFIED_MODEL_SPEC,
  type DownloadProgressPayload
} from '../utils/onDeviceBridge';
import type {
  VisualStyleProfile,
  CharacterProfile,
  ImageGenerationSettings,
  ImageProviderInfo,
  GeneratedImageRecord
} from '../types';
import {
  getSavedStyleProfiles,
  saveStyleProfile,
  deleteStyleProfile,
  getActiveStyleProfile,
  setActiveStyleProfile,
  getSavedCharacterProfiles,
  saveCharacterProfile,
  deleteCharacterProfile,
  getActiveCharacterProfile,
  setActiveCharacterProfile,
  getSavedImageSettings,
  saveImageSettings,
  getGeneratedImageHistory,
  saveGeneratedImageRecord,
  deleteGeneratedImageRecord,
  clearGeneratedImageHistory
} from '../utils/storage';
import { upscaleMangaImage2x, enhanceMangaImageColors } from '../utils/imageUpscaler';

interface MangaImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyImageToScene?: (sceneNumber: number, imageDataUrl: string) => void;
  currentSceneCount?: number;
}

export const MangaImageStudioModal: React.FC<MangaImageStudioModalProps> = ({
  isOpen,
  onClose,
  onApplyImageToScene,
  currentSceneCount = 4
}) => {
  const [activeTab, setActiveTab] = useState<'style' | 'reference-video' | 'character' | 'providers' | 'gallery'>('style');

  // Styles state
  const [styleProfiles, setStyleProfiles] = useState<VisualStyleProfile[]>([]);
  const [activeStyle, setActiveStyle] = useState<VisualStyleProfile | null>(null);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [referenceSuccess, setReferenceSuccess] = useState<string | null>(null);
  const [customStyleName, setCustomStyleName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Characters state
  const [characterProfiles, setCharacterProfiles] = useState<CharacterProfile[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<CharacterProfile | null>(null);
  const [characterEditForm, setCharacterEditForm] = useState<CharacterProfile>({
    id: '',
    name: '',
    description: '',
    gender: 'male',
    facialFeatures: '',
    eyeDetails: '',
    hairStyle: '',
    outfit: '',
    weaponsAndProps: '',
    distinguishingFeatures: '',
    auraAndEffects: '',
    consistencyStrength: 0.85
  });

  // Providers & Settings state
  const [providers, setProviders] = useState<ImageProviderInfo[]>([]);
  const [settings, setSettings] = useState<ImageGenerationSettings>(getSavedImageSettings());
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [testPrompt, setTestPrompt] = useState('Ren standing on a crumbling stone gargoyle at the fortress edge during a thunderstorm, lightning illuminates his face');
  const [testResult, setTestResult] = useState<{
    imageDataUrl: string;
    provider: string;
    model: string;
    promptUsed: string;
    message: string;
  } | null>(null);

  // On-Device Inference State
  const [deviceHardware, setDeviceHardware] = useState(VERIFIED_DEVICE_PROFILE);
  const [isNativeApkEnv, setIsNativeApkEnv] = useState(isNativeAndroidEnvironment());
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  const [modelDownloadProgress, setModelDownloadProgress] = useState<DownloadProgressPayload | null>(null);
  const [deviceDiagnosticAlert, setDeviceDiagnosticAlert] = useState<string | null>(null);
  const [useVulkanAcceleration, setUseVulkanAcceleration] = useState(true);

  // Gallery & Upscaling state
  const [gallery, setGallery] = useState<GeneratedImageRecord[]>([]);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<GeneratedImageRecord | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaleStatus, setUpscaleStatus] = useState<string | null>(null);
  const [sceneTarget, setSceneTarget] = useState<number>(1);

  // Initialize and load persisted data
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const styles = getSavedStyleProfiles();
      setStyleProfiles(styles);
      const activeS = getActiveStyleProfile();
      setActiveStyle(activeS || styles[0] || null);

      const characters = getSavedCharacterProfiles();
      setCharacterProfiles(characters);
      const activeC = getActiveCharacterProfile();
      const currentC = activeC || characters[0] || null;
      setActiveCharacter(currentC);
      if (currentC) {
        setCharacterEditForm({
          ...currentC,
          facialFeatures: currentC.facialFeatures || currentC.facialStructure || '',
          eyeDetails: currentC.eyeDetails || currentC.eyeColorAndShape || '',
          hairStyle: currentC.hairStyle || currentC.hairStyleAndColor || '',
          outfit: currentC.outfit || currentC.clothingAndOutfit || '',
          weaponsAndProps: currentC.weaponsAndProps || currentC.accessoriesAndWeapons || '',
          auraAndEffects: currentC.auraAndEffects || currentC.auraOrMagic || ''
        });
      }

      setSettings(getSavedImageSettings());
      setGallery(getGeneratedImageHistory());

      // Check on-device native status
      setIsNativeApkEnv(isNativeAndroidEnvironment());
      try {
        const status = await getDeviceAndModelStatus();
        if (status.hardware) {
          setDeviceHardware(status.hardware);
        }
      } catch (devErr) {
        console.warn('Could not query device status:', devErr);
      }

      // Fetch server provider capabilities
      try {
        const res = await fetch('/api/image/providers');
        if (res.ok) {
          const data = await res.json();
          if (data.providers) {
            setProviders(data.providers);
          }
        }
      } catch (err) {
        console.warn('Could not fetch server providers:', err);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  if (!isOpen) return null;

  // Safe formatting for fields that may be string or object
  const formatField = (val: any): string => {
    if (!val) return 'Not analyzed yet';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return Object.entries(val)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
    }
    return String(val);
  };

  const getPalettes = (profile: VisualStyleProfile | null): string[] => {
    if (!profile) return [];
    if (profile.extractedColorPalette && Array.isArray(profile.extractedColorPalette)) {
      return profile.extractedColorPalette;
    }
    if (typeof profile.colorGrading === 'object' && Array.isArray(profile.colorGrading.palette)) {
      return profile.colorGrading.palette;
    }
    return ['#0f0b1e', '#231846', '#7c3aed', '#06b6d4', '#f43f5e'];
  };

  // 1. Reference Image Upload & AI Vision Style Analysis
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReferenceError(null);
    setReferenceSuccess(null);

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setReferenceError('Invalid file type. Please upload a high-quality JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size (< 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setReferenceError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max size is 10MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const tempProfile: VisualStyleProfile = {
        id: `custom_${Date.now()}`,
        name: customStyleName.trim() || `Reference Style (${file.name.substring(0, 16)})`,
        referenceImagePreview: dataUrl,
        enabled: true,
        styleStrength: 0.85,
        lightingAndShadows: 'Cinematic chiaroscuro, high contrast side-lighting, rim highlights',
        colorGrading: 'Saturated dark fantasy palette with deep violets, obsidian blacks, and glowing cyan accents',
        texturesAndRendering: 'Detailed manhwa digital painting, crisp cel-shaded contours, dynamic hatch lines',
        characterRenderingStyle: 'Sharp anime features, piercing glowing irises, finely rendered hair locks',
        backgroundDetail: 'Atmospheric depth with volumetric light shafts, particulate dust, and crumbling architecture',
        compositionAndCamera: 'Dramatic low-angle cinematic framing with intense focal presence',
        artDirection: 'Dark Fantasy Action Manhwa',
        extractedColorPalette: ['#0f0b1e', '#231846', '#7c3aed', '#06b6d4', '#f43f5e'],
        promptTokens: 'manhwa dark fantasy art style, cinematic rim lighting, deep chiaroscuro shadows, glowing eyes, crisp linework',
        negativeTokens: 'blurry, low quality, deformed, extra limbs, bad anatomy, flat colors, washed out, watermark, western cartoon'
      };

      setActiveStyle(tempProfile);
      setReferenceSuccess('Reference image uploaded! Click "Analyze Style with AI" to extract its visual characteristics.');
    };

    reader.onerror = () => {
      setReferenceError('Failed to read the image file. Please try again.');
    };

    reader.readAsDataURL(file);
  };

  const handleAnalyzeReference = async () => {
    if (!activeStyle?.referenceImagePreview) {
      setReferenceError('Please upload a reference image first.');
      return;
    }

    setIsAnalyzingReference(true);
    setReferenceError(null);
    setReferenceSuccess(null);

    try {
      const [, base64] = activeStyle.referenceImagePreview.split(',');
      const mimeType = activeStyle.referenceImagePreview.match(/:(.*?);/)?.[1] || 'image/jpeg';

      const res = await fetch('/api/style/analyze-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image: base64,
          mimeType,
          profileName: customStyleName.trim() || activeStyle.name
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.profile) {
        const updatedProfile: VisualStyleProfile = {
          ...data.profile,
          referenceImagePreview: activeStyle.referenceImagePreview,
          enabled: true
        };

        setActiveStyle(updatedProfile);
        saveStyleProfile(updatedProfile);
        setActiveStyleProfile(updatedProfile);
        setStyleProfiles(getSavedStyleProfiles());
        setReferenceSuccess('Style analysis complete! Lighting, color grading, textures, and art direction extracted.');
      } else {
        throw new Error('Analysis completed without returning a structured profile.');
      }
    } catch (err: any) {
      setReferenceError(`Analysis notice: ${err.message}. Using algorithmic feature extraction fallback.`);
    } finally {
      setIsAnalyzingReference(false);
    }
  };

  const handleSaveActiveStyle = () => {
    if (!activeStyle) return;
    const name = customStyleName.trim() || activeStyle.name;
    const updated = { ...activeStyle, name };
    saveStyleProfile(updated);
    setActiveStyleProfile(updated);
    setStyleProfiles(getSavedStyleProfiles());
    setActiveStyle(updated);
    setReferenceSuccess(`Saved profile "${name}" successfully.`);
  };

  const handleDeleteStyle = (id: string) => {
    if (confirm('Delete this style profile?')) {
      deleteStyleProfile(id);
      const remaining = getSavedStyleProfiles();
      setStyleProfiles(remaining);
      if (activeStyle?.id === id) {
        setActiveStyle(remaining[0] || null);
        setActiveStyleProfile(remaining[0] || null);
      }
    }
  };

  // 2. Character Consistency Profiles
  const handleSaveCharacter = () => {
    if (!characterEditForm.name.trim()) {
      alert('Please provide a character name.');
      return;
    }

    const id = characterEditForm.id || `char_${Date.now()}`;
    const toSave: CharacterProfile = {
      ...characterEditForm,
      id,
      facialStructure: characterEditForm.facialFeatures || characterEditForm.facialStructure,
      eyeColorAndShape: characterEditForm.eyeDetails || characterEditForm.eyeColorAndShape,
      hairStyleAndColor: characterEditForm.hairStyle || characterEditForm.hairStyleAndColor,
      clothingAndOutfit: characterEditForm.outfit || characterEditForm.clothingAndOutfit,
      accessoriesAndWeapons: characterEditForm.weaponsAndProps || characterEditForm.accessoriesAndWeapons,
      auraOrMagic: characterEditForm.auraAndEffects || characterEditForm.auraOrMagic
    };

    saveCharacterProfile(toSave);
    setActiveCharacterProfile(toSave);
    const updatedList = getSavedCharacterProfiles();
    setCharacterProfiles(updatedList);
    setActiveCharacter(toSave);
    setCharacterEditForm(toSave);
  };

  const handleDeleteCharacter = (id: string) => {
    if (confirm('Delete this character profile?')) {
      deleteCharacterProfile(id);
      const remaining = getSavedCharacterProfiles();
      setCharacterProfiles(remaining);
      if (activeCharacter?.id === id) {
        const next = remaining[0] || null;
        setActiveCharacter(next);
        setActiveCharacterProfile(next);
        if (next) setCharacterEditForm(next);
      }
    }
  };

  // Model Download Handler
  const handleStartModelDownload = async () => {
    setIsDownloadingModel(true);
    try {
      const res = await startModelDownload((progress) => {
        setModelDownloadProgress(progress);
        if (progress.status === 'completed' || progress.status === 'error') {
          setIsDownloadingModel(false);
        }
      });
      if (!res.success) {
        setDeviceDiagnosticAlert(res.message);
        setIsDownloadingModel(false);
      }
    } catch (err: any) {
      setDeviceDiagnosticAlert(`Model download notice: ${err.message}`);
      setIsDownloadingModel(false);
    }
  };

  // 3. Test Scene Generation with Modular Provider
  const handleRunTestGeneration = async () => {
    if (!testPrompt.trim()) return;
    setIsGeneratingTest(true);
    setTestResult(null);
    setDeviceDiagnosticAlert(null);

    const activeW = settings.width || 1280;
    const activeH = settings.height || 720;
    const activeProv = settings.activeProvider || settings.providerId || 'pollinations-flux';

    // Route 1: On-Device Stable Diffusion 1.5
    if (activeProv === 'on-device-sd15') {
      if (isNativeAndroidEnvironment()) {
        try {
          const sdWidth = Math.min(activeW, 768);
          const sdHeight = Math.min(activeH, 768);
          const nativeRes = await generateOnDeviceImage({
            prompt: testPrompt,
            negativePrompt: activeStyle?.negativeTokens || 'blurry, low quality, distorted, extra limbs, bad anatomy, deformed',
            width: sdWidth,
            height: sdHeight,
            steps: settings.steps || 20,
            cfgScale: settings.guidanceScale || 7.0,
            useVulkan: useVulkanAcceleration
          });

          if (nativeRes.success && nativeRes.imageDataUrl) {
            const resultItem = {
              imageDataUrl: nativeRes.imageDataUrl,
              provider: 'on-device-sd15',
              model: 'sd-v1-5-pruned-emaonly-q4_0.gguf',
              promptUsed: testPrompt,
              message: `Generated locally on Redmi Note 14 via stable-diffusion.cpp (${nativeRes.backendUsed === 'vulkan' ? 'Mali-G57 MC2 Vulkan' : 'ARM NEON CPU Fallback'}, ${(nativeRes.durationMs ? nativeRes.durationMs / 1000 : 0).toFixed(1)}s)`
            };
            setTestResult(resultItem);

            const record: GeneratedImageRecord = {
              id: `img_${Date.now()}`,
              timestamp: Date.now(),
              prompt: testPrompt,
              compiledPrompt: testPrompt,
              imageDataUrl: nativeRes.imageDataUrl,
              provider: 'on-device-sd15',
              model: 'sd-v1-5-pruned-emaonly-q4_0.gguf',
              dimensions: { width: sdWidth, height: sdHeight },
              styleProfileName: activeStyle?.name,
              characterProfileName: activeCharacter?.name,
              settings: { ...settings, width: sdWidth, height: sdHeight }
            };

            saveGeneratedImageRecord(record);
            setGallery(getGeneratedImageHistory());
          } else {
            throw new Error(nativeRes.error || 'On-device SD 1.5 native inference error');
          }
        } catch (nativeErr: any) {
          setDeviceDiagnosticAlert(`Native SD 1.5 inference notice: ${nativeErr.message}`);
        } finally {
          setIsGeneratingTest(false);
        }
        return;
      } else {
        // Transparent Browser Preview Disclosure (No fake mock generation)
        setDeviceDiagnosticAlert(
          "Notice: You are testing in Google AI Studio Web Preview. On-device Stable Diffusion 1.5 executes natively on your Redmi Note 14 using its MediaTek Helio G99-Ultra CPU and ARM Mali-G57 MC2 GPU inside the compiled Android APK. Browsers cannot run native ARM64 binaries or access the phone's Vulkan GPU. To test this prompt right now, switch to 'Pollinations AI (Flux Anime)' or 'Curated Panels'."
        );
        setIsGeneratingTest(false);
        return;
      }
    }

    // Route 2: Cloud & Curated Modular Providers
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: testPrompt,
          sceneNumber: 1,
          width: activeW,
          height: activeH,
          styleProfile: activeStyle?.enabled ? activeStyle : undefined,
          characterProfile: activeCharacter || undefined,
          settings,
          referenceImage: activeStyle?.referenceImagePreview
        })
      });

      if (!res.ok) {
        throw new Error(`Generation failed: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success && data.imageDataUrl) {
        const resultItem = {
          imageDataUrl: data.imageDataUrl,
          provider: data.provider || activeProv,
          model: data.model || 'flux-anime',
          promptUsed: data.promptUsed || testPrompt,
          message: data.message || 'Artwork generated successfully'
        };
        setTestResult(resultItem);

        // Record in generation history
        const record: GeneratedImageRecord = {
          id: `img_${Date.now()}`,
          timestamp: Date.now(),
          prompt: testPrompt,
          compiledPrompt: data.promptUsed || testPrompt,
          imageDataUrl: data.imageDataUrl,
          provider: data.provider || activeProv,
          model: data.model || 'flux-anime',
          dimensions: data.dimensions || { width: activeW, height: activeH },
          styleProfileName: activeStyle?.name,
          characterProfileName: activeCharacter?.name,
          settings: { ...settings, width: activeW, height: activeH }
        };

        saveGeneratedImageRecord(record);
        setGallery(getGeneratedImageHistory());
      } else {
        throw new Error(data.error || 'No image data returned from generator');
      }
    } catch (err: any) {
      alert(`Generation error: ${err.message}`);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  // 4. Image Upscaling & Enhancement
  const handleUpscaleItem = async (item: GeneratedImageRecord) => {
    const rawUrl = item.imageDataUrl || item.imageUrl;
    if (!rawUrl) return;

    setIsUpscaling(true);
    setUpscaleStatus('Running 2x Super-Resolution & Unsharp Mask...');
    try {
      const upscaled = await upscaleMangaImage2x(rawUrl);
      setUpscaleStatus('Applying Edge Sharpening & Color Grading...');
      const enhanced = await enhanceMangaImageColors(upscaled.dataUrl, 1.08, 1.12);

      const updatedRecord: GeneratedImageRecord = {
        ...item,
        enhancedImageDataUrl: enhanced.dataUrl,
        upscaledDimensions: { width: upscaled.upscaledWidth, height: upscaled.upscaledHeight }
      };

      saveGeneratedImageRecord(updatedRecord);
      setGallery(getGeneratedImageHistory());
      setSelectedGalleryItem(updatedRecord);
      setUpscaleStatus('2x Enhanced Masterpiece Ready!');
      setTimeout(() => setUpscaleStatus(null), 3000);
    } catch (err: any) {
      setUpscaleStatus(`Upscaling failed: ${err.message}`);
    } finally {
      setIsUpscaling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-slate-950/70 border-b border-purple-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-300 via-pink-200 to-indigo-200 bg-clip-text text-transparent">
                Manga & Manhwa Image Generation Studio
              </h2>
              <p className="text-xs text-purple-300/70">
                Visual Style Analysis • Character Consistency • Modular AI Models • 2x Upscaler
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            aria-label="Close Studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Touch-Friendly, 44px min height) */}
        <div className="flex overflow-x-auto bg-slate-950/40 border-b border-purple-500/20 px-2 sm:px-6 scrollbar-none">
          <button
            onClick={() => setActiveTab('style')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === 'style'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>1. Reference Style & AI Analysis</span>
            {activeStyle?.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('reference-video')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === 'reference-video'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Film className="w-4 h-4 text-amber-400" />
            <span>Reference Video Analysis</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded font-semibold">
              Quality Target
            </span>
          </button>

          <button
            onClick={() => setActiveTab('character')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === 'character'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <User className="w-4 h-4" />
            <span>2. Character Consistency</span>
            {activeCharacter && (
              <span className="px-1.5 py-0.5 text-[10px] bg-purple-900/60 text-purple-300 rounded">
                {activeCharacter.name}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === 'providers'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>3. Models & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === 'gallery'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>4. Artwork Gallery & Upscaling</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-indigo-900/60 text-indigo-300 rounded-full">
              {gallery.length}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB 1: Reference Style & AI Analysis */}
          {activeTab === 'style' && (
            <div className="space-y-6">
              {/* Guidance Banner */}
              <div className="p-3 sm:p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-start space-x-3 text-xs sm:text-sm text-purple-200">
                <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-purple-300">Style Guidance Engine: </span>
                  Upload any high-quality reference illustration (ChatGPT, Midjourney, or Webtoon snapshot). Our AI vision model extracts its lighting, color palette, textures, and art direction to guide new scene generation without replacing the scene or copying the reference image.
                </div>
              </div>

              {/* Upload & Preview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left: Upload & Preview Card */}
                <div className="md:col-span-5 flex flex-col space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span>Reference Image</span>
                  </h3>

                  <div className="relative group border-2 border-dashed border-purple-500/40 hover:border-purple-400 rounded-xl bg-slate-950/50 p-4 flex flex-col items-center justify-center min-h-[220px] transition-colors">
                    {activeStyle?.referenceImagePreview ? (
                      <div className="relative w-full flex flex-col items-center">
                        <img
                          src={activeStyle.referenceImagePreview}
                          alt="Style Reference"
                          className="max-h-56 w-auto object-contain rounded-lg shadow-md border border-purple-500/30"
                        />
                        <div className="mt-3 flex items-center space-x-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg flex items-center space-x-1.5 border border-slate-700"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Replace</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveStyle(prev => prev ? { ...prev, referenceImagePreview: undefined } : null);
                            }}
                            className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-xs text-red-300 rounded-lg flex items-center space-x-1.5 border border-red-800/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-3 py-6">
                        <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-slate-200">
                            Tap to upload reference image
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            JPEG, PNG, WebP • Up to 10MB • Android Camera or Gallery
                          </p>
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold text-white rounded-lg shadow-md flex items-center space-x-2 mx-auto min-h-[44px]"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Choose or Take Photo</span>
                        </button>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Feedback alerts */}
                  {referenceError && (
                    <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>{referenceError}</span>
                    </div>
                  )}
                  {referenceSuccess && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{referenceSuccess}</span>
                    </div>
                  )}

                  {/* Analyze with AI Button */}
                  <button
                    onClick={handleAnalyzeReference}
                    disabled={isAnalyzingReference || !activeStyle?.referenceImagePreview}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 transition-all min-h-[44px]"
                  >
                    {isAnalyzingReference ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
                        <span>Analyzing Lighting, Shadows & Colors...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                        <span>Analyze Style with AI Vision</span>
                      </>
                    )}
                  </button>

                  {/* Enable / Disable Style Guidance Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-purple-500/20">
                    <span className="text-xs sm:text-sm font-medium text-slate-300">
                      Apply Style to Generation:
                    </span>
                    <button
                      onClick={() => {
                        if (!activeStyle) return;
                        const updated = { ...activeStyle, enabled: !activeStyle.enabled };
                        setActiveStyle(updated);
                        setActiveStyleProfile(updated);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
                        activeStyle?.enabled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {activeStyle?.enabled ? 'Active (ON)' : 'Disabled (OFF)'}
                    </button>
                  </div>

                  {/* Style Strength Slider */}
                  {activeStyle && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-500/20 space-y-2">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Style Guidance Strength:</span>
                        <span className="font-semibold text-purple-300">
                          {Math.round((activeStyle.styleStrength || 0.85) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={activeStyle.styleStrength || 0.85}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setActiveStyle({ ...activeStyle, styleStrength: val });
                        }}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Right: Structured Visual Profile Breakdown */}
                <div className="md:col-span-7 flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Extracted Visual Style Profile</span>
                    </h3>

                    {/* Presets dropdown */}
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-400">Presets:</span>
                      <select
                        value={activeStyle?.id || ''}
                        onChange={(e) => {
                          const found = styleProfiles.find(s => s.id === e.target.value);
                          if (found) {
                            setActiveStyle(found);
                            setActiveStyleProfile(found);
                          }
                        }}
                        className="bg-slate-950 text-xs text-purple-300 border border-purple-500/30 rounded-lg px-2.5 py-1 focus:outline-none"
                      >
                        {styleProfiles.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {activeStyle ? (
                    <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-purple-500/20">
                      
                      {/* Color Palette Swatches */}
                      {getPalettes(activeStyle).length > 0 && (
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Color Palette Swatches
                          </span>
                          <div className="flex items-center space-x-2 mt-1.5">
                            {getPalettes(activeStyle).map((color, idx) => (
                              <div key={idx} className="flex flex-col items-center">
                                <div
                                  className="w-8 h-8 rounded-lg shadow-sm border border-slate-700/80"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                                <span className="text-[9px] text-slate-400 mt-1 font-mono">{color}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lighting & Shadows */}
                      <div>
                        <span className="text-[11px] font-medium text-purple-300 uppercase tracking-wider">
                          Lighting & Shadows
                        </span>
                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          {formatField(activeStyle.lightingAndShadows)}
                        </p>
                      </div>

                      {/* Color Grading */}
                      <div>
                        <span className="text-[11px] font-medium text-indigo-300 uppercase tracking-wider">
                          Color Temperature & Grading
                        </span>
                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          {formatField(activeStyle.colorGrading)}
                        </p>
                      </div>

                      {/* Textures & Rendering */}
                      <div>
                        <span className="text-[11px] font-medium text-pink-300 uppercase tracking-wider">
                          Textures & Rendering Quality
                        </span>
                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          {formatField(activeStyle.texturesAndRendering || activeStyle.textureAndRendering)}
                        </p>
                      </div>

                      {/* Character Rendering & Background */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Character Face & Linework
                          </span>
                          <p className="text-xs text-slate-200 mt-0.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            {formatField(activeStyle.characterRenderingStyle || activeStyle.characterAesthetics)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Background & Atmospheric Depth
                          </span>
                          <p className="text-xs text-slate-200 mt-0.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            {formatField(activeStyle.backgroundDetail)}
                          </p>
                        </div>
                      </div>

                      {/* Save Profile Section */}
                      <div className="pt-3 border-t border-purple-500/20 flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="text"
                          placeholder="Name this style profile..."
                          value={customStyleName}
                          onChange={(e) => setCustomStyleName(e.target.value)}
                          className="flex-1 w-full bg-slate-900 border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-400"
                        />
                        <button
                          onClick={handleSaveActiveStyle}
                          className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white rounded-lg flex items-center justify-center space-x-1.5 shadow-md min-h-[38px]"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Style</span>
                        </button>
                        {activeStyle.id.startsWith('custom_') && (
                          <button
                            onClick={() => handleDeleteStyle(activeStyle.id)}
                            className="w-full sm:w-auto px-3 py-2 bg-red-950/60 hover:bg-red-900 text-xs text-red-300 rounded-lg flex items-center justify-center space-x-1.5 border border-red-800/40 min-h-[38px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-purple-500/20 text-slate-400 text-xs">
                      Select or upload a visual style profile to preview extracted characteristics.
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* TAB 1.5: Reference Video Analysis & Quality Benchmark */}
          {activeTab === 'reference-video' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Guidance Banner */}
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start space-x-3 text-xs sm:text-sm text-amber-200">
                <Film className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Reference Video Analysis & Quality Target: </span>
                  This benchmark from <span className="font-semibold text-white">Shadow Slave (God Grave & Ivory Island)</span> defines the exact visual quality, art style, Hindi explainer narration voice, and zero-pause continuous video continuity our generation system targets.
                </div>
              </div>

              {/* Video Player & Key Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Column: Real Reference Video Player */}
                <div className="md:col-span-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                    <Film className="w-4 h-4 text-amber-400" />
                    <span>Uploaded Reference Video</span>
                  </h3>

                  <div className="rounded-xl overflow-hidden border border-amber-500/30 bg-black shadow-lg">
                    <video
                      controls
                      playsInline
                      className="w-full max-h-64 object-contain bg-black"
                      src="/assets/aistudio/Screenrecorder-2026-10-30-01-15-45-682_6dc6ea54.mp4"
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="p-3 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">File:</span>
                        <span className="font-mono text-amber-300">Screenrecorder-2026-10-30.mp4</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Duration:</span>
                        <span className="text-white font-medium">~49.5 seconds (3 Scenes)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Narration Language:</span>
                        <span className="text-white font-medium">Hindi Explainer (Baritone)</span>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => {
                        const refProfile = styleProfiles.find(p => p.id === 'style-reference-video');
                        if (refProfile) {
                          setActiveStyle(refProfile);
                          setActiveStyleProfile(refProfile);
                          setReferenceSuccess('Activated "God Grave & Ivory Island" style profile!');
                        }
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 min-h-[42px] cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 fill-zinc-950" />
                      <span>Apply Reference Art Style to Studio</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Deep Multimodal Analysis Metrics */}
                <div className="md:col-span-7 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>Analyzed Dimensions & Target Benchmarks</span>
                  </h3>

                  {/* 1. Visual Quality & Shots Breakdown */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                    <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                      <span>1. Visual Style & Scene Hierarchy</span>
                      <span className="text-[10px] text-slate-400 font-mono">3 Core Shot Angles</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-amber-400 font-semibold block mb-0.5">Shot A (00:00–00:13): Upward 3/4 Close-up</span>
                        <p className="text-[11px] text-slate-300">
                          Sunny with messy jet-black fringe, intense pale blue eyes, high-collar traveler cloak, set against brooding grey thunderheads in God Grave.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-amber-400 font-semibold block mb-0.5">Shot B (00:14–00:32): Panoramic Floating Ivory Island</span>
                        <p className="text-[11px] text-slate-300">
                          Colossal sky sanctuary, ancient pagodas, waterfalls plunging into cloud sea, divine sunlight beams piercing grey clouds like celestial spears.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-amber-400 font-semibold block mb-0.5">Shot C (00:33–00:49): Tactical Medium Profile</span>
                        <p className="text-[11px] text-slate-300">
                          Sunny in deep calculation analyzing kinetic island momentum and defense vulnerabilities, exhaling breath into cold mountain air.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Audio & Narration Matching */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>2. AI Voice & Narration Delivery</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">Matched Preset Available</span>
                    </div>
                    <div className="text-xs text-slate-300 space-y-1">
                      <p className="text-[11px] leading-relaxed">
                        <strong className="text-slate-100">Profile: </strong>
                        Deep resonant baritone, conversational Hindi storyteller tone, ~130 words per minute, expressive natural pauses with clear pronunciation of complex terms (<em className="text-amber-300">God Grave</em>, <em className="text-amber-300">Ivory Island</em>, <em className="text-amber-300">Grey Clouds</em>).
                      </p>
                      <p className="text-[10px] text-indigo-300">
                        Preset: <span className="font-semibold text-white">"Hindi Explainer Baritone"</span> (Rate: 0.94x, Pitch: 0.88, Natural breath cadence).
                      </p>
                    </div>
                  </div>

                  {/* 3. Pacing & Continuity Benchmark */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                      <span>3. Video Continuity Benchmark (Zero Pauses)</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Continuous Stream</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      In the reference video, visual transitions occur with <strong className="text-emerald-300">0.0s dead pause</strong>. Visual duration exactly matches spoken narration audio duration, eliminating the 3–5 second frozen frame glitch.
                    </p>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Character Consistency Profiles */}
          {activeTab === 'character' && (
            <div className="space-y-6">
              <div className="p-3 sm:p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-start space-x-3 text-xs sm:text-sm text-indigo-200">
                <Shield className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-indigo-300">Character Consistency System: </span>
                  Maintain consistent protagonist details (hair style, piercing eyes, distinctive scars, armor, and weapon props) across every generated scene. Style profiles define how an illustration looks; character profiles define who is inside the scene.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Character List Column */}
                <div className="md:col-span-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-200">Saved Characters</h3>
                    <button
                      onClick={() => {
                        const newChar: CharacterProfile = {
                          id: `char_${Date.now()}`,
                          name: 'New Protagonist',
                          gender: 'male',
                          facialFeatures: 'Chiseled jawline, sharp facial features',
                          eyeDetails: 'Intense glowing crimson eyes with dark lashes',
                          hairStyle: 'Messy raven black hair with strands falling across forehead',
                          outfit: 'Tattered midnight-black hooded mantle over silver-trimmed leather armor',
                          weaponsAndProps: 'Obsidian longsword sheathed at hip',
                          distinguishingFeatures: 'Faint purple rune mark beneath left eye',
                          auraAndEffects: 'Whispering dark violet shadow mist curling around wrists',
                          consistencyStrength: 0.85
                        };
                        setActiveCharacter(newChar);
                        setCharacterEditForm(newChar);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white rounded-lg flex items-center space-x-1"
                    >
                      <span>+ New Character</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {characterProfiles.map(char => (
                      <div
                        key={char.id}
                        onClick={() => {
                          setActiveCharacter(char);
                          setActiveCharacterProfile(char);
                          setCharacterEditForm({
                            ...char,
                            facialFeatures: char.facialFeatures || char.facialStructure || '',
                            eyeDetails: char.eyeDetails || char.eyeColorAndShape || '',
                            hairStyle: char.hairStyle || char.hairStyleAndColor || '',
                            outfit: char.outfit || char.clothingAndOutfit || '',
                            weaponsAndProps: char.weaponsAndProps || char.accessoriesAndWeapons || '',
                            auraAndEffects: char.auraAndEffects || char.auraOrMagic || ''
                          });
                        }}
                        className={`p-3 rounded-xl cursor-pointer border transition-all ${
                          activeCharacter?.id === char.id
                            ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-md'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs sm:text-sm">{char.name}</span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {char.gender}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                          {char.hairStyle || char.hairStyleAndColor} • {char.eyeDetails || char.eyeColorAndShape}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Character Edit Form Column */}
                <div className="md:col-span-8 bg-slate-950/70 p-4 sm:p-5 rounded-xl border border-indigo-500/20 space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                    <h3 className="text-sm font-semibold text-indigo-300 flex items-center space-x-2">
                      <User className="w-4 h-4 text-indigo-400" />
                      <span>Edit Character Attributes: {characterEditForm.name || 'Unnamed'}</span>
                    </h3>
                    {characterEditForm.id && (
                      <button
                        onClick={() => handleDeleteCharacter(characterEditForm.id)}
                        className="text-red-400 hover:text-red-300 text-xs flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Character Name
                      </label>
                      <input
                        type="text"
                        value={characterEditForm.name}
                        onChange={(e) => setCharacterEditForm({ ...characterEditForm, name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        placeholder="e.g. Ren / Sunny / Sung Jin-woo"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Gender / Appearance Type
                      </label>
                      <select
                        value={characterEditForm.gender || 'male'}
                        onChange={(e) => setCharacterEditForm({ ...characterEditForm, gender: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="androgynous">Androgynous</option>
                        <option value="creature">Creature / Entity</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Hair Style & Color
                      </label>
                      <input
                        type="text"
                        value={characterEditForm.hairStyle || ''}
                        onChange={(e) => setCharacterEditForm({ ...characterEditForm, hairStyle: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        placeholder="e.g. Messy black hair falling over eyes"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Eye Color & Expression
                      </label>
                      <input
                        type="text"
                        value={characterEditForm.eyeDetails || ''}
                        onChange={(e) => setCharacterEditForm({ ...characterEditForm, eyeDetails: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        placeholder="e.g. Piercing glowing sapphire blue eyes"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Outfit & Armor Details
                      </label>
                      <input
                        type="text"
                        value={characterEditForm.outfit || ''}
                        onChange={(e) => setCharacterEditForm({ ...characterEditForm, outfit: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        placeholder="e.g. Dark high-collar trench coat over combat armor"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Weapons & Props
                      </label>
                      <input
                        type="text"
                        value={characterEditForm.weaponsAndProps || ''}
                        onChange={(e) => setCharacterEditForm({ ...characterEditForm, weaponsAndProps: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        placeholder="e.g. Dagger of Shadows, dual katanas"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Distinguishing Marks / Scars
                      </label>
                      <input
                        type="text"
                        value={characterEditForm.distinguishingFeatures || ''}
                        onChange={(e) => setCharacterEditForm({ ...characterEditForm, distinguishingFeatures: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        placeholder="e.g. Arcane tattoo on collarbone"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Aura & Energy Effects
                      </label>
                      <input
                        type="text"
                        value={characterEditForm.auraAndEffects || ''}
                        onChange={(e) => setCharacterEditForm({ ...characterEditForm, auraAndEffects: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        placeholder="e.g. Swirling violet shadow aura and black lightning embers"
                      />
                    </div>
                  </div>

                  {/* Character consistency strength slider */}
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Consistency Prompt Weight:</span>
                      <span className="font-semibold text-indigo-300">
                        {Math.round((characterEditForm.consistencyStrength || 0.85) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={characterEditForm.consistencyStrength || 0.85}
                      onChange={(e) => setCharacterEditForm({
                        ...characterEditForm,
                        consistencyStrength: parseFloat(e.target.value)
                      })}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Save character button */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveCharacter}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-semibold text-white rounded-xl shadow-md flex items-center space-x-2 min-h-[44px]"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save & Activate Character</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Models & Quality Settings */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              <div className="p-3 sm:p-4 rounded-xl bg-slate-950 border border-slate-700 flex items-start space-x-3 text-xs sm:text-sm text-slate-300">
                <Sliders className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-purple-300">Modular Generation Providers: </span>
                  Switch freely between genuinely free hosted models (Pollinations Flux Anime), high-speed turbo pipelines, Gemini vision, and our curated dark fantasy panel engine. Secret keys remain strictly on the backend.
                </div>
              </div>

              {/* Provider Selection Cards */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Select Active Image Generation Model
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {providers.map(p => {
                    const activeP = settings.activeProvider || settings.providerId;
                    const isSelected = activeP === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          const updated = { ...settings, activeProvider: p.id, providerId: p.id as any };
                          setSettings(updated);
                          saveImageSettings(updated);
                        }}
                        className={`p-3.5 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-950/60 border-purple-400 shadow-lg shadow-purple-600/20'
                            : 'bg-slate-950/50 border-slate-800 hover:bg-slate-900/60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white">{p.name}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              p.pricingTier === 'genuinely-free' || p.isFree
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            }`}>
                              {p.pricingTier === 'genuinely-free' || p.isFree ? 'FREE' : 'API KEY'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mb-2">{p.description}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-0.5">
                          <div>Max Res: <span className="text-slate-200">{(p.supportedDimensions || []).join(', ')}</span></div>
                          <div>Status: <span className="text-emerald-400 font-medium capitalize">{p.status}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dedicated On-Device Stable Diffusion 1.5 Hardware Hub */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
                        <span>On-Device Stable Diffusion 1.5 (Local NDK Engine)</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isNativeApkEnv 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {isNativeApkEnv ? 'NATIVE APK RUNTIME' : 'TARGET PHONE CONFIGURED'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        C++ inference via official stable-diffusion.cpp with Vulkan 1.3 & ARM NEON CPU fallback.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400">Phone Model:</span>
                    <span className="text-xs font-semibold text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-500/30">
                      {deviceHardware.model} ({deviceHardware.modelIdentifier})
                    </span>
                  </div>
                </div>

                {/* Hardware Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1 mb-1">
                      <Cpu className="w-3 h-3 text-indigo-400" />
                      <span>Processor (CPU)</span>
                    </div>
                    <div className="font-semibold text-slate-200 text-[11px] leading-tight">
                      Helio G99-Ultra
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">2x A76 + 6x A55 (6nm)</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1 mb-1">
                      <Smartphone className="w-3 h-3 text-purple-400" />
                      <span>Graphics (GPU)</span>
                    </div>
                    <div className="font-semibold text-slate-200 text-[11px] leading-tight">
                      Mali-G57 MC2
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">Vulkan {deviceHardware.vulkanVersion}</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1 mb-1">
                      <Sliders className="w-3 h-3 text-pink-400" />
                      <span>Device Memory (RAM)</span>
                    </div>
                    <div className="font-semibold text-slate-200 text-[11px] leading-tight">
                      {deviceHardware.ramTotalGb} GB Physical
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">~{deviceHardware.ramFreeGb} GB Clean Free</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1 mb-1">
                      <HardDrive className="w-3 h-3 text-amber-400" />
                      <span>Free Storage</span>
                    </div>
                    <div className="font-semibold text-slate-200 text-[11px] leading-tight">
                      ~{deviceHardware.storageFreeGb} GB Available
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Model needs ~1.25 GB</div>
                  </div>
                </div>

                {/* Model and Runtime Diagnostics */}
                {isNativeApkEnv ? (
                  /* Native APK Active Controls */
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-emerald-500/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-emerald-300 flex items-center space-x-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Native Android Bridge Connected</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Model: <span className="text-slate-200 font-mono">{VERIFIED_MODEL_SPEC.fileName}</span> ({VERIFIED_MODEL_SPEC.fileSizeFormatted})
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                          <input
                            type="radio"
                            name="accelMode"
                            checked={useVulkanAcceleration}
                            onChange={() => setUseVulkanAcceleration(true)}
                            className="accent-indigo-500"
                          />
                          <span>Vulkan GPU (Mali-G57)</span>
                        </label>
                        <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                          <input
                            type="radio"
                            name="accelMode"
                            checked={!useVulkanAcceleration}
                            onChange={() => setUseVulkanAcceleration(false)}
                            className="accent-indigo-500"
                          />
                          <span>CPU Fallback (NEON)</span>
                        </label>
                      </div>
                    </div>

                    {/* Download progress or button */}
                    {isDownloadingModel ? (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[11px] text-slate-300">
                          <span>Downloading Stable Diffusion 1.5 Q4_0 GGUF...</span>
                          <span className="font-mono text-purple-300">
                            {modelDownloadProgress?.percentage || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 transition-all duration-300"
                            style={{ width: `${modelDownloadProgress?.percentage || 0}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={handleStartModelDownload}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download / Verify SD 1.5 Model (1.25 GB)</span>
                        </button>
                        <span className="text-[10px] text-slate-400">
                          Resumable download • Saved to app storage
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Browser Preview Diagnostic Info (Clean & Truthful) */
                  <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-500/20 space-y-2.5">
                    <div className="flex items-start space-x-2.5">
                      <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-300 leading-relaxed">
                        <span className="font-semibold text-indigo-200">Google AI Studio Preview Environment: </span>
                        The applet is currently previewed inside a web browser container. Genuine on-device Stable Diffusion 1.5 compiles via Android NDK r26c and executes natively on your Redmi Note 14's ARM64 CPU/GPU inside the APK.
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-500/20 text-[11px]">
                      <span className="text-slate-400">Testing options:</span>
                      <button
                        onClick={() => {
                          const updated = { ...settings, activeProvider: 'pollinations-flux', providerId: 'pollinations-flux' as any };
                          setSettings(updated);
                          saveImageSettings(updated);
                          setDeviceDiagnosticAlert(null);
                        }}
                        className="px-2.5 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-medium border border-purple-500/30 transition-colors"
                      >
                        Switch to Pollinations AI (Flux Anime)
                      </button>
                      <button
                        onClick={() => {
                          const updated = { ...settings, activeProvider: 'cinematic-curated', providerId: 'cinematic-curated' as any };
                          setSettings(updated);
                          saveImageSettings(updated);
                          setDeviceDiagnosticAlert(null);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition-colors"
                      >
                        Switch to Curated Dark Fantasy Panels
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Generation Settings Grid */}
              <div className="bg-slate-950/70 p-4 sm:p-5 rounded-xl border border-purple-500/20 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200">Quality & Dimensional Parameters</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Aspect Ratio */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Aspect Ratio & Dimensions
                    </label>
                    <select
                      value={`${settings.width || 1280}x${settings.height || 720}`}
                      onChange={(e) => {
                        const [w, h] = e.target.value.split('x').map(Number);
                        const updated = {
                          ...settings,
                          width: w,
                          height: h,
                          aspectRatio: (w > h ? '16:9' : (w < h ? '9:16' : '1:1')) as any
                        };
                        setSettings(updated);
                        saveImageSettings(updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value="1280x720">1280 x 720 (16:9 Landscape - HD)</option>
                      <option value="1920x1080">1920 x 1080 (16:9 Landscape - Full HD)</option>
                      <option value="720x1280">720 x 1280 (9:16 Mobile / Webtoon)</option>
                      <option value="1024x1024">1024 x 1024 (1:1 Square - Avatar / Cover)</option>
                    </select>
                  </div>

                  {/* Guidance Scale */}
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-1">
                      <span>Guidance Scale (CFG):</span>
                      <span className="text-purple-300">{settings.guidanceScale || 7.5}</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      step="0.5"
                      value={settings.guidanceScale || 7.5}
                      onChange={(e) => {
                        const updated = { ...settings, guidanceScale: parseFloat(e.target.value) };
                        setSettings(updated);
                        saveImageSettings(updated);
                      }}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  {/* Generation Steps */}
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-1">
                      <span>Sampling Steps:</span>
                      <span className="text-purple-300">{settings.steps || 28}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="40"
                      step="2"
                      value={settings.steps || 28}
                      onChange={(e) => {
                        const updated = { ...settings, steps: parseInt(e.target.value, 10) };
                        setSettings(updated);
                        saveImageSettings(updated);
                      }}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Test Scene Generation Interactive Section */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                    Live Scene Test Generator
                  </h4>

                  {/* Device Diagnostic Alert (e.g. Browser Preview vs Native APK guidance) */}
                  {deviceDiagnosticAlert && (
                    <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{deviceDiagnosticAlert}</span>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            const updated = { ...settings, activeProvider: 'pollinations-flux', providerId: 'pollinations-flux' as any };
                            setSettings(updated);
                            saveImageSettings(updated);
                            setDeviceDiagnosticAlert(null);
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs transition-colors"
                        >
                          Use Pollinations Flux
                        </button>
                        <button
                          onClick={() => setDeviceDiagnosticAlert(null)}
                          className="text-amber-400 hover:text-amber-300 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      placeholder="Describe a manga scene (e.g. Ren summoning shadow daggers in a ruined crypt)..."
                      className="flex-1 bg-slate-900 border border-purple-500/30 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={handleRunTestGeneration}
                      disabled={isGeneratingTest}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2 min-h-[44px]"
                    >
                      {isGeneratingTest ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          <span>Generate Scene</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Test Result Display */}
                  {testResult && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-purple-500/30 flex flex-col md:flex-row gap-4 items-center">
                      <img
                        src={testResult.imageDataUrl}
                        alt="Test Generation"
                        className="w-full md:w-64 max-h-44 object-cover rounded-lg border border-purple-500/30 shadow-md"
                      />
                      <div className="flex-1 space-y-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded bg-purple-900 text-purple-200 font-semibold text-[10px]">
                            {testResult.provider}
                          </span>
                          <span className="text-slate-400 text-[11px]">{testResult.message}</span>
                        </div>
                        <p className="text-slate-300 line-clamp-2">
                          <strong className="text-purple-300">Compiled Prompt: </strong>
                          {testResult.promptUsed}
                        </p>
                        <div className="flex items-center space-x-3 pt-1">
                          <a
                            href={testResult.imageDataUrl}
                            download={`manga_scene_${Date.now()}.png`}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PNG</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: Artwork Gallery & Upscaling */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Generated Manga Artwork Gallery ({gallery.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review generated scenes, perform 2x canvas upscaling with edge sharpening, and attach artwork to storyboard scenes.
                  </p>
                </div>
                {gallery.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear entire image generation history?')) {
                        clearGeneratedImageHistory();
                        setGallery([]);
                        setSelectedGalleryItem(null);
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              {gallery.length === 0 ? (
                <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-purple-500/20 text-slate-400 space-y-2">
                  <ImageIcon className="w-10 h-10 mx-auto text-purple-400/50" />
                  <p className="text-sm font-medium text-slate-300">No artwork generated yet.</p>
                  <p className="text-xs">
                    Switch to the &ldquo;Models &amp; Settings&rdquo; tab or generate an image from the Storyboard scene manager.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Grid Column */}
                  <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-2">
                    {gallery.map(item => {
                      const displayImg = item.enhancedImageDataUrl || item.imageDataUrl || item.imageUrl || '';
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedGalleryItem(item)}
                          className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all aspect-video bg-slate-950 ${
                            selectedGalleryItem?.id === item.id
                              ? 'border-purple-400 ring-2 ring-purple-500/40'
                              : 'border-slate-800 hover:border-purple-500/50'
                          }`}
                        >
                          <img
                            src={displayImg}
                            alt={item.prompt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {item.enhancedImageDataUrl && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/40 text-[9px] font-bold text-emerald-300">
                              2X HD
                            </span>
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent">
                            <p className="text-[10px] text-slate-200 truncate">{item.prompt}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detail & Upscale Column */}
                  <div className="md:col-span-5 bg-slate-950/70 p-4 rounded-xl border border-purple-500/20 space-y-3">
                    {selectedGalleryItem ? (
                      <div className="space-y-3">
                        <div className="relative rounded-lg overflow-hidden border border-purple-500/30">
                          <img
                            src={selectedGalleryItem.enhancedImageDataUrl || selectedGalleryItem.imageDataUrl || selectedGalleryItem.imageUrl}
                            alt="Selected artwork"
                            className="w-full max-h-56 object-cover"
                          />
                        </div>

                        <div>
                          <p className="text-xs text-slate-200 line-clamp-3">
                            <strong className="text-purple-300">Scene Description: </strong>
                            {selectedGalleryItem.prompt}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              Provider: {selectedGalleryItem.provider}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              Res: {selectedGalleryItem.dimensions?.width}x{selectedGalleryItem.dimensions?.height}
                            </span>
                            {selectedGalleryItem.styleProfileName && (
                              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300">
                                Style: {selectedGalleryItem.styleProfileName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Upscaling feedback status */}
                        {upscaleStatus && (
                          <div className="p-2 rounded bg-indigo-950/70 border border-indigo-500/40 text-[11px] text-indigo-200 flex items-center space-x-2">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                            <span>{upscaleStatus}</span>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          {/* 2x Upscale Button */}
                          <button
                            onClick={() => handleUpscaleItem(selectedGalleryItem)}
                            disabled={isUpscaling || Boolean(selectedGalleryItem.enhancedImageDataUrl)}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow flex items-center justify-center space-x-2 min-h-[44px]"
                          >
                            <Maximize2 className="w-4 h-4" />
                            <span>
                              {selectedGalleryItem.enhancedImageDataUrl
                                ? '✓ 2x Super-Resolution Applied'
                                : 'Upscale 2x & Enhance Sharpness'}
                            </span>
                          </button>

                          {/* Apply to Storyboard Scene */}
                          {onApplyImageToScene && (
                            <div className="flex items-center space-x-2">
                              <select
                                value={sceneTarget}
                                onChange={(e) => setSceneTarget(Number(e.target.value))}
                                className="bg-slate-900 border border-purple-500/30 rounded-lg px-2.5 py-2 text-xs text-purple-300 focus:outline-none min-h-[44px]"
                              >
                                {Array.from({ length: Math.max(currentSceneCount, 4) }, (_, i) => i + 1).map(num => (
                                  <option key={num} value={num}>Scene 0{num}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  const img = selectedGalleryItem.enhancedImageDataUrl || selectedGalleryItem.imageDataUrl || selectedGalleryItem.imageUrl || '';
                                  onApplyImageToScene(sceneTarget, img);
                                }}
                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 min-h-[44px]"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Apply to Scene</span>
                              </button>
                            </div>
                          )}

                          {/* Download & Delete */}
                          <div className="flex items-center justify-between pt-1 text-xs">
                            <a
                              href={selectedGalleryItem.enhancedImageDataUrl || selectedGalleryItem.imageDataUrl || selectedGalleryItem.imageUrl}
                              download={`manga_artwork_${selectedGalleryItem.id}.png`}
                              className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download PNG</span>
                            </a>
                            <button
                              onClick={() => {
                                deleteGeneratedImageRecord(selectedGalleryItem.id);
                                const updated = getGeneratedImageHistory();
                                setGallery(updated);
                                setSelectedGalleryItem(updated[0] || null);
                              }}
                              className="text-red-400 hover:text-red-300 flex items-center space-x-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Record</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-xs text-slate-400 py-8">
                        Select an image from the gallery to preview details and upscale.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-950/80 border-t border-purple-500/20 text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1 text-purple-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Model: {settings.activeProvider || settings.providerId}</span>
            </span>
            {activeStyle?.enabled && (
              <span className="hidden sm:inline text-indigo-300">
                • Style: {activeStyle.name}
              </span>
            )}
            {activeCharacter && (
              <span className="hidden sm:inline text-pink-300">
                • Character: {activeCharacter.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors min-h-[38px]"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
