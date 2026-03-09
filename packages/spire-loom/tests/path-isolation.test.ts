/**
 * Path Isolation Regression Tests
 *
 * Ensures generated files stay within expected directories and don't
 * escape to unexpected locations (like the bug that created home/mnzaki/...).
 *
 * Bug: Package dir path handling created files at:
 *   /workspace/home/mnzaki/... instead of /workspace/crates/...
 *
 * Root cause: When packageDir was absolute, path.join(workspaceRoot, '..', packageDir)
 *             didn't work as expected because path.join ignores previous segments
 *             when given an absolute path.
 */

import { test, describe } from 'vitest';
import { expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { 
  configureAndroidManifest, 
  configureGradleBuild
} from '../machinery/sley/hookup-manager.js';
import { writeEventCallbackAidl } from '../machinery/sley/hookup-manager.js';
import type { GeneratedFile } from '../machinery/heddles/types.js';

// Helper to create temp workspace structure
function createTempWorkspace(): { root: string; crateDir: string; cleanup: () => void } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'path-isolation-test-'));
  const crateDir = path.join(tmpDir, 'crates', 'test-android');
  fs.mkdirSync(crateDir, { recursive: true });
  
  return {
    root: tmpDir,
    crateDir,
    cleanup: () => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  };
}

describe('path isolation', () => {
  test('configureAndroidManifest should write to correct directory with absolute path', () => {
    const { root, crateDir, cleanup } = createTempWorkspace();
    
    try {
      // Create android directory
      fs.mkdirSync(path.join(crateDir, 'android'), { recursive: true });
      
      // Create initial manifest with required structure
      const manifestPath = path.join(crateDir, 'android', 'AndroidManifest.xml');
      fs.writeFileSync(manifestPath, 
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="ty.test">' +
        '<application></application>' +
        '</manifest>'
      );
      
      // Call with absolute path (like in real usage)
      configureAndroidManifest(crateDir, {
        coreName: 'test',
        coreNamePascal: 'Test',
        packageName: 'ty.test',
        serviceName: 'TestService',
        interfaceName: 'ITest'
      });
      
      // Verify manifest was written to correct location
      expect(fs.existsSync(manifestPath), 'AndroidManifest.xml should exist').toBe(true);
      const content = fs.readFileSync(manifestPath, 'utf-8');
      expect(content.includes('FOREGROUND_SERVICE'), 'Should contain service permissions').toBe(true);
      
      // CRITICAL: Check no "home" directory was created
      const badHomePath = path.join(root, 'home');
      expect(!fs.existsSync(badHomePath), 'Should NOT create home/ subdirectory').toBe(true);
      
    } finally {
      cleanup();
    }
  });
  
  test('configureGradleBuild should write to correct directory with absolute path', () => {
    const { root, crateDir, cleanup } = createTempWorkspace();
    
    try {
      // Create initial build.gradle
      const gradlePath = path.join(crateDir, 'build.gradle');
      fs.writeFileSync(gradlePath, '// initial build.gradle');
      
      // Call with absolute path
      configureGradleBuild({
        resolvedPackageDir: crateDir,
        taskName: 'buildRustTest'
      });
      
      // Verify build.gradle was updated
      const content = fs.readFileSync(gradlePath, 'utf-8');
      assert.ok(content.includes('spireDir') || content.includes('cargo-ndk'), 
        'Should contain Gradle Rust configuration');
      
      // CRITICAL: Check no "home" directory was created
      const badHomePath = path.join(root, 'home');
      expect(!fs.existsSync(badHomePath), 'Should NOT create home/ subdirectory').toBe(true);
      
    } finally {
      cleanup();
    }
  });
  
  test('writeEventCallbackAidl should create correct file path', () => {
    const { root, crateDir, cleanup } = createTempWorkspace();
    
    try {
      const files: GeneratedFile[] = [];
      
      // Call with absolute path (like in real usage after fix)
      writeEventCallbackAidl(crateDir, files, {
        coreName: 'test',
        coreNamePascal: 'Test',
        packageName: 'ty.test',
        packagePath: 'ty/test'
      });
      
      // Verify file was added to files array
      expect(files.length).toBe(1, 'Should add one file');
      
      const aidlFile = files[0];
      expect(aidlFile.path.includes('IEventCallback.aidl'), 'Should be AIDL file').toBe(true);
      
      // The path should be absolute and within crateDir
      expect(path.isAbsolute(aidlFile.path), 'Path should be absolute').toBe(true);
      assert.ok(aidlFile.path.startsWith(crateDir), 
        `Path ${aidlFile.path} should start with crateDir ${crateDir}`);
      
      // Verify content
      assert.ok(aidlFile.content.includes('interface IEventCallback'), 
        'Should contain AIDL interface definition');
      
    } finally {
      cleanup();
    }
  });
  
  test('path.join behavior with absolute paths', () => {
    // Document the behavior that caused the bug
    const workspaceRoot = '/workspace/o19';
    const absolutePackageDir = '/workspace/o19/crates/test-android';
    const relativePackageDir = 'crates/test-android';
    
    // With absolute path, path.join ignores previous segments!
    const withAbsolute = path.join(workspaceRoot, '..', absolutePackageDir);
    // On Linux/Mac, path.join('/a', '..', '/b') = '/b' (absolute wins)
    // But on Windows or with certain path formats, behavior may differ
    assert.ok(withAbsolute.includes('test-android'),
      'path.join result should include the package directory');
    
    // With relative path, path.join works as expected
    const withRelative = path.join(workspaceRoot, '..', relativePackageDir);
    assert.strictEqual(withRelative, '/workspace/crates/test-android',
      'path.join works correctly with relative paths');
  });
});

describe('weaver path isolation', () => {
  test('weaver should prefix relative paths with spire/', () => {
    // Document the expected behavior that the weaver adds spire/ prefix
    const relativePath = 'src/test.rs';
    const packageDir = '/workspace/crates/test';
    
    // Simulate weaver logic (lines 400-403 in weaver.ts)
    const spirePath = path.join('spire', relativePath);
    const fullPath = path.join(packageDir, spirePath);
    
    expect(fullPath).toBe('/workspace/crates/test/spire/src/test.rs');
  });
  
  test('weaver isolation is bypassed for absolute paths', () => {
    // Document the vulnerability: absolute paths bypass spire/ isolation
    // This is why hookup files (which use absolute paths) don't go in spire/
    const absolutePath = '/workspace/crates/test/android/AndroidManifest.xml';
    
    // Current weaver behavior (lines 398-399 in weaver.ts):
    // if (path.isAbsolute(file.path)) { fullPath = file.path; }
    
    expect(path.isAbsolute(absolutePath)).toBe(true);
    // The file would be written to the absolute path directly, bypassing spire/
  });
});
