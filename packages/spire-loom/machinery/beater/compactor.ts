/**
 * The Compactor — Pattern Abstraction
 * 
 * "Generate code that generates code."
 * 
 * The Compactor abstracts the staged metaprogramming pattern:
 *   Input → Generate Midstage → Compile → Run → Output
 * 
 * This is the loom's self-referential capability — using the loom
 * to weave a smaller, temporary loom that weaves a specific piece.
 * 
 * Examples:
 *   - ORM precompilation (schema → SQL + deserializers)
 *   - Validation codegen (types → validators)
 *   - API client codegen (schema → HTTP clients)
 * 
 * The pattern: Use a full compiler (Rust, Go, etc.) as the midstage
 * to validate and generate code that would be tedious/error-prone
 * to generate directly.
 */

import * as fs from 'node:fs/promises';
import { spawn } from 'node:child_process';

export interface CompactorConfig {
  /** Where to generate the midstage */
  midstagePath: string;
  
  /** Where to output the final generated files */
  outputPath: string;
  
  /** Whether to keep midstage after completion (for debugging) */
  keepMidstage?: boolean;
}

export interface CompactorResult {
  success: boolean;
  generatedFiles: string[];
  errors: string[];
}

/**
 * Abstract Compactor — the staged metaprogramming pattern.
 * 
 * Implement this to create a specific compactor:
 * - `generate()` — write midstage source
 * - `compile()` — return compile command
 * - `run()` — return run command  
 * - `parse()` — extract output from stdout
 */
export abstract class Compactor {
  protected config: CompactorConfig;
  
  constructor(config: CompactorConfig) {
    this.config = config;
  }
  
  /**
   * Execute the full compaction cycle.
   * 
   * 🔧 On error: crinkles the cranks. The loom shuts down.
   */
  async compact(): Promise<CompactorResult> {
    const result: CompactorResult = {
      success: false,
      generatedFiles: [],
      errors: [],
    };
    
    try {
      // Stage 1: Generate midstage
      await this.generate();
      
      // Stage 2: Compile
      await this.doCompile();
      
      // Stage 3: Run
      const output = await this.doRun();
      
      // Stage 4: Parse
      result.generatedFiles = this.parse(output);
      
      // Stage 5: Verify
      await this.verify(result.generatedFiles);
      
      // Stage 6: Cleanup
      if (!this.config.keepMidstage) {
        await this.cleanup();
      }
      
      result.success = true;
      
    } catch (error) {
      result.errors.push((error as Error).message);
      throw new Error(
        `🔧 CRINKLE! Compaction failed:\n${(error as Error).message}`
      );
    }
    
    return result;
  }
  
  // ===== Abstract Methods =====
  
  /** Generate midstage source code to `this.config.midstagePath` */
  protected abstract generate(): Promise<void>;
  
  /** Return compile command */
  protected abstract compile(): { command: string; args: string[]; cwd?: string };
  
  /** Return run command */
  protected abstract run(): { 
    command: string; 
    args: string[]; 
    cwd?: string;
    env?: Record<string, string>;
  };
  
  /** Parse stdout to extract generated file paths */
  protected abstract parse(stdout: string): string[];
  
  /** Verify generated output (optional, can noop) */
  protected abstract verify(files: string[]): Promise<void>;
  
  // ===== Concrete Implementation =====
  
  private async doCompile(): Promise<void> {
    const { command, args, cwd } = this.compile();
    
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: cwd || this.config.midstagePath,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '', stderr = '';
      child.stdout?.on('data', (d) => stdout += d);
      child.stderr?.on('data', (d) => stderr += d);
      
      child.on('close', (code) => {
        code === 0 ? resolve() : reject(new Error(`${stderr}\n${stdout}`));
      });
      
      child.on('error', (err) => reject(err));
    });
  }
  
  private async doRun(): Promise<string> {
    const { command, args, cwd, env } = this.run();
    
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: cwd || this.config.midstagePath,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...env }
      });
      
      let stdout = '', stderr = '';
      child.stdout?.on('data', (d) => stdout += d);
      child.stderr?.on('data', (d) => stderr += d);
      
      child.on('close', (code) => {
        code === 0 ? resolve(stdout) : reject(new Error(`${stderr}\n${stdout}`));
      });
      
      child.on('error', (err) => reject(err));
    });
  }
  
  private async cleanup(): Promise<void> {
    try {
      await fs.rm(this.config.midstagePath, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

/**
 * Define a compactor declaratively.
 */
export interface CompactorSpec {
  generate: (midstagePath: string, outputPath: string) => Promise<void>;
  compile: (midstagePath: string) => { command: string; args: string[]; cwd?: string };
  run: (midstagePath: string, outputPath: string) => { command: string; args: string[]; env?: Record<string, string> };
  parse: (stdout: string) => string[];
  verify?: (files: string[]) => Promise<void>;
}

export function defineCompactor(spec: CompactorSpec): new (config: CompactorConfig) => Compactor {
  return class extends Compactor {
    protected generate() { return spec.generate(this.config.midstagePath, this.config.outputPath); }
    protected compile() { return spec.compile(this.config.midstagePath); }
    protected run() { return spec.run(this.config.midstagePath, this.config.outputPath); }
    protected parse(stdout: string) { return spec.parse(stdout); }
    protected verify(files: string[]) { return spec.verify?.(files) || Promise.resolve(); }
  };
}
