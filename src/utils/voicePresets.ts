import { VoicePreset, VoicePresetId, NarrationLanguage } from '../types';

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'fixed-male-narrator',
    name: 'Fixed Male Hindi Narrator (Calibrated Baritone)',
    gender: 'male',
    tone: 'Deep Baritone, Dramatic & Authoritative',
    description: 'Calibrated male voice modeled on the reference Manga Explainer video. Resonant chest equalization (135 Hz boost) and pitch transposition for deep dramatic impact across all episodes.',
    sampleText: {
      en: 'Sunny stood upon the ancient watchtower, gazing across the mist-shrouded lake as colossal shadows gathered in the deep.',
      hi: 'वो लगातार आसमान को देख रहा था। कुछ समय पहले तक आसमान साफ और नीला था, मगर अब धीरे-धीरे बादलों के पीछे छिपी चीज किसी को भी राख बना सकती थी।'
    },
    pitch: 0.83,
    rate: 1.0,
    geminiVoiceName: 'Fenrir',
    geminiSpeakerStyle: 'Authoritative, resonant, dramatic Hindi manga explainer male narrator'
  },
  {
    id: 'hindi-explainer-baritone',
    name: 'Hindi Manga Explainer (Baritone Storyteller)',
    gender: 'male',
    tone: 'Resonant Baritone, Suspenseful & Engaging',
    description: 'Modeled directly on the reference Manga Explained video. Deep baritone with steady storytelling cadence (~130 WPM), dramatic pauses, and clear pronunciation of fantasy lore.',
    sampleText: {
      en: 'He gazed intently at the gathering sky. What had been crystal blue moments ago was now swallowed by towering grey clouds.',
      hi: 'वो लगातार आसमान को देख रहा था। कुछ समय पहले तक आसमान साफ और नीला था, मगर अब धीरे-धीरे ग्रे क्लाउड्स उसे निगल रहे थे।'
    },
    pitch: 0.88,
    rate: 0.94,
    geminiVoiceName: 'Fenrir',
    geminiSpeakerStyle: 'Deep, resonant, suspenseful Hindi manga explainer baritone'
  },
  {
    id: 'male-deep',
    name: 'Male Deep Narrator',
    gender: 'male',
    tone: 'Resonant, Grave & Epic',
    description: 'Deep baritone with slow, commanding cadence. Perfect for grim dark fantasy, ancient lore, and high stakes.',
    sampleText: {
      en: 'In the forgotten era before the gods fell, the abyss was sealed by seven mortal blades.',
      hi: 'जब देवताओं ने संसार को त्याग दिया, तब अंधेरे के प्राचीन राजाओं ने अपनी नींद तोड़ी।'
    },
    pitch: 0.82,
    rate: 0.92,
    geminiVoiceName: 'Fenrir',
    geminiSpeakerStyle: 'Deep, resonant, grave, dark fantasy narrator'
  },
  {
    id: 'male-cinematic',
    name: 'Male Cinematic Narrator',
    gender: 'male',
    tone: 'Dynamic, Bold & Authoritative',
    description: 'Rich theatrical trailer voice with crisp articulation and powerful narrative momentum.',
    sampleText: {
      en: 'From the cracked obsidian fissure crawled the shadows of ancient kings, hungry for the living world.',
      hi: 'पाताल का अंतिम द्वार टूट चुका था, और सदियों पुरानी खामोशी अब युद्ध के चीखों में बदलने वाली थी।'
    },
    pitch: 0.95,
    rate: 1.0,
    geminiVoiceName: 'Puck',
    geminiSpeakerStyle: 'Authoritative, theatrical cinematic narrator, bold and steady'
  },
  {
    id: 'male-emotional',
    name: 'Male Emotional Narrator',
    gender: 'male',
    tone: 'Poignant, Intimate & Tense',
    description: 'Intense and expressive voice that captures psychological conflict, inner turmoil, and desperate battles.',
    sampleText: {
      en: 'Ren did not draw his sword to save the kingdom. He drew it to settle a blood debt ten centuries in the making.',
      hi: 'वह किसी की रक्षा करने नहीं, बल्कि अपने खून का हिसाब चुकता करने उस वीरान खाई में उतरा था।'
    },
    pitch: 1.0,
    rate: 1.05,
    geminiVoiceName: 'Charon',
    geminiSpeakerStyle: 'Emotional, poignant, dramatic anime male protagonist voice'
  }
];

export function getVoicePreset(id: VoicePresetId): VoicePreset {
  return VOICE_PRESETS.find(p => p.id === id) || VOICE_PRESETS[0];
}

import { speechService } from './speechService';

/**
 * Returns the recommended voice preset based on language
 */
export function getRecommendedVoiceForLanguage(lang: NarrationLanguage): VoicePreset {
  return VOICE_PRESETS[0]; // Always return the fixed male narrator
}

/**
 * Previews sample audio for a voice preset using the speech service
 */
export function previewVoicePreset(
  presetOrId: VoicePreset | VoicePresetId,
  language: NarrationLanguage = 'hi',
  onEnd?: () => void,
  onError?: () => void
): void {
  const preset = typeof presetOrId === 'string' ? getVoicePreset(presetOrId) : presetOrId;
  const text = preset.sampleText[language] || preset.sampleText.hi;
  speechService.speak(text, {
    lang: language,
    pitch: preset.pitch,
    rate: preset.rate,
    onEnd,
    onError
  });
}

