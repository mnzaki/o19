/**
 * Treadle Mocks
 *
 * Mock treadle implementations for testing.
 */

export interface MockFile {
  path: string;
  content: string;
}

export interface MockTreadleConfig {
  name: string;
  files?: MockFile[];
  modifiedFiles?: string[];
  shouldError?: boolean;
  errorMessage?: string;
  customGenerate?: (context: any) => Promise<any>;
}

/**
 * Create a mock custom treadle.
 */
export function createMockTreadle(config: MockTreadleConfig): any {
  return async (context: any): Promise<any> => {
    if (config.shouldError) {
      throw new Error(config.errorMessage || `Mock treadle ${config.name} failed`);
    }

    if (config.customGenerate) {
      return config.customGenerate(context);
    }

    const generatedFiles: string[] = [];
    
    // Write mock files
    for (const file of (config.files || [])) {
      await context.utils.writeFile(file.path, file.content);
      generatedFiles.push(file.path);
    }

    return {
      generatedFiles,
      modifiedFiles: config.modifiedFiles || [],
      errors: []
    };
  };
}

/**
 * Pre-built mock treadles.
 */
export const mockTreadles = {
  /**
   * Generate a Rust file.
   */
  rustFile: (name: string, content?: string) => createMockTreadle({
    name: `rust-${name}`,
    files: [{
      path: `src/${name.toLowerCase()}.rs`,
      content: content || `// Generated ${name}\npub struct ${name} {}`
    }]
  }),

  /**
   * Generate a TypeScript file.
   */
  typescriptFile: (name: string, content?: string) => createMockTreadle({
    name: `ts-${name}`,
    files: [{
      path: `${name.toLowerCase()}.ts`,
      content: content || `// Generated ${name}\nexport interface ${name} {}`
    }]
  }),

  /**
   * Modify an existing file.
   */
  fileModifier: (path: string, insertion: string) => createMockTreadle({
    name: 'file-modifier',
    customGenerate: async (context) => {
      await context.utils.updateFile(path, (content: string) => {
        return content + '\n' + insertion;
      });
      return {
        generatedFiles: [],
        modifiedFiles: [path],
        errors: []
      };
    }
  }),

  /**
   * A treadle that fails.
   */
  failing: (name: string, message?: string) => createMockTreadle({
    name,
    shouldError: true,
    errorMessage: message
  }),

  /**
   * Echo config to a file.
   */
  echoConfig: () => createMockTreadle({
    name: 'echo-config',
    customGenerate: async (context) => {
      const configJson = JSON.stringify(context.config, null, 2);
      await context.utils.writeFile('config.echo.json', configJson);
      return {
        generatedFiles: ['config.echo.json'],
        modifiedFiles: [],
        errors: []
      };
    }
  }),

  /**
   * DbBinding-style treadle that generates entity traits and commands.
   */
  dbBinding: (entities: string[], operations: string[]) => createMockTreadle({
    name: 'db-binding',
    customGenerate: async (context) => {
      const generatedFiles: string[] = [];
      
      for (const entity of entities) {
        // Entity trait
        await context.utils.writeFile(
          `src/db/entities/${entity.toLowerCase()}.gen.rs`,
          `// ${entity}Db trait\npub trait ${entity}Db {}`
        );
        generatedFiles.push(`src/db/entities/${entity.toLowerCase()}.gen.rs`);
        
        // Command enum
        await context.utils.writeFile(
          `src/db/commands/${entity.toLowerCase()}.gen.rs`,
          `// ${entity}Command enum\npub enum ${entity}Command {}`
        );
        generatedFiles.push(`src/db/commands/${entity.toLowerCase()}.gen.rs`);
      }
      
      // Mod.rs
      const modContent = entities.map(e => `pub mod ${e.toLowerCase()};`).join('\n');
      await context.utils.writeFile('src/db/mod.rs', modContent);
      generatedFiles.push('src/db/mod.rs');
      
      return {
        generatedFiles,
        modifiedFiles: [],
        errors: []
      };
    }
  })
};
