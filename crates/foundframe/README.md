# foundframe

> *the native implementation of the foundational frame*

## What This Is

**foundframe** is the Rust implementation of the core of the spire-loom WARP at [../../loom/WARP.ts](../../loom/WARP.ts). This is an actual implementation of the imagined "Managements" each exported from a file in ../../loom/*.ts (besides the WARP).

And foundframe does this radicle.xyz distribution of personal knowledge base
data on all device nodes that pair together. It's a mesh network for 1 person.

## What Lives Here

TODO

## Why Rust?

Some things are better done in native code:

- **Media processing**: Decoding images, extracting EXIF, generating thumbnails—CPU-intensive, better parallelized
- **Database access**: sqlx gives us compile-time checked SQL with native performance
- **Network requests**: reqwest handles the complexity of modern HTTP (streaming, compression, redirects)
- **Cryptography**: blake3 for content hashing when we get there

Plus: Rust's type system enforces the same discipline we value in the TypeScript domain. The compiler is a collaborator.

## Relationship to Tauri

None. This crate is platform agnostic.

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

- **Ring (Core)**: `Media` is a hash + mime; `Conversation` is a graph of `Person` references + temporal span
- **Ring (Bridge)**: Each entity serializes differently—Media as raw bytes, Conversation as a manifest
- **Ring (Front)**: UI reflects density—Media as thumbnail, Conversation as threaded view

foundframe takes care of **all these concerns**—what it means for each entity to *be* and to *continue to be*.

---

*"The frame finds its foundation; the foundation finds its frame."*
