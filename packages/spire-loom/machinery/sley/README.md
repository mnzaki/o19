# The Sley 🪡

> *"The warp is threaded through the reed, and the pattern is set."*

The [sley](../) is the process of threading warp threads through the reed's dents. In our loom, it **resolves bindings**—connecting front-end code to its implementations, routing operations to their adaptors.

## What the Sley Resolves

- **Adaptor Overrides**: When an app uses `drizzle` for reads but DDD for writes
- **Bind-Points**: Where does `front.tauri.app()` connect to the core?
- **Multiplexing**: Tauri routing to Android vs Desktop

## The Threading Pattern

```typescript
const myApp = front.tauri.app({ 
  adaptorOverrides: [drizzle] 
});
//       ↓
// The sley ensures reads go to drizzle,
// writes fall back to DDD layer
```

Like threading each warp thread through its specific dent in the reed, the sley ensures each operation call routes to its correct destination.

---

*Part of the [machinery](../). Preceded by the [treadles](../treadles/) (generation phases), completing the cycle that returns to the [weaver](../weaver.ts) (the operator).*

> *"Even this sley needs threading."*
