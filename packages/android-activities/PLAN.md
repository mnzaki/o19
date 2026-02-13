# o19-android-activities Implementation Plan

## Overview
Android library (AAR) for o19 apps using "Flutter Add App" architecture.
Provides native Android activities that integrate with Tauri-based apps.

## Phase 1: Foundation ✅
- [x] Package structure
- [x] Gradle configuration for AAR output
- [x] AndroidManifest with ReceiveShareActivity
- [x] ReceiveShareActivity implementation with UI:
  - [x] Bottom sheet layout with Material Design 3
  - [x] Preview for images, videos, files, URLs
  - [x] Editable text area
  - [x] Three action buttons: Cancel, Add, Add and See
- [x] ShareResultBridge for Tauri communication
- [x] Resources (themes, animations, layouts, drawables)
- [x] Documentation

## Phase 2: Tauri Plugin (Next)
- [ ] Create Tauri plugin in `tauri-plugin-o19-sharing/`
- [ ] Rust commands for checking pending shares
- [ ] TypeScript bindings for the plugin
- [ ] Plugin integration with ShareResultBridge

## Phase 3: DearDiary Integration (Next)
- [ ] Add AAR to DearDiary's Android build
- [ ] Configure MainActivity with bridge
- [ ] Add Tauri plugin to frontend
- [ ] Handle share data in accumulatingPost store
- [ ] UI for share confirmation (optional)

## Phase 4: Testing & Polish
- [ ] Test text/URL sharing from Chrome
- [ ] Test image sharing from Photos
- [ ] Test multiple image sharing
- [ ] Test when app is not running (cold start)
- [ ] Test when app is in background (warm start)
- [ ] Error handling edge cases

## Architecture Decisions

### Why SharedPreferences for bridge?
- Process-local storage survives activity lifecycle
- No need for complex IPC or content providers
- Simple JSON serialization
- Flutter Add App pattern standard

### Why no WebView in ReceiveShareActivity?
- Share UX must be instant (< 100ms)
- WebView initialization takes 500ms-2s
- Pure native activity for immediate response
- Only the main app has WebView

### Activity UI & Flow:
```
Share from other app
    ↓
ReceiveShareActivity launched (native, < 50ms)
    ↓
Extract data from intent
    ↓
Show bottom sheet UI with:
    • Preview of content (image/video/file/url)
    • Editable text area (pre-filled with shared text)
    • [Cancel] [Add] [Add and See] buttons
    ↓
User chooses:
    • Cancel → Return to external app
    • Add → Store in SharedPreferences → Return to external app
    • Add and See → Store in SharedPreferences → Launch MainActivity
    ↓
MainActivity checks for pending shares on resume
    ↓
Tauri plugin (o19-sharing) delivers to JS
    ↓
JS handles share (adds to accumulation)
```

## File Structure
```
packages/android-activities/
├── build.gradle                 # Gradle config with AAR publishing
├── settings.gradle
├── proguard-rules.pro           # ProGuard for release builds
├── consumer-rules.pro           # Consumer ProGuard rules
├── package.json                 # Workspace integration
├── README.md                    # Integration guide
├── PLAN.md                      # This file
└── src/main/
    ├── AndroidManifest.xml      # Activity declarations
    ├── java/ty/circulari/o19/
    │   ├── activities/
    │   │   └── ReceiveShareActivity.java
    │   └── bridge/
    │       └── ShareResultBridge.java
    └── res/
        ├── anim/
        │   ├── slide_up.xml
        │   └── slide_down.xml
        ├── layout/
        │   └── activity_receive_share.xml
        └── values/
            ├── strings.xml
            └── themes.xml
```

## Build Instructions

```bash
# From monorepo root
cd code/packages/android-activities

# Build release AAR
./gradlew assembleRelease

# Output location
ls build/outputs/aar/o19-android-activities-release.aar

# Copy to DearDiary
cp build/outputs/aar/o19-android-activities-release.aar \
   ../../apps/DearDiary/src-tauri/gen/android/app/libs/
```

## Integration Checklist

### 1. Copy AAR
- [ ] Copy `o19-android-activities-release.aar` to DearDiary's `app/libs/`

### 2. Update build.gradle
- [ ] Add `implementation files('libs/o19-android-activities-release.aar')`

### 3. Update MainActivity.java
- [ ] Import `ShareResultBridge`
- [ ] Call `ShareResultBridge.setMainActivityClass()`
- [ ] Check for pending shares in `onResume()`

### 4. Update AndroidManifest.xml
- [ ] Merge ReceiveShareActivity declaration
- [ ] Add required permissions

### 5. Frontend integration
- [ ] Add Tauri plugin
- [ ] Listen for share events
- [ ] Handle share data in stores

## Future Enhancements

### Share UI
Instead of auto-processing, show a bottom sheet:
- Preview of shared content
- "Add to Accumulation" button
- "Open in App" button
- Cancel option

### Additional Intents
- `ACTION_VIEW` for opening files in app
- `ACTION_SENDTO` for SMS/email integration
- Custom intents for app-to-app communication

### Security
- URI permission grants for file access
- Secure temp file handling
- Content provider for file sharing

## References

- [Flutter Add-to-App](https://docs.flutter.dev/add-to-app)
- [Android Sharing](https://developer.android.com/training/sharing/receive)
- [Tauri Android](https://tauri.app/v1/guides/mobile/android/)
