import { Scene, VideoSettings, VoiceSettings } from '../types';
import { darkFantasyAudio } from './audioSynth';
import { calculateSuggestedDuration } from './sceneParser';

export interface RenderProgress {
  currentSceneIndex: number;
  totalScenes: number;
  percent: number;
  elapsedSeconds: number;
  totalSeconds: number;
  statusText: string;
}

export class VideoExporter {
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
  }

  /**
   * Loads an image URL into an HTMLImageElement safely.
   */
  private async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error(`Failed to load scene image: ${url.slice(0, 50)}...`));
      img.src = url;
    });
  }

  /**
   * Main render method that compiles scenes into a playable WebM video.
   */
  public async exportVideo(
    scenes: Scene[],
    videoSettings: VideoSettings,
    voiceSettings: VoiceSettings,
    onProgress: (progress: RenderProgress) => void
  ): Promise<{ blob: Blob; url: string }> {
    this.isCancelled = false;

    if (!scenes || scenes.length === 0) {
      throw new Error('No scenes provided for video export.');
    }

    // Normalize scene durations from narration to prevent unwanted 3-5 second dead air
    const activeScenes = scenes.map(s => {
      const suggested = calculateSuggestedDuration(s.narrationText, voiceSettings.language);
      return {
        ...s,
        duration: s.duration && s.duration >= 4 ? s.duration : suggested
      };
    });

    // Determine dimensions
    const isWidescreen = videoSettings.aspectRatio === '16:9';
    const width = isWidescreen ? 1280 : 720;
    const height = isWidescreen ? 720 : 1280;

    const totalCalculatedSeconds = activeScenes.reduce((acc, s) => acc + s.duration, 0);

    onProgress({
      currentSceneIndex: 0,
      totalScenes: activeScenes.length,
      percent: 5,
      elapsedSeconds: 0,
      totalSeconds: totalCalculatedSeconds,
      statusText: 'Initializing video render pipeline with synchronized pacing...',
    });

    // 1. Sliding image cache to prevent RAM exhaustion on long 5-10 min videos
    const imageCache = new Map<number, HTMLImageElement>();
    const preloadSceneImage = async (idx: number): Promise<HTMLImageElement | null> => {
      if (idx < 0 || idx >= activeScenes.length) return null;
      if (imageCache.has(idx)) return imageCache.get(idx)!;

      const sc = activeScenes[idx];
      if (!sc?.imageUrl) return null;
      try {
        const img = await this.loadImage(sc.imageUrl);
        imageCache.set(idx, img);
        // Evict older images that are more than 2 scenes behind to free memory on mobile
        if (imageCache.size > 5) {
          for (const key of imageCache.keys()) {
            if (key < idx - 2) {
              imageCache.delete(key);
            }
          }
        }
        return img;
      } catch (err) {
        return null;
      }
    };

    // Preload initial 2 scenes
    await preloadSceneImage(0);
    if (activeScenes.length > 1) {
      preloadSceneImage(1).catch(() => {});
    }

    // 2. Setup Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) throw new Error('Canvas context not available');

    // 3. Audio Stream Setup with Loopable Buffer (zero main-thread blocking)
    const totalDurationSeconds = totalCalculatedSeconds;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    let audioCtx: AudioContext | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    let audioSource: AudioBufferSourceNode | null = null;

    if (voiceSettings.includeBgm && AudioCtxClass) {
      try {
        audioCtx = new AudioCtxClass();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        audioDestination = audioCtx.createMediaStreamDestination();
        const bgmBuffer = darkFantasyAudio.createCinematicTrackBuffer(16, voiceSettings.bgmVolume * 0.4);
        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = bgmBuffer;
        audioSource.loop = true; // Seamless looping throughout entire video duration
        audioSource.connect(audioDestination);
      } catch (audioErr) {
        console.warn('Audio destination creation failed, proceeding with silent track:', audioErr);
      }
    }

    // 4. Capture Canvas stream & Combine Audio
    const canvasStream = canvas.captureStream(videoSettings.fps || 30);
    let combinedStream: MediaStream = canvasStream;

    if (audioDestination && audioDestination.stream.getAudioTracks().length > 0) {
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ];
      combinedStream = new MediaStream(combinedTracks);
    }

    // 5. Setup MediaRecorder with safe mobile bitrate
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }
    }

    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
      videoBitsPerSecond: 2_500_000, // Balanced 2.5Mbps to prevent mobile hardware encoder overload
    });

    const recordedChunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    const cleanupResources = () => {
      try {
        combinedStream.getTracks().forEach((t) => t.stop());
        canvasStream.getTracks().forEach((t) => t.stop());
        if (audioSource) {
          try { audioSource.stop(); } catch (e) {}
        }
        if (audioCtx && audioCtx.state !== 'closed') {
          try { audioCtx.close(); } catch (e) {}
        }
        imageCache.clear();
      } catch (cleanupErr) {
        console.warn('Cleanup warning:', cleanupErr);
      }
    };

    const recordPromise = new Promise<{ blob: Blob; url: string }>((resolve, reject) => {
      mediaRecorder.onstop = () => {
        try {
          const finalBlob = new Blob(recordedChunks, { type: mimeType || 'video/webm' });
          const url = URL.createObjectURL(finalBlob);
          cleanupResources();
          resolve({ blob: finalBlob, url });
        } catch (e) {
          cleanupResources();
          reject(e);
        }
      };
      mediaRecorder.onerror = (e) => {
        cleanupResources();
        reject(e);
      };
    });

    // Start audio & recording
    mediaRecorder.start(250);
    if (audioSource) {
      audioSource.start();
    }

    // 6. Animation and Frame Rendering Loop
    const startTime = performance.now();
    let currentSceneIdx = 0;
    let sceneStartTime = startTime;
    let frameCounter = 0;

    // Particle system (fixed preallocated array to prevent GC spikes)
    const particles = Array.from({ length: 35 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: -0.7 - Math.random() * 1.1,
      size: Math.random() * 2.2 + 1,
      alpha: Math.random() * 0.6 + 0.3,
    }));

    // Pre-calculate subtitle lines for current scene once
    let cachedSubtitleLines: string[] = this.computeSubtitleLines(
      ctx,
      activeScenes[0]?.narrationText || '',
      width,
      videoSettings.subtitleSize
    );

    await new Promise<void>((resolve, reject) => {
      const renderFrame = async (now: number) => {
        if (this.isCancelled) {
          mediaRecorder.stop();
          cleanupResources();
          reject(new Error('Video export cancelled.'));
          return;
        }

        frameCounter++;
        const totalElapsed = (now - startTime) / 1000;
        const currentScene = activeScenes[currentSceneIdx];
        const sceneDuration = currentScene.duration;
        const sceneElapsed = (now - sceneStartTime) / 1000;
        const sceneProgress = Math.min(sceneElapsed / sceneDuration, 1.0);

        // Check if current scene finished (transitions directly with zero dead air)
        if (sceneElapsed >= sceneDuration) {
          currentSceneIdx++;
          if (currentSceneIdx >= activeScenes.length) {
            // Render finished!
            onProgress({
              currentSceneIndex: activeScenes.length - 1,
              totalScenes: activeScenes.length,
              percent: 100,
              elapsedSeconds: totalDurationSeconds,
              totalSeconds: totalDurationSeconds,
              statusText: 'Finalizing video file...',
            });
            setTimeout(() => {
              if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
              }
              resolve();
            }, 300);
            return;
          }

          // Advance to next scene immediately
          sceneStartTime = now;
          // Pre-cache subtitle lines for the new scene
          cachedSubtitleLines = this.computeSubtitleLines(
            ctx,
            activeScenes[currentSceneIdx]?.narrationText || '',
            width,
            videoSettings.subtitleSize
          );
          // Preload upcoming scene
          preloadSceneImage(currentSceneIdx + 1).catch(() => {});
        }

        // Fetch image from cache (or fallback)
        const sceneImg = imageCache.get(currentSceneIdx) || null;

        // Draw current frame
        this.drawSceneFrameOptimized(
          ctx,
          activeScenes[currentSceneIdx],
          sceneImg,
          sceneProgress,
          width,
          height,
          videoSettings,
          particles,
          cachedSubtitleLines
        );

        // Update progress callback every 10 frames to avoid React state spamming
        if (frameCounter % 10 === 0) {
          const overallPercent = Math.min(Math.round((totalElapsed / totalDurationSeconds) * 100), 99);
          onProgress({
            currentSceneIndex: currentSceneIdx,
            totalScenes: scenes.length,
            percent: Math.max(overallPercent, 10),
            elapsedSeconds: Math.min(totalElapsed, totalDurationSeconds),
            totalSeconds: totalDurationSeconds,
            statusText: `Rendering Scene ${currentSceneIdx + 1} of ${scenes.length}...`,
          });
        }

        // Cooperative yielding every 45 frames: allows Android UI event processing & GC
        if (frameCounter % 45 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }

        requestAnimationFrame(renderFrame);
      };

      requestAnimationFrame(renderFrame);
    });

    return recordPromise;
  }

  /**
   * Draws a single frame with Ken Burns zoom, vignette, particles, speedlines, and subtitles.
   */
  public drawSceneFrame(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    image: HTMLImageElement | null,
    progress: number,
    width: number,
    height: number,
    videoSettings: VideoSettings,
    particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }>
  ) {
    // 1. Clear background
    ctx.fillStyle = '#080511';
    ctx.fillRect(0, 0, width, height);

    // 2. Ken Burns Effect: Scale and gentle pan
    ctx.save();
    if (videoSettings.kenBurnsEffect) {
      // Zoom from 1.0 to 1.12 over the duration
      const scale = 1.0 + 0.12 * progress;
      const panX = (width * 0.04) * (progress - 0.5);
      const panY = (height * 0.03) * (progress - 0.5);

      ctx.translate(width / 2 + panX, height / 2 + panY);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
    }

    if (image && image.complete && image.naturalWidth > 0) {
      // Cover fit calculation
      const imgRatio = image.naturalWidth / image.naturalHeight;
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

      ctx.drawImage(image, drawX, drawY, drawW, drawH);
    } else {
      // Fallback graphic if image is missing
      ctx.fillStyle = '#160f29';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#9333ea';
      ctx.font = 'bold 36px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.fillText(`SCENE ${scene.order}`, width / 2, height / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#c084fc';
      ctx.fillText(scene.description.slice(0, 45) + '...', width / 2, height / 2 + 25);
    }
    ctx.restore();

    // 3. Manga Speed Lines (if enabled)
    if (videoSettings.mangaSpeedLines) {
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.08)';
      ctx.lineWidth = 1.5;
      const cx = width / 2;
      const cy = height * 0.45;
      for (let i = 0; i < 28; i++) {
        const angle = (Math.PI * 2 * i) / 28;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * (width * 0.28), cy + Math.sin(angle) * (width * 0.28));
        ctx.lineTo(cx + Math.cos(angle) * width, cy + Math.sin(angle) * width);
        ctx.stroke();
      }
    }

    // 4. Floating Dark Fantasy Violet Embers / Mist Particles
    if (videoSettings.darkFantasyParticles && particles) {
      ctx.save();
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < 0) {
          p.y = height + 5;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.fillStyle = `rgba(216, 180, 254, ${p.alpha})`;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Cinematic Vignette
    if (videoSettings.vignetteEffect) {
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.7, 'rgba(10, 6, 20, 0.4)');
      grad.addColorStop(1, 'rgba(5, 3, 10, 0.88)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 6. Scene Number Watermark / Badge (Top Left)
    ctx.save();
    ctx.fillStyle = 'rgba(15, 10, 28, 0.75)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
    ctx.lineWidth = 1.5;
    const badgeW = 140;
    const badgeH = 36;
    const pad = 24;
    ctx.fillRect(pad, pad, badgeW, badgeH);
    ctx.strokeRect(pad, pad, badgeW, badgeH);

    ctx.fillStyle = '#f3e8ff';
    ctx.font = 'bold 15px "Cinzel", serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCENE 0${scene.order}`, pad + 14, pad + 23);
    ctx.restore();

    // 7. Subtitles / Narration Caption Bar (Bottom)
    if (videoSettings.showSubtitles && scene.narrationText) {
      this.drawSubtitles(ctx, scene.narrationText, width, height, videoSettings.subtitleSize);
    }
  }

  /**
   * Optimized scene drawer using pre-computed subtitle lines to eliminate 18,000 text measurements per video.
   */
  public drawSceneFrameOptimized(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    image: HTMLImageElement | null,
    progress: number,
    width: number,
    height: number,
    videoSettings: VideoSettings,
    particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }>,
    subtitleLines: string[]
  ) {
    // 1. Clear background
    ctx.fillStyle = '#080511';
    ctx.fillRect(0, 0, width, height);

    // 2. Ken Burns Effect: Scale and gentle pan
    ctx.save();
    if (videoSettings.kenBurnsEffect) {
      const scale = 1.0 + 0.12 * progress;
      const panX = (width * 0.04) * (progress - 0.5);
      const panY = (height * 0.03) * (progress - 0.5);

      ctx.translate(width / 2 + panX, height / 2 + panY);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
    }

    if (image && image.complete && image.naturalWidth > 0) {
      const imgRatio = image.naturalWidth / image.naturalHeight;
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

      ctx.drawImage(image, drawX, drawY, drawW, drawH);
    } else {
      ctx.fillStyle = '#160f29';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#9333ea';
      ctx.font = 'bold 36px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.fillText(`SCENE ${scene.order}`, width / 2, height / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#c084fc';
      ctx.fillText(scene.description.slice(0, 45) + '...', width / 2, height / 2 + 25);
    }
    ctx.restore();

    // 3. Manga Speed Lines
    if (videoSettings.mangaSpeedLines) {
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.08)';
      ctx.lineWidth = 1.5;
      const cx = width / 2;
      const cy = height * 0.45;
      for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * (width * 0.28), cy + Math.sin(angle) * (width * 0.28));
        ctx.lineTo(cx + Math.cos(angle) * width, cy + Math.sin(angle) * width);
        ctx.stroke();
      }
    }

    // 4. Floating Dark Fantasy Violet Embers
    if (videoSettings.darkFantasyParticles && particles) {
      ctx.save();
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < 0) {
          p.y = height + 5;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.fillStyle = `rgba(216, 180, 254, ${p.alpha})`;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Cinematic Vignette
    if (videoSettings.vignetteEffect) {
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.7, 'rgba(10, 6, 20, 0.4)');
      grad.addColorStop(1, 'rgba(5, 3, 10, 0.88)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 6. Scene Number Watermark / Badge
    ctx.save();
    ctx.fillStyle = 'rgba(15, 10, 28, 0.75)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
    ctx.lineWidth = 1.5;
    const badgeW = 140;
    const badgeH = 36;
    const pad = 24;
    ctx.fillRect(pad, pad, badgeW, badgeH);
    ctx.strokeRect(pad, pad, badgeW, badgeH);

    ctx.fillStyle = '#f3e8ff';
    ctx.font = 'bold 15px "Cinzel", serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCENE 0${scene.order}`, pad + 14, pad + 23);
    ctx.restore();

    // 7. Subtitles rendered with cached line breakdown
    if (videoSettings.showSubtitles && subtitleLines.length > 0) {
      this.drawPrecomputedSubtitles(ctx, subtitleLines, width, height, videoSettings.subtitleSize);
    }
  }

  /**
   * Pre-computes line wrapping for subtitles ONCE per scene to avoid 60fps text measurement spikes.
   */
  public computeSubtitleLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    size: 'small' | 'medium' | 'large'
  ): string[] {
    if (!text) return [];
    const fontSize = size === 'small' ? 22 : size === 'large' ? 32 : 26;
    ctx.save();
    ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", "Rozha One", sans-serif`;
    const maxWidth = width * 0.82;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    ctx.restore();
    return lines;
  }

  /**
   * Renders pre-computed subtitle lines cleanly.
   */
  private drawPrecomputedSubtitles(
    ctx: CanvasRenderingContext2D,
    lines: string[],
    width: number,
    height: number,
    size: 'small' | 'medium' | 'large'
  ) {
    if (!lines || lines.length === 0) return;
    ctx.save();
    const fontSize = size === 'small' ? 22 : size === 'large' ? 32 : 26;
    ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", "Rozha One", sans-serif`;
    ctx.textAlign = 'center';

    const lineHeight = fontSize * 1.35;
    const totalTextHeight = lines.length * lineHeight;
    const boxPaddingY = 14;
    const boxPaddingX = 26;
    const boxBottomMargin = height * 0.08;
    const boxY = height - boxBottomMargin - totalTextHeight - boxPaddingY * 2;

    const maxWidth = width * 0.82;
    const boxHeight = totalTextHeight + boxPaddingY * 2;
    const boxWidth = Math.min(width * 0.88, maxWidth + boxPaddingX * 2);
    const boxX = (width - boxWidth) / 2;

    ctx.fillStyle = 'rgba(12, 9, 24, 0.85)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(boxX, boxY, boxWidth, boxHeight, 10);
    } else {
      ctx.rect(boxX, boxY, boxWidth, boxHeight);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(147, 51, 234, 0.8)';
    ctx.shadowBlur = 8;

    lines.forEach((line, idx) => {
      const lineY = boxY + boxPaddingY + (idx + 0.78) * lineHeight;
      ctx.fillText(line, width / 2, lineY);
    });

    ctx.restore();
  }

  /**
   * Draws cinematic anime subtitles at the lower portion of the frame (legacy fallback).
   */
  private drawSubtitles(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number,
    size: 'small' | 'medium' | 'large'
  ) {
    const lines = this.computeSubtitleLines(ctx, text, width, size);
    this.drawPrecomputedSubtitles(ctx, lines, width, height, size);
  }
}

export const videoExporter = new VideoExporter();
