/**
 * Tests for gradle-manager.ts
 */

import { describe, it, beforeEach, afterEach } from 'vitest';
import { expect } from 'vitest';
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

    expect(result).toBe(true);
    
    const content = fs.readFileSync(gradlePath, 'utf-8');
    expect(content.includes('// SPIRE-LOOM:BLOCK:TESTBLOCK')).toBe(true);
    expect(content.includes('// /SPIRE-LOOM:BLOCK:TESTBLOCK')).toBe(true);
    expect(content.includes('compileSdk 34')).toBe(true);
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
    expect(content.includes('// SPIRE-LOOM:BLOCK:RUSTTASK')).toBe(true);
    expect(content.includes('tasks.register')).toBe(true);
  });

  it('is idempotent - no change on second run', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, '');

    ensureGradleBlock(gradlePath, 'TestBlock', 'content1');
    clearGradleBlockRegistry();
    const result = ensureGradleBlock(gradlePath, 'TestBlock', 'content1');

    expect(result).toBe(false);
  });

  it('updates block when content changes', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, '');

    ensureGradleBlock(gradlePath, 'TestBlock', 'version1');
    clearGradleBlockRegistry();
    const result = ensureGradleBlock(gradlePath, 'TestBlock', 'version2');

    expect(result).toBe(true);
    
    const content = fs.readFileSync(gradlePath, 'utf-8');
    expect(content.includes('version2')).toBe(true);
    expect(!content.includes('version1')).toBe(true);
  });

  it('removes block completely', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, `plugins {
}
// SPIRE-LOOM:BLOCK:TESTBLOCK
test {
}
// /SPIRE-LOOM:BLOCK:TESTBLOCK
android {
}
`);

    const result = ensureGradleBlockRemoved(gradlePath, 'TestBlock');

    expect(result).toBe(true);
    
    const content = fs.readFileSync(gradlePath, 'utf-8');
    expect(!content.includes('spire-loom:TestBlock')).toBe(true);
    expect(!content.includes('test {')).toBe(true);
    expect(content.includes('plugins {')).toBe(true);
    expect(content.includes('android {')).toBe(true);
  });

  it('creates source set configuration from scratch', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, '');

    const result = ensureGradleSourceSet(gradlePath, 'main', {
      java: ['./src/main/java'],
      aidl: ['./src/main/aidl'],
    });

    expect(result).toBe(true);
    
    const content = fs.readFileSync(gradlePath, 'utf-8');
    expect(content.includes('android {')).toBe(true);
    expect(content.includes('sourceSets {')).toBe(true);
    expect(content.includes('main {')).toBe(true);
    expect(content.includes("java.srcDir './src/main/java'")).toBe(true);
    expect(content.includes("aidl.srcDir './src/main/aidl'")).toBe(true);
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
    expect(content.includes("java.srcDir './spire/android/java'")).toBe(true);
    expect(content.includes("kotlin.srcDir './spire/android/kotlin'")).toBe(true);
    expect(content.includes("res.srcDir './spire/android/res'")).toBe(true);
    expect(content.includes("aidl.srcDir './spire/android/aidl'")).toBe(true);
    expect(content.includes("jniLibs.srcDir './spire/android/jniLibs'")).toBe(true);
    expect(content.includes("assets.srcDir './spire/android/assets'")).toBe(true);
    expect(content.includes("manifest.srcFile './spire/android/AndroidManifest.xml'")).toBe(true);
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
    expect(content.includes("namespace 'ty.circulari.test'")).toBe(true);
    expect(content.includes('compileSdk 34')).toBe(true);
    expect(content.includes('// SPIRE-LOOM:BLOCK:NEWBLOCK')).toBe(true);
  });

  it('handles multiple blocks in same file', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, '');

    ensureGradleBlock(gradlePath, 'Block1', '// Block 1 content');
    ensureGradleBlock(gradlePath, 'Block2', '// Block 2 content');

    const content = fs.readFileSync(gradlePath, 'utf-8');
    expect(content.includes('// SPIRE-LOOM:BLOCK:BLOCK1')).toBe(true);
    expect(content.includes('// Block 1 content')).toBe(true);
    expect(content.includes('// SPIRE-LOOM:BLOCK:BLOCK2')).toBe(true);
    expect(content.includes('// Block 2 content')).toBe(true);
    expect(content.includes('// /SPIRE-LOOM:BLOCK:BLOCK1')).toBe(true);
    expect(content.includes('// /SPIRE-LOOM:BLOCK:BLOCK2')).toBe(true);
  });

  it('creates file if not exists', () => {
    const gradlePath = path.join(TEST_DIR, 'new-build.gradle');

    ensureGradleBlock(gradlePath, 'TestBlock', '// Test content');

    expect(fs.existsSync(gradlePath)).toBe(true);
    const content = fs.readFileSync(gradlePath, 'utf-8');
    expect(content.includes('// SPIRE-LOOM:BLOCK:TESTBLOCK')).toBe(true);
  });
});
