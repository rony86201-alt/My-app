import React, { useState } from 'react';
import { 
  Video, 
  Download, 
  Play, 
  Settings, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Music, 
  Sliders, 
  Maximize2,
  RefreshCw,
  Film
} from 'lucide-react';
import { Scene, VideoSettings, VoiceSettings, AspectRatio } from '../types';
import { videoExporter, RenderProgress } from '../utils/videoExporter';
import { addVideoToHistory, addActivityLog } from '../utils/storage';

interface VideoStudioSectionProps {
  scenes: Scene[];
  videoSettings: VideoSettings;
  setVideoSettings: React.Dispatch<React.SetStateAction<VideoSettings>>;
  voiceSettings: VoiceSettings;
  setVoiceSettings: React.Dispatch<React.SetStateAction<VoiceSettings>>;
  projectTitle: string;
}

export const VideoStudioSection: React.FC<VideoStudioSectionProps> = ({
  scenes,
  videoSettings,
  setVideoSettings,
  voiceSettings,
  setVoiceSettings,
  projectTitle,
}) => {
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const totalRuntime = scenes.reduce((sum, s) => sum + s.duration, 0);

  const handleStartRender = async () => {
    setIsRendering(true);
    setRenderError(null);
    setRenderedVideoUrl(null);
    setRenderedBlob(null);

    try {
      const result = await videoExporter.exportVideo(
        scenes,
        videoSettings,
        voiceSettings,
        (progress) => {
          setRenderProgress(progress);
        }
      );

      setRenderedVideoUrl(result.url);
      setRenderedBlob(result.blob);
      setIsRendering(false);

      // Record rendered video to History Center
      try {
        const sizeMb = result.blob ? Number((result.blob.size / (1024 * 1024)).toFixed(2)) : 5.2;
        addVideoToHistory({
          id: `vid-${Date.now()}`,
          title: projectTitle || 'Manga Explainer Video',
          seriesTitle: projectTitle || 'Studio Video',
          videoUrl: result.url,
          fileVerified: true,
          createdAt: new Date().toISOString(),
          durationFormatted: `${Math.floor(totalRuntime / 60)}:${(totalRuntime % 60).toString().padStart(2, '0')}`,
          durationSeconds: totalRuntime,
          resolution: videoSettings.resolution,
          fileSizeMb: sizeMb,
          sceneCount: scenes.length,
          aspectRatio: videoSettings.aspectRatio,
          source: 'Studio Client Exporter'
        });
        addActivityLog({
          type: 'video_rendered',
          title: 'Studio Video Exported',
          description: `Rendered "${projectTitle || 'Manga Video'}" (${scenes.length} scenes, ${videoSettings.resolution})`
        });
      } catch (histErr) {
        console.warn('History recording notice:', histErr);
      }
    } catch (err: any) {
      console.error('Video render failed:', err);
      setRenderError(err.message || 'Video render failed');
      setIsRendering(false);
    }
  };

  const handleCancelRender = () => {
    videoExporter.cancel();
    setIsRendering(false);
  };

  const handleDownload = () => {
    if (!renderedVideoUrl) return;
    const cleanTitle = (projectTitle || 'manga_video').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const a = document.createElement('a');
    a.href = renderedVideoUrl;
    a.download = `${cleanTitle}_manga_video.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-8 animate-fadeIn">
      {/* Top Banner - Pure Black & Dark Panel */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            <Video className="w-3.5 h-3.5 text-amber-400" />
            <span>Full Video Assembly & Export</span>
          </div>
          <h2 className="font-cinzel text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
            Manga Video Studio & Export
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
            Compile your manga scenes, anime artwork, subtitles, and atmospheric dark fantasy soundtrack into a video ready for YouTube, Shorts, or Reels.
          </p>
        </div>

        {/* Quick specs badge */}
        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-xs space-y-1 text-zinc-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Scenes:</span>
            <span className="font-bold text-white">{scenes.length}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Duration:</span>
            <span className="font-bold text-white">~{totalRuntime}s</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Format:</span>
            <span className="font-bold text-amber-400">
              {videoSettings.aspectRatio} ({videoSettings.aspectRatio === '16:9' ? '1280x720' : '720x1280'})
            </span>
          </div>
        </div>
      </div>

      {/* Main Studio Workspace: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Video & Cinematic Options (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 shadow-xl space-y-5">
            <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Video Settings & Style</span>
            </h3>

            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200">Video Aspect Ratio:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVideoSettings(prev => ({ ...prev, aspectRatio: '16:9' }))}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    videoSettings.aspectRatio === '16:9'
                      ? 'bg-zinc-800 border-amber-500 text-white shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm">16:9 Widescreen</span>
                  <span className="text-[10px] text-zinc-400 font-normal">YouTube / Desktop Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoSettings(prev => ({ ...prev, aspectRatio: '9:16' }))}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    videoSettings.aspectRatio === '9:16'
                      ? 'bg-zinc-800 border-amber-500 text-white shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm">9:16 Vertical</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Shorts / Reels / TikTok</span>
                </button>
              </div>
            </div>

            {/* Cinematic Effects Toggles */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-200">Cinematic Effects:</label>
              
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <span className="text-xs text-zinc-200 font-medium">Ken Burns Camera Pan & Zoom</span>
                <input
                  type="checkbox"
                  checked={videoSettings.kenBurnsEffect}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, kenBurnsEffect: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-amber-500 accent-amber-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <span className="text-xs text-zinc-200 font-medium">Dark Fantasy Ambient Embers</span>
                <input
                  type="checkbox"
                  checked={videoSettings.darkFantasyParticles}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, darkFantasyParticles: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-amber-500 accent-amber-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <span className="text-xs text-zinc-200 font-medium">Manga Energy Speedlines</span>
                <input
                  type="checkbox"
                  checked={videoSettings.mangaSpeedLines}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, mangaSpeedLines: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-amber-500 accent-amber-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <span className="text-xs text-zinc-200 font-medium">Cinematic Vignette Shadow</span>
                <input
                  type="checkbox"
                  checked={videoSettings.vignetteEffect}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, vignetteEffect: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-amber-500 accent-amber-500 w-4 h-4"
                />
              </label>
            </div>

            {/* Subtitles Overlay */}
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <span className="text-xs text-zinc-200 font-medium">Display Narration Subtitles</span>
                <input
                  type="checkbox"
                  checked={videoSettings.showSubtitles}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, showSubtitles: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-amber-500 accent-amber-500 w-4 h-4"
                />
              </label>

              {videoSettings.showSubtitles && (
                <div className="flex items-center justify-between text-xs px-2 text-zinc-400">
                  <span>Subtitle Size:</span>
                  <div className="flex gap-1.5">
                    {(['small', 'medium', 'large'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setVideoSettings(prev => ({ ...prev, subtitleSize: sz }))}
                        className={`px-2 py-0.5 rounded capitalize transition-all cursor-pointer ${
                          videoSettings.subtitleSize === sz
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Audio & BGM */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-amber-400" />
                <span>Audio & Background Music</span>
              </h4>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                <span className="text-xs text-zinc-200 font-medium">Dark Fantasy Ambient BGM</span>
                <input
                  type="checkbox"
                  checked={voiceSettings.includeBgm}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, includeBgm: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-amber-500 accent-amber-500 w-4 h-4"
                />
              </label>

              {voiceSettings.includeBgm && (
                <div className="space-y-1 px-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>BGM Volume:</span>
                    <span className="text-white font-mono">{Math.round(voiceSettings.bgmVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={voiceSettings.bgmVolume}
                    onChange={(e) => setVoiceSettings(prev => ({ ...prev, bgmVolume: parseFloat(e.target.value) }))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Video Render Action & Output Player (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 sm:p-6 shadow-xl space-y-5">
            <h3 className="font-cinzel text-base font-bold text-white flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <span>Render Engine & Output</span>
              </span>
              {renderedVideoUrl && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Video Ready</span>
                </span>
              )}
            </h3>

            {/* Error banner if any */}
            {renderError && (
              <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-200">Render Error:</p>
                  <p>{renderError}</p>
                </div>
              </div>
            )}

            {/* Video Player or Placeholder */}
            <div className={`relative rounded-xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center ${
              videoSettings.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[500px] mx-auto'
            }`}>
              {renderedVideoUrl ? (
                <video
                  src={renderedVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : isRendering ? (
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
                    <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-cinzel text-lg font-bold text-white">
                      Rendering Manga Video...
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      {renderProgress?.statusText || 'Synthesizing frames & dark fantasy atmosphere...'}
                    </p>
                  </div>
                  {renderProgress && (
                    <div className="w-64 max-w-full space-y-1.5">
                      <div className="flex justify-between text-xs text-zinc-400 font-mono">
                        <span className="text-amber-400 font-bold">{renderProgress.percent}%</span>
                        <span>{Math.round(renderProgress.elapsedSeconds)}s / ~{renderProgress.totalSeconds}s</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="bg-amber-500 h-full transition-all duration-300"
                          style={{ width: `${renderProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleCancelRender}
                    className="text-xs text-rose-400 hover:text-rose-300 underline transition-colors pt-2 cursor-pointer"
                  >
                    Cancel Render
                  </button>
                </div>
              ) : (
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-3 text-zinc-500">
                  <Film className="w-12 h-12 text-zinc-700" />
                  <div>
                    <h4 className="font-cinzel text-base font-bold text-zinc-300">
                      No Video Exported Yet
                    </h4>
                    <p className="text-xs text-zinc-500 max-w-sm mt-1">
                      Click the button below to synthesize your manga scenes, art, Ken Burns motion, and soundtrack into a playable video.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Row */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {!renderedVideoUrl ? (
                <button
                  type="button"
                  onClick={handleStartRender}
                  disabled={isRendering || scenes.length === 0}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-cinzel text-sm sm:text-base font-bold tracking-wider bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-50 transition-all cursor-pointer shadow-lg border border-amber-400"
                >
                  <Sparkles className="w-4 h-4 fill-zinc-950" />
                  <span>Start Video Render & Export</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 text-white font-cinzel text-sm font-bold tracking-wider hover:bg-emerald-500 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer border border-emerald-500"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Video (.webm)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartRender}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Re-render</span>
                  </button>
                </div>
              )}
            </div>

            {/* File info footer if rendered */}
            {renderedBlob && (
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                <span>Output File: <strong className="text-white">{Math.round(renderedBlob.size / 1024 / 1024 * 10) / 10} MB</strong></span>
                <span>Type: WebM (VP9/Opus)</span>
                <span>FPS: {videoSettings.fps || 30}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
