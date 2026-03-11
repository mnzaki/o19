# 🐋 @o19/orka

> **O**rganized **R**etrying and **K**uul **A**dministration

Saga orchestration, retries, circuit breakers (coming soon).

```typescript
import { Orka } from '@o19/orka';

@Orka.retry({ strategy: ... })
async function fetch() { ... }
```
