# 🦏 @o19/aaaarchi

> **A**rchitecture **A**nnotating **A**ardvark **Archi**

The foundation layer - maps structure, builds DAG.

```typescript
import { AAAArchi } from '@o19/aaaarchi';

const scope = AAAArchi.forFile(import.meta.url);
const ctx = scope.getContext(); // { domain, layer, canDependOn }
```
