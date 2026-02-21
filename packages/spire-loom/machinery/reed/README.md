# The Reed 🌾

> *"Before weaving comes the spacing—the warp must be known before it can be woven."*

The [reed](../) is the comb that spaces the warp threads. In our machinery, it **discovers** the workspace structure before generation begins.

## What the Reed Does

- Scans the [monorepo](../../../) for packages
- Identifies Cargo crates and pnpm workspaces
- Determines package types (Tauri app, Rust lib, Node package)
- Maps ring requirements to actual file paths

## Why "Reed"?

In a physical loom, the reed:
1. Spaces the warp threads evenly
2. Guides the shuttle's passage
3. Beats the weft into place

In code generation, workspace discovery serves the same foundational role—you must know the structure before you can weave into it.

---

*Part of the [machinery](../). Next: the [heddles](../heddles/) raise patterns from what the reed has spaced.*
