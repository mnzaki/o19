/**
 * Tests for xml-block-manager.ts
 * 
 * Run with: npx tsx --test tests/xml-block-manager.test.ts
 */

import { describe, it, beforeEach, afterEach } from 'vitest';
import { expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureXmlBlock, clearXmlBlockRegistry } from '../machinery/sley/xml-block-manager.js';
import { cleanupAllBlocks, clearBlockRegistry, startGeneration } from '../machinery/sley/block-registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join('/tmp', `xml-test-${Date.now()}`);

describe('xml-block-manager', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    clearXmlBlockRegistry();
    clearBlockRegistry();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('adds blocks to empty manifest', () => {
    const manifestPath = path.join(TEST_DIR, 'test.xml');
    
    fs.writeFileSync(manifestPath, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application/>
</manifest>`);

    const result = ensureXmlBlock(manifestPath, {
      TestPermission: {
        content: '<uses-permission android:name="android.permission.TEST" />',
        parent: 'permissions',
        keyAttributes: ['android:name']
      }
    });

    expect(result.added).toEqual(['TestPermission']);
    expect(result.removed).toEqual([]);
    expect(result.updated).toEqual([]);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(content.includes('SPIRE-LOOM:XML:TESTPERMISSION')).toBe(true)
    expect(content.includes('android.permission.TEST')).toBe(true);
  });

  it('adds multiple blocks', () => {
    const manifestPath = path.join(TEST_DIR, 'test.xml');
    
    fs.writeFileSync(manifestPath, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application/>
</manifest>`);

    const result = ensureXmlBlock(manifestPath, {
      Perm1: {
        content: '<uses-permission android:name="android.permission.PERMISSION_1" />',
        parent: 'permissions'
      },
      Perm2: {
        content: '<uses-permission android:name="android.permission.PERMISSION_2" />',
        parent: 'permissions'
      },
      Service1: {
        content: '<service android:name=".Service1" />',
        parent: 'application'
      }
    });

    expect(result.added.length).toBe(3);
    expect(result.added.includes('Perm1')).toBe(true);
    expect(result.added.includes('Perm2')).toBe(true);
    expect(result.added.includes('Service1')).toBe(true);
  });

  it('is idempotent - no changes on second run', () => {
    const manifestPath = path.join(TEST_DIR, 'test.xml');
    
    fs.writeFileSync(manifestPath, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application/>
</manifest>`);

    ensureXmlBlock(manifestPath, {
      TestPermission: {
        content: '<uses-permission android:name="android.permission.TEST" />',
        parent: 'permissions',
        keyAttributes: ['android:name']
      }
    });

    clearXmlBlockRegistry();
    const result = ensureXmlBlock(manifestPath, {
      TestPermission: {
        content: '<uses-permission android:name="android.permission.TEST" />',
        parent: 'permissions',
        keyAttributes: ['android:name']
      }
    });

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.updated).toEqual([]);
  });

  it('updates content when changed', () => {
    const manifestPath = path.join(TEST_DIR, 'test.xml');
    
    fs.writeFileSync(manifestPath, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application/>
</manifest>`);

    ensureXmlBlock(manifestPath, {
      TestService: {
        content: '<service android:name=".TestService" android:exported="true" />',
        parent: 'application',
        keyAttributes: ['android:name']
      }
    });

    clearXmlBlockRegistry();
    const result = ensureXmlBlock(manifestPath, {
      TestService: {
        content: '<service android:name=".TestService" android:exported="false" />',
        parent: 'application',
        keyAttributes: ['android:name']
      }
    });

    expect(result.updated).toEqual(['TestService']);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(content.includes('android:exported="false"')).toBe(true);
  });

  it('respects manual override - does not add marked version', () => {
    const manifestPath = path.join(TEST_DIR, 'test.xml');
    
    fs.writeFileSync(manifestPath, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.BIND_JOB_SERVICE" />
    <application>
        <service android:name="ty.circulari.foundframe.RadicleService" android:exported="false" />
    </application>
</manifest>`);

    const result = ensureXmlBlock(manifestPath, {
      BindJobPermission: {
        content: '<uses-permission android:name="android.permission.BIND_JOB_SERVICE" />',
        parent: 'permissions',
        keyAttributes: ['android:name']
      },
      RadicleService: {
        content: '<service android:name="ty.circulari.foundframe.RadicleService" android:permission="android.permission.BIND_JOB_SERVICE" android:exported="true" />',
        parent: 'application',
        keyAttributes: ['android:name']
      }
    });

    expect(result.added).toEqual([]);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(!content.includes('SPIRE-LOOM:XML:BINDJOBPERMISSION')).toBe(true);
    expect(!content.includes('SPIRE-LOOM:XML:RADICLESERVICE')).toBe(true);
    expect(content.includes('android:exported="false"')).toBe(true);
  });

  it('removes blocks not in current call', () => {
    const manifestPath = path.join(TEST_DIR, 'test.xml');
    
    fs.writeFileSync(manifestPath, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- SPIRE-LOOM:XML:OLDPERMISSION -->
    <uses-permission android:name="android.permission.OLD" />
    <!-- /SPIRE-LOOM:XML:OLDPERMISSION -->
    <!-- SPIRE-LOOM:XML:KEEPPERMISSION -->
    <uses-permission android:name="android.permission.KEEP" />
    <!-- /SPIRE-LOOM:XML:KEEPPERMISSION -->
    <application/>
</manifest>`);

    // First generation run: register both blocks (use UPPERCASE to match marker format)
    startGeneration();
    ensureXmlBlock(manifestPath, {
      OLDPERMISSION: { content: '<uses-permission android:name="android.permission.OLD" />', parent: 'permissions' },
      KEEPPERMISSION: { content: '<uses-permission android:name="android.permission.KEEP" />', parent: 'permissions' }
    });

    // Second generation run: only KEEPPERMISSION (simulates config change)
    startGeneration();
    const result = ensureXmlBlock(manifestPath, {
      KEEPPERMISSION: { content: '<uses-permission android:name="android.permission.KEEP" />', parent: 'permissions' }
    });

    // Run global cleanup to remove orphaned blocks (OLDPERMISSION from previous gen)
    const cleanup = cleanupAllBlocks();
    
    // Cleanup result should show OLDPERMISSION was removed
    expect(cleanup.blocksRemoved > 0, 'Should have removed orphaned blocks').toBe(true);
    assert.ok(cleanup.details.some(d => d.removed.includes('OLDPERMISSION')), 'Should have removed OLDPERMISSION');
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(!content.includes('android.permission.OLD')).toBe(true);
    expect(content.includes('android.permission.KEEP')).toBe(true);
  });

  it('creates file if not exists', () => {
    const manifestPath = path.join(TEST_DIR, 'new-manifest.xml');
    
    const result = ensureXmlBlock(manifestPath, {
      TestPermission: {
        content: '<uses-permission android:name="android.permission.TEST" />',
        parent: 'permissions'
      }
    });

    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(result.added).toEqual(['TestPermission']);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(content.includes('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
    expect(content.includes('<manifest')).toBe(true);
  });

  it('handles multiple permissions with same tag', () => {
    const manifestPath = path.join(TEST_DIR, 'test.xml');
    
    fs.writeFileSync(manifestPath, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application/>
</manifest>`);

    const result = ensureXmlBlock(manifestPath, {
      Perm1: {
        content: '<uses-permission android:name="android.permission.PERM_1" />',
        parent: 'permissions',
        keyAttributes: ['android:name']
      },
      Perm2: {
        content: '<uses-permission android:name="android.permission.PERM_2" />',
        parent: 'permissions',
        keyAttributes: ['android:name']
      }
    });

    expect(result.added.length).toBe(2);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(content.includes('android.permission.PERM_1')).toBe(true);
    expect(content.includes('android.permission.PERM_2')).toBe(true);
  });

  it('handles self-closing application tag', () => {
    const manifestPath = path.join(TEST_DIR, 'test.xml');
    
    fs.writeFileSync(manifestPath, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application/>
</manifest>`);

    const result = ensureXmlBlock(manifestPath, {
      TestService: {
        content: '<service android:name=".TestService" />',
        parent: 'application'
      }
    });

    expect(result.added).toEqual(['TestService']);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(content.includes('<service')).toBe(true);
    expect(content.includes('</application>')).toBe(true);
  });

  it('custom key attributes work', () => {
    const manifestPath = path.join(TEST_DIR, 'test.xml');
    
    fs.writeFileSync(manifestPath, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application>
        <meta-data android:name="existing" android:value="old" />
    </application>
</manifest>`);

    const result = ensureXmlBlock(manifestPath, {
      MetaData: {
        content: '<meta-data android:name="existing" android:value="new" />',
        parent: 'application',
        keyAttributes: ['android:name']
      }
    });

    expect(result.added).toEqual([]);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(content.includes('android:value="old"')).toBe(true);
    expect(!content.includes('SPIRE-LOOM:XML:METADATA')).toBe(true);
  });
});
