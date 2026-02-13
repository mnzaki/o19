# o19-android-activities

Android library package for o19 apps

## Overview

This package provides **pure native Android Activities** for handling platform-specific intents that Tauri-based apps cannot directly handle. Currently supports:

- **Receive Share**: Handle `ACTION_SEND` and `ACTION_SEND_MULTIPLE` intents from other Android apps

## Architecture

1. `ReceiveShareActivity` is pure native Android (no WebView) for instant response
2. Main Tauri activity runs WebView as usual
3. Activities communicate via SharedPreferences (process-local storage)
4. Share data flows: Native Activity → SharedPreferences → Tauri Plugin → JavaScript

### Why no WebView in ReceiveShareActivity?

**Speed is critical for share UX.** Users expect the share sheet to appear instantly:
- WebView initialization: 500ms - 2s
- Native Activity launch: < 50ms

The `ReceiveShareActivity` is a lightweight native activity that immediately processes the share intent, stores data, and hands off to the main Tauri app.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Android App                                 │
│                                                                          │
│  ┌──────────────────────────────┐      ┌─────────────────────────────┐  │
│  │      Tauri MainActivity      │      │     ReceiveShareActivity    │  │
│  │   ┌──────────────────────┐   │      │      ⚡ PURE NATIVE         │  │
│  │   │    WebView           │   │      │      (NO WebView!)          │  │
│  │   │    ┌──────────────┐  │   │      │                             │  │
│  │   │    │  DearDiary   │  │   │      │  ┌───────────────────────┐  │  │
│  │   │    │  Svelte UI   │  │◄──┼──────┼──┤  Bottom Sheet UI:     │  │  │
│  │   │    └──────────────┘  │   │bridge│  │  • Preview image/file │  │  │
│  │   └──────────────────────┘   │      │  │  • Edit text area     │  │  │
│  └──────────────────────────────┘      │  │  • [Cancel][Add][+See]│  │  │
│            │                           │  └───────────────────────┘  │  │
│            │                           └─────────────┬───────────────┘  │
│            │                                         │                   │
│            ▼                                         ▼                   │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │              ShareResultBridge (SharedPreferences)           │       │
│  └──────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Building

```bash
cd packages/android-activities

# Build debug AAR
./gradlew assembleDebug

# Build release AAR
./gradlew assembleRelease

# Publish to local Maven
./gradlew publishToMavenLocal
```

Output: `build/outputs/aar/o19-android-activities-release.aar`

## Integration with DearDiary

### 1. Add AAR to DearDiary

Copy the built AAR to the Tauri Android project:

```bash
cp build/outputs/aar/o19-android-activities-release.aar \
   ../apps/DearDiary/src-tauri/gen/android/app/libs/
```

### 2. Configure DearDiary's build.gradle

In `DearDiary/src-tauri/gen/android/app/build.gradle`:

```gradle
dependencies {
    // ... existing dependencies ...
    
    implementation files('libs/o19-android-activities-release.aar')
}
```

### 3. Configure MainActivity

In `DearDiary/src-tauri/gen/android/app/src/main/java/.../MainActivity.java`:

```java
import ty.circulari.o19.bridge.ShareResultBridge;

public class MainActivity extends TauriActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure the bridge with main activity class
        ShareResultBridge.setMainActivityClass(
            "com.yourpackage.deardiary.MainActivity"
        );
    }
    
    @Override
    public void onResume() {
        super.onResume();
        
        // Check for pending shares
        ShareResultBridge bridge = new ShareResultBridge(this);
        if (bridge.hasPendingShare()) {
            // Notify Tauri to check for shares
            // This will be handled by the Tauri plugin
        }
    }
}
```

### 4. Update AndroidManifest.xml

Merge the activities from this library's manifest into DearDiary's manifest.
The `ReceiveShareActivity` must be declared with the appropriate intent filters.

### 5. Create Tauri Plugin

Create a Tauri plugin (`tauri-plugin-o19-sharing`) to expose the bridge to JavaScript:

```typescript
// In DearDiary, the o19-sharing plugin
import { invoke } from '@tauri-apps/api/core';

export async function checkPendingShare(): Promise<ShareData | null> {
    return invoke('plugin:o19-sharing|get_pending_share');
}

export interface ShareData {
    shareType: 'TEXT' | 'URL' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'MIXED';
    text?: string;
    url?: string;
    subject?: string;
    mimeType?: string;
    files?: Array<{
        uri: string;
        scheme: string;
        fileName?: string;
    }>;
}
```

## Share Data Format

When a share is received, the following JSON structure is passed to the Tauri app:

```json
{
    "action": "android.intent.action.SEND",
    "mimeType": "text/plain",
    "shareType": "URL",
    "originalText": "https://example.com/article",
    "editedText": "This is a great article I found",
    "url": "https://example.com/article",
    "subject": "Check this out",
    "userAction": "ADD_AND_SEE",
    "timestamp": 1708888888888
}
```

For file shares:

```json
{
    "action": "android.intent.action.SEND",
    "mimeType": "image/jpeg",
    "shareType": "IMAGE",
    "editedText": "Beautiful sunset!",
    "file": {
        "uri": "content://media/external/images/123",
        "scheme": "content",
        "fileName": "photo.jpg"
    },
    "userAction": "ADD"
}
```

For multiple files:

```json
{
    "action": "android.intent.action.SEND_MULTIPLE",
    "mimeType": "image/*",
    "shareType": "MIXED",
    "editedText": "2 files shared",
    "files": [
        { "uri": "content://...", "scheme": "content", "fileName": "1.jpg" },
        { "uri": "content://...", "scheme": "content", "fileName": "2.jpg" }
    ],
    "fileCount": 2,
    "userAction": "ADD"
}
```

## Development

### Project Structure

```
packages/android-activities/
├── build.gradle                    # Gradle build configuration
├── settings.gradle                 # Gradle settings
└── src/main/
    ├── AndroidManifest.xml         # Activity declarations & intent filters
    ├── java/ty/circulari/o19/
    │   ├── activities/
    │   │   └── ReceiveShareActivity.java   # Handles share intents
    │   └── bridge/
    │       └── ShareResultBridge.java      # Communication bridge
    └── res/values/
        ├── strings.xml             # String resources
        └── themes.xml              # UI themes
```

### Testing

To test the share functionality:

1. Build the AAR
2. Integrate into DearDiary
3. Install the app on an Android device
4. From another app (e.g., Chrome, Photos), use the Share function
5. Select "DearDiary" from the share sheet
6. Verify the share data is received in the Tauri app

## License

MIT - Part of the Circulari.ty project
