# How to Loom 🧶

> *"The warp is your intention; the loom makes it real."*

This guide teaches you how to write `loom/WARP.ts` and Management imprints for the spire-loom code generator.

---

## Quick Start

### 1. Define Your Core (WARP.ts)

```typescript
// loom/WARP.ts
import loom from '@o19/spire-loom';

// Define your domain struct
@loom.rust.Struct
export class Foundframe {
  @loom.rust.Mutex
  @loom.rust.Option
  thestream = TheStream;

  @loom.rust.Mutex  
  @loom.rust.Option
  device_manager = DeviceManager;
}

// Create the core spiral
export const foundframe = loom.spiral(Foundframe);

// Add platform rings
export const android = foundframe.android.foregroundService({
  nameAffix: 'radicle',
  gradleNamespace: 'ty.circulari.o19'
});

export const desktop = foundframe.desktop.direct();

// Aggregate with Tauri
export const tauri = loom.spiral(android, desktop).tauri.plugin();

// Add front-end layer
export const front = tauri.typescript.ddd();
```

### 2. Define Managements (bookmark.ts)

```typescript
// loom/bookmark.ts
import loom from '@o19/spire-loom';
import { Foundframe, foundframe } from './WARP.js';

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
class BookmarkMgmt extends loom.Management {
  VALID_URL_REGEX = /^https?:\/\/.+/;
  MAX_TITLE_LENGTH = 200;

  @loom.crud('create')
  addBookmark(url: string, title?: string): void {
    throw new Error('Imprint only');
  }

  @loom.crud('list', { collection: true })
  listBookmarks(directory?: string): string[] {
    throw new Error('Imprint only');
  }
}

export { BookmarkMgmt };
```

---

## The Architecture

### The Spiral Chain

```
foundframe (SpiralOut)
    └── inner: RustCore
            └── core: Foundframe (your struct with fields)
                    └── thestream: RustExternalLayer
```

Access path: `foundframe.inner.core.thestream`

### Decorators Reference

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@loom.rust.Struct` | Mark as Rust struct | `@loom.rust.Struct class Foundframe {}` |
| `@loom.rust.Mutex` | Wrap field in Mutex | `@loom.rust.Mutex thestream = TheStream;` |
| `@loom.rust.Option` | Wrap field in Option | `@loom.rust.Option device_manager = DeviceManager;` |
| `@loom.reach(level)` | Set Management scope | `@loom.reach('Global')` |
| `@loom.link(target)` | Link to struct field | `@loom.link(foundframe.inner.core.thestream)` |
| `@loom.crud(op)` | Mark CRUD operation | `@loom.crud('create')` |

---

## Custom Treadles

Place custom treadles in `loom/treadles/`:

```typescript
// loom/treadles/gen-esp32-service.ts
import { defineTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';
import { addManagementPrefix } from '@o19/spire-loom/machinery/sley';

const esp32ServiceTreadle = defineTreadle({
  matches: [{ current: 'ESP32Spiraler', previous: 'RustCore' }],
  methods: {
    filter: 'platform',
    pipeline: [addManagementPrefix()]
  },
  outputs: [
    { template: 'esp32/service.cpp.ejs', path: '{packageDir}/spire/service.cpp', language: 'cpp' }
  ],
  hookup: { type: 'custom', customHookup: async (...) => { ... } }
});

export default generateFromTreadle(esp32ServiceTreadle);
```

See [machinery/treadles/README.md](machinery/treadles/README.md) for full details.

---

## Extending Spiralers

Treadles can extend spiralers with new methods via the tie-up system. See [machinery/treadles/README.md#spiraler-extensions](machinery/treadles/README.md#spiraler-extensions).

---

## Key Principles

1. **WARP.ts is executable** - It runs to build the spiral graph
2. **Managements are imprints** - They define interfaces, not implementations
3. **Struct fields are accessed via `core`** - `foundframe.inner.core.thestream`
4. **Use `loom.*` namespace** - Import `loom` once, access all decorators through it
5. **Custom treadles go in `loom/treadles/`** - Auto-discovered by the loom

---

*See also: [machinery/treadles/README.md](machinery/treadles/README.md) • [machinery/tieups/README.md](machinery/tieups/README.md) • [warp/README.md](warp/README.md)*
