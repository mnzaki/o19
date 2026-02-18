# Android Service Integration

This document describes how the @o19/foundframe-tauri connects to the FoundframeRadicle singleton service on Android.

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                           DearDiary App                               │
│                                                                       │
│  ┌──────────────────────┐        ┌─────────────────────────────────┐  │
│  │  Tauri WebView       │        │  :foundframe Process            │  │
│  │  (Svelte/Drizzle)    │◄───────┤                                 │  │
│  └──────────────────────┘  IPC   │  ┌─────────────────────────┐    │  │
│         ▲                        │  │ FoundframeRadicle       │    │  │
│         │ SQL                    │  │ Service (Rust)          │    │  │
│  ┌──────┴──────────────┐         │  │ - Radicle Node          │    │  │
│  │  @o19/foundframe-tauri│         │  │ - PKB Operations        │    │  │
│  │                     │         │  │ - Device Pairing        │    │  │
│  │  ┌───────────────┐  │         │  └─────────────────────────┘    │  │
│  │  │ foundframe-   │  │         │                                 │  │
│  │  │ to-sql (DB)   │  │         │  (foreground service, sticky)   │  │
│  │  └───────────────┘  │         └─────────────────────────────────┘  │
│  │                     │                                              │
│  │  ┌───────────────┐  │        ┌─────────────────────────────────┐   │
│  │  │ android-acts  │◄─┼────────┤  ReceiveShareActivity           │   │
│  │  │ (Binder IPC)  │  │        │  (can bind directly to service) │   │
│  │  └───────────────┘  │        └─────────────────────────────────┘   │
│  └─────────────────────┘                                              │
└───────────────────────────────────────────────────────────────────────┘
```

## Key Changes

### 1. Dependency on android

Added to `Cargo.toml`:
```toml
[target.'cfg(target_os = "android")'.dependencies]
android = { path = "../../packages/android" }
```

### 2. Platform-Specific Initialization

The plugin now uses different initialization paths:

**Desktop** (`setup_desktop`):
- Initializes foundframe directly
- Creates local PKB service
- Manages local node lifecycle

**Mobile** (`setup_mobile`):
- Connects to FoundframeRadicle service via Binder IPC
- DB remains local (`foundframe-to-sql`)
- PKB operations go through service
- Service continues running when app exits

### 3. Mobile Platform Implementation

Updated `src/mobile.rs`:
- Added `Platform::Android` and `Platform::Ios` variants
- `ensure_service_running()`: Checks if service is available
- `service_client()`: Gets the Binder client for service calls

### 4. Android Manifest Requirements

Apps using this plugin need:

```xml
<uses-permission android:name="ty.circulari.o19.BIND_FOUNDFRAME_RADICLE" />
```

And must start the service in `MainActivity.kt`:

```kotlin
import ty.circulari.o19.service.FoundframeRadicleClient

class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        FoundframeRadicleClient.startService(this, "deardiary")
    }
}
```

## Build Instructions

### 1. Build android AAR

```bash
cd o19/packages/android
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/29.0.13846066
make aar
make install  # Copies to DearDiary
```

### 2. Build @o19/foundframe-tauri

```bash
cd o19/crates/@o19/foundframe-tauri
cargo check
```

### 3. Build DearDiary

```bash
cd code/apps/DearDiary
cargo tauri android build
```

## TODO / Future Work

1. **Proper Remote PKB Service**: Currently uses stub PKB service on mobile. Need to create a `RemotePkbService` that forwards calls via Binder.

2. **Event Forwarding**: The service emits events that should be received by the plugin. Need to implement `subscribeEvents` callback.

3. **Service Lifecycle**: Handle service disconnect/reconnect gracefully.

4. **Error Handling**: Better error messages when service is not running.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Service not running` | Ensure MainActivity starts the service |
| `Binder transaction failed` | Check service is in foreground (notification showing) |
| `Permission denied` | Add `BIND_FOUNDFRAME_RADICLE` permission to manifest |

## Current Limitations

- **Stub Implementation**: The PKB service on mobile is currently a stub that runs locally. Full remote service integration requires implementing the AIDL interfaces properly.
- **iOS Support**: iOS currently falls back to local initialization. A similar service architecture could be implemented for iOS if needed.
