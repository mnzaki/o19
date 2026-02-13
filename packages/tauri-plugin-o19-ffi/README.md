# tauri-plugin-o19-ffi

> *Tauri bindings and Foreign Function Interface (and foundframe implementation!) for o19*

## The Semantic Collision

The name contains a deliberate collision of meanings:

1. **FFI**: Foreign Function Interface—the standard acronym for calling native code from managed environments
2. **ffi**: **f**ound**f**rame **i**mplementation—the Rust layer that implements the domain

This is not a bug in naming. It is a feature of understanding. The same layer that exposes Rust to TypeScript via Tauri's FFI *is* the implementation of the foundframe domain. From TypeScript's perspective, Rust is foreign. From the domain's perspective, this is where the abstraction becomes concrete.

## What This Is

This Tauri plugin wraps [`foundframeimpl`](../foundframeimpl/)—the Rust implementation of our domain—and exposes it to the TypeScript/webview layer. It provides:

- **SQL proxy**: Execute SQLite queries via the Rust sqlx layer
- **URL preview**: Generate previews for URLs (HTML scraping, media thumbnailing)
- **Native operations**: Any CPU-intensive work that belongs in native code

## The Adapter Pattern, Again

Notice the recursion:

```
foundframe (TypeScript domain)
    ↓ Ports (abstract)
foundframe-drizzle (TypeScript adaptor)
    ↓ FFI calls
    ↓ Tauri IPC
    ↓ Native functions
tauri-plugin-o19-ffi (Tauri adaptor) ← you are here
    ↓ Rust function calls
foundframeimpl (Rust implementation)
    ↓ Native libraries
Operating System
```

At every boundary: **ports** on one side, **adaptors** on the other. The pattern repeats like a fractal because it works.

## Why This Layer?

Tauri plugins provide:
- **Permission system**: Tauri's capability-based security model
- **Type-safe IPC**: Commands are typed on both sides
- **Mobile support**: iOS and Android native code integration
- **Lifecycle management**: Plugin setup and teardown hooks

But the actual logic lives in `foundframeimpl`. This plugin is the thinnest possible layer that bridges Tauri's world to our domain.

## Conservation of Structure

The same architectural patterns that govern the TypeScript layers also govern this Rust/TypeScript boundary:

- **Ports**: The Rust functions that `foundframeimpl` exposes
- **Adapters**: The Tauri command handlers that call those functions
- **Domain**: The data structures passed across the boundary (serializable, versioned)

## Reading On

- [`foundframe`](../foundframe/): The domain layer
- [`foundframeimpl`](../foundframeimpl/): The Rust implementation this plugin wraps
- [`foundframe-drizzle`](../foundframe-drizzle/): The TypeScript Drizzle implementation that calls this plugin

---

*"The interface is the foreigner; the implementation is the native. But the domain is universal."*
