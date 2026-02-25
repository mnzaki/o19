/**
 * Tests for xml-block-manager.ts
 * 
 * Run with: npx tsx --test tests/xml-block-manager.test.ts
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureXmlBlock, clearXmlBlockRegistry } from '../machinery/shuttle/xml-block-manager.js';
import { cleanupAllBlocks, clearBlockRegistry, startGeneration } from '../machinery/shuttle/block-registry.js';

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

    assert.deepStrictEqual(result.added, ['TestPermission']);
    assert.deepStrictEqual(result.removed, []);
    assert.deepStrictEqual(result.updated, []);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    assert.ok(content.includes('SPIRE-LOOM:XML:TESTPERMISSION'))
    assert.ok(content.includes('android.permission.TEST'));
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

    assert.strictEqual(result.added.length, 3);
    assert.ok(result.added.includes('Perm1'));
    assert.ok(result.added.includes('Perm2'));
    assert.ok(result.added.includes('Service1'));
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

    assert.deepStrictEqual(result.added, []);
    assert.deepStrictEqual(result.removed, []);
    assert.deepStrictEqual(result.updated, []);
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

    assert.deepStrictEqual(result.updated, ['TestService']);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    assert.ok(content.includes('android:exported="false"'));
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

    assert.deepStrictEqual(result.added, []);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    assert.ok(!content.includes('SPIRE-LOOM:XML:BINDJOBPERMISSION'));
    assert.ok(!content.includes('SPIRE-LOOM:XML:RADICLESERVICE'));
    assert.ok(content.includes('android:exported="false"'));
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
    assert.ok(cleanup.blocksRemoved > 0, 'Should have removed orphaned blocks');
    assert.ok(cleanup.details.some(d => d.removed.includes('OLDPERMISSION')), 'Should have removed OLDPERMISSION');
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    assert.ok(!content.includes('android.permission.OLD'));
    assert.ok(content.includes('android.permission.KEEP'));
  });

  it('creates file if not exists', () => {
    const manifestPath = path.join(TEST_DIR, 'new-manifest.xml');
    
    const result = ensureXmlBlock(manifestPath, {
      TestPermission: {
        content: '<uses-permission android:name="android.permission.TEST" />',
        parent: 'permissions'
      }
    });

    assert.ok(fs.existsSync(manifestPath));
    assert.deepStrictEqual(result.added, ['TestPermission']);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    assert.ok(content.includes('<?xml version="1.0" encoding="utf-8"?>'));
    assert.ok(content.includes('<manifest'));
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

    assert.strictEqual(result.added.length, 2);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    assert.ok(content.includes('android.permission.PERM_1'));
    assert.ok(content.includes('android.permission.PERM_2'));
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

    assert.deepStrictEqual(result.added, ['TestService']);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    assert.ok(content.includes('<service'));
    assert.ok(content.includes('</application>'));
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

    assert.deepStrictEqual(result.added, []);
    
    const content = fs.readFileSync(manifestPath, 'utf-8');
    assert.ok(content.includes('android:value="old"'));
    assert.ok(!content.includes('SPIRE-LOOM:XML:METADATA'));
  });
});
