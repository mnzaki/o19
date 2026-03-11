# 🦡 Scrim-Loom

**Custom warp using AAAArchi for rich architectural validation.**

Scrim-loom extends [spire-loom](../spire-loom/) with architectural validation powered by the Three Friends:

| Friend | Role | In Scrim-Loom |
|--------|------|---------------|
| 🦏 **AAAArchi** | DAG validation | Validates layer transitions, detects architectural violations |
| 🦀 **Ferror** | Error context | Rich error messages with suggestions and fixes |
| 🐋 **Orka** | Saga resilience | Compensation and retry for generation failures |

## Installation

```bash
pnpm add @o19/scrim-loom
```

## Quick Start

```typescript
import { Weavvy, scrim, Struct, Field } from '@o19/scrim-loom';

// Define your domain with architectural validation
@Struct({ name: 'TheStream', layer: 'domain' })
class TheStream {
  @Field('id', 'UUID')
  id!: string;
  
  @Field('content', 'Text')
  content!: string;
}

// Create Weavvy the Warthog weaver
const weavvy = scrim.createWeavvy({
  workspace: './o19',
  validateArchitecture: true,
  saga: { maxRetries: 3 }
});

// Weave with resilience
const result = await weavvy.weave();
```

## Architecture

Scrim-loom mirrors spire-loom's architecture but adds AAAArchi integration:

```
warp/decorators.ts    → WARP tools with validation
heddles/validator.ts  → Pattern matching + DAG validation
weaver/wweavvy.ts     → 🦡 Weavvy the Warthog (extends Weaver)
```

## Weavvy the Warthog

Weavvy is a subclass of spire-loom's `Weaver` that:

1. **Validates** weaving plans against the architecture DAG
2. **Enriches** errors with Ferror for rich context
3. **Orchestrates** generation via Orka sagas with compensation

```typescript
import { Weavvy } from '@o19/scrim-loom';

const weavvy = new Weavvy({
  validateArchitecture: true,  // Check DAG before weaving
  strictMode: false,           // Warnings don't throw
  saga: {
    maxRetries: 3,
    onCompensationFailure: (step, error) => {
      console.error(`Compensation failed at ${step}`, error);
    }
  }
});

// Get the architecture DAG for visualization
const dag = weavvy.getArchitectureDAG();
```

## API

### Decorators

All spire-loom decorators work, plus AAAArchi-aware versions:

```typescript
import { Struct, Field, Link, Service, crud } from '@o19/scrim-loom';

@Struct({ name: 'User', layer: 'domain' })
class User {}

@Service({ name: 'UserService', layer: 'service', link: User })
class UserService {
  @crud('create')
  createUser() {}
}
```

### Heddles Validation

```typescript
import { scrimHeddles } from '@o19/scrim-loom';

const management = scrimHeddles.enrich({
  name: 'StreamService',
  layer: 'service',
  domain: 'foundframe',
  methods: [...]
});

// Throws Ferror with rich context if errors found
scrimHeddles.throwIfErrors(management);
```

## License

MIT - Barn Architecture Academy
