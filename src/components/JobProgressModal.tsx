import React from 'react';
import {
  Search,
  BookOpen,
  FileText,
  Sparkles,
  Volume2,
  Film,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { JobProgress, JobStage } from '../types';

interface JobProgressModalProps {
  progress: JobProgress;
  onComplete: () => void;
  onCancel?: () => void;
}

const STAGES: { key: JobStage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'queued', label: 'Queued in Pipeline', icon: Search },
  { key: 'crafting', label: 'Crafting Storyboard', icon: BookOpen },
  { key: 'generating_images', label: 'Generating AI Artwork', icon: Sparkles },
  { key: 'generating_voice', label: 'Fixed Male Hindi Voice', icon: Volume2 },
  { key: 'rendering_video', label: 'Multiplexing MP4', icon: Film },
  { key: 'completed', label: 'Completed & Verified', icon: CheckCircle2 }
];

export const JobProgressModal: React.FC<JobProgressModalProps> = ({
  progress,
  onComplete,
  onCancel
}) => {
  const currentStageIndex = STAGES.findIndex((s) => s.key === progress.stage);
  const isCompleted = progress.stage === 'completed';
  const isFailed = progress.stage === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl bg-zinc-950 border border-zinc-800 p-6 md:p-8 space-y-6 shadow-2xl">
        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold">
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : isFailed ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            )}
            <span>
              {isCompleted
                ? 'VIDEO GENERATION COMPLETED'
                : isFailed
                ? 'GENERATION FAILED'
                : 'AUTOMATIC VIDEO PIPELINE IN PROGRESS'}
            </span>
          </div>

          <h3 className="text-xl md:text-2xl font-black text-white font-cinzel">
            {isCompleted ? 'Your Manga Video is Ready!' : 'Crafting Manga Explainer Video'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            {progress.message || 'Processing story chapters, generating scenes, and rendering timeline...'}
          </p>
        </div>

        {/* Large Percentage Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-zinc-400">Total Progress</span>
            <span className="text-amber-400 font-mono text-sm">{progress.percentage}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300 shadow-sm"
              style={{ width: `${Math.max(5, Math.min(100, progress.percentage))}%` }}
            />
          </div>
          {progress.totalScenes && progress.totalScenes > 0 && (
            <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
              <span>Scene {progress.currentScene || 1} of {progress.totalScenes}</span>
              <span className="text-zinc-400">Consistent Dark-Fantasy Protagonist Locked</span>
            </div>
          )}
        </div>

        {/* 8-Stage Pipeline Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {STAGES.map((s, idx) => {
            const Icon = s.icon;
            const isPassed = currentStageIndex > idx || isCompleted;
            const isCurrent = currentStageIndex === idx && !isCompleted;

            return (
              <div
                key={s.key}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all ${
                  isPassed
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    : isCurrent
                    ? 'bg-zinc-800 border-amber-500 text-white ring-1 ring-amber-500/50'
                    : 'bg-zinc-950 border-zinc-800/80 text-zinc-600'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    isPassed
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-amber-500 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-zinc-600'
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="text-[11px] font-medium leading-tight">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-3">
          {isCompleted ? (
            <div className="space-y-3">
              {/* File verification banner */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">MP4 Video File Verified on Server</span>
                </div>
                {progress.fileSizeBytes && (
                  <span className="font-mono text-white text-[11px] px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/60">
                    {(progress.fileSizeBytes / 1024 / 1024).toFixed(1)} MB
                  </span>
                )}
              </div>

              <button
                onClick={onComplete}
                className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg border border-amber-400"
              >
                <Film className="w-4 h-4 fill-zinc-950" />
                <span>Play & Export Video in Studio</span>
              </button>
            </div>
          ) : isFailed ? (
            <button
              onClick={onCancel}
              className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold border border-zinc-800 cursor-pointer"
            >
              Close
            </button>
          ) : (
            <div className="w-full text-center text-xs text-zinc-500 italic py-1">
              Please keep this window open while your video and audio are being assembled...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
