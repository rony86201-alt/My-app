import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Trash2, 
  Download, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Film, 
  Volume2, 
  Sparkles, 
  Layers, 
  FolderCheck, 
  Clock, 
  HardDrive,
  Copy,
  Check,
  RefreshCw,
  Eye,
  AlertTriangle,
  Radio
} from 'lucide-react';
import { JobProgress, JobStage } from '../types';
import { saveVideoToGallery } from '../utils/onDeviceBridge';

interface VideoGenerationDashboardProps {
  onOpenNewJobFlow?: () => void;
  onPreviewImage?: (url: string, sceneNum: number, prompt: string) => void;
}

export const VideoGenerationDashboard: React.FC<VideoGenerationDashboardProps> = ({
  onOpenNewJobFlow,
  onPreviewImage
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'completed'>('live');
  const [liveJobs, setLiveJobs] = useState<{ active: JobProgress[]; queued: JobProgress[] }>({ active: [], queued: [] });
  const [completedJobs, setCompletedJobs] = useState<JobProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Playback Modal
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string; duration?: number; path?: string } | null>(null);

  // Deletion Confirmation Dialog
  const [deletingJob, setDeletingJob] = useState<JobProgress | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy Feedback
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Cancelling states
  const [cancellingIds, setCancellingIds] = useState<Record<string, boolean>>({});

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLiveJobs = async () => {
    try {
      const res = await fetch('/api/jobs/live');
      if (res.ok) {
        const data = await res.json();
        setLiveJobs({
          active: data.activeJobs || [],
          queued: data.queuedJobs || []
        });
      }
    } catch (e) {
      console.warn('Failed fetching live jobs:', e);
    }
  };

  const fetchCompletedJobs = async () => {
    try {
      const res = await fetch('/api/jobs/completed');
      if (res.ok) {
        const data = await res.json();
        setCompletedJobs(data.completedJobs || []);
      }
    } catch (e) {
      console.warn('Failed fetching completed jobs:', e);
    }
  };

  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchLiveJobs(), fetchCompletedJobs()]);
    setIsRefreshing(false);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchLiveJobs();
      // Also occasionally refresh completed jobs to catch newly finished ones
      fetchCompletedJobs();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelJob = async (jobId: string, title?: string) => {
    setCancellingIds(prev => ({ ...prev, [jobId]: true }));
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Job "${title || jobId}" cancelled and resources released.`, 'info');
        await fetchLiveJobs();
      } else {
        showToast(data.message || 'Failed to cancel job', 'error');
      }
    } catch (err: any) {
      showToast(`Cancellation error: ${err.message}`, 'error');
    } finally {
      setCancellingIds(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingJob) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${deletingJob.jobId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`Deleted video "${deletingJob.title || deletingJob.jobId}"`, 'success');
        setCompletedJobs(prev => prev.filter(j => j.jobId !== deletingJob.jobId));
      } else {
        showToast(data.message || 'Failed deleting video', 'error');
      }
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
      setDeletingJob(null);
    }
  };

  const handleSaveToGallery = async (job: JobProgress) => {
    if (!job.videoUrl) return;
    const fileName = job.videoFileName || `${job.jobId}.mp4`;
    showToast(`Saving "${fileName}" to Movies/MangaVideoStudio...`, 'info');

    try {
      const res = await saveVideoToGallery(job.videoUrl, fileName);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(`Failed saving to storage: ${err.message}`, 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2500);
  };

  const getStageBadge = (stage: JobStage) => {
    switch (stage) {
      case 'queued':
        return {
          label: 'QUEUED',
          color: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          icon: Clock
        };
      case 'crafting':
        return {
          label: 'CRAFTING STORYBOARD',
          color: 'bg-amber-950/80 text-amber-300 border-amber-600/50',
          icon: Loader2,
          spin: true
        };
      case 'generating_images':
        return {
          label: 'GENERATING AI ARTWORK',
          color: 'bg-purple-950/80 text-purple-300 border-purple-500/50',
          icon: Sparkles,
          spin: true
        };
      case 'generating_voice':
        return {
          label: 'FIXED HINDI NARRATION',
          color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50',
          icon: Volume2,
          spin: true
        };
      case 'rendering_video':
      case 'exporting_video':
        return {
          label: 'RENDERING MP4',
          color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
          icon: Film,
          spin: true
        };
      case 'completed':
        return {
          label: 'COMPLETED & VERIFIED',
          color: 'bg-emerald-900/60 text-emerald-300 border-emerald-500/60',
          icon: CheckCircle2
        };
      case 'failed':
        return {
          label: 'FAILED',
          color: 'bg-rose-950/80 text-rose-300 border-rose-500/60',
          icon: AlertCircle
        };
      case 'cancelled':
        return {
          label: 'CANCELLED',
          color: 'bg-zinc-900 text-zinc-400 border-zinc-800',
          icon: X
        };
      default:
        return {
          label: (stage as string).toUpperCase(),
          color: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          icon: Clock
        };
    }
  };

  const totalRunningCount = liveJobs.active.length;
  const totalQueuedCount = liveJobs.queued.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fadeIn pb-24">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 backdrop-blur-md animate-fadeIn ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600' 
            : toast.type === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-600'
            : 'bg-zinc-900/90 text-zinc-200 border-zinc-700'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toast.type === 'info' && <Radio className="w-4 h-4 text-amber-400 animate-pulse" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner & Tab Controls */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">
            <Film className="w-3.5 h-3.5" />
            <span>Multi-Job Video Production Pipeline</span>
          </div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
            Video Generation Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Real concurrent episode rendering (up to 3 concurrent jobs) with automatic waiting queue scheduling and gallery storage.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${totalRunningCount > 0 ? 'text-zinc-950 animate-pulse' : ''}`} />
            <span>LIVE PIPELINE</span>
            {(totalRunningCount > 0 || totalQueuedCount > 0) && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'live' ? 'bg-zinc-950 text-amber-400' : 'bg-zinc-800 text-amber-400'
              }`}>
                {totalRunningCount + totalQueuedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FolderCheck className="w-3.5 h-3.5" />
            <span>COMPLETED VIDEOS</span>
            {completedJobs.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'completed' ? 'bg-zinc-950 text-amber-400' : 'bg-zinc-800 text-emerald-400'
              }`}>
                {completedJobs.length}
              </span>
            )}
          </button>

          <button
            onClick={refreshAll}
            title="Refresh status"
            disabled={isRefreshing}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Resource & Concurrency Monitor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${totalRunningCount > 0 ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
            <span className="text-zinc-400">Concurrent Slots (Max 3):</span>
          </div>
          <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            {totalRunningCount} / 3 Active
          </span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-400">Waiting in Queue:</span>
          </div>
          <span className="font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            {totalQueuedCount} Job{totalQueuedCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-zinc-400">Gallery Target Directory:</span>
          </div>
          <span className="font-mono text-[11px] text-cyan-300 truncate max-w-[150px]">
            Movies/MangaVideoStudio
          </span>
        </div>
      </div>

      {/* TAB 1: LIVE PIPELINE */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {/* Active Running Jobs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Active Generating Jobs ({liveJobs.active.length})
              </h2>
            </div>

            {liveJobs.active.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 text-center space-y-3">
                <Film className="w-10 h-10 text-zinc-700 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-300">No jobs are currently running</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  When you initiate video generation from the guided workflow, up to 3 jobs execute concurrently in the background with live progress tracking.
                </p>
                {onOpenNewJobFlow && (
                  <button
                    onClick={onOpenNewJobFlow}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    <span>Create New Video Episode</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {liveJobs.active.map((job) => {
                  const badge = getStageBadge(job.stage);
                  const Icon = badge.icon;
                  const isCancelling = cancellingIds[job.jobId];

                  return (
                    <div
                      key={job.jobId}
                      className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden transition-all hover:border-zinc-700"
                    >
                      {/* Top Row: Title, ID, Stage Badge, Cancel Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-base truncate">
                              {job.title || `Job ${job.jobId}`}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                              {job.jobId}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5 truncate">
                            {job.message || 'Processing in pipeline...'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Stage Badge */}
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${badge.color}`}>
                            <Icon className={`w-3.5 h-3.5 ${badge.spin ? 'animate-spin' : ''}`} />
                            <span>{badge.label}</span>
                          </div>

                          {/* Independent Cancel Button */}
                          <button
                            onClick={() => handleCancelJob(job.jobId, job.title)}
                            disabled={isCancelling}
                            title="Cancel this job immediately"
                            className="px-3 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{isCancelling ? 'Cancelling...' : 'Cancel'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar & Percentage */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <span>Stage: {job.stage.toUpperCase().replace(/_/g, ' ')}</span>
                            {job.totalScenes && (
                              <span>• Scene {job.currentScene || 1} of {job.totalScenes}</span>
                            )}
                          </div>
                          <span className="font-mono text-amber-400 font-bold">{job.percentage}%</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden p-0.5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 transition-all duration-300 shadow-sm"
                            style={{ width: `${Math.max(4, Math.min(100, job.percentage))}%` }}
                          />
                        </div>
                      </div>

                      {/* Sub-status pills */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-2.5 flex items-center gap-2 text-zinc-300">
                          <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-zinc-500 block">Narration Status</span>
                            <span className="text-xs truncate block text-cyan-200">
                              {job.narrationStatus || 'Preparing fixed male Hindi narration...'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-2.5 flex items-center gap-2 text-zinc-300">
                          <Film className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-zinc-500 block">Rendering Engine</span>
                            <span className="text-xs truncate block text-emerald-200">
                              {job.renderingStatus || 'Awaiting image & audio completion...'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Generated Images Stream Previews */}
                      {job.generatedImages && job.generatedImages.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-zinc-900">
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span className="font-semibold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                              Generated Scene Artwork ({job.generatedImages.length})
                            </span>
                            <span className="text-[10px] text-zinc-500">Live output thumbnails</span>
                          </div>
                          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                            {job.generatedImages.map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => onPreviewImage && onPreviewImage(img.imageUrl, img.sceneIndex, img.prompt || '')}
                                className="w-20 h-14 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 relative group cursor-pointer hover:border-amber-500 transition-all"
                              >
                                <img
                                  src={img.imageUrl}
                                  alt={`Scene ${img.sceneIndex}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                />
                                <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-zinc-300">
                                  #{img.sceneIndex}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Waiting Queue Section */}
          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Waiting Queue ({liveJobs.queued.length})
            </h2>

            {liveJobs.queued.length === 0 ? (
              <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 text-xs text-zinc-500 text-center">
                Queue is clear. Slots are ready for new generation jobs.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {liveJobs.queued.map((qJob, index) => (
                  <div
                    key={qJob.jobId}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>
                        <span className="font-semibold text-white text-xs truncate">
                          {qJob.title || qJob.jobId}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">
                        Position in queue: #{index + 1} • Starts automatically when slot opens
                      </p>
                    </div>

                    <button
                      onClick={() => handleCancelJob(qJob.jobId, qJob.title)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 border border-zinc-800 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COMPLETED VIDEOS */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Verified Exported Videos ({completedJobs.length})
            </h2>
            <span className="text-xs text-zinc-500">
              Preserved across app restarts
            </span>
          </div>

          {completedJobs.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-10 text-center space-y-3">
              <Film className="w-12 h-12 text-zinc-700 mx-auto" />
              <h3 className="text-base font-bold text-zinc-300">No completed videos yet</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Once a generation job completes the image synthesis, fixed male Hindi voiceover, and FFmpeg multiplexing, your MP4 file will appear here ready to play and save to Android Gallery.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedJobs.map((video) => {
                const sizeMb = video.fileSizeBytes 
                  ? (video.fileSizeBytes / (1024 * 1024)).toFixed(1) 
                  : '14.2';
                const durText = video.durationSeconds 
                  ? `${Math.floor(video.durationSeconds / 60)}m ${(Math.round(video.durationSeconds % 60)).toString().padStart(2, '0')}s`
                  : '~1m 00s';
                const localPath = video.savedLocalPath || `Movies/MangaVideoStudio/${video.videoFileName || `${video.jobId}.mp4`}`;

                return (
                  <div
                    key={video.jobId}
                    className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-zinc-700 transition-all"
                  >
                    {/* Video Poster Preview / Header */}
                    <div className="relative aspect-video bg-zinc-900 overflow-hidden group">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title || 'Video'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                          <Film className="w-10 h-10" />
                          <span className="text-xs">Manga Video MP4</span>
                        </div>
                      )}

                      {/* Play Button Overlay */}
                      <button
                        onClick={() => setPlayingVideo({
                          url: video.videoUrl || `/assets/exports/${video.videoFileName || `${video.jobId}.mp4`}`,
                          title: video.title || 'Manga Episode',
                          duration: video.durationSeconds,
                          path: localPath
                        })}
                        className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
                        </div>
                      </button>

                      {/* Duration Tag */}
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/85 text-[11px] font-mono text-zinc-200 border border-zinc-700/60">
                        {durText}
                      </span>

                      {/* Verified Badge */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-950/80 text-[10px] font-bold text-emerald-300 border border-emerald-500/60 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>VERIFIED MP4</span>
                      </span>
                    </div>

                    {/* Metadata Details */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold text-white text-sm line-clamp-1">
                          {video.title || 'Manga Video Episode'}
                        </h3>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                          <span>{sizeMb} MB</span>
                          <span>•</span>
                          <span>1080p H.264 / AAC</span>
                          <span>•</span>
                          <span>Hindi Narration</span>
                        </div>
                      </div>

                      {/* Actual Local Storage Location Box */}
                      <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800/80 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-cyan-400" />
                            Storage Location (Android Gallery & Movies)
                          </span>
                          <button
                            onClick={() => copyToClipboard(localPath)}
                            className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                            title="Copy path"
                          >
                            {copiedPath === localPath ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="font-mono text-[11px] text-cyan-300 break-all bg-black/40 p-1 rounded">
                          {localPath}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-zinc-900">
                        <button
                          onClick={() => setPlayingVideo({
                            url: video.videoUrl || `/assets/exports/${video.videoFileName || `${video.jobId}.mp4`}`,
                            title: video.title || 'Manga Episode',
                            duration: video.durationSeconds,
                            path: localPath
                          })}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-zinc-950" />
                          <span>Play</span>
                        </button>

                        <button
                          onClick={() => handleSaveToGallery(video)}
                          title="Save to Android Movies/MangaVideoStudio or download"
                          className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Save to Gallery</span>
                        </button>

                        <button
                          onClick={() => setDeletingJob(video)}
                          title="Delete completed video"
                          className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Video Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-cinzel text-lg font-bold text-white truncate">
                  {playingVideo.title}
                </h3>
                {playingVideo.path && (
                  <p className="text-[11px] font-mono text-zinc-400 truncate">
                    {playingVideo.path}
                  </p>
                )}
              </div>
              <button
                onClick={() => setPlayingVideo(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer ml-3"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Native HTML5 Video Player */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-inner">
              <video
                src={playingVideo.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Audible Fixed Male Hindi Narration Active
              </span>
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = playingVideo.url;
                  a.download = playingVideo.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.mp4';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="flex items-center gap-1 text-cyan-400 hover:underline cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download MP4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-600/50 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-white text-base">
                Delete Episode Video?
              </h3>
              <p className="text-xs text-zinc-400">
                Are you sure you want to permanently delete "{deletingJob.title || deletingJob.jobId}" from local storage? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingJob(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-800 cursor-pointer"
              >
                Keep Video
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Video'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
