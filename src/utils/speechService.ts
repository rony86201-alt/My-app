import { NarrationLanguage } from '../types';

export interface TTSVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  isDefault: boolean;
}

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isSpeaking = false;
  private isPaused = false;
  private listeners: Set<(state: { isSpeaking: boolean; isPaused: boolean; currentSceneId?: string }) => void> = new Set();
  private activeSceneId?: string;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  public isSupported(): boolean {
    return Boolean(this.synth);
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public getVoicesForLanguage(lang: NarrationLanguage): TTSVoiceOption[] {
    if (!this.synth) return [];
    if (this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }

    const langPrefix = lang === 'hi' ? 'hi' : 'en';
    const filtered = this.voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));

    // If no exact match for Hindi, also return all voices as options
    const listToMap = filtered.length > 0 ? filtered : this.voices;

    return listToMap.map(v => ({
      voiceURI: v.voiceURI,
      name: `${v.name} (${v.lang})`,
      lang: v.lang,
      isDefault: v.default,
    }));
  }

  public speak(
    text: string,
    options: {
      lang: NarrationLanguage;
      voiceURI?: string;
      rate?: number;
      pitch?: number;
      sceneId?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): boolean {
    if (!this.synth) {
      if (options.onError) {
        options.onError(new Error('SpeechSynthesis is not supported in this browser.'));
      }
      return false;
    }

    this.stop();

    if (!text || text.trim().length === 0) {
      return false;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;
    this.activeSceneId = options.sceneId;

    utterance.lang = options.lang === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    // Pick specific voice if specified or find the most natural baritone explainer voice
    if (options.voiceURI) {
      const selected = this.voices.find(v => v.voiceURI === options.voiceURI);
      if (selected) utterance.voice = selected;
    } else {
      // Pick best matching natural voice for Hindi or English
      const langPrefix = options.lang === 'hi' ? 'hi' : 'en';
      const matching = this.voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
      
      // Prefer natural / male baritone voices (e.g. Google Hindi, Madhur, David, Guy, Natural)
      const preferred = matching.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('natural') || n.includes('madhur') || n.includes('hemant') || n.includes('male') || n.includes('guy') || n.includes('google');
      });
      
      utterance.voice = preferred || matching[0] || this.voices[0] || null;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.isPaused = false;
      this.notify();
      options.onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.isPaused = false;
      this.activeSceneId = undefined;
      this.notify();
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.isPaused = false;
      this.activeSceneId = undefined;
      this.notify();
      options.onError?.(e);
    };

    try {
      this.synth.speak(utterance);
      return true;
    } catch (e) {
      console.error('Speech synthesis error:', e);
      options.onError?.(e);
      return false;
    }
  }

  public pause() {
    if (this.synth && this.isSpeaking && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
      this.notify();
    }
  }

  public resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.notify();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.isPaused = false;
      this.activeSceneId = undefined;
      this.notify();
    }
  }

  public getState() {
    return {
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      activeSceneId: this.activeSceneId,
      isSupported: Boolean(this.synth),
    };
  }

  public subscribe(cb: (state: { isSpeaking: boolean; isPaused: boolean; currentSceneId?: string }) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach(cb => cb({
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      currentSceneId: this.activeSceneId,
    }));
  }
}

export const speechService = new SpeechService();
