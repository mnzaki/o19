/**
 * Foundframe-Front Integration Test
 *
 * Tests the actual setup from o19/loom/WARP.ts for TypeScript DDD layer
 * using the spire-loom test kit.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { typescript, rust, spiral } from '../warp/index.js';
import { getTieups } from '../warp/tieups.js';
import type { TreadleDefinition } from '../machinery/treadle-kit/declarative.js';
import { Heddles } from '../machinery/heddles/index.js';
import { createDefaultMatrix } from '../machinery/treadle-kit/discovery.js';
import { createTestRunner, mockTreadles, createMockTreadle } from './kit/index.js';

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

    // 3. Create Tauri using spiral.tauri.plugin() (new pattern)
    // Note: The tauri plugin aggregates platforms internally
    const tauri = spiral.tauri.plugin({
      ddd: {
        adaptors: {
          filterOut: ['crud:read', 'crud:list']
        }
      }
    });
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

  it('should replicate the WARP.ts setup with tieups using TreadleDefinition', () => {
    // Create a Kysely-style adaptor treadle using TreadleDefinition format
    // (tieup style - no matches needed)
    const kyselyAdaptorTreadle: TreadleDefinition = {
      name: 'mock-kysely-adaptor',
      // No matches - this is a tieup treadle invoked directly
      methods: {
        filter: 'front',
        pipeline: []
      },
      outputs: (ctx) => {
        const config = ctx.config as { entities?: string[]; operations?: string[] } | undefined;
        const entities = config?.entities || [];
        
        // Generate one output per entity
        return entities.map(entity => ({
          template: 'kysely/adaptor.ts.ejs',
          path: `src/adaptors/gen/${entity.toLowerCase()}.adaptor.gen.ts`,
          language: 'typescript' as const
        }));
      },
      data: (ctx) => {
        const config = ctx.config as { entities?: string[]; operations?: string[] } | undefined;
        return {
          entities: (config?.entities || []).map(e => ({
            name: e,
            pascal: e.charAt(0).toUpperCase() + e.slice(1),
            lower: e.toLowerCase()
          })),
          operations: config?.operations || []
        };
      }
    };

    // 1. Create the TypeScript DB core (like prisma)
    @typescript.Class
    class DB {}
    const prisma = spiral(DB);

    // 2. Create a Tauri plugin using the new pattern
    const tauri = spiral.tauri.plugin({
      ddd: {
        adaptors: {
          filterOut: ['crud:delete']
        }
      }
    });

    // 3. Create front with tieup (replicating WARP.ts pattern)
    // Each treadle has its own warpData in the treadles array
    const front = tauri.typescript.ddd().tieup({
      treadles: [{
        treadle: kyselyAdaptorTreadle,
        warpData: {
          entities: ['Bookmark', 'Media'],
          operations: ['create', 'read', 'update', 'delete']
        }
      }]
    });

    // 4. Check tieups are attached to front
    const tieups = getTieups(front);
    assert.equal(tieups.length, 1, 'front should have one tieup');

    // 5. Verify the treadle in the tieup is a TreadleDefinition
    const treadleEntry = tieups[0].config.treadles[0];
    assert.ok(treadleEntry, 'should have a treadle entry');
    assert.ok(treadleEntry.treadle, 'should have a treadle');
    assert.ok('methods' in treadleEntry.treadle, 'treadle should be TreadleDefinition (has methods)');
    assert.ok('outputs' in treadleEntry.treadle, 'treadle should be TreadleDefinition (has outputs)');
    assert.deepStrictEqual(treadleEntry.warpData?.entities, ['Bookmark', 'Media'], 'should have correct warpData');

    console.log('Tieup setup successful with TreadleDefinition!');
    console.log('  Treadle name:', (treadleEntry.treadle as TreadleDefinition).name);
  });

  it('should use test kit mock treadles with TreadleDefinition', () => {
    // Use the new mockTreadles factory that returns TreadleDefinitions
    const rustTreadle = mockTreadles.rustFile('Bookmark', 'pub struct Bookmark { id: i64 }');
    
    assert.ok('methods' in rustTreadle, 'should be TreadleDefinition');
    assert.ok('outputs' in rustTreadle, 'should have outputs');
    assert.equal(rustTreadle.name, 'rust-Bookmark');
    
    // Verify outputs is an array
    assert.ok(Array.isArray(rustTreadle.outputs), 'outputs should be an array');
    
    console.log('Test kit mock treadle works with TreadleDefinition!');
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
    // Build the full chain using the new pattern
    @rust.Struct class Core {}
    @typescript.Class class DB {}

    const core = spiral(Core);
    const android = core.android.foregroundService();
    const desktop = core.desktop.direct();
    
    // Use new tauri plugin pattern
    const tauri = spiral.tauri.plugin({
      ddd: { adaptors: {} }
    });
    
    const prisma = spiral(DB);
    const front = tauri.typescript.ddd().tieup({
      treadles: []
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
    // The type name includes the method that created it (e.g., 'TypescriptSpiraler.ddd')
    const frontNodes = plan.nodesByType.get('TypescriptSpiraler.ddd') || [];
    assert.ok(frontNodes.length > 0 || plan.nodesByType.get('SpiralOut') || plan.nodesByType.get('TypescriptSpiraler'), 
      'front (TypeScript DDD) should be in the plan');
  });
});
