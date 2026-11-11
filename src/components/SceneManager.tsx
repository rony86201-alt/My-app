import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Play, 
  Square, 
  Volume2, 
  RefreshCw, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Copy, 
  Plus, 
  Upload, 
  Sliders, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Eye, 
  Maximize2,
  Film,
  Zap,
  HelpCircle,
  Grid,
  Check,
  ArrowRight,
  Palette
} from 'lucide-react';
import { Scene, NarrationLanguage, VoiceSettings } from '../types';
import { speechService } from '../utils/speechService';
import { generateProceduralAnimeImage } from '../utils/proceduralAnime';
import { REFERENCE_HERO, REFERENCE_SCENE_ART } from '../utils/referenceArt';

interface SceneManagerProps {
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  language: NarrationLanguage;
  voiceSettings: VoiceSettings;
  onGenerateImage: (sceneId: string) => Promise<void>;
  onGenerateAllImages: () => Promise<void>;
  isGeneratingAll: boolean;
  bulkProgress: { current: number; total: number };
  onPreviewImage: (imageUrl: string, sceneNum: number, prompt: string) => void;
  onGoToStoryboard: () => void;
  onOpenImageStudio?: () => void;
}

export const SceneManager: React.FC<SceneManagerProps> = ({
  scenes,
  setScenes,
  language,
  voiceSettings,
  onGenerateImage,
  onGenerateAllImages,
  isGeneratingAll,
  bulkProgress,
  onPreviewImage,
  onGoToStoryboard,
  onOpenImageStudio,
}) => {
  const [activePlayingSceneId, setActivePlayingSceneId] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'gallery'>('editor');
  const playAllIndexRef = useRef<number>(0);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Move scene up/down
  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const newScenes = [...scenes];
    const [moved] = newScenes.splice(index, 1);
    newScenes.splice(targetIndex, 0, moved);

    // Re-index order
    const updated = newScenes.map((s, idx) => ({ ...s, order: idx + 1 }));
    setScenes(updated);
  };

  // Delete scene
  const handleDeleteScene = (id: string) => {
    if (scenes.length <= 1) return;
    const filtered = scenes.filter(s => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 }));
    setScenes(filtered);
  };

  // Duplicate scene
  const handleDuplicateScene = (index: number) => {
    const target = scenes[index];
    const duplicate: Scene = {
      ...target,
      id: `scene-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order: index + 2,
    };
    const newScenes = [...scenes];
    newScenes.splice(index + 1, 0, duplicate);
    setScenes(newScenes.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  // Add blank scene
  const handleAddScene = (index: number) => {
    const newScene: Scene = {
      id: `scene-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order: index + 2,
      originalText: '',
      description: 'The dark warrior unleashes an abyssal slash across the shadow citadel.',
      imagePrompt: 'cinematic dark fantasy anime, dark warrior unleashing blue sword aura in gothic ruins, dramatic volumetric lighting',
      narrationText: language === 'hi' ? 'अंधेरे की ताकत अब अपने चरम पर थी।' : 'The abyssal surge awakened with ferocious fury.',
      duration: 5,
      imageStatus: 'idle',
    };
    const newScenes = [...scenes];
    newScenes.splice(index + 1, 0, newScene);
    setScenes(newScenes.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  // Update specific scene field
  const updateScene = (id: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Play narration for single scene
  const handlePlayNarration = (scene: Scene) => {
    if (activePlayingSceneId === scene.id) {
      speechService.stop();
      setActivePlayingSceneId(null);
      return;
    }

    setActivePlayingSceneId(scene.id);
    speechService.speak(scene.narrationText, {
      lang: language,
      voiceURI: voiceSettings.voiceURI,
      rate: voiceSettings.rate,
      pitch: voiceSettings.pitch,
      sceneId: scene.id,
      onEnd: () => {
        setActivePlayingSceneId(null);
      },
      onError: () => {
        setActivePlayingSceneId(null);
      },
    });
  };

  // Play narration across all scenes sequentially
  const handlePlayAllNarration = () => {
    if (isPlayingAll) {
      speechService.stop();
      setIsPlayingAll(false);
      setActivePlayingSceneId(null);
      return;
    }

    if (scenes.length === 0) return;

    setIsPlayingAll(true);
    playAllIndexRef.current = 0;

    const playNext = (index: number) => {
      if (index >= scenes.length) {
        setIsPlayingAll(false);
        setActivePlayingSceneId(null);
        return;
      }

      const scene = scenes[index];
      setActivePlayingSceneId(scene.id);

      speechService.speak(scene.narrationText, {
        lang: language,
        voiceURI: voiceSettings.voiceURI,
        rate: voiceSettings.rate,
        pitch: voiceSettings.pitch,
        sceneId: scene.id,
        onEnd: () => {
          // Continuous seamless flow with zero artificial pause
          playAllIndexRef.current++;
          playNext(playAllIndexRef.current);
        },
        onError: () => {
          playAllIndexRef.current++;
          playNext(playAllIndexRef.current);
        },
      });
    };

    playNext(0);
  };

  // Upload custom art
  const handleUploadImage = (sceneId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateScene(sceneId, {
        imageUrl: dataUrl,
        imageProvider: 'Custom Upload',
        imageStatus: 'ready',
        imageError: undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  // Generate instant procedural anime art
  const handleUseProcedural = (scene: Scene) => {
    const dataUrl = generateProceduralAnimeImage(scene.description, scene.order);
    updateScene(scene.id, {
      imageUrl: dataUrl,
      imageProvider: 'Procedural Anime Engine',
      imageStatus: 'ready',
      imageError: undefined,
    });
  };

  // Load authentic reference artwork matching the user's uploaded style
  const handleUseReferenceArt = (scene: Scene) => {
    const refArt = REFERENCE_SCENE_ART[scene.order] || REFERENCE_SCENE_ART[1];
    updateScene(scene.id, {
      imageUrl: refArt.dataUrl,
      imageProvider: `Cinematic Reference: ${refArt.title}`,
      imageStatus: 'ready',
      imageError: undefined,
    });
  };

  // Append Ren character anchors to all scene prompts
  const handleApplyRenToAll = () => {
    const renTag = 'Ren (Shadow Blade, messy black hair, piercing blue eyes, cheek scar, dark hooded cowl, dark armor, rune sword)';
    setScenes(prev => prev.map(s => {
      const current = s.imagePrompt || '';
      if (current.includes('Ren')) return s;
      return {
        ...s,
        imagePrompt: current ? `${current}, ${renTag}` : renTag
      };
    }));
  };

  // Add quick prompt enhancer tag
  const appendPromptTag = (scene: Scene, tag: string) => {
    const current = scene.imagePrompt || '';
    const updated = current ? `${current}, ${tag}` : tag;
    updateScene(scene.id, { imagePrompt: updated });
  };

  const totalRuntime = scenes.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Top Action Bar - Pure Black & Dark Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
            <Sliders className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-cinzel text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              Scene Management & Artwork
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-900 text-amber-400 border border-zinc-700 font-mono">
                {scenes.length} Scenes
              </span>
            </h2>
            <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              Total Suggested Video Length: ~{totalRuntime} seconds
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'editor'
                  ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Scene Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gallery')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'gallery'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Review Gallery (Images 1..{scenes.length})</span>
            </button>
          </div>

          {/* Generate All Images */}
          <button
            type="button"
            onClick={onGenerateAllImages}
            disabled={isGeneratingAll}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer ${
              isGeneratingAll
                ? 'bg-zinc-900 text-zinc-400 border border-zinc-700 cursor-wait'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
            }`}
          >
            <Sparkles className={`w-4 h-4 text-amber-400 ${isGeneratingAll ? 'animate-spin' : ''}`} />
            <span>
              {isGeneratingAll
                ? `Generating (${bulkProgress.current}/${bulkProgress.total})...`
                : 'Gen All Images'}
            </span>
          </button>

          {/* Style & Image Studio */}
          {onOpenImageStudio && (
            <button
              type="button"
              onClick={onOpenImageStudio}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-purple-950/80 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-500/40 transition-all shadow-md cursor-pointer"
              title="Open Manga Reference Style Analysis & Character Consistency Studio"
            >
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Style & Character Studio</span>
            </button>
          )}

          {/* Play All Narration */}
          <button
            type="button"
            onClick={handlePlayAllNarration}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
              isPlayingAll
                ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                : 'bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border-zinc-700'
            }`}
          >
            {isPlayingAll ? <Square className="w-4 h-4 text-rose-400" /> : <Play className="w-4 h-4 text-amber-400 fill-amber-400" />}
            <span>{isPlayingAll ? 'Stop Voice' : 'Play Narration'}</span>
          </button>

          {/* CONTINUE TO VIDEO GENERATION - Prominent CTA */}
          <button
            type="button"
            onClick={onGoToStoryboard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs sm:text-sm font-black transition-all cursor-pointer shadow-md border border-amber-300"
          >
            <span>Continue to Video Generation</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Reference Character Consistency Anchor Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={REFERENCE_HERO.avatar}
                alt={REFERENCE_HERO.name}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-zinc-700 shadow-lg"
              />
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-zinc-900 border border-amber-500/50 text-[9px] font-bold text-amber-400">
                PROTAGONIST
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-cinzel text-base sm:text-lg font-bold text-white">
                  {REFERENCE_HERO.name}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  Consistent Character Lock Active
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                {REFERENCE_HERO.description}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] text-zinc-500 font-semibold">Visual Anchors:</span>
                {REFERENCE_HERO.visualAnchors.map((anchor) => (
                  <span
                    key={anchor}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800"
                  >
                    {anchor}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyRenToAll}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all cursor-pointer shrink-0"
          >
            Apply Hero Anchors to All Prompts
          </button>
        </div>
      </div>

      {/* Scene Cards List (Preserves Original Order) */}
      <div className="space-y-6">
        {scenes.map((scene, index) => {
          const isCurrentlySpeaking = activePlayingSceneId === scene.id;

          return (
            <div
              key={scene.id}
              className={`rounded-2xl border transition-all duration-300 p-4 sm:p-6 ${
                isCurrentlySpeaking
                  ? 'bg-zinc-900/90 border-amber-500 ring-1 ring-amber-500/40 shadow-xl'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Scene Header */}
              <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <span className="font-cinzel text-base sm:text-lg font-black tracking-wider text-white bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-700">
                    SCENE #{scene.order}
                  </span>
                  {scene.imageUrl && (
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Art Ready
                    </span>
                  )}
                  {isCurrentlySpeaking && (
                    <span className="text-[11px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded animate-pulse flex items-center gap-1 border border-amber-700/50">
                      <Volume2 className="w-3 h-3 text-amber-400" />
                      Speaking...
                    </span>
                  )}
                </div>

                {/* Reorder and Card Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleMoveScene(index, 'up')}
                    disabled={index === 0}
                    title="Move Scene Up"
                    className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveScene(index, 'down')}
                    disabled={index === scenes.length - 1}
                    title="Move Scene Down"
                    className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateScene(index)}
                    title="Duplicate Scene"
                    className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddScene(index)}
                    title="Insert Scene After"
                    className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteScene(scene.id)}
                    disabled={scenes.length <= 1}
                    title="Delete Scene"
                    className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Body: Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left: Image Artwork & Generation (5 cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 group">
                    {scene.imageUrl ? (
                      <>
                        <img
                          src={scene.imageUrl}
                          alt={`Scene ${scene.order}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                          onClick={() => onPreviewImage(scene.imageUrl!, scene.order, scene.imagePrompt)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                        
                        {/* Provider tag */}
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] text-zinc-300 border border-zinc-700">
                          {scene.imageProvider || 'Manga Artwork'}
                        </div>

                        {/* Expand button */}
                        <button
                          type="button"
                          onClick={() => onPreviewImage(scene.imageUrl!, scene.order, scene.imagePrompt)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="View Full Resolution"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : scene.imageStatus === 'generating' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-zinc-950">
                        <div className="w-12 h-12 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                        <div>
                          <p className="text-xs font-bold text-white animate-pulse">
                            Painting Dark Fantasy Manga Art...
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            Cinematic anime shading & volumetric lighting
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2 bg-zinc-950">
                        <Film className="w-8 h-8 text-zinc-700" />
                        <p className="text-xs font-semibold text-zinc-300">No Image Generated Yet</p>
                        <p className="text-[11px] text-zinc-500 max-w-xs">
                          Generate cinematic dark fantasy anime artwork or upload custom illustrations.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* If generation had an error or failed */}
                  {(scene.imageStatus === 'error' || scene.imageStatus === 'failed') && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-200">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Image Generation Status:</span>
                      </div>
                      <p className="text-[11px] text-rose-300/90 leading-relaxed font-mono">
                        {scene.imageError || 'Generation service was unreachable. Please retry or adjust prompt.'}
                      </p>
                    </div>
                  )}

                  {/* Image Generation Action Row */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onGenerateImage(scene.id)}
                      disabled={scene.imageStatus === 'generating'}
                      className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
                      <span>{scene.imageUrl ? 'Regen Art' : 'Gen Art'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUseReferenceArt(scene)}
                      title="Apply high-res reference scene artwork matching the hero's style"
                      className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ref Art</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUseProcedural(scene)}
                      title="Generate instant offline dark fantasy manga artwork"
                      className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Instant</span>
                    </button>
                  </div>

                  {/* Upload Art Option */}
                  <div className="flex items-center justify-between pt-1">
                    <input
                      type="file"
                      ref={(el) => {
                        fileInputRefs.current[scene.id] = el;
                      }}
                      onChange={(e) => handleUploadImage(scene.id, e)}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[scene.id]?.click()}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-amber-400" />
                      Upload Custom Art
                    </button>

                    {scene.imageUrl && (
                      <button
                        type="button"
                        onClick={() => updateScene(scene.id, { imageUrl: undefined, imageStatus: 'idle' })}
                        className="text-[11px] text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  {/* Image Prompt Input */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span>Artwork Prompt:</span>
                      <span className="text-[10px] text-zinc-500 font-normal">Customizable</span>
                    </label>
                    <textarea
                      rows={2}
                      value={scene.imagePrompt}
                      onChange={(e) => updateScene(scene.id, { imagePrompt: e.target.value })}
                      placeholder="Manga image prompt..."
                      className="w-full bg-black text-xs text-zinc-100 p-2.5 rounded-lg border border-zinc-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 font-mono resize-none leading-relaxed"
                    />
                    
                    {/* Prompt Enhancer Tag Pills */}
                    <div className="flex items-center flex-wrap gap-1 text-[10px] text-zinc-400">
                      <span className="text-zinc-500">Add:</span>
                      {[
                        'Ren (Hero)',
                        'Piercing Blue Eyes',
                        'Rune Greatsword',
                        'Moonlit Citadel',
                        'Shadow Dragon',
                        'Blood Moon',
                        'Tattered Hooded Cloak'
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => appendPromptTag(scene, tag)}
                          className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Description, Narration & Voice (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Original Description Display */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        Original Scene Description:
                      </span>
                      <span className="text-[10px] text-zinc-500 font-normal">
                        Preserved from story input
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      value={scene.description}
                      onChange={(e) => updateScene(scene.id, { description: e.target.value })}
                      className="w-full bg-black text-xs text-zinc-300 p-2.5 rounded-lg border border-zinc-800 focus:border-zinc-600 focus:outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Narration Text Box (Hindi or English) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        Narration Text ({language === 'hi' ? 'हिन्दी - Hindi' : 'English'}):
                      </label>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {scene.narrationText.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={scene.narrationText}
                      onChange={(e) => {
                        const newText = e.target.value;
                        const words = newText.trim().split(/\s+/).filter(Boolean).length;
                        const autoSecs = Math.min(Math.max(Math.ceil(words / 2.3), 3), 18);
                        updateScene(scene.id, {
                          narrationText: newText,
                          duration: autoSecs,
                        });
                      }}
                      placeholder={language === 'hi' ? 'यहाँ इस दृश्य का वर्णन / संवाद लिखें...' : 'Enter scene voiceover narration text here...'}
                      className="w-full bg-black text-sm text-zinc-100 p-3 rounded-lg border border-zinc-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Audio Controls and Duration Stepper Bar */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                    {/* Voice Narration Audio Playback */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePlayNarration(scene)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isCurrentlySpeaking
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                        }`}
                      >
                        {isCurrentlySpeaking ? (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            <span>Stop Voice</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>Hear Voice</span>
                          </>
                        )}
                      </button>

                      <span className="text-[11px] text-zinc-400 hidden sm:inline">
                        Speech Engine ({language === 'hi' ? 'hi-IN' : 'en-US'})
                      </span>
                    </div>

                    {/* Suggested Duration Stepper */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        Duration:
                      </span>
                      <div className="flex items-center bg-black rounded-lg border border-zinc-700 p-0.5">
                        <button
                          type="button"
                          onClick={() => updateScene(scene.id, { duration: Math.max(2, scene.duration - 1) })}
                          className="px-2 py-0.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded font-bold transition-colors cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono font-bold text-white min-w-[32px] text-center">
                          {scene.duration}s
                        </span>
                        <button
                          type="button"
                          onClick={() => updateScene(scene.id, { duration: Math.min(30, scene.duration + 1) })}
                          className="px-2 py-0.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded font-bold transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Add Scene Button */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => handleAddScene(scenes.length - 1)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-sm font-bold transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Add Another Scene</span>
        </button>
      </div>
    </div>
  );
};
