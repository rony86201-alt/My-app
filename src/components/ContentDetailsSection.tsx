import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Volume2,
  CheckCircle2,
  Layers,
  Sparkles,
  Settings,
  Film,
  Music,
  Tv,
  Smartphone,
  Sliders,
  Flame,
  Info,
  Radio,
  Clock,
  Check,
  AlertCircle,
  HelpCircle,
  FileCheck,
  RefreshCw,
  ExternalLink,
  Home,
  Maximize2,
  X
} from 'lucide-react';
import {
  SearchResult,
  ContentDetails,
  VolumeInfo,
  ChapterInfo,
  NarrationLanguage,
  VoicePresetId,
  AspectRatio,
  VideoSettings,
  VoiceSettings
} from '../types';
import { VOICE_PRESETS, previewVoicePreset } from '../utils/voicePresets';

interface ContentDetailsSectionProps {
  content: SearchResult;
  onBack: () => void;
  onGoHome?: () => void;
  onGenerateFullVideo: (options: {
    contentId: string;
    chapterNumbers: number[];
    language: NarrationLanguage;
    voicePresetId: VoicePresetId;
    videoSettings: VideoSettings;
  }) => void;
}

export const ContentDetailsSection: React.FC<ContentDetailsSectionProps> = ({
  content,
  onBack,
  onGoHome,
  onGenerateFullVideo
}) => {
  const [details, setDetails] = useState<ContentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedVolumeNum, setSelectedVolumeNum] = useState<number>(8); // Default to Volume 8 for Shadow Slave
  const [selectedChapterNumbers, setSelectedChapterNumbers] = useState<number[]>([1591]);
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple' | 'range' | 'volume'>('single');
  const [rangeStart, setRangeStart] = useState<number>(1591);
  const [rangeEnd, setRangeEnd] = useState<number>(1592);

  // Video Settings
  const [language, setLanguage] = useState<NarrationLanguage>('en');
  const [voicePresetId, setVoicePresetId] = useState<VoicePresetId>('male-cinematic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [kenBurns, setKenBurns] = useState(true);
  const [particles, setParticles] = useState(true);
  const [speedLines, setSpeedLines] = useState(true);
  const [vignette, setVignette] = useState(true);
  const [subtitles, setSubtitles] = useState(true);
  const [includeBgm, setIncludeBgm] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(0.25);
  const [explanationDepth, setExplanationDepth] = useState<'concise' | 'standard' | 'detailed'>('detailed');
  const [continuousPacing, setContinuousPacing] = useState(true);

  // Previewing voice state
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);

  // Fetch full content details (volumes and chapters)
  useEffect(() => {
    async function loadDetails() {
      setLoading(true);
      try {
        const res = await fetch(`/api/content/${content.id}/details`);
        const data = await res.json();
        if (data.success && data.details) {
          setDetails(data.details);
          // Set initial volume
          if (data.details.volumes && data.details.volumes.length > 0) {
            const hasVol8 = data.details.volumes.some((v: VolumeInfo) => v.volumeNumber === 8);
            const defaultVol = hasVol8 ? 8 : data.details.volumes[0].volumeNumber;
            setSelectedVolumeNum(defaultVol);

            const activeVol = data.details.volumes.find((v: VolumeInfo) => v.volumeNumber === defaultVol);
            if (activeVol && activeVol.chapters.length > 0) {
              const defaultCh = activeVol.chapters[0].chapterNumber;
              setSelectedChapterNumbers([defaultCh]);
              setRangeStart(defaultCh);
              setRangeEnd(defaultCh);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load details:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [content.id]);

  const handleRefreshIndex = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/content/${content.id}/refresh-index`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success && data.details) {
        setDetails(data.details);
      }
    } catch (e) {
      console.error('Failed to refresh index:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeVolume = details?.volumes?.find((v) => v.volumeNumber === selectedVolumeNum);

  // Toggle chapter selection based on mode
  const handleChapterClick = (chNum: number) => {
    if (selectionMode === 'single') {
      setSelectedChapterNumbers([chNum]);
      setRangeStart(chNum);
      setRangeEnd(chNum);
    } else if (selectionMode === 'multiple') {
      if (selectedChapterNumbers.includes(chNum)) {
        if (selectedChapterNumbers.length > 1) {
          setSelectedChapterNumbers(selectedChapterNumbers.filter((n) => n !== chNum));
        }
      } else {
        setSelectedChapterNumbers([...selectedChapterNumbers, chNum].sort((a, b) => a - b));
      }
    } else if (selectionMode === 'range') {
      if (chNum < rangeStart) {
        setRangeStart(chNum);
        computeRange(chNum, rangeEnd);
      } else {
        setRangeEnd(chNum);
        computeRange(rangeStart, chNum);
      }
    }
  };

  const computeRange = (start: number, end: number) => {
    if (!activeVolume) return;
    const s = Math.min(start, end);
    const e = Math.max(start, end);
    const inRange = activeVolume.chapters
      .filter((ch) => ch.chapterNumber >= s && ch.chapterNumber <= e)
      .map((ch) => ch.chapterNumber);
    setSelectedChapterNumbers(inRange);
  };

  const handleSelectEntireVolume = () => {
    if (!activeVolume) return;
    const all = activeVolume.chapters.map((ch) => ch.chapterNumber);
    setSelectedChapterNumbers(all);
    setSelectionMode('volume');
  };

  // Preview Voice Sample
  const handleTestVoice = (presetId: VoicePresetId) => {
    const preset = VOICE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setPreviewingVoiceId(presetId);
    previewVoicePreset(
      preset,
      language,
      () => setPreviewingVoiceId(null),
      () => setPreviewingVoiceId(null)
    );
  };

  // Submit & Generate Full Video with duplicate prevention lock
  const handleStartGeneration = () => {
    if (selectedChapterNumbers.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 2000); // Debounce guard

    const vSettings: VideoSettings = {
      aspectRatio,
      resolution,
      fps: 30,
      showSubtitles: subtitles,
      subtitleSize: 'medium',
      kenBurnsEffect: kenBurns,
      mangaSpeedLines: speedLines,
      darkFantasyParticles: particles,
      vignetteEffect: vignette,
      transitionDuration: 0.6,
      explanationDepth,
      continuousPacing
    };

    onGenerateFullVideo({
      contentId: content.id,
      chapterNumbers: selectedChapterNumbers,
      language,
      voicePresetId,
      videoSettings: vSettings
    });
  };

  // Exact 5-Tier Availability Status Badge Helper
  const renderChapterStatusBadge = (chapter: ChapterInfo) => {
    const status = chapter.contentStatus;

    if (status === 'Full content available' || chapter.isFullTextAvailable) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60" title="Full content verified and accessible from legitimate free source">
          <FileCheck className="w-3 h-3 text-emerald-400" />
          <span>Full content available</span>
        </span>
      );
    } else if (status === 'Partial content available') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-950/80 text-teal-300 border border-teal-700/60" title="Partial authentic content accessible with canonical bridging">
          <CheckCircle2 className="w-3 h-3 text-teal-400" />
          <span>Partial content available</span>
        </span>
      );
    } else if (status === 'Free preview only') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-700/60" title="Authorized free preview chapter / introductory scenes">
          <Sparkles className="w-3 h-3 text-sky-400" />
          <span>Free preview only</span>
        </span>
      );
    } else if (status === 'Metadata only' || chapter.isSummaryFallback || chapter.isFaithfulSummary) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60" title="Verified canonical events retold faithfully without fabrication">
          <AlertCircle className="w-3 h-3 text-amber-400" />
          <span>Metadata only (Faithful Summary)</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 text-zinc-400 border border-zinc-700" title="Chapter unindexed or restricted">
          <HelpCircle className="w-3 h-3 text-zinc-400" />
          <span>Content unavailable</span>
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-zinc-400 text-sm font-medium">
          Loading volumes and chapters for {content.title}...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Navigation Top Bar with Global Home and Back */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm group"
              title="Return to Universal Search home"
            >
              <Home className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Global Home</span>
            </button>
          )}
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Universal Search</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">Selected Title:</span>
          <span className="text-xs font-bold text-white bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800 font-cinzel">
            {content.title}
          </span>
        </div>
      </div>

      {/* Series Hero Banner - Pure Black */}
      <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
          <div className="relative group w-full md:w-56 h-80 rounded-xl overflow-hidden border border-zinc-700 shrink-0 bg-black shadow-2xl">
            <img
              src={content.coverImage}
              alt={content.title}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.src.includes('/api/cover-proxy') && content.coverImage?.startsWith('http')) {
                  img.src = `/api/cover-proxy?url=${encodeURIComponent(content.coverImage)}`;
                } else {
                  img.src = '/assets/scenes/scene_hero_portrait.jpg';
                }
              }}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <button
              onClick={() => setIsCoverModalOpen(true)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-opacity text-white text-xs font-semibold backdrop-blur-xs cursor-pointer"
              title="Inspect Verified High-Res Cover Art"
            >
              <Maximize2 className="w-5 h-5 text-amber-400" />
              <span>Inspect Full Cover</span>
            </button>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-zinc-900 text-amber-400 border border-zinc-700 uppercase">
                {content.contentType}
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1.5">
                <span>Source: {content.source}</span>
                {(content.sourceUrl || details?.sourceUrl) && (
                  <a
                    href={content.sourceUrl || details?.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-400 hover:text-amber-400"
                    title="View official catalog listing"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </span>
              {content.status && (
                <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-900 text-emerald-400 border border-zinc-800 uppercase">
                  {content.status}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight font-cinzel">
              {content.title}
            </h1>

            <p className="text-xs md:text-sm text-zinc-300 font-medium">
              Author: <span className="text-white font-semibold">{content.author}</span>
            </p>

            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed max-w-3xl">
              {details?.fullSynopsis || content.description}
            </p>

            {content.genres && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {content.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2.5 py-1 rounded text-xs bg-zinc-900 text-zinc-300 border border-zinc-800"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Quick Status Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-400 border-t border-zinc-800/80">
              <div>
                Total Volumes: <span className="font-semibold text-white">{details?.volumes.length || 1}</span>
              </div>
              <div>•</div>
              <div>
                Selected Chapters: <span className="font-semibold text-amber-400">{selectedChapterNumbers.length} Chapters</span>
              </div>
              <div>•</div>
              <div className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Original & Verified Story Accessible</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Chapter Selection (Left 65%) + Video Generation Settings (Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Volumes & Chapters Selection */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 md:p-6 shadow-xl space-y-5">
            {/* Header with Mode Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base font-cinzel">Select Content & Chapters</h3>
              </div>

              {/* Selection Modes */}
              <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800 text-xs">
                <button
                  onClick={() => setSelectionMode('single')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    selectionMode === 'single' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Single Chapter
                </button>
                <button
                  onClick={() => setSelectionMode('multiple')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    selectionMode === 'multiple' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Multiple
                </button>
                <button
                  onClick={() => setSelectionMode('range')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    selectionMode === 'range' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Range
                </button>
              </div>
            </div>

            {/* Volume Selector Tabs with Refresh Index Action */}
            {details?.volumes && details.volumes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-300">Choose Volume / Arc:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRefreshIndex}
                      disabled={isRefreshing}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-medium transition-all cursor-pointer"
                      title="Reload real-time verified catalog chapter index"
                    >
                      <RefreshCw className={`w-3 h-3 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>{isRefreshing ? 'Refreshing Index...' : 'Refresh Content Index'}</span>
                    </button>
                    <span>{details.volumes.length} Volumes Available</span>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {details.volumes.map((vol) => {
                    const isSelected = vol.volumeNumber === selectedVolumeNum;
                    return (
                      <button
                        key={vol.volumeNumber}
                        onClick={() => {
                          setSelectedVolumeNum(vol.volumeNumber);
                          if (vol.chapters.length > 0) {
                            setSelectedChapterNumbers([vol.chapters[0].chapterNumber]);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-800 border-amber-500/80 text-white shadow-md'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Volume {vol.volumeNumber}</div>
                        <div className="text-xs font-bold truncate max-w-[150px]">{vol.title}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Volume Description & Quick Action */}
            {activeVolume && (
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-white">Volume {activeVolume.volumeNumber}: {activeVolume.title}</span>
                  <p className="text-zinc-400 text-[11px] mt-0.5">{activeVolume.description}</p>
                </div>
                <button
                  onClick={handleSelectEntireVolume}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-semibold transition-all shrink-0 cursor-pointer"
                >
                  Select Entire Volume ({activeVolume.chapters.length} Chs)
                </button>
              </div>
            )}

            {/* Range Selector Inputs (if range mode is selected) */}
            {selectionMode === 'range' && (
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                <div className="text-xs font-bold text-white">Specify Chapter Range:</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-400 block mb-1">Start Chapter #</label>
                    <input
                      type="number"
                      value={rangeStart}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setRangeStart(val);
                        computeRange(val, rangeEnd);
                      }}
                      className="w-full bg-black text-white px-3 py-1.5 rounded-lg border border-zinc-700 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="text-zinc-500 font-bold pt-4">to</div>
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-400 block mb-1">End Chapter #</label>
                    <input
                      type="number"
                      value={rangeEnd}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setRangeEnd(val);
                        computeRange(rangeStart, val);
                      }}
                      className="w-full bg-black text-white px-3 py-1.5 rounded-lg border border-zinc-700 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => computeRange(rangeStart, rangeEnd)}
                    className="mt-4 px-3 py-1.5 rounded bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 cursor-pointer"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}

            {/* Chapters List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">
                  Chapters in Volume {selectedVolumeNum} ({activeVolume?.chapters.length || 0}):
                </span>
                <span className="text-[11px] text-amber-400 font-medium">
                  {selectedChapterNumbers.length} Selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {activeVolume?.chapters.map((ch) => {
                  const isSelected = selectedChapterNumbers.includes(ch.chapterNumber);
                  return (
                    <div
                      key={ch.chapterNumber}
                      onClick={() => handleChapterClick(ch.chapterNumber)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-zinc-800/90 border-amber-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                              isSelected ? 'bg-amber-500 border-amber-400 text-zinc-950 font-bold' : 'border-zinc-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="font-bold text-xs text-white">
                            Chapter {ch.chapterNumber}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-zinc-300 font-medium line-clamp-1">
                        {ch.title}
                      </div>

                      {ch.summary && (
                        <p className="text-[10px] text-zinc-400 line-clamp-2">
                          {ch.summary}
                        </p>
                      )}

                      {/* Status label: Original Content Available / Summary Available / Fallback */}
                      <div className="pt-1 border-t border-zinc-800/60 flex items-center justify-between">
                        {renderChapterStatusBadge(ch)}
                        {ch.wordCount && (
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ~{ch.wordCount} words
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Video Engine Settings & Voice & Generate Button */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 md:p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Settings className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base font-cinzel">Video Generation Engine</h3>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex justify-between items-center">
                <span>Narration Language</span>
                <span className="text-amber-400 font-medium lowercase">Hindi & English supported</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  English (US/UK)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('hi')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    language === 'hi'
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Hindi (हिन्दी)
                </button>
              </div>
            </div>

            {/* AI Voice Selection (6 Presets) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-zinc-300">AI Voice Presets (6 Available)</label>
                <span className="text-[11px] text-zinc-500">Preview with speech audio</span>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {VOICE_PRESETS.map((preset) => {
                  const isSelected = preset.id === voicePresetId;
                  const isPreviewing = previewingVoiceId === preset.id;

                  return (
                    <div
                      key={preset.id}
                      onClick={() => setVoicePresetId(preset.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-zinc-800/90 border-amber-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'bg-amber-500 border-amber-400' : 'border-zinc-700'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{preset.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 uppercase font-mono">
                              {preset.gender}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400">{preset.description}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestVoice(preset.id);
                        }}
                        title="Hear voice sample"
                        className={`p-1.5 rounded-lg border text-xs transition-all ${
                          isPreviewing
                            ? 'bg-amber-500 text-zinc-950 animate-pulse border-amber-400'
                            : 'bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Storytelling & Explanation Depth (Reference Video Pacing) */}
            <div className="space-y-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <span>Storytelling & Explanation Depth</span>
                </label>
                <span className="text-[10px] text-amber-400/90 font-mono">Reference Video Benchmark</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setExplanationDepth('concise')}
                  className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                    explanationDepth === 'concise'
                      ? 'bg-amber-500 text-zinc-950 font-bold border-amber-400'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <div className="text-[11px] leading-tight">Concise</div>
                  <div className="text-[9px] opacity-80">4–6 scenes</div>
                </button>
                <button
                  type="button"
                  onClick={() => setExplanationDepth('standard')}
                  className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                    explanationDepth === 'standard'
                      ? 'bg-amber-500 text-zinc-950 font-bold border-amber-400'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <div className="text-[11px] leading-tight">Standard</div>
                  <div className="text-[9px] opacity-80">8–12 scenes</div>
                </button>
                <button
                  type="button"
                  onClick={() => setExplanationDepth('detailed')}
                  className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                    explanationDepth === 'detailed'
                      ? 'bg-amber-500 text-zinc-950 font-bold border-amber-400 ring-1 ring-amber-400'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <div className="text-[11px] leading-tight">Detailed Explainer</div>
                  <div className="text-[9px] opacity-80">12–18 scenes (Ref)</div>
                </button>
              </div>

              {/* Continuous Pacing (Zero Unwanted Pauses) Toggle */}
              <label className="flex items-center justify-between pt-2 border-t border-zinc-800/80 cursor-pointer">
                <div>
                  <div className="text-[11px] font-semibold text-zinc-200">Continuous Pacing (Zero Pauses)</div>
                  <div className="text-[10px] text-zinc-400">Exact visual sync with narration audio, no 3–5s dead freeze</div>
                </div>
                <input
                  type="checkbox"
                  checked={continuousPacing}
                  onChange={(e) => setContinuousPacing(e.target.checked)}
                  className="rounded text-amber-500 accent-amber-500 h-4 w-4"
                />
              </label>
            </div>

            {/* Video Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Aspect Ratio & Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    aspectRatio === '16:9'
                      ? 'bg-zinc-800 border-amber-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>16:9 YouTube Landscape</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    aspectRatio === '9:16'
                      ? 'bg-zinc-800 border-amber-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>9:16 Shorts / Reels</span>
                </button>
              </div>
            </div>

            {/* Video Resolution */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Resolution</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResolution('1080p')}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    resolution === '1080p'
                      ? 'bg-zinc-800 border-amber-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  1080p Full HD
                </button>
                <button
                  type="button"
                  onClick={() => setResolution('720p')}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    resolution === '720p'
                      ? 'bg-zinc-800 border-amber-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  720p Fast Render
                </button>
              </div>
            </div>

            {/* Cinematic Effects Toggles */}
            <div className="space-y-2 pt-1 border-t border-zinc-800/80">
              <div className="text-xs font-semibold text-zinc-300">Cinematic Anime Post-Processing</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kenBurns}
                    onChange={(e) => setKenBurns(e.target.checked)}
                    className="rounded text-amber-500 accent-amber-500 focus:ring-0"
                  />
                  <span className="text-zinc-300 text-[11px]">Ken Burns Pan/Zoom</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={particles}
                    onChange={(e) => setParticles(e.target.checked)}
                    className="rounded text-amber-500 accent-amber-500 focus:ring-0"
                  />
                  <span className="text-zinc-300 text-[11px]">Dark Fantasy Ember FX</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={speedLines}
                    onChange={(e) => setSpeedLines(e.target.checked)}
                    className="rounded text-amber-500 accent-amber-500 focus:ring-0"
                  />
                  <span className="text-zinc-300 text-[11px]">Manga Speed Lines</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subtitles}
                    onChange={(e) => setSubtitles(e.target.checked)}
                    className="rounded text-amber-500 accent-amber-500 focus:ring-0"
                  />
                  <span className="text-zinc-300 text-[11px]">Dynamic Subtitles</span>
                </label>
              </div>
            </div>

            {/* Background Music Toggle */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-white">Atmospheric Background Music</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeBgm}
                  onChange={(e) => setIncludeBgm(e.target.checked)}
                  className="rounded text-amber-500 accent-amber-500"
                />
              </label>
            </div>

            {/* GENERATE FULL VIDEO BUTTON - Prominent High-Contrast Amber Highlight */}
            <div className="pt-2">
              <button
                onClick={handleStartGeneration}
                disabled={selectedChapterNumbers.length === 0}
                className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-base tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 border border-amber-300"
              >
                <Flame className="w-5 h-5 fill-zinc-950" />
                <span>GENERATE FULL VIDEO</span>
              </button>
              <p className="text-[11px] text-zinc-400 text-center mt-2 font-medium">
                Auto-retrieves chapters, generates separate unique anime scenes, synthesizes voice & exports MP4.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Cover Art Inspection Modal */}
      {isCoverModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsCoverModalOpen(false)}
        >
          <div
            className="relative max-w-lg w-full bg-zinc-950 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="space-y-0.5">
                <h4 className="text-base font-bold text-white font-cinzel">{content.title}</h4>
                <p className="text-xs text-amber-400 font-medium">
                  {content.verifiedCoverSource || 'Verified Official Cover Art'}
                </p>
              </div>
              <button
                onClick={() => setIsCoverModalOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center bg-black/90 p-3 rounded-xl border border-zinc-800">
              <img
                src={content.coverImage}
                alt={content.title}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.src.includes('/api/cover-proxy') && content.coverImage?.startsWith('http')) {
                    img.src = `/api/cover-proxy?url=${encodeURIComponent(content.coverImage)}`;
                  }
                }}
                className="max-h-[60vh] w-auto object-contain rounded-lg shadow-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Source Provider</span>
                <p className="text-zinc-200 font-medium truncate">{content.source}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Format & Type</span>
                <p className="text-zinc-200 font-medium capitalize">{content.contentType}</p>
              </div>
            </div>

            {content.sourceUrl && (
              <a
                href={content.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 text-xs font-semibold border border-zinc-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Official Catalog Page</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
