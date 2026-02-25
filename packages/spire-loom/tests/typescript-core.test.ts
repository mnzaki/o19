/**
 * TypeScript Core Tests
 *
 * Tests for TsCore, typescript.Class decorator, and tieup integration.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { typescript, spiral, tieup } from '../warp/index.js';
import { createMockVirtualFs, createMockTreadleUtils } from './mocks/filesystem.js';
import { getTieups, executeTieups } from '../warp/tieups.js';
import type { CustomTreadle } from '../warp/tieups.js';

describe('TypeScript Core', () => {
  it('should create TsCore from @typescript.Class', () => {
    @typescript.Class
    class DB {}

    const prisma = spiral(DB);
    
    // Should be a SpiralOut with typescript spiraler
    assert.ok(prisma, 'spiral should return something');
    assert.ok(prisma.typescript, 'should have typescript spiraler');
    
    // Check metadata
    const anyPrisma = prisma as any;
    assert.ok(anyPrisma.inner, 'should have inner core');
    assert.equal(anyPrisma.inner.metadata?.language, 'typescript', 'should be typescript language');
  });

  it('should attach tieups to TypeScript core', () => {
    @typescript.Class
    class DB {}

    const mockTreadle: CustomTreadle = async (context) => ({
      generatedFiles: ['test.ts'],
      modifiedFiles: [],
      errors: []
    });

    const prisma = spiral(DB).tieup({
      treadles: [mockTreadle],
      warpData: { entities: ['Test'] }
    });

    // Check tieups are attached
    const tieups = getTieups(prisma);
    assert.equal(tieups.length, 1, 'should have one tieup');
    assert.equal(tieups[0].config.treadles.length, 1, 'should have one treadle');
  });

  it('should execute tieups on TypeScript core', async () => {
    @typescript.Class
    class DB {}

    const vfs = createMockVirtualFs();
    let treadleExecuted = false;
    let capturedContext: any = null;

    const mockTreadle: CustomTreadle = async (context) => {
      treadleExecuted = true;
      capturedContext = context;
      
      // Write a file
      await context.utils.writeFile('generated.ts', '// generated code');
      
      return {
        generatedFiles: ['generated.ts'],
        modifiedFiles: [],
        errors: []
      };
    };

    const prisma = spiral(DB).tieup({
      treadles: [mockTreadle],
      warpData: { entities: ['Test'] }
    });

    // Execute tieups
    const result = await executeTieups(
      prisma,
      '/test/package',
      createMockTreadleUtils(vfs, '/test/package')
    );

    assert.ok(treadleExecuted, 'treadle should have been executed');
    assert.ok(capturedContext, 'context should have been captured');
    assert.equal(capturedContext.source, prisma, 'source should be the prisma layer');
    assert.equal(capturedContext.target, prisma, 'target should be the prisma layer');
    assert.equal(result.generated.length, 1, 'should have generated one file');
    assert.equal(result.errors.length, 0, 'should have no errors');
    
    // Check file was written
    const content = vfs.readFile('/test/package/generated.ts');
    assert.equal(content, '// generated code', 'file should have correct content');
  });

  it('should support cross-layer tieups (source != target)', async () => {
    @typescript.Class
    class DB {}

    @typescript.Class  
    class Front {}

    const prisma = spiral(DB);
    const front = spiral(Front).tieup(prisma, {
      treadles: [],
      warpData: { entities: ['Test'] }
    });

    const tieups = getTieups(front);
    assert.equal(tieups.length, 1, 'should have one tieup');
    assert.equal(tieups[0].source, prisma, 'source should be prisma');
    assert.equal(tieups[0].target, front, 'target should be front');
  });
});

describe('TypeScript DDD Spiral', () => {
  it('should create DDD layer from TypeScript core', () => {
    @typescript.Class
    class DB {}

    const prisma = spiral(DB);
    const ddd = prisma.typescript.ddd();

    assert.ok(ddd, 'ddd() should return something');
    assert.ok(ddd.typescript, 'should have typescript spiraler for adaptors');
    assert.ok(ddd.tauri, 'should have tauri spiraler for apps');
  });

  it('should attach tieups to DDD layer', () => {
    @typescript.Class
    class DB {}

    const mockTreadle: CustomTreadle = async (context) => ({
      generatedFiles: [],
      modifiedFiles: [],
      errors: []
    });

    const prisma = spiral(DB);
    const front = prisma.typescript.ddd().tieup(prisma, {
      treadles: [mockTreadle],
      warpData: { entities: ['Bookmark'] }
    });

    const tieups = getTieups(front);
    assert.equal(tieups.length, 1, 'should have one tieup on front');
    assert.equal(tieups[0].source, prisma, 'source should be prisma');
    assert.equal(tieups[0].target, front, 'target should be front');
  });
});
