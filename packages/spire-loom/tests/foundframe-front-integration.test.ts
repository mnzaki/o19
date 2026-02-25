/**
 * Foundframe-Front Integration Test
 *
 * Tests the actual setup from o19/loom/WARP.ts for TypeScript DDD layer
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { typescript, rust, spiral, tieup } from '../warp/index.js';
import { createMockVirtualFs, createMockTreadleUtils } from './mocks/filesystem.js';
import { getTieups, executeTieups } from '../warp/tieups.js';
import type { CustomTreadle, TreadleContext } from '../warp/tieups.js';
import { Heddles } from '../machinery/heddles/index.js';
import { createDefaultMatrix } from '../machinery/treadle-kit/discovery.js';
import { SpiralRing } from '../warp/spiral/pattern.js';

describe('Foundframe-Front Integration', () => {
  it('should create the full spiral chain: Rust -> Tauri -> TypeScript DDD', () => {
    // 1. Create Rust core (like Foundframe)
    @rust.Struct
    class Foundframe {}

    const foundframe = spiral(Foundframe);
    assert.ok(foundframe.android, 'should have android spiraler');
    assert.ok(foundframe.desktop, 'should have desktop spiraler');

    // 2. Create platform rings
    const android = foundframe.android.foregroundService();
    const desktop = foundframe.desktop.direct();

    // 3. Create Tauri mux with plugin
    const tauri = spiral(android, desktop).tauri.plugin();
    assert.ok(tauri.typescript, 'should have typescript spiraler from plugin');

    // 4. Create TypeScript DDD from Tauri plugin
    const front = tauri.typescript.ddd();
    assert.ok(front.typescript, 'should have typescript spiraler for adaptors');
    assert.ok(front.tauri, 'should have tauri spiraler for apps');

    console.log('Spiral chain created successfully:');
    console.log('  foundframe -> android/desktop -> tauri -> front');
  });

  it('should create TypeScript core with DB class', () => {
    @typescript.Class
    class DB {}

    const prisma = spiral(DB);
    assert.ok(prisma.typescript, 'should have typescript spiraler');
    assert.equal((prisma as any).inner.metadata?.language, 'typescript');
  });

  it('should replicate the WARP.ts setup with tieups', async () => {
    // Mock the kyselyAdaptorTreadle
    const filesGenerated: string[] = [];
    const kyselyAdaptorTreadle: CustomTreadle = async (context: TreadleContext) => {
      const { source, target, config } = context;
      
      // Simulate generating Kysely adaptor files
      const entities = (config as any).warpData?.entities || [];
      const operations = (config as any).warpData?.operations || [];
      
      for (const entity of entities) {
        const fileName = `${entity.toLowerCase()}.gen.ts`;
        await context.utils.writeFile(
          `adaptors/${fileName}`,
          `// Kysely adaptor for ${entity}\n// Operations: ${operations.join(', ')}`
        );
        filesGenerated.push(`adaptors/${fileName}`);
      }

      return {
        generatedFiles: filesGenerated,
        modifiedFiles: [],
        errors: []
      };
    };

    // 1. Create the TypeScript DB core (like prisma)
    @typescript.Class
    class DB {}
    const prisma = spiral(DB);

    // 2. Create a mock Tauri-like structure
    @rust.Struct
    class MockCore {}
    const mockCore = spiral(MockCore);
    const mockAndroid = mockCore.android.foregroundService();
    const mockDesktop = mockCore.desktop.direct();
    const mockTauri = spiral(mockAndroid, mockDesktop).tauri.plugin();

    // 3. Create front with tieup to prisma (replicating WARP.ts)
    const front = mockTauri.typescript.ddd().tieup(prisma, {
      treadles: [kyselyAdaptorTreadle],
      warpData: {
        entities: ['Bookmark', 'Media'],
        operations: ['create', 'read', 'update', 'delete']
      }
    });

    // 4. Check tieups are attached to front
    const tieups = getTieups(front);
    assert.equal(tieups.length, 1, 'front should have one tieup');
    assert.equal(tieups[0].source, prisma, 'source should be prisma');
    assert.equal(tieups[0].target, front, 'target should be front');

    // 5. Execute the tieups
    const vfs = createMockVirtualFs();
    const result = await executeTieups(
      front,
      '/test/packages/foundframe-front',
      createMockTreadleUtils(vfs, '/test/packages/foundframe-front')
    );

    assert.equal(result.generated.length, 2, 'should generate 2 files');
    assert.ok(result.generated.includes('adaptors/bookmark.gen.ts'));
    assert.ok(result.generated.includes('adaptors/media.gen.ts'));

    // 6. Verify file contents
    const bookmarkContent = vfs.readFile('/test/packages/foundframe-front/adaptors/bookmark.gen.ts');
    assert.ok(bookmarkContent?.includes('Kysely adaptor for Bookmark'));
    assert.ok(bookmarkContent?.includes('Operations: create, read, update, delete'));

    console.log('Tieup execution successful!');
    console.log('  Generated files:', result.generated);
  });

  it('should include TypeScript layers in weaving plan', () => {
    @typescript.Class
    class DB {}
    const prisma = spiral(DB);

    // Build a mock WARP
    const warp = {
      prisma
    };

    // Create heddles and build plan
    const heddles = new Heddles(createDefaultMatrix());
    const plan = heddles.buildPlan(warp);

    // Check that TypeScript layers are in the plan
    const allNodes = Array.from(plan.nodesByType.values()).flat();
    const typeNames = allNodes.map(n => n.typeName);
    
    console.log('Nodes in plan:', typeNames);
    
    // Should have TsCore in the nodes
    assert.ok(typeNames.includes('TsCore') || typeNames.includes('SpiralOut'), 
      'should have TypeScript-related nodes in plan');

    // Check edges
    console.log('Edges:', plan.edges.map(e => `${e.from.constructor.name} -> ${e.to.constructor.name}`));
  });

  it('should traverse full foundframe-front chain in plan', () => {
    // Build the full chain
    @rust.Struct class Core {}
    @typescript.Class class DB {}

    const core = spiral(Core);
    const android = core.android.foregroundService();
    const desktop = core.desktop.direct();
    const tauriMux = spiral(android, desktop).tauri.plugin();
    const prisma = spiral(DB);
    const front = tauriMux.typescript.ddd().tieup(prisma, {
      treadles: [],
      warpData: {}
    });

    const warp = { core, prisma, front };

    // Build plan
    const heddles = new Heddles(createDefaultMatrix());
    const plan = heddles.buildPlan(warp);

    // Log all nodes
    console.log('\nFull chain nodes:');
    const allNodes = Array.from(plan.nodesByType.entries());
    for (const [typeName, nodes] of allNodes) {
      console.log(`  ${typeName}: ${nodes.length} nodes`);
      for (const node of nodes) {
        console.log(`    - ${node.exportName} (depth ${node.depth})`);
      }
    }

    // Log all edges
    console.log('\nFull chain edges:');
    for (const edge of plan.edges) {
      console.log(`  ${edge.from.constructor.name} -> ${edge.to.constructor.name} (${edge.relationship})`);
    }

    // The front should be in the plan
    const frontNodes = plan.nodesByType.get('TypescriptSpiraler') || [];
    assert.ok(frontNodes.length > 0 || plan.nodesByType.get('SpiralOut'), 
      'front (TypeScript DDD) should be in the plan');
  });
});
