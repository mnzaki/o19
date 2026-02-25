/**
 * Vite Config Hookup ⚡
 *
 * Hooks into Vite configuration files to:
 * - Add/modify build.rollupOptions.input for multi-entry
 * - Add environment variable defines
 * - Add plugins
 * - Modify server configuration
 *
 * > *"The Vite config bridges development and production."*
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GeneratorContext } from '../../heddles/index.js';
import type { ViteConfigHookup, HookupResult, HookupType } from './types.js';

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Apply Vite config hookup.
 *
 * Handles:
 * 1. Build configuration (rollupOptions.input)
 * 2. Define (environment variables)
 * 3. Plugins
 * 4. Server config
 * 5. Raw config lines
 */
export async function applyViteConfigHookup(
  filePath: string,
  hookup: ViteConfigHookup,
  context: GeneratorContext
): Promise<HookupResult> {
  const changes: string[] = [];
  
  // Ensure file exists
  if (!fs.existsSync(filePath)) {
    return {
      path: filePath,
      type: 'vite-config' as HookupType,
      status: 'error',
      message: `File not found: ${filePath}`,
    };
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // 1. Apply build configuration
  if (hookup.build) {
    const buildChanges = applyBuildConfig(content, hookup.build);
    if (buildChanges.modified) {
      content = buildChanges.content;
      changes.push('Updated build configuration');
    }
  }
  
  // 2. Apply define
  if (hookup.define && Object.keys(hookup.define).length > 0) {
    const defineChanges = applyDefine(content, hookup.define);
    if (defineChanges.modified) {
      content = defineChanges.content;
      changes.push(`Added ${Object.keys(hookup.define).length} defines`);
    }
  }
  
  // 3. Apply plugins
  if (hookup.plugins && hookup.plugins.length > 0) {
    const pluginChanges = applyPlugins(content, hookup.plugins);
    if (pluginChanges.modified) {
      content = pluginChanges.content;
      changes.push(`Added ${hookup.plugins.length} plugins`);
    }
  }
  
  // 4. Apply server configuration
  if (hookup.server) {
    const serverChanges = applyServerConfig(content, hookup.server);
    if (serverChanges.modified) {
      content = serverChanges.content;
      changes.push('Updated server configuration');
    }
  }
  
  // 5. Apply raw config lines
  if (hookup.configLines && hookup.configLines.length > 0) {
    for (const line of hookup.configLines) {
      if (!content.includes(line)) {
        content = content.trimEnd() + '\n' + line + '\n';
      }
    }
    changes.push(`Added ${hookup.configLines.length} config lines`);
  }
  
  // Write if modified
  const modified = content !== originalContent;
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  return {
    path: filePath,
    type: 'vite-config' as HookupType,
    status: modified ? 'applied' : 'skipped',
    message: modified 
      ? `Updated ${path.basename(filePath)}: ${changes.join('; ')}`
      : `No changes needed for ${path.basename(filePath)}`,
  };
}

// ============================================================================
// Build Configuration
// ============================================================================

function applyBuildConfig(
  content: string,
  build: { rollupOptions?: { input?: string | Record<string, string> } }
): { content: string; modified: boolean } {
  let modified = false;
  
  if (build.rollupOptions?.input) {
    const input = build.rollupOptions.input;
    
    // Check if build.rollupOptions.input already exists
    const inputRegex = /rollupOptions\s*:\s*\{[\s\S]*?input\s*:/;
    
    if (!inputRegex.test(content)) {
      // Need to add rollupOptions.input
      const inputConfig = formatRollupInput(input);
      
      // Check if build section exists
      const buildRegex = /build\s*:\s*\{/;
      if (buildRegex.test(content)) {
        // Add to existing build section
        content = content.replace(
          /(build\s*:\s*\{)/,
          `$1\n    rollupOptions: {\n      input: ${inputConfig}\n    },`
        );
      } else {
        // Add new build section before the closing of defineConfig
        const insertPoint = findConfigInsertPoint(content);
        if (insertPoint > 0) {
          content = content.slice(0, insertPoint) + 
            `  build: {\n    rollupOptions: {\n      input: ${inputConfig}\n    }\n  },\n` +
            content.slice(insertPoint);
        }
      }
      modified = true;
    }
  }
  
  return { content, modified };
}

function formatRollupInput(input: string | Record<string, string>): string {
  if (typeof input === 'string') {
    return `'${input}'`;
  }
  
  // Multi-entry object format
  const entries = Object.entries(input)
    .map(([key, value]) => `      ${key}: '${value}'`)
    .join(',\n');
  return `{\n${entries}\n    }`;
}

// ============================================================================
// Define (Environment Variables)
// ============================================================================

function applyDefine(
  content: string,
  define: Record<string, string>
): { content: string; modified: boolean } {
  let modified = false;
  
  // Check if define section exists
  const defineRegex = /define\s*:\s*\{/;
  
  if (defineRegex.test(content)) {
    // Add to existing define section
    for (const [key, value] of Object.entries(define)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const keyRegex = new RegExp(`['"]${escapedKey}['"]\\s*:`);
      
      if (!keyRegex.test(content)) {
        // Add the define entry
        content = content.replace(
          /(define\s*:\s*\{)/,
          `$1\n    '${key}': ${value},`
        );
        modified = true;
      }
    }
  } else {
    // Create new define section
    const defineEntries = Object.entries(define)
      .map(([key, value]) => `    '${key}': ${value}`)
      .join(',\n');
    
    const insertPoint = findConfigInsertPoint(content);
    if (insertPoint > 0) {
      content = content.slice(0, insertPoint) + 
        `  define: {\n${defineEntries}\n  },\n` +
        content.slice(insertPoint);
      modified = true;
    }
  }
  
  return { content, modified };
}

// ============================================================================
// Plugins
// ============================================================================

function applyPlugins(
  content: string,
  plugins: string[]
): { content: string; modified: boolean } {
  let modified = false;
  
  // Check if plugins array exists
  const pluginsRegex = /plugins\s*:\s*\[/;
  
  if (pluginsRegex.test(content)) {
    // Add to existing plugins array
    for (const plugin of plugins) {
      if (!content.includes(plugin)) {
        content = content.replace(
          /(plugins\s*:\s*\[)/,
          `$1\n    ${plugin},`
        );
        modified = true;
      }
    }
  } else {
    // Create new plugins array
    const pluginEntries = plugins.map(p => `    ${p}`).join(',\n');
    
    const insertPoint = findConfigInsertPoint(content);
    if (insertPoint > 0) {
      content = content.slice(0, insertPoint) + 
        `  plugins: [\n${pluginEntries}\n  ],\n` +
        content.slice(insertPoint);
      modified = true;
    }
  }
  
  return { content, modified };
}

// ============================================================================
// Server Configuration
// ============================================================================

function applyServerConfig(
  content: string,
  server: { port?: number; host?: string | boolean }
): { content: string; modified: boolean } {
  let modified = false;
  
  // Check if server section exists
  const serverRegex = /server\s*:\s*\{/;
  
  if (serverRegex.test(content)) {
    // Modify existing server section
    if (server.port !== undefined) {
      const portRegex = /port\s*:\s*\d+/;
      if (portRegex.test(content)) {
        content = content.replace(portRegex, `port: ${server.port}`);
      } else {
        content = content.replace(
          /(server\s*:\s*\{)/,
          `$1\n    port: ${server.port},`
        );
      }
      modified = true;
    }
    
    if (server.host !== undefined) {
      const hostValue = typeof server.host === 'boolean' ? server.host : `'${server.host}'`;
      const hostRegex = /host\s*:\s*(true|false|'[^']*')/;
      if (hostRegex.test(content)) {
        content = content.replace(hostRegex, `host: ${hostValue}`);
      } else {
        content = content.replace(
          /(server\s*:\s*\{)/,
          `$1\n    host: ${hostValue},`
        );
      }
      modified = true;
    }
  } else {
    // Create new server section
    const serverProps: string[] = [];
    if (server.port !== undefined) serverProps.push(`port: ${server.port}`);
    if (server.host !== undefined) {
      serverProps.push(`host: ${typeof server.host === 'boolean' ? server.host : `'${server.host}'`}`);
    }
    
    if (serverProps.length > 0) {
      const insertPoint = findConfigInsertPoint(content);
      if (insertPoint > 0) {
        content = content.slice(0, insertPoint) + 
          `  server: {\n    ${serverProps.join(',\n    ')}\n  },\n` +
          content.slice(insertPoint);
        modified = true;
      }
    }
  }
  
  return { content, modified };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find a good insertion point in the config object.
 * Looks for the start of the config object return.
 */
function findConfigInsertPoint(content: string): number {
  // Try to find export default defineConfig({
  const defineConfigMatch = content.match(/export\s+default\s+defineConfig\s*\(\s*\{/);
  if (defineConfigMatch && defineConfigMatch.index !== undefined) {
    return defineConfigMatch.index + defineConfigMatch[0].length;
  }
  
  // Try to find export default {
  const exportDefaultMatch = content.match(/export\s+default\s*\{/);
  if (exportDefaultMatch && exportDefaultMatch.index !== undefined) {
    return exportDefaultMatch.index + exportDefaultMatch[0].length;
  }
  
  // Try to find module.exports = {
  const moduleExportsMatch = content.match(/module\.exports\s*=\s*\{/);
  if (moduleExportsMatch && moduleExportsMatch.index !== undefined) {
    return moduleExportsMatch.index + moduleExportsMatch[0].length;
  }
  
  return -1;
}
