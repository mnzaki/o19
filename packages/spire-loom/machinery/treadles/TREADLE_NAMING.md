# Treadle Naming Convention

> *"Name the pattern, and the pattern persists."*

## The Convention

```
gen-{framework}-{concern}
```

| Part | Description | Examples |
|------|-------------|----------|
| `gen-` | Required prefix. Indicates this is a generator treadle. |
| `{framework}` | The target platform/technology | `android`, `tauri`, `rust`, `ios`, `wasm` |
| `{concern}` | What aspect it generates | `service`, `jni`, `aidl`, `plugin`, `core` |

## Examples

### Android Treadles
```
gen-android-service     # Kotlin foreground service
gen-android-jni         # Rust JNI bridge
gen-android-aidl        # AIDL interfaces
gen-android-manifest    # AndroidManifest.xml entries
gen-android-gradle      # build.gradle configuration
```

### Tauri Treadles
```
gen-tauri-plugin        # Tauri plugin with commands
gen-tauri-commands      # Command handlers only
gen-tauri-permissions   # permissions/default.toml
gen-tauri-desktop       # Desktop platform impl
gen-tauri-mobile        # Mobile platform impl
```

### Core Treadles
```
gen-rust-traits         # Rust trait definitions
gen-rust-impl           # Rust implementation templates
gen-ts-ports            # TypeScript Port interfaces
gen-ts-services         # TypeScript service implementations
```

## Why This Matters

### 1. Discovery Clarity
When scanning `loom/treadles/` or `machinery/treadles/`, the prefix immediately tells you what's a generator vs. what's a utility:

```
loom/treadles/
├── gen-esp32-service.ts      # ← Generator treadle
├── gen-esp32-flash.ts        # ← Generator treadle
├── helpers.ts                # ← Utility (no gen- prefix)
└── types.ts                  # ← Types (no gen- prefix)
```

### 2. Matrix Readability
In the generator matrix, the naming makes matches clear:

```typescript
matrix.setPair('RustAndroidSpiraler', 'RustCore', genAndroidService);
matrix.setPair('TauriSpiraler', 'RustAndroidSpiraler', genTauriMobile);
```

### 3. Spiraler Method Mapping
Spiraler methods can map directly to treadle names:

```typescript
// RustAndroidSpiraler
foregroundService() → matches gen-android-service
aidlInterface()     → matches gen-android-aidl (hypothetical)
broadcastReceiver() → matches gen-android-receiver (hypothetical)

// TauriSpiraler  
plugin()            → matches gen-tauri-plugin
commandsOnly()      → matches gen-tauri-commands
```

## The Spiraler↔Treadle Connection

### How They Relate

```
WARP.ts                      Matrix                    Treadle
   │                           │                          │
   ▼                           ▼                          ▼
android.foregroundService() → (RustAndroidSpiraler,    → gen-android-service
                               RustCore)
                               
   │                           │                          │
   └── Spiraler stores         └── Heddles match          └── Reads spiraler
       configuration               by type names               options
```

### The Flow

1. **User writes in WARP.ts:**
   ```typescript
   const android = foundframe.android.foregroundService({
     nameAffix: 'radicle',
     gradleNamespace: 'ty.circulari.o19'
   });
   ```

2. **Spiraler stores options:**
   ```typescript
   // RustAndroidSpiraler
   serviceOptions = { nameAffix: 'radicle', ... }
   ```

3. **Matrix matches:**
   ```typescript
   (RustAndroidSpiraler, RustCore) → genAndroidService
   ```

4. **Treadle reads options:**
   ```typescript
   data: (context, current, previous) => {
     const android = current.ring as RustAndroidSpiraler;
     const nameAffix = android.getNameAffix(); // 'radicle'
     ...
   }
   ```

## Multiple Treadles per Spiraler

A single spiraler can trigger multiple treadles:

```typescript
// RustAndroidSpiraler could have multiple methods
foregroundService() → matches gen-android-service
jniBridge()        → matches gen-android-jni  
aidlInterface()    → matches gen-android-aidl
```

Or use **one treadle with multiple outputs** (current approach):

```typescript
// gen-android-service generates all three
outputs: [
  { template: 'android/service.kt.ejs', ... },      // Kotlin
  { template: 'android/aidl_interface.aidl.ejs', ... }, // AIDL
  { template: 'android/jni_bridge.jni.rs.ejs', ... },   // Rust JNI
]
```

## When to Split vs. Combine

**Combine when:**
- Files are tightly coupled (same methods, shared data)
- Always generated together
- Same language/transformations

**Split when:**
- Files can be generated independently
- Different lifecycles (e.g., one-time vs. per-method)
- Different concerns (code vs. config)

## Current Treadles (Pre-Rename)

| Current Name | New Name | Framework | Concern |
|--------------|----------|-----------|---------|
| `android-generator` | `gen-android-service` | android | service |
| `tauri-generator` | `gen-tauri-plugin` | tauri | plugin |

---

> *"The name carries the intention; the treadle carries the thread."* 🧵
