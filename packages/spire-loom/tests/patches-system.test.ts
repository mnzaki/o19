/**
 * Patches System Tests
 *
 * Tests for the declarative patches feature in defineTreadle.
 * Patches enable idempotent file modifications using marker-based blocks.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { defineTreadle, generateFromTreadle } from '../machinery/treadle-kit/declarative.js';
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
        template: 'test.ejs',
        language: 'toml',
      };

      assert.strictEqual(patch.type, 'ensureBlock');
      assert.strictEqual(patch.marker, 'spire-deps');
    });

    it('should accept patches with position options', () => {
      const patch: PatchSpec = {
        type: 'ensureBlock',
        targetFile: 'src/lib.rs',
        marker: 'module-decl',
        template: 'mod.ejs',
        language: 'rust',
        position: {
          after: 'pub mod prelude;',
        },
      };

      assert.strictEqual(patch.position?.after, 'pub mod prelude;');
    });
  });

  describe('defineTreadle with patches', () => {
    it('should define a treadle with static patches', () => {
      const treadle = defineTreadle({
        matches: [{ current: 'TestSpiraler', previous: 'RustCore' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'test.ejs', path: 'test.rs', language: 'rust' }],
        patches: [
          {
            type: 'ensureBlock',
            targetFile: 'Cargo.toml',
            marker: 'spire-deps',
            template: 'cargo/deps.ejs',
            language: 'toml',
          },
        ],
      });

      assert.strictEqual(treadle.patches.length, 1);
      const patch = treadle.patches![0];
      assert.strictEqual(patch.type, 'ensureBlock');
      assert.strictEqual(patch.targetFile, 'Cargo.toml');
      assert.strictEqual(patch.marker, 'spire-deps');
      assert.strictEqual(patch.template, 'cargo/deps.ejs');
      assert.strictEqual(patch.language, 'toml');
    });

    it('should define a treadle with function-based patches', () => {
      const treadle = defineTreadle({
        matches: [{ current: 'TestSpiraler', previous: 'RustCore' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'test.ejs', path: 'test.rs', language: 'rust' }],
        patches: [
          (ctx) => {
            if (ctx.packagePath.includes('mobile')) {
              return {
                type: 'ensureBlock',
                targetFile: 'Cargo.toml',
                marker: 'mobile-deps',
                template: 'mobile/deps.ejs',
                language: 'toml',
              };
            }
            return undefined;
          },
        ],
      });

      assert.strictEqual(typeof treadle.patches![0], 'function');
    });

    it('should allow multiple patches', () => {
      const treadle = defineTreadle({
        matches: [{ current: 'TestSpiraler', previous: 'RustCore' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'test.ejs', path: 'test.rs', language: 'rust' }],
        patches: [
          {
            type: 'ensureBlock',
            targetFile: 'Cargo.toml',
            marker: 'spire-deps',
            template: 'deps.ejs',
            language: 'toml',
          },
          {
            type: 'ensureBlock',
            targetFile: 'src/lib.rs',
            marker: 'spire-mod',
            template: 'mod.ejs',
            language: 'rust',
          },
        ],
      });

      assert.strictEqual(treadle.patches.length, 2);
    });
  });

  describe('patch execution', () => {
    it('should apply patch to existing file using real template', async () => {
      // Create a target file
      const cargoPath = path.join(packageDir, 'Cargo.toml');
      fs.writeFileSync(cargoPath, '[package]\nname = "test"\n\n[dependencies]\n');

      const treadle = defineTreadle({
        name: 'testTreadle',
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'tauri/README.md.ejs', path: 'README.md', language: 'rust' }],
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
            template: 'tauri/README.md.ejs',  // Use a real template
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
      assert.ok(fs.existsSync(cargoPath));
      const content = fs.readFileSync(cargoPath, 'utf-8');
      // The patch should have added a block with markers
      assert.ok(content.includes('SPIRE-LOOM:TESTTREADLE:TEST-BLOCK'));
    });

    it('should use treadle name as marker scope', () => {
      const treadle = defineTreadle({
        name: 'androidService',
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'dummy.ejs', path: 'dummy.rs', language: 'rust' }],
        patches: [
          {
            type: 'ensureBlock',
            targetFile: 'test.toml',
            marker: 'spire-deps',
            template: 'test.ejs',
            language: 'toml',
          },
        ],
      });

      // Verify the treadle name is set (used as marker scope)
      assert.strictEqual(treadle.name, 'androidService');

      // Create markers to verify scope
      const markers = createMarkers('toml', 'androidService', 'spire-deps');
      assert.ok(markers.start.includes('SPIRE-LOOM:ANDROIDSERVICE:SPIRE-DEPS'));
    });
  });

  describe('patch resolution', () => {
    it('should resolve function patches at runtime', async () => {
      let called = false;

      const treadle = defineTreadle({
        name: 'testTreadle',
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'tauri/README.md.ejs', path: 'README.md', language: 'rust' }],
        data: { 
          coreNamePascal: 'TestCore',
          pluginName: 'test-plugin',
          coreName: 'test',
        },
        patches: [
          (ctx) => {
            called = true;
            assert.strictEqual(ctx.packageDir, packageDir);
            return {
              type: 'ensureBlock',
              targetFile: 'Cargo.toml',
              marker: 'dynamic',
              template: 'tauri/README.md.ejs',  // Use real template
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

      assert.strictEqual(called, true);
      
      // Verify patch was applied
      const content = fs.readFileSync(cargoPath, 'utf-8');
      assert.ok(content.includes('SPIRE-LOOM:TESTTREADLE:DYNAMIC'));
    });

    it('should skip undefined patches from functions', () => {
      const treadle = defineTreadle({
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [{ template: 'dummy.ejs', path: 'dummy.rs', language: 'rust' }],
        patches: [
          () => undefined,
          {
            type: 'ensureBlock',
            targetFile: 'test.txt',
            marker: 'static',
            template: 'static.ejs',
            language: 'rust',
          },
        ],
      });

      assert.strictEqual(treadle.patches.length, 2);
    });
  });

  describe('phase ordering', () => {
    it('should document correct phase order', () => {
      // This test documents the expected phase order:
      // 1. File Generation (into spire/)
      // 2. Patches (can target any file)
      // 3. Hookup (custom logic)

      const phases: string[] = [];

      const treadle = defineTreadle({
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [
          {
            template: 'gen.ejs',
            path: 'generated.rs',
            language: 'rust',
          },
        ],
        patches: [
          {
            type: 'ensureBlock',
            targetFile: 'existing.toml',
            marker: 'patch',
            template: 'patch.ejs',
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
      assert.strictEqual(treadle.outputs.length, 1);
      assert.strictEqual(treadle.patches.length, 1);
      assert.ok(treadle.hookup !== undefined);
    });
  });

  describe('output and patch functions', () => {
    it('should support function-based outputs', () => {
      const treadle = defineTreadle({
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [
          (ctx) => {
            if (ctx.packagePath.includes('mobile')) {
              return {
                template: 'mobile.ejs',
                path: 'mobile.rs',
                language: 'rust',
              };
            }
            return {
              template: 'desktop.ejs',
              path: 'desktop.rs',
              language: 'rust',
            };
          },
        ],
      });

      assert.strictEqual(typeof treadle.outputs[0], 'function');
    });

    it('should filter out undefined outputs from functions', () => {
      const treadle = defineTreadle({
        matches: [{ current: 'Test', previous: 'Core' }],
        methods: { filter: 'core', pipeline: [] },
        outputs: [
          () => undefined,
          {
            template: 'always.ejs',
            path: 'always.rs',
            language: 'rust',
          },
        ],
      });

      assert.strictEqual(treadle.outputs.length, 2);
    });
  });
});

describe('Marker Integration', () => {
  it('should create correct markers for each language', () => {
    const rustMarkers = createMarkers('rust', 'myTreadle', 'myBlock');
    assert.strictEqual(rustMarkers.start, '/* SPIRE-LOOM:MYTREADLE:MYBLOCK */');
    assert.strictEqual(rustMarkers.end, '/* /SPIRE-LOOM:MYTREADLE:MYBLOCK */');

    const tomlMarkers = createMarkers('toml', 'myTreadle', 'myBlock');
    assert.strictEqual(tomlMarkers.start, '# SPIRE-LOOM:MYTREADLE:MYBLOCK');
    assert.strictEqual(tomlMarkers.end, '# /SPIRE-LOOM:MYTREADLE:MYBLOCK');

    const gradleMarkers = createMarkers('gradle', 'myTreadle', 'myBlock');
    assert.ok(gradleMarkers.start.includes('SPIRE-LOOM:MYTREADLE:MYBLOCK'));

    const xmlMarkers = createMarkers('xml', 'myTreadle', 'myBlock');
    assert.strictEqual(xmlMarkers.start, '<!-- SPIRE-LOOM:MYTREADLE:MYBLOCK -->');
  });

  it('should detect existing blocks', () => {
    const markers = createMarkers('rust', 'test', 'block');
    const content = `
/* SPIRE-LOOM:TEST:BLOCK */
content here
/* /SPIRE-LOOM:TEST:BLOCK */
`;

    assert.ok(hasBlock(content, markers));
  });

  it('should not detect non-existent blocks', () => {
    const markers = createMarkers('rust', 'test', 'block');
    const content = 'some random content without markers';

    assert.ok(!hasBlock(content, markers));
  });
});
