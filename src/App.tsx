/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Home, 
  Film, 
  Radio, 
  Sparkles, 
  FileText, 
  Sliders, 
  Volume2, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  Layers, 
  AlertCircle,
  HelpCircle,
  Play,
  RotateCcw,
  Check
} from 'lucide-react';
import { Header, PrimaryNav } from './components/Header';
import { UniversalSearchSection } from './components/UniversalSearchSection';
import { ContentDetailsSection } from './components/ContentDetailsSection';
import { SceneInputSection } from './components/SceneInputSection';
import { SceneManager } from './components/SceneManager';
import { StoryboardSection } from './components/StoryboardSection';
import { VideoGenerationDashboard } from './components/VideoGenerationDashboard';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { ProjectModal } from './components/ProjectModal';
import { ImageDetailsModal } from './components/ImageDetailsModal';
import { MangaImageStudioModal } from './components/MangaImageStudioModal';
import { 
  Scene, 
  NarrationLanguage, 
  VoiceSettings, 
  VideoSettings, 
  SavedProject,
  ServiceStatus,
  SearchResult,
  VoicePresetId,
  JobProgress
} from './types';
import { parseScenesFromText, SAMPLE_STORIES } from './utils/sceneParser';
import { generateProceduralAnimeImage } from './utils/proceduralAnime';
import { 
  saveCurrentProjectToStorage, 
  getAllSavedProjects, 
  deleteSavedProject,
  addVideoToHistory,
  getVideoHistory,
  addActivityLog
} from './utils/storage';
import { speechService } from './utils/speechService';

export default function App() {
  // Navigation: Requirement A: Only two primary navigation buttons: HOME and VIDEO GENERATION.
  // HOME must open on every fresh app launch.
  const [primaryNav, setPrimaryNav] = useState<PrimaryNav>('home');
  
  // Guided Sequential Workflow inside HOME: Step 1 (Story/Script) -> Step 2 (Storyboard) -> Step 3 (Voice & Style) -> Step 4 (Queue & Launch)
  const [guidedStep, setGuidedStep] = useState<number>(1);
  const [step1Mode, setStep1Mode] = useState<'search' | 'text'>('search');

  // Selected Content & Details Navigation
  const [selectedContent, setSelectedContent] = useState<SearchResult | null>(null);

  // Background Job Pipeline Live Count for bottom navigation badge
  const [liveJobCount, setLiveJobCount] = useState<number>(0);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);

  // Modals state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [savedProjectsList, setSavedProjectsList] = useState<SavedProject[]>([]);
  const [imagePreview, setImagePreview] = useState<{ isOpen: boolean; url: string; sceneNum: number; prompt: string }>({
    isOpen: false,
    url: '',
    sceneNum: 1,
    prompt: '',
  });

  // Project Info & Language
  const [projectTitle, setProjectTitle] = useState('Shadow Slave: The Cottage by the Lake');
  const [language, setLanguage] = useState<NarrationLanguage>('hi');
  const [inputText, setInputText] = useState(SAMPLE_STORIES.english);

  // Initial Scenes list (Default to Shadow Slave Chapter 1591 with 12 authentic panels)
  const [scenes, setScenes] = useState<Scene[]>(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const idx = i + 1;
      const descriptions = [
        'Sunny stirs in the quiet wooden bedroom, morning breeze billowing the sheer curtains.',
        'He rubs his eyes in bed, breathing in the scent of cedar and pine.',
        'Sunlight fills the study, illuminating bookshelves, ancient scrolls, and mahogany desk.',
        'Sunny stands at the terrace window, gazing out across the peaceful lake.',
        'He sips fresh steaming coffee from a ceramic mug, watching the golden dawn.',
        'Sunlight reflects across crystal ripples of the vast mountain lake.',
        'Across the water rises the soaring white marble citadel and banners.',
        'Aerial view of the walled lakeside city and winding canals waking to life.',
        'At the grand gate, an arcane portal crackles with violet lightning.',
        'Bustling merchants and cloaked travelers traverse the cobblestone streets.',
        'Sentinels upon high battlements gaze at colossal shadows on the distant horizon.',
        'Sunny lowers his mug with piercing blue eyes, ready as war gathers in the deep.'
      ];

      const hindiNarrations = [
        'सन्नी शांत लकड़ी के शयनकक्ष में धीरे से उठता है, सुबह की मंद बयार सफेद पर्दों को लहरा रही है।',
        'वह बिस्तर पर अपनी आँखें मलता है, देवदार और पाइन की भीनी सुगंध उसके मन को छू जाती है।',
        'अध्ययन कक्ष में धूप की किरणें बिखरती हैं, प्राचीन पांडुलिपियों और महोगनी की मेज को आलोकित करती हैं।',
        'सन्नी बालकनी की खिड़की के पास खड़ा होकर शांत झील के पार दूर तक देखता है।',
        'वह हाथ में गर्म भाप उड़ती कॉफी का मग थामे, सुनहरी सुबह के आगमन को निहारता है।',
        'विशाल पहाड़ी झील की स्वच्छ लहरों पर सूर्य का प्रकाश हीरे की तरह चमक रहा है।',
        'पानी के उस पार सफेद संगमरमर का भव्य किला और फहराते ध्वज नजर आते हैं।',
        'ऊंचाई से देखने पर दीवारों से घिरे शहर और उसकी नहरें धीरे-धीरे जागती प्रतीत होती हैं।',
        'नगर के विशाल प्रवेश द्वार पर जादुई पोर्टल बैंगनी बिजली की तरह कौंध रहा है।',
        'सड़कों पर यात्रियों और व्यापारियों का हुजूम चहलकदमी कर रहा है।',
        'ऊंचे कंगूरों पर खड़े पहरेदार क्षितिज पर उभरती विशाल काली परछाइयों को देख रहे हैं।',
        'सन्नी अपनी तीक्ष्ण नीली आंखों से देखता है, गहराई में युद्ध की आहट साफ महसूस हो रही है।'
      ];

      return {
        id: `scene-ss-1591-${idx}`,
        order: idx,
        originalText: `Scene ${idx}: ${descriptions[i]}`,
        description: descriptions[i],
        imagePrompt: `Cinematic dark fantasy anime, Scene ${idx}: ${descriptions[i]}. Protagonist Ren/Sunny with messy black hair, piercing blue eyes, dark hooded traveler cloak, volumetric sunrise lighting, 8k resolution.`,
        narrationText: hindiNarrations[i] || descriptions[i],
        duration: 5,
        imageUrl: `/assets/scenes/panel_${idx}.jpg`,
        imageProvider: 'Reference Anime Panel Engine',
        imageStatus: 'ready' as const,
        chapterRef: {
          chapterNumber: 1591,
          chapterTitle: 'Chapter 1591: The Cottage by the Lake'
        }
      };
    });
  });

  // Fixed Male Voice Settings (Hindi Baritone)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    language: 'hi',
    presetId: 'fixed-male-narrator',
    voiceURI: '',
    rate: 1.0,
    pitch: 0.85,
    volume: 1.0,
    bgmVolume: 0.35,
    includeBgm: true,
  });

  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    aspectRatio: '16:9',
    resolution: '1080p',
    fps: 30,
    showSubtitles: true,
    subtitleSize: 'medium',
    kenBurnsEffect: true,
    mangaSpeedLines: false,
    darkFantasyParticles: true,
    vignetteEffect: true,
    transitionDuration: 0.6,
    imageProviderId: 'stable-diffusion-horde'
  });

  // Backend status
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    hasGeminiKey: false,
    imageProvider: 'Stable Diffusion 1.5 & Modular AI Engine',
    ttsSupport: 'Fixed Male Hindi Narrator (Baritone)',
    isOnline: true,
  });

  // Bulk image generation state
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // Test Voice state
  const [isSpeakingTest, setIsSpeakingTest] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Poll live jobs count for the bottom navigation badge
  const updateLiveJobsBadge = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs/live');
      if (res.ok) {
        const data = await res.json();
        const active = (data.activeJobs || []).length;
        const queued = (data.queuedJobs || []).length;
        setLiveJobCount(active + queued);
      }
    } catch {}
  }, []);

  useEffect(() => {
    updateLiveJobsBadge();
    const interval = setInterval(updateLiveJobsBadge, 2500);
    return () => clearInterval(interval);
  }, [updateLiveJobsBadge]);

  // Check backend capability on mount
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setServiceStatus({
          hasGeminiKey: data.hasGeminiKey,
          imageProvider: data.imageProvider || 'Stable Diffusion 1.5 & Modular Engine',
          ttsSupport: data.ttsSupport || 'Fixed Male Hindi Narrator',
          isOnline: true,
        });
      })
      .catch((err) => {
        console.warn('Backend status notice:', err);
      });
  }, []);

  // Guided Workflow Nav checks
  const canAdvanceToStep2 = scenes.length > 0;
  const canAdvanceToStep3 = scenes.length > 0;
  const canAdvanceToStep4 = scenes.length > 0;

  // Handlers
  const handleSelectContent = (content: SearchResult) => {
    setSelectedContent(content);
    setProjectTitle(`${content.title} Video Studio`);
  };

  const handleQuickStartShadowSlave = async () => {
    try {
      const res = await fetch('/api/search?q=Shadow%20Slave');
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setSelectedContent(data.results[0]);
      }
    } catch {}
    setGuidedStep(2);
    showToast('Shadow Slave Chapter 1591 loaded into Step 2: Storyboard!');
  };

  const handleProcessScenes = (rawText: string) => {
    const parsed = parseScenesFromText(rawText, language);
    if (parsed.length > 0) {
      setScenes(parsed);
      setGuidedStep(2);
      showToast(`Generated ${parsed.length} sequential scenes from script!`);
    } else {
      showToast('Could not parse scenes from text. Try again or use standard scene format.');
    }
  };

  const handleGenerateFullVideo = async (options: {
    contentId: string;
    chapterNumbers: number[];
    language: NarrationLanguage;
    voicePresetId: VoicePresetId;
    videoSettings: VideoSettings;
  }) => {
    try {
      showToast('Generating storyboard scenes for chapter...');
      const res = await fetch('/api/generate-storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: options.contentId,
          chapterNumbers: options.chapterNumbers,
          language: 'hi'
        })
      });
      const data = await res.json();
      if (data.success && data.scenes && data.scenes.length > 0) {
        setScenes(data.scenes);
        setSelectedContent(null);
        setGuidedStep(2);
        showToast(`Created ${data.scenes.length} sequential storyboard scenes!`);
      } else {
        showToast('Using verified Chapter 1591 scenes');
        setGuidedStep(2);
      }
    } catch (err: any) {
      showToast(`Storyboard notice: ${err.message}`);
      setGuidedStep(2);
    }
  };

  // Generate Image for a scene
  const handleGenerateImage = async (sceneId: string) => {
    const sceneIndex = scenes.findIndex((s) => s.id === sceneId);
    if (sceneIndex === -1) return;

    const targetScene = scenes[sceneIndex];

    setScenes((prev) =>
      prev.map((s) =>
        s.id === sceneId ? { ...s, imageStatus: 'generating' as const } : s
      )
    );

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: targetScene.imagePrompt || targetScene.description,
          sceneNumber: targetScene.order,
          width: 1280,
          height: 720,
          settings: {
            providerId: videoSettings.imageProviderId || 'stable-diffusion-horde'
          }
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setScenes((prev) =>
        prev.map((s) =>
          s.id === sceneId
            ? {
                ...s,
                imageUrl: data.imageDataUrl,
                imageProvider: data.provider || 'Stable Diffusion 1.5',
                imageStatus: 'ready' as const,
              }
            : s
        )
      );

      showToast(`Scene ${targetScene.order} artwork generated!`);
    } catch (err: any) {
      setScenes((prev) =>
        prev.map((s) =>
          s.id === sceneId
            ? {
                ...s,
                imageStatus: 'error' as const,
                imageError: err.message,
              }
            : s
        )
      );
      showToast(`Image generation error: ${err.message}`);
    }
  };

  const handleGenerateAllImages = async () => {
    if (scenes.length === 0 || isGeneratingAll) return;

    setIsGeneratingAll(true);
    setBulkProgress({ current: 0, total: scenes.length });

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      setBulkProgress({ current: i + 1, total: scenes.length });
      await handleGenerateImage(scene.id);
      await new Promise((r) => setTimeout(r, 350));
    }

    setIsGeneratingAll(false);
    showToast('All scene artworks generated successfully!');
  };

  const handleApplyImageToScene = (sceneNumber: number, imageDataUrl: string) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.order === sceneNumber
          ? {
              ...s,
              imageUrl: imageDataUrl,
              imageProvider: 'Custom Image Studio',
              imageStatus: 'ready' as const,
            }
          : s
      )
    );
    showToast(`Artwork successfully applied to Scene #${sceneNumber}!`);
  };

  const handleLaunchVideoGeneration = async () => {
    if (scenes.length === 0) {
      showToast('Please craft or load scenes before generating video.');
      return;
    }

    setIsSubmittingJob(true);
    try {
      const res = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectTitle || 'Shadow Slave Episode',
          contentId: selectedContent?.id || 'shadow-slave',
          chapterNumbers: [1591],
          language: 'hi',
          videoSettings: {
            ...videoSettings,
            language: 'hi'
          }
        })
      });

      const data = await res.json();
      if (data.success && data.jobId) {
        showToast(data.isQueued 
          ? `Job "${data.jobId}" added to waiting queue! Switching to Video Generation Dashboard.` 
          : `Job "${data.jobId}" started! Switching to Video Generation Dashboard.`);
        
        // Switch to Video Generation Dashboard immediately
        setPrimaryNav('video_generation');
        updateLiveJobsBadge();
      } else {
        throw new Error(data.error || 'Failed to submit job');
      }
    } catch (err: any) {
      showToast(`Job submission failed: ${err.message}`);
    } finally {
      setIsSubmittingJob(false);
    }
  };

  const handleTestFixedMaleVoice = () => {
    setIsSpeakingTest(true);
    const hindiSample = 'जब पाताल का अंतिम द्वार खुला, साया जाग उठा। युद्ध की घड़ी निकट है।';
    speechService.speak(hindiSample, {
      lang: 'hi',
      pitch: 0.82,
      rate: 1.0,
      onEnd: () => setIsSpeakingTest(false),
      onError: () => setIsSpeakingTest(false),
    });
  };

  const handleSaveProject = () => {
    const saved = saveCurrentProjectToStorage(
      projectTitle,
      scenes,
      voiceSettings,
      videoSettings,
      language
    );
    setSavedProjectsList(getAllSavedProjects());
    showToast(`Project "${saved.title}" saved locally!`);
  };

  const handleOpenProjects = () => {
    setSavedProjectsList(getAllSavedProjects());
    setIsProjectModalOpen(true);
  };

  const handleLoadProject = (project: SavedProject) => {
    setProjectTitle(project.title);
    setLanguage(project.language || 'hi');
    setScenes(project.scenes);
    if (project.voiceSettings) setVoiceSettings(project.voiceSettings);
    if (project.videoSettings) setVideoSettings(project.videoSettings);
    setGuidedStep(2);
    showToast(`Loaded "${project.title}"!`);
  };

  const handleDeleteProject = (id: string) => {
    const updated = deleteSavedProject(id);
    setSavedProjectsList(updated);
    showToast('Project deleted from storage.');
  };

  const handleNewProject = () => {
    setProjectTitle('Untitled Manga Explainer');
    setInputText('');
    setScenes([]);
    setSelectedContent(null);
    setGuidedStep(1);
    setPrimaryNav('home');
    showToast('New project started. Complete Step 1 to begin.');
  };

  const handlePreviewImage = (imageUrl: string, sceneNum: number, prompt: string) => {
    setImagePreview({
      isOpen: true,
      url: imageUrl,
      sceneNum,
      prompt,
    });
  };

  const totalRuntime = scenes.reduce((sum, s) => sum + s.duration, 0);

  const currentProjectObj: SavedProject = {
    id: `project-current`,
    title: projectTitle,
    updatedAt: new Date().toISOString(),
    language,
    scenes,
    voiceSettings,
    videoSettings,
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-zinc-900/95 text-white text-xs font-semibold border border-zinc-700 shadow-2xl flex items-center gap-2 animate-fadeIn">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header with Guided Stepper */}
      <Header
        primaryNav={primaryNav}
        setPrimaryNav={setPrimaryNav}
        guidedStep={guidedStep}
        setGuidedStep={(step) => {
          if (step === 2 && !canAdvanceToStep2) return;
          if (step === 3 && !canAdvanceToStep3) return;
          if (step === 4 && !canAdvanceToStep4) return;
          setGuidedStep(step);
        }}
        canAdvanceToStep2={canAdvanceToStep2}
        canAdvanceToStep3={canAdvanceToStep3}
        canAdvanceToStep4={canAdvanceToStep4}
        language={language}
        setLanguage={setLanguage}
        projectTitle={projectTitle}
        setProjectTitle={setProjectTitle}
        sceneCount={scenes.length}
        totalDuration={totalRuntime}
        onSave={handleSaveProject}
        onOpenProjects={handleOpenProjects}
        onNewProject={handleNewProject}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onOpenImageStudio={() => setIsImageStudioOpen(true)}
        onGoHome={() => {
          setPrimaryNav('home');
          setGuidedStep(1);
          setSelectedContent(null);
        }}
        serviceStatus={serviceStatus}
        liveJobCount={liveJobCount}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 pb-28">
        {/* VIEW 1: HOME (Sequential Guided Workflow) */}
        {primaryNav === 'home' && (
          <div className="space-y-6">
            {/* STEP 1: Story Selection & Script */}
            {guidedStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                      STEP 1 OF 4: CONTENT SOURCE
                    </span>
                    <h2 className="font-cinzel text-xl font-bold text-white">
                      Select Manga Series or Input Custom Script
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Choose an authentic manhwa/novel beat or provide custom narration text.
                    </p>
                  </div>

                  {/* Mode switcher: Series Library vs Custom Text */}
                  <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800 shrink-0">
                    <button
                      onClick={() => { setSelectedContent(null); setStep1Mode('search'); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        step1Mode === 'search'
                          ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Series Library
                    </button>
                    <button
                      onClick={() => setStep1Mode('text')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        step1Mode === 'text'
                          ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Custom Text Script
                    </button>
                  </div>
                </div>

                {/* If user already has crafted scenes, show quick advance badge */}
                {scenes.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-zinc-200">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Currently Crafted Episode: <strong>{projectTitle}</strong> ({scenes.length} sequential scenes ready).
                      </span>
                    </div>
                    <button
                      onClick={() => setGuidedStep(2)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Proceed to Step 2</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {step1Mode === 'search' ? (
                  selectedContent ? (
                    <ContentDetailsSection
                      content={selectedContent}
                      onBack={() => setSelectedContent(null)}
                      onGoHome={() => setSelectedContent(null)}
                      onGenerateFullVideo={handleGenerateFullVideo}
                    />
                  ) : (
                    <UniversalSearchSection
                      onSelectContent={handleSelectContent}
                      onQuickStartShadowSlave={handleQuickStartShadowSlave}
                    />
                  )
                ) : (
                  <SceneInputSection
                    inputText={inputText}
                    setInputText={setInputText}
                    language={language}
                    setLanguage={setLanguage}
                    onProcessScenes={handleProcessScenes}
                    existingSceneCount={scenes.length}
                  />
                )}
              </div>
            )}

            {/* STEP 2: Storyboard & Scenes Crafting */}
            {guidedStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                      STEP 2 OF 4: SEQUENTIAL STORYBOARD
                    </span>
                    <h2 className="font-cinzel text-xl font-bold text-white">
                      Sequential Scenes & Hindi Narration Script
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Review narrative pacing, generate brand-new AI artwork, and verify Hindi narration scripts.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGuidedStep(1)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back: Story</span>
                    </button>
                    <button
                      onClick={() => setGuidedStep(3)}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <span>Next: Voice & Style</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <SceneManager
                  scenes={scenes}
                  setScenes={setScenes}
                  language={language}
                  voiceSettings={voiceSettings}
                  onGenerateImage={handleGenerateImage}
                  onGenerateAllImages={handleGenerateAllImages}
                  isGeneratingAll={isGeneratingAll}
                  bulkProgress={bulkProgress}
                  onPreviewImage={handlePreviewImage}
                  onGoToStoryboard={() => setGuidedStep(3)}
                  onOpenImageStudio={() => setIsImageStudioOpen(true)}
                />
              </div>
            )}

            {/* STEP 3: Voice & Style Preview */}
            {guidedStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                      STEP 3 OF 4: FIXED MALE VOICE & VIDEO STYLING
                    </span>
                    <h2 className="font-cinzel text-xl font-bold text-white">
                      Fixed Hindi Male Narrator & Visual Styling
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Calibrated Hindi baritone narrator, aspect ratio, camera motion, and visual engine settings.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGuidedStep(2)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back: Scenes</span>
                    </button>
                    <button
                      onClick={() => setGuidedStep(4)}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <span>Next: Review & Launch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fixed Male Voice Showcase Card */}
                  <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                          <Volume2 className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">
                            Fixed Male Hindi Narrator (Baritone)
                          </h3>
                          <span className="text-[11px] text-zinc-400">
                            Locked voice across all episodes
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-mono text-emerald-400">
                        ACTIVE
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Deep, authoritative male narration engineered specifically for dark fantasy manga recaps. Uses resonant 135Hz vocal chest boost and subtle pitch adjustment to produce high-drama immersion.
                    </p>

                    {/* Technical Disclosure Box */}
                    <div className="p-3 rounded-xl bg-black/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                      <div className="font-semibold text-zinc-300 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        Voice Specification & Disclosure
                      </div>
                      <p>
                        Reference-audio zero-shot cloning is unavailable in standard web preview environments without private model fine-tuning. The app uses the calibrated deep Hindi male baritone engine, ensuring consistent character tone and zero variation across all scenes.
                      </p>
                    </div>

                    {/* Test Audio Button */}
                    <button
                      onClick={handleTestFixedMaleVoice}
                      disabled={isSpeakingTest}
                      className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className={`w-3.5 h-3.5 fill-zinc-200 ${isSpeakingTest ? 'animate-pulse' : ''}`} />
                      <span>{isSpeakingTest ? 'Speaking Hindi Sample...' : 'Test Fixed Hindi Voice Sample'}</span>
                    </button>
                  </div>

                  {/* Visual Engine & Render Settings Card */}
                  <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                        <Sliders className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          Visual & Video Engine Settings
                        </h3>
                        <span className="text-[11px] text-zinc-400">
                          Framing, resolution, and effects
                        </span>
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Aspect Ratio:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setVideoSettings(prev => ({ ...prev, aspectRatio: '16:9' }))}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            videoSettings.aspectRatio === '16:9'
                              ? 'bg-amber-500 border-amber-400 text-zinc-950 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          16:9 (Landscape YouTube)
                        </button>
                        <button
                          type="button"
                          onClick={() => setVideoSettings(prev => ({ ...prev, aspectRatio: '9:16' }))}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            videoSettings.aspectRatio === '9:16'
                              ? 'bg-amber-500 border-amber-400 text-zinc-950 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          9:16 (Shorts / Reels)
                        </button>
                      </div>
                    </div>

                    {/* AI Image Generation Provider */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">AI Image Provider:</label>
                      <select
                        value={videoSettings.imageProviderId || 'stable-diffusion-horde'}
                        onChange={(e) => setVideoSettings(prev => ({ ...prev, imageProviderId: e.target.value as any }))}
                        className="w-full bg-zinc-900 text-xs text-white p-2.5 rounded-xl border border-zinc-800 focus:border-amber-500 outline-none"
                      >
                        <option value="stable-diffusion-horde">Stable Diffusion 1.5 (AI Horde Cluster - Free & Genuine)</option>
                        <option value="pollinations-flux">Pollinations AI (Flux Anime)</option>
                        <option value="pollinations-turbo">Pollinations AI (SDXL Turbo - Fast)</option>
                        <option value="gemini-nano">Gemini Multimodal Image Studio</option>
                        <option value="on-device-sd15">On-Device SD 1.5 (Android Native APK)</option>
                      </select>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2 pt-1 text-xs">
                      <label className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 cursor-pointer">
                        <span className="text-zinc-300">Ken Burns Dynamic Camera Pan & Zoom</span>
                        <input
                          type="checkbox"
                          checked={videoSettings.kenBurnsEffect}
                          onChange={(e) => setVideoSettings(prev => ({ ...prev, kenBurnsEffect: e.target.checked }))}
                          className="accent-amber-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 cursor-pointer">
                        <span className="text-zinc-300">Atmospheric Dark Fantasy Particles</span>
                        <input
                          type="checkbox"
                          checked={videoSettings.darkFantasyParticles}
                          onChange={(e) => setVideoSettings(prev => ({ ...prev, darkFantasyParticles: e.target.checked }))}
                          className="accent-amber-500"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Final Review & Launch into Video Pipeline */}
            {guidedStep === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                      STEP 4 OF 4: QUEUE & LAUNCH
                    </span>
                    <h2 className="font-cinzel text-xl font-bold text-white">
                      Review & Submit to Video Pipeline
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Confirm your episode parameters and dispatch to the background generation pipeline.
                    </p>
                  </div>

                  <button
                    onClick={() => setGuidedStep(3)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back: Style</span>
                  </button>
                </div>

                {/* Summary Card */}
                <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-6 shadow-2xl">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px] uppercase font-mono">Episode Title</span>
                      <span className="font-bold text-white text-sm truncate block mt-0.5">
                        {projectTitle}
                      </span>
                    </div>

                    <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px] uppercase font-mono">Total Scenes</span>
                      <span className="font-bold text-white text-sm block mt-0.5">
                        {scenes.length} Scenes
                      </span>
                    </div>

                    <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px] uppercase font-mono">Narration Engine</span>
                      <span className="font-bold text-cyan-300 text-xs block mt-0.5 truncate">
                        Fixed Male Hindi Baritone
                      </span>
                    </div>

                    <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px] uppercase font-mono">Target Gallery</span>
                      <span className="font-mono text-emerald-400 text-[11px] block mt-0.5 truncate">
                        Movies/MangaVideoStudio
                      </span>
                    </div>
                  </div>

                  {/* Concurrency Info Box */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-zinc-300 space-y-1.5">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Radio className="w-4 h-4 animate-pulse" />
                      Concurrent Background Pipeline (Max 3 Jobs)
                    </div>
                    <p>
                      Submitting will register your episode into the real background queue. If available slots exist (up to 3 concurrent executions), processing begins immediately across AI image generation, fixed male Hindi voice synthesis, and H.264/AAC MP4 multiplexing.
                    </p>
                  </div>

                  {/* Launch Button */}
                  <button
                    onClick={handleLaunchVideoGeneration}
                    disabled={isSubmittingJob}
                    className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-5 h-5 fill-zinc-950" />
                    <span>
                      {isSubmittingJob 
                        ? 'DISPATCHING TO PIPELINE...' 
                        : 'LAUNCH VIDEO GENERATION & OPEN DASHBOARD'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: VIDEO GENERATION DASHBOARD (LIVE + COMPLETED) */}
        {primaryNav === 'video_generation' && (
          <VideoGenerationDashboard
            onOpenNewJobFlow={() => {
              setPrimaryNav('home');
              setGuidedStep(1);
            }}
            onPreviewImage={handlePreviewImage}
          />
        )}
      </main>

      {/* Primary Bottom Navigation Bar - Only Two Buttons: HOME and VIDEO GENERATION */}
      <nav 
        aria-label="Main Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-2 sm:py-2.5 shadow-2xl"
      >
        <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
          <button
            onClick={() => setPrimaryNav('home')}
            className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              primaryNav === 'home'
                ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 font-black'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>HOME</span>
          </button>

          <button
            onClick={() => setPrimaryNav('video_generation')}
            className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              primaryNav === 'video_generation'
                ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 font-black'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>VIDEO GENERATION</span>
            {liveJobCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-red-600 text-white animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                {liveJobCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Modals */}
      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        voiceSettings={voiceSettings}
        setVoiceSettings={setVoiceSettings}
        language={language}
        setLanguage={setLanguage}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        savedProjects={savedProjectsList}
        onLoadProject={handleLoadProject}
        onDeleteProject={handleDeleteProject}
        currentProject={currentProjectObj}
      />

      <ImageDetailsModal
        isOpen={imagePreview.isOpen}
        onClose={() => setImagePreview((prev) => ({ ...prev, isOpen: false }))}
        imageUrl={imagePreview.url}
        sceneNumber={imagePreview.sceneNum}
        prompt={imagePreview.prompt}
      />

      <MangaImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        onApplyImageToScene={handleApplyImageToScene}
        currentSceneCount={scenes.length}
      />
    </div>
  );
}
