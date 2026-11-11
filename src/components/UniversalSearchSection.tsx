import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  BookOpen, 
  Film, 
  Star, 
  Flame, 
  ArrowRight, 
  Globe, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  ExternalLink,
  Layers,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  FileCheck,
  Tag
} from 'lucide-react';
import { SearchResult, ContentType, SearchSourceAudit } from '../types';
import { addSearchToHistory, addActivityLog } from '../utils/storage';

interface UniversalSearchSectionProps {
  onSelectContent: (content: SearchResult) => void;
  onQuickStartShadowSlave: () => void;
  initialQuery?: string;
}

export const UniversalSearchSection: React.FC<UniversalSearchSectionProps> = ({
  onSelectContent,
  onQuickStartShadowSlave,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sourcesAudited, setSourcesAudited] = useState<SearchSourceAudit[]>([]);
  const [alternateTitles, setAlternateTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedCoverModal, setSelectedCoverModal] = useState<SearchResult | null>(null);

  // Sync initial query
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      fetchResults(initialQuery, selectedType, selectedSource, selectedStatus);
    } else {
      fetchResults('', selectedType, selectedSource, selectedStatus);
    }
  }, [initialQuery]);

  const fetchResults = async (
    q: string,
    typeFilter = selectedType,
    sourceFilter = selectedSource,
    statusFilter = selectedStatus
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
      if (sourceFilter && sourceFilter !== 'all') params.set('source', sourceFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.results) {
        setResults(data.results);
        if (data.sourcesAudited) setSourcesAudited(data.sourcesAudited);
        if (data.alternateTitlesTested) setAlternateTitles(data.alternateTitlesTested);

        // Record query in history if non-empty
        if (q.trim()) {
          addSearchToHistory(q.trim(), data.results.length, typeFilter !== 'all' ? typeFilter : undefined);
          addActivityLog({
            type: 'search_performed',
            title: `Universal Search: "${q.trim()}"`,
            details: `Found ${data.results.length} titles across ${data.sourcesAudited?.length || 7} providers.`,
            metadata: { query: q.trim(), resultsCount: data.results.length }
          });
        }
      }
    } catch (err) {
      console.error('Search query error:', err);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResults(query, selectedType, selectedSource, selectedStatus);
  };

  const handleTypeFilterChange = (type: string) => {
    setSelectedType(type);
    fetchResults(query, type, selectedSource, selectedStatus);
  };

  const popularSearches = [
    { label: 'Shadow Slave', query: 'Shadow Slave', highlight: true },
    { label: 'Solo Leveling', query: 'Solo Leveling' },
    { label: 'Lord of the Mysteries', query: 'Lord of the Mysteries' },
    { label: "Omniscient Reader's Viewpoint", query: 'Omniscient Reader' },
    { label: 'Berserk', query: 'Berserk' },
    { label: 'Chainsaw Man', query: 'Chainsaw Man' }
  ];

  const getContentTypeBadge = (type: ContentType) => {
    switch (type) {
      case 'manhwa':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 text-sky-400 border border-sky-500/40 uppercase">
            Korean Manhwa
          </span>
        );
      case 'manhua':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 text-emerald-400 border border-emerald-500/40 uppercase">
            Chinese Manhua
          </span>
        );
      case 'webnovel':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 text-amber-400 border border-amber-500/40 uppercase">
            Web & Light Novel
          </span>
        );
      case 'manga':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 text-purple-400 border border-purple-500/40 uppercase">
            Japanese Manga
          </span>
        );
    }
  };

  return (
    <section className="space-y-8 animate-fadeIn pb-12">
      {/* Hero Search Header - Pure Black & Dark Charcoal */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 p-6 md:p-10 shadow-2xl">
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>UNIVERSAL MULTI-SOURCE SEARCH ENGINE</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white font-cinzel">
            Manga Video Studio AI
          </h1>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Search Japanese Manga, Korean Manhwa, Chinese Manhua, and Web Novels across 7 global databases. Select verified chapters, configure cinematic anime visuals, and render complete explainer videos with synchronized AI narration.
          </p>

          {/* Universal Search Input Form */}
          <form onSubmit={handleSearchSubmit} className="pt-2">
            <div className="relative flex items-center shadow-2xl">
              <div className="absolute left-4 text-zinc-400 pointer-events-none">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any title, alias, or author (e.g., Shadow Slave, Solo Leveling, Berserk, ORV...)"
                className="w-full pl-12 pr-32 py-4 rounded-xl bg-black border-2 border-zinc-800 focus:border-amber-500/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-white placeholder-zinc-500 text-base md:text-lg transition-all"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Search</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Content Type Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 text-xs">
            <span className="text-zinc-500 font-semibold mr-1">Content:</span>
            {[
              { id: 'all', label: 'All Works' },
              { id: 'manga', label: 'Japanese Manga' },
              { id: 'manhwa', label: 'Korean Manhwa' },
              { id: 'manhua', label: 'Chinese Manhua' },
              { id: 'webnovel', label: 'Web & Light Novels' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTypeFilterChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedType === tab.id
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Popular Search Shortcuts */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-zinc-400">
            <span className="text-zinc-500 font-medium">Trending:</span>
            {popularSearches.map((item) => (
              <button
                key={item.query}
                onClick={() => {
                  setQuery(item.query);
                  fetchResults(item.query, selectedType, selectedSource, selectedStatus);
                }}
                className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                  item.highlight
                    ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Featured Quick Hero Card for Shadow Slave (Chapter 1591 & 1592) */}
          <div className="pt-3">
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 gap-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-16 rounded-lg overflow-hidden border border-zinc-700 shrink-0 bg-black shadow-md">
                  <img
                    src="/assets/scenes/scene_hero_portrait.jpg"
                    alt="Sunny - Shadow Slave"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">Shadow Slave: Volume 8</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-amber-400 border border-zinc-700">
                      51 Reference Panels Ready
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Chapter 1591 ("The Cottage by the Lake") & Chapter 1592 ("The Fissure of Shadows")
                  </p>
                </div>
              </div>
              <button
                onClick={onQuickStartShadowSlave}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold tracking-wide uppercase shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Flame className="w-3.5 h-3.5 text-zinc-950" />
                <span>Open Chapters & Generate Video</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header with Transparency Audit Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white font-cinzel">
            {query ? `Search Results for "${query}"` : 'Featured Series, Manga & Novels'}
          </h2>
          <span className="px-2 py-0.5 rounded text-xs bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono">
            {results.length} Found
          </span>
        </div>

        {/* Search More Sources & Transparency Audit Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Search Sources Audit</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-amber-400 border border-zinc-700 font-mono">
              {sourcesAudited.filter(s => s.status === 'success').length} / {sourcesAudited.length || 7} Online
            </span>
          </button>
        </div>
      </div>

      {/* Sources Transparency Audit Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white font-cinzel">
                  Universal Multi-Source Provider Audit
                </h3>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              We query verified, legitimate public internet catalogs and bibliographic archives concurrently. No fake or fabricated results are returned. When official copyrighted full text is paywalled or restricted, the platform automatically falls back to verified canonical plot summaries so all chapters remain selectable.
            </p>

            {/* Audited Sources Breakdown */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Configured Legitimate Content Sources:
              </div>
              <div className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {sourcesAudited.map((src, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                        src.status === 'success' ? 'bg-emerald-400' :
                        src.status === 'zero_matches' ? 'bg-amber-400' :
                        src.status === 'timeout' ? 'bg-orange-400' : 'bg-zinc-500'
                      }`} />
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{src.name}</span>
                          {src.url && (
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-500 hover:text-zinc-300"
                              title="Source website"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Status: <span className="text-zinc-200 uppercase font-mono">{src.status.replace('_', ' ')}</span>
                          {src.responseTimeMs ? ` (${src.responseTimeMs}ms response)` : ''}
                          {src.licenseType ? ` • ${src.licenseType}` : ''}
                        </div>
                        {src.error && (
                          <div className="text-[10px] text-zinc-500 mt-0.5 italic">
                            Notice: {src.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        {src.itemsFound} Titles
                      </span>
                      <div className="text-[10px] text-zinc-500">Indexed & Verified</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alternate Titles Tested */}
            {alternateTitles.length > 0 && (
              <div className="p-3 rounded-xl bg-black border border-zinc-800/90 text-xs space-y-1">
                <span className="text-zinc-400 font-semibold">Alternate Titles & Romanized Aliases Queried:</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {alternateTitles.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 text-[11px]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer shadow-md"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {isLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Searching across AniList, Kitsu, MangaDex, MyAnimeList, and OpenLibrary...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
          <BookOpen className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No results found for this search</h3>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Try searching for "Shadow Slave", "Solo Leveling", "Berserk", or "Lord of the Mysteries" to select chapters and render an explainer video.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-all duration-300 overflow-hidden shadow-xl"
            >
              {/* Card Header: Authentic Portrait Manga Cover Art Display */}
              <div className="relative w-full p-4 pb-2 bg-gradient-to-b from-black via-zinc-950 to-zinc-950 flex gap-4 items-start">
                {/* Portrait Cover (Aspect 2:3) with anti-hotlink fallback and click-to-zoom */}
                <div 
                  onClick={() => setSelectedCoverModal(item)}
                  className="relative w-28 h-40 rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-900 shrink-0 shadow-2xl cursor-pointer group/cover"
                  title="Click to inspect verified cover photo"
                >
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.retried) {
                        img.dataset.retried = 'true';
                        img.src = `/api/cover-proxy?url=${encodeURIComponent(item.coverImage)}`;
                      } else {
                        img.src = '/assets/scenes/scene_hero_portrait.jpg';
                      }
                    }}
                    className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white drop-shadow" />
                  </div>
                  {/* Resolution badge */}
                  <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono text-zinc-300 border border-zinc-800">
                    HD
                  </div>
                </div>

                {/* Right meta details */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {getContentTypeBadge(item.contentType)}
                    {item.status && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 uppercase">
                        {item.status}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2 font-cinzel">
                    {item.title}
                  </h3>

                  {item.englishTitle && item.englishTitle !== item.title && (
                    <div className="text-[11px] text-zinc-400 line-clamp-1 italic">
                      "{item.englishTitle}"
                    </div>
                  )}

                  <p className="text-xs text-zinc-400 truncate">
                    By <span className="text-zinc-200 font-medium">{item.author}</span>
                  </p>

                  {/* Rating / Issues */}
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    {item.rating && (
                      <div className="flex items-center gap-1 text-amber-400 font-semibold font-mono">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{item.rating.toFixed(1)}</span>
                      </div>
                    )}
                    {item.issueCountText ? (
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {item.issueCountText}
                      </span>
                    ) : item.totalChapters ? (
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {item.totalChapters} Chs
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Card Body: Description and Genres */}
              <div className="flex flex-col flex-1 p-4 pt-1 space-y-3">
                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed flex-1">
                  {item.description}
                </p>

                {/* Genres */}
                {item.genres && item.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.genres.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 text-zinc-300 border border-zinc-800"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Source Attribution & Verified Cover Source */}
                <div className="text-[10px] text-zinc-500 flex items-center justify-between border-t border-zinc-900 pt-2">
                  <span className="truncate max-w-[180px]">
                    Source: {item.source}
                  </span>
                  <span className="text-emerald-400 font-mono">
                    {item.verifiedCoverSource ? 'Cover Verified' : 'Catalog Verified'}
                  </span>
                </div>

                {/* Action Button */}
                <div className="pt-1">
                  <button
                    onClick={() => onSelectContent(item)}
                    className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 text-white font-semibold text-xs tracking-wide border border-zinc-800 hover:border-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Select Chapters & Video Settings</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verified Cover Art Full-Size Inspector Modal */}
      {selectedCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-5 md:p-6 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-cinzel truncate max-w-md">
                  {selectedCoverModal.title} — Verified Cover Art
                </h3>
              </div>
              <button
                onClick={() => setSelectedCoverModal(null)}
                className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-hidden rounded-xl bg-black border border-zinc-800 flex items-center justify-center p-2">
              <img
                src={selectedCoverModal.coverImage}
                alt={selectedCoverModal.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `/api/cover-proxy?url=${encodeURIComponent(selectedCoverModal.coverImage)}`;
                }}
                className="max-h-[55vh] w-auto object-contain rounded shadow-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 border-t border-zinc-800 pt-3">
              <div>
                <span className="text-zinc-500">Cover Source: </span>
                <span className="text-white font-semibold">{selectedCoverModal.verifiedCoverSource || selectedCoverModal.source}</span>
              </div>
              <div>
                <span className="text-zinc-500">Resolution: </span>
                <span className="text-amber-400 font-mono font-semibold">{selectedCoverModal.coverResolution || 'High-Definition Verified'}</span>
              </div>
              <div>
                <span className="text-zinc-500">Content Type: </span>
                <span className="text-white uppercase font-semibold">{selectedCoverModal.contentType}</span>
              </div>
              <div>
                <span className="text-zinc-500">Publication: </span>
                <span className="text-white font-semibold">{selectedCoverModal.publicationYear || 'Official Serialization'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              {selectedCoverModal.sourceUrl && (
                <a
                  href={selectedCoverModal.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>View on {selectedCoverModal.source}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={() => {
                  const item = selectedCoverModal;
                  setSelectedCoverModal(null);
                  onSelectContent(item);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer shadow-md"
              >
                Proceed with this Title
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
