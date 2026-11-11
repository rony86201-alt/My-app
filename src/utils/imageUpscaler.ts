/**
 * Client-Side Image Upscaler and Post-Processing Engine
 * Performs 2x resolution enhancement, unsharp mask edge sharpening,
 * and contrast fine-tuning on HTML5 Canvas without server dependencies.
 */

export interface UpscaleOptions {
  scaleFactor?: number; // default 2 (e.g. 720p -> 1440p)
  sharpenStrength?: number; // 0 to 1, default 0.35
  contrastBoost?: number; // -0.5 to 0.5, default 0.08
  saturationBoost?: number; // -0.5 to 0.5, default 0.05
}

export interface UpscaleResult {
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  upscaledWidth: number;
  upscaledHeight: number;
  fileSizeBytes: number;
  processingTimeMs: number;
}

export async function upscaleAndEnhanceImage(
  sourceUrl: string,
  options: UpscaleOptions = {}
): Promise<UpscaleResult> {
  const startTime = performance.now();
  const scale = options.scaleFactor || 2;
  const sharpen = options.sharpenStrength ?? 0.35;
  const contrast = options.contrastBoost ?? 0.08;
  const saturation = options.saturationBoost ?? 0.05;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;
        const targetWidth = Math.round(origWidth * scale);
        const targetHeight = Math.round(origHeight * scale);

        // Step 1: Render with multi-step bilinear / high-quality smoothing
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Step 2: Apply pixel-level Unsharp Mask & Color Grading if requested
        if (sharpen > 0 || contrast !== 0 || saturation !== 0) {
          const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const data = imgData.data;

          // Contrast & Saturation adjust
          const contrastFactor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Contrast
            if (contrast !== 0) {
              r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
              g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
              b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));
            }

            // Saturation boost
            if (saturation !== 0) {
              const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
              r = Math.min(255, Math.max(0, gray + (1 + saturation) * (r - gray)));
              g = Math.min(255, Math.max(0, gray + (1 + saturation) * (g - gray)));
              b = Math.min(255, Math.max(0, gray + (1 + saturation) * (b - gray)));
            }

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
          }

          // Unsharp Mask edge sharpening (Laplacian kernel convolution)
          if (sharpen > 0 && targetWidth <= 2560) {
            applyLaplacianSharpen(data, targetWidth, targetHeight, sharpen);
          }

          ctx.putImageData(imgData, 0, 0);
        }

        const outDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const approxBytes = Math.round((outDataUrl.length - 22) * 0.75);

        resolve({
          dataUrl: outDataUrl,
          originalWidth: origWidth,
          originalHeight: origHeight,
          upscaledWidth: targetWidth,
          upscaledHeight: targetHeight,
          fileSizeBytes: approxBytes,
          processingTimeMs: Math.round(performance.now() - startTime)
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for upscaling. Verify CORS or image format.'));
    };

    img.src = sourceUrl;
  });
}

/**
 * 3x3 Laplacian edge-sharpening convolution
 */
function applyLaplacianSharpen(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number
): void {
  const copy = new Uint8ClampedArray(pixels);
  const w = width;
  const s = Math.min(1.0, Math.max(0.1, strength));

  // Kernel:
  // [ 0,  -s,   0 ]
  // [-s, 1+4s, -s ]
  // [ 0,  -s,   0 ]
  const center = 1 + 4 * s;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * w + x) * 4;

      const top = ((y - 1) * w + x) * 4;
      const bottom = ((y + 1) * w + x) * 4;
      const left = (y * w + (x - 1)) * 4;
      const right = (y * w + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const val = center * copy[idx + c]
          - s * (copy[top + c] + copy[bottom + c] + copy[left + c] + copy[right + c]);
        pixels[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }
}

export async function upscaleMangaImage2x(sourceUrl: string): Promise<UpscaleResult> {
  return upscaleAndEnhanceImage(sourceUrl, {
    scaleFactor: 2,
    sharpenStrength: 0.35,
    contrastBoost: 0.08,
    saturationBoost: 0.06
  });
}

export async function enhanceMangaImageColors(
  sourceUrl: string,
  contrast = 1.08,
  saturation = 1.10
): Promise<UpscaleResult> {
  return upscaleAndEnhanceImage(sourceUrl, {
    scaleFactor: 1,
    sharpenStrength: 0.25,
    contrastBoost: contrast - 1,
    saturationBoost: saturation - 1
  });
}
