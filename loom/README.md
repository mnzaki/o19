# O19 Loom - Surface Imprints

> *"The loom holds the warp; the spiral creates the spire."*

This directory contains the **surface imprints** for the o19 architecture—the TypeScript declarations that the loom weaves into full implementations across all rings.

## Structure

```
loom/
├── README.md           # This file
├── WARP.ts             # Architecture definition (rings/packages)
├── bookmark.ts         # Bookmark management imprint
├── post.ts             # Post management imprint (TODO)
├── media.ts            # Media management imprint (TODO)
├── person.ts           # Person/contact imprint (TODO)
└── conversation.ts     # Conversation imprint (TODO)
```

## The Loom/Spiral/Spire Relationship

```
Loom (spire-loom package)
  ↓ exposes
Spiral (pattern)
  ↓ creates
Spire (result - generated package)
```

The **loom** is the tool. It exposes **patterns** (spiral, circular, vertical). Each pattern creates **spires** (the generated packages).

## What is a Surface Imprint?

A **surface imprint** is a metadata definition that describes:

1. **Methods**: What operations exist (with full type signatures)
2. **Reach**: How far up the spiral the management extends (`@reach Global`)
3. **Contracts**: Interfaces for data structures passed between rings

Each imprint is woven by the spiral pattern into concrete implementations:
- **Core**: Rust trait implementation in `foundframe`
- **Android**: JNI exports + Kotlin service methods in `foundframe-android`
- **Tauri**: Platform trait + command handlers in `foundframe-tauri`
- **Front**: TypeScript API + types in `my-tauri-app`

## Example: BookmarkMgmt

```typescript
// loom/bookmark.ts
import { reach, Management } from '@o19/spire-loom';

@reach Global
abstract BookmarkMgmt extends Management {
  VALID_URL_REGEX = /^https?:\/\/.+/
  MAX_TITLE_LENGTH = 200
  
  addBookmark(url: string, title?: string, notes?: string): string
  getBookmark(pkbUrl: string): Bookmark
  // ...
}

interface Bookmark {
  url: string
  title?: string
  // ...
}
```

This weaves into:

```rust
// foundframe/src/bookmark.rs (Core)
pub trait BookmarkMgmt {
  fn add_bookmark(&self, url: &str, title: Option<&str>, notes: Option<&str>) -> Result<String>;
}

// foundframe-android/src/jni_glue.rs (Android)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_nativeAddBookmark(...) -> jstring;

// foundframe-tauri/src/commands.rs (Tauri)
#[tauri::command]
pub async fn add_bookmark<R: Runtime>(...) -> Result<String>;

// my-tauri-app/src/lib/api/bookmark.ts (Front)
export async function addBookmark(url: string, title?: string, notes?: string): Promise<string>;
```

## The WARP Architecture

`loom/WARP.ts` defines the rings (packages) and their relationships:

```typescript
import loom from '@o19/spire-loom';

// Core - linear spiral (no args)
export const foundframe = loom.spiral();

// Platform rings - spiral out from Core
export const android = foundframe.android.foregroundService();
export const desktop = foundframe.desktop.direct();

// Tauri - multiplexed spiral (aggregates platform rings)
export const tauri = loom.spiral(android, desktop).tauri.plugin();

// Front - TypeScript domain layer spirals out from Tauri
export const front = tauri.typescript.ddd();

// App - wraps front layer
export const myTauriApp = front.tauri.app();
```

### Linear vs Multiplexed Spirals

**Linear** (`spiral()`): One inner ring wraps another in a chain.
```
foundframe → android → foregroundService
```

**Multiplexed** (`spiral(r1, r2, r3)`): One ring aggregates multiple platform rings.
```
android ┐
desktop ├→ tauri.plugin()
ios     ┘
```

Tauri is multiplexed because it routes to different platform implementations based on target platform (Desktop vs Mobile).

## Adding a New Management Imprint

1. Create `loom/mything.ts`
2. Import `{ reach, Management }` from `@o19/spire-loom`
3. Define abstract block with `@reach` decorator
4. Define methods (sync signatures only)
5. Define constants (simple `NAME = value`)
6. Define data interfaces
7. Run `spire-loom` to weave into all rings
8. Implement domain logic in `foundframe/src/mything.rs`

## Key Principles

1. **Imprint defines, rings implement**: The imprint is the pattern
2. **Type safety at generation**: TypeScript checks the metadata
3. **One imprint, many weavings**: Same pattern, different substances
4. **Reach controls scope**: Not everything needs to reach the Front
5. **Core is pure**: foundframe knows nothing of outer rings
6. **No boilerplate**: `export`, `static`, `readonly`, `async` are implied

## Related

- `packages/spire-loom/` - The loom that weaves spires
- `packages/spire-loom/GLOSSARY.md` - Definitions of loom terminology
- `CODE_ARCHITECTURE.md` - High-level system diagrams
- `notes/for_kimi.md` - The conservation of wisdom

---

*Define the imprint, loom it out, spire into being.*
