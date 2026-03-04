/**
 * Tests for Vite Config hookup handler
 *
 * Verifies APP-010: ViteConfigHookup requirements
 * - Multi-entry builds (rollupOptions.input)
 * - Define (environment variables)
 * - Plugins
 * - Server configuration
 */

import { test, describe } from 'vitest';
import { expect } from 'vitest';
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

    expect(result.status).toBe('applied');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content.includes('rollupOptions')).toBe(true);
    expect(content.includes("input: './src/test-entry.ts'")).toBe(true);
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
    expect(content.includes('main:')).toBe(true);
    expect(content.includes("'./src/main.ts'")).toBe(true);
    expect(content.includes('test:')).toBe(true);
    expect(content.includes("'./src/test-entry.ts'")).toBe(true);
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
    expect(content.includes('rollupOptions')).toBe(true);
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

    expect(result.status).toBe('applied');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content.includes('define:')).toBe(true);
    expect(content.includes('import.meta.env.CIRCULARITY_TEST')).toBe(true);
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
    
    expect(content.includes('import.meta.env.EXISTING')).toBe(true);
    expect(content.includes('import.meta.env.NEW')).toBe(true);
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
    expect(matches?.length).toBe(1);
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
    expect(content.includes('plugins:')).toBe(true);
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
    expect(content.includes('server:')).toBe(true);
    expect(content.includes('port: 3000')).toBe(true);
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
    expect(content.includes('host: true')).toBe(true);
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
    expect(content.includes("host: '0.0.0.0'")).toBe(true);
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
    expect(content.includes('port: 3000')).toBe(true);
    // Should add host
    expect(content.includes('host: true')).toBe(true);
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
    expect(result.status).toBe('applied');

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Original plugin preserved
    assert.ok(content.includes('sveltekit()'));
    // Build config added
    expect(content.includes('rollupOptions')).toBe(true);
    // Define added
    expect(content.includes('CIRCULARITY_TEST')).toBe(true);
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
    expect(result.status).toBe('applied');

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content.includes('port: 4000')).toBe(true);
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

    expect(result.status).toBe('error');
    expect(result.message?.includes('File not found')).toBe(true);
  });
});
