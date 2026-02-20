# Integration Guide: FoundframeRadicleService

This guide shows how to integrate the `FoundframeRadicleService` singleton into your o19 apps.

## Architecture Overview

```
┌─────────────────────┐        ┌──────────────────────────┐
│   DearDiary App     │        │  :foundframe Process     │
│                     │ Binder │                          │
│  ┌───────────────┐  │  IPC   │  ┌──────────────────┐    │
│  │ Tauri Plugin  │◄─┼────────┼──┤ Rust Service     │    │
│  │ - Uses Bp*    │  │        │  │ (rsbinder)       │    │
│  │   client      │  │        │  └──────────────────┘    │
│  └───────────────┘  │        │                          │
│  ┌───────────────┐  │        │  ┌──────────────────┐    │
│  │ foundframe-   │  │        │  │ Kotlin Service   │    │
│  │   to-sql      │  │        │  │ Wrapper          │    │
│  │ (local DB)    │  │        │  │ (foreground svc) │    │
│  └───────────────┘  │        │  └──────────────────┘    │
└─────────────────────┘        └──────────────────────────┘
```

## 1. Add Dependency

In `@o19/foundframe-tauri/Cargo.toml`:

```toml
[dependencies]
android = { path = "../../packages/android" }
```

## 2. Update Android Plugin Code

In `@o19/foundframe-tauri/android/src/main/java/.../MobilePlugin.kt` or similar:

```kotlin
import ty.circulari.o19.service.FoundframeRadicleClient

class MobilePlugin {
    private lateinit var client: FoundframeRadicleClient
    
    fun init(app: Application) {
        // Ensure service is started
        client = FoundframeRadicleClient(app)
        if (!client.ensureStarted("deardiary")) {
            Log.e(TAG, "Failed to start FoundframeRadicleService")
        }
    }
}
```

## 3. Update Rust Plugin Code

In `@o19/foundframe-tauri/src/mobile.rs`:

```rust
use android::BpFoundframeRadicle;
use rsbinder::*;

pub struct MobilePlatform {
    service: BpFoundframeRadicle,
}

impl MobilePlatform {
    pub fn new() -> Result<Self> {
        ProcessState::init_default();
        
        let binder = hub::get_service("foundframe.radicle")?
            .ok_or(Error::ServiceNotRunning)?;
        
        let service = BpFoundframeRadicle::new(binder)?;
        
        Ok(Self { service })
    }
    
    pub fn get_node_id(&self) -> Result<String> {
        self.service.getNodeId().map_err(Into::into)
    }
}
```

## 4. DearDiary Integration

### Update `MainActivity.kt`

```kotlin
import ty.circulari.o19.service.FoundframeRadicleClient

class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Start the singleton service
        FoundframeRadicleClient.startService(this, "deardiary")
    }
}
```

### Update `build.gradle`

```gradle
dependencies {
    // Add the AAR
    implementation files('libs/o19-android-release.aar')
}
```

## 5. Manifest Permissions

Add to `DearDiary/src-tauri/gen/android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="ty.circulari.o19.BIND_FOUNDFRAME_RADICLE" />
```

## Building

From the `android` directory:

```bash
# Build the Rust library (generates .so files)
cargo ndk -t arm64-v8a -o src/main/jniLibs build --release

# Build the AAR
./gradlew assembleRelease

# Copy to DearDiary
cp build/outputs/aar/android-release.aar \
   ../../code/apps/DearDiary/src-tauri/gen/android/app/libs/
```

## Service Lifecycle

- **Started**: On first `startService()` call or `ensureStarted()`
- **Sticky**: Auto-restarts if killed by system (START_STICKY)
- **Foreground**: Shows persistent notification while running
- **Process**: Runs in `:foundframe` separate process
- **Shared**: Multiple apps can bind (with permission)

## Permission

The service requires `ty.circulari.o19.BIND_FOUNDFRAME_RADICLE` permission:

```xml
<permission
    android:name="ty.circulari.o19.BIND_FOUNDFRAME_RADICLE"
    android:protectionLevel="signature|normal" />
```

- `signature`: Other o19 apps signed with same key auto-granted
- `normal`: Third-party apps can request (user sees prompt)
