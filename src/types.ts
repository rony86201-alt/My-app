export type NarrationLanguage = 'en' | 'hi';

export type AspectRatio = '16:9' | '9:16';

export type ContentType = 'manga' | 'manhwa' | 'manhua' | 'webnovel';

export type VoicePresetId =
  | 'fixed-male-narrator'
  | 'male-deep'
  | 'male-cinematic'
  | 'male-emotional'
  | 'hindi-explainer-baritone';

export interface VoicePreset {
  id: VoicePresetId;
  name: string;
  gender: 'male' | 'female';
  tone: string;
  description: string;
  sampleText: {
    en: string;
    hi: string;
  };
  pitch: number;
  rate: number;
  geminiVoiceName?: string;
  geminiSpeakerStyle?: string;
}

export type ChapterContentStatus =
  | 'Full content available'
  | 'Partial content available'
  | 'Free preview only'
  | 'Metadata only'
  | 'Content unavailable'
  | 'Original Content Available'
  | 'Summary Available'
  | 'Original Unavailable — Summary Fallback'
  | 'Content Needs Verification';

export interface SearchSourceAudit {
  name: string;
  url?: string;
  status: 'success' | 'failed' | 'timeout' | 'skipped' | 'zero_matches';
  itemsFound: number;
  responseTimeMs?: number;
  error?: string;
  licenseType?: string;
}

export interface UniversalSearchResponse {
  success: boolean;
  count: number;
  results: SearchResult[];
  sourcesAudited: SearchSourceAudit[];
  alternateTitlesTested?: string[];
}

export interface ChapterInfo {
  id: string;
  chapterNumber: number;
  title: string;
  volumeNumber?: number;
  releaseDate?: string;
  wordCount?: number;
  summary?: string;
  accessibleContent?: string;
  isFullTextAvailable?: boolean;
  isSummaryFallback?: boolean;
  contentStatus?: ChapterContentStatus;
  sourceUrl?: string;
  sourceName?: string;
  licenseOrPermission?: string;
  isFaithfulSummary?: boolean;
  uncertaintyNotes?: string;
}

export interface VolumeInfo {
  volumeNumber: number;
  title: string;
  description?: string;
  chapters: ChapterInfo[];
}

export interface SearchResult {
  id: string;
  title: string;
  englishTitle?: string;
  contentType: ContentType;
  author: string;
  artist?: string;
  description: string;
  coverImage: string;
  source: string;
  sourceUrl?: string;
  status: 'ongoing' | 'completed';
  genres: string[];
  rating?: number;
  totalChapters?: number;
  totalVolumes?: number;
  verifiedCoverSource?: string;
  coverResolution?: string;
  publicationYear?: string | number;
  originalLanguage?: string;
  issueCountText?: string;
  alternativeTitles?: string[];
  sourceRecordId?: string;
  relevanceScore?: number;
}

export interface ContentDetails extends SearchResult {
  volumes: VolumeInfo[];
  allChapters: ChapterInfo[];
  fullSynopsis?: string;
  sourcesAudited?: SearchSourceAudit[];
  lastIndexedAt?: string;
  verifiedCoverSource?: string;
  bannerImage?: string;
}

export interface Scene {
  id: string;
  order: number;
  originalText: string;
  description: string;
  imagePrompt: string;
  narrationText: string;
  duration: number; // in seconds
  imageUrl?: string;
  imageProvider?: string;
  imageStatus: 'idle' | 'generating' | 'ready' | 'error' | 'failed';
  imageError?: string;
  narrationAudioUrl?: string;
  narrationStatus?: 'idle' | 'generating' | 'ready' | 'failed';
  narrationDuration?: number;
  narrationError?: string;
  isApproved?: boolean;
  chapterRef?: {
    chapterNumber: number;
    chapterTitle: string;
  };
}

export interface VoiceSettings {
  language: NarrationLanguage;
  presetId?: VoicePresetId;
  voiceURI: string;
  rate: number;
  pitch: number;
  volume: number;
  bgmVolume: number;
  includeBgm: boolean;
}

export interface VideoSettings {
  aspectRatio: AspectRatio;
  resolution: '720p' | '1080p';
  fps: number;
  showSubtitles: boolean;
  subtitleSize: 'small' | 'medium' | 'large';
  kenBurnsEffect: boolean;
  mangaSpeedLines: boolean;
  darkFantasyParticles: boolean;
  vignetteEffect: boolean;
  transitionDuration: number; // in seconds
  voicePresetId?: VoicePresetId;
  language?: NarrationLanguage;
  includeBgm?: boolean;
  explanationDepth?: 'concise' | 'standard' | 'detailed';
  continuousPacing?: boolean; // When true, transitions directly with zero delay between scenes
  imageProviderId?: ImageProviderId;
}

export interface ReferenceVideoAnalysis {
  id: string;
  videoUrl: string;
  fileName: string;
  durationSeconds: number;
  visualCharacteristics: {
    artDirection: string;
    aspectRatio: string;
    colorPalette: string[];
    shotTypes: string[];
    lighting: string;
    shadowDetail: string;
    characterRendering: string;
  };
  narrationCharacteristics: {
    language: NarrationLanguage;
    detectedVoiceGender: 'male' | 'female';
    perceivedTone: string;
    estimatedPacingWpm: number;
    averageSceneDurationSeconds: number;
    pauseStyle: string;
    recommendedVoicePresetId: VoicePresetId;
  };
  pacingMetrics: {
    totalScenesAnalyzed: number;
    cutFrequencySeconds: number[];
    isContinuousAudio: boolean;
  };
  suggestedImagePromptKeywords: string[];
  suggestedNegativeKeywords: string[];
  analyzedAt: string;
}

export interface SavedProject {
  id: string;
  title: string;
  updatedAt: string;
  language: NarrationLanguage;
  scenes: Scene[];
  voiceSettings: VoiceSettings;
  videoSettings: VideoSettings;
  selectedContent?: {
    id: string;
    title: string;
    contentType: ContentType;
    selectedChapters: number[];
  };
}

export type JobStage =
  | 'queued'
  | 'crafting'
  | 'generating_images'
  | 'generating_voice'
  | 'rendering_video'
  | 'exporting_video'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface GeneratedJobImage {
  sceneIndex: number;
  imageUrl: string;
  prompt?: string;
}

export interface JobProgress {
  jobId: string;
  title?: string;
  stage: JobStage;
  percentage: number;
  message: string;
  currentScene?: number;
  totalScenes?: number;
  scenes?: Scene[];
  generatedImages?: GeneratedJobImage[];
  narrationStatus?: string;
  renderingStatus?: string;
  videoUrl?: string;
  videoFileName?: string;
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  fileExistsVerified?: boolean;
  durationSeconds?: number;
  savedLocalPath?: string;
  createdAt?: string;
  completedAt?: string;
  isQueued?: boolean;
  error?: string;
}

export interface ServiceStatus {
  hasGeminiKey: boolean;
  imageProvider: string;
  ttsSupport: string;
  isOnline: boolean;
}

export interface VideoHistoryItem {
  id: string;
  title: string;
  seriesTitle?: string;
  videoUrl: string;
  fileName?: string;
  fileSizeBytes?: number;
  durationSeconds: number;
  createdAt: string;
  resolution: string;
  aspectRatio: string;
  scenesCount?: number;
  sceneCount?: number;
  language?: NarrationLanguage;
  sourceType?: 'server-ffmpeg' | 'client-canvas' | string;
  source?: string;
  thumbnailUrl?: string;
  fileExistsVerified?: boolean;
  fileVerified?: boolean;
  durationFormatted?: string;
  fileSizeMb?: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultsCount: number;
  contentType?: string;
}

export interface HistoryActivity {
  id: string;
  type: 'video_rendered' | 'search_performed' | 'chapter_selected' | 'project_saved' | 'image_generated' | 'style_analyzed' | 'image_upscaled';
  title: string;
  timestamp: string;
  details?: string;
  description?: string;
  metadata?: any;
}

export interface VisualStyleProfile {
  id: string;
  name: string;
  createdAt?: string;
  referenceImageThumbnail?: string;
  referenceImagePreview?: string;
  artDirection: string;
  enabled?: boolean;
  styleStrength?: number;
  extractedColorPalette?: string[];
  promptTokens?: string;
  negativeTokens?: string;
  lightingAndShadows: string | {
    direction: string;
    intensity: string;
    shadowDepth: string;
    highlightStyle: string;
  };
  colorGrading: string | {
    palette: string[];
    temperature: 'cool' | 'warm' | 'neutral' | 'high-contrast dark' | string;
    saturation: string;
    contrast: string;
  };
  texturesAndRendering?: string;
  textureAndRendering?: {
    lineArt: string;
    renderingStyle: string;
    atmosphere: string;
  };
  characterRenderingStyle?: string;
  characterAesthetics?: {
    facialStyle: string;
    eyeStyle: string;
    hairRendering: string;
  };
  backgroundDetail?: string;
  compositionAndCamera?: string | {
    typicalAngles: string;
    depthOfField: string;
  };
  promptModifiers?: string;
  negativePromptModifiers?: string;
  isCustom?: boolean;
}

export interface CharacterProfile {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other' | 'androgynous' | 'creature' | string;
  description?: string;
  ageRange?: string;
  facialStructure?: string;
  facialFeatures?: string;
  eyeColorAndShape?: string;
  eyeDetails?: string;
  hairStyleAndColor?: string;
  hairStyle?: string;
  clothingAndOutfit?: string;
  outfit?: string;
  accessoriesAndWeapons?: string;
  weaponsAndProps?: string;
  distinguishingFeatures?: string;
  auraOrMagic?: string;
  auraAndEffects?: string;
  consistencyStrength?: number;
  avatarUrl?: string;
  referenceImages?: string[];
  createdAt?: string;
  isDefault?: boolean;
}

export type ImageProviderId = 
  | 'stable-diffusion-horde'
  | 'pollinations-flux' 
  | 'pollinations-turbo' 
  | 'gemini-nano' 
  | 'gemini-flash-image' 
  | 'cinematic-curated'
  | 'on-device-sd15';

export interface DeviceHardwareInfo {
  model: string;
  modelIdentifier: string;
  chipset: string;
  gpu: string;
  vulkanVersion: string;
  vulkanDriver: string;
  ramTotalGb: number;
  ramFreeGb?: number;
  storageFreeGb?: number;
  isNativeApk: boolean;
  accelerationMode: 'vulkan' | 'cpu_neon' | 'browser_preview';
  notes?: string;
}

export interface OnDeviceModelStatus {
  isModelDownloaded: boolean;
  modelPath?: string;
  modelFileName: string;
  modelSizeBytes: number;
  expectedSizeBytes: number;
  downloadProgressPercentage: number;
  isDownloading: boolean;
  downloadError?: string;
  modelVerifiedSha256?: boolean;
  engineStatus: 'uninitialized' | 'model_missing' | 'ready' | 'generating' | 'error';
  engineBackend: 'vulkan' | 'cpu_neon' | 'none';
}

export interface ImageProviderInfo {
  id: ImageProviderId | string;
  name: string;
  model: string;
  endpoint?: string;
  isFree?: boolean;
  requiresKey?: boolean;
  pricingTier?: 'genuinely-free' | 'freemium-tier' | 'requires-key' | string;
  supportedDimensions: string[];
  capabilities?: {
    textToImage: boolean;
    imageToImage: boolean;
    styleReference: boolean;
    characterConsistency: boolean;
    supportedDimensions: string[];
  };
  pricingTerms?: string;
  description: string;
  status: 'active' | 'quota_exceeded' | 'unavailable' | 'optional_key_required' | 'ready' | 'setup-required' | string;
  notes?: string;
}

export interface ImageGenerationSettings {
  providerId?: ImageProviderId | string;
  activeProvider?: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  resolution?: '720p' | '1080p' | '1K' | '2K';
  width?: number;
  height?: number;
  quality?: 'standard' | 'high' | 'ultra';
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  styleStrength?: number;
  characterConsistencyStrength?: number;
  enableStyleGuidance?: boolean;
  enableCharacterGuidance?: boolean;
  activeStyleProfileId?: string;
  activeCharacterProfileId?: string;
}

export interface GeneratedImageRecord {
  id: string;
  prompt: string;
  compiledPrompt?: string;
  originalSceneDescription?: string;
  timestamp: string | number;
  provider: string;
  model: string;
  dimensions: { width: number; height: number };
  imageUrl?: string;
  imageDataUrl?: string;
  enhancedImageUrl?: string;
  enhancedImageDataUrl?: string;
  upscaledDimensions?: { width: number; height: number };
  isEnhanced?: boolean;
  styleProfileId?: string;
  styleProfileName?: string;
  characterProfileId?: string;
  characterProfileName?: string;
  sceneNumber?: number;
  tags?: string[];
  aspectRatio?: string;
  settings?: any;
}
