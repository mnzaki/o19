/**
 * Tests for gradle-manager.ts
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureGradleBlock,
  ensureGradleBlockRemoved,
  ensureGradleSourceSet,
  clearGradleBlockRegistry,
} from '../machinery/shuttle/gradle-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join('/tmp', `gradle-test-${Date.now()}`);

describe('gradle-manager', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    clearGradleBlockRegistry();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('adds block to empty build.gradle', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, '');

    const result = ensureGradleBlock(gradlePath, 'TestBlock', `
android {
    compileSdk 34
}
`);

    assert.strictEqual(result, true);
    
    const content = fs.readFileSync(gradlePath, 'utf-8');
    assert.ok(content.includes('// spire-loom:TestBlock'));
    assert.ok(content.includes('// /spire-loom:TestBlock'));
    assert.ok(content.includes('compileSdk 34'));
  });

  it('adds block after specific marker', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, `plugins {
    id 'com.android.library'
}
`);

    ensureGradleBlock(gradlePath, 'RustTask', `
tasks.register('buildRust') {
    // Build Rust
}
`, { after: 'plugins {' });

    const content = fs.readFileSync(gradlePath, 'utf-8');
    assert.ok(content.includes('// spire-loom:RustTask'));
    assert.ok(content.includes('tasks.register'));
  });

  it('is idempotent - no change on second run', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, '');

    ensureGradleBlock(gradlePath, 'TestBlock', 'content1');
    clearGradleBlockRegistry();
    const result = ensureGradleBlock(gradlePath, 'TestBlock', 'content1');

    assert.strictEqual(result, false);
  });

  it('updates block when content changes', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, '');

    ensureGradleBlock(gradlePath, 'TestBlock', 'version1');
    clearGradleBlockRegistry();
    const result = ensureGradleBlock(gradlePath, 'TestBlock', 'version2');

    assert.strictEqual(result, true);
    
    const content = fs.readFileSync(gradlePath, 'utf-8');
    assert.ok(content.includes('version2'));
    assert.ok(!content.includes('version1'));
  });

  it('removes block completely', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, `plugins {
}
// spire-loom:TestBlock
test {
}
// /spire-loom:TestBlock
android {
}
`);

    const result = ensureGradleBlockRemoved(gradlePath, 'TestBlock');

    assert.strictEqual(result, true);
    
    const content = fs.readFileSync(gradlePath, 'utf-8');
    assert.ok(!content.includes('spire-loom:TestBlock'));
    assert.ok(!content.includes('test {'));
    assert.ok(content.includes('plugins {'));
    assert.ok(content.includes('android {'));
  });

  it('creates source set configuration from scratch', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, '');

    const result = ensureGradleSourceSet(gradlePath, 'main', {
      java: ['./src/main/java'],
      aidl: ['./src/main/aidl'],
    });

    assert.strictEqual(result, true);
    
    const content = fs.readFileSync(gradlePath, 'utf-8');
    assert.ok(content.includes('android {'));
    assert.ok(content.includes('sourceSets {'));
    assert.ok(content.includes('main {'));
    assert.ok(content.includes("java.srcDir './src/main/java'"));
    assert.ok(content.includes("aidl.srcDir './src/main/aidl'"));
  });

  it('source set with all options', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, '');

    ensureGradleSourceSet(gradlePath, 'main', {
      java: ['./spire/android/java'],
      kotlin: ['./spire/android/kotlin'],
      res: ['./spire/android/res'],
      aidl: ['./spire/android/aidl'],
      jniLibs: ['./spire/android/jniLibs'],
      assets: ['./spire/android/assets'],
      manifest: './spire/android/AndroidManifest.xml',
    });

    const content = fs.readFileSync(gradlePath, 'utf-8');
    assert.ok(content.includes("java.srcDir './spire/android/java'"));
    assert.ok(content.includes("kotlin.srcDir './spire/android/kotlin'"));
    assert.ok(content.includes("res.srcDir './spire/android/res'"));
    assert.ok(content.includes("aidl.srcDir './spire/android/aidl'"));
    assert.ok(content.includes("jniLibs.srcDir './spire/android/jniLibs'"));
    assert.ok(content.includes("assets.srcDir './spire/android/assets'"));
    assert.ok(content.includes("manifest.srcFile './spire/android/AndroidManifest.xml'"));
  });

  it('preserves existing gradle content', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    const originalContent = `plugins {
    id 'com.android.library'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'ty.circulari.test'
    compileSdk 34
}
`;
    fs.writeFileSync(gradlePath, originalContent);

    ensureGradleBlock(gradlePath, 'NewBlock', `
// New content
`);

    const content = fs.readFileSync(gradlePath, 'utf-8');
    assert.ok(content.includes("namespace 'ty.circulari.test'"));
    assert.ok(content.includes('compileSdk 34'));
    assert.ok(content.includes('// spire-loom:NewBlock'));
  });

  it('handles multiple blocks in same file', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, '');

    ensureGradleBlock(gradlePath, 'Block1', '// Block 1 content');
    ensureGradleBlock(gradlePath, 'Block2', '// Block 2 content');

    const content = fs.readFileSync(gradlePath, 'utf-8');
    assert.ok(content.includes('// spire-loom:Block1'));
    assert.ok(content.includes('// Block 1 content'));
    assert.ok(content.includes('// spire-loom:Block2'));
    assert.ok(content.includes('// Block 2 content'));
    assert.ok(content.includes('// /spire-loom:Block1'));
    assert.ok(content.includes('// /spire-loom:Block2'));
  });

  it('creates file if not exists', () => {
    const gradlePath = path.join(TEST_DIR, 'new-build.gradle');

    ensureGradleBlock(gradlePath, 'TestBlock', '// Test content');

    assert.ok(fs.existsSync(gradlePath));
    const content = fs.readFileSync(gradlePath, 'utf-8');
    assert.ok(content.includes('// spire-loom:TestBlock'));
  });
});
