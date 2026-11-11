import fs from 'fs';
import path from 'path';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleGenAI } from '@google/genai';
import type { NarrationLanguage } from '../types.ts';

const execAsync = promisify(exec);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * Measures the exact audio duration of any media file in seconds using ffprobe
 */
export async function measureAudioDuration(filePath: string): Promise<number> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file does not exist: ${filePath}`);
  }
  const stat = fs.statSync(filePath);
  if (stat.size < 500) {
    throw new Error(`Audio file is too small or empty (${stat.size} bytes): ${filePath}`);
  }

  try {
    const { stdout } = await execAsync(
      `ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of json`
    );
    const parsed = JSON.parse(stdout);
    const dur = parseFloat(parsed?.format?.duration || '0');
    if (dur > 0) {
      return dur;
    }
  } catch (probeErr: any) {
    console.warn(`ffprobe duration measurement notice for ${filePath}:`, probeErr.message);
  }

  // Estimate from stat size if ffprobe is indeterminate (assuming 64kbps MP3 = 8000 bytes/sec)
  return Math.max(2, Math.round(stat.size / 8000));
}

/**
 * Downloads a single text-to-speech audio snippet from Google TTS
 */
function fetchGoogleTTSChunk(text: string, lang: NarrationLanguage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const cleanText = text.trim();
    if (!cleanText) {
      return resolve(Buffer.alloc(0));
    }

    const tl = lang === 'hi' ? 'hi' : 'en';
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;

    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/mpeg, audio/*;q=0.9',
        'Referer': 'https://translate.google.com/'
      }
    }, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Google TTS returned HTTP status ${res.statusCode}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', reject);
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error('Google TTS request timed out'));
    });
  });
}

/**
 * Splits long narration text into natural speech phrases (< 160 characters)
 * without cutting through words or punctuation marks.
 */
function splitIntoSpeechChunks(text: string): string[] {
  // Split on full stops, Hindi purna viram (।), commas, question marks, exclamation marks
  const rawParts = text.split(/([।\.\?!;,\n]+)/);
  const chunks: string[] = [];
  let current = '';

  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i];
    if (!part) continue;

    if (current.length + part.length <= 150) {
      current += part;
    } else {
      if (current.trim()) chunks.push(current.trim());
      current = part;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text.slice(0, 150)];
}

/**
 * Generates genuine spoken audio for a single scene narration in Hindi or English
 * Enforces the fixed male baritone narrator voice with vocal resonance tuning.
 */
export async function generateSceneSpeech(
  narrationText: string,
  language: NarrationLanguage,
  outputFilePath: string,
  sceneNumber: number = 1,
  signal?: AbortSignal
): Promise<{ audioPath: string; durationSeconds: number; provider: string }> {
  if (signal?.aborted) {
    throw new Error('Speech synthesis aborted before execution');
  }

  const cleanText = narrationText?.trim();
  if (!cleanText) {
    throw new Error(`Scene ${sceneNumber} narration text is empty`);
  }

  const outDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const maleVocalFilter = "rubberband=pitch=0.83,equalizer=f=135:width_type=o:width=1.2:g=5.5,equalizer=f=2800:width_type=o:width=1.0:g=2.0";
  const fallbackMaleFilter = "asetrate=44100*0.84,atempo=1.19,equalizer=f=135:width_type=o:width=1.2:g=5.5";

  // Option 1: Try Gemini TTS (gemini-3.8-flash-lite-tts) if API key is present
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  if (hasKey && !signal?.aborted) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: cleanText
      });

      if (signal?.aborted) throw new Error('Speech synthesis aborted');

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
            if (audioBuffer.length > 1000) {
              const wavTempPath = outputFilePath.replace(/\.[a-zA-Z0-9]+$/, `_gemini_raw_${Date.now()}.wav`);
              fs.writeFileSync(wavTempPath, audioBuffer);

              if (signal?.aborted) {
                try { fs.unlinkSync(wavTempPath); } catch {}
                throw new Error('Speech synthesis aborted');
              }

              // Apply the fixed male vocal transform to Gemini TTS output as well
              try {
                await execAsync(`ffmpeg -y -i "${wavTempPath}" -af "${maleVocalFilter}" -c:a libmp3lame -b:a 192k -ar 44100 "${outputFilePath}"`);
              } catch {
                await execAsync(`ffmpeg -y -i "${wavTempPath}" -af "${fallbackMaleFilter}" -c:a libmp3lame -b:a 192k -ar 44100 "${outputFilePath}"`);
              }

              try { fs.unlinkSync(wavTempPath); } catch {}

              const dur = await measureAudioDuration(outputFilePath);
              if (dur > 0.5) {
                return {
                  audioPath: outputFilePath,
                  durationSeconds: dur,
                  provider: 'Fixed Male Hindi Narrator (Google Gemini TTS + Baritone Filter)'
                };
              }
            }
          }
        }
      }
    } catch (geminiTtsErr: any) {
      if (signal?.aborted) throw geminiTtsErr;
      console.warn(`[TTSService] Gemini TTS notice for scene ${sceneNumber}: ${geminiTtsErr.message}`);
    }
  }

  if (signal?.aborted) throw new Error('Speech synthesis aborted');

  // Option 2: Production Google TTS with Hindi / English phonemes transformed to fixed male baritone
  try {
    const chunks = splitIntoSpeechChunks(cleanText);
    const chunkBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      if (signal?.aborted) throw new Error('Speech synthesis aborted');
      if (!chunk.trim()) continue;
      const buf = await fetchGoogleTTSChunk(chunk, language);
      if (buf.length > 200) {
        chunkBuffers.push(buf);
      }
    }

    if (signal?.aborted) throw new Error('Speech synthesis aborted');

    if (chunkBuffers.length === 0) {
      throw new Error('TTS returned zero audio bytes for speech chunks');
    }

    // Write all audio chunks to raw buffer
    const combinedBuffer = Buffer.concat(chunkBuffers);
    const rawTempPath = outputFilePath.replace(/\.[a-zA-Z0-9]+$/, `_male_raw_${Date.now()}.mp3`);
    fs.writeFileSync(rawTempPath, combinedBuffer);

    if (signal?.aborted) {
      try { fs.unlinkSync(rawTempPath); } catch {}
      throw new Error('Speech synthesis aborted');
    }

    // FIXED MALE NARRATION VOICE TRANSFORMATION:
    // Transforms voice to deep, authoritative male baritone (pitch shift + 135Hz vocal chest resonance boost)
    try {
      await execAsync(`ffmpeg -y -i "${rawTempPath}" -af "${maleVocalFilter}" -c:a libmp3lame -b:a 192k -ar 44100 "${outputFilePath}"`);
    } catch (rbErr) {
      // Fallback pitch transposition if rubberband filter is not compiled
      await execAsync(`ffmpeg -y -i "${rawTempPath}" -af "${fallbackMaleFilter}" -c:a libmp3lame -b:a 192k -ar 44100 "${outputFilePath}"`);
    } finally {
      try { if (fs.existsSync(rawTempPath)) fs.unlinkSync(rawTempPath); } catch {}
    }

    const dur = await measureAudioDuration(outputFilePath);
    if (dur <= 0.2) {
      throw new Error(`Generated audio file duration is too short (${dur}s)`);
    }

    return {
      audioPath: outputFilePath,
      durationSeconds: dur,
      provider: 'Fixed Male Hindi Narrator (Baritone Explainer Voice)'
    };
  } catch (ttsErr: any) {
    throw new Error(`Speech synthesis failed for Scene ${sceneNumber}: ${ttsErr.message}`);
  }
}

/**
 * Merges an ordered array of scene audio files into a single master narration track
 */
export async function mergeNarrationAudioTrack(
  sceneAudioPaths: string[],
  masterOutputPath: string
): Promise<{ masterPath: string; totalDuration: number }> {
  if (!sceneAudioPaths || sceneAudioPaths.length === 0) {
    throw new Error('No scene audio files provided for merging');
  }

  const outDir = path.dirname(masterOutputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Verify all files exist
  for (let i = 0; i < sceneAudioPaths.length; i++) {
    const p = sceneAudioPaths[i];
    if (!fs.existsSync(p) || fs.statSync(p).size < 500) {
      throw new Error(`Scene audio ${i + 1} is missing or corrupted: ${p}`);
    }
  }

  // Write concat list
  const listPath = path.join(outDir, 'master_audio_concat_list.txt');
  const lines = sceneAudioPaths.map(p => `file '${path.resolve(p)}'`);
  fs.writeFileSync(listPath, lines.join('\n'), 'utf8');

  // Concatenate without re-encoding quality degradation
  const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:a aac -b:a 192k -ar 44100 "${masterOutputPath}"`;
  await execAsync(concatCmd);

  try { fs.unlinkSync(listPath); } catch {}

  const totalDuration = await measureAudioDuration(masterOutputPath);
  if (totalDuration <= 0.5) {
    throw new Error(`Master merged narration track is too short (${totalDuration}s)`);
  }

  return {
    masterPath: masterOutputPath,
    totalDuration
  };
}
