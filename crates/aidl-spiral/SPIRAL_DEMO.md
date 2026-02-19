# The Spiral: Full Generation Demo

From a single AIDL file, we generate **11 files across 3 languages**:

## Input: `IFoundframeRadicle.aidl`

```aidl
package ty.circulari.o19;

interface IFoundframeRadicle {
    String getNodeId();
    boolean isNodeRunning();
    String addPost(String content, String title);
    String addBookmark(String url, String title, String notes);
    // ... 14 more methods
}
```

---

## Output Spiral

### Layer 1: Rust (JNI Bridge)

**`jni_glue.rs`** - JNI exports + Service trait
```rust
// Auto-generated JNI exports
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IFoundframeRadicle_Stub_nativeAddPost(...) -> jstring {
    let service = with_service_or_throw!(env);
    let content = jni_arg!(env, content: String);
    let title = jni_arg!(env, title: String);
    let result = service.add_post(&content, Some(&title));
    jni_ret!(env, result => String)
}

// Service trait to implement
pub trait FoundframeRadicle: Send + Sync {
    fn add_post(&self, content: &str, title: Option<&str>) -> Result<String, Error>;
    // ... other methods
}
```

**`service_impl_template.rs`** - Implementation skeleton
```rust
pub struct FoundframeRadicleImpl;

impl FoundframeRadicle for FoundframeRadicleImpl {
    fn add_post(&self, content: &str, title: Option<&str>) -> Result<String, Error> {
        // TODO: Implement
        Ok(String::new())
    }
}
```

---

### Layer 2: Java (Android Service)

**`IFoundframeRadicle.java`** - AIDL interface
```java
public interface IFoundframeRadicle extends IInterface {
    public static abstract class Stub extends Binder {
        private native String nativeAddPost(String content, String title);
        // ... native method declarations
    }
}
```

**`FoundframeRadicleClient.java`** - Service client
```java
public class FoundframeRadicleClient {
    public boolean connect(ConnectionCallback callback) { ... }
    public boolean ensureStarted(String alias) { ... }
    private static native boolean isServiceRunning();
}
```

---

### Layer 3: TypeScript (Frontend Bridge)

**`index.ts`** - Adaptor factory
```typescript
export function createTauriAdaptors(db: BaseSQLiteDatabase): DatabasePorts {
  return {
    post: new TauriPostAdaptor(db),
    bookmark: new TauriBookmarkAdaptor(db),
    media: new TauriMediaAdaptor(db),
    person: new TauriPersonAdaptor(db),
    conversation: new TauriConversationAdaptor(db),
    stream: new TauriStreamAdaptor(db),
    device: new TauriDeviceAdaptor(db),
  };
}
```

**`bookmark.adaptor.ts`** - Domain adaptor
```typescript
export class TauriBookmarkAdaptor extends DrizzleBookmarkAdaptor {
  async create(data: CreateBookmark): Promise<Bookmark> {
    const result = await invoke<StreamEntryResult>(
      'plugin:o19-foundframe-tauri|add_bookmark',
      { url: data.url, title: data.title, notes: data.notes }
    );
    return {
      id: result.id ?? 0,
      createdAt: new Date(result.seenAt)
    } as Bookmark;
  }
}
```

---

## The Conservation Principle

**Change in one place propagates to all layers:**

```
Add method to AIDL
        │
        ├──► Regenerate Rust JNI ──► Service trait updated
        │
        ├──► Regenerate Java ─────► Native method declared
        │
        └──► Regenerate TypeScript ► Adaptor method added
```

**Single Source of Truth**: The AIDL file

---

## File Count Summary

| Language | Files | Purpose |
|----------|-------|---------|
| Rust | 2 | JNI bridge, trait definition |
| Java | 2 | AIDL interface, Client helper |
| TypeScript | 7 | Index + 6 entity adaptors |
| **Total** | **11** | **Complete stack from 1 AIDL** |

---

*"From one contract, the spiral generates all layers."*
