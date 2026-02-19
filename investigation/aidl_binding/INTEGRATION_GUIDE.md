# JNI-Based AIDL Integration Guide

This guide explains how to integrate the JNI-based AIDL approach for the FoundframeRadicle service.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Android App (Java/Kotlin)                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐ │
│  │   MainActivity  │───▶│ FoundframeClient│───▶│  FoundframeService  │ │
│  │   (Tauri/Web)   │    │   (AIDL Stub)   │    │   (Java Service)    │ │
│  └─────────────────┘    └─────────────────┘    └──────────┬──────────┘ │
│                                                           │            │
└───────────────────────────────────────────────────────────┼────────────┘
                                                            │ bindService()
                                                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    :foundframe Process (Separate)                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    FoundframeRadicleService                       │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │   IFoundframeRadicle.Stub (AIDL-generated Java Binder)      │  │  │
│  │  │   - onTransact() dispatches to native methods               │  │  │
│  │  │   - nativeGetNodeId(), nativeAddPost(), etc.                │  │  │
│  │  └──────────────────────┬─────────────────────────────────────┘  │  │
│  │                         │ JNI calls                                │  │
│  │                         ▼                                          │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │   Rust Native Library (libfoundframe.so)                    │  │  │
│  │  │   ┌──────────────────────────────────────────────────────┐ │  │  │
│  │  │   │  JNI Functions (aidl_service.rs)                      │ │  │  │
│  │  │   │  - Java_ty_circulari_o19_..._nativeGetNodeId()       │ │  │  │
│  │  │   │  - Java_ty_circulari_o19_..._nativeAddPost()         │ │  │  │
│  │  │   └──────────────────────┬───────────────────────────────┘ │  │  │
│  │  │                          │                                  │  │  │
│  │  │                          ▼                                  │  │  │
│  │  │   ┌──────────────────────────────────────────────────────┐ │  │  │
│  │  │   │  FoundframeService (Your Implementation)            │ │  │  │
│  │  │   │  - get_node_id() -> Result<String, Error>          │ │  │  │
│  │  │   │  - add_post() -> Result<String, Error>             │ │  │  │
│  │  │   │  - etc.                                             │ │  │  │
│  │  │   └──────────────────────────────────────────────────────┘ │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## File Structure

### Generated Files (by aidl-spiral)
```
generated/
├── jni_glue.rs          # JNI functions + trait definition
├── service_impl_template.rs  # Template for your implementation
└── java/ty/circulari/o19/
    └── IFoundframeRadicle.java  # Java interface with Stub class
```

### Rust Implementation
```
o19/crates/android/src/
├── lib.rs               # Crate root, exports
├── aidl_service.rs      # Service impl + JNI functions
└── aidl_client.rs       # Minimal client (mostly unused)
```

### Java Implementation
```
o19/crates/android/android/src/main/java/ty/circulari/o19/
├── IFoundframeRadicle.java      # Generated AIDL interface
├── IEventCallback.java          # Generated callback interface
└── service/
    ├── FoundframeRadicleService.java   # Service implementation
    └── FoundframeRadicleClient.java    # Client helper
```

## Setup Steps

### 1. Generate AIDL Code

Add to your `build.rs`:

```rust
use aidl_codegen::{generate_from_aidl, JniConfig};

fn main() {
    let config = JniConfig {
        java_package: "ty.circulari.o19".to_string(),
        rust_crate_name: "o19_android".to_string(),
        ..Default::default()
    };
    
    generate_from_aidl(
        "aidl/IFoundframeRadicle.aidl",
        &config,
        &format!("{}/generated", std::env::var("OUT_DIR").unwrap()),
    ).expect("AIDL code generation failed");
}
```

### 2. Implement the Service (Rust)

Create `src/service_impl.rs` (copy from `service_impl_template.rs`):

```rust
use crate::generated::jni_glue::{FoundframeRadicle, init_service};

pub struct FoundframeServiceImpl {
    // Your fields here
    foundframe: Option<o19_foundframe::Foundframe>,
}

impl FoundframeServiceImpl {
    pub fn new() -> Self {
        Self { foundframe: None }
    }
}

impl FoundframeRadicle for FoundframeServiceImpl {
    fn get_node_id(&self) -> Result<String, Box<dyn std::error::Error>> {
        // Your implementation
        Ok("my-node-id".to_string())
    }
    
    fn add_post(&self, content: &str, title: &str) 
        -> Result<String, Box<dyn std::error::Error>> 
    {
        // Your implementation
        Ok("radicle://post/123".to_string())
    }
    
    // ... implement other methods
}

pub fn init() {
    init_service(FoundframeServiceImpl::new());
}
```

### 3. JNI OnLoad

Initialize the service when the library loads:

```rust
#[unsafe(no_mangle)]
pub extern "C" fn JNI_OnLoad(_vm: JavaVM, _reserved: c_void) -> jint {
    service_impl::init();
    JNI_VERSION_1_6
}
```

### 4. Java Service Implementation

The `FoundframeRadicleService.java` loads the native library and delegates to native methods:

```java
public class FoundframeRadicleService extends Service {
    static {
        System.loadLibrary("foundframe");
    }
    
    private final IFoundframeRadicle.Stub binder = new IFoundframeRadicle.Stub() {
        @Override
        public String getNodeId() {
            return nativeGetNodeId();  // Calls Rust JNI function
        }
        // ... other methods
    };
    
    // Native methods
    private native String nativeGetNodeId();
    private native String nativeAddPost(String content, String title);
    // ... etc
}
```

### 5. AndroidManifest.xml

Service declaration (already done):

```xml
<service
    android:name=".service.FoundframeRadicleService"
    android:process=":foundframe"
    android:exported="true"
    android:permission="ty.circulari.o19.BIND_FOUNDFRAME_RADICLE"
    android:foregroundServiceType="dataSync">
    <intent-filter>
        <action android:name="ty.circulari.o19.IFoundframeRadicle" />
    </intent-filter>
</service>
```

### 6. Using from Java/Kotlin

```kotlin
val client = FoundframeRadicleClient(context)
client.connect(object : FoundframeRadicleClient.ConnectionCallback {
    override fun onConnected(service: IFoundframeRadicle) {
        val nodeId = service.nodeId
        service.addPost("Hello", "My Post")
    }
    override fun onDisconnected() {}
    override fun onError(error: String) {}
})
```

## Building

### Rust library (Android targets):
```bash
cd o19
cargo ndk -t arm64-v8a -o crates/android/src/main/jniLibs build --release -p o19-android
```

### Java/Kotlin:
The Android build system (Gradle) will:
1. Compile the AIDL files
2. Compile Java sources
3. Package the native library from `jniLibs/`

## Data Flow Example

### addPost() call:

1. **Kotlin client** calls `service.addPost(content, title)`
2. **AIDL Proxy** (Java) marshals data to Parcel, sends via Binder
3. **AIDL Stub** (Java in :foundframe) receives in `onTransact()`
4. **Stub** calls `nativeAddPost(content, title)`
5. **JNI function** (Rust) receives: `JNIEnv`, `JString`, `JString`
6. **JNI** converts `JString` → `&str`, calls `service.add_post(content, title)`
7. **Your implementation** processes the request, returns result
8. **JNI** converts result → `JString`, returns to Java
9. **Stub** writes result to reply Parcel
10. **Proxy** unmarshals and returns to Kotlin client

## Key Differences from NDK Binder Approach

| Aspect | NDK Binder (Old) | JNI Approach (New) |
|--------|------------------|-------------------|
| Service registration | `ServiceManager.addService()` | Java Service + `Context.bindService()` |
| Process isolation | Manual | Automatic via `:foundframe` |
| Works for regular apps | ❌ No (system only) | ✅ Yes |
| API Level | 29+ | Any (API 21+) |
| Code generation | `binder` crate traits | Custom JNI generator |
| Marshalling | Automatic (Parcel) | Manual in JNI layer |

## Troubleshooting

### "UnsatisfiedLinkError: nativeGetNodeId"
- Ensure `System.loadLibrary("foundframe")` is called before native methods
- Check that `libfoundframe.so` is in the correct `jniLibs/` directory

### "Service not initialized"
- Call `init_service()` in `JNI_OnLoad` or before first AIDL call
- Check that the service is running in the `:foundframe` process

### "Failed to bind to service"
- Verify the service declaration in `AndroidManifest.xml`
- Check that the custom permission is declared and granted

### Native method not found
- Ensure JNI function names match exactly: `Java_ty_circulari_o19_IFoundframeRadicle_Stub_nativeGetNodeId`
- Use `javah` or check generated headers to verify names
