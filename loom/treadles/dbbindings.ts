/**
 * DbBindingTreadle - Custom treadle for generating DbActor bindings
 *
 * Generates SQLite entity traits and DbCommand variants for foundframe entities.
 * Used with @loom.tieup.intra() to generate inside the foundframe crate.
 *
 * Usage in WARP.ts:
 *   const foundframe = loom.spiral(loom.rustCore())
 *     .tieup.intra(dbBindingTreadle, {
 *       entities: ['Bookmark', 'Media', 'Post', 'Person'],
 *       operations: ['create', 'read', 'update', 'delete', 'list'],
 *     });
 */

import type { TreadleContext, TreadleResult } from '@o19/spire-loom';

/**
 * Configuration for DbBindingTreadle
 */
export interface DbBindingConfig {
  /** Entity names to generate bindings for */
  entities: string[];
  /** CRUD operations to support */
  operations: ('create' | 'read' | 'update' | 'delete' | 'list')[];
}

/**
 * Custom treadle definition for DbActor bindings
 *
 * This will be passed to @loom.tieup.intra() in WARP.ts
 */
/**
 * Generate DbActor bindings for the specified entities
 */
export const dbBindingTreadle = async (context: TreadleContext): Promise<TreadleResult> => {
    const { ring, config, utils } = context;
    const dbConfig = config as DbBindingConfig;
    
    const generatedFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const errors: string[] = [];
    
    // Ensure entities directory exists
    await utils.writeFile('src/db/entities/.gitkeep', '');
    
    // Generate for each entity
    for (const entity of dbConfig.entities) {
      try {
        // Generate entity trait file: src/db/entities/{entity}.gen.rs
        const entityTrait = generateEntityTrait(entity, dbConfig.operations);
        const entityPath = `src/db/entities/${entity.toLowerCase()}.gen.rs`;
        
        await utils.writeFile(entityPath, entityTrait);
        generatedFiles.push(entityPath);
        
        // Generate command variants: src/db/commands/{entity}.gen.rs
        const commands = generateDbCommands(entity, dbConfig.operations);
        const commandsPath = `src/db/commands/${entity.toLowerCase()}.gen.rs`;
        
        await utils.writeFile(commandsPath, commands);
        generatedFiles.push(commandsPath);
        
      } catch (e) {
        errors.push(`Failed to generate ${entity}: ${e}`);
      }
    }
    
    // Update db/mod.rs to include new modules (append mode)
    try {
      const modContent = generateDbMod(dbConfig.entities);
      const modPath = 'src/db/mod.rs';
      
      // Check if already has generated section
      const existing = await utils.readFile(modPath);
      if (existing && !existing.includes('// GENERATED DB MODULES')) {
        // Append generated section
        await utils.updateFile(modPath, (content) => content + '\n' + modContent);
        modifiedFiles.push(modPath);
      } else if (!existing) {
        // Create new mod.rs
        await utils.writeFile(modPath, modContent);
        generatedFiles.push(modPath);
      }
    } catch (e) {
      errors.push(`Failed to update db/mod.rs: ${e}`);
    }
    
    return {
      generatedFiles,
      modifiedFiles,
      errors: errors.length > 0 ? errors : undefined,
    };
};

/**
 * Generate the entity Db trait (e.g., BookmarkDb)
 */
function generateEntityTrait(
  entity: string,
  operations: string[]
): string {
  const methods: string[] = [];
  
  if (operations.includes('create')) {
    methods.push(`
  /// Insert a new ${entity.toLowerCase()}
  async fn insert_${entity.toLowerCase()}(
    &self,
    url: &str,
    title: Option<&str>,
    notes: Option<&str>,
    content_hash: Option<&str>,
  ) -> Result<i64>;`);
  }
  
  if (operations.includes('read')) {
    methods.push(`
  /// Get ${entity.toLowerCase()} by ID
  async fn get_${entity.toLowerCase()}_by_id(&self, id: i64) -> Result<Option<${entity}>>;
  
  /// Get ${entity.toLowerCase()} by unique field (e.g., URL for bookmarks)
  async fn get_${entity.toLowerCase()}_by_url(&self, url: &str) -> Result<Option<${entity}>>;`);
  }
  
  if (operations.includes('list')) {
    methods.push(`
  /// List all ${entity.toLowerCase()}s with pagination
  async fn list_${entity.toLowerCase()}s(
    &self,
    limit: Option<usize>,
    offset: Option<usize>,
  ) -> Result<Vec<${entity}>>;`);
  }
  
  if (operations.includes('update')) {
    methods.push(`
  /// Update ${entity.toLowerCase()} fields
  async fn update_${entity.toLowerCase()}(
    &self,
    id: i64,
    title: Option<&str>,
    notes: Option<&str>,
  ) -> Result<bool>;`);
  }
  
  if (operations.includes('delete')) {
    methods.push(`
  /// Delete ${entity.toLowerCase()} by ID
  async fn delete_${entity.toLowerCase()}(&self, id: i64) -> Result<bool>;
  
  /// Delete ${entity.toLowerCase()} by unique field
  async fn delete_${entity.toLowerCase()}_by_url(&self, url: &str) -> Result<bool>;`);
  }
  
  const traitMethods = methods.join('\n');
  const implMethods = methods.map(m => `${m} {
    // Implementation sends DbCommand to actor
    todo!("Generated implementation")
  }`).join('\n');
  
  return `// GENERATED BY DBBINDING TREADLE - Do not edit

use async_trait::async_trait;
use crate::db::{DbHandle, Result};
use crate::${entity.toLowerCase()}::${entity};

/// Database operations for ${entity}
#[async_trait]
pub trait ${entity}Db {
${traitMethods}
}

/// Implementation via DbActor
#[async_trait]
impl ${entity}Db for DbHandle {
${implMethods}
}
`;
}

/**
 * Generate DbCommand variants for the entity
 */
function generateDbCommands(
  entity: string,
  operations: string[]
): string {
  const variants: string[] = [];
  
  if (operations.includes('create')) {
    variants.push(`  Insert${entity} {
    url: String,
    title: Option<String>,
    notes: Option<String>,
    content_hash: Option<String>,
    respond: oneshot::Sender<Result<i64>>,
  },`);
  }
  
  if (operations.includes('read')) {
    variants.push(`  Get${entity}ById {
    id: i64,
    respond: oneshot::Sender<Result<Option<${entity}>>>,
  },
  Get${entity}ByUrl {
    url: String,
    respond: oneshot::Sender<Result<Option<${entity}>>>,
  },`);
  }
  
  if (operations.includes('list')) {
    variants.push(`  List${entity}s {
    limit: Option<usize>,
    offset: Option<usize>,
    respond: oneshot::Sender<Result<Vec<${entity}>>>,
  },`);
  }
  
  if (operations.includes('update')) {
    variants.push(`  Update${entity} {
    id: i64,
    title: Option<String>,
    notes: Option<String>,
    respond: oneshot::Sender<Result<bool>>,
  },`);
  }
  
  if (operations.includes('delete')) {
    variants.push(`  Delete${entity} {
    id: i64,
    respond: oneshot::Sender<Result<bool>>,
  },
  Delete${entity}ByUrl {
    url: String,
    respond: oneshot::Sender<Result<bool>>,
  },`);
  }
  
  return `// GENERATED BY DBBINDING TREADLE - Do not edit

use crate::db::Result;
use crate::${entity.toLowerCase()}::${entity};
use crossbeam_channel::Sender as OneshotSender;

/// DbCommand variants for ${entity} operations
#[derive(Debug)]
pub enum ${entity}Command {
${variants.join('\n')}
}

// Re-export as part of DbCommand enum
// impl DbActor {
//   fn handle_${entity.toLowerCase()}_command(&self, cmd: ${entity}Command) { ... }
// }
`;
}

/**
 * Generate update to db/mod.rs
 */
function generateDbMod(entities: string[]): string {
  const modules = entities.map(e => 
    `pub mod ${e.toLowerCase()};`
  ).join('\n');
  
  const exports = entities.map(e => 
    `pub use ${e.toLowerCase()}::${e}Db;`
  ).join('\n');
  
  return `// GENERATED DB MODULES - Added by dbbinding treadle
${modules}

${exports}
`;
}

// Type export for use in WARP.ts
export type { DbBindingConfig };

// The dbBindingTreadle is already exported as const above
