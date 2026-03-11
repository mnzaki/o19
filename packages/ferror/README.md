# 🦀 @o19/ferror

> **Ferris** + **Error**

Contextual error handling with architectural awareness.

```typescript
import { ferroringModule } from '@o19/ferror';

const ferror = ferroringModule().user.service;
throw ferror(error, { stance: 'authoritative', summary: '...' });
```
