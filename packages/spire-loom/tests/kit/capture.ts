/**
 * Output Capture Utilities
 *
 * Capture console output, errors, and other side effects during testing.
 */

/**
 * Captured output from a test run.
 */
export interface CapturedOutput {
  /** Console.log output */
  logs: string[];
  /** Console.error output */
  errors: string[];
  /** Console.warn output */
  warnings: string[];
  /** All output combined */
  all: string[];
  /** Get output as single string */
  toString(): string;
  /** Check if output contains pattern */
  contains(pattern: string | RegExp): boolean;
}

/**
 * Capture all console output during a function execution.
 *
 * @example
 * ```typescript
 * const output = await captureOutput(async () => {
 *   console.log('Generating...');
 *   await weave(warp, config);
 *   console.log('Done!');
 * });
 *
 * assert(output.contains('Generating...'));
 * assert(output.contains('Done!'));
 * ```
 */
export async function captureOutput<T>(
  fn: () => Promise<T> | T
): Promise<T & { output: CapturedOutput }> {
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Store original console methods
  const original = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };

  // Mock console methods
  console.log = (...args: any[]) => {
    const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    logs.push(message);
    original.log.apply(console, args);
  };

  console.error = (...args: any[]) => {
    const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    errors.push(message);
    original.error.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    warnings.push(message);
    original.warn.apply(console, args);
  };

  try {
    const result = await fn();
    
    const output: CapturedOutput = {
      logs,
      errors,
      warnings,
      all: [...logs, ...errors, ...warnings],
      toString() {
        return [...logs, ...errors, ...warnings].join('\n');
      },
      contains(pattern: string | RegExp): boolean {
        const allText = this.toString();
        if (typeof pattern === 'string') {
          return allText.includes(pattern);
        }
        return pattern.test(allText);
      },
    };

    return { ...result, output } as T & { output: CapturedOutput };
  } finally {
    // Restore original console methods
    console.log = original.log;
    console.error = original.error;
    console.warn = original.warn;
  }
}

/**
 * Capture only log output (not errors/warnings).
 */
export async function captureLogs<T>(
  fn: () => Promise<T> | T
): Promise<T & { logs: string[] }> {
  const logs: string[] = [];
  const originalLog = console.log;

  console.log = (...args: any[]) => {
    const message = args.map(a => String(a)).join(' ');
    logs.push(message);
    originalLog.apply(console, args);
  };

  try {
    const result = await fn();
    return { ...result, logs } as T & { logs: string[] };
  } finally {
    console.log = originalLog;
  }
}
