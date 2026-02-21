# The Shuttle 🚀

> *"The shuttle flies, and where it passes, the fabric grows."*

The [shuttle](../) is the heart of the loom—the part that **actually weaves**. It carries thread (code) through the warp (your architecture) and leaves behind files, structure, and reality.

## The Shuttle's Cargo

The shuttle carries five essential tools:

| Tool | Purpose | File |
|------|---------|------|
| **File System** | Creates directories and files | [`file-system-operations.ts`](file-system-operations.ts) |
| **Package Manager** | Ensures packages exist | [`workspace-package-manager.ts`](workspace-package-manager.ts) |
| **Dependencies** | Adds Cargo/npm dependencies | [`dependency-manager.ts`](dependency-manager.ts) |
| **Templates** | Renders EJS to code | [`template-renderer.ts`](template-renderer.ts) |
| **Configuration** | Writes TOML, JSON, XML configs | [`configuration-writer.ts`](configuration-writer.ts) |

## Idempotency: The Shuttle's Promise

A shuttle makes many passes. Each pass adds more weft, but never tangles what's already woven. Similarly, all shuttle operations are **idempotent**—safe to run again and again.

---

*Part of the [machinery](../). Preceded by the [bobbin](../bobbin/) (thread storage), followed by the [beater](../beater/) (packing tight).*
