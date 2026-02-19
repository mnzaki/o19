# aidl-codegen Status Board

> Current state and next steps for the spiral generator.

## ✅ What Works Now

### AIDL Parser
- ✅ Package declarations
- ✅ Interface definitions
- ✅ Methods with return types
- ✅ Arguments (primitives, String, arrays)
- ✅ Basic comments (stripped)

### Rust Generation
- ✅ JNI glue code (`jni_glue.rs`)
- ✅ Service trait definition
- ✅ Service singleton pattern
- ✅ Helper macros (`jni_arg!`, `jni_ret!`, `with_service_or_throw!`)
- ✅ Service implementation template

### Java Generation
- ✅ AIDL interface with Stub/Proxy
- ✅ Native method declarations
- ✅ Client helper class (FoundframeRadicleClient.java)

### TypeScript Generation
- ✅ Adaptor index file
- ✅ Entity adaptors (Post, Bookmark, Media, Person, Conversation, Stream, Device)
- ✅ Tauri command invocations
- ✅ StreamEntryResult type

## ✅ Recently Completed

| Feature | Status | Notes |
|---------|--------|-------|
| Tauri Commands | ✅ **DONE** | Generates `commands.rs` with `#[tauri::command]` fns |
| Code Formatting | ✅ **FIXED** | Using `prettyplease` for proper Rust formatting |
| Parcelable Types | ✅ **FIXED** | `IEventCallback` and other interfaces now work |

## ❌ What's Missing

| Feature | File | Priority | Est. Effort |
|---------|------|----------|-------------|
| Platform Trait | `platform.rs` + impls | 🔴 High | 4-6 hrs |
| Kotlin Service | `FoundframeRadicleService.kt` | 🔴 High | 3-4 hrs |
| Event Callbacks | `IEventCallback` handling | 🟡 Medium | 6-8 hrs |
| Parcelables | Custom types | 🟡 Medium | 8-10 hrs |

---

## 📊 Gap Analysis Summary

### 1. Tauri Commands ✅ DONE
**Current**: Generated in `commands.rs`  
**Generated**: ✅ `commands.rs` with all AIDL methods  
**Status**: 209 lines of formatted Rust code with `#[tauri::command]` handlers

```rust
// Desired output
#[tauri::command]
pub async fn add_post<R: Runtime>(
    app: AppHandle<R>,
    content: String,
    title: Option<String>,
) -> Result<StreamEntryResult> {
    app.platform().add_post(content, title)
}
```

### 2. Platform Trait
**Current**: Hand-written in `platform.rs`  
**Generated**: ❌ Nothing  
**Action**: Generate trait + Desktop/Android implementations

```rust
// Desired output
#[async_trait::async_trait]
pub trait Platform: Send + Sync {
    async fn add_post(&self, content: String, title: Option<String>) -> Result<StreamEntryResult>;
    // ... etc
}
```

### 3. Kotlin Service
**Current**: Hand-written `FoundframeRadicleService.kt`  
**Generated**: Java Client only  
**Action**: Generate Kotlin Service class with AIDL delegation

```kotlin
// Desired output
class FoundframeRadicleService : Service() {
    private val binder = object : IFoundframeRadicle.Stub() {
        override fun addPost(content: String?, title: String?): String = 
            nativeAddPost(content ?: "", title)
    }
    override fun onBind(intent: Intent): IBinder = binder
}
```

### 4. Event Callbacks
**Current**: `IEventCallback.aidl` exists, no implementation  
**Generated**: AIDL only  
**Action**: Generate bidirectional callback infrastructure

### 5. Parcelables
**Current**: Custom types in `models.rs`  
**Generated**: Primitives only  
**Action**: Parse `parcelable` definitions, generate multi-language structs

---

## 🎯 Recommended Next Steps

### Phase 1: High Impact, Low Effort
1. **Generate Tauri Commands** (2-4 hrs)
   - Straightforward template
   - High value for foundframe-tauri

2. **Generate Platform Trait** (4-6 hrs)
   - Foundation for platform abstraction
   - Enables Desktop/Android generation

### Phase 2: High Impact, Medium Effort
3. **Kotlin Service Generator** (3-4 hrs)
   - Switch from Java to Kotlin
   - Generate Service with AIDL delegation

### Phase 3: Medium Priority
4. **Event Callbacks** (6-8 hrs)
   - Complex JNI callback setup
   - Required for real-time events

5. **Parcelables** (8-10 hrs)
   - Parser changes
   - Multi-language struct generation

---

## 🏗️ Architecture Changes Needed

### Add New Generator Modules

```
src/
├── parser.rs           # ✅ Existing
├── jni_generator.rs    # ✅ Existing
├── ts_generator.rs     # ✅ Existing
├── cmd_generator.rs    # ❌ NEW: Tauri commands
├── platform_generator.rs # ❌ NEW: Platform trait
├── kotlin_generator.rs # ❌ NEW: Kotlin service
└── lib.rs
```

### Extend Parser

```rust
// parser.rs additions
pub struct AidlFile {
    // existing fields
    pub parcelables: Vec<Parcelable>,  // NEW
    pub callbacks: Vec<Callback>,      // NEW
}

pub struct Parcelable {
    pub name: String,
    pub fields: Vec<Field>,
}

pub struct Callback {
    pub name: String,
    pub methods: Vec<AidlMethod>,
}
```

---

## 📝 Usage Examples

### Current
```bash
# Generate what we have
aidl-codegen

# Output: gen/IFoundframeRadicle/
#   - jni_glue.rs ✅
#   - service_impl_template.rs ✅
#   - java/... ✅
#   - ts/adaptors/ ✅
#   - commands.rs ❌
#   - platform.rs ❌
#   - FoundframeRadicleService.kt ❌
```

### Desired Future
```bash
# Generate everything
aidl-codegen --full-stack

# Output: gen/IFoundframeRadicle/
#   - jni_glue.rs ✅
#   - service_impl_template.rs ✅
#   - java/... ✅
#   - ts/adaptors/ ✅
#   - commands.rs ✅
#   - platform.rs ✅
#   - FoundframeRadicleService.kt ✅
#   - event_handlers.rs ✅
#   - parcelables.rs ✅
```

---

## 🔧 Quick Fixes Needed

1. **Fix Kotlin service generation** (not Java)
2. ~~Add Tauri command generation~~ ✅ DONE
3. **Add Platform trait generation** (NEXT)
4. **Fix optional parameter handling in TypeScript** (`?` vs `| undefined`)
5. ~~Fix code formatting~~ ✅ DONE
6. **Add README generation** (already done ✅)

---

*Last updated: February 2026*  
*Spiral status: Ring 4 of 8 complete*
