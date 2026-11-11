import React from 'react';
import { 
  FolderOpen, 
  Save, 
  PlusCircle, 
  Volume2, 
  CheckCircle2, 
  FileText,
  Film,
  Sparkles,
  Palette,
  Radio,
  Sliders,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { NarrationLanguage, ServiceStatus } from '../types';

export type PrimaryNav = 'home' | 'video_generation';

interface HeaderProps {
  primaryNav: PrimaryNav;
  setPrimaryNav: (nav: PrimaryNav) => void;
  guidedStep: number;
  setGuidedStep: (step: number) => void;
  canAdvanceToStep2: boolean;
  canAdvanceToStep3: boolean;
  canAdvanceToStep4: boolean;
  language: NarrationLanguage;
  setLanguage: (lang: NarrationLanguage) => void;
  projectTitle: string;
  setProjectTitle: (title: string) => void;
  sceneCount: number;
  totalDuration: number;
  onSave: () => void;
  onOpenProjects: () => void;
  onNewProject: () => void;
  onOpenVoiceModal: () => void;
  onOpenImageStudio?: () => void;
  onGoHome?: () => void;
  serviceStatus: ServiceStatus;
  liveJobCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  primaryNav,
  setPrimaryNav,
  guidedStep,
  setGuidedStep,
  canAdvanceToStep2,
  canAdvanceToStep3,
  canAdvanceToStep4,
  language,
  setLanguage,
  projectTitle,
  setProjectTitle,
  sceneCount,
  totalDuration,
  onSave,
  onOpenProjects,
  onNewProject,
  onOpenVoiceModal,
  onOpenImageStudio,
  onGoHome,
  serviceStatus,
  liveJobCount = 0,
}) => {
  const steps = [
    { number: 1, label: 'Story & Script', icon: FileText, isAvailable: true },
    { number: 2, label: `Storyboard (${sceneCount})`, icon: Film, isAvailable: canAdvanceToStep2 },
    { number: 3, label: 'Voice & Style', icon: Sliders, isAvailable: canAdvanceToStep3 },
    { number: 4, label: 'Queue & Launch', icon: Sparkles, isAvailable: canAdvanceToStep4 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-zinc-800">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Project Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          {/* Logo Crest - Clickable to return to Home */}
          <div 
            onClick={onGoHome || (() => { setPrimaryNav('home'); setGuidedStep(1); })}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center border border-amber-500/40 shadow-lg shadow-amber-500/10 shrink-0 relative overflow-hidden group cursor-pointer"
            title="Global Home — Guided Video Creator"
          >
            <div className="absolute inset-0 bg-radial from-amber-500/20 via-transparent to-transparent opacity-75 pointer-events-none" />
            <svg 
              className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-transform duration-300 group-hover:scale-110" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="2" y="3" width="20" height="18" rx="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M7 3V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M17 3V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M7 17V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M17 17V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M2 9.5H22" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
              <path d="M2 14.5H22" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
              <polygon points="10,10 16,12 10,14" fill="#fbbf24" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div 
              onClick={onGoHome || (() => { setPrimaryNav('home'); setGuidedStep(1); })}
              className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group"
              title="Global Home"
            >
              <span className="font-cinzel text-base sm:text-lg md:text-xl font-bold tracking-wider text-white group-hover:text-amber-400 transition-colors truncate">
                Manga Video Studio AI
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest px-1.5 sm:px-2 py-0.5 rounded bg-zinc-900 text-amber-400 border border-zinc-800 shrink-0">
                PRO
              </span>
            </div>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="Project Name..."
              className="text-xs text-zinc-300 bg-transparent hover:bg-zinc-900/60 focus:bg-zinc-900 px-1 py-0.5 rounded outline-none border border-transparent focus:border-zinc-700 w-full max-w-[180px] sm:max-w-[280px] truncate transition-all"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Fixed Male Hindi Narrator Badge */}
          <button
            onClick={onOpenVoiceModal}
            title="Calibrated Deep Hindi Male Baritone Narrator (Locked)"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 text-xs font-medium transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-white">Fixed Hindi Male Narrator</span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 text-xs">
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                language === 'hi'
                  ? 'bg-zinc-800 text-amber-400 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              हिन्दी (HI)
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                language === 'en'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Voice Settings Button */}
          <button
            onClick={onOpenVoiceModal}
            title="Configure Narration & Voice Engine"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 text-xs font-medium transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Voice Engine</span>
          </button>

          {/* Manga Image & Style Studio Button */}
          {onOpenImageStudio && (
            <button
              onClick={onOpenImageStudio}
              title="Manga Image Generation & Style Reference Studio"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-medium shadow-sm transition-all"
            >
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Image Studio</span>
            </button>
          )}

          {/* Save Project Button */}
          <button
            onClick={onSave}
            title="Save Project locally"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 border border-amber-400/40 text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Open Projects Button */}
          <button
            onClick={onOpenProjects}
            title="Open Saved Projects"
            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 text-xs transition-colors cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          {/* New Project */}
          <button
            onClick={onNewProject}
            title="Start New Project"
            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 text-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sequential Guided Workflow Stepper Bar (Replaces arbitrary independent tabs) */}
      <div className="border-t border-zinc-900 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          {primaryNav === 'home' ? (
            <div className="flex items-center justify-between overflow-x-auto scrollbar-none gap-2">
              <div className="flex items-center space-x-1 sm:space-x-2">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  const isCurrent = guidedStep === step.number;
                  const isPassed = guidedStep > step.number;
                  const canClick = step.isAvailable || isPassed;

                  return (
                    <React.Fragment key={step.number}>
                      <button
                        onClick={() => {
                          if (canClick) {
                            setGuidedStep(step.number);
                          }
                        }}
                        disabled={!canClick}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
                          isCurrent
                            ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold border border-amber-400'
                            : isPassed
                            ? 'bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 border border-zinc-700/60'
                            : 'text-zinc-600 bg-transparent opacity-60 border border-transparent'
                        }`}
                        title={
                          canClick
                            ? `Go to Step ${step.number}: ${step.label}`
                            : `Complete preceding steps to unlock ${step.label}`
                        }
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono ${
                          isCurrent
                            ? 'bg-zinc-950 text-amber-400 font-bold'
                            : isPassed
                            ? 'bg-emerald-500 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {isPassed ? '✓' : step.number}
                        </span>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{step.label}</span>
                      </button>

                      {idx < steps.length - 1 && (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Status info */}
              <div className="hidden lg:flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                <span>{sceneCount} Scenes</span>
                <span>•</span>
                <span>~{totalDuration}s Runtime</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Fixed Male Hindi Voice Active
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between py-1 text-xs text-zinc-300">
              <div className="flex items-center gap-2 font-semibold">
                <Radio className={`w-3.5 h-3.5 ${liveJobCount > 0 ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`} />
                <span>Video Generation Dashboard — Live Concurrent Pipeline & Exported Gallery</span>
              </div>
              <span className="font-mono text-zinc-400 text-[11px]">
                Target: Movies/MangaVideoStudio
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
