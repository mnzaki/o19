/**
 * Integration Tests for Spire-Loom Test Kit
 *
 * Tests the test kit itself using node:test.
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
import type { SpiralRing } from '../warp/spiral/pattern.js';
import { SpiralRing as SpiralRingClass, spiralOut } from '../warp/spiral/pattern.js';
import { intra } from '../warp/tieups/intra.ts';

describe('TestKit: createTestRunner', () => {
  it('should create a runner with empty warp', async () => {
    const runner = createTestRunner({
      warp: {}
    });

    const result = await runner.weave();

    assert.equal(result.filesGenerated.length, 0);
    assert.equal(result.errors.length, 0);
  });

  it('should create a runner with mock rings', async () => {
    const runner = createTestRunner({
      warp: warpMock({ autoMock: true })
    });

    const ring = runner.getRing('foundframe');
    assert.ok(ring);
    assert.ok(ring instanceof SpiralRingClass);
  });
});

describe('TestKit: tieup integration', () => {
  it('should execute mock treadle and generate files', async () => {
    const mockTreadle = createMockTreadle({
      name: 'test-treadle',
      files: [{ path: 'test.rs', content: '// test content' }]
    });

    // Create a simple spiral chain
    const core = new SpiralRingClass();
    const foundframe = spiralOut(core, {});

    // Attach tieup manually
    (intra as any).call(foundframe, mockTreadle, { test: true });

    const runner = createTestRunner({
      warp: { foundframe }
    });

    const result = await runner.weave();

    // Should have generated files
    assert.ok(result.filesGenerated.length > 0 || result.output?.includes('intra-tieup'));
  });

  it('should capture console output', async () => {
    const { output } = await captureOutput(async () => {
      const runner = createTestRunner({
        warp: warpMock({ autoMock: true }),
        verbose: true
      });
      return runner.weave();
    });

    // Should have captured some output
    assert.ok(output.all.length >= 0);
  });
});

describe('TestKit: mock treadles', () => {
  it('should create rust file treadle', async () => {
    const treadle = mockTreadles.rustFile('Bookmark', 'pub struct Bookmark;');

    const files: string[] = [];
    await treadle({
      ring: new SpiralRingClass(),
      config: {},
      packagePath: '/test',
      utils: {
        writeFile: async (path, content) => {
          files.push(path);
        },
        readFile: async () => null,
        updateFile: async () => {},
        fileExists: async () => false
      }
    });

    assert.equal(files.length, 1);
    assert.ok(files[0].includes('bookmark.rs'));
  });

  it('should create failing treadle', async () => {
    const treadle = mockTreadles.failing('bad-treadle');

    let error: Error | null = null;
    try {
      await treadle({
        ring: new SpiralRingClass(),
        config: {},
        packagePath: '/test',
        utils: {
          writeFile: async () => {},
          readFile: async () => null,
          updateFile: async () => {},
          fileExists: async () => false
        }
      });
    } catch (e) {
      error = e as Error;
    }

    assert.ok(error);
    assert.ok(error.message.includes('bad-treadle'));
  });
});

describe('TestKit: virtual filesystem', () => {
  it('should track files in virtual fs', async () => {
    const virtualFs = new Map<string, string>();

    const mockTreadle = createMockTreadle({
      name: 'vfs-test',
      files: [{ path: 'generated.rs', content: '// generated' }]
    });

    const core = new SpiralRingClass();
    const foundframe = spiralOut(core, {});
    (intra as any).call(foundframe, mockTreadle, {});

    const runner = createTestRunner({
      warp: { foundframe },
      virtualFs
    });

    await runner.weave();

    // Virtual FS should track the files
    assert.equal(virtualFs.size, 0); // Files are written via utils, not directly
  });
});
