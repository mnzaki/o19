# Spire-Loom Test Kit 🧪

Advanced testing utilities for spire-loom using Node.js built-in `node:test`.

## Quick Start

```typescript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createTestRunner,
  warpMock,
  createMockTreadle,
  mockTreadles,
} from '@o19/spire-loom/machinery/testkit';

describe('my custom treadle', () => {
  it('should generate files', async () => {
    // Create a mock treadle
    const myTreadle = createMockTreadle({
      name: 'my-treadle',
      files: [
        { path: 'output.rs', content: '// generated' },
      ],
    });

    // Create test runner with WARP-like configuration
    const runner = createTestRunner({
      warp: {
        foundframe: loom.spiral(loom.rustCore())
          .tieup.intra(myTreadle, { entities: ['Bookmark'] })
      }
    });

    // Run the weaver
    const result = await runner.weave();

    // Assert on results
    assert.equal(result.filesGenerated.length, 1);
    assert.ok(result.output?.includes('intra-tieup'));
  });
});
```

## API Reference

### `createTestRunner(config)`

Creates an isolated test environment for running the weaver.

```typescript
const runner = createTestRunner({
  warp: Record<string, SpiralRing>,  // WARP module exports
  weaverConfig?: Partial<WeaverConfig>,  // Weaver configuration
  virtualFs?: Map<string, string>,  // Virtual file system
  verbose?: boolean,  // Enable console output
});

// Methods
const result = await runner.weave();  // Run weaver
const ring = runner.getRing('name');  // Get exported ring
const content = runner.readFile('path');  // Read from virtual FS
const files = runner.listFiles();  // List all virtual files
```

### `warpMock(config)`

Create mock WARP configurations.

```typescript
// Auto-generate minimal mocks
const warp = warpMock({ autoMock: true });

// Or provide specific rings
const warp = warpMock({
  rings: {
    foundframe: createMockCore('Foundframe'),
    android: createMockSpiralOut('Android', core),
  }
});
```

### `createMockTreadle(config)`

Create mock custom treadles for testing.

```typescript
const treadle = createMockTreadle({
  name: 'my-treadle',
  files: [
    { path: 'generated.rs', content: '// code' },
  ],
  shouldError?: boolean,  // Simulate failure
  customGenerate?: (context) => Promise<TreadleResult>,  // Custom logic
});
```

### Pre-built Mock Treadles

```typescript
import { mockTreadles } from '@o19/spire-loom/machinery/testkit';

// Generate a Rust file
const rustTreadle = mockTreadles.rustFile('Bookmark');

// Generate a TypeScript file
const tsTreadle = mockTreadles.typescriptFile('adaptor');

// Modify an existing file
const modifierTreadle = mockTreadles.fileModifier('mod.rs', 'pub mod new;');

// Simulate failure
const failingTreadle = mockTreadles.failing('bad-treadle');

// Echo config to output
const echoTreadle = mockTreadles.echoConfig();
```

### Output Capture

```typescript
import { captureOutput, captureLogs } from '@o19/spire-loom/machinery/testkit';

// Capture all console output
const { output } = await captureOutput(async () => {
  await runner.weave();
});

assert(output.contains('Generating...'));
assert(output.contains(/\d+ files generated/));

// Just logs
const { logs } = await captureLogs(async () => {
  await runner.weave();
});
```

## Testing Patterns

### Testing Tieup Integration

```typescript
it('should execute custom treadle', async () => {
  const generatedFiles: string[] = [];
  
  const customTreadle = async (context: TreadleContext) => {
    await context.utils.writeFile('test.rs', '// test');
    generatedFiles.push('test.rs');
    return {
      generatedFiles: ['test.rs'],
      modifiedFiles: [],
      errors: [],
    };
  };

  const runner = createTestRunner({
    warp: {
      foundframe: loom.spiral(core)
        .tieup.intra(customTreadle, {})
    }
  });

  const result = await runner.weave();
  
  assert.equal(generatedFiles.length, 1);
  assert.ok(result.output?.includes('intra-tieup'));
});
```

### Testing Error Handling

```typescript
it('should handle treadle errors', async () => {
  const failingTreadle = createMockTreadle({
    name: 'failing',
    shouldError: true,
  });

  const runner = createTestRunner({
    warp: {
      foundframe: loom.spiral(core)
        .tieup.intra(failingTreadle, {})
    }
  });

  const result = await runner.weave();
  
  assert.ok(result.errors.length > 0);
});
```

### Testing File Modifications

```typescript
it('should modify existing files', async () => {
  const virtualFs = new Map([
    ['mod.rs', 'pub mod existing;'],
  ]);

  const modifierTreadle = createMockTreadle({
    name: 'modifier',
    customGenerate: async (context) => {
      await context.utils.updateFile('mod.rs', (content) => {
        return content + '\npub mod new;';
      });
      return {
        generatedFiles: [],
        modifiedFiles: ['mod.rs'],
        errors: [],
      };
    },
  });

  const runner = createTestRunner({
    warp: { foundframe: loom.spiral(core).tieup.intra(modifierTreadle, {}) },
    virtualFs,
  });

  await runner.weave();
  
  const content = runner.readFile('mod.rs');
  assert.ok(content?.includes('pub mod new;'));
});
```

## Running Tests

```bash
# Run all tests
node --test tests/*.test.ts

# Run specific test file
node --test tests/testkit-integration.test.ts

# With TypeScript support
node --import=tsx --test tests/*.test.ts
```

## Architecture

The test kit provides:

1. **TestRunner** - Isolated weaver execution
2. **WarpMock** - Mock WARP.ts configurations
3. **MockTreadles** - Pre-built and custom treadle factories
4. **OutputCapture** - Console output testing
5. **VirtualFS** - In-memory file system for assertions

All without touching the actual filesystem or requiring complex setup.
