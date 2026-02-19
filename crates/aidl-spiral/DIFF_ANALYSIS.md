# Diff Analysis: Generated vs Actual vs Desired

> *"Know what is, know what should be, then bridge the gap."*

## Overview

This document compares:
- **Generated**: What `aidl-spiral` currently produces
- **Actual**: What exists in the codebase
- **Desired**: What we want (often closer to actual, with improvements)

---

## 1. Kotlin Service Skeleton

### Current (Actual): `FoundframeRadicleService.kt`

**Location**: `o19/crates/android/android/java/.../FoundframeRadicleService.kt`

**Characteristics**:
- Extends `android.app.Service`
- Foreground service with notification
- Loads native library `libandroid.so` (not `libfoundframe.so`)
- Calls `nativeStartService(radicleHome, alias)` - a single init function
- Returns `null` from `onBind()` (uses ServiceManager directly)
- STICKY restart behavior

**Key Code**:
```kotlin
class FoundframeRadicleService : Service() {
    private external fun nativeStartService(radicleHome: String, alias: String)
    
    override fun onBind(intent: Intent): IBinder? = null  // No binding!
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // ... foreground service setup ...
        Thread { nativeStartService(radicleHome, alias) }.start()
        return START_STICKY
    }
}
```

### Generated: Java Client

**Location**: `gen/IFoundframeRadicle/java/.../FoundframeRadicleClient.java`

**Issues**:
- ❌ Generates **Java** (not Kotlin)
- ❌ Missing the **Service implementation** entirely
- ❌ Only generates Client helper
- ❌ No notification/foreground service setup
- ❌ No `nativeStartService` binding

### Desired: Kotlin Service Generation

**What we want**:
```kotlin
package ty.circulari.o19.service

import android.app.Service
import android.content.Intent
import android.os.IBinder

/**
 * Auto-generated from IFoundframeRadicle.aidl
 */
class FoundframeRadicleService : Service() {
    
    companion object {
        init {
            System.loadLibrary("foundframe")
        }
    }
    
    // Generated native methods from AIDL
    private external fun nativeStartService(radicleHome: String, alias: String)
    private external fun nativeGetNodeId(): String
    private external fun nativeAddPost(content: String, title: String?): String
    // ... etc for all AIDL methods
    
    private val binder = object : IFoundframeRadicle.Stub() {
        // Implement AIDL interface by delegating to native methods
        override fun getNodeId(): String = nativeGetNodeId()
        override fun addPost(content: String?, title: String?): String = 
            nativeAddPost(content ?: "", title)
        // ... etc
    }
    
    override fun onBind(intent: Intent): IBinder = binder
}
```

**Gap Analysis**:
| Feature | Actual | Generated | Gap |
|---------|--------|-----------|-----|
| Language | Kotlin | Java | 🔴 Need Kotlin generator |
| Service class | ✅ Full impl | ❌ Missing | 🔴 Major gap |
| Native methods | ✅ `nativeStartService` | ❌ Missing init | 🟡 Add to JNI |
| AIDL delegation | ❌ No (uses SM directly) | ❌ N/A | 🟢 Actual approach differs |
| Foreground service | ✅ Yes | ❌ No | 🟡 Nice to have |

---

## 2. Rust Tauri Commands

### Current (Actual): `commands.rs`

**Location**: `o19/crates/foundframe-tauri/src/commands.rs`

**Characteristics**:
- Commands call `app.platform().method_name(...)`
- Returns `Result<StreamEntryResult>`
- Commands: `add_post`, `add_bookmark`, `add_media_link`, `add_person`, `add_conversation`, `add_text_note`
- Also has: `ping`, `run_sql`, `compress_image`, `generate_preview`

**Example**:
```rust
#[tauri::command]
pub(crate) async fn add_post<R: Runtime>(
  app: AppHandle<R>,
  content: String,
  title: Option<String>,
) -> Result<StreamEntryResult> {
  app.platform().add_post(content, title)
}
```

### Generated: ❌ NOTHING

**Status**: We don't generate Tauri commands yet!

### Desired: Generate `commands.rs`

**What we want**:
```rust
//! Auto-generated Tauri commands from IFoundframeRadicle.aidl

use tauri::{AppHandle, Manager, Runtime};
use crate::{Result, models::*};

/// Add a post to the stream
#[tauri::command]
pub async fn add_post<R: Runtime>(
    app: AppHandle<R>,
    content: String,
    title: Option<String>,
) -> Result<StreamEntryResult> {
    app.platform().add_post(content, title)
}

/// Add a bookmark to the stream
#[tauri::command]
pub async fn add_bookmark<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    title: Option<String>,
    notes: Option<String>,
) -> Result<StreamEntryResult> {
    app.platform().add_bookmark(url, title, notes)
}

// ... etc for all AIDL methods

/// Command registration
pub fn register_commands(builder: tauri::Builder) -> tauri::Builder {
    builder.invoke_handler(tauri::generate_handler![
        add_post,
        add_bookmark,
        add_media_link,
        add_person,
        add_conversation,
        add_text_note,
        // ... etc
    ])
}
```

**Gap Analysis**:
| Feature | Actual | Generated | Gap |
|---------|--------|-----------|-----|
| Command generation | ✅ Hand-written | ❌ None | 🔴 Major gap |
| Platform delegation | ✅ Yes | N/A | 🟢 Match actual pattern |
| Generic Runtime | ✅ `<R: Runtime>` | N/A | 🟢 Include in gen |
| Command registration | ❌ Manual | ❌ None | 🟡 Generate `register_commands` |

---

## 3. Platform Trait

### Current (Actual): `platform.rs`

**Location**: `o19/crates/foundframe-tauri/src/platform.rs`

**Characteristics**:
- Trait with methods like `add_post`, `add_bookmark`, etc.
- Returns `Result<StreamEntryResult>`
- Includes device pairing methods
- Has `event_bus()` and `stream()` accessors

**Key Methods**:
```rust
pub trait Platform: Send + Sync {
    fn event_bus(&self) -> &EventBus;
    fn stream(&self) -> &TheStream;
    fn exit(&self, code: i32);
    
    // Write operations
    fn add_post(&self, content: String, title: Option<String>) -> Result<StreamEntryResult>;
    fn add_bookmark(&self, url: String, title: Option<String>, notes: Option<String>) -> Result<StreamEntryResult>;
    // ... etc
    
    // Device pairing
    fn generate_pairing_qr(&self, device_name: String) -> Result<PairingQrResponse>;
    // ... etc
}
```

### Current (Actual): `desktop.rs` Implementation

**Characteristics**:
- Implements `Platform` trait
- Direct calls to `o19_foundframe`
- No async/await (blocking calls)

### Current (Actual): `mobile/android.rs` Implementation

**Characteristics**:
- Uses `aidl_client::Client`
- Calls methods like `service_client.add_post(...)`
- But the `Client` methods are currently stubs/mocks!

### Generated: ❌ NOTHING

**Status**: We don't generate Platform trait or implementations!

### Desired: Generated Platform

**Trait generation** (`generated/platform_trait.rs`):
```rust
//! Auto-generated Platform trait from IFoundframeRadicle.aidl

#[async_trait::async_trait]
pub trait Platform: Send + Sync {
    async fn add_post(&self, content: String, title: Option<String>) -> Result<StreamEntryResult>;
    async fn add_bookmark(&self, url: String, title: Option<String>, notes: Option<String>) -> Result<StreamEntryResult>;
    // ... etc for all AIDL methods
}
```

**Desktop implementation** (`generated/platform_desktop.rs`):
```rust
//! Auto-generated Desktop Platform implementation

#[async_trait::async_trait]
impl Platform for DesktopPlatform {
    async fn add_post(&self, content: String, title: Option<String>) -> Result<StreamEntryResult> {
        // Direct foundframe call
        let reference = self.foundframe.add_post(&content, title.as_deref())?;
        Ok(StreamEntryResult {
            id: None,
            seen_at: timestamp(),
            reference,
        })
    }
    // ... etc
}
```

**Android implementation** (`generated/platform_android.rs`):
```rust
//! Auto-generated Android Platform implementation

#[async_trait::async_trait]
impl Platform for AndroidPlatform {
    async fn add_post(&self, content: String, title: Option<String>) -> Result<StreamEntryResult> {
        // Call through AIDL client
        let reference = self.service_client.add_post(&content, title.as_deref())?;
        Ok(StreamEntryResult {
            id: None,
            seen_at: timestamp(),
            reference,
        })
    }
    // ... etc
}
```

**Gap Analysis**:
| Feature | Actual | Generated | Gap |
|---------|--------|-----------|-----|
| Trait definition | ✅ Hand-written | ❌ None | 🔴 Major gap |
| Desktop impl | ✅ Yes | ❌ None | 🔴 Major gap |
| Android impl | ✅ Yes (stubs) | ❌ None | 🔴 Major gap |
| Async/await | ❌ No (blocking) | Should add | 🟡 Consider async |

---

## 4. Event Callbacks (oneway)

### Current (Actual): `IEventCallback.aidl`

**Location**: `o19/crates/android/aidl/.../IEventCallback.aidl`

```aidl
package ty.circulari.o19;

interface IEventCallback {
    void onEvent(String eventType, String eventData);
}
```

### Current (Actual): Usage in `subscribeEvents`

**Location**: `o19/crates/foundframe-tauri/src/mobile/android.rs`

```rust
fn subscribe_events<F>(&self, callback: F) -> ServiceResult<()>
where
    F: Fn(&str, &str) + Send + 'static,
{
    // TODO: Implement - needs JNI callback setup
    Ok(())
}
```

### Generated: ❌ PARTIAL

We generate the AIDL stub but NOT the callback infrastructure.

### Desired: Full Callback Generation

**AIDL**:
```aidl
oneway void subscribeEvents(IEventCallback callback);
oneway void unsubscribeEvents(IEventCallback callback);
```

**Java**: Generate `IEventCallback` Stub for receiving events

**Rust JNI**: Generate callback trampoline
```rust
// Global callback storage
static EVENT_CALLBACK: Mutex<Option<GlobalRef>> = Mutex::new(None);

#[no_mangle]
pub extern "C" fn Java_..._nativeSubscribeEvents(
    env: JNIEnv,
    _class: JClass,
    callback: JObject,
) {
    let global = env.new_global_ref(callback).unwrap();
    *EVENT_CALLBACK.lock().unwrap() = Some(global);
}

// Call from Rust to Java
call_event_callback("stream_update", "{...json...}");
```

**TypeScript**: Generate event listener
```typescript
// Generated event types
export interface FoundframeEvents {
  onStreamUpdate: (data: StreamEntry) => void;
  onSyncComplete: (result: SyncResult) => void;
}

// Generated listener setup
export function subscribeToEvents(
  event: 'stream_update',
  handler: (data: StreamEntry) => void
): () => void {
  const unsubscribe = listen('foundframe:event', (e) => {
    if (e.payload.type === 'stream_update') {
      handler(e.payload.data);
    }
  });
  return unsubscribe;
}
```

**Gap Analysis**:
| Feature | Actual | Generated | Gap |
|---------|--------|-----------|-----|
| AIDL oneway | ✅ Yes | ✅ Partial | 🟡 Need full handling |
| Java callback | ❌ Manual | ❌ None | 🔴 Major gap |
| Rust callback | ❌ Stubs | ❌ None | 🔴 Major gap |
| TypeScript events | ❌ Manual | ❌ None | 🔴 Major gap |

---

## 5. Parcelables (Custom Types)

### Current (Actual): Primitive Types Only

**Generated supports**:
- Primitives: `boolean`, `int`, `long`, `String`
- Arrays: `String[]`

**Actual code uses**:
- Complex return types: `StreamEntryResult`, `PairingQrResponse`
- Custom structs with multiple fields

### Example from Actual Code

**`models.rs`**:
```rust
pub struct StreamEntryResult {
    pub id: Option<i64>,
    pub seen_at: u64,
    pub reference: String,
}

pub struct PairingQrResponse {
    pub url: String,
    pub emoji_identity: String,
    pub node_id_hex: String,
}
```

### Desired: Parcelable Generation

**AIDL**:
```aidl
package ty.circulari.o19;

parcelable StreamEntryResult {
    long id;           // -1 means null
    long seenAt;
    String reference;
}

parcelable PairingQrResponse {
    String url;
    String emojiIdentity;
    String nodeIdHex;
}
```

**Generated Rust**:
```rust
#[derive(Debug, Clone)]
pub struct StreamEntryResult {
    pub id: Option<i64>,
    pub seen_at: u64,
    pub reference: String,
}

// JNI conversion impls
impl FromJni for StreamEntryResult { ... }
impl IntoJni for StreamEntryResult { ... }
```

**Generated TypeScript**:
```typescript
export interface StreamEntryResult {
  id?: number;
  seenAt: number;
  reference: string;
}
```

**Gap Analysis**:
| Feature | Actual | Generated | Gap |
|---------|--------|-----------|-----|
| Parcelable parsing | ❌ None | N/A | 🔴 Add to parser |
| Rust struct gen | ❌ None | N/A | 🔴 Major gap |
| TypeScript interface | ❌ Manual | N/A | 🔴 Major gap |
| JNI conversion | ❌ Manual | N/A | 🔴 Complex gap |

---

## Summary Table

| Todo Item | Status | Priority | Complexity |
|-----------|--------|----------|------------|
| 1. Kotlin Service | 🔴 Not started | High | Medium |
| 2. Tauri Commands | 🔴 Not started | High | Low |
| 3. Platform Trait | 🔴 Not started | High | Medium |
| 4. Event Callbacks | 🟡 Partial | Medium | High |
| 5. Parcelables | 🔴 Not started | Medium | High |

---

## Recommended Implementation Order

1. **Tauri Commands** (Easiest, high impact)
   - Straight mapping from AIDL to command functions
   - Template-based generation

2. **Platform Trait** (Medium, high impact)
   - Define trait from AIDL
   - Generate Desktop implementation (direct calls)
   - Generate Android implementation (AIDL client calls)

3. **Kotlin Service** (Medium, high impact)
   - Switch Java generator to Kotlin
   - Generate Service class with native method delegations

4. **Event Callbacks** (Hard, medium impact)
   - Requires JNI callback infrastructure
   - Bidirectional communication

5. **Parcelables** (Hard, nice to have)
   - Parser changes for parcelable definitions
   - Multi-language struct generation

---

*"First bridge the easy gaps, then the hard ones."*
