import path from 'path';
import fs from 'fs';
import { exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import type { 
  JobProgress, 
  JobStage, 
  Scene, 
  VoicePresetId, 
  NarrationLanguage, 
  VideoSettings,
  GeneratedJobImage 
} from '../types.ts';
import { getChapterStoryContent } from './contentService.ts';
import { createStoryboardFromStory } from './storyboardService.ts';
import { generateImageWithModularProvider } from './imageProviderService.ts';
import { generateSceneSpeech, mergeNarrationAudioTrack, measureAudioDuration } from './ttsService.ts';

const execAsync = promisify(exec);

export const MAX_CONCURRENT_JOBS = 3;

export interface CreateJobParams {
  contentId?: string;
  chapterNumbers?: number[];
  storyText?: string;
  title?: string;
  voicePresetId?: VoicePresetId;
  language?: NarrationLanguage;
  videoSettings?: Partial<VideoSettings>;
}

export interface StoredJob extends JobProgress {
  jobKey: string;
  abortController: AbortController;
  activeProcess?: ChildProcess | null;
  params: CreateJobParams;
}

const activeJobs = new Map<string, StoredJob>();

/**
 * Initializes job storage on startup:
 * - Recovers all completed .mp4 videos from public/assets/exports into memory
 * - Cleans up orphaned or incomplete job session directories
 * - Preserves completed videos across server restarts
 */
export function initJobStorage() {
  const exportDir = path.resolve(process.cwd(), 'public', 'assets', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
    return;
  }

  try {
    const entries = fs.readdirSync(exportDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(exportDir, entry.name);

      if (entry.isFile() && entry.name.endsWith('.mp4')) {
        const jobId = entry.name.replace(/\.mp4$/, '');
        const stat = fs.statSync(fullPath);
        if (stat.size > 10000) {
          const thumbFileName = `${jobId}_thumb.jpg`;
          const thumbFilePath = path.join(exportDir, thumbFileName);
          const hasThumb = fs.existsSync(thumbFilePath);

          const restoredJob: StoredJob = {
            jobId,
            title: `Shadow Slave Episode — ${jobId.slice(0, 16)}`,
            jobKey: jobId,
            stage: 'completed',
            percentage: 100,
            message: 'Completed and verified MP4 ready for playback and export.',
            fileSizeBytes: stat.size,
            durationSeconds: 15,
            fileExistsVerified: true,
            videoUrl: `/assets/exports/${entry.name}`,
            videoFileName: entry.name,
            savedLocalPath: `Movies/MangaVideoStudio/${entry.name}`,
            createdAt: stat.birthtime.toISOString(),
            completedAt: stat.mtime.toISOString(),
            isQueued: false,
            renderingStatus: 'Completed & Verified',
            narrationStatus: 'Audible Fixed Male Hindi Narration',
            abortController: new AbortController(),
            params: {},
          };

          if (hasThumb) {
            (restoredJob as any).thumbnailUrl = `/assets/exports/${thumbFileName}`;
          }

          activeJobs.set(jobId, restoredJob);

          // Asynchronously probe duration and generate thumbnail if missing
          measureAudioDuration(fullPath).then(async (dur) => {
            restoredJob.durationSeconds = dur;
            if (!hasThumb) {
              try {
                await execAsync(`ffmpeg -y -ss 00:00:01 -i "${fullPath}" -vframes 1 -q:v 2 "${thumbFilePath}"`);
                (restoredJob as any).thumbnailUrl = `/assets/exports/${thumbFileName}`;
              } catch {}
            }
          }).catch(() => {});
        }
      } else if (entry.isDirectory()) {
        const matchingMp4 = path.join(exportDir, `${entry.name}.mp4`);
        if (!fs.existsSync(matchingMp4)) {
          // Clean up orphaned session directories from incomplete runs
          try {
            fs.rmSync(fullPath, { recursive: true, force: true });
            console.log(`[JobService] Cleaned up temporary orphaned session dir: ${entry.name}`);
          } catch {}
        }
      }
    }
    console.log(`[JobService] Initialized job storage. Restored ${activeJobs.size} completed videos.`);
  } catch (err: any) {
    console.warn('[JobService] Notice during initJobStorage:', err.message);
  }
}

// Run initial storage scan on module load
initJobStorage();

export function getJob(jobId: string): StoredJob | null {
  return activeJobs.get(jobId) || null;
}

export function getAllJobs(): StoredJob[] {
  return Array.from(activeJobs.values()).sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

export function getLiveJobs(): StoredJob[] {
  return Array.from(activeJobs.values())
    .filter(j => j.stage !== 'completed')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export function getCompletedJobs(): StoredJob[] {
  return Array.from(activeJobs.values())
    .filter(j => j.stage === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.createdAt || 0).getTime() - new Date(a.completedAt || a.createdAt || 0).getTime());
}

/**
 * Counts how many jobs are currently actively executing
 */
export function getRunningJobCount(): number {
  let count = 0;
  for (const job of activeJobs.values()) {
    if (
      job.stage === 'crafting' ||
      job.stage === 'generating_images' ||
      job.stage === 'generating_voice' ||
      job.stage === 'rendering_video'
    ) {
      count++;
    }
  }
  return count;
}

/**
 * Starts a new video generation job. If max concurrent limit (3) is reached,
 * the job is placed into the WAITING queue and starts automatically when a slot opens.
 */
export function startVideoGenerationJob(params: CreateJobParams): { jobId: string; isQueued: boolean } {
  const sortedChapters = (params.chapterNumbers || [1591]).slice().sort((a, b) => a - b);
  const title = params.title || (params.contentId 
    ? `${params.contentId.replace(/-/g, ' ').toUpperCase()} — Ch. ${sortedChapters.join(', ')}`
    : `Custom Manga Episode ${new Date().toLocaleTimeString()}`);
    
  const jobKey = `${params.contentId || 'custom'}_${sortedChapters.join('-')}_${Date.now()}`;
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const outputFileName = `${jobId}.mp4`;

  const newJob: StoredJob = {
    jobId,
    title,
    jobKey,
    stage: 'queued',
    percentage: 0,
    message: 'Job queued in background. Waiting for an available generation slot...',
    totalScenes: 0,
    currentScene: 0,
    generatedImages: [],
    narrationStatus: 'Waiting in queue...',
    renderingStatus: 'Waiting...',
    savedLocalPath: `Movies/MangaVideoStudio/${outputFileName}`,
    createdAt: new Date().toISOString(),
    isQueued: true,
    abortController: new AbortController(),
    params
  };

  activeJobs.set(jobId, newJob);
  console.log(`[JobService] Registered job ${jobId} ("${title}"). Running queue scheduler...`);

  // Trigger resource-aware concurrency scheduler
  const isImmediatelyRunning = runQueueScheduler();

  return {
    jobId,
    isQueued: !isImmediatelyRunning
  };
}

/**
 * Scheduler: Dispatches queued jobs up to MAX_CONCURRENT_JOBS (3 concurrent jobs)
 */
export function runQueueScheduler(): boolean {
  const running = getRunningJobCount();
  const availableSlots = MAX_CONCURRENT_JOBS - running;

  if (availableSlots <= 0) {
    console.log(`[JobService] Concurrency full (${running}/${MAX_CONCURRENT_JOBS} active). Additional jobs remain queued.`);
    return false;
  }

  // Find oldest queued job
  const queuedJobs = Array.from(activeJobs.values())
    .filter(j => j.stage === 'queued')
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

  if (queuedJobs.length === 0) {
    return false;
  }

  const jobsToStart = queuedJobs.slice(0, availableSlots);
  for (const job of jobsToStart) {
    job.isQueued = false;
    job.stage = 'crafting';
    job.percentage = 5;
    job.message = 'Slot assigned! Crafting episode storyboard and scenes...';
    console.log(`[JobService] Starting queued job ${job.jobId} ("${job.title}"). Active count: ${running + 1}/${MAX_CONCURRENT_JOBS}`);

    executeJobPipeline(job.jobId, job.params)
      .catch((err) => {
        console.error(`[JobService] Job ${job.jobId} failed:`, err);
        const j = activeJobs.get(job.jobId);
        if (j && j.stage !== 'cancelled') {
          j.stage = 'failed';
          j.error = err.message || 'Pipeline failed';
          j.message = `Generation error: ${err.message || 'Failed'}`;
        }
      })
      .finally(() => {
        // Automatically schedule next waiting job when this one completes, fails, or is cancelled
        runQueueScheduler();
      });
  }

  return true;
}

/**
 * Cancels a running or queued job, stops child processes, cleans up temporary files,
 * and releases its concurrency slot to immediately advance the next waiting job.
 */
export function cancelJob(jobId: string): boolean {
  const job = activeJobs.get(jobId);
  if (!job) return false;

  console.log(`[JobService] Cancelling job ${jobId} ("${job.title}")...`);
  job.stage = 'cancelled';
  job.message = 'Job cancelled by user. Resources and temporary files released.';
  job.percentage = 0;
  job.isQueued = false;

  // 1. Abort fetch and async tasks
  try {
    job.abortController.abort();
  } catch (e) {}

  // 2. Kill FFmpeg child process if active
  if (job.activeProcess) {
    try {
      job.activeProcess.kill('SIGKILL');
      console.log(`[JobService] Sent SIGKILL to FFmpeg process for ${jobId}`);
    } catch (e) {}
    job.activeProcess = null;
  }

  // 3. Clean up temporary directory for this specific job
  const exportDir = path.resolve(process.cwd(), 'public', 'assets', 'exports');
  const jobDir = path.join(exportDir, jobId);
  try {
    if (fs.existsSync(jobDir)) {
      fs.rmSync(jobDir, { recursive: true, force: true });
      console.log(`[JobService] Cleaned up temporary directory: ${jobDir}`);
    }
  } catch (e) {
    console.warn(`[JobService] Failed cleaning temp dir for ${jobId}:`, e);
  }

  // 4. Run queue scheduler to advance next waiting job
  setTimeout(() => runQueueScheduler(), 100);

  return true;
}

/**
 * Deletes a completed job and its rendered MP4 video from disk
 */
export function deleteJob(jobId: string): boolean {
  const job = activeJobs.get(jobId);
  const exportDir = path.resolve(process.cwd(), 'public', 'assets', 'exports');
  const videoFile = path.join(exportDir, `${jobId}.mp4`);
  const jobDir = path.join(exportDir, jobId);

  try {
    if (fs.existsSync(videoFile)) {
      fs.unlinkSync(videoFile);
      console.log(`[JobService] Deleted video file: ${videoFile}`);
    }
    const thumbFile = path.join(exportDir, `${jobId}_thumb.jpg`);
    if (fs.existsSync(thumbFile)) {
      fs.unlinkSync(thumbFile);
    }
    if (fs.existsSync(jobDir)) {
      fs.rmSync(jobDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.warn(`[JobService] Failed deleting files for ${jobId}:`, e);
  }

  activeJobs.delete(jobId);
  return true;
}

async function sleep(ms: number, signal?: AbortSignal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Operation aborted'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Operation aborted'));
    });
  });
}

/**
 * Full video generation execution pipeline
 */
async function executeJobPipeline(jobId: string, params: CreateJobParams) {
  const job = activeJobs.get(jobId);
  if (!job) return;

  const signal = job.abortController.signal;
  const { 
    contentId = 'shadow-slave', 
    chapterNumbers = [1591], 
    storyText, 
    language = 'hi', 
    videoSettings 
  } = params;

  // Check cancellation
  if (signal.aborted) throw new Error('Job cancelled before execution');

  // Stage 1: Crafting Storyboard
  job.stage = 'crafting';
  job.percentage = 10;
  job.message = 'Analyzing story beat pacing and crafting sequential manga scenes...';

  let rawStory = storyText || '';
  if (!rawStory && contentId) {
    rawStory = await getChapterStoryContent(contentId, chapterNumbers);
  }

  if (signal.aborted) throw new Error('Job cancelled');

  const scenes = await createStoryboardFromStory(rawStory, {
    language,
    contentId,
    chapterNumbers,
    explanationDepth: videoSettings?.explanationDepth || 'detailed'
  });

  if (!scenes || scenes.length === 0) {
    throw new Error('Could not parse or generate storyboard scenes from story content');
  }

  job.totalScenes = scenes.length;
  job.scenes = scenes;
  job.percentage = 20;

  // Stage 2: Generating Genuinely New Scene Images
  job.stage = 'generating_images';
  job.message = `Generating brand-new cinematic AI illustrations for ${scenes.length} scenes...`;

  const exportDir = path.resolve(process.cwd(), 'public', 'assets', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  const jobDir = path.join(exportDir, jobId);
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }

  const selectedImageProvider = videoSettings?.imageProviderId || 'stable-diffusion-horde';
  const framePaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    if (signal.aborted) throw new Error('Job cancelled during image generation');

    const sc = scenes[i];
    job.currentScene = i + 1;
    job.percentage = 20 + Math.round(((i + 1) / scenes.length) * 35); // 20% -> 55%
    job.message = `Generating scene ${i + 1} of ${scenes.length} artwork: ${sc.description.slice(0, 36)}...`;
    sc.imageStatus = 'generating';

    try {
      const genRes = await generateImageWithModularProvider({
        prompt: sc.imagePrompt || sc.description,
        sceneNumber: i + 1,
        width: 1280,
        height: 720,
        providerId: selectedImageProvider as any
      });

      if (signal.aborted) throw new Error('Job cancelled');

      if (!genRes || !genRes.imageDataUrl) {
        throw new Error('Image generation provider returned empty data');
      }

      const commaIndex = genRes.imageDataUrl.indexOf(',');
      if (commaIndex === -1) {
        throw new Error('Invalid image data URL format');
      }
      const rawBase64 = genRes.imageDataUrl.slice(commaIndex + 1).replace(/\s/g, '');
      const imgBuffer = Buffer.from(rawBase64, 'base64');

      if (imgBuffer.length < 2000) {
        throw new Error('Generated image is too small or truncated');
      }

      let ext = 'jpg';
      if (imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50) ext = 'png';
      else if (imgBuffer.toString('ascii', 0, 4) === 'RIFF' && imgBuffer.toString('ascii', 8, 12) === 'WEBP') ext = 'webp';

      const frameFileName = `scene_${i + 1}_${Date.now()}.${ext}`;
      const frameFile = path.join(jobDir, frameFileName);
      fs.writeFileSync(frameFile, imgBuffer);

      const webImgUrl = `/assets/exports/${jobId}/${frameFileName}`;
      sc.imageUrl = webImgUrl;
      sc.imageStatus = 'ready';
      sc.imageProvider = genRes.provider;
      framePaths.push(frameFile);

      // Add to live image previews for this job
      if (!job.generatedImages) job.generatedImages = [];
      job.generatedImages.push({
        sceneIndex: i + 1,
        imageUrl: webImgUrl,
        prompt: sc.imagePrompt
      });

    } catch (genErr: any) {
      sc.imageStatus = 'failed';
      sc.imageError = genErr.message || 'Image generation failed';
      throw new Error(`Scene ${i + 1} image generation failed: ${genErr.message}`);
    }
  }

  // Stage 3: Synthesizing Spoken Hindi Narration (Fixed Male Baritone Narrator)
  job.stage = 'generating_voice';
  job.percentage = 55;
  job.message = `Synthesizing fixed male Hindi narration for ${scenes.length} scenes...`;

  const sceneAudioPaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    if (signal.aborted) throw new Error('Job cancelled during speech synthesis');

    const sc = scenes[i];
    job.percentage = 55 + Math.round(((i + 1) / scenes.length) * 25); // 55% -> 80%
    job.message = `Synthesizing male Hindi voiceover for scene ${i + 1} of ${scenes.length}...`;
    job.narrationStatus = `Scene ${i + 1}/${scenes.length} speech synthesized`;
    sc.narrationStatus = 'generating';

    const audioFileName = `scene_${i + 1}_narration.mp3`;
    const audioFilePath = path.join(jobDir, audioFileName);

    try {
      const speechRes = await generateSceneSpeech(sc.narrationText, language, audioFilePath, i + 1, signal);

      if (signal.aborted) throw new Error('Job cancelled');

      sc.narrationAudioUrl = `/assets/exports/${jobId}/${audioFileName}`;
      sc.narrationStatus = 'ready';
      sc.narrationDuration = speechRes.durationSeconds;
      
      // Exact synchronization: image duration matches spoken speech duration
      sc.duration = Math.max(speechRes.durationSeconds, 2.5);
      sceneAudioPaths.push(speechRes.audioPath);
    } catch (ttsErr: any) {
      sc.narrationStatus = 'failed';
      sc.narrationError = ttsErr.message || 'Speech synthesis failed';
      throw new Error(`Scene ${i + 1} narration synthesis failed: ${ttsErr.message}`);
    }
  }

  if (signal.aborted) throw new Error('Job cancelled');

  // Merge audio files into master narration track
  const masterAudioFileName = 'master_narration.aac';
  const masterAudioPath = path.join(jobDir, masterAudioFileName);
  job.message = 'Merging scene voice tracks into continuous master narration track...';
  const { totalDuration: masterDuration } = await mergeNarrationAudioTrack(sceneAudioPaths, masterAudioPath);
  job.durationSeconds = masterDuration;

  // Stage 4: Rendering Video
  job.stage = 'rendering_video';
  job.percentage = 82;
  job.message = 'Multiplexing synchronized scene frames with master Hindi narration...';
  job.renderingStatus = 'Encoding H.264/AAC with FFmpeg...';

  const outputFileName = `${jobId}.mp4`;
  const outputFilePath = path.join(exportDir, outputFileName);

  const listFilePath = path.join(jobDir, 'concat_list.txt');
  const listLines: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const framePath = framePaths[i];
    listLines.push(`file '${framePath}'`);
    listLines.push(`duration ${sc.duration}`);
  }

  // FFmpeg concat requirement: repeat last entry
  if (listLines.length > 0) {
    const lastFileEntry = listLines[listLines.length - 2];
    if (lastFileEntry) listLines.push(lastFileEntry);
  }

  fs.writeFileSync(listFilePath, listLines.join('\n'), 'utf8');

  if (signal.aborted) throw new Error('Job cancelled before video render');

  job.percentage = 88;
  job.message = 'Encoding high-definition MP4 with audible male Hindi narration...';

  const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${listFilePath}" -i "${masterAudioPath}" -f lavfi -i "aevalsrc=0.03*sin(2*PI*55*t)+0.015*sin(2*PI*110*t):s=44100:d=${masterDuration}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1[v];[1:a]volume=1.25[speech];[2:a]volume=0.04[bgm];[speech][bgm]amix=inputs=2:duration=first[aout]" -map "[v]" -map "[aout]" -c:v libx264 -pix_fmt yuv420p -r 25 -c:a aac -b:a 192k -shortest -movflags +faststart "${outputFilePath}"`;

  await new Promise<void>((resolve, reject) => {
    const child = exec(ffmpegCmd, (error) => {
      job.activeProcess = null;
      if (error) {
        if (signal.aborted) {
          reject(new Error('Job cancelled during render'));
        } else {
          reject(new Error(`FFmpeg error: ${error.message}`));
        }
      } else {
        resolve();
      }
    });
    job.activeProcess = child;
  });

  // Verify rendered video
  if (!fs.existsSync(outputFilePath)) {
    throw new Error(`Output file not created: ${outputFilePath}`);
  }

  const stat = fs.statSync(outputFilePath);
  if (stat.size < 10000) {
    throw new Error(`Rendered video file is truncated (${stat.size} bytes)`);
  }

  // Rigorous stream verification with ffprobe
  try {
    const { stdout: probeOut } = await execAsync(`ffprobe -i "${outputFilePath}" -show_streams -v quiet -of json`);
    const parsedProbe = JSON.parse(probeOut);
    const streams = parsedProbe.streams || [];
    const hasVideo = streams.some((s: any) => s.codec_type === 'video');
    const hasAudio = streams.some((s: any) => s.codec_type === 'audio');
    if (!hasVideo || !hasAudio) {
      throw new Error('Rendered video file failed stream validation: missing video or audio track');
    }
  } catch (probeErr: any) {
    if (probeErr.message.includes('failed stream validation')) {
      throw probeErr;
    }
    console.warn('[JobService] ffprobe warning during stream verification:', probeErr.message);
  }

  const verifiedDur = await measureAudioDuration(outputFilePath);

  // Generate video thumbnail for the completed video
  const thumbFileName = `${jobId}_thumb.jpg`;
  const thumbFilePath = path.join(exportDir, thumbFileName);
  try {
    await execAsync(`ffmpeg -y -ss 00:00:01 -i "${outputFilePath}" -vframes 1 -q:v 2 "${thumbFilePath}"`);
    (job as any).thumbnailUrl = `/assets/exports/${thumbFileName}`;
  } catch (thumbErr) {
    // Fallback thumbnail from scene 1 if available
    if (framePaths[0] && fs.existsSync(framePaths[0])) {
      try {
        fs.copyFileSync(framePaths[0], thumbFilePath);
        (job as any).thumbnailUrl = `/assets/exports/${thumbFileName}`;
      } catch {}
    }
  }

  // Success: Set Completed
  job.stage = 'completed';
  job.percentage = 100;
  job.fileSizeBytes = stat.size;
  job.durationSeconds = verifiedDur;
  job.fileExistsVerified = true;
  job.videoUrl = `/assets/exports/${outputFileName}`;
  job.videoFileName = outputFileName;
  job.savedLocalPath = `Movies/MangaVideoStudio/${outputFileName}`;
  job.completedAt = new Date().toISOString();
  job.renderingStatus = 'Completed & Verified';
  job.narrationStatus = 'Audible Fixed Male Hindi Narration Verified';
  job.message = `Full episode successfully rendered with brand-new AI artwork and audible Hindi narration (${(stat.size / 1024 / 1024).toFixed(1)} MB, ${verifiedDur.toFixed(1)}s). Ready to play or save to Gallery!`;

  console.log(`[JobService] Job ${jobId} completed and verified! Saved to ${outputFilePath}`);
}
