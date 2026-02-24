# Spire-Loom Test Suite

Comprehensive test coverage for spire-loom patterns based on `o19/loom/` architecture.

## Test Files

| File | Patterns Tested |
|------|-----------------|
| `testkit-integration.test.ts` | Test kit infrastructure |
| `o19-patterns.test.ts` | WARP.ts patterns (core, tieup, mux, DDD) |
| `management-patterns.test.ts` | Management patterns (@reach, @link, @crud) |

## Running Tests

```bash
# Run all tests
node --import=tsx --test tests/*.test.ts

# Run specific file
node --import=tsx --test tests/o19-patterns.test.ts

# With verbose output
node --import=tsx --test tests/o19-patterns.test.ts --verbose
```

## Pattern Coverage

### Core Ring Patterns
- ✅ `rustCore()` with struct decoration
- ✅ Core ring metadata (packagePath, crateName)
- ✅ SpiralOut wrapping

### Tieup Patterns
- ✅ `.tieup.intra()` chaining
- ✅ Multiple chained tieups
- ✅ Custom treadle execution
- ✅ Treadle error handling

### SpiralMux Patterns
- ✅ Platform aggregation (Android + Desktop → Tauri)
- ✅ Inner ring traversal
- ✅ Tieups on inner rings

### DDD Layer Patterns
- ✅ TypeScript DDD generation
- ✅ Drizzle adaptor with filter
- ✅ Multi-layer spiral (Core → Tauri → Front → Drizzle)

### Management Patterns
- ✅ `@reach` decorator (Global, Local, Private)
- ✅ `@link` decorator for struct field binding
- ✅ `@crud` decorators (create, read, update, delete, list)
- ✅ CRUD options (collection, soft delete)
- ✅ Management constants
- ✅ Multiple entity managements (Bookmark, Media, Post, Person, Conversation)

### Custom Treadle Patterns
- ✅ DbBindingTreadle simulation
- ✅ Entity trait generation
- ✅ Command enum generation
- ✅ Mod.rs updates
- ✅ File path resolution

### Full Architecture Patterns
- ✅ Complete WARP.ts simulation
- ✅ Core → Platform → Mux → Front → Adaptor chain
- ✅ 5 entities with CRUD operations

## Adding New Tests

```typescript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTestRunner } from '../machinery/testkit/index.js';

describe('Pattern: My New Pattern', () => {
  it('should do something', async () => {
    const runner = createTestRunner({
      warp: { /* your rings */ }
    });
    
    const result = await runner.weave();
    
    assert.ok(result.filesGenerated.length > 0);
  });
});
```

## Test Fixtures

Use pre-built fixtures for common scenarios:

```typescript
import { mockTreadles, warpFixtures } from '../machinery/testkit/index.js';

// Pre-built treadles
const rustTreadle = mockTreadles.rustFile('MyStruct');
const tsTreadle = mockTreadles.typescriptFile('MyInterface');
const failingTreadle = mockTreadles.failing('bad-treadle');

// Pre-built warp configs
const warp = warpFixtures.fullStack();
```

## Debugging

Capture output for debugging:

```typescript
import { captureOutput } from '../machinery/testkit/index.js';

const { output } = await captureOutput(async () => {
  const result = await runner.weave();
  return result;
});

console.log(output.toString());
assert(output.contains('Generated 5 files'));
```

## Architecture Decisions

1. **No filesystem mocking yet** - Tests focus on pattern validation, not file I/O
2. **Virtual FS for assertions** - Track what would be written without writing
3. **Async/await** - All tests async for consistency with actual weaver
4. **Type safety** - Leverage TypeScript for API validation

## Future Test Coverage

- [ ] Refinement system (@loom.refine.withPrisma)
- [ ] Query intent decorators (@loom.crud.query)
- [ ] Beater integration (TsCompactor)
- [ ] OperationMux (read/write routing)
- [ ] Composite adaptor generation
- [ ] Error handling (The Loom Halts)
