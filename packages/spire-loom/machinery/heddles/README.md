# The Heddles 🏗️

> *"Patterns emerge from the rise and fall of threads."*

The [heddles](../) are the frames that raise and lower warp threads to create patterns. In our loom, they **match** spiral patterns to appropriate generators.

## What the Heddles Do

- Examine [SpiralOut](../../warp/spiral/pattern.ts) instances from WARP.ts
- Match ring types to generation strategies
- Determine which [treadles](../treadles/) to activate
- Coordinate pattern selection for multiplexed spirals

## The Heddle Pattern

```
SpiralOut { android }  ──►  AndroidSpiraler ──►  foregroundService()
     ↓                           ↓                    ↓
   Ring type                  Generator            Method
```

Like choosing which threads rise and which fall, the heddles choose which generators activate for which rings.

---

*Part of the [machinery](../). Preceded by the [reed](../reed/), followed by the [bobbin](../bobbin/) which holds the thread to be woven.*
