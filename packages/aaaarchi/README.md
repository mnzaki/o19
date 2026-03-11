# 🦏 @o19/aaaarchi

> **A**rchitecture **A**nnotating **A**ardvark **Archi**

The foundation layer - maps structure, builds DAG, and provides **Divination** for async multi-round computation.

```typescript
import { AAAArchi } from '@o19/aaaarchi';

const scope = AAAArchi.forFile(import.meta.url);
const ctx = scope.getContext(); // { domain, layer, canDependOn }
```

---

## Divination Engine 🌀

AAAArchi provides a **Divination** system for async multi-round computation - a promise-like container that resolves over N discovered rounds, not just one.

### Core Concept

> "Program as structure, execution as filling"

Unlike a Promise which resolves once, a Divination:
- Resolves over **multiple discovered rounds**
- Tracks **dependencies** between rounds
- Provides **progress watching** via AsyncGenerator
- Returns **stubs immediately** for template rendering

### Basic Usage

```typescript
import { createDivination, createDivinationProvider } from '@o19/aaaarchi';

// Create a divination with multiple validation rounds
const userDivination = createDivination({
  shape: {
    deps: ['userId'],
    rounds: [
      // Round 1: Validate the request
      {
        name: 'validate',
        validate: async (_, ctx) => {
          const userId = ctx.get('userId');
          if (!userId) return { valid: false, error: 'Missing userId' };
          return { valid: true, value: { userId } };
        }
      },
      // Round 2: Fetch the user
      {
        name: 'fetch',
        deps: ['validate'],
        validate: async (current, ctx) => {
          const user = await db.users.findById(current.userId);
          return { valid: true, value: user };
        }
      }
    ],
    // Final computation
    compute: (deps) => deps.fetch
  },
  tags: ['user-service', 'fetch']
});

// Resolve it
const user = await userDivination.resolve();

// Or watch progress
for await (const round of userDivination.watch()) {
  console.log(`Round ${round.round}: ${round.resolved.size} values resolved`);
}
```

### Batch Resolution

Resolve multiple divinations optimally with the DivinationProvider:

```typescript
import { createDivinationProvider } from '@o19/aaaarchi';

const provider = createDivinationProvider({
  maxRounds: 10,
  continueOnError: false,
  onProgress: (batch) => {
    console.log(`Round ${batch.round}: ${batch.resolved.length} done, ${batch.pending.length} pending`);
  }
});

// Resolve all with progress tracking
for await (const batch of provider.resolveAll([div1, div2, div3])) {
  if (batch.complete) {
    console.log('All divinations resolved!');
  }
}

// Or just get the final result
const { values, rounds, errors } = await provider.resolveAllToValues([div1, div2]);
```

### Simple Divinations

For straightforward async operations:

```typescript
import { createSimpleDivination, raceDivinations } from '@o19/aaaarchi';

// Simple single-round divination
const cacheDiv = createSimpleDivination(
  async () => cache.get(key),
  { tags: ['cache'] }
);

const networkDiv = createSimpleDivination(
  async () => fetchFromNetwork(key),
  { tags: ['network'] }
);

// Race them - first to resolve wins
const result = await raceDivinations([cacheDiv, networkDiv]);
```

### Dependent Divinations

Create divinations that depend on other divinations:

```typescript
import { createDependentDivination } from '@o19/aaaarchi';

const userDiv = createSimpleDivination(() => fetchUser(userId));
const postsDiv = createDependentDivination(
  { user: userDiv },
  async (deps) => fetchPosts(deps.user.id)
);

const posts = await postsDiv.resolve();
```

---

## Architecture API

### File Scopes

```typescript
const scope = AAAArchi.forFile(import.meta.url);

// Get architectural context
const ctx = scope.getContext();
// { domain: 'user', layer: 'service', canDependOn: ['domain', 'repository'] }

// Check if a call is valid
if (scope.canCall('repository')) {
  // Valid architectural transition
}
```

### Project DAG

```typescript
const dag = AAAArchi.buildProjectDAG();
// { nodes: [...], edges: [...], violations: [...] }
```

### Path Validation

```typescript
const violations = AAAArchi.validatePath(['controller', 'service', 'repository']);
if (violations.length > 0) {
  console.log(violations[0].explanation);
  console.log(violations[0].fix);
}
```

---

## Installation

```bash
pnpm add @o19/aaaarchi
```

---

## The Three Friends

AAAArchi is part of the Three Friends architecture:

| Friend | Package | Role |
|--------|---------|------|
| 🦏 **AAAArchi** | `@o19/aaaarchi` | DAG validation, foundation layer |
| 🦀 **Ferror** | `@o19/ferror` | Rich error context |
| 🐋 **Orka** | `@o19/orka` | Saga orchestration |

---

*"The aardvark digs deep, mapping the structure beneath."*
