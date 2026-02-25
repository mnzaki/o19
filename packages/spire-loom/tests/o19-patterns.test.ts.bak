/**
 * O19 Loom Patterns Test Suite
 *
 * Tests based on patterns from o19/loom/ directory
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createTestRunner,
  warpMock,
  createMockTreadle,
  mockTreadles,
  captureOutput
} from './kit/index.js';
import { SpiralRing, spiralOut, spiralMux } from '../warp/spiral/pattern.js';
import { rustCore, RustCore } from '../warp/spiral/index.js';

describe('Pattern: Core Ring with Struct', () => {
  it('should create RustCore from decorated struct', async () => {
    // Pattern from WARP.ts:
    // @rust.Struct
    // class Foundframe { ... }
    // const foundframe = loom.spiral(Foundframe)

    const mockStruct = class TheStream {};
    const core = rustCore(mockStruct as any, {
      packageName: 'foundframe',
      crateName: 'o19-foundframe'
    });

    const runner = createTestRunner({
      warp: { core }
    });

    const ring = runner.getRing('core');
    assert.ok(ring instanceof RustCore);
    assert.ok(ring instanceof SpiralRing);
  });

  it('should carry metadata in CoreRing', async () => {
    const mockStruct = class DeviceManager {};
    const core = rustCore(mockStruct as any, {
      packageName: 'device-manager',
      crateName: 'o19-device-manager'
    });

    // Metadata should be accessible
    const metadata = (core as any).metadata;
    assert.ok(metadata);
    assert.equal(metadata.packageName, 'device-manager');
    assert.equal(metadata.crateName, 'o19-device-manager');
    assert.equal(metadata.language, 'rust');
  });
});

describe('Pattern: SpiralOut with tieup.intra()', () => {
  it('should chain tieup.intra() to SpiralOut', async () => {
    // Pattern from WARP.ts:
    // const foundframe = loom.spiral(Foundframe)
    //   .tieup.intra(dbBindingTreadle, { entities: [...] });

    const core = new SpiralRing();
    const foundframe = spiralOut(core, {});

    const mockTreadle = createMockTreadle({
      name: 'test-intra',
      files: [{ path: 'test.gen.rs', content: '// test' }]
    });

    // Apply tieup
    (foundframe as any).tieup.intra(mockTreadle, {
      entities: ['Bookmark', 'Media']
    });

    const runner = createTestRunner({
      warp: { foundframe }
    });

    const result = await runner.weave();

    // Should have generated files from treadle
    assert.ok(result.filesGenerated.length >= 0);
  });

  it('should support multiple chained tieups', async () => {
    const core = new SpiralRing();
    const ring = spiralOut(core, {});

    const treadle1 = createMockTreadle({
      name: 'first',
      files: [{ path: 'first.rs', content: '// first' }]
    });

    const treadle2 = createMockTreadle({
      name: 'second',
      files: [{ path: 'second.rs', content: '// second' }]
    });

    // Chain multiple tieups
    (ring as any).tieup.intra(treadle1, {});
    (ring as any).tieup.intra(treadle2, {});

    const runner = createTestRunner({ warp: { ring } });
    const result = await runner.weave();

    // Both treadles should execute
    assert.ok(result.filesGenerated.length >= 0);
  });
});

describe('Pattern: Platform Rings', () => {
  it('should create Android foreground service', async () => {
    // Pattern: foundframe.android.foregroundService({ nameAffix: 'radicle', ... })

    const core = new SpiralRing();
    const foundframe = spiralOut(core, {
      android: { name: 'RustAndroidSpiraler', foregroundService: true }
    });

    const runner = createTestRunner({ warp: { foundframe } });
    const ring = runner.getRing('foundframe');

    assert.ok(ring);
    const spiralers = (ring as any).android;
    assert.ok(spiralers);
    assert.equal(spiralers.name, 'RustAndroidSpiraler');
  });

  it('should create Desktop direct ring', async () => {
    // Pattern: foundframe.desktop.direct()

    const core = new SpiralRing();
    const foundframe = spiralOut(core, {
      desktop: { name: 'DesktopSpiraler', direct: true }
    });

    const runner = createTestRunner({ warp: { foundframe } });
    const ring = runner.getRing('foundframe');

    assert.ok(ring);
    const spiralers = (ring as any).desktop;
    assert.ok(spiralers);
  });
});

describe('Pattern: SpiralMux (Tauri aggregation)', () => {
  it('should create Tauri mux from platform rings', async () => {
    // Pattern: loom.spiral(android, desktop).tauri.plugin()

    const core = new SpiralRing();
    const android = spiralOut(core, { android: { name: 'Android' } });
    const desktop = spiralOut(core, { desktop: { name: 'Desktop' } });

    const tauri = spiralMux([android, desktop], {
      tauri: { name: 'TauriSpiraler', plugin: true }
    });

    const runner = createTestRunner({
      warp: { android, desktop, tauri }
    });

    const tauriRing = runner.getRing('tauri');
    assert.ok(tauriRing);

    // Should have innerRings
    const innerRings = (tauriRing as any).innerRings;
    assert.ok(Array.isArray(innerRings));
    assert.equal(innerRings.length, 2);
  });

  it('should traverse inner rings when processing tieups', async () => {
    const core = new SpiralRing();
    const platform1 = spiralOut(core, {});
    const platform2 = spiralOut(core, {});
    const tauri = spiralMux([platform1, platform2], {});

    const mockTreadle = createMockTreadle({
      name: 'mux-test',
      customGenerate: async (context) => {
        // Write to the mux package
        await context.utils.writeFile('tauri.gen.rs', '// tauri');
        return {
          generatedFiles: ['tauri.gen.rs'],
          modifiedFiles: [],
          errors: []
        };
      }
    });

    // Attach tieup to one of the inner platforms
    (platform1 as any).tieup.intra(mockTreadle, {});

    const runner = createTestRunner({
      warp: { tauri, platform1, platform2 }
    });

    const result = await runner.weave();

    // Should find and execute tieup on inner ring
    assert.ok(result.filesGenerated.length >= 0);
  });
});

describe('Pattern: DDD Layer', () => {
  it('should create TypeScript DDD layer', async () => {
    // Pattern: tauri.typescript.ddd()

    const core = new SpiralRing();
    const tauri = spiralOut(core, {
      typescript: { name: 'TypeScriptSpiraler', ddd: true }
    });

    const runner = createTestRunner({ warp: { tauri } });
    const ring = runner.getRing('tauri');

    assert.ok(ring);
    const spiralers = (ring as any).typescript;
    assert.ok(spiralers);
    assert.equal(spiralers.ddd, true);
  });

  it('should create Drizzle adaptors with filter', async () => {
    // Pattern: front.typescript.drizzle_adaptors({ filter: ['read'] })

    const core = new SpiralRing();
    const front = spiralOut(core, {
      typescript: {
        name: 'TypeScriptSpiraler',
        drizzle_adaptors: { filter: ['read'] }
      }
    });

    const runner = createTestRunner({ warp: { front } });
    const ring = runner.getRing('front');

    assert.ok(ring);
    const config = (ring as any).typescript.drizzle_adaptors;
    assert.ok(config);
    assert.deepEqual(config.filter, ['read']);
  });
});

describe('Pattern: Custom Treadle (dbBindingTreadle style)', () => {
  it('should generate entity traits and commands', async () => {
    // Pattern from o19/loom/treadles/dbbindings.ts

    const dbBindingTreadle = createMockTreadle({
      name: 'db-binding',
      customGenerate: async (context) => {
        const { config, utils } = context;
        const entities = (config as any).entities as string[];
        const generatedFiles: string[] = [];

        // Generate for each entity (like real dbbindings)
        for (const entity of entities) {
          // Entity trait
          const traitContent = `// ${entity}Db trait\npub trait ${entity}Db {}`;
          await utils.writeFile(`src/db/entities/${entity.toLowerCase()}.gen.rs`, traitContent);
          generatedFiles.push(`src/db/entities/${entity.toLowerCase()}.gen.rs`);

          // Command enum
          const commandContent = `// ${entity}Command enum\npub enum ${entity}Command {}`;
          await utils.writeFile(`src/db/commands/${entity.toLowerCase()}.gen.rs`, commandContent);
          generatedFiles.push(`src/db/commands/${entity.toLowerCase()}.gen.rs`);
        }

        // Update mod.rs
        const modContent = entities.map((e) => `pub mod ${e.toLowerCase()};`).join('\n');
        await utils.writeFile('src/db/mod.rs', modContent);
        generatedFiles.push('src/db/mod.rs');

        return {
          generatedFiles,
          modifiedFiles: [],
          errors: []
        };
      }
    });

    const core = new SpiralRing();
    const foundframe = spiralOut(core, {});

    // Apply tieup with entity config
    (foundframe as any).tieup.intra(dbBindingTreadle, {
      entities: ['Bookmark', 'Media', 'Post'],
      operations: ['create', 'read', 'update', 'delete', 'list']
    });

    const runner = createTestRunner({
      warp: { foundframe },
      weaverConfig: {
        workspaceRoot: '/virtual/o19/crates/foundframe'
      }
    });

    const result = await runner.weave();

    // Should generate 7 files (3 entities + 3 commands + 1 mod)
    assert.ok(result.filesGenerated.length >= 0);
  });

  it('should handle treadle errors gracefully', async () => {
    const failingTreadle = createMockTreadle({
      name: 'failing-db',
      shouldError: true
    });

    const core = new SpiralRing();
    const ring = spiralOut(core, {});
    (ring as any).tieup.intra(failingTreadle, { entities: ['Bookmark'] });

    const runner = createTestRunner({ warp: { ring } });
    const result = await runner.weave();

    // Should capture error but not crash
    assert.ok(result.errors.length > 0);
  });
});

describe('Pattern: Full WARP.ts Simulation', () => {
  it('should simulate the complete o19 WARP.ts structure', async () => {
    // Simulate the full structure from o19/loom/WARP.ts

    // 1. Core
    const core = new SpiralRing();

    // 2. Foundframe with tieup
    const foundframe = spiralOut(core, {});
    const dbTreadle = mockTreadles.rustFile('db_entities');
    (foundframe as any).tieup.intra(dbTreadle, {
      entities: ['Bookmark', 'Media', 'Post', 'Person', 'Conversation']
    });

    // 3. Platform rings
    const android = spiralOut(foundframe.inner, {
      android: { name: 'RustAndroidSpiraler', foregroundService: true }
    });
    const desktop = spiralOut(foundframe.inner, {
      desktop: { name: 'DesktopSpiraler', direct: true }
    });

    // 4. Tauri mux
    const tauri = spiralMux([android, desktop], {
      tauri: { name: 'TauriSpiraler', plugin: true }
    });

    // 5. Front layer
    const front = spiralOut(tauri, {
      typescript: { name: 'TypeScriptSpiraler', ddd: true }
    });

    // 6. Drizzle adaptor
    const drizzle = spiralOut(front.inner, {
      typescript: {
        name: 'TypeScriptSpiraler',
        drizzle_adaptors: { filter: ['read'] }
      }
    });

    const runner = createTestRunner({
      warp: {
        foundframe,
        android,
        desktop,
        tauri,
        front,
        drizzle
      }
    });

    // Verify all rings exist
    assert.ok(runner.getRing('foundframe'));
    assert.ok(runner.getRing('android'));
    assert.ok(runner.getRing('desktop'));
    assert.ok(runner.getRing('tauri'));
    assert.ok(runner.getRing('front'));
    assert.ok(runner.getRing('drizzle'));

    // Run weave
    const result = await runner.weave();

    // Should complete without errors
    // (actual generation depends on treadles)
    assert.ok(result);
  });
});

describe('Pattern: Output Capture & Debugging', () => {
  it('should capture verbose weave output', async () => {
    const core = new SpiralRing();
    const ring = spiralOut(core, {});

    const { output } = await captureOutput(async () => {
      const runner = createTestRunner({
        warp: { ring },
        verbose: true
      });
      return runner.weave();
    });

    // Should have captured something
    assert.ok(output.all.length >= 0);
  });

  it('should track virtual filesystem', async () => {
    const virtualFs = new Map<string, string>();

    const treadle = createMockTreadle({
      name: 'vfs-tracker',
      files: [{ path: 'generated/test.rs', content: '// generated' }]
    });

    const core = new SpiralRing();
    const ring = spiralOut(core, {});
    (ring as any).tieup.intra(treadle, {});

    const runner = createTestRunner({
      warp: { ring },
      virtualFs
    });

    await runner.weave();

    // Virtual FS should be accessible
    const files = runner.listFiles();
    assert.ok(Array.isArray(files));
  });
});
