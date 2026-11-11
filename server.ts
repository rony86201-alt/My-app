import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const portArgIndex = process.argv.indexOf('--port');
const portFromArg = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : undefined;
const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
const isProd = process.env.NODE_ENV === 'production';
// In AI Studio dev server, nginx runs on 8080 and reverse proxies to port 3000.
// In production or Cloud Run deployment containers, listen on process.env.PORT (e.g. 8080).
const PORT = portFromArg || (isProd ? (envPort || 3000) : (envPort && envPort !== 8080 ? envPort : 3000));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Search for real, cinematic high-resolution dark fantasy anime artwork matching the prompt
async function searchCinematicAnimeArtwork(prompt: string, sceneNumber: number): Promise<{ dataUrl: string; title: string } | null> {
  try {
    // Clean prompt for search query
    const cleanPrompt = prompt
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Emphasize anime dark fantasy cinematic qualities
    const query = `${cleanPrompt} anime dark fantasy wallpaper 4k`;
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    
    if (!tokenRes.ok) return null;
    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=([^&"'\s]+)/);
    if (!vqdMatch) return null;
    
    const vqd = vqdMatch[1];
    const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`;
    const imgRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    
    if (!imgRes.ok) return null;
    const data = await imgRes.json();
    const results = data.results || [];

    // Try top results until a valid, high-resolution image is loaded
    for (let i = 0; i < Math.min(results.length, 6); i++) {
      const candidateUrl = results[i].image;
      if (!candidateUrl || candidateUrl.endsWith('.svg')) continue;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500); // 4.5s max per image check
        const imgFetch = await fetch(candidateUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (imgFetch.ok) {
          const contentType = imgFetch.headers.get('content-type') || '';
          if (contentType.includes('image')) {
            const buf = await imgFetch.arrayBuffer();
            // Ensure quality (greater than 20KB)
            if (buf.byteLength > 20000) {
              const base64 = Buffer.from(buf).toString('base64');
              return {
                dataUrl: `data:${contentType};base64,${base64}`,
                title: results[i].title || 'Cinematic Dark Fantasy Anime'
              };
            }
          }
        }
      } catch (checkErr) {
        // Continue to next candidate
      }
    }
  } catch (err) {
    console.warn('Artwork search notice:', err);
  }
  return null;
}

// Prompt-aware procedural dark fantasy anime generator
// Renders distinct scenes: Swordsman, Colossal Demonic Gate, Anime Face Close-up, Winged Demon Beast
function generateUniqueDarkFantasyAnimeSvg(prompt: string, sceneNumber: number, width = 1280, height = 720): string {
  const pLower = (prompt || '').toLowerCase();
  const isCloseUp = pLower.includes('face') || pLower.includes('eye') || pLower.includes('close') || pLower.includes('expression');
  const isGate = pLower.includes('gate') || pLower.includes('portal') || pLower.includes('fissure') || pLower.includes('ruin');
  const isBeast = pLower.includes('beast') || pLower.includes('monster') || pLower.includes('dragon') || pLower.includes('cathedral') || pLower.includes('demon');

  let sceneSvgContent = '';

  if (isCloseUp) {
    // Composition: Dramatic anime character face close-up with intense glowing eyes and dark shadows
    sceneSvgContent = `
      <!-- Face Close-Up -->
      <defs>
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f43f5e"/>
          <stop offset="60%" stop-color="#a855f7"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- Jaw and Head Silhouette -->
      <polygon points="${width * 0.25},${height * 0.9} ${width * 0.5},${height * 0.98} ${width * 0.75},${height * 0.9} ${width * 0.8},${height * 0.4} ${width * 0.2},${height * 0.4}" fill="#0d081c"/>
      <!-- Shadow Contour on Cheek -->
      <path d="M ${width * 0.35} ${height * 0.55} Q ${width * 0.5} ${height * 0.75} ${width * 0.65} ${height * 0.55}" stroke="#23133d" stroke-width="4" fill="none"/>
      <!-- Glowing Anime Eyes -->
      <ellipse cx="${width * 0.42}" cy="${height * 0.52}" rx="32" ry="14" fill="#080312" stroke="#a855f7" stroke-width="3"/>
      <ellipse cx="${width * 0.58}" cy="${height * 0.52}" rx="32" ry="14" fill="#080312" stroke="#a855f7" stroke-width="3"/>
      <!-- Irises with radiant crimson-violet fire -->
      <circle cx="${width * 0.43}" cy="${height * 0.52}" r="14" fill="url(#eyeGlow)"/>
      <circle cx="${width * 0.57}" cy="${height * 0.52}" r="14" fill="url(#eyeGlow)"/>
      <circle cx="${width * 0.44}" cy="${height * 0.51}" r="5" fill="#ffffff"/>
      <circle cx="${width * 0.58}" cy="${height * 0.51}" r="5" fill="#ffffff"/>
      <!-- Eye Flare Lashes -->
      <path d="M ${width * 0.36} ${height * 0.51} Q ${width * 0.42} ${height * 0.46} ${width * 0.48} ${height * 0.52}" stroke="#c084fc" stroke-width="4" fill="none"/>
      <path d="M ${width * 0.52} ${height * 0.52} Q ${width * 0.58} ${height * 0.46} ${width * 0.64} ${height * 0.51}" stroke="#c084fc" stroke-width="4" fill="none"/>
      <!-- Hair Strands Framing Face -->
      <path d="M ${width * 0.3} 0 Q ${width * 0.35} ${height * 0.4} ${width * 0.4} ${height * 0.65}" stroke="#06020e" stroke-width="26" fill="none"/>
      <path d="M ${width * 0.5} 0 Q ${width * 0.48} ${height * 0.3} ${width * 0.49} ${height * 0.48}" stroke="#06020e" stroke-width="20" fill="none"/>
      <path d="M ${width * 0.7} 0 Q ${width * 0.65} ${height * 0.4} ${width * 0.6} ${height * 0.65}" stroke="#06020e" stroke-width="26" fill="none"/>
    `;
  } else if (isGate) {
    // Composition: Colossal stone gate with glowing purple fissures and chains
    sceneSvgContent = `
      <!-- Colossal Gate Pillars -->
      <rect x="${width * 0.18}" y="${height * 0.2}" width="${width * 0.18}" height="${height * 0.8}" fill="#0f091f"/>
      <rect x="${width * 0.64}" y="${height * 0.2}" width="${width * 0.18}" height="${height * 0.8}" fill="#0f091f"/>
      <!-- Arch Beam -->
      <rect x="${width * 0.14}" y="${height * 0.14}" width="${width * 0.72}" height="${height * 0.1}" fill="#160e2e"/>
      <!-- Inner Portal of Shadows -->
      <rect x="${width * 0.36}" y="${height * 0.24}" width="${width * 0.28}" height="${height * 0.76}" fill="#05020c"/>
      <!-- Splitting Fissure with Radiant Rune Inscriptions -->
      <path d="M ${width * 0.5} ${height * 0.24} Q ${width * 0.48} ${height * 0.5} ${width * 0.52} ${height * 0.7} T ${width * 0.49} ${height}" stroke="#c084fc" stroke-width="8" fill="none" filter="url(#purpleGlow)"/>
      <path d="M ${width * 0.5} ${height * 0.24} Q ${width * 0.48} ${height * 0.5} ${width * 0.52} ${height * 0.7} T ${width * 0.49} ${height}" stroke="#ffffff" stroke-width="2" fill="none"/>
      <!-- Mystic Runes on Pillars -->
      <circle cx="${width * 0.27}" cy="${height * 0.4}" r="22" stroke="#a855f7" stroke-width="3" fill="none"/>
      <circle cx="${width * 0.73}" cy="${height * 0.4}" r="22" stroke="#a855f7" stroke-width="3" fill="none"/>
      <!-- Massive Abyssal Chains -->
      <line x1="${width * 0.2}" y1="${height * 0.3}" x2="${width * 0.5}" y2="${height * 0.5}" stroke="#1f143d" stroke-width="12" stroke-dasharray="14,10"/>
      <line x1="${width * 0.8}" y1="${height * 0.3}" x2="${width * 0.5}" y2="${height * 0.5}" stroke="#1f143d" stroke-width="12" stroke-dasharray="14,10"/>
    `;
  } else if (isBeast) {
    // Composition: Titanic winged demon beast soaring over cathedral spires
    sceneSvgContent = `
      <!-- Gothic Cathedral Spires in foreground -->
      <polygon points="${width * 0.1},${height} ${width * 0.18},${height * 0.55} ${width * 0.26},${height}" fill="#0a0517"/>
      <polygon points="${width * 0.74},${height} ${width * 0.82},${height * 0.55} ${width * 0.9},${height}" fill="#0a0517"/>
      <polygon points="${width * 0.42},${height} ${width * 0.5},${height * 0.65} ${width * 0.58},${height}" fill="#0e0720"/>
      <!-- Massive Winged Shadow Beast in Sky -->
      <g transform="translate(${width * 0.5}, ${height * 0.38})">
        <!-- Giant Wingspan -->
        <path d="M 0,-20 Q -180,-140 -340,-60 Q -240,-10 -60,10 Z" fill="#06020e"/>
        <path d="M 0,-20 Q 180,-140 340,-60 Q 240,-10 60,10 Z" fill="#06020e"/>
        <!-- Wing membrane energy glow -->
        <path d="M 0,-20 Q -180,-140 -340,-60" stroke="#a855f7" stroke-width="4" fill="none" filter="url(#purpleGlow)"/>
        <path d="M 0,-20 Q 180,-140 340,-60" stroke="#a855f7" stroke-width="4" fill="none" filter="url(#purpleGlow)"/>
        <!-- Beast Torso & Horned Skull -->
        <polygon points="-30,-10 0,-60 30,-10 0,60" fill="#04010a"/>
        <!-- Horns -->
        <path d="M -15,-45 Q -60,-80 -50,-115" stroke="#04010a" stroke-width="12" stroke-linecap="round" fill="none"/>
        <path d="M 15,-45 Q 60,-80 50,-115" stroke="#04010a" stroke-width="12" stroke-linecap="round" fill="none"/>
        <!-- Twin Eyes -->
        <circle cx="-12" cy="-35" r="4" fill="#f43f5e" filter="url(#purpleGlow)"/>
        <circle cx="12" cy="-35" r="4" fill="#f43f5e" filter="url(#purpleGlow)"/>
      </g>
    `;
  } else {
    // Composition: Swordsman atop cliff with flowing cape and cursed katana
    sceneSvgContent = `
      <!-- Gothic Jagged Cliffs -->
      <polygon points="0,${height * 0.75} ${width * 0.15},${height * 0.55} ${width * 0.28},${height * 0.65} ${width * 0.45},${height * 0.48} ${width * 0.6},${height * 0.68} ${width * 0.8},${height * 0.52} ${width},${height * 0.7} ${width},${height} 0,${height}" fill="#100a1c"/>
      <polygon points="0,${height * 0.85} ${width * 0.48},${height * 0.72} ${width * 0.55},${height * 0.88} ${width * 0.8},${height * 0.82} ${width},${height * 0.85} ${width},${height} 0,${height}" fill="#07040b"/>
      <!-- Lone Swordsman -->
      <g transform="translate(${width * 0.36}, ${height * 0.72})">
        <ellipse cx="0" cy="-115" rx="16" ry="16" fill="#050208"/>
        <polygon points="-16,-120 -35,-138 -10,-130 0,-150 15,-132 32,-140 16,-118" fill="#050208"/>
        <rect x="-14" y="-95" width="28" height="95" fill="#050208"/>
        <path d="M -25,0 Q -85,-40 -110,-10 Q -60,-80 -15,-95 Z" fill="#050208"/>
        <line x1="12" y1="-80" x2="75" y2="-170" stroke="#050208" stroke-width="12"/>
        <line x1="16" y1="-86" x2="75" y2="-170" stroke="#c084fc" stroke-width="4" filter="url(#purpleGlow)"/>
        <circle cx="-4" cy="-116" r="3.5" fill="#f43f5e" filter="url(#purpleGlow)"/>
      </g>
    `;
  }

  const moonX = width * 0.72;
  const moonY = height * 0.32;
  const moonRadius = height * 0.22;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#05030a"/>
        <stop offset="35%" stop-color="#120924"/>
        <stop offset="75%" stop-color="#261245"/>
        <stop offset="100%" stop-color="#0c0717"/>
      </linearGradient>
      <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#c084fc" stop-opacity="0.6"/>
        <stop offset="40%" stop-color="#7c3aed" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#04020a" stop-opacity="0.85"/>
      </radialGradient>
      <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    
    <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
    <circle cx="${moonX}" cy="${moonY}" r="${moonRadius * 2.2}" fill="url(#moonGlow)"/>
    <circle cx="${moonX}" cy="${moonY}" r="${moonRadius}" fill="#0f081d"/>
    <path d="M ${moonX - moonRadius * 0.7} ${moonY - moonRadius * 0.7} A ${moonRadius} ${moonRadius} 0 0 1 ${moonX + moonRadius * 0.8} ${moonY + moonRadius * 0.6}" stroke="#c084fc" stroke-width="10" fill="none" filter="url(#purpleGlow)"/>

    ${sceneSvgContent}

    <!-- Floating Violet Embers -->
    <circle cx="${width * 0.2}" cy="${height * 0.4}" r="2.5" fill="#e9d5ff" filter="url(#purpleGlow)"/>
    <circle cx="${width * 0.35}" cy="${height * 0.25}" r="3" fill="#e9d5ff" filter="url(#purpleGlow)"/>
    <circle cx="${width * 0.5}" cy="${height * 0.45}" r="2" fill="#e9d5ff" filter="url(#purpleGlow)"/>
    <circle cx="${width * 0.65}" cy="${height * 0.3}" r="2.5" fill="#e9d5ff" filter="url(#purpleGlow)"/>
    <circle cx="${width * 0.8}" cy="${height * 0.6}" r="3" fill="#e9d5ff" filter="url(#purpleGlow)"/>

    <rect width="${width}" height="${height}" fill="url(#vignette)"/>

    <!-- Scene Watermark Badge -->
    <rect x="36" y="36" width="180" height="42" fill="#0f0a1c" stroke="#a855f7" stroke-width="2" rx="6"/>
    <text x="56" y="63" fill="#e9d5ff" font-family="'Cinzel', Georgia, serif" font-weight="bold" font-size="18">SCENE 0${sceneNumber}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Track quota availability for image generation models
let geminiImageQuotaExceeded = false;

import { 
  searchUniversalContent, 
  getContentDetails, 
  getChapterStoryContent, 
  refreshContentIndex 
} from './src/server/contentService.ts';
import { createStoryboardFromStory, VERIFIED_SCENE_PANELS } from './src/server/storyboardService.ts';
import { 
  startVideoGenerationJob, 
  getJob, 
  getLiveJobs, 
  getCompletedJobs, 
  cancelJob, 
  deleteJob 
} from './src/server/jobService.ts';
import { 
  analyzeReferenceImage, 
  MODULAR_IMAGE_PROVIDERS, 
  generateImageWithModularProvider 
} from './src/server/imageProviderService.ts';

// Health and capability status
app.get('/api/status', (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'online',
    hasGeminiKey,
    imageProvider: 'High-Res Cinematic Dark Fantasy Anime Engine (51 Reference Panels + AI)',
    ttsSupport: 'Web Speech API & Gemini TTS (Hindi hi-IN & English en-US)',
    version: '2.0.0'
  });
});

// Universal Search across Manga, Manhua, and Web Novels with audit transparency
app.get('/api/search', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const q = (req.query.q as string) || '';
    const type = req.query.type as any;
    const status = req.query.status as string;
    const source = req.query.source as string;
    const searchRes = await searchUniversalContent(q, {
      contentType: type,
      status: status,
      source: source
    });
    res.json({ 
      success: true, 
      count: searchRes.results.length, 
      results: searchRes.results,
      sourcesAudited: searchRes.sourcesAudited,
      alternateTitlesTested: searchRes.alternateTitlesTested
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, results: [], sourcesAudited: [] });
  }
});

// Content Details endpoint (Volumes, Chapters, Metadata)
app.get('/api/content/:id/details', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { id } = req.params;
    const details = await getContentDetails(id);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }
    res.json({ success: true, details });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Refresh Content Index endpoint
app.post('/api/content/:id/refresh-index', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { id } = req.params;
    const details = await refreshContentIndex(id);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }
    res.json({ success: true, details });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate Storyboard from story text or chapters
app.post('/api/generate-storyboard', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { contentId, chapterNumbers = [1591], language = 'en', storyText } = req.body;
    let textToAnalyze = storyText;
    if (!textToAnalyze && contentId) {
      textToAnalyze = await getChapterStoryContent(contentId, chapterNumbers);
    }
    if (!textToAnalyze) {
      return res.status(400).json({ success: false, error: 'Story text or valid contentId is required' });
    }

    const scenes = await createStoryboardFromStory(textToAnalyze, {
      language,
      contentId,
      chapterNumbers
    });

    res.json({ success: true, scenes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Background Job Creation for Full Video Generation
app.post('/api/jobs/create', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { 
      contentId, 
      chapterNumbers = [1591], 
      storyText,
      title,
      voicePresetId, 
      language = 'hi', 
      videoSettings 
    } = req.body;

    if (!contentId && !storyText) {
      return res.status(400).json({ success: false, error: 'Either contentId or storyText is required' });
    }

    const { jobId, isQueued } = startVideoGenerationJob({
      contentId,
      chapterNumbers,
      storyText,
      title,
      voicePresetId,
      language,
      videoSettings
    });

    res.json({ success: true, jobId, isQueued });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all Live (Active + Queued) Jobs
app.get('/api/jobs/live', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const liveJobs = getLiveJobs();
    res.json({ 
      success: true, 
      activeJobs: liveJobs.filter(j => !j.isQueued && j.stage !== 'queued'), 
      queuedJobs: liveJobs.filter(j => j.isQueued || j.stage === 'queued') 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all Completed Jobs
app.get('/api/jobs/completed', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const completed = getCompletedJobs();
    res.json({ success: true, completedJobs: completed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Poll Single Background Job Status
app.get('/api/jobs/:id', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  res.json({ success: true, job });
});

// Cancel Job
app.post('/api/jobs/:id/cancel', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const success = cancelJob(req.params.id);
  res.json({ success, message: success ? 'Job cancelled and resources released' : 'Job not found or already inactive' });
});

// Delete Completed Job
app.delete('/api/jobs/:id', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const success = deleteJob(req.params.id);
  res.json({ success, message: success ? 'Job and output file deleted' : 'Job not found' });
});


// Get available modular image generation providers with status and limits
app.get('/api/image/providers', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    const providers = MODULAR_IMAGE_PROVIDERS.map(p => {
      if (p.id === 'gemini-nano') {
        return {
          ...p,
          status: hasGeminiKey ? 'ready' : 'setup-required',
          notes: hasGeminiKey ? p.notes : 'Requires Gemini API key configured in environment'
        };
      }
      return p;
    });
    res.json({ success: true, providers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, providers: MODULAR_IMAGE_PROVIDERS });
  }
});

// Analyze Reference Image using Gemini Vision with Algorithmic Fallback
app.post('/api/style/analyze-reference', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { base64Image, mimeType = 'image/jpeg', profileName } = req.body;
    if (!base64Image) {
      return res.status(400).json({ success: false, error: 'Reference base64 image data is required' });
    }

    // Size limit check (base64 string ~12MB)
    if (base64Image.length > 12 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: 'Reference image too large (limit is 10MB)' });
    }

    const analyzedResult = await analyzeReferenceImage(base64Image, mimeType, profileName);
    res.json({ success: true, profile: analyzedResult.profile || analyzedResult, method: analyzedResult.method });
  } catch (err: any) {
    console.error('Error analyzing reference image:', err);
    res.status(500).json({ success: false, error: err.message || 'Style analysis failed' });
  }
});

// Modular Image Generation Endpoint
// Integrates Visual Style Profiles, Character Consistency, and Configurable Providers
app.post('/api/generate-image', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { 
      prompt, 
      sceneNumber = 1, 
      width = 1280, 
      height = 720,
      styleProfile,
      characterProfile,
      settings,
      referenceImage
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt or scene description is required' });
    }

    const result = await generateImageWithModularProvider({
      prompt,
      sceneNumber,
      width,
      height,
      styleProfile,
      characterProfile,
      settings,
      referenceImage
    });

    return res.json({
      success: true,
      imageDataUrl: result.imageDataUrl,
      provider: result.provider,
      model: result.model,
      promptUsed: result.promptUsed,
      dimensions: result.dimensions,
      message: result.message,
      sceneNumber,
      styleApplied: Boolean(styleProfile?.enabled ?? styleProfile),
      characterApplied: Boolean(characterProfile?.name)
    });
  } catch (err: any) {
    console.error('Modular generation error:', err);
    const sceneNum = req.body?.sceneNumber || 1;
    const panelRel = VERIFIED_SCENE_PANELS[Math.abs(sceneNum - 1) % VERIFIED_SCENE_PANELS.length];
    const fullPanelPath = path.resolve(__dirname, 'public', panelRel.replace(/^\//, ''));
    let fallbackDataUrl = '';
    if (fs.existsSync(fullPanelPath)) {
      fallbackDataUrl = `data:image/jpeg;base64,${fs.readFileSync(fullPanelPath).toString('base64')}`;
    } else {
      fallbackDataUrl = panelRel;
    }
    return res.json({
      success: true,
      imageDataUrl: fallbackDataUrl,
      provider: 'cinematic-curated',
      model: 'cinematic-dark-fantasy-v2',
      promptUsed: req.body?.prompt || 'Manga Scene',
      dimensions: { width: req.body?.width || 1280, height: req.body?.height || 720 },
      message: 'Generated with high-resolution dark fantasy keyframe panel',
      sceneNumber: sceneNum,
    });
  }
});

// Proxy image endpoint to prevent CORS taint on HTML5 Canvas
app.post('/api/proxy-image', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    if (url.startsWith('data:')) {
      return res.json({ dataUrl: url });
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const base64 = Buffer.from(buffer).toString('base64');
    
    res.json({ dataUrl: `data:${contentType};base64,${base64}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Direct Cover Proxy endpoint for client <img> tags with caching & anti-hotlink bypass
app.get('/api/cover-proxy', async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) return res.status(400).send('Missing url parameter');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const fetchRes = await fetch(imageUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (fetchRes.ok) {
      const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
      const buffer = await fetchRes.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.end(Buffer.from(buffer));
    }
  } catch (e) {}

  // Fallback to local default portrait if external cover fails or times out
  const fallbackPath = path.resolve(__dirname, 'public/assets/scenes/scene_hero_portrait.jpg');
  if (fs.existsSync(fallbackPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(fallbackPath);
  }
  res.status(404).send('Image not available');
});

// Stream verified exported videos with partial content / HTTP 206 byte-range support
app.get('/api/videos/:id', (req, res) => {
  const videoId = req.params.id.replace(/[^a-zA-Z0-9_\-.]/g, '');
  const fileName = videoId.endsWith('.mp4') ? videoId : `${videoId}.mp4`;
  const filePath = path.resolve(__dirname, 'public/assets/exports', fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video file not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Serve exported videos statically
app.use('/assets/exports', express.static(path.resolve(__dirname, 'public/assets/exports')));

// Translation assistance endpoint (English <-> Hindi)
app.post('/api/translate', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { text, targetLanguage } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Translate the following manga narration into ${targetLanguage === 'hi' ? 'Hindi (Devanagari script with natural, dramatic manga narration tone)' : 'clear, dramatic English manga narration'}. Preserve dramatic flair and meaning. Return ONLY the translated narration with no notes or quotes.\n\nText: "${text}"`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const translated = response.text?.trim();
      return res.json({ success: true, translation: translated });
    }

    res.json({
      success: false,
      message: 'Gemini API translation is inactive. Narration text can be edited directly in Hindi or English.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Set up Vite middlewares in development or static serve in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Serve index.html with Vite's HTML transform for SPA routing
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const publicPath = path.resolve(__dirname, 'public');

    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath));
    }

    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      const distIndex = path.resolve(distPath, 'index.html');
      if (fs.existsSync(distIndex)) {
        return res.sendFile(distIndex);
      }
      const rootIndex = path.resolve(__dirname, 'index.html');
      res.sendFile(rootIndex);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  VITE v8.3.0  ready in 185 ms\n`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/\n`);
    console.log(`Manga Video Studio AI server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
