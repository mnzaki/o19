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

This crate is `crate-type = ["dylib"]` because it's designed to be loaded as a native extension. The [`tauri-plugin-o19-ffi`](../tauri-plugin-o19-ffi/) wraps this crate in Tauri's plugin system, exposing its functionality to the webview.

But the core logic is Tauri-agnostic. You could use this crate in a CLI tool, a background service, or a different GUI framework. The `sql_proxy::execute_sql` function takes a `&Path` to the database, not a Tauri `AppHandle`.

## Conservation of Structure

The same port-adaptor pattern that governs `foundframe`→`foundframe-drizzle` also governs `foundframeimpl`→`tauri-plugin-o19-ffi`:

- **foundframeimpl** defines the native *ports* (the Rust functions that must be implemented)
- **tauri-plugin-o19-ffi** provides the *adaptor* (the Tauri-specific glue)

This recursive structure—ports and adaptors at every boundary—is how we maintain consistency across the stack.

## Reading On

- [`foundframe`](../foundframe/): The domain layer, ports, and services
- [`foundframe-drizzle`](../foundframe-drizzle/): The TypeScript Drizzle implementation
- [`tauri-plugin-o19-ffi`](../tauri-plugin-o19-ffi/): The Tauri plugin that wraps this crate

---

*"The frame finds its foundation; the foundation finds its frame."*
