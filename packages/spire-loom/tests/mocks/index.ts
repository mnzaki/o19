/**
 * Spire-Loom Test Mocks
 *
 * Isolated mocks for testing without foundframe dependencies.
 */

// Export all mock factories
export {
  createMockLoom,
  type MockLoom,
  type MockLoomOptions,
} from './loom.js';

export {
  createMockCore,
  createMockSpiralOut,
  createMockSpiralMux,
  type MockCoreConfig,
  type MockSpiralConfig,
} from './spirals.js';

export {
  createMockTreadle,
  mockTreadles,
  type MockTreadleConfig,
  type MockFile,
} from './treadles.js';

export {
  createMockManagement,
  mockManagements,
  type MockManagementConfig,
  type MockMethod,
} from './managements.js';

export {
  createMockVirtualFs,
  type MockVirtualFs,
  type VirtualFsConfig,
} from './filesystem.js';

export {
  createTestWarp,
  testWarps,
  type TestWarpConfig,
  type TestWarpResult,
} from './warp-builder.js';

export {
  createMockTestRunner,
  assertions,
  type MockTestRunnerConfig,
  type MockWeaveResult,
} from './test-runner.js';
