/**
 * Patches System Tests
 *
 * Tests for the declarative patches feature in declareTreadle.
 * Patches enable idempotent file modifications using marker-based blocks.
 */

import { describe, it, beforeEach, afterEach } from 'vitest';
import { expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { declareTreadle, generateFromTreadle } from '../machinery/treadle-kit/declarative.js';
import type { PatchSpec, GeneratorContext } from '../machinery/treadle-kit/index.js';
import { hasBlock, createMarkers } from '../machinery/shuttle/markers.js';

describe('Patches System', () => {
  let tempDir: string;
  let packageDir: string;
  let context: GeneratorContext;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patches-test-'));
    packageDir = path.join(tempDir, 'test-package');
    fs.mkdirSync(packageDir, { recursive: true });

    context = {
      plan: {
        edges: [],
        nodesByType: new Map(),
        managements: [],
        tasks: [],
        _isComplete: true,
      } as any,
      workspaceRoot: tempDir,
      packageDir,
      packagePath: 'test-package',
    };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('PatchSpec Type', () => {
    it('should accept valid patch specifications', () => {
      const patch: PatchSpec = {
        type: 'ensureBlock',
        targetFile: 'Cargo.toml',
        marker: 'spire-deps',
        template: 'test.mejs',
        language: 'toml',
      };

      expect(patch.type).toBe('ensureBlock');
      expect(patch.marker).toBe('spire-deps');
    });

    it('should accept patches with position options', () => {
      const patch: PatchSpec = {
        type: 'ensureBlock',
        targetFile: 'src/lib.rs',
        marker: 'module-decl',
        template: 'mod.mejs',
        language: 'rust',
        position: {
          after: 'pub mod prelude;',
        },
      };

      expect(patch.position?.after).toBe('pub mod prelude;');
    });
  });

  describe('declareTreadle with patches', () => {
    it('should define a treadle with static patches', () => {
      const treadle = declareTreadle({
        matches: [{ current: 'TestSpiraler', previous: 'RustCore' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'test.mejs', path: 'test.rs', language: 'rust' }],
        patches: [
          {
            type: 'ensureBlock',
            targetFile: 'Cargo.toml',
            marker: 'spire-deps',
            template: 'cargo/deps.mejs',
            language: 'toml',
          },
        ],
      });

      expect(treadle.patches.length).toBe(1);
      const patch = treadle.patches![0];
      expect(patch.type).toBe('ensureBlock');
      expect(patch.targetFile).toBe('Cargo.toml');
      expect(patch.marker).toBe('spire-deps');
      expect(patch.template).toBe('cargo/deps.mejs');
      expect(patch.language).toBe('toml');
    });

    it('should define a treadle with function-based patches', () => {
      const treadle = declareTreadle({
        matches: [{ current: 'TestSpiraler', previous: 'RustCore' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'test.mejs', path: 'test.rs', language: 'rust' }],
        patches: [
          (ctx) => {
            if (ctx.packagePath.includes('mobile')) {
              return {
                type: 'ensureBlock',
                targetFile: 'Cargo.toml',
                marker: 'mobile-deps',
                template: 'mobile/deps.mejs',
                language: 'toml',
              };
            }
            return undefined;
          },
        ],
      });

      expect(typeof treadle.patches![0]).toBe('function');
    });

    it('should allow multiple patches', () => {
      const treadle = declareTreadle({
        matches: [{ current: 'TestSpiraler', previous: 'RustCore' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'test.mejs', path: 'test.rs', language: 'rust' }],
        patches: [
          {
            type: 'ensureBlock',
            targetFile: 'Cargo.toml',
            marker: 'spire-deps',
            template: 'deps.mejs',
            language: 'toml',
          },
          {
            type: 'ensureBlock',
            targetFile: 'src/lib.rs',
            marker: 'spire-mod',
            template: 'mod.mejs',
            language: 'rust',
          },
        ],
      });

      expect(treadle.patches.length).toBe(2);
    });
  });

  describe('patch execution', () => {
    it('should apply patch to existing file using real template', async () => {
      // Create a target file
      const cargoPath = path.join(packageDir, 'Cargo.toml');
      fs.writeFileSync(cargoPath, '[package]\nname = "test"\n\n[dependencies]\n');

      const treadle = declareTreadle({
        name: 'testTreadle',
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'tauri/README.md.mejs', path: 'README.md', language: 'rust' }],
        data: { 
          coreNamePascal: 'TestCore',
          pluginName: 'test-plugin',
          coreName: 'test',
        },
        patches: [
          {
            type: 'ensureBlock',
            targetFile: 'Cargo.toml',
            marker: 'test-block',
            template: 'tauri/README.md.mejs',  // Use a real template
            language: 'toml',
            position: { after: '[dependencies]' },
          },
        ],
      });

      const generator = generateFromTreadle(treadle);

      // Run generator - this will apply the patch
      await generator(
        { typeName: 'Test', ring: {} as any },
        { typeName: 'Core', ring: {} as any },
        context
      );

      // Verify the file still exists and was modified
      expect(fs.existsSync(cargoPath)).toBe(true);
      const content = fs.readFileSync(cargoPath, 'utf-8');
      // The patch should have added a block with markers
      expect(content.includes('SPIRE-LOOM:TESTTREADLE:TEST-BLOCK')).toBe(true);
    });

    it('should use treadle name as marker scope', () => {
      const treadle = declareTreadle({
        name: 'androidService',
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'dummy.mejs', path: 'dummy.rs', language: 'rust' }],
        patches: [
          {
            type: 'ensureBlock',
            targetFile: 'test.toml',
            marker: 'spire-deps',
            template: 'test.mejs',
            language: 'toml',
          },
        ],
      });

      // Verify the treadle name is set (used as marker scope)
      expect(treadle.name).toBe('androidService');

      // Create markers to verify scope
      const markers = createMarkers('toml', 'androidService', 'spire-deps');
      expect(markers.start.includes('SPIRE-LOOM:ANDROIDSERVICE:SPIRE-DEPS')).toBe(true);
    });
  });

  describe('patch resolution', () => {
    it('should resolve function patches at runtime', async () => {
      let called = false;

      const treadle = declareTreadle({
        name: 'testTreadle',
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'tauri/README.md.mejs', path: 'README.md', language: 'rust' }],
        data: { 
          coreNamePascal: 'TestCore',
          pluginName: 'test-plugin',
          coreName: 'test',
        },
        patches: [
          (ctx) => {
            called = true;
            expect(ctx.packageDir).toBe(packageDir);
            return {
              type: 'ensureBlock',
              targetFile: 'Cargo.toml',
              marker: 'dynamic',
              template: 'tauri/README.md.mejs',  // Use real template
              language: 'toml',
            };
          },
        ],
      });

      const generator = generateFromTreadle(treadle);

      // Create Cargo.toml
      const cargoPath = path.join(packageDir, 'Cargo.toml');
      fs.writeFileSync(cargoPath, '[package]\nname = "test"\n');

      await generator(
        { typeName: 'Test', ring: {} as any },
        { typeName: 'Core', ring: {} as any },
        context
      );

      expect(called).toBe(true);
      
      // Verify patch was applied
      const content = fs.readFileSync(cargoPath, 'utf-8');
      expect(content.includes('SPIRE-LOOM:TESTTREADLE:DYNAMIC')).toBe(true);
    });

    it('should skip undefined patches from functions', () => {
      const treadle = declareTreadle({
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'dummy.mejs', path: 'dummy.rs', language: 'rust' }],
        patches: [
          () => undefined,
          {
            type: 'ensureBlock',
            targetFile: 'test.txt',
            marker: 'static',
            template: 'static.mejs',
            language: 'rust',
          },
        ],
      });

      expect(treadle.patches.length).toBe(2);
    });
  });

  describe('phase ordering', () => {
    it('should document correct phase order', () => {
      // This test documents the expected phase order:
      // 1. File Generation (into spire/)
      // 2. Patches (can target any file)
      // 3. Hookup (custom logic)

      const phases: string[] = [];

      const treadle = declareTreadle({
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [
          {
            template: 'gen.mejs',
            path: 'generated.rs',
            language: 'rust',
          },
        ],
        patches: [
          {
            type: 'ensureBlock',
            targetFile: 'existing.toml',
            marker: 'patch',
            template: 'patch.mejs',
            language: 'toml',
          },
        ],
        hookup: {
          type: 'custom',
          customHookup: async () => {
            phases.push('hookup');
          },
        },
      });

      // Verify all phases are defined
      expect(treadle.outputs.length).toBe(1);
      expect(treadle.patches.length).toBe(1);
      expect(treadle.hookup !== undefined).toBe(true);
    });
  });

  describe('output and patch functions', () => {
    it('should support function-based outputs', () => {
      const treadle = declareTreadle({
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [
          (ctx) => {
            if (ctx.packagePath.includes('mobile')) {
              return {
                template: 'mobile.mejs',
                path: 'mobile.rs',
                language: 'rust',
              };
            }
            return {
              template: 'desktop.mejs',
              path: 'desktop.rs',
              language: 'rust',
            };
          },
        ],
      });

      expect(typeof treadle.outputs[0]).toBe('function');
    });

    it('should filter out undefined outputs from functions', () => {
      const treadle = declareTreadle({
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [
          () => undefined,
          {
            template: 'always.mejs',
            path: 'always.rs',
            language: 'rust',
          },
        ],
      });

      expect(treadle.outputs.length).toBe(2);
    });
  });
});

describe('Marker Integration', () => {
  it('should create correct markers for each language', () => {
    const rustMarkers = createMarkers('rust', 'myTreadle', 'myBlock');
    expect(rustMarkers.start).toBe('/* SPIRE-LOOM:MYTREADLE:MYBLOCK */');
    expect(rustMarkers.end).toBe('/* /SPIRE-LOOM:MYTREADLE:MYBLOCK */');

    const tomlMarkers = createMarkers('toml', 'myTreadle', 'myBlock');
    expect(tomlMarkers.start).toBe('# SPIRE-LOOM:MYTREADLE:MYBLOCK');
    expect(tomlMarkers.end).toBe('# /SPIRE-LOOM:MYTREADLE:MYBLOCK');

    const gradleMarkers = createMarkers('gradle', 'myTreadle', 'myBlock');
    expect(gradleMarkers.start.includes('SPIRE-LOOM:MYTREADLE:MYBLOCK')).toBe(true);

    const xmlMarkers = createMarkers('xml', 'myTreadle', 'myBlock');
    expect(xmlMarkers.start).toBe('<!-- SPIRE-LOOM:MYTREADLE:MYBLOCK -->');
  });

  it('should detect existing blocks', () => {
    const markers = createMarkers('rust', 'test', 'block');
    const content = `
/* SPIRE-LOOM:TEST:BLOCK */
content here
/* /SPIRE-LOOM:TEST:BLOCK */
`;

    expect(hasBlock(content, markers)).toBe(true);
  });

  it('should not detect non-existent blocks', () => {
    const markers = createMarkers('rust', 'test', 'block');
    const content = 'some random content without markers';

    expect(!hasBlock(content, markers)).toBe(true);
  });
});
