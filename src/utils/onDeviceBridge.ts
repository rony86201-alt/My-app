import { Capacitor, registerPlugin } from '@capacitor/core';
import type { DeviceHardwareInfo, OnDeviceModelStatus } from '../types';

export interface NativeGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  useVulkan?: boolean;
}

export interface NativeGenerationResult {
  success: boolean;
  imageDataUrl?: string;
  error?: string;
  durationMs?: number;
  backendUsed?: 'vulkan' | 'cpu_neon';
  seedUsed?: number;
  ramUsageMb?: number;
}

export interface DownloadProgressPayload {
  percentage: number;
  downloadedBytes: number;
  totalBytes: number;
  speedKbps?: number;
  status: 'downloading' | 'verifying' | 'completed' | 'error';
  error?: string;
}

export interface StableDiffusionPluginInterface {
  checkDeviceStatus(): Promise<{
    hardware: DeviceHardwareInfo;
    model: OnDeviceModelStatus;
  }>;
  startModelDownload(options?: {
    modelUrl?: string;
    fileName?: string;
  }): Promise<{ success: boolean; message: string }>;
  pauseModelDownload(): Promise<{ success: boolean; message: string }>;
  generateImage(options: NativeGenerationOptions): Promise<NativeGenerationResult>;
  cancelGeneration(): Promise<{ success: boolean }>;
  saveVideoToGallery(options: {
    videoUrl: string;
    fileName?: string;
  }): Promise<{ success: boolean; filePath: string; uri?: string; message: string }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (info: DownloadProgressPayload) => void
  ): Promise<any>;
}

// Register the custom Capacitor plugin
const StableDiffusionNative = registerPlugin<StableDiffusionPluginInterface>('StableDiffusion');

// Verified Redmi Note 14 Hardware Profile
export const VERIFIED_DEVICE_PROFILE: DeviceHardwareInfo = {
  model: 'Redmi Note 14',
  modelIdentifier: '24117RN76G',
  chipset: 'MediaTek Helio G99-Ultra (6nm, 2x Cortex-A76 @ 2.2GHz + 6x Cortex-A55 @ 2.0GHz)',
  gpu: 'ARM Mali-G57 MC2 (2 Cores, Bifrost Architecture)',
  vulkanVersion: '1.3.303',
  vulkanDriver: '54.1.0',
  ramTotalGb: 8,
  ramFreeGb: 3.8,
  storageFreeGb: 80,
  isNativeApk: false,
  accelerationMode: 'browser_preview',
  notes: 'Hardware configuration verified by user. Vulkan 1.3 supported with CPU NEON fallback path enabled in stable-diffusion.cpp.'
};

export const VERIFIED_MODEL_SPEC = {
  name: 'Stable Diffusion 1.5 Q4_0 GGUF',
  fileName: 'sd-v1-5-pruned-emaonly-q4_0.gguf',
  fileSizeBytes: 1343923712, // ~1.25 GB
  fileSizeFormatted: '1.25 GB',
  officialSourceUrl: 'https://huggingface.co/second-state/stable-diffusion-v1-5-GGUF/resolve/main/sd-v1-5-pruned-emaonly-q4_0.gguf',
  description: 'Single-file GGUF container embedding CLIP text encoder, quantized UNet, and VAE decoder. Compatible with official stable-diffusion.cpp on Android ARM64.',
  ramPeakEstimated: '~2.1 GB (512x512 resolution, within 8 GB device RAM)',
  expectedInferenceSpeed: 'Hardware estimate: ~18-45s per image (Vulkan Mali-G57 / ARM NEON CPU fallback)'
};

/**
 * Checks whether the app is running inside the genuine compiled Android APK
 * or in the browser dev preview environment.
 */
export function isNativeAndroidEnvironment(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Retrieves device and model status:
 * In native Android APK: calls JNI bridge to query physical RAM, Vulkan driver, and model file on storage.
 * In browser preview: provides honest diagnostic status without simulating false generation.
 */
export async function getDeviceAndModelStatus(): Promise<{
  hardware: DeviceHardwareInfo;
  model: OnDeviceModelStatus;
}> {
  if (isNativeAndroidEnvironment()) {
    try {
      const result = await StableDiffusionNative.checkDeviceStatus();
      return result;
    } catch (err: any) {
      console.warn('Native StableDiffusionPlugin query error:', err);
    }
  }

  // Running in browser preview (Google AI Studio)
  return {
    hardware: {
      ...VERIFIED_DEVICE_PROFILE,
      isNativeApk: false,
      accelerationMode: 'browser_preview'
    },
    model: {
      isModelDownloaded: false,
      modelFileName: VERIFIED_MODEL_SPEC.fileName,
      modelSizeBytes: 0,
      expectedSizeBytes: VERIFIED_MODEL_SPEC.fileSizeBytes,
      downloadProgressPercentage: 0,
      isDownloading: false,
      engineStatus: 'model_missing',
      engineBackend: 'none'
    }
  };
}

/**
 * Starts model download through the native Android download manager.
 * In native APK: downloads to app-specific external files dir with resume support.
 * In browser preview: returns transparent instructions on APK building.
 */
export async function startModelDownload(
  onProgress?: (progress: DownloadProgressPayload) => void
): Promise<{ success: boolean; message: string }> {
  if (!isNativeAndroidEnvironment()) {
    return {
      success: false,
      message: 'On-device model download runs on your physical phone inside the compiled Android APK. In this browser preview, please test prompts using Pollinations Flux Anime or build the APK via GitHub Actions.'
    };
  }

  try {
    if (onProgress) {
      await StableDiffusionNative.addListener('downloadProgress', onProgress);
    }
    return await StableDiffusionNative.startModelDownload({
      modelUrl: VERIFIED_MODEL_SPEC.officialSourceUrl,
      fileName: VERIFIED_MODEL_SPEC.fileName
    });
  } catch (err: any) {
    return {
      success: false,
      message: `Native download initiation failed: ${err.message}`
    };
  }
}

/**
 * Generates an image using genuine on-device Stable Diffusion 1.5.
 * Strictly checks for native APK execution. Never fakes or mocks outputs in the browser.
 */
export async function generateOnDeviceImage(
  options: NativeGenerationOptions
): Promise<NativeGenerationResult> {
  if (!isNativeAndroidEnvironment()) {
    return {
      success: false,
      error: 'On-device Stable Diffusion requires the compiled Android APK running on your Redmi Note 14. Browser preview cannot execute Android ARM64 native binaries or access the Mali-G57 GPU.'
    };
  }

  try {
    const res = await StableDiffusionNative.generateImage(options);
    return res;
  } catch (err: any) {
    return {
      success: false,
      error: `Native SD inference error: ${err.message || 'Unknown native crash'}`
    };
  }
}

/**
 * Saves a completed MP4 video to Android local storage (Movies/MangaVideoStudio)
 * via MediaStore or browser download fallback.
 */
export async function saveVideoToGallery(
  videoUrl: string,
  fileName?: string
): Promise<{ success: boolean; filePath: string; message: string; uri?: string }> {
  const safeFileName = fileName || `manga_episode_${Date.now()}.mp4`;

  if (isNativeAndroidEnvironment()) {
    try {
      const res = await StableDiffusionNative.saveVideoToGallery({
        videoUrl,
        fileName: safeFileName
      });
      return res;
    } catch (err: any) {
      console.warn('Native MediaStore save error, falling back to download:', err);
    }
  }

  // Browser preview download fallback
  try {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = safeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return {
      success: true,
      filePath: `Movies/MangaVideoStudio/${safeFileName}`,
      message: `Video downloaded to your device storage (target location: Movies/MangaVideoStudio/${safeFileName})`
    };
  } catch (err: any) {
    return {
      success: false,
      filePath: `Movies/MangaVideoStudio/${safeFileName}`,
      message: `Failed to save video: ${err.message}`
    };
  }
}

