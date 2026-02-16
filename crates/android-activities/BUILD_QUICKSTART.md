# Quick Start: Building FoundframeRadicle

This guide shows how to build the `android-activities` package (including the Rust `FoundframeRadicle` service) in a separate terminal.

## ⚠️ Important: Android Targets Only!

**The `rsbinder` crate only compiles for Android targets.** It will fail with transmute errors if you try to build for the host (x86_64 Linux). Always use `cargo-ndk` to build for Android.

## Prerequisites Check

```bash
# 1. Check Rust is installed
cargo --version  # Should be 1.85+

# 2. Install cargo-ndk (one-time)
cargo install cargo-ndk

# 3. Add Android targets to Rust
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android

# 4. Install Android NDK
# Via Android Studio: Tools > SDK Manager > SDK Tools > NDK (Side by side)
# Or command line: sdkmanager 'ndk;27.0.12077973'

# 5. Set NDK path (add to ~/.bashrc or ~/.zshrc)
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/27.0.12077973
```

## Option 1: Build Rust Only (Fastest)

**DO NOT run `cargo build` directly** - it will fail. Use `cargo-ndk`:

```bash
cd /path/to/circulari.ty/o19/packages/android-activities
./build-rust.sh
```

Or manually with cargo-ndk:
```bash
cargo ndk -t arm64-v8a -o src/main/jniLibs build --release
```

This creates:
```
src/main/jniLibs/
├── arm64-v8a/libandroid_activities.so
├── armeabi-v7a/libandroid_activities.so
└── x86_64/libandroid_activities.so
```

## Option 2: Build Full AAR (For Android Integration)

```bash
cd /path/to/circulari.ty/o19/packages/android-activities
make rust    # Or: ./build-rust.sh
make aar     # Or: ./gradlew assembleRelease
```

Output: `build/outputs/aar/android-activities-release.aar`

## Option 3: Quick Dev Cycle

```bash
# Terminal 1: Watch and rebuild Rust
while true; do
    cargo ndk -t arm64-v8a -o src/main/jniLibs build --release
    sleep 5
done

# Terminal 2: Build Android when needed
./gradlew assembleDebug
```

## Install to DearDiary

```bash
# After building AAR
make install

# Or manually:
cp build/outputs/aar/android-activities-release.aar \
   ../../code/apps/DearDiary/src-tauri/gen/android/app/libs/
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `cargo-ndk: command not found` | `cargo install cargo-ndk` |
| `ANDROID_NDK_HOME not set` | `export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/27.0.12077973` |
| `aidl.rs not found` | Build.rs auto-fallback to stubs - check build output |
| `failed to run custom build command` | Check `rsbinder-aidl` dependency is in Cargo.toml |

## Build File Structure

```
android-activities/
├── build-rust.sh          # Standalone Rust build script
├── Makefile               # Convenience targets (make rust, make aar, etc.)
├── BUILD.md               # Detailed build documentation
├── build.gradle           # Gradle with Rust integration
├── build.rs               # Cargo build script (AIDL generation)
├── Cargo.toml             # Rust crate config
└── src/
    ├── main.rs            # Rust service implementation
    ├── aidl/              # AIDL interface definitions
    │   └── ty/circulari/o19/
    │       ├── IFoundframeRadicle.aidl
    │       └── IEventCallback.aidl
    ├── stubs/             # Fallback stubs
    │   └── aidl.rs
    └── main/
        └── jniLibs/       # Output directory for .so files
```

## What's Next?

1. Build Rust: `./build-rust.sh`
2. Build AAR: `./gradlew assembleRelease`
3. Copy to DearDiary: `make install`
4. Update tauri-plugin to use the client

See `INTEGRATION.md` for how to wire up the service to the Tauri plugin.
