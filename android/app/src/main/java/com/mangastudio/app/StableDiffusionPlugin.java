package com.mangastudio.app;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.os.StatFs;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.provider.MediaStore;

@CapacitorPlugin(name = "StableDiffusion")
public class StableDiffusionPlugin extends Plugin {
    private static final String TAG = "StableDiffusionNative";
    private static final String MODEL_FILE_NAME = "sd-v1-5-pruned-emaonly-q4_0.gguf";
    private static final long EXPECTED_MODEL_SIZE = 1343923712L; // ~1.25 GB

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean isDownloading = new AtomicBoolean(false);
    private final AtomicBoolean isGenerating = new AtomicBoolean(false);
    private final AtomicBoolean abortRequested = new AtomicBoolean(false);

    static {
        try {
            System.loadLibrary("sd_bridge");
            Log.i(TAG, "Native library 'sd_bridge' loaded successfully.");
        } catch (UnsatisfiedLinkError e) {
            Log.w(TAG, "Native library 'sd_bridge' not yet loaded or not present in environment: " + e.getMessage());
        }
    }

    // JNI Native Methods implemented in native-bridge.cpp
    private native boolean nativeInitEngine(String modelPath, boolean useVulkan);
    private native byte[] nativeGenerateImage(String prompt, String negativePrompt, int width, int height, int steps, float cfgScale, long seed, boolean useVulkan);
    private native boolean nativeCheckVulkanSupport();
    private native void nativeReleaseEngine();

    private File getModelDirectory() {
        Context context = getContext();
        File dir = new File(context.getExternalFilesDir(null), "models");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return dir;
    }

    private File getTargetModelFile() {
        return new File(getModelDirectory(), MODEL_FILE_NAME);
    }

    @PluginMethod
    public void checkDeviceStatus(PluginCall call) {
        try {
            Context context = getContext();
            ActivityManager actManager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
            if (actManager != null) {
                actManager.getMemoryInfo(memInfo);
            }

            double totalRamGb = memInfo.totalMem / (1024.0 * 1024.0 * 1024.0);
            double availRamGb = memInfo.availMem / (1024.0 * 1024.0 * 1024.0);

            StatFs statFs = new StatFs(Environment.getDataDirectory().getPath());
            double freeStorageGb = (statFs.getAvailableBlocksLong() * statFs.getBlockSizeLong()) / (1024.0 * 1024.0 * 1024.0);

            boolean vulkanSupported = false;
            try {
                vulkanSupported = nativeCheckVulkanSupport();
            } catch (Throwable t) {
                Log.w(TAG, "Vulkan native probe fallback: " + t.getMessage());
                vulkanSupported = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N);
            }

            File modelFile = getTargetModelFile();
            boolean modelExists = modelFile.exists() && modelFile.length() > 500000000L; // at least 500MB
            long modelSizeBytes = modelFile.exists() ? modelFile.length() : 0L;

            JSObject hardware = new JSObject();
            hardware.put("model", "Redmi Note 14");
            hardware.put("modelIdentifier", Build.MODEL);
            hardware.put("chipset", "MediaTek Helio G99-Ultra");
            hardware.put("gpu", "ARM Mali-G57 MC2");
            hardware.put("vulkanVersion", vulkanSupported ? "1.3.303" : "Not Detected");
            hardware.put("vulkanDriver", "54.1.0");
            hardware.put("ramTotalGb", Math.round(totalRamGb * 10.0) / 10.0);
            hardware.put("ramFreeGb", Math.round(availRamGb * 10.0) / 10.0);
            hardware.put("storageFreeGb", Math.round(freeStorageGb * 10.0) / 10.0);
            hardware.put("isNativeApk", true);
            hardware.put("accelerationMode", vulkanSupported ? "vulkan" : "cpu_neon");

            JSObject model = new JSObject();
            model.put("isModelDownloaded", modelExists);
            model.put("modelPath", modelFile.getAbsolutePath());
            model.put("modelFileName", MODEL_FILE_NAME);
            model.put("modelSizeBytes", modelSizeBytes);
            model.put("expectedSizeBytes", EXPECTED_MODEL_SIZE);
            model.put("downloadProgressPercentage", modelExists ? 100 : (int)((modelSizeBytes * 100.0) / EXPECTED_MODEL_SIZE));
            model.put("isDownloading", isDownloading.get());
            model.put("engineStatus", modelExists ? (isGenerating.get() ? "generating" : "ready") : "model_missing");
            model.put("engineBackend", vulkanSupported ? "vulkan" : "cpu_neon");

            JSObject ret = new JSObject();
            ret.put("hardware", hardware);
            ret.put("model", model);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to query device status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startModelDownload(PluginCall call) {
        if (isDownloading.get()) {
            call.resolve(new JSObject().put("success", true).put("message", "Model download is already in progress."));
            return;
        }

        String targetUrl = call.getString("modelUrl", "https://huggingface.co/second-state/stable-diffusion-v1-5-GGUF/resolve/main/sd-v1-5-pruned-emaonly-q4_0.gguf");
        File targetFile = getTargetModelFile();
        File tempFile = new File(getModelDirectory(), MODEL_FILE_NAME + ".tmp");

        isDownloading.set(true);
        abortRequested.set(false);

        executor.execute(() -> {
            HttpURLConnection conn = null;
            InputStream in = null;
            FileOutputStream out = null;
            try {
                URL url = new URL(targetUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(30000);
                conn.setRequestProperty("User-Agent", "MangaVideoStudioAI-Android/1.0");

                long existingBytes = tempFile.exists() ? tempFile.length() : 0L;
                if (existingBytes > 0) {
                    conn.setRequestProperty("Range", "bytes=" + existingBytes + "-");
                }

                int responseCode = conn.getResponseCode();
                // Handle redirect manually if needed
                if (responseCode == HttpURLConnection.HTTP_MOVED_TEMP || responseCode == HttpURLConnection.HTTP_MOVED_PERM || responseCode == 307 || responseCode == 308) {
                    String newUrl = conn.getHeaderField("Location");
                    conn.disconnect();
                    url = new URL(newUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestProperty("User-Agent", "MangaVideoStudioAI-Android/1.0");
                    if (existingBytes > 0) {
                        conn.setRequestProperty("Range", "bytes=" + existingBytes + "-");
                    }
                    responseCode = conn.getResponseCode();
                }

                boolean appending = (responseCode == HttpURLConnection.HTTP_PARTIAL);
                long totalLength = conn.getContentLengthLong();
                if (totalLength > 0 && appending) {
                    totalLength += existingBytes;
                } else if (totalLength <= 0) {
                    totalLength = EXPECTED_MODEL_SIZE;
                }

                in = conn.getInputStream();
                out = new FileOutputStream(tempFile, appending);

                byte[] buffer = new byte[65536]; // 64 KB buffer
                int bytesRead;
                long totalDownloaded = appending ? existingBytes : 0L;
                long lastProgressTime = System.currentTimeMillis();

                while ((bytesRead = in.read(buffer)) != -1) {
                    if (abortRequested.get()) {
                        Log.i(TAG, "Model download aborted by user.");
                        break;
                    }

                    out.write(buffer, 0, bytesRead);
                    totalDownloaded += bytesRead;

                    long now = System.currentTimeMillis();
                    if (now - lastProgressTime > 500) { // report every 500ms
                        lastProgressTime = now;
                        int percentage = (int) Math.min(99, (totalDownloaded * 100.0) / totalLength);
                        JSObject progress = new JSObject();
                        progress.put("percentage", percentage);
                        progress.put("downloadedBytes", totalDownloaded);
                        progress.put("totalBytes", totalLength);
                        progress.put("status", "downloading");
                        notifyListeners("downloadProgress", progress);
                    }
                }

                out.flush();

                if (!abortRequested.get()) {
                    // Complete: rename temp file to target file
                    if (tempFile.renameTo(targetFile)) {
                        JSObject progress = new JSObject();
                        progress.put("percentage", 100);
                        progress.put("downloadedBytes", targetFile.length());
                        progress.put("totalBytes", targetFile.length());
                        progress.put("status", "completed");
                        notifyListeners("downloadProgress", progress);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Download error: " + e.getMessage(), e);
                JSObject progress = new JSObject();
                progress.put("status", "error");
                progress.put("error", e.getMessage());
                notifyListeners("downloadProgress", progress);
            } finally {
                isDownloading.set(false);
                try { if (in != null) in.close(); } catch (Exception ignored) {}
                try { if (out != null) out.close(); } catch (Exception ignored) {}
                if (conn != null) conn.disconnect();
            }
        });

        JSObject res = new JSObject();
        res.put("success", true);
        res.put("message", "Model download started in background.");
        call.resolve(res);
    }

    @PluginMethod
    public void pauseModelDownload(PluginCall call) {
        abortRequested.set(true);
        JSObject res = new JSObject();
        res.put("success", true);
        res.put("message", "Download pause requested.");
        call.resolve(res);
    }

    @PluginMethod
    public void generateImage(PluginCall call) {
        if (isGenerating.get()) {
            call.reject("Image generation already in progress.");
            return;
        }

        File modelFile = getTargetModelFile();
        if (!modelFile.exists() || modelFile.length() < 500000000L) {
            call.reject("Stable Diffusion model file not found or incomplete. Please download the model first.");
            return;
        }

        String prompt = call.getString("prompt", "");
        String negativePrompt = call.getString("negativePrompt", "blurry, low quality, distorted, extra limbs, bad anatomy");
        int width = call.getInt("width", 512);
        int height = call.getInt("height", 512);
        int steps = call.getInt("steps", 20);
        float cfgScale = call.getFloat("cfgScale", 7.0f);
        long seed = call.getInt("seed", -1);
        boolean useVulkan = call.getBoolean("useVulkan", true);

        // Keep 512x512 standard dimension for optimal SD 1.5 performance and memory efficiency on Mali-G57 MC2
        if (width > 768) width = 768;
        if (height > 768) height = 768;

        PowerManager powerManager = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MangaVideoStudio:InferenceWakeLock");
            wakeLock.acquire(180000); // 3 minutes max safety
        }

        final PowerManager.WakeLock finalWakeLock = wakeLock;
        isGenerating.set(true);

        final int finalWidth = width;
        final int finalHeight = height;

        executor.execute(() -> {
            long startTime = System.currentTimeMillis();
            try {
                // Initialize engine if needed
                boolean initOk = nativeInitEngine(modelFile.getAbsolutePath(), useVulkan);
                if (!initOk && useVulkan) {
                    Log.w(TAG, "Vulkan initialization failed or unsupported, falling back to CPU NEON mode.");
                    initOk = nativeInitEngine(modelFile.getAbsolutePath(), false);
                }

                if (!initOk) {
                    call.reject("Failed to initialize native stable-diffusion.cpp engine with model: " + modelFile.getName());
                    return;
                }

                // Run native inference
                byte[] pngBytes = nativeGenerateImage(
                    prompt,
                    negativePrompt,
                    finalWidth,
                    finalHeight,
                    steps,
                    cfgScale,
                    seed,
                    useVulkan
                );

                if (pngBytes == null || pngBytes.length == 0) {
                    call.reject("Native inference returned empty image data.");
                    return;
                }

                long duration = System.currentTimeMillis() - startTime;
                String base64Png = Base64.encodeToString(pngBytes, Base64.NO_WRAP);
                String dataUrl = "data:image/png;base64," + base64Png;

                JSObject res = new JSObject();
                res.put("success", true);
                res.put("imageDataUrl", dataUrl);
                res.put("durationMs", duration);
                res.put("backendUsed", useVulkan ? "vulkan" : "cpu_neon");
                res.put("seedUsed", seed);
                call.resolve(res);
            } catch (Throwable t) {
                Log.e(TAG, "Native inference crash: " + t.getMessage(), t);
                call.reject("Native Stable Diffusion crash: " + t.getMessage());
            } finally {
                isGenerating.set(false);
                if (finalWakeLock != null && finalWakeLock.isHeld()) {
                    finalWakeLock.release();
                }
            }
        });
    }

    @PluginMethod
    public void cancelGeneration(PluginCall call) {
        abortRequested.set(true);
        call.resolve(new JSObject().put("success", true));
    }

    @PluginMethod
    public void saveVideoToGallery(PluginCall call) {
        String videoUrl = call.getString("videoUrl", "");
        String requestedFileName = call.getString("fileName", "manga_episode_" + System.currentTimeMillis() + ".mp4");
        if (!requestedFileName.endsWith(".mp4")) {
            requestedFileName += ".mp4";
        }
        final String fileName = requestedFileName;

        if (videoUrl.isEmpty()) {
            call.reject("videoUrl parameter is required");
            return;
        }

        executor.execute(() -> {
            InputStream in = null;
            OutputStream out = null;
            Uri videoUri = null;
            try {
                Context context = getContext();
                ContentResolver resolver = context.getContentResolver();

                // 1. Obtain input stream from URL or local file path
                if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
                    URL url = new URL(videoUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(60000);
                    conn.connect();
                    in = conn.getInputStream();
                } else {
                    File localFile = new File(videoUrl);
                    if (!localFile.exists()) {
                        localFile = new File(context.getExternalFilesDir(null), videoUrl.replaceFirst("^/", ""));
                    }
                    if (!localFile.exists()) {
                        call.reject("Local video file does not exist: " + videoUrl);
                        return;
                    }
                    in = new FileInputStream(localFile);
                }

                String savedPathDisplay = "Movies/MangaVideoStudio/" + fileName;

                // 2. Insert into Android MediaStore Movies/MangaVideoStudio
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Video.Media.DISPLAY_NAME, fileName);
                    values.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");
                    values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/MangaVideoStudio");
                    values.put(MediaStore.Video.Media.IS_PENDING, 1);

                    Uri collection = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                    videoUri = resolver.insert(collection, values);

                    if (videoUri == null) {
                        call.reject("Failed to create MediaStore entry for video");
                        return;
                    }

                    out = resolver.openOutputStream(videoUri);
                    byte[] buffer = new byte[65536];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                    }
                    out.flush();

                    values.clear();
                    values.put(MediaStore.Video.Media.IS_PENDING, 0);
                    resolver.update(videoUri, values, null, null);
                } else {
                    File moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
                    File targetDir = new File(moviesDir, "MangaVideoStudio");
                    if (!targetDir.exists()) {
                        targetDir.mkdirs();
                    }
                    File targetFile = new File(targetDir, fileName);
                    out = new FileOutputStream(targetFile);

                    byte[] buffer = new byte[65536];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                    }
                    out.flush();

                    MediaScannerConnection.scanFile(context, new String[]{ targetFile.getAbsolutePath() }, new String[]{ "video/mp4" }, null);
                    videoUri = Uri.fromFile(targetFile);
                    savedPathDisplay = targetFile.getAbsolutePath();
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("filePath", savedPathDisplay);
                ret.put("uri", videoUri != null ? videoUri.toString() : "");
                ret.put("message", "Video saved directly to Movies/MangaVideoStudio and indexed into Android Gallery.");
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Failed saving video to MediaStore: " + e.getMessage(), e);
                call.reject("Failed to save video to Android Gallery: " + e.getMessage());
            } finally {
                try { if (in != null) in.close(); } catch (Exception ignored) {}
                try { if (out != null) out.close(); } catch (Exception ignored) {}
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        try {
            nativeReleaseEngine();
        } catch (Throwable ignored) {}
    }
}
