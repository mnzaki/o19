# foundframeimpl

> *the native implementation of the foundational frame*

## What This Is

**foundframeimpl** is the Rust implementation of the [foundframe](../foundframe/) domain. While `foundframe` defines *what* the system does—ports, entities, services—`foundframeimpl` provides the native *how*: SQLite via sqlx, HTTP requests via reqwest, media processing via native codecs.

This is the **adaptor** layer in our architecture: the concrete fulfillment of the abstract contracts defined upstream.

## The Semantic Collision

Notice the name: **impl** as in "implementation," but also—if you squint—**ffi** as in "Foreign Function Interface." This is intentional. This crate is both:

1. The native implementation of foundframe's ports
2. The FFI bridge that lets TypeScript call into Rust

The joke is that from TypeScript's perspective, Rust *is* the foreign function. From Rust's perspective, it's just home. The collision encodes the perspective shift inherent in any cross-language boundary.

## What Lives Here

### `sql_proxy`

A SQLite proxy that executes SQL via sqlx. This is how `foundframe-drizzle` ultimately talks to the database—through this Rust layer, whether via the Tauri plugin or directly.

### `preview`

URL preview generation:
- **html**: Scrape webpages for metadata (OpenGraph, title, description)
- **media**: Download and thumbnail images/videos, extract EXIF data

The preview system handles the messy reality of the web: malformed HTML, missing headers, enormous files that need throttling, image formats that need conversion.

### `error`

The error types that propagate across the FFI boundary. Errors must be serializable (serde), displayable (thiserror), and meaningful across language boundaries.

## The Architecture

```
TypeScript Domain (foundframe)
    ↓ Ports (abstract contracts)
    
TypeScript Adaptors (foundframe-drizzle)
    ↓ FFI calls via Tauri
    
Rust Implementation (foundframeimpl) ← you are here
    ↓ Native libraries (sqlx, reqwest, image, etc.)
    
Operating System
```

## Why Rust?

Some things are better done in native code:

- **Media processing**: Decoding images, extracting EXIF, generating thumbnails—CPU-intensive, better parallelized
- **Database access**: sqlx gives us compile-time checked SQL with native performance
- **Network requests**: reqwest handles the complexity of modern HTTP (streaming, compression, redirects)
- **Cryptography**: blake3 for content hashing when we get there

Plus: Rust's type system enforces the same discipline we value in the TypeScript domain. The compiler is a collaborator.

## Relationship to Tauri

This crate is `crate-type = ["dylib"]` because it's designed to be loaded as a native extension. The [`@o19/foundframe-tauri`](../@o19/foundframe-tauri/) wraps this crate in Tauri's plugin system, exposing its functionality to the webview.

But the core logic is Tauri-agnostic. You could use this crate in a CLI tool, a background service, or a different GUI framework. The `sql_proxy::execute_sql` function takes a `&Path` to the database, not a Tauri `AppHandle`.

## Conservation of Structure

The same port-adaptor pattern that governs `foundframe`→`foundframe-drizzle` also governs `foundframeimpl`→`@o19/foundframe-tauri`:

- **foundframeimpl** defines the native *ports* (the Rust functions that must be implemented)
- **@o19/foundframe-tauri** provides the *adaptor* (the Tauri-specific glue)

This recursive structure—ports and adaptors at every boundary—is how we maintain consistency across the stack.

## Reading On

- [`foundframe`](../foundframe/): The domain layer, ports, and services
- [`foundframe-drizzle`](../foundframe-drizzle/): The TypeScript Drizzle implementation
- [`@o19/foundframe-tauri`](../@o19/foundframe-tauri/): The Tauri plugin that wraps this crate

---

## The Entity Ordering: Increasing Semantic Density

The entities that constitute the foundframe domain are ordered by **semantic density**—from raw bits to emergent relation:

| Entity | What It Is | Semantic Content |
|--------|------------|------------------|
| **Media** | Raw bits, no structure | Pure content—a blob that could be anything |
| **Bookmark** | URL + context | Points outward to the web, carries annotation |
| **Post** | Authored, composed | Self-contained creation, authored voice |
| **Person** | Identity, ongoing | Persistent being across time, relational center |
| **Conversation** | Emergent, multi-party | Temporal unfolding between persons, the space where meaning is made together |

### Why This Order Matters

Each entity builds on the previous:
- Media has no relations (raw bits)
- Bookmark relates to an external URL
- Post relates to an author (a Person) and content
- Person relates to history, identity, and multiple conversations
- Conversation relates multiple Persons across time—**emergent** meaning that exists only in the relation

This is not taxonomy for taxonomy's sake. The ordering reflects the **ontology of digital being**:

> *"From raw matter, through reference and authorship, to identity, and finally to the intersubjective space where we become who we are together."*

### Conservation in Code

The same progression appears across all Rings:

- **Ring 3 (Core)**: `Media` is a hash + mime; `Conversation` is a graph of `Person` references + temporal span
- **Ring 2 (Bridge)**: Each entity serializes differently—Media as raw bytes, Conversation as a manifest
- **Ring 6 (Front)**: UI reflects density—Media as thumbnail, Conversation as threaded view

foundframe takes care of **all these concerns**—what it means for each entity to *be* and to *continue to be*.

---

*"The frame finds its foundation; the foundation finds its frame."*
