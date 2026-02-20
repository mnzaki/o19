# Building FoundframeRadicle Service

This document explains how to build the `android` package, which includes the Rust `FoundframeRadicle` service and the Kotlin Android wrapper.

## Prerequisites

### 1. Rust Toolchain
```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add Android targets
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add x86_64-linux-android
```

### 2. cargo-ndk
```bash
cargo install cargo-ndk
```

### 3. Android NDK
```bash
# Via Android Studio SDK Manager, or:
sdkmanager 'ndk;27.0.12077973'

# Set environment variable (add to ~/.bashrc or ~/.zshrc)
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/27.0.12077973
```

### 4. Gradle (for AAR build)
Gradle wrapper is included. Just run `./gradlew`.

## Build Options

### Option 1: Standalone Rust Build (Fastest for iteration)

Run the build script directly:

```bash
cd o19/packages/android
./build-rust.sh
```

This builds only the Rust `.so` libraries and places them in `src/main/jniLibs/`.

### Option 2: Full AAR Build (For integration)

Build the complete Android library (includes Rust + Kotlin + resources):

```bash
cd o19/packages/android
./gradlew assembleRelease
```

This automatically:
1. Builds Rust code via `buildRust` task
2. Compiles Kotlin code
3. Packages into AAR: `build/outputs/aar/android-release.aar`

### Option 3: Debug Build

```bash
# For Rust only
cargo ndk -t arm64-v8a -o src/main/jniLibs build

# For full AAR
./gradlew assembleDebug
```

## Output Structure

After successful build:

```
src/main/jniLibs/
├── arm64-v8a/
│   └── libandroid.so      # Main Rust library
├── armeabi-v7a/
│   └── libandroid.so
└── x86_64/
    └── libandroid.so

build/outputs/aar/
├── android-release.aar     # Release AAR
└── android-debug.aar       # Debug AAR
```

## Integration with DearDiary

### Copy AAR to app:

```bash
cp build/outputs/aar/android-release.aar \
   ../../code/apps/DearDiary/src-tauri/gen/android/app/libs/
```

### Or use Gradle dependency:

In DearDiary's `app/build.gradle`:

```gradle
dependencies {
    implementation files('libs/android-release.aar')
}
```

## Troubleshooting

### "cargo-ndk: command not found"
```bash
cargo install cargo-ndk
```

### "NDK environment variable not set"
```bash
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/27.0.12077973
```

### "Failed to generate AIDL bindings"
The `rsbinder-aidl` crate generates bindings at build time. If this fails:
1. Check `src/aidl/` contains valid `.aidl` files
2. Check `build.rs` is present and correct
3. Run with verbose: `cargo build -vv`

### "UnsatisfiedLinkError: dlopen failed"
The `.so` file wasn't packaged. Check:
1. `src/main/jniLibs/` contains the `.so` files
2. Gradle picked them up: `unzip -l build/outputs/aar/*.aar | grep .so`

## Clean Build

```bash
# Clean everything
./gradlew clean

# Or just Rust
./build-rust.sh clean  # (if we add this)
rm -rf src/main/jniLibs target
```

## Continuous Integration

For CI builds, ensure these env vars are set:

```bash
export ANDROID_NDK_HOME=/path/to/ndk
export PATH="$HOME/.cargo/bin:$PATH"

# Build
cd o19/packages/android
./build-rust.sh
./gradlew assembleRelease
```
