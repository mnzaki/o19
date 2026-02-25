/**
 * Tests for Vite Config hookup handler
 *
 * Verifies APP-010: ViteConfigHookup requirements
 * - Multi-entry builds (rollupOptions.input)
 * - Define (environment variables)
 * - Plugins
 * - Server configuration
 */

import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { applyViteConfigHookup } from '../machinery/shuttle/hookups/vite-config.js';
import type { GeneratorContext } from '../machinery/heddles/index.js';
import type { ViteConfigHookup } from '../machinery/shuttle/hookups/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

async function createTempFile(content: string, filename = 'vite.config.ts'): Promise<string> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vite-test-'));
  const filePath = path.join(tmpDir, filename);
  await fs.promises.writeFile(filePath, content, 'utf-8');
  return filePath;
}

function createMockContext(): GeneratorContext {
  return {
    packageDir: '/tmp/test',
    spire: {},
    outputDir: '/tmp/test/out',
    config: { name: 'test', version: '1.0.0', id: 'test' },
    query: () => ({ items: [], first: () => undefined }),
  };
}

// ============================================================================
// Rollup Input (Multi-entry)
// ============================================================================

describe('vite-config: rollup input', () => {
  test('adds single entry input', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({
  plugins: []
});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      build: {
        rollupOptions: {
          input: './src/test-entry.ts'
        }
      }
    };

    const result = await applyViteConfigHookup(filePath, hookup, createMockContext());

    assert.strictEqual(result.status, 'applied');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('rollupOptions'));
    assert.ok(content.includes("input: './src/test-entry.ts'"));
  });

  test('adds multi-entry input', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      build: {
        rollupOptions: {
          input: {
            main: './src/main.ts',
            test: './src/test-entry.ts'
          }
        }
      }
    };

    await applyViteConfigHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('main:'));
    assert.ok(content.includes("'./src/main.ts'"));
    assert.ok(content.includes('test:'));
    assert.ok(content.includes("'./src/test-entry.ts'"));
  });

  test('circularity test harness config', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()]
});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      build: {
        rollupOptions: {
          input: process.env.CIRCULARITY_TEST 
            ? './src/test-entry.ts' 
            : './src/main.ts'
        }
      }
    };

    await applyViteConfigHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Should preserve existing plugins
    assert.ok(content.includes('sveltekit()'));
    // Should add rollupOptions
    assert.ok(content.includes('rollupOptions'));
  });
});

// ============================================================================
// Define (Environment Variables)
// ============================================================================

describe('vite-config: define', () => {
  test('adds define to existing config', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({
  plugins: []
});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      define: {
        'import.meta.env.CIRCULARITY_TEST': 'JSON.stringify(true)',
        'import.meta.env.API_URL': "JSON.stringify('http://localhost:3000')"
      }
    };

    const result = await applyViteConfigHookup(filePath, hookup, createMockContext());

    assert.strictEqual(result.status, 'applied');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('define:'));
    assert.ok(content.includes('import.meta.env.CIRCULARITY_TEST'));
    assert.ok(content.includes('JSON.stringify(true)'));
  });

  test('adds to existing define section', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'import.meta.env.EXISTING': 'true'
  }
});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      define: {
        'import.meta.env.NEW': 'JSON.stringify("value")'
      }
    };

    await applyViteConfigHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert.ok(content.includes('import.meta.env.EXISTING'));
    assert.ok(content.includes('import.meta.env.NEW'));
  });

  test('skips existing define', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'import.meta.env.EXISTING': 'JSON.stringify("value")'
  }
});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      define: {
        'import.meta.env.EXISTING': 'JSON.stringify("value")'
      }
    };

    const result = await applyViteConfigHookup(filePath, hookup, createMockContext());
    // May be skipped or applied depending on exact match
    const content = fs.readFileSync(filePath, 'utf-8');
    // Should not have duplicate entries
    const matches = content.match(/import\.meta\.env\.EXISTING/g);
    assert.strictEqual(matches?.length, 1);
  });
});

// ============================================================================
// Plugins
// ============================================================================

describe('vite-config: plugins', () => {
  test('adds plugins to existing array', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit()
  ]
});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      plugins: ['myCustomPlugin()']
    };

    await applyViteConfigHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert.ok(content.includes('sveltekit()'));
    assert.ok(content.includes('myCustomPlugin()'));
  });

  test('creates plugins array if not exists', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      plugins: ['testPlugin()']
    };

    await applyViteConfigHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('plugins:'));
    assert.ok(content.includes('testPlugin()'));
  });
});

// ============================================================================
// Server Configuration
// ============================================================================

describe('vite-config: server', () => {
  test('adds server port', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      server: { port: 3000 }
    };

    await applyViteConfigHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('server:'));
    assert.ok(content.includes('port: 3000'));
  });

  test('adds server host', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      server: { host: true }
    };

    await applyViteConfigHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('host: true'));
  });

  test('adds server host string', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      server: { host: '0.0.0.0' }
    };

    await applyViteConfigHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("host: '0.0.0.0'"));
  });

  test('updates existing server config', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8080
  }
});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      server: { port: 3000, host: true }
    };

    await applyViteConfigHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Should update port
    assert.ok(content.includes('port: 3000'));
    // Should add host
    assert.ok(content.includes('host: true'));
  });
});

// ============================================================================
// Full Integration
// ============================================================================

describe('vite-config: full integration', () => {
  test('circularity test harness full config', async () => {
    const filePath = await createTempFile(`import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()]
});
`);
    const hookup: ViteConfigHookup = {
      path: filePath,
      build: {
        rollupOptions: {
          input: process.env.CIRCULARITY_TEST 
            ? './src/test-entry.ts' 
            : './src/main.ts'
        }
      },
      define: {
        'import.meta.env.CIRCULARITY_TEST': 'JSON.stringify(process.env.CIRCULARITY_TEST)'
      }
    };

    const result = await applyViteConfigHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'applied');

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Original plugin preserved
    assert.ok(content.includes('sveltekit()'));
    // Build config added
    assert.ok(content.includes('rollupOptions'));
    // Define added
    assert.ok(content.includes('CIRCULARITY_TEST'));
  });

  test('handles vite.config.js', async () => {
    const filePath = await createTempFile(`export default {
  plugins: []
};
`, 'vite.config.js');
    const hookup: ViteConfigHookup = {
      path: filePath,
      server: { port: 4000 }
    };

    const result = await applyViteConfigHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'applied');

    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('port: 4000'));
  });
});

// ============================================================================
// Error Handling
// ============================================================================

describe('vite-config: error handling', () => {
  test('returns error for non-existent file', async () => {
    const hookup: ViteConfigHookup = {
      path: '/non/existent/vite.config.ts',
      server: { port: 3000 }
    };

    const result = await applyViteConfigHookup('/non/existent/vite.config.ts', hookup, createMockContext());

    assert.strictEqual(result.status, 'error');
    assert.ok(result.message?.includes('File not found'));
  });
});
