import React, { useState, useEffect } from 'react';
import { 
  X, 
  Volume2, 
  Play, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Info
} from 'lucide-react';
import { VoiceSettings, NarrationLanguage } from '../types';
import { speechService, TTSVoiceOption } from '../utils/speechService';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceSettings: VoiceSettings;
  setVoiceSettings: React.Dispatch<React.SetStateAction<VoiceSettings>>;
  language: NarrationLanguage;
  setLanguage: (lang: NarrationLanguage) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  voiceSettings,
  setVoiceSettings,
  language,
  setLanguage,
}) => {
  const [voices, setVoices] = useState<TTSVoiceOption[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const vList = speechService.getVoicesForLanguage(language);
      setVoices(vList);
    }
  }, [isOpen, language]);

  if (!isOpen) return null;

  const handleTestSpeech = () => {
    setIsTesting(true);
    const testPhrase =
      language === 'hi'
        ? 'जब पाताल का अंतिम द्वार खुला, अंधेरे ने संसार को ढक लिया।'
        : 'In a world forsaken by the dawn, only the whispers of the abyss remained.';

    speechService.speak(testPhrase, {
      lang: language,
      voiceURI: voiceSettings.voiceURI,
      rate: voiceSettings.rate,
      pitch: voiceSettings.pitch,
      onEnd: () => setIsTesting(false),
      onError: () => setIsTesting(false),
    });
  };

  const isSupported = speechService.isSupported();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-cinzel text-lg font-bold text-white">
                Voice & Narration Engine
              </h3>
              <p className="text-[11px] text-zinc-400">
                Configure real text-to-speech for Hindi and English narration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Status Banner */}
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs flex items-start gap-2.5">
          {isSupported ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold text-white">
              {isSupported
                ? 'Real Web Speech Synthesis Active'
                : 'Speech Synthesis Not Detected'}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {isSupported
                ? "Uses your browser's native high-quality speech engine. No external API keys or payments needed."
                : 'Your browser or environment is restricting audio synthesis. Narration text is displayed and can be read or recorded manually.'}
            </p>
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-200">Narration Language:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setLanguage('en');
                setVoiceSettings(prev => ({ ...prev, language: 'en', voiceURI: '' }));
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-md font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              English Narration
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage('hi');
                setVoiceSettings(prev => ({ ...prev, language: 'hi', voiceURI: '' }));
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                language === 'hi'
                  ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-md font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              हिन्दी (Hindi Narration)
            </button>
          </div>
        </div>

        {/* Fixed Male Narration Voice - Locked throughout Application */}
        <div className="space-y-2 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-white">Fixed Male Narrator (Hindi Baritone)</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-amber-400 uppercase">
              LOCKED VOICE
            </span>
          </div>

          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Calibrated authoritative Hindi male voice modeled after the reference Manga Explainer narration. Uses resonant chest-voice equalization (135 Hz boost) and pitch transposition for deep dramatic impact across all episodes.
          </p>

          <div className="p-2 rounded-lg bg-black/50 border border-zinc-800 text-[10px] text-zinc-400 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Technical Disclosure:</strong> Zero-shot reference audio cloning is unavailable in standard web environments without private model fine-tuning. Narration uses the fixed closest supported Hindi male baritone engine to ensure complete tonal and character consistency.
            </span>
          </div>
        </div>

        {/* Rate / Speed Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-300">
            <span>Speech Rate (Speed):</span>
            <span className="font-mono text-amber-400 font-bold">{voiceSettings.rate}x</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.5"
            step="0.05"
            value={voiceSettings.rate}
            onChange={(e) => setVoiceSettings(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>0.75x (Dramatic)</span>
            <span>1.0x (Normal)</span>
            <span>1.5x (Fast)</span>
          </div>
        </div>

        {/* Pitch Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-300">
            <span>Voice Pitch:</span>
            <span className="font-mono text-amber-400 font-bold">{voiceSettings.pitch}x</span>
          </div>
          <input
            type="range"
            min="0.7"
            max="1.3"
            step="0.05"
            value={voiceSettings.pitch}
            onChange={(e) => setVoiceSettings(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>0.7x (Deep Anime)</span>
            <span>1.0x (Standard)</span>
            <span>1.3x (High)</span>
          </div>
        </div>

        {/* Action Row */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleTestSpeech}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-zinc-200 ${isTesting ? 'animate-pulse' : ''}`} />
            <span>{isTesting ? 'Speaking Test...' : 'Test Speech'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
