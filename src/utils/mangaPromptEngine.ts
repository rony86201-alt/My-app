import { CharacterProfile, VisualStyleProfile, ImageGenerationSettings } from '../types.ts';

interface BuildPromptOptions {
  sceneDescription: string;
  characterProfile?: CharacterProfile | null;
  styleProfile?: VisualStyleProfile | null;
  settings?: Partial<ImageGenerationSettings>;
  cameraAngle?: string;
  moodOrWeather?: string;
}

export interface CompiledMangaPrompt {
  positivePrompt: string;
  negativePrompt: string;
  characterAnchorsApplied: boolean;
  styleAnchorsApplied: boolean;
  summary: string;
}

/**
 * Advanced Manga & Manhwa Prompt Compilation Engine
 * Transforms simple scene notes into production-ready anime illustration prompts
 * with strict anatomy safeguards, cinematic lighting, and consistency tokens.
 */
export function buildMangaImagePrompt(options: BuildPromptOptions): CompiledMangaPrompt {
  const {
    sceneDescription,
    characterProfile,
    styleProfile,
    settings,
    cameraAngle,
    moodOrWeather
  } = options;

  const styleStrength = settings?.styleStrength ?? 0.85;
  const characterStrength = settings?.characterConsistencyStrength ?? 0.85;
  const enableStyle = settings?.enableStyleGuidance ?? true;
  const enableCharacter = settings?.enableCharacterGuidance ?? true;

  const promptParts: string[] = [];
  let characterAnchorsApplied = false;
  let styleAnchorsApplied = false;

  // 1. Core Art Direction & Quality Anchor
  let coreStyle = 'masterpiece, best quality, professional manga illustration, manhwa webtoon key visual, ultra-detailed';
  if (enableStyle && styleProfile?.artDirection) {
    coreStyle = `masterpiece, best quality, ${styleProfile.artDirection}, ultra-detailed artwork`;
    styleAnchorsApplied = true;
  }
  promptParts.push(coreStyle);

  // 2. Character Visual Consistency Injection
  if (enableCharacter && characterProfile) {
    characterAnchorsApplied = true;
    const charDescriptors: string[] = [];

    // Name & Demographics
    charDescriptors.push(`${characterProfile.name}, ${characterProfile.gender} anime protagonist`);

    // Facial structure & Eyes
    if (characterProfile.facialStructure) {
      charDescriptors.push(characterProfile.facialStructure);
    }
    if (characterProfile.eyeColorAndShape) {
      charDescriptors.push(`piercing detailed ${characterProfile.eyeColorAndShape} eyes with luminous reflections`);
    }

    // Hair
    if (characterProfile.hairStyleAndColor) {
      charDescriptors.push(`distinctive ${characterProfile.hairStyleAndColor} hair with individual dynamic strands`);
    }

    // Clothing & Weapons
    if (characterProfile.clothingAndOutfit) {
      charDescriptors.push(`wearing ${characterProfile.clothingAndOutfit}`);
    }
    if (characterProfile.accessoriesAndWeapons) {
      charDescriptors.push(`equipped with ${characterProfile.accessoriesAndWeapons}`);
    }

    // Special marks & Magic aura
    if (characterProfile.distinguishingFeatures) {
      charDescriptors.push(characterProfile.distinguishingFeatures);
    }
    if (characterProfile.auraOrMagic) {
      charDescriptors.push(`subtle ethereal ${characterProfile.auraOrMagic}`);
    }

    if (characterStrength >= 0.7) {
      promptParts.push(charDescriptors.join(', '));
    } else {
      // Mild weighting
      promptParts.push(charDescriptors.slice(0, 4).join(', '));
    }
  }

  // 3. Scene Action & Subject Matter (What is happening)
  const cleanedScene = cleanUserPrompt(sceneDescription);
  promptParts.push(cleanedScene);

  // 4. Camera & Composition Perspective
  if (cameraAngle) {
    promptParts.push(cameraAngle);
  } else if (typeof styleProfile?.compositionAndCamera === 'string') {
    promptParts.push(styleProfile.compositionAndCamera);
  } else if (styleProfile?.compositionAndCamera && typeof styleProfile.compositionAndCamera === 'object') {
    promptParts.push(styleProfile.compositionAndCamera.typicalAngles);
  } else {
    promptParts.push('cinematic dynamic composition, rule of thirds, dramatic framing');
  }

  // 5. Lighting, Shadows & Atmospheric Color Grading (From Style Profile)
  if (enableStyle && styleProfile) {
    const lightingParts: string[] = [];

    if (typeof styleProfile.lightingAndShadows === 'string') {
      lightingParts.push(styleProfile.lightingAndShadows);
    } else if (styleProfile.lightingAndShadows && typeof styleProfile.lightingAndShadows === 'object') {
      const { direction, intensity, shadowDepth, highlightStyle } = styleProfile.lightingAndShadows;
      if (direction) lightingParts.push(`${direction} lighting`);
      if (intensity) lightingParts.push(`${intensity} luminosity`);
      if (shadowDepth) lightingParts.push(`${shadowDepth} cast shadows`);
      if (highlightStyle) lightingParts.push(`${highlightStyle} highlights`);
    }

    if (typeof styleProfile.colorGrading === 'string') {
      lightingParts.push(styleProfile.colorGrading);
    } else if (styleProfile.colorGrading && typeof styleProfile.colorGrading === 'object') {
      const { temperature, saturation, contrast, palette } = styleProfile.colorGrading;
      if (temperature) lightingParts.push(`${temperature} color grading`);
      if (saturation) lightingParts.push(`${saturation} tones`);
      if (contrast) lightingParts.push(`${contrast} contrast`);
      if (palette && palette.length > 0) {
        lightingParts.push(`color harmony in tones of ${palette.slice(0, 3).join(', ')}`);
      }
    }

    if (typeof styleProfile.texturesAndRendering === 'string') {
      lightingParts.push(styleProfile.texturesAndRendering);
    } else if (styleProfile.textureAndRendering) {
      const { lineArt, renderingStyle, atmosphere } = styleProfile.textureAndRendering;
      if (lineArt) lightingParts.push(lineArt);
      if (renderingStyle) lightingParts.push(renderingStyle);
      if (atmosphere) lightingParts.push(atmosphere);
    }

    if (styleProfile.promptTokens) {
      lightingParts.push(styleProfile.promptTokens);
    } else if (styleProfile.promptModifiers) {
      lightingParts.push(styleProfile.promptModifiers);
    }

    if (styleStrength >= 0.6) {
      promptParts.push(lightingParts.join(', '));
    } else {
      promptParts.push(lightingParts.slice(0, 3).join(', '));
    }
  } else {
    // Default high-grade manga lighting
    promptParts.push('volumetric cinematic lighting, chiaroscuro shadows, glowing rim light, crisp inking, rich environmental depth');
  }

  if (moodOrWeather) {
    promptParts.push(moodOrWeather);
  }

  // 6. Finishing Polish Tokens
  promptParts.push('sharp focus, 8k resolution, highly detailed background, anime film still');

  const positivePrompt = promptParts.filter(Boolean).join(', ');

  // Standard Negative Prompt for Manga/Manhwa models
  const negativeTokens = [
    'lowres',
    'bad anatomy',
    'bad hands',
    'missing fingers',
    'extra fingers',
    'fused fingers',
    'distorted face',
    'blurry eyes',
    'cross-eyed',
    'mutated hands',
    'poorly drawn face',
    'mutation',
    'deformed',
    'extra limbs',
    'malformed limbs',
    'bad proportions',
    'disfigured',
    'out of frame',
    'watermark',
    'signature',
    'text',
    'cut off',
    'low quality',
    'normal quality',
    'jpeg artifacts',
    'cropped',
    'amateur drawing',
    'photorealistic face on anime body'
  ];

  if (styleProfile?.negativePromptModifiers) {
    negativeTokens.unshift(styleProfile.negativePromptModifiers);
  }

  const negativePrompt = negativeTokens.join(', ');

  return {
    positivePrompt,
    negativePrompt,
    characterAnchorsApplied,
    styleAnchorsApplied,
    summary: `Prompt compiled with ${characterAnchorsApplied ? 'Character Consistency' : 'Standard Subject'} & ${styleAnchorsApplied ? 'Reference Style Profile' : 'Default Anime Style'}`
  };
}

/**
 * Cleans simple user descriptions into concise narrative phrases
 */
function cleanUserPrompt(raw: string): string {
  if (!raw) return 'A dramatic manga scene';
  return raw
    .replace(/^Scene\s*\d+[:\-.]\s*/i, '')
    .replace(/^(Chapter|Panel)\s*\d+[:\-.]\s*/i, '')
    .trim();
}
