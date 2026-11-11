import { SavedProject, Scene, VideoSettings, VoiceSettings, NarrationLanguage } from '../types';

const STORAGE_KEY = 'manga_video_studio_projects';
const AUTOSAVE_KEY = 'manga_video_studio_current';

export function saveCurrentProjectToStorage(
  title: string,
  scenes: Scene[],
  voiceSettings: VoiceSettings,
  videoSettings: VideoSettings,
  language: NarrationLanguage
): SavedProject {
  const project: SavedProject = {
    id: `project-${Date.now()}`,
    title: title || 'Untitled Dark Fantasy Manga',
    updatedAt: new Date().toISOString(),
    language,
    scenes,
    voiceSettings,
    videoSettings,
  };

  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
    
    // Also update or append in project list
    const existing = getAllSavedProjects();
    const index = existing.findIndex(p => p.id === project.id || p.title === project.title);
    if (index >= 0) {
      existing[index] = project;
    } else {
      existing.unshift(project);
    }
    // Limit to latest 10 projects
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 10)));
  } catch (e) {
    console.warn('LocalStorage save failed (possible quota limit):', e);
  }

  return project;
}

export function loadAutosavedProject(): SavedProject | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedProject;
  } catch (e) {
    return null;
  }
}

export function getAllSavedProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedProject[];
  } catch (e) {
    return [];
  }
}

export function deleteSavedProject(id: string): SavedProject[] {
  const existing = getAllSavedProjects().filter(p => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {}
  return existing;
}

export function exportProjectToJson(project: SavedProject) {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_manga_project.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProjectFromJson(file: File): Promise<SavedProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const project = JSON.parse(text) as SavedProject;
        if (!project.scenes || !Array.isArray(project.scenes)) {
          throw new Error('Invalid project file: missing scenes array');
        }
        resolve(project);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

const VIDEO_HISTORY_KEY = 'manga_video_studio_video_history';
const SEARCH_HISTORY_KEY = 'manga_video_studio_search_history';
const ACTIVITY_LOG_KEY = 'manga_video_studio_activity_logs';

import { VideoHistoryItem, SearchHistoryItem, HistoryActivity } from '../types';

export function addVideoToHistory(item: VideoHistoryItem): VideoHistoryItem[] {
  const existing = getVideoHistory();
  // Avoid duplicate by id or fileName
  const filtered = existing.filter(v => v.id !== item.id && v.fileName !== item.fileName);
  filtered.unshift(item);
  const trimmed = filtered.slice(0, 30);
  try {
    localStorage.setItem(VIDEO_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('LocalStorage save failed for video history:', e);
  }
  return trimmed;
}

export function getVideoHistory(): VideoHistoryItem[] {
  try {
    const raw = localStorage.getItem(VIDEO_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VideoHistoryItem[];
  } catch (e) {
    return [];
  }
}

export function deleteVideoFromHistory(id: string): VideoHistoryItem[] {
  const updated = getVideoHistory().filter(v => v.id !== id);
  try {
    localStorage.setItem(VIDEO_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function clearVideoHistory(): void {
  try {
    localStorage.removeItem(VIDEO_HISTORY_KEY);
  } catch (e) {}
}

export function addSearchToHistory(query: string, resultsCount: number, contentType?: string): SearchHistoryItem[] {
  const qClean = (query || '').trim();
  if (!qClean) return getSearchHistory();

  const existing = getSearchHistory();
  const filtered = existing.filter(s => s.query.toLowerCase() !== qClean.toLowerCase());
  filtered.unshift({
    id: `search-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    query: qClean,
    timestamp: new Date().toISOString(),
    resultsCount,
    contentType
  });
  const trimmed = filtered.slice(0, 25);
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {}
  return trimmed;
}

export function getSearchHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SearchHistoryItem[];
  } catch (e) {
    return [];
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (e) {}
}

export function addActivityLog(activity: {
  type: HistoryActivity['type'];
  title: string;
  details?: string;
  description?: string;
  metadata?: any;
}): HistoryActivity[] {
  const logs = getActivityLogs();
  logs.unshift({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    details: activity.details || activity.description,
    ...activity
  });
  const trimmed = logs.slice(0, 50);
  try {
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(trimmed));
  } catch (e) {}
  return trimmed;
}

export function getActivityLogs(): HistoryActivity[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryActivity[];
  } catch (e) {
    return [];
  }
}

export function clearActivityLogs(): void {
  try {
    localStorage.removeItem(ACTIVITY_LOG_KEY);
  } catch (e) {}
}

// -------------------------------------------------------------
// Visual Style Profiles Storage & Default Curated Presets
// -------------------------------------------------------------
const STYLE_PROFILES_KEY = 'manga_video_studio_style_profiles';
const ACTIVE_STYLE_KEY = 'manga_video_studio_active_style_id';

import type { VisualStyleProfile, CharacterProfile, GeneratedImageRecord, ImageGenerationSettings } from '../types.ts';

export const DEFAULT_STYLE_PROFILES: VisualStyleProfile[] = [
  {
    id: 'style-reference-video',
    name: 'God Grave & Ivory Island (Reference Video Style)',
    createdAt: '2024-01-01T00:00:00.000Z',
    referenceImageThumbnail: '/assets/scenes/scene_hero_portrait.jpg',
    artDirection: 'Atmospheric dark fantasy manga/manhwa with volumetric stormy lighting, high-collar cloak aesthetic, and grand floating sky citadel architecture',
    lightingAndShadows: {
      direction: 'Volumetric divine sunbeams piercing through dense grey storm clouds, cinematic chiaroscuro key light on character face, silver rim light along cloak edges',
      intensity: 'High dynamic range with sharp directional sunlight cutting across overcast gloom',
      shadowDepth: 'Deep graphite charcoal and pitch black shadows with subtle slate-blue ambient bounce',
      highlightStyle: 'Brilliant white celestial sunbeams, glistening water mist, and piercing pale blue ocular glints'
    },
    colorGrading: {
      palette: ['#0f172a', '#334155', '#64748b', '#38bdf8', '#f8fafc'],
      temperature: 'cool cinematic overcast with piercing divine warm beams',
      saturation: 'desaturated atmospheric slate tones with luminous magical accent grading',
      contrast: 'deep cinematic chiaroscuro contrast'
    },
    textureAndRendering: {
      lineArt: 'Refined weighted digital manhwa line art with delicate facial contours and textured fabric folds',
      renderingStyle: 'Sleek painterly digital manhwa illustration with volumetric clouds and atmospheric haze',
      atmosphere: 'Towering grey storm clouds ("Grey Clouds"), celestial light rays, cascading waterfalls into cloud sea, drifting mist'
    },
    characterAesthetics: {
      facialStyle: 'Lean, pale, intensely observant youthful protagonist with sharp angular jawline and stoic calculated expression',
      eyeStyle: 'Piercing luminous pale blue irises with sharp pupils and subtle inner glow',
      hairRendering: 'Windblown messy jet-black fringe falling naturally across forehead in distinct clumps'
    },
    compositionAndCamera: {
      typicalAngles: 'Upward 3/4 close-up shot of protagonist, panoramic ultra-wide landscape of floating ivory island, medium profile tactical perspective',
      depthOfField: 'Sharp focal subject with multi-layered atmospheric perspective and distant cloud depth'
    },
    promptModifiers: 'Shadow Slave God Grave aesthetic, masterpiece dark fantasy manhwa illustration, Sunny upward close-up, messy jet black hair, piercing pale blue eyes, high collar black cloak, floating colossal Ivory Island with ancient pagodas, waterfalls pouring into cloud sea, dramatic grey storm clouds pierced by divine sunbeams, chiaroscuro lighting, 8k resolution, cinematic digital painting',
    negativePromptModifiers: 'blurry, low quality, cartoon, childish, flat lighting, 3d render, watermark, text, signature, distorted face, extra limbs',
    isCustom: false
  },
  {
    id: 'style-solo-leveling',
    name: 'Solo Leveling: Dark Monarch',
    createdAt: '2024-01-01T00:00:00.000Z',
    referenceImageThumbnail: '/assets/scenes/scene_hero_portrait.jpg',
    artDirection: 'High-contrast Korean dark fantasy manhwa webtoon key visual',
    lightingAndShadows: {
      direction: 'Dramatic low-angle key light with deep abyssal rim glow',
      intensity: 'High contrast with glowing specular highlights',
      shadowDepth: 'Deep charcoal and pitch black shadows',
      highlightStyle: 'Cerulean blue and violet ethereal aura reflections'
    },
    colorGrading: {
      palette: ['#05020a', '#1a0b2e', '#3b1d60', '#6366f1', '#38bdf8'],
      temperature: 'cool',
      saturation: 'vibrant magical glow against desaturated monochrome',
      contrast: 'extreme dynamic chiaroscuro'
    },
    textureAndRendering: {
      lineArt: 'Razor-sharp digital ink contours with variable weighted lines',
      renderingStyle: 'Sleek manhwa cel-shading with smooth atmospheric gradients',
      atmosphere: 'Floating dark energy wisps, subtle violet ash, volumetric moonlight'
    },
    characterAesthetics: {
      facialStyle: 'Sharp angular jawline, defined aristocratic features',
      eyeStyle: 'Luminous piercing blue irises with sharp outer lash tapering',
      hairRendering: 'Individual clustered strands with edge sheen highlights'
    },
    compositionAndCamera: {
      typicalAngles: 'Dynamic 3/4 angle, low heroic camera elevation, strong foreground focal depth',
      depthOfField: 'Sharp subject in foreground with misty gothic architectural bokeh'
    },
    promptModifiers: 'Solo Leveling manhwa style, dynamic lineart, abyssal violet rim lighting, glowing blue eyes, chiaroscuro shadows, 8k resolution, Redice studio quality',
    negativePromptModifiers: 'western cartoon, flat colors, washed out, blurry eyes',
    isCustom: false
  },
  {
    id: 'style-berserk-eclipse',
    name: 'Berserk: Dark Fantasy Eclipse',
    createdAt: '2024-01-01T00:00:00.000Z',
    referenceImageThumbnail: '/assets/scenes/scene_cathedral_dragon.jpg',
    artDirection: 'Traditional grimdark seinen manga with dense crosshatching',
    lightingAndShadows: {
      direction: 'Harsh directional sidelight casting heavy geometric shadows',
      intensity: 'Extreme contrast with minimal fill light',
      shadowDepth: 'Ink-black crosshatched heavy shadows',
      highlightStyle: 'Stark white raw highlights on metallic edges'
    },
    colorGrading: {
      palette: ['#080404', '#211010', '#4a1515', '#8b1e1e', '#e2e8f0'],
      temperature: 'high-contrast dark',
      saturation: 'blood-tinted desaturated gritty monochrome',
      contrast: 'maximum ink contrast'
    },
    textureAndRendering: {
      lineArt: 'Dense meticulous dip-pen hatching, heavy cross-hatch shading',
      renderingStyle: 'Traditional Japanese manga screentone and ink wash',
      atmosphere: 'Thick smoke, battlefield embers, apocalyptic crimson eclipse'
    },
    characterAesthetics: {
      facialStyle: 'Weathered, stoic, intense battle-hardened expression',
      eyeStyle: 'Fierce narrowed gaze with white pinprick specular highlights',
      hairRendering: 'Heavy inking with sharp jagged silhouettes'
    },
    compositionAndCamera: {
      typicalAngles: 'Ominous Dutch angle, wide perspective showing scale against gargantuan horrors',
      depthOfField: 'Full depth hyper-detail from foreground blade to distant citadel'
    },
    promptModifiers: 'Kentaro Miura Berserk dark fantasy manga aesthetic, vintage crosshatching ink line art, heavy shadows, crimson blood moon, gritty texture, epic horror atmosphere',
    negativePromptModifiers: 'chibi, cute, soft lighting, modern shiny anime, pastel colors',
    isCustom: false
  },
  {
    id: 'style-orv-webtoon',
    name: 'Omniscient Reader: Modern Webtoon',
    createdAt: '2024-01-01T00:00:00.000Z',
    referenceImageThumbnail: '/assets/scenes/panel_7.jpg',
    artDirection: 'Polished modern urban fantasy manhwa illustration',
    lightingAndShadows: {
      direction: 'Balanced ambient cinematic daylight with blue holographic glow',
      intensity: 'Clean crisp daylight with bright ambient bounce',
      shadowDepth: 'Smooth mid-tone purple and navy shadows',
      highlightStyle: 'Glassy polished specular reflections'
    },
    colorGrading: {
      palette: ['#0f172a', '#1e293b', '#38bdf8', '#fbbf24', '#f8fafc'],
      temperature: 'cool',
      saturation: 'rich saturated digital webtoon colors',
      contrast: 'commercial webtoon balance'
    },
    textureAndRendering: {
      lineArt: 'Ultra-clean smooth digital vector line art',
      renderingStyle: 'Multi-layer digital airbrush cel-shading with soft bloom',
      atmosphere: 'Clean air with glowing blue status particles and golden sunlight'
    },
    characterAesthetics: {
      facialStyle: 'Handsome modern webtoon protagonist with expressive calm eyes',
      eyeStyle: 'Large clear irises with multi-tone gradient reflection',
      hairRendering: 'Silky smooth modern styling with soft gradient tips'
    },
    compositionAndCamera: {
      typicalAngles: 'Eye-level close-up or cinematic medium two-shot',
      depthOfField: 'Subtle soft focus on background urban ruins'
    },
    promptModifiers: 'Omniscient Readers Viewpoint manhwa style, crisp clean line art, luminous magic particles, modern webtoon digital painting, 8k webtoon cover',
    negativePromptModifiers: 'rough sketch, noisy, muddy colors, deformed eyes',
    isCustom: false
  },
  {
    id: 'style-ufotable-anime',
    name: 'Ufotable: Cinematic Anime Film',
    createdAt: '2024-01-01T00:00:00.000Z',
    referenceImageThumbnail: '/assets/scenes/scene_hero_castle_overlook.jpg',
    artDirection: 'High-budget Japanese theatrical anime film still',
    lightingAndShadows: {
      direction: 'Golden hour sunset backlight with chromatic light leaks',
      intensity: 'Luminous volumetric light beams cutting through dusk',
      shadowDepth: 'Rich warm amber and deep indigo shadows',
      highlightStyle: 'Anamorphic lens flare and golden rim illumination'
    },
    colorGrading: {
      palette: ['#090514', '#2d124d', '#7c2d12', '#f59e0b', '#fef3c7'],
      temperature: 'warm',
      saturation: 'lush cinematic color grade with vibrant highlights',
      contrast: 'film-grade dynamic range'
    },
    textureAndRendering: {
      lineArt: 'Delicate fine line art with post-processed bloom and ray tracing',
      renderingStyle: 'Hand-painted makoto shinkai / ufotable background art',
      atmosphere: 'Golden sun rays, twilight clouds, floating glowing dust motes'
    },
    characterAesthetics: {
      facialStyle: 'Emotional expressive anime protagonist features',
      eyeStyle: 'Gem-like multi-faceted irises reflecting the twilight sky',
      hairRendering: 'Windblown volumetric hair with rim light illumination'
    },
    compositionAndCamera: {
      typicalAngles: 'Wide panoramic establishing shot, dramatic low horizon',
      depthOfField: 'Cinematic shallow depth of field with circular bokeh'
    },
    promptModifiers: 'Ufotable anime film still, Fate stay night cinematic aesthetic, volumetric twilight sunbeams, glowing particle effects, hand-painted scenic backdrop, 8k masterpiece',
    negativePromptModifiers: 'flat colors, bad 3d render, low resolution, blurry',
    isCustom: false
  }
];

export function getSavedStyleProfiles(): VisualStyleProfile[] {
  try {
    const raw = localStorage.getItem(STYLE_PROFILES_KEY);
    if (!raw) return DEFAULT_STYLE_PROFILES;
    const parsed = JSON.parse(raw) as VisualStyleProfile[];
    // Ensure default profiles are preserved
    const combined = [...parsed];
    for (const def of DEFAULT_STYLE_PROFILES) {
      if (!combined.some(p => p.id === def.id)) {
        combined.push(def);
      }
    }
    return combined;
  } catch (e) {
    return DEFAULT_STYLE_PROFILES;
  }
}

export function saveStyleProfile(profile: VisualStyleProfile): VisualStyleProfile[] {
  const existing = getSavedStyleProfiles();
  const index = existing.findIndex(p => p.id === profile.id);
  if (index >= 0) {
    existing[index] = profile;
  } else {
    existing.unshift(profile);
  }
  try {
    localStorage.setItem(STYLE_PROFILES_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to save style profile to localStorage:', e);
  }
  return existing;
}

export function deleteStyleProfile(id: string): VisualStyleProfile[] {
  const existing = getSavedStyleProfiles().filter(p => p.id !== id);
  try {
    localStorage.setItem(STYLE_PROFILES_KEY, JSON.stringify(existing));
  } catch (e) {}
  return existing;
}

export function getActiveStyleProfileId(): string {
  try {
    return localStorage.getItem(ACTIVE_STYLE_KEY) || DEFAULT_STYLE_PROFILES[0].id;
  } catch (e) {
    return DEFAULT_STYLE_PROFILES[0].id;
  }
}

export function setActiveStyleProfileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_STYLE_KEY, id);
  } catch (e) {}
}

// -------------------------------------------------------------
// Character Consistency Profiles Storage
// -------------------------------------------------------------
const CHARACTER_PROFILES_KEY = 'manga_video_studio_character_profiles';
const ACTIVE_CHARACTER_KEY = 'manga_video_studio_active_character_id';

export const DEFAULT_CHARACTER_PROFILES: CharacterProfile[] = [
  {
    id: 'char-sunny-shadow-slave',
    name: 'Sunny (Lost from Light)',
    gender: 'male',
    ageRange: 'Late teens / Young adult',
    facialStructure: 'Lean sharp aristocratic jawline, pale porcelain skin, intense stoic expression',
    eyeColorAndShape: 'piercing cerulean blue with shadowy luminous highlights',
    hairStyleAndColor: 'messy jet-black raven hair with windblown fringe and natural clump separation',
    clothingAndOutfit: 'tattered dark hooded traveler cloak over midnight leather scout armor and obsidian pauldrons',
    accessoriesAndWeapons: 'sheathed obsidian dagger at hip, silver crow brooch pinning his mantle',
    distinguishingFeatures: 'subtle phantom shadow wisps clinging to his fingers and footsteps',
    auraOrMagic: 'whispering shadowy essence and dark smoke tendrils',
    avatarUrl: '/assets/scenes/scene_hero_portrait.jpg',
    createdAt: '2024-01-01T00:00:00.000Z',
    isDefault: true
  },
  {
    id: 'char-nephis-changing-star',
    name: 'Nephis (Changing Star)',
    gender: 'female',
    ageRange: 'Late teens / Young adult',
    facialStructure: 'Graceful yet commanding visage, striking pale complexion, unwavering resolute gaze',
    eyeColorAndShape: 'molten silver-gray eyes that spark with white solar flames',
    hairStyleAndColor: 'long shimmering platinum silver hair cascading in loose waves',
    clothingAndOutfit: 'gleaming white and gold battle tunic with lightweight silver mail',
    accessoriesAndWeapons: 'radiant longsword with etched celestial sun runes',
    distinguishingFeatures: 'faint white starlight aura pulsing with divine heat',
    auraOrMagic: 'purifying white soul flame illuminating surrounding shadows',
    avatarUrl: '/assets/scenes/daylight_1.jpg',
    createdAt: '2024-01-01T00:00:00.000Z',
    isDefault: false
  }
];

export function getSavedCharacterProfiles(): CharacterProfile[] {
  try {
    const raw = localStorage.getItem(CHARACTER_PROFILES_KEY);
    if (!raw) return DEFAULT_CHARACTER_PROFILES;
    const parsed = JSON.parse(raw) as CharacterProfile[];
    const combined = [...parsed];
    for (const def of DEFAULT_CHARACTER_PROFILES) {
      if (!combined.some(c => c.id === def.id)) {
        combined.push(def);
      }
    }
    return combined;
  } catch (e) {
    return DEFAULT_CHARACTER_PROFILES;
  }
}

export function saveCharacterProfile(profile: CharacterProfile): CharacterProfile[] {
  const existing = getSavedCharacterProfiles();
  const index = existing.findIndex(c => c.id === profile.id);
  if (index >= 0) {
    existing[index] = profile;
  } else {
    existing.unshift(profile);
  }
  try {
    localStorage.setItem(CHARACTER_PROFILES_KEY, JSON.stringify(existing));
  } catch (e) {}
  return existing;
}

export function deleteCharacterProfile(id: string): CharacterProfile[] {
  const existing = getSavedCharacterProfiles().filter(c => c.id !== id);
  try {
    localStorage.setItem(CHARACTER_PROFILES_KEY, JSON.stringify(existing));
  } catch (e) {}
  return existing;
}

export function getActiveCharacterProfileId(): string {
  try {
    return localStorage.getItem(ACTIVE_CHARACTER_KEY) || DEFAULT_CHARACTER_PROFILES[0].id;
  } catch (e) {
    return DEFAULT_CHARACTER_PROFILES[0].id;
  }
}

export function setActiveCharacterProfileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_CHARACTER_KEY, id);
  } catch (e) {}
}

// -------------------------------------------------------------
// Image Generation Settings Storage
// -------------------------------------------------------------
const IMAGE_SETTINGS_KEY = 'manga_video_studio_image_settings';

export const DEFAULT_IMAGE_SETTINGS: ImageGenerationSettings = {
  providerId: 'pollinations-flux',
  aspectRatio: '16:9',
  resolution: '1080p',
  quality: 'high',
  steps: 28,
  guidanceScale: 7.5,
  seed: undefined,
  styleStrength: 0.85,
  characterConsistencyStrength: 0.85,
  enableStyleGuidance: true,
  enableCharacterGuidance: true,
  activeStyleProfileId: DEFAULT_STYLE_PROFILES[0].id,
  activeCharacterProfileId: DEFAULT_CHARACTER_PROFILES[0].id
};

export function getImageSettings(): ImageGenerationSettings {
  try {
    const raw = localStorage.getItem(IMAGE_SETTINGS_KEY);
    if (!raw) return DEFAULT_IMAGE_SETTINGS;
    return { ...DEFAULT_IMAGE_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_IMAGE_SETTINGS;
  }
}

export function saveImageSettings(settings: Partial<ImageGenerationSettings>): ImageGenerationSettings {
  const current = getImageSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(IMAGE_SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

// -------------------------------------------------------------
// Generated Artwork History Gallery Storage
// -------------------------------------------------------------
const GENERATED_IMAGES_KEY = 'manga_video_studio_generated_images';

export function getGeneratedImageHistory(): GeneratedImageRecord[] {
  try {
    const raw = localStorage.getItem(GENERATED_IMAGES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GeneratedImageRecord[];
  } catch (e) {
    return [];
  }
}

export function saveGeneratedImageRecord(record: GeneratedImageRecord): GeneratedImageRecord[] {
  const existing = getGeneratedImageHistory();
  const filtered = existing.filter(img => img.id !== record.id);
  filtered.unshift(record);
  // Keep up to 60 images in history
  const trimmed = filtered.slice(0, 60);
  try {
    localStorage.setItem(GENERATED_IMAGES_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('LocalStorage save failed for image history (quota):', e);
  }
  return trimmed;
}

export function deleteGeneratedImageRecord(id: string): GeneratedImageRecord[] {
  const existing = getGeneratedImageHistory().filter(img => img.id !== id);
  try {
    localStorage.setItem(GENERATED_IMAGES_KEY, JSON.stringify(existing));
  } catch (e) {}
  return existing;
}

export function clearGeneratedImageHistory(): void {
  try {
    localStorage.removeItem(GENERATED_IMAGES_KEY);
  } catch (e) {}
}

export function getActiveStyleProfile(): VisualStyleProfile | null {
  const id = getActiveStyleProfileId();
  const profiles = getSavedStyleProfiles();
  return profiles.find(p => p.id === id) || profiles[0] || null;
}

export function setActiveStyleProfile(profile: VisualStyleProfile | null): void {
  if (profile) {
    setActiveStyleProfileId(profile.id);
  }
}

export function getActiveCharacterProfile(): CharacterProfile | null {
  const id = getActiveCharacterProfileId();
  const profiles = getSavedCharacterProfiles();
  return profiles.find(c => c.id === id) || profiles[0] || null;
}

export function setActiveCharacterProfile(profile: CharacterProfile | null): void {
  if (profile) {
    setActiveCharacterProfileId(profile.id);
  }
}

export function getSavedImageSettings(): ImageGenerationSettings {
  return getImageSettings();
}
