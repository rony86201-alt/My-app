cmake_minimum_required(VERSION 3.22.1)
project(sd_bridge C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Optimization flags for ARMv8-A (Helio G99 Cortex-A76 / Cortex-A55)
if(ANDROID_ABI STREQUAL "arm64-v8a")
    add_compile_options(-O3 -fPIC -march=armv8-a+fp+simd)
endif()

# Fetch official stable-diffusion.cpp repository
include(FetchContent)

set(SD_BUILD_EXAMPLES OFF CACHE BOOL "Build examples" FORCE)
set(SD_BUILD_SHARED_LIBS OFF CACHE BOOL "Build shared library" FORCE)
set(SD_VULKAN ON CACHE BOOL "Enable Vulkan backend for GPU acceleration" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "Disable OpenMP on Android" FORCE)
set(GGML_VULKAN ON CACHE BOOL "Enable GGML Vulkan backend" FORCE)

FetchContent_Declare(
    stable-diffusion
    GIT_REPOSITORY https://github.com/leejet/stable-diffusion.cpp.git
    GIT_TAG        master
    GIT_SHALLOW    TRUE
)

# Populate or use local submodule if available
FetchContent_GetProperties(stable-diffusion)
if(NOT stable-diffusion_POPULATED)
    FetchContent_Populate(stable-diffusion)
    add_subdirectory(${stable-diffusion_SOURCE_DIR} ${stable-diffusion_BINARY_DIR} EXCLUDE_FROM_ALL)
endif()

# JNI bridge library
add_library(sd_bridge SHARED
    native-bridge.cpp
)

target_include_directories(sd_bridge PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${stable-diffusion_SOURCE_DIR}
    ${stable-diffusion_SOURCE_DIR}/third_party
)

find_library(log-lib log)
find_library(android-lib android)
find_library(vulkan-lib vulkan)

target_link_libraries(sd_bridge PRIVATE
    stable-diffusion
    ${log-lib}
    ${android-lib}
    ${vulkan-lib}
)
