import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Music, 
  Clock, 
  Film, 
  Video, 
  Layers, 
  Sparkles,
  Maximize2
} from 'lucide-react';
import { Scene, VideoSettings, VoiceSettings, NarrationLanguage } from '../types';
import { speechService } from '../utils/speechService';
import { darkFantasyAudio } from '../utils/audioSynth';

interface StoryboardSectionProps {
  scenes: Scene[];
  videoSettings: VideoSettings;
  voiceSettings: VoiceSettings;
  language: NarrationLanguage;
  onGoToExport: () => void;
  onPreviewImage: (imageUrl: string, sceneNum: number, prompt: string) => void;
}

export const StoryboardSection: React.FC<StoryboardSectionProps> = ({
  scenes,
  videoSettings,
  voiceSettings,
  language,
  onGoToExport,
  onPreviewImage,
}) => {
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bgmActive, setBgmActive] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0); // 0.0 to 1.0
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playTimerRef = useRef<number | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  // Preload images into cache
  useEffect(() => {
    scenes.forEach((scene) => {
      if (scene.imageUrl && !imageCacheRef.current.has(scene.imageUrl)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = scene.imageUrl;
        img.onload = () => {
          imageCacheRef.current.set(scene.imageUrl!, img);
        };
      }
    });
  }, [scenes]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      speechService.stop();
      darkFantasyAudio.stopLiveBgm();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (playTimerRef.current) window.clearInterval(playTimerRef.current);
    };
  }, []);

  const currentScene = scenes[activeSceneIndex] || scenes[0];

  // Start / Stop BGM
  const toggleBgm = () => {
    if (bgmActive) {
      darkFantasyAudio.stopLiveBgm();
      setBgmActive(false);
    } else {
      darkFantasyAudio.startLiveBgm(voiceSettings.bgmVolume * 0.3);
      setBgmActive(true);
    }
  };

  // Play / Pause Storyboard
  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    setIsPlaying(true);
    playSceneVoice(activeSceneIndex);
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    speechService.stop();
  };

  const playSceneVoice = (index: number) => {
    if (index >= scenes.length) {
      setIsPlaying(false);
      setActiveSceneIndex(0);
      return;
    }

    const scene = scenes[index];
    setActiveSceneIndex(index);
    setSceneProgress(0);

    // Speak narration
    speechService.speak(scene.narrationText, {
      lang: language,
      voiceURI: voiceSettings.voiceURI,
      rate: voiceSettings.rate,
      pitch: voiceSettings.pitch,
      sceneId: scene.id,
      onEnd: () => {
        // Continuous flow: Transition directly to the next scene with zero dead pauses
        if (index + 1 < scenes.length) {
          playSceneVoice(index + 1);
        } else {
          setIsPlaying(false);
        }
      },
      onError: () => {
        if (index + 1 < scenes.length) {
          playSceneVoice(index + 1);
        } else {
          setIsPlaying(false);
        }
      },
    });
  };

  // Progress ticker for Ken Burns & progress bar
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 50;
    const sceneDurMs = (currentScene?.duration || 5) * 1000;
    const progressStep = intervalMs / sceneDurMs;

    const interval = window.setInterval(() => {
      setSceneProgress((prev) => {
        const next = prev + progressStep;
        return next > 1.0 ? 1.0 : next;
      });
      setTotalElapsedTime((prev) => Math.min(prev + intervalMs / 1000, totalDuration));
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [isPlaying, currentScene, totalDuration]);

  // Render current scene preview onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentScene) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const cachedImg = currentScene.imageUrl ? imageCacheRef.current.get(currentScene.imageUrl) : null;

    ctx.save();
    // Ken Burns subtle zoom
    if (videoSettings.kenBurnsEffect) {
      const zoom = 1.0 + 0.12 * sceneProgress;
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);
    }

    if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
      const imgRatio = cachedImg.naturalWidth / cachedImg.naturalHeight;
      const targetRatio = width / height;
      let drawW = width;
      let drawH = height;
      let drawX = 0;
      let drawY = 0;

      if (imgRatio > targetRatio) {
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
      } else {
        drawH = width / imgRatio;
        drawY = (height - drawH) / 2;
      }
      ctx.drawImage(cachedImg, drawX, drawY, drawW, drawH);
    } else {
      // Dark placeholder
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 36px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.fillText(`SCENE 0${currentScene.order}`, width / 2, height / 2 - 20);
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(currentScene.description.slice(0, 40) + '...', width / 2, height / 2 + 25);
    }
    ctx.restore();

    // Dark fantasy vignette
    if (videoSettings.vignetteEffect) {
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.7);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Top watermark
    ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1.5;
    ctx.fillRect(24, 24, 130, 36);
    ctx.strokeRect(24, 24, 130, 36);
    ctx.fillStyle = '#f4f4f5';
    ctx.font = 'bold 15px "Cinzel", serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCENE 0${currentScene.order}`, 38, 48);

    // Subtitle overlay
    if (videoSettings.showSubtitles && currentScene.narrationText) {
      const fontSize = 24;
      ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';

      const maxWidth = width * 0.85;
      const words = currentScene.narrationText.split(' ');
      const lines: string[] = [];
      let cur = '';

      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && cur) {
          lines.push(cur);
          cur = w;
        } else {
          cur = test;
        }
      }
      if (cur) lines.push(cur);

      const lineHeight = fontSize * 1.35;
      const totalH = lines.length * lineHeight;
      const boxW = Math.min(width * 0.9, maxWidth + 40);
      const boxH = totalH + 28;
      const boxX = (width - boxW) / 2;
      const boxY = height - boxH - 36;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.strokeStyle = 'rgba(63, 63, 70, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(boxX, boxY, boxW, boxH, 10);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      lines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, boxY + 20 + (idx + 0.75) * lineHeight);
      });
      ctx.shadowBlur = 0;
    }
  }, [currentScene, sceneProgress, videoSettings]);

  const handleSelectScene = (index: number) => {
    setActiveSceneIndex(index);
    setSceneProgress(0);
    if (isPlaying) {
      playSceneVoice(index);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Top Banner - Pure Black & Dark Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl">
        <div>
          <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-400" />
            <span>Visual Storyboard Timeline</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Review images, narration, and scene pacing in sequential order before video export.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToExport}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-cinzel text-xs sm:text-sm font-bold tracking-wider transition-all cursor-pointer shadow-md border border-amber-400"
        >
          <Video className="w-4 h-4 fill-zinc-950" />
          <span>Proceed to Video Studio &rarr;</span>
        </button>
      </div>

      {/* Main Preview Player Card */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Canvas Display */}
        <div className="relative aspect-video max-w-4xl mx-auto rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-inner group">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-contain"
          />

          {/* Quick full-res image zoom */}
          {currentScene.imageUrl && (
            <button
              type="button"
              onClick={() => onPreviewImage(currentScene.imageUrl!, currentScene.order, currentScene.imagePrompt)}
              className="absolute top-3 right-3 p-2 rounded-lg bg-black/70 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Expand Artwork"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Player Controls Bar */}
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Play/Pause & Nav */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSelectScene(Math.max(0, activeSceneIndex - 1))}
              disabled={activeSceneIndex === 0}
              className="p-2 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous Scene"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-zinc-950" /> : <Play className="w-4 h-4 fill-zinc-950" />}
              <span>{isPlaying ? 'Pause' : 'Play Storyboard'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectScene(Math.min(scenes.length - 1, activeSceneIndex + 1))}
              disabled={activeSceneIndex === scenes.length - 1}
              className="p-2 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Next Scene"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Current Scene Timing Info */}
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="font-mono bg-zinc-900 px-2.5 py-1 rounded border border-zinc-700 text-white font-semibold">
              Scene {activeSceneIndex + 1} of {scenes.length}
            </span>
            <span className="font-mono text-zinc-400">
              ({currentScene.duration}s duration)
            </span>
          </div>

          {/* Ambient BGM Toggle */}
          <button
            type="button"
            onClick={toggleBgm}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              bgmActive
                ? 'bg-zinc-800 text-amber-400 border-amber-500/80 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-700'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Dark Ambient BGM: {bgmActive ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Visual Timeline Segments Bar */}
        <div className="max-w-4xl mx-auto space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Storyboard Timeline Sequence</span>
            <span className="font-mono">Total: ~{totalDuration}s</span>
          </div>
          <div className="w-full flex h-4 rounded-lg overflow-hidden bg-black border border-zinc-800 p-0.5 gap-1">
            {scenes.map((scene, idx) => {
              const weight = (scene.duration / totalDuration) * 100;
              const isActive = idx === activeSceneIndex;

              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => handleSelectScene(idx)}
                  style={{ width: `${weight}%` }}
                  className={`h-full rounded transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 shadow-sm'
                      : 'bg-zinc-900 hover:bg-zinc-800'
                  }`}
                  title={`Scene ${idx + 1} (${scene.duration}s)`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Storyboard Sequential Cards Grid */}
      <div className="space-y-3">
        <h3 className="font-cinzel text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Ordered Scene Cards</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {scenes.map((scene, index) => {
            const isSelected = index === activeSceneIndex;

            return (
              <div
                key={scene.id}
                onClick={() => handleSelectScene(index)}
                className={`rounded-xl border p-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-zinc-900 border-amber-500 ring-1 ring-amber-500/40 shadow-lg'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Thumbnail & Status Overlay */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2 border border-zinc-800">
                  {scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
                      alt={`Scene ${scene.order}`}
                      className="w-full h-full object-cover"
                    />
                  ) : scene.imageStatus === 'generating' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-zinc-950">
                      <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-1" />
                      <span className="text-[10px] text-amber-400 font-bold">Generating AI Art...</span>
                    </div>
                  ) : scene.imageStatus === 'failed' || scene.imageStatus === 'error' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-rose-950/40 border border-rose-900/60">
                      <span className="text-[10px] text-rose-400 font-bold">Generation Failed</span>
                      <span className="text-[9px] text-rose-300 line-clamp-1 mt-0.5">{scene.imageError || 'Error'}</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 bg-zinc-950">
                      Pending AI Art
                    </div>
                  )}

                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 text-[10px] font-cinzel font-bold text-white border border-zinc-700">
                    SCENE #{scene.order}
                  </span>

                  {/* Provider or Status Badge */}
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-amber-300 border border-zinc-800 line-clamp-1 max-w-[120px]">
                    {scene.imageStatus === 'ready' ? (scene.imageProvider || 'AI Generated') : scene.imageStatus}
                  </span>

                  <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-300">
                    {scene.duration}s
                  </span>
                </div>

                {/* Narration Audio Snippet & Timing */}
                {scene.narrationAudioUrl && (
                  <div className="mb-2 flex items-center justify-between bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800 text-[10px]">
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      <span>{language === 'hi' ? 'Hindi Voice' : 'Voice'}: {scene.narrationDuration ? `${scene.narrationDuration.toFixed(1)}s` : `${scene.duration}s`}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const aud = new Audio(scene.narrationAudioUrl);
                        aud.play();
                      }}
                      className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[9px] transition-colors cursor-pointer"
                    >
                      ▶ Play Audio
                    </button>
                  </div>
                )}

                {/* Narration Excerpt */}
                <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                  {scene.narrationText || scene.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
