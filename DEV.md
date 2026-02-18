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

### Step 1: Define the Rust Command

**File:** `crates/foundframe-tauri/src/commands.rs`

```rust
#[derive(Debug, Deserialize)]
pub struct MyFeatureOptions {
    param: String,
}

#[tauri::command]
pub(crate) async fn my_feature(
    options: MyFeatureOptions,
) -> Result<serde_json::Value> {
    // Desktop: implement directly
    // Android: handled by ApiPlugin.kt (this is just a stub)
    Ok(serde_json::json!({ "success": true }))
}
```

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
- CameraPlugin is in `crates/android`, NOT in foundframe-tauri
- ApiPlugin handles permissions (it extends Plugin), CameraPlugin does not
- CameraX dependencies are in `crates/android/build.gradle`

---

*See also: [CODE_ARCHITECTURE.md](../CODE_ARCHITECTURE.md) for high-level system diagrams*
