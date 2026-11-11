#include <jni.h>
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <android/log.h>
#include <vulkan/vulkan.h>

#define TAG "SD_NATIVE_BRIDGE"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

// stb_image_write implementation for in-memory PNG encoding
#define STB_IMAGE_WRITE_IMPLEMENTATION
#define STBI_WRITE_NO_STDIO
#include "stb_image_write.h"

// Forward declaration of stable-diffusion.cpp C API
#ifdef __cplusplus
extern "C" {
#endif

// Opaque context types matching stable-diffusion.h
typedef struct sd_ctx_t sd_ctx_t;

typedef enum {
    EULER_A,
    EULER,
    HEUN,
    DPM2,
    DPMPP2S_A,
    DPMPP2M,
    DPMPP2Mv2,
    IPNDM,
    IPNDM_V,
    LCM,
    N_SAMPLE_METHODS
} sample_method_t;

typedef enum {
    DEFAULT_SCHEDULE,
    DISCRETE,
    KARRAS,
    EXPONENTIAL,
    AYS,
    GITS,
    N_SCHEDULES
} schedule_t;

typedef enum {
    STD_DEFAULT_RNG,
    CUDA_RNG,
    CPU_RNG
} rng_type_t;

typedef struct {
    uint32_t width;
    uint32_t height;
    uint32_t channel;
    uint8_t* data;
} sd_image_t;

// Context creation & inference declarations
sd_ctx_t* new_sd_ctx(const char* model_path,
                     const char* vae_path,
                     const char* taesd_path,
                     const char* control_net_path,
                     const char* lora_model_dir,
                     const char* embeddings_path,
                     const char* stacked_id_embed_dir,
                     bool vae_decode_only,
                     bool vae_tiling,
                     bool free_params_immediately,
                     int n_threads,
                     enum rng_type_t rng_type,
                     enum schedule_t schedule,
                     bool keep_clip_on_cpu,
                     bool keep_control_net_cpu,
                     bool keep_vae_on_cpu);

sd_image_t* txt2img(sd_ctx_t* sd_ctx,
                    const char* prompt,
                    const char* negative_prompt,
                    float clip_skip,
                    float cfg_scale,
                    float guidance,
                    int width,
                    int height,
                    sample_method_t sample_method,
                    int sample_steps,
                    int64_t seed,
                    int batch_count,
                    const sd_image_t* control_cond,
                    float control_strength,
                    float style_strength,
                    bool normalize_input,
                    const char* input_id_images_path);

void free_sd_ctx(sd_ctx_t* sd_ctx);

#ifdef __cplusplus
}
#endif

// Global state holding the active engine context
static std::mutex g_engine_mutex;
static sd_ctx_t* g_sd_ctx = nullptr;
static std::string g_current_model_path;
static bool g_current_vulkan = false;

// Custom memory callback for stb_image_write
struct PngWriteBuffer {
    std::vector<uint8_t> buffer;
};

static void pngWriteCallback(void* context, void* data, int size) {
    auto* pwb = static_cast<PngWriteBuffer*>(context);
    auto* bytes = static_cast<const uint8_t*>(data);
    pwb->buffer.insert(pwb->buffer.end(), bytes, bytes + size);
}

extern "C" {

JNIEXPORT jboolean JNICALL
Java_com_mangastudio_app_StableDiffusionPlugin_nativeCheckVulkanSupport(JNIEnv* env, jobject thiz) {
    VkApplicationInfo appInfo = {};
    appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
    appInfo.pApplicationName = "MangaVideoStudioAI";
    appInfo.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.pEngineName = "stable-diffusion.cpp";
    appInfo.engineVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.apiVersion = VK_API_VERSION_1_1;

    VkInstanceCreateInfo createInfo = {};
    createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    createInfo.pApplicationInfo = &appInfo;

    VkInstance instance = VK_NULL_HANDLE;
    VkResult res = vkCreateInstance(&createInfo, nullptr, &instance);
    if (res == VK_SUCCESS && instance != VK_NULL_HANDLE) {
        uint32_t deviceCount = 0;
        vkEnumeratePhysicalDevices(instance, &deviceCount, nullptr);
        LOGI("Vulkan instance successfully created. Physical device count: %u", deviceCount);
        vkDestroyInstance(instance, nullptr);
        return deviceCount > 0 ? JNI_TRUE : JNI_FALSE;
    }

    LOGW("Vulkan probe failed with VkResult: %d", res);
    return JNI_FALSE;
}

JNIEXPORT jboolean JNICALL
Java_com_mangastudio_app_StableDiffusionPlugin_nativeInitEngine(
    JNIEnv* env,
    jobject thiz,
    jstring modelPathStr,
    jboolean useVulkan
) {
    std::lock_guard<std::mutex> lock(g_engine_mutex);

    const char* pathChars = env->GetStringUTFChars(modelPathStr, nullptr);
    std::string modelPath = pathChars ? pathChars : "";
    env->ReleaseStringUTFChars(modelPathStr, pathChars);

    if (modelPath.empty()) {
        LOGE("Model path is empty.");
        return JNI_FALSE;
    }

    // Reuse context if already initialized with the same model and backend
    if (g_sd_ctx != nullptr && g_current_model_path == modelPath && g_current_vulkan == (bool)useVulkan) {
        LOGI("Reusing existing stable-diffusion.cpp context.");
        return JNI_TRUE;
    }

    // Free any existing context
    if (g_sd_ctx != nullptr) {
        LOGI("Freeing old stable-diffusion.cpp context.");
        free_sd_ctx(g_sd_ctx);
        g_sd_ctx = nullptr;
    }

    LOGI("Initializing stable-diffusion.cpp with model: %s (Vulkan=%s)",
         modelPath.c_str(), useVulkan ? "true" : "false");

    // Use 4 threads (optimized for Cortex-A76 performance cluster on Helio G99)
    int n_threads = 4;
    bool vae_tiling = true; // Essential on mobile GPUs like Mali-G57 to conserve tile memory

    try {
        g_sd_ctx = new_sd_ctx(
            modelPath.c_str(),
            "", // vae_path (embedded in single-file GGUF)
            "", // taesd_path
            "", // control_net_path
            "", // lora_model_dir
            "", // embeddings_path
            "", // stacked_id_embed_dir
            false, // vae_decode_only
            vae_tiling,
            true,  // free_params_immediately
            n_threads,
            STD_DEFAULT_RNG,
            DEFAULT_SCHEDULE,
            !useVulkan, // keep_clip_on_cpu
            true,       // keep_control_net_cpu
            !useVulkan  // keep_vae_on_cpu
        );

        if (g_sd_ctx != nullptr) {
            g_current_model_path = modelPath;
            g_current_vulkan = (bool)useVulkan;
            LOGI("stable-diffusion.cpp context initialized successfully.");
            return JNI_TRUE;
        }
    } catch (const std::exception& ex) {
        LOGE("Exception initializing stable-diffusion.cpp: %s", ex.what());
    } catch (...) {
        LOGE("Unknown exception initializing stable-diffusion.cpp.");
    }

    return JNI_FALSE;
}

JNIEXPORT jbyteArray JNICALL
Java_com_mangastudio_app_StableDiffusionPlugin_nativeGenerateImage(
    JNIEnv* env,
    jobject thiz,
    jstring promptStr,
    jstring negPromptStr,
    jint width,
    jint height,
    jint steps,
    jfloat cfgScale,
    jlong seed,
    jboolean useVulkan
) {
    std::lock_guard<std::mutex> lock(g_engine_mutex);

    if (g_sd_ctx == nullptr) {
        LOGE("Engine context is null. nativeInitEngine must be called first.");
        return nullptr;
    }

    const char* promptChars = env->GetStringUTFChars(promptStr, nullptr);
    const char* negChars = env->GetStringUTFChars(negPromptStr, nullptr);
    std::string prompt = promptChars ? promptChars : "";
    std::string negPrompt = negChars ? negChars : "";
    env->ReleaseStringUTFChars(promptStr, promptChars);
    env->ReleaseStringUTFChars(negPromptStr, negChars);

    LOGI("Running txt2img: '%s' (%dx%d, steps=%d, cfg=%.1f, seed=%lld)",
         prompt.c_str(), width, height, steps, cfgScale, (long long)seed);

    int64_t actualSeed = seed >= 0 ? seed : (int64_t)time(nullptr);
    sample_method_t sampler = EULER_A; // Standard Euler Ancestral for SD 1.5

    sd_image_t* resultImages = txt2img(
        g_sd_ctx,
        prompt.c_str(),
        negPrompt.c_str(),
        -1.0f,     // clip_skip
        cfgScale,  // cfg_scale
        3.5f,      // guidance
        width,
        height,
        sampler,
        steps,
        actualSeed,
        1,         // batch_count
        nullptr,   // control_cond
        0.0f,      // control_strength
        20.0f,     // style_strength
        false,     // normalize_input
        ""         // input_id_images_path
    );

    if (resultImages == nullptr || resultImages->data == nullptr) {
        LOGE("txt2img returned null image.");
        return nullptr;
    }

    // Encode RGB buffer to PNG in memory
    PngWriteBuffer pngBuffer;
    int success = stbi_write_png_to_func(
        pngWriteCallback,
        &pngBuffer,
        resultImages->width,
        resultImages->height,
        resultImages->channel,
        resultImages->data,
        resultImages->width * resultImages->channel
    );

    // Free the image data buffer allocated by txt2img
    free(resultImages->data);
    free(resultImages);

    if (!success || pngBuffer.buffer.empty()) {
        LOGE("Failed to encode output image to PNG.");
        return nullptr;
    }

    LOGI("Generated image encoded successfully to PNG (%zu bytes)", pngBuffer.buffer.size());

    // Allocate and return Java byte array
    jbyteArray outBytes = env->NewByteArray(pngBuffer.buffer.size());
    if (outBytes != nullptr) {
        env->SetByteArrayRegion(
            outBytes,
            0,
            pngBuffer.buffer.size(),
            reinterpret_cast<const jbyte*>(pngBuffer.buffer.data())
        );
    }
    return outBytes;
}

JNIEXPORT void JNICALL
Java_com_mangastudio_app_StableDiffusionPlugin_nativeReleaseEngine(JNIEnv* env, jobject thiz) {
    std::lock_guard<std::mutex> lock(g_engine_mutex);
    if (g_sd_ctx != nullptr) {
        LOGI("Releasing global stable-diffusion.cpp context.");
        free_sd_ctx(g_sd_ctx);
        g_sd_ctx = nullptr;
    }
}

} // extern "C"
