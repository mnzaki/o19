# Makefile for android-activities
# Convenience wrapper around cargo-ndk and gradle

.PHONY: all rust aar clean install help

# Default target
all: rust aar

# Build Rust libraries only
rust:
	@echo "Building Rust libraries..."
	./build-rust.sh

# Build full AAR (includes Rust)
aar:
	@echo "Building AAR..."
	./gradlew assembleRelease

# Build debug versions
debug-rust:
	cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -o src/main/jniLibs build

debug-aar:
	./gradlew assembleDebug

# Clean everything
clean:
	./gradlew clean
	rm -rf src/main/jniLibs
	cargo clean

# Copy AAR to DearDiary
install: aar
	@echo "Copying AAR to DearDiary..."
	mkdir -p ../../code/apps/DearDiary/src-tauri/gen/android/app/libs/
	cp build/outputs/aar/android-activities-release.aar \
	   ../../code/apps/DearDiary/src-tauri/gen/android/app/libs/
	@echo "Done! AAR installed."

# Quick check - verify setup
check:
	@echo "Checking prerequisites..."
	@cargo --version
	@cargo-ndk --version || (echo "cargo-ndk not found, installing..." && cargo install cargo-ndk)
	@echo "ANDROID_NDK_HOME: $(ANDROID_NDK_HOME)"
	@echo "All checks passed!"

# Show help
help:
	@echo "Available targets:"
	@echo "  make rust       - Build Rust libraries only"
	@echo "  make aar        - Build full AAR (includes Rust)"
	@echo "  make debug-*    - Build debug versions"
	@echo "  make clean      - Clean all build artifacts"
	@echo "  make install    - Build and copy AAR to DearDiary"
	@echo "  make check      - Verify build environment"
	@echo "  make help       - Show this help"
