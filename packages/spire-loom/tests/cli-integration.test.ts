/**
 * CLI Integration Test
 *
 * Tests that spire-loom CLI actually runs without crashing.
 * This catches issues like missing exports, import errors, etc.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

describe('CLI Integration', () => {
  const cliPath = path.join(process.cwd(), 'bin', 'spire-loom.js');
  let tempDir: string;
  let originalCwd: string;

  before(() => {
    // Create a minimal test workspace
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spire-loom-test-'));

    // Create a minimal loom/WARP.ts
    const loomDir = path.join(tempDir, 'loom');
    fs.mkdirSync(loomDir, { recursive: true });
    fs.writeFileSync(
      path.join(loomDir, 'WARP.ts'),
      `
// Minimal test WARP
export default {
  name: 'test-project',
  spirals: []
};
`
    );

    // Create package.json
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-project',
          version: '1.0.0'
        },
        null,
        2
      )
    );

    originalCwd = process.cwd();
  });

  after(() => {
    // Cleanup
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should run spire-loom --help without crashing', async () => {
    const { exitCode, stderr } = await runCLI(['--help']);

    if (exitCode !== 0) {
      throw new Error(`CLI crashed with exit code ${exitCode}. stderr: ${stderr}`);
    }
  });

  it('should run spire-loom --version without crashing', async () => {
    const { exitCode, stderr } = await runCLI(['--version']);

    // --version should exit cleanly with code 0
    // and not crash with import errors
    if (exitCode !== 0) {
      throw new Error(`CLI --version failed with exit code ${exitCode}. stderr: ${stderr}`);
    }
  });

  it('should handle empty workspace without crashing', async () => {
    const { exitCode, stderr } = await runCLI([], tempDir);

    // Should either succeed or exit gracefully with a helpful message
    // Should NOT crash with stack trace
    if (
      stderr.includes('Error [ERR_') ||
      stderr.includes('SyntaxError') ||
      stderr.includes('TypeError')
    ) {
      throw new Error(`CLI crashed with error: ${stderr}`);
    }

    // Exit code should be 0 or a documented error code, not a crash
    assert.ok(
      exitCode === 0 || exitCode === 1,
      `CLI exited with unexpected code ${exitCode}. stderr: ${stderr}`
    );
  });

  /**
   * Run CLI with given arguments
   */
  function runCLI(
    args: string[],
    cwd: string = process.cwd()
  ): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const proc = spawn('node', [cliPath, ...args], {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        resolve({ exitCode, stdout, stderr });
      });

      proc.on('error', (error) => {
        resolve({ exitCode: -1, stdout, stderr: error.message });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        proc.kill();
        resolve({ exitCode: -2, stdout, stderr: 'Timeout' });
      }, 30000);
    });
  }
});

/**
 * Additional test: Verify the actual o19 workspace can be processed
 * This runs in the actual o19 directory
 */
describe.skip('CLI Integration - o19 Workspace', () => {
  const cliPath = path.join(process.cwd(), 'bin', 'spire-loom.js');
  const o19Path = path.join(process.cwd(), '..', '..');

  it('should not crash when loading o19 loom/WARP.ts', async () => {
    // Only run if o19 exists
    if (!fs.existsSync(path.join(o19Path, 'loom', 'WARP.ts'))) {
      console.log('  ⚠️  Skipping - o19 WARP.ts not found');
      return;
    }

    const { exitCode, stderr, stdout } = await runCLIInO19(['--help']);

    // --help should always work
    assert.strictEqual(exitCode, 0, `CLI --help failed. stderr: ${stderr}`);
    assert.ok(stdout.includes('spire-loom'), 'Help output should mention spire-loom');
  });

  it('should report meaningful error for missing exports instead of crashing', async () => {
    if (!fs.existsSync(path.join(o19Path, 'loom', 'WARP.ts'))) {
      console.log('  ⚠️  Skipping - o19 WARP.ts not found');
      return;
    }

    const { exitCode, stderr } = await runCLIInO19([], 5000);

    // Check for crash indicators
    const crashIndicators = [
      'Error [ERR_PACKAGE_PATH_NOT_EXPORTED]',
      'SyntaxError',
      'TypeError: Cannot',
      'ReferenceError'
    ];

    for (const indicator of crashIndicators) {
      if (stderr.includes(indicator)) {
        throw new Error(
          `CLI crashed with ${indicator}.\n\n` +
            `This usually means:\n` +
            `1. A package.json export is missing\n` +
            `2. An import path is incorrect\n` +
            `3. A module is not properly exposed\n\n` +
            `Full stderr:\n${stderr}`
        );
      }
    }

    // If we get here, the CLI either succeeded or failed gracefully
    assert.ok(exitCode === 0 || exitCode === 1, `CLI exited with unexpected code ${exitCode}`);
  });

  function runCLIInO19(
    args: string[],
    timeoutMs: number = 30000
  ): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const proc = spawn('node', [cliPath, ...args], {
        cwd: o19Path,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        resolve({ exitCode, stdout, stderr });
      });

      proc.on('error', (error) => {
        resolve({ exitCode: -1, stdout, stderr: error.message });
      });

      setTimeout(() => {
        proc.kill();
        resolve({ exitCode: -2, stdout, stderr: 'Timeout' });
      }, timeoutMs);
    });
  }
});
