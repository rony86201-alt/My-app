import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  ArrowRight, 
  Languages, 
  Trash2, 
  HelpCircle, 
  CheckCircle2,
  BookOpen,
  Layers
} from 'lucide-react';
import { NarrationLanguage } from '../types';
import { SAMPLE_STORIES } from '../utils/sceneParser';

interface SceneInputSectionProps {
  inputText: string;
  setInputText: (val: string) => void;
  language: NarrationLanguage;
  setLanguage: (lang: NarrationLanguage) => void;
  onProcessScenes: (rawText: string) => void;
  existingSceneCount: number;
}

export const SceneInputSection: React.FC<SceneInputSectionProps> = ({
  inputText,
  setInputText,
  language,
  setLanguage,
  onProcessScenes,
  existingSceneCount,
}) => {
  const [showTips, setShowTips] = useState(false);

  const handleLoadSample = (sampleLang: 'en' | 'hi') => {
    setLanguage(sampleLang);
    setInputText(sampleLang === 'en' ? SAMPLE_STORIES.english : SAMPLE_STORIES.hindi);
  };

  const handleProcess = () => {
    if (!inputText.trim()) return;
    onProcessScenes(inputText);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Intro Hero Banner - Pure Black & Dark Panel */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Direct Story Paste</span>
            </div>
            <h1 className="font-cinzel text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
              Step 1: Paste Your Manga Story Scenes
            </h1>
            <p className="mt-1 text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Paste story scenes you have created in ChatGPT or Gemini. The studio organizes your scenes, generates cinematic dark fantasy anime artwork, provides Hindi or English narration, and exports a complete video.
            </p>
          </div>

          {/* Language Selector Pill */}
          <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 flex flex-col gap-1.5 min-w-[200px]">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-amber-400" />
              <span>Narration Language</span>
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  language === 'hi'
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Input Box Area */}
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 sm:p-6 shadow-xl relative">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <label className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Paste Story Scenes Text</span>
            <span className="text-xs text-zinc-500 font-normal">
              (Preserves original scene order & text)
            </span>
          </label>

          {/* Quick Load Example Presets */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="text-zinc-500 font-medium">Examples:</span>
            <button
              type="button"
              onClick={() => handleLoadSample('en')}
              className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium transition-colors cursor-pointer"
            >
              Dark Hunter (EN)
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample('hi')}
              className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium transition-colors cursor-pointer"
            >
              शापित योद्धा (HI)
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage('hi');
                setInputText(SAMPLE_STORIES.referenceVideoStory);
              }}
              className="px-2.5 py-1 rounded-md bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-600/50 font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Reference Video Story (God Grave)</span>
            </button>
            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                title="Clear input text"
                className="p-1 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            rows={14}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Paste your prepared scenes here... For example:

Scene 1:
Visual: Ren stands at the precipice of the dark citadel as violet lightning illuminates the gothic spires.
Narration: Ten centuries of silence shattered when the seventh abyssal seal cracked.
Duration: 6s

Scene 2:
Visual: An ancient demonic blade covered in glowing runes begins to hum with dark energy.
Narration: He did not draw the blade to conquer, but to settle an ancient blood oath.`}
            className="w-full bg-black text-zinc-100 placeholder-zinc-600 p-4 rounded-xl border border-zinc-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 font-mono text-xs sm:text-sm leading-relaxed transition-all resize-y"
          />
        </div>

        {/* Action Row */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors self-start sm:self-center cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{showTips ? 'Hide formatting guide' : 'Formatting tips & structure'}</span>
          </button>

          <button
            type="button"
            onClick={handleProcess}
            disabled={!inputText.trim()}
            className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-cinzel text-sm sm:text-base font-bold tracking-wider transition-all shadow-lg ${
              inputText.trim()
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black cursor-pointer shadow-md border border-amber-400'
                : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
            }`}
          >
            <span>Process Scenes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Formatting Guide Expandable */}
        {showTips && (
          <div className="mt-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Supported Paste Formats:</span>
            </h4>
            <p>You can paste story scenes output directly by ChatGPT or Gemini. All of the following patterns work seamlessly:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li><code className="text-zinc-200 font-mono">Scene 1: Visual: ... Narration: ... Duration: 5s</code></li>
              <li><code className="text-zinc-200 font-mono">[Scene 1] Description: ... Voiceover: ...</code></li>
              <li><code className="text-zinc-200 font-mono">1. Story scene description... Narration text...</code></li>
              <li><code className="text-zinc-200 font-mono">दृश्य 1: विवरण: ... वर्णन: ... समय: 5s</code> (Hindi support)</li>
              <li>Simple blocks or paragraphs separated by empty lines or <code className="text-zinc-200 font-mono">---</code>.</li>
            </ul>
            <p className="text-[11px] text-zinc-500">
              Note: The original order and wording of each scene are always strictly preserved.
            </p>
          </div>
        )}
      </div>

      {/* Existing Scenes status banner if user already loaded scenes */}
      {existingSceneCount > 0 && (
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-white">
                {existingSceneCount} Scenes Currently in Studio
              </p>
              <p className="text-xs text-zinc-400">
                You can manage, edit prompts, generate images, or adjust narration in Step 2.
              </p>
            </div>
          </div>
          <button
            onClick={() => onProcessScenes(inputText || 'CONTINUE_EXISTING')}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 text-white border border-zinc-700 text-xs font-bold transition-all cursor-pointer"
          >
            View Scenes &rarr;
          </button>
        </div>
      )}
    </div>
  );
};
