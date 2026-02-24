/**
 * Spiral Pattern Tests (Isolated)
 *
 * Tests using only mocks - no foundframe dependencies.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createMockLoom,
  createMockCore,
  createMockSpiralOut,
  createMockSpiralMux,
  createMockTreadle,
  mockTreadles,
  createMockTestRunner,
  testWarps,
  assertions,
} from './mocks/index.js';

describe('Mock Loom: Core Ring Creation', () => {
  it('should create core with metadata', () => {
    const loom = createMockLoom();
    const coreClass = class TestCore {};
    
    const core = loom.spiral.rust.core(coreClass, {
      packageName: 'foundframe',
      crateName: 'o19-foundframe'
    });
    
    assert.ok(core.metadata);
    assert.equal(core.metadata.packageName, 'foundframe');
    assert.equal(core.metadata.crateName, 'o19-foundframe');
    assert.equal(core.metadata.language, 'rust');
    assert.ok(core.metadata.packagePath.includes('foundframe'));
  });

  it('should create core with defaults', () => {
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Test {});
    
    assert.equal(core.metadata.packageName, 'test');
    assert.ok(core.metadata.crateName.startsWith('o19-'));
  });
});

describe('Mock Loom: Spiral Out with Tieup', () => {
  it('should chain tieup.intra()', async () => {
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    
    const mockTreadle = createMockTreadle({
      name: 'test-treadle',
      files: [{ path: 'test.rs', content: '// test' }]
    });
    
    const foundframe = loom.spiral(core)
      .tieup.intra(mockTreadle, { entities: ['Bookmark'] });
    
    const runner = createMockTestRunner({
      warp: { foundframe }
    });
    
    const result = await runner.weave();
    
    assert.equal(result.filesGenerated.length, 1);
    assert.equal(result.filesGenerated[0], 'crates/test/test.rs');
    assertions.noErrors(result);
  });

  it('should support multiple chained tieups', async () => {
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    
    const treadle1 = createMockTreadle({
      name: 'first',
      files: [{ path: 'first.rs', content: '// first' }]
    });
    
    const treadle2 = createMockTreadle({
      name: 'second',
      files: [{ path: 'second.rs', content: '// second' }]
    });
    
    const ring = loom.spiral(core)
      .tieup.intra(treadle1, {})
      .tieup.intra(treadle2, {});
    
    const runner = createMockTestRunner({ warp: { ring } });
    const result = await runner.weave();
    
    assert.equal(result.filesGenerated.length, 2);
    assert.ok(result.filesGenerated.includes('crates/test/first.rs'));
    assert.ok(result.filesGenerated.includes('crates/test/second.rs'));
  });
});

describe('Mock Loom: Platform Rings', () => {
  it('should create Android foreground service', () => {
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    
    const android = loom.spiral(core)
      .android.foregroundService({ nameAffix: 'radicle' });
    
    assert.ok(android);
    assert.ok(android.android);
  });

  it('should create Desktop direct', () => {
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    
    const desktop = loom.spiral(core)
      .desktop.direct();
    
    assert.ok(desktop);
    assert.ok(desktop.desktop);
  });
});

describe('Mock Loom: Tauri Mux', () => {
  it('should create Tauri from platform rings', () => {
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    
    const android = loom.spiral(core);
    const desktop = loom.spiral(core);
    
    const tauri = loom.spiral(android, desktop);
    
    assert.ok(tauri);
    assert.ok(tauri.innerRings);
    assert.equal(tauri.innerRings.length, 2);
  });

  it('should chain DDD from Tauri', () => {
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    
    const android = loom.spiral(core);
    const desktop = loom.spiral(core);
    const tauri = loom.spiral(android, desktop);
    const front = tauri.typescript.ddd();
    
    assert.ok(front);
  });
});

describe('Pre-built WARPs', () => {
  it('should create minimal warp', async () => {
    const { loom, warp, createUtils } = testWarps.minimal();
    
    assert.ok(loom);
    assert.ok(warp.foundframe);
    
    const runner = createMockTestRunner({ warp });
    const result = await runner.weave();
    
    // Minimal has no tieups
    assert.equal(result.filesGenerated.length, 0);
  });

  it('should create warp with tieup', async () => {
    const treadle = mockTreadles.rustFile('TestFile');
    const { warp } = testWarps.withTieup(treadle, { test: true });
    
    const runner = createMockTestRunner({ warp });
    const result = await runner.weave();
    
    assert.equal(result.filesGenerated.length, 1);
    assert.ok(result.filesGenerated[0].includes('testfile.rs'));
  });

  it('should create full stack warp', async () => {
    const { warp } = testWarps.fullStack();
    
    assert.ok(warp.foundframe);
    assert.ok(warp.android);
    assert.ok(warp.desktop);
    assert.ok(warp.tauri);
    assert.ok(warp.front);
  });

  it('should create warp with db binding', async () => {
    const { warp } = testWarps.withDbBinding(['Bookmark', 'Media']);
    
    const runner = createMockTestRunner({ warp });
    const result = await runner.weave();
    
    // 2 entities × 2 files + 1 mod = 5 files
    assert.equal(result.filesGenerated.length, 5);
    assert.ok(result.filesGenerated.some(f => f.includes('bookmark')));
    assert.ok(result.filesGenerated.some(f => f.includes('media')));
  });
});

describe('Treadle Patterns', () => {
  it('should generate Rust files', async () => {
    const treadle = mockTreadles.rustFile('MyStruct', 'pub struct MyStruct;');
    
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    const ring = loom.spiral(core)
      .tieup.intra(treadle, {});
    
    const runner = createMockTestRunner({ warp: { ring } });
    const result = await runner.weave();
    
    assert.equal(result.filesGenerated.length, 1);
    assert.ok(result.filesGenerated[0].includes('mystruct.rs'));
    
    // Check content in VFS
    const content = result.vfs.readFile('crates/test/src/mystruct.rs');
    assert.ok(content?.includes('pub struct MyStruct;'));
  });

  it('should generate TypeScript files', async () => {
    const treadle = mockTreadles.typescriptFile('MyInterface');
    
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    const ring = loom.spiral(core)
      .tieup.intra(treadle, {});
    
    const runner = createMockTestRunner({ warp: { ring } });
    const result = await runner.weave();
    
    assert.ok(result.filesGenerated[0].includes('myinterface.ts'));
  });

  it('should modify existing files', async () => {
    const treadle = mockTreadles.fileModifier('mod.rs', 'pub mod new;');
    
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    const ring = loom.spiral(core)
      .tieup.intra(treadle, {});
    
    // Pre-populate the file
    const runner = createMockTestRunner({ warp: { ring } });
    await runner.weave(); // First weave creates the file via treadle
    
    // Actually, the modify treadle needs the file to exist first
    // Let's use a custom treadle that creates then modifies
    const customTreadle = createMockTreadle({
      name: 'create-and-modify',
      customGenerate: async (context) => {
        await context.utils.writeFile('mod.rs', 'pub mod existing;');
        await context.utils.updateFile('mod.rs', (content) => content + '\npub mod new;');
        return {
          generatedFiles: ['mod.rs'],
          modifiedFiles: [],
          errors: []
        };
      }
    });
    
    const ring2 = loom.spiral(core).tieup.intra(customTreadle, {});
    const runner2 = createMockTestRunner({ warp: { ring: ring2 } });
    const result = await runner2.weave();
    
    const content = result.vfs.readFile('crates/test/mod.rs');
    assert.ok(content?.includes('pub mod existing;'));
    assert.ok(content?.includes('pub mod new;'));
  });

  it('should handle failing treadles', async () => {
    const treadle = mockTreadles.failing('bad-treadle', 'Something went wrong');
    
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    const ring = loom.spiral(core)
      .tieup.intra(treadle, {});
    
    const runner = createMockTestRunner({ warp: { ring } });
    const result = await runner.weave();
    
    assert.equal(result.errors.length, 1);
    assert.ok(result.errors[0].includes('Something went wrong'));
  });

  it('should echo config', async () => {
    const treadle = mockTreadles.echoConfig();
    
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    const ring = loom.spiral(core)
      .tieup.intra(treadle, { testKey: 'testValue', number: 42 });
    
    const runner = createMockTestRunner({ warp: { ring } });
    const result = await runner.weave();
    
    assert.ok(result.filesGenerated.includes('crates/test/config.echo.json'));
    
    const content = result.vfs.readFile('crates/test/config.echo.json');
    const parsed = JSON.parse(content || '{}');
    assert.equal(parsed.testKey, 'testValue');
    assert.equal(parsed.number, 42);
  });
});

describe('DbBinding Treadle Pattern', () => {
  it('should generate entity traits and commands', async () => {
    const treadle = mockTreadles.dbBinding(
      ['Bookmark', 'Media'],
      ['create', 'read', 'update', 'delete', 'list']
    );
    
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {}, {
      packageName: 'foundframe'
    });
    const foundframe = loom.spiral(core)
      .tieup.intra(treadle, {
        entities: ['Bookmark', 'Media'],
        operations: ['create', 'read', 'update', 'delete', 'list']
      });
    
    const runner = createMockTestRunner({ warp: { foundframe } });
    const result = await runner.weave();
    
    // 2 entities × 2 files + 1 mod = 5 files
    assert.equal(result.filesGenerated.length, 5);
    
    // Verify entity files
    assert.ok(result.filesGenerated.some(f => f.includes('entities/bookmark.gen.rs')));
    assert.ok(result.filesGenerated.some(f => f.includes('entities/media.gen.rs')));
    
    // Verify command files
    assert.ok(result.filesGenerated.some(f => f.includes('commands/bookmark.gen.rs')));
    assert.ok(result.filesGenerated.some(f => f.includes('commands/media.gen.rs')));
    
    // Verify mod.rs
    assert.ok(result.filesGenerated.some(f => f.includes('mod.rs')));
    
    // Check content
    const bookmarkTrait = result.vfs.readFile('crates/foundframe/src/db/entities/bookmark.gen.rs');
    assert.ok(bookmarkTrait?.includes('BookmarkDb trait'));
    
    const bookmarkCommand = result.vfs.readFile('crates/foundframe/src/db/commands/bookmark.gen.rs');
    assert.ok(bookmarkCommand?.includes('BookmarkCommand enum'));
  });
});

describe('Assertion Helpers', () => {
  it('should assert file generated', async () => {
    const treadle = mockTreadles.rustFile('Test');
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    const ring = loom.spiral(core).tieup.intra(treadle, {});
    
    const runner = createMockTestRunner({ warp: { ring } });
    const result = await runner.weave();
    
    assertions.fileGenerated(result, 'crates/test/src/test.rs');
  });

  it('should assert no errors', async () => {
    const treadle = mockTreadles.rustFile('Test');
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    const ring = loom.spiral(core).tieup.intra(treadle, {});
    
    const runner = createMockTestRunner({ warp: { ring } });
    const result = await runner.weave();
    
    assertions.noErrors(result);
  });

  it('should assert file content', async () => {
    const treadle = mockTreadles.rustFile('Test', 'pub struct Test { value: i32 }');
    const loom = createMockLoom();
    const core = loom.spiral.rust.core(class Core {});
    const ring = loom.spiral(core).tieup.intra(treadle, {});
    
    const runner = createMockTestRunner({ warp: { ring } });
    const result = await runner.weave();
    
    assertions.fileContains(
      result.vfs,
      'crates/test/src/test.rs',
      'pub struct Test'
    );
  });
});
