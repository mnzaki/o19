# O19 Development Guide

> How to add features across the O19 stack — from Svelte to Rust to Android.

## Quick Navigation

- [Architecture Overview](#architecture-overview) — understand the layers
- [Dependency Tree](#dependency-tree) — package relationships
- [Adding a Vertical Slice](#adding-a-vertical-slice) — step-by-step guide
- [Common Patterns](#common-patterns) — copy-paste templates

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Svelte)                               │
│  ┌─────────────────┐    ┌─────────────────────────────────────────────────┐ │
│  │ foundframe-front│    │ @o19/foundframe-tauri                           │ │
│  │ (domain logic)  │◄───│ (Tauri plugin - configures Drizzle, exposes API)│ │
│  └─────────────────┘    └─────────────────────────────────────────────────┘ │
│           ▲                                    │                              │
│           │    uses createServices()           │ invokes                      │
│           │    with Tauri adaptors             ▼                              │
│  ┌─────────────────┐    ┌─────────────────────────────────────────────────┐ │
│  │   DearDiary     │────►  Tauri Commands (o19-foundframe-tauri)          │ │
│  │   (Main App)    │    └─────────────────────────────────────────────────┘ │
│  └─────────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ Platform abstraction
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TAURI PLUGIN (Rust)                                │
│                         o19-foundframe-tauri                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  src/commands.rs    ◄── Add Tauri command handlers here                 │ │
│  │  src/platform.rs    ◄── Platform trait (Desktop vs Android vs iOS)      │ │
│  │  src/mobile/        ◄── Android/iOS platform implementations             │ │
│  │  android/           ◄── Android Java/Kotlin code (ApiPlugin.kt)          │ │
│  │  ts/index.ts        ◄── TypeScript API exported to frontend             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                      │
│                    ┌──────────────────┴──────────────────┐                  │
│                    ▼                                      ▼                  │
│         ┌─────────────────────┐              ┌─────────────────────┐        │
│         │      Desktop        │              │       Mobile        │        │
│         │  (direct foundframe)│              │  (AIDL → Service)   │        │
│         └─────────────────────┘              └─────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                      ▼
         ┌─────────────────────┐              ┌─────────────────────┐
         │   o19-foundframe    │              │  crates/android     │
         │   (core Rust lib)   │              │  (AIDL + Activity)  │
         │                     │              │                     │
         │  • TheStream        │              │  • ApiPlugin.kt     │
         │  • Person/Post/etc  │              │  • CameraPlugin.kt  │
         │  • Sync/P2P         │              │  • AIDL service     │
         └─────────────────────┘              └─────────────────────┘
                                                      │
                                                      ▼
                                         ┌─────────────────────┐
                                         │  FoundframeRadicle  │
                                         │  Service (AIDL)     │
                                         │  :foundframe proc   │
                                         └─────────────────────┘
```

---

## Two Paths for Android Commands

When adding a command that needs Android native functionality, you have **two distinct paths** based on what the command does:

### Path 1: Native Device Features (Camera, Sensors, etc.)

For features that use Android hardware/native APIs but **don't** involve foundframe domain logic:

```
Frontend ──► Rust Command ──► Platform.start_camera() ──► run_mobile_plugin()
                                                              │
                                                              ▼
                                                    ApiPlugin.kt (Tauri Plugin)
                                                              │
                                                              ▼
                                                    CameraPlugin.kt (utility)
                                                              │
                                                              ▼
                                                    CameraX (Android API)
```

**Examples:** Camera, QR scanning, file picker, notifications  
**Key trait:** These just need native Android APIs, not foundframe

**Implementation:**
- Add method to `Platform` trait (`src/platform.rs`)
- Implement in `DesktopPlatform` → return "not available" error
- Implement in `AndroidPlatform` → use `run_mobile_plugin()`
- Add Kotlin handler in `ApiPlugin.kt` (camelCase method names!)
- Delegate to utility class (e.g., `CameraPlugin.kt`) if reusable

### Path 2: Foundframe Domain Operations (TheStream, Identity, etc.)

For features that manipulate foundframe data structures:

```
Frontend ──► Rust Command ──► Platform.add_post() ──► AIDL Client
                                                          │
                                                          ▼
                                                FoundframeRadicleService
                                                          │
                                                          ▼
                                                o19-foundframe (Rust JNI)
                                                          │
                                                          ▼
                                                TheStream, KERI, etc.
```

**Examples:** add_post, add_bookmark, generate_pairing_qr  
**Key trait:** These manipulate domain entities in foundframe

**Implementation:**
- Add method to `Platform` trait
- Implement in `DesktopPlatform` → call o19-foundframe directly
- Implement in `AndroidPlatform` → use AIDL client to call service
- The AIDL service calls o19-foundframe via JNI
- **No** Kotlin code needed (unless UI like ReceiveShareActivity)

### Decision Tree

```
Does command use foundframe domain?
    ├── YES → Use AIDL service (Path 2)
    │           └── Add to IFoundframeRadicle.aidl
    │           └── Implement in aidl_service.rs
    │           └── Call from AndroidPlatform
    │
    └── NO → Use mobile plugin (Path 1)
                └── Add to ApiPlugin.kt
                └── Call via run_mobile_plugin()
                └── Optional: create reusable utility in o19-android
```

### Naming Conventions

| Layer | Command Name | Example |
|-------|-------------|---------|
| Rust command | `snake_case` | `start_camera` |
| Rust Platform method | `snake_case` | `fn start_camera(&self, ...)` |
| `run_mobile_plugin()` arg | `camelCase` | `"startCamera"` |
| Kotlin @Command method | `camelCase` | `fun startCamera(invoke: Invoke)` |

---

## Dependency Tree

### Package-Level Dependencies

```
                    ┌──────────────────┐
                    │   DearDiary      │
                    │   (Main App)     │
                    └────────┬─────────┘
                             │ depends on
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
    ┌─────────────────┐ ┌────────────────┐ ┌─────────────────┐
    │ foundframe-front│ │@o19/foundframe-│ │  tauri-plugin-  │
    │   (npm pkg)     │ │    tauri       │ │     os          │
    └────────┬────────┘ │  (npm pkg)     │ └─────────────────┘
             │          └───────┬────────┘
             │                  │
             │    ┌─────────────┘
             │    │ provides Tauri API
             ▼    ▼
    ┌─────────────────────────────┐
    │  o19-foundframe-tauri       │
    │  (Cargo: tauri plugin)      │
    │  ├─ android/ (Java/Kotlin)  │
    │  ├─ src/ (Rust commands)    │
    │  └─ ts/ (TypeScript API)    │
    └──────────┬──────────────────┘
               │ depends on
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌──────────┐ ┌───────────────┐
│ foundfr│ │ foundfr  │ │ o19-android   │
│ ame    │ │ ame-to-  │ │ (AAR crate)   │
│        │ │ sql      │ │ ├─ AIDL       │
└────────┘ └──────────┘ │ ├─ Activities │
                        │ └─ Service    │
                        └───────────────┘
```

### Service/Process Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    APP PROCESS (ty.circulari.DearDiary)         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   WebView    │  │  Tauri Core  │  │   ApiPlugin.kt       │  │
│  │   (Svelte)   │──│  (Rust JNI)  │──│  (foundframe-tauri)  │  │
│  └──────────────┘  └──────────────┘  └──────────┬───────────┘  │
│                                                 │               │
│  ┌──────────────────────────────────────────────┘               │
│  │ CameraPlugin.kt (in o19-android, used by ApiPlugin)          │
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ AIDL Binder IPC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              :FOUNDFrame PROCESS (ty.circulari.o19)             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │           FoundframeRadicleService (AIDL)                 │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  o19-foundframe (Rust via JNI)                      │  │ │
│  │  │  • Key storage (KERI)                               │  │ │
│  │  │  • TheStream (content-addressed)                    │  │ │
│  │  │  • P2P networking                                   │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Adding a Vertical Slice

> A "vertical slice" means adding a feature that spans from UI → TypeScript → Rust → Android.

### Step 1: Choose Your Path

**Is this a native Android feature OR a foundframe domain operation?**

- **Native feature** (camera, sensors, etc.) → Follow Path A below
- **Foundframe operation** (TheStream, Identity, etc.) → Follow Path B

### Path A: Native Android Feature

**Step A1:** Add to `Platform` trait (`src/platform.rs`):
```rust
pub trait Platform {
    // ... existing methods
    fn start_camera(&self, mode: String, direction: String) -> Result<serde_json::Value>;
}
```

**Step A2:** Implement in `DesktopPlatform` (`src/desktop.rs`):
```rust
fn start_camera(&self, _mode: String, _direction: String) -> Result<serde_json::Value> {
    Err(Error::Other("Camera not available on desktop".into()))
}
```

**Step A3:** Implement in `AndroidPlatform` (`src/mobile/android.rs`):
```rust
fn start_camera(&self, mode: String, direction: String) -> Result<serde_json::Value> {
    self.plugin_handle
        .run_mobile_plugin("startCamera", serde_json::json!({
            "mode": mode,
            "cameraDirection": direction
        }))
        .map_err(|e| Error::Other(format!("Camera error: {}", e)))
}
```

**Step A4:** Add Kotlin handler (`android/src/main/java/ApiPlugin.kt`):
```kotlin
@Command
fun startCamera(invoke: Invoke) {
    val args = invoke.parseArgs(CameraOptions::class.java)
    cameraPlugin?.startCameraInternal(invoke, args.mode, args.cameraDirection)
}
```

**Step A5:** (Optional) Create reusable utility in `crates/android/`

### Path B: Foundframe Domain Operation

**Step B1:** Add to `Platform` trait (`src/platform.rs`):
```rust
pub trait Platform {
    fn add_post(&self, content: String, title: Option<String>) -> Result<StreamEntryResult>;
}
```

**Step B2:** Implement in `DesktopPlatform` (`src/desktop.rs`):
```rust
fn add_post(&self, content: String, title: Option<String>) -> Result<StreamEntryResult> {
    // Call o19-foundframe directly
    let entry = self.stream.add_post(content, title.as_deref())?;
    Ok(StreamEntryResult { ... })
}
```

**Step B3:** Implement in `AndroidPlatform` (`src/mobile/android.rs`):
```rust
fn add_post(&self, content: String, title: Option<String>) -> Result<StreamEntryResult> {
    // Call AIDL service
    let reference = self.with_client(|c| c.add_post(&content, title.as_deref()))?;
    Ok(StreamEntryResult { id: None, seen_at: ..., reference })
}
```

**Step B4:** Add to AIDL interface (`crates/android/aidl/.../IFoundframeRadicle.aidl`):
```aidl
String addPost(String content, @nullable String title);
```

**Step B5:** Implement in `aidl_service.rs` (calls foundframe via JNI)

### Step 2: Register in Plugin

**File:** `crates/foundframe-tauri/src/lib.rs`

Add to the `generate_handler!` macro:
```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    commands::my_feature,
])
```

### Step 3: Add to build.rs

**File:** `crates/foundframe-tauri/build.rs`

```rust
const COMMANDS: &[&str] = &[
    // ... existing commands
    "my_feature",
];
```

### Step 4: Add Permission

**File:** `crates/foundframe-tauri/permissions/default.toml`

```toml
permissions = [
    # ... existing permissions
    "allow-my-feature",
]
```

### Step 5: Add Android Implementation

**File:** `crates/foundframe-tauri/android/src/main/java/ApiPlugin.kt`

```kotlin
@Command
fun myFeature(invoke: Invoke) {
    val args = invoke.parseArgs(MyFeatureOptions::class.java)
    // Call into o19-android if needed, or implement directly
    // ...
    val result = JSObject().apply {
        put("success", true)
    }
    invoke.resolve(result)
}
```

### Step 6: Export TypeScript API

**File:** `crates/foundframe-tauri/ts/index.ts`

```typescript
export interface MyFeatureOptions {
  param: string;
}

export async function myFeature(options: MyFeatureOptions): Promise<{ success: boolean }> {
  return await invoke('plugin:o19-foundframe-tauri|my_feature', options);
}
```

### Step 7: Use in Frontend

**File:** `code/apps/DearDiary/src/...`

```typescript
import { myFeature } from '@o19/foundframe-tauri';

async function handleClick() {
  const result = await myFeature({ param: 'value' });
}
```

### Step 8: Add Capability Permission

**File:** `code/apps/DearDiary/src-tauri/capabilities/default.json`

```json
{
  "permissions": [
    "o19-foundframe-tauri:allow-my-feature"
  ]
}
```

---

## Common Patterns

### Pattern: Reusable Android Component

If you need reusable Android code (like CameraPlugin):

1. **Put it in `crates/android`** — NOT in foundframe-tauri
2. **ApiPlugin creates/uses it** — CameraPlugin is instantiated by ApiPlugin
3. **No Tauri dependencies** — CameraPlugin doesn't extend Plugin

```
crates/android/android/java/ty/circulari/o19/
├── CameraPlugin.kt          # Reusable, no Tauri deps
├── activities/
│   └── ReceiveShareActivity.kt
└── service/
    └── FoundframeRadicleService.kt  # AIDL service
```

### Pattern: Desktop vs Android Platform

**File:** `crates/foundframe-tauri/src/platform.rs`

```rust
pub trait Platform: Send + Sync {
    fn my_operation(&self) -> Result<()>;
}

// Desktop: direct implementation
#[cfg(desktop)]
impl Platform for DesktopPlatform {
    fn my_operation(&self) -> Result<()> {
        // Call o19-foundframe directly
    }
}

// Android: AIDL via service
#[cfg(mobile)]
impl Platform for AndroidPlatform {
    fn my_operation(&self) -> Result<()> {
        // Call AIDL service, which calls o19-foundframe
    }
}
```

### Pattern: Events from Android to Frontend

Use Tauri's event system:

**Kotlin (ApiPlugin.kt):**
```kotlin
val event = JSObject().apply {
    put("data", value)
}
trigger("my-event", event)  // Emit to JS
```

**TypeScript:**
```typescript
import { listen } from '@tauri-apps/api/event';

listen('my-event', (event) => {
  console.log(event.payload);
});
```

---

## File Reference Cheat Sheet

| Layer | Purpose | Key Files |
|-------|---------|-----------|
| **Frontend** | Svelte components | `code/apps/DearDiary/src/lib/components/**/*.svelte` |
| **Frontend** | Domain services | `code/apps/DearDiary/src/lib/services/*.ts` |
| **NPM** | foundframe-front | `code/packages/foundframe-front/src/` |
| **NPM** | foundframe-tauri | `o19/crates/foundframe-tauri/ts/` |
| **Rust** | Commands | `o19/crates/foundframe-tauri/src/commands.rs` |
| **Rust** | Platform trait | `o19/crates/foundframe-tauri/src/platform.rs` |
| **Rust** | Android platform | `o19/crates/foundframe-tauri/src/mobile/android.rs` |
| **Rust** | Desktop platform | `o19/crates/foundframe-tauri/src/desktop.rs` |
| **Android** | Tauri Plugin | `o19/crates/foundframe-tauri/android/src/main/java/ApiPlugin.kt` |
| **Android** | Reusable utils | `o19/crates/android/android/java/ty/circulari/o19/` |
| **Android** | AIDL Service | `o19/crates/android/android/aidl/` |
| **Core** | Foundframe domain | `o19/crates/foundframe/src/` |
| **Config** | Build commands | `o19/crates/foundframe-tauri/build.rs` |
| **Config** | Permissions | `o19/crates/foundframe-tauri/permissions/default.toml` |
| **Config** | App capabilities | `code/apps/DearDiary/src-tauri/capabilities/default.json` |

---

## Troubleshooting

### "Plugin not found" error
- Check `build.rs` has the command
- Check `permissions/default.toml` has `allow-<command>`
- Check app's `capabilities/default.json` has `o19-foundframe-tauri:allow-<command>`

### "ClassNotFoundException" on Android
- Check `o19/crates/android/build.gradle` sourceSets point to correct directories
- Check `foundframe-tauri/android/build.gradle.kts` has `implementation(project(":o19_android"))`
- Run `./gradlew clean` before rebuild

### Camera/permissions not working

**Architecture reminder:**
- CameraPlugin is in `crates/android`, NOT in foundframe-tauri
- ApiPlugin handles permissions (it extends Plugin), CameraPlugin does not
- CameraX dependencies are in `crates/android/build.gradle`

**Permission request flow:**
```typescript
// 1. Check current status
const checkResult = await checkCameraPermissions();
if (checkResult.camera === 'granted') {
  // Already have permission
}

// 2. Request if needed (shows Android permission dialog)
const permResult = await requestCameraPermissions();
if (!permResult.granted) {
  // Permission denied - show settings UI
}

// 3. Then start camera
await startCamera({ mode: 'qr' });
```

**Permission denied forever?**
If user selected "Don't ask again", `requestCameraPermissions()` will return denied immediately. You should show a message directing them to Android Settings → Apps → DearDiary → Permissions.

---

*See also: [CODE_ARCHITECTURE.md](../CODE_ARCHITECTURE.md) for high-level system diagrams*

## General things

When adding new JNI calls, use a simple "#[no_mangle]" technique, don't try
using the `jni` crate, bad things happen sometimes

### JNI String Conversion from Rust (⚠️ Currently Broken)

**STATUS:** JNI string conversion from Java→Rust is causing segfaults. The vtable
access pattern works in theory but crashes at runtime. 

**WORKAROUND:** Use hardcoded values in Rust and ignore JNI string parameters:
```rust
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_MyClass_nativeMyMethod(
  _env: *mut std::ffi::c_void,
  _class: *mut std::ffi::c_void,
  _jstring_arg: *mut std::ffi::c_void,  // Ignore for now
) {
  // Use hardcoded values instead of converting JNI strings
  let value = "/data/data/...".to_string();
}
```

**FUTURE:** Need to investigate proper JNI bindings. The `jni` crate may work
better despite initial issues, or we need to fix the raw pointer arithmetic.
Common causes of the crash:
- JNIEnv structure differs between Android versions
- Vtable offsets may vary (170/171 for Get/ReleaseStringUTFChars was for Android 14)
- Thread-local JNIEnv state may not be valid in spawned threads
