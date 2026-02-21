# The Treadles 👣

> *"The weaver dances, and the loom sings."*

The [treadles](../) are the foot pedals that control the loom. Each pedal lifts a different combination of heddles, creating different patterns. In our machinery, they are the **generation phases**—pedals for Core, Platform, DDD, and more.

## The Pedal Arrangement

| Pedal | Phase | Generates |
|-------|-------|-----------|
| 🥁 | `core-generator.ts` | Rust traits, domain types |
| 🎸 | `platform-generator.ts` | Android services, Desktop direct |
| 🎹 | `tauri-generator.ts` | Commands, permissions, platform traits |
| 🎺 | `ddd-generator.ts` | TypeScript domain types, Port interfaces |
| 🎻 | `adaptor-generator.ts` | Drizzle ORM implementations |

## The Weaver's Dance

The weaver doesn't press all pedals at once—they dance through them in order:

```
Core → Platform → Tauri → DDD → Adaptors
```

Each phase prepares the ground for the next. Each [treadle](.) lifts the right threads for its pattern.

---

*Part of the [machinery](../). Preceded by the [beater](../beater/) (formatting), followed by the [sley](../sley/) (binding resolution).*
