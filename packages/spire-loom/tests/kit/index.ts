/**
 * Spire-Loom Test Kit 🧪
 *
 * Advanced testing utilities for spire-loom.
 * Uses Node.js built-in test runner for zero dependencies.
 *
 * @example
 * ```typescript
 * import { describe, it } from 'node:test';
 * import { assert } from 'node:assert';
 * import { createTestRunner, warpMock } from '@o19/spire-loom/machinery/testkit';
 *
 * describe('tieup integration', () => {
 *   it('should execute custom treadle', async () => {
 *     const runner = createTestRunner({
 *       warp: warpMock({
 *         foundframe: loom.spiral(loom.rustCore())
 *           .tieup.intra(dbBindingTreadle, { entities: ['Bookmark'] })
 *       })
 *     });
 *
 *     const result = await runner.weave();
 *
 *     assert.equal(result.filesGenerated.length, 1);
 *     assert.ok(result.filesGenerated[0].includes('bookmark.gen.rs'));
 *   });
 * });
 * ```
 */

export {
  createTestRunner,
  type TestRunner,
  type TestRunnerConfig,
  type WeaveResult,
} from './runner.js';

export {
  warpMock,
  type WarpMockConfig,
  type MockSpiralRing,
} from './warp-mock.js';

export {
  createMockTreadle,
  mockTreadles,
  type MockTreadleConfig,
  type MockFile,
} from './fixtures.js';

export {
  captureOutput,
  type CapturedOutput,
} from './capture.js';
