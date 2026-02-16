#!/bin/bash
# Build script for FoundframeRadicle Rust service
# Must be run for Android targets only (rsbinder doesn't compile for host)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Building FoundframeRadicle Rust Service ==="
echo ""

# Check for cargo-ndk
if ! command -v cargo-ndk &> /dev/null; then
    echo "cargo-ndk not found. Installing..."
    cargo install cargo-ndk
fi

# Check for Android NDK
if [ -z "$ANDROID_NDK_HOME" ] && [ -z "$ANDROID_NDK_ROOT" ]; then
    echo "ERROR: ANDROID_NDK_HOME or ANDROID_NDK_ROOT not set!"
    echo "Making a wild guess"
    set -x
    ANDROID_HOME="${ANDROID_HOME:-"${HOME}/Android/Sdk"}"
    ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-"${ANDROID_HOME}/ndk"}"
    set +x
    echo ""
    if [ ! -d "$ANDROID_HOME" ]; then
      echo "You gotta install the Android SDK first"
      exit 1
    fi
    if [ ! -d "$ANDROID_NDK_HOME" ]; then
      echo "You need the NDK too! To install NDK (after installing Android SDK):"
      echo "  sdkmanager 'ndk;27.0.12077973'"
      echo ""
      echo "Then set:"
      echo "  export ANDROID_NDK_HOME=\$ANDROID_HOME/ndk/27.0.12077973"
      echo ""
      exit 1
    fi
fi

# Create output directory
mkdir -p src/main/jniLibs

echo "Building Rust libraries for Android targets..."
echo "  Targets: arm64-v8a, armeabi-v7a, x86_64"
echo "  NOTE: rsbinder only compiles for Android, not host"
echo ""

# Build with cargo-ndk (Android targets only)
cargo ndk \
    -t arm64-v8a \
    -t armeabi-v7a \
    -o android/jniLibs \
    build --release

echo ""
echo "=== Build Complete ==="
echo ""
echo "Output files:"
find android/jniLibs -name "*.so" -exec ls -lh {} \; 2>/dev/null || echo "No .so files found"
echo ""
echo "Next steps:"
echo "  1. Build AAR: ./gradlew assembleRelease"
echo "  2. Copy to app: cp build/outputs/aar/*.aar ../path/to/app/libs/"
