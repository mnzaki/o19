# Camera Integration for DearDiary

## Overview

The camera integration provides native Android camera functionality that lives in the main Tauri activity, showing a camera preview behind the WebView. It supports:

1. **Camera Preview** - Fullscreen camera preview behind the WebView
2. **QR Code Scanning** - ML Kit-powered QR scanning for device pairing
3. **Photo Capture** - Native photo capture saved directly to gallery (no JS transfer)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Android Main Activity                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WebView (transparent when camera active)            │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  ForegroundLayer (sliding UI)                 │  │  │
│  │  │  - Drag to reveal camera                      │  │  │
│  │  │  - Pull > 50% to enable QR scan mode          │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PreviewView (CameraX)                               │  │
│  │  - Native camera preview                             │  │
│  │  - Lives behind WebView                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Android Side (`android` crate)

**File**: `android/java/ty/circulari/o19/CameraPlugin.kt`

The native Android Tauri plugin that manages the camera:

- **CameraX Integration**: Uses CameraX for preview, image analysis, and capture
- **ML Kit QR Scanning**: Scans for QR codes when in `qr` mode
- **Native Gallery Save**: Photos saved directly to `Pictures/DearDiary/`
- **WebView Transparency**: Makes WebView transparent when camera is active

**Commands**:
- `startCamera(mode, cameraDirection)` - Start camera with specified mode
- `stopCamera()` - Stop camera and release resources
- `setCameraMode(mode)` - Change mode without stopping
- `capturePhoto()` - Capture photo (photo mode only)
- `isCameraActive()` - Check camera state
- `requestPermissions()` / `checkPermissions()` - Permission handling

**Events** (emitted to frontend):
- `qr-scanned` - When QR code detected: `{ content: string }`
- `photo-captured` - When photo saved: `{ uri: string }`

### 2. Rust Side (`@o19/foundframe-tauri`)

**Registration** (`src/lib.rs`):
```rust
api.register_android_plugin("ty.circulari.o19", "CameraPlugin")?;
```

**Commands** (`src/commands.rs`):
- Stub commands that delegate to Android plugin on mobile
- Desktop implementations return "not available" errors

### 3. TypeScript API (`@o19/foundframe-tauri/ts/index.ts`)

```typescript
// Start camera in different modes
await startCamera({ mode: 'preview' });  // Just preview
await startCamera({ mode: 'qr' });       // QR scanning
await startCamera({ mode: 'photo' });    // Photo capture

// Listen for events
listen('qr-scanned', (e) => console.log(e.payload.content));
listen('photo-captured', (e) => console.log(e.payload.uri));
```

### 4. Svelte Components

**CaptureLayer.svelte** (`code/apps/DearDiary/src/lib/components/capture/CaptureLayer.svelte`)
- Manages native camera lifecycle
- Handles QR and photo events
- Shows placeholder on desktop

**ForegroundLayer.svelte** (`code/apps/DearDiary/src/lib/components/feed/ForegroundLayer.svelte`)
- Tracks drag position
- Enables QR mode when pulled > 50%
- Visual indicator when in scan mode

**+page.svelte** (`code/apps/DearDiary/src/routes/+page.svelte`)
- Wires up camera mode to foreground position
- Handles QR scan results (device pairing)

## Usage Flow

### QR Code Scanning (Device Pairing)

1. User pulls down foreground layer past 50%
2. `CaptureLayer` receives `mode: 'qr'`
3. `CameraPlugin` switches to QR analysis mode
4. When QR detected:
   - Native vibration feedback
   - `qr-scanned` event emitted
   - Frontend parses pairing URL
   - Shows pairing confirmation

### Photo Capture

1. Call `startCamera({ mode: 'photo' })`
2. User frames shot
3. Call `capturePhoto()`
4. Photo saved natively to gallery
5. `photo-captured` event with URI

## Configuration

### AndroidManifest.xml

Already configured in `android`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
<uses-feature android:name="android.hardware.camera.any" android:required="false" />
```

### Dependencies

In `android/build.gradle`:
```gradle
def camerax_version = "1.3.3"
implementation "androidx.camera:camera-core:$camerax_version"
implementation "androidx.camera:camera-camera2:$camerax_version"
implementation "androidx.camera:camera-lifecycle:$camerax_version"
implementation "androidx.camera:camera-view:$camerax_version"

// ML Kit for QR scanning
implementation 'com.google.mlkit:barcode-scanning:17.2.0'
```

## Future Enhancements

- [ ] Flash/torch control
- [ ] Zoom controls
- [ ] Front/back camera switch
- [ ] Video recording mode
- [ ] Real-time filter effects
- [ ] Barcode scanning (non-QR)
