/**
 * Treadle Kit - Kit Implementation 🧰
 *
 * The main TreadleKit factory and implementation.
 *
 * Provides:
 * - Method collection and filtering
 * - CRUD classification pipeline
 * - Language enhancement with idiomatic views
 * - File generation with auto-enhancement
 */

import * as path from 'node:path';
import type { SpiralNode, GeneratorContext, WeavingPlan, MethodHelpers } from '../heddles/index.js';
import { ensurePlanComplete } from '../heddles/index.js';
import type { ManagementMetadata } from '../reed/index.js';
import { type EntityMetadata } from '../../warp/imprint.js';
import { filterByReach } from '../reed/index.js';
import type { MgmtMethod } from '../sley/index.js';
import type { RawMethod } from '../bobbin/index.js';
import type { GeneratedFile } from '../heddles/index.js';
import { generateCode } from '../bobbin/index.js';
import { hookup, type hookup as HookupTypes } from '../shuttle/index.js';
import type { MethodConfig, TreadleKit } from './types.js';
import { toRawMethod, buildContextMethods } from './context-methods.js';
import { buildContextEntities } from './context-entities.js';
import { createQueryAPI } from '../sley/query.js';
import { applyCrudPipeline } from '../sley/crud-pipeline.js';
import {
  enhanceMethods,
  enhanceEntities,
  isEnhanced,
  type EnhancedMethod,
  type LanguageView,
  type EnhancedEntity
} from '../reed/enhanced/index.js';
import { getLanguageExtensionKey, languages } from '../reed/language/index.js';
import { getScopeRegistry } from '../self-declarer.js';

/**
 * Create a treadle kit for building generators.
 *
 * The kit provides a unified interface for:
 * - Validating spiral node types
 * - Collecting and transforming methods
 * - CRUD classification
 * - Language enhancement with idiomatic views
 * - Building template data
 * - Generating files from templates
 * - Running hookups for external file configuration
 *
 * @param context - The generator context with plan, paths, etc.
 * @returns TreadleKit with all capabilities
 */
export function createTreadleKit(context: GeneratorContext): TreadleKit {
  // Store raw snapshots for incremental enhancement
  let rawMethodsSnapshot: RawMethod[] = [];
  let crudApplied = false;
  let enhancedLanguages: string[] = [];
  
  // Entity enhancement state
  let rawEntitiesSnapshot: Array<{ name: string; fields: any[] }> = [];
  let enhancedEntities: EnhancedEntity[] = [];

  // EAGER: Collect entities immediately when kit is created
  const allEntities: EntityMetadata[] = [];
  for (const mgmt of context.plan.managements) {
    if (mgmt.entities) {
      allEntities.push(...mgmt.entities);
    }
  }
  
  // Store raw entity snapshots for enhancement (convert to RawEntity format)
  rawEntitiesSnapshot = allEntities.map(e => ({
    name: e.name,
    fields: e.fields?.map(f => ({
      name: f.name,
      tsType: f.tsType,
      nullable: f.nullable,
      isPrimary: f.isPrimary,
      isCreatedAt: f.isCreatedAt,
      isUpdatedAt: f.isUpdatedAt,
      forInsert: f.forInsert,
      forUpdate: f.forUpdate
    })) || []
  }));
  
  context.entities = buildContextEntities(allEntities);

  const kit = {
    context,
    plan: context.plan,

    validateNodes(current, previous, expected): boolean {
      const currentType = current.typeName;
      const previousType = previous.typeName;

      if (currentType !== expected.current || previousType !== expected.previous) {
        if (process.env.DEBUG_MATRIX) {
          console.log(
            `[KIT] Skipping: ${currentType} → ${previousType} not ${expected.current} → ${expected.previous}`
          );
        }
        return false;
      }
      return true;
    },

    crud: {
      /**
       * Apply CRUD classification to methods.
       *
       * Derives crudName from tags like 'crud:create'.
       * Runs automatically before language enhancement if not already applied.
       */
      apply(): void {
        if (crudApplied) return;

        const current = context.methods?.all || [];
        const withCrud = applyCrudPipeline(current as RawMethod[]);
        context.methods = buildContextMethods(withCrud);
        crudApplied = true;
      },

      get isApplied(): boolean {
        return crudApplied;
      }
    },

    language: {
      /**
       * Enhance methods with specified languages.
       *
       * First language becomes the default for getters like `method.returnType`.
       * Can be called incrementally to add more languages.
       *
       * @param langs - Language identifiers (e.g., 'rust', 'typescript')
       */
      add(...langs: string[]): void {
        if (langs.length === 0) return;

        // Auto-apply CRUD before language enhancement
        if (!crudApplied) {
          kit.crud.apply();
        }

        const currentMethods = context.methods?.all || [];

        // Get current enhancement state
        const currentLangs = isEnhanced(currentMethods[0])
          ? (currentMethods[0] as EnhancedMethod)._languages || []
          : [];

        // Store raw on first call
        if (rawMethodsSnapshot.length === 0) {
          rawMethodsSnapshot = isEnhanced(currentMethods[0])
            ? (currentMethods[0] as EnhancedMethod)._raw || [...currentMethods]
            : [...currentMethods];
        }

        // Filter duplicates
        const newLangs = langs.filter((l) => !currentLangs.includes(getLanguageExtensionKey(l)));
        if (newLangs.length === 0 && currentLangs.length > 0) return;

        // All languages
        const allLangs = [...currentLangs, ...newLangs.map(getLanguageExtensionKey)];
        enhancedLanguages = allLangs;

        // Enhance from raw
        const enhanced = enhanceMethods(
          rawMethodsSnapshot,
          [...currentLangs.map((k) => {
            // Find language name from extension key
            const lang = languages.getAll().find((l) => getLanguageExtensionKey(l.name) === k);
            return lang?.name || k;
          }), ...langs],
          allLangs[0] // First is default
        );

        // Store metadata
        enhanced.forEach((m) => {
          Object.defineProperty(m, '_raw', {
            value: rawMethodsSnapshot,
            writable: false,
            enumerable: false
          });
        });

        // Update context
        context.methods = buildContextMethods(enhanced);
        
        // Also enhance entities with the same languages
        const langNames = [...currentLangs.map((k) => {
          const lang = languages.getAll().find((l) => getLanguageExtensionKey(l.name) === k);
          return lang?.name || k;
        }), ...langs];
        
        enhancedEntities = enhanceEntities(
          rawEntitiesSnapshot,
          langNames,
          allLangs[0] // First is default
        );
      },

      get isEnhanced(): boolean {
        const m = context.methods?.all;
        return m && m.length > 0 && isEnhanced(m[0]);
      },

      get languages(): string[] {
        return [...enhancedLanguages];
      }
    },

    collectMethods(config): RawMethod[] {
      ensurePlanComplete(context.plan, 'collect methods in kit');

      // Filter by reach
      const filtered = filterByReach(context.plan.managements, config.filter);

      // Convert to MgmtMethod format
      const mgmtMethods: MgmtMethod[] = [];

      for (const mgmt of filtered) {
        for (const method of mgmt.methods) {
          mgmtMethods.push({
            id: `${mgmt.name}.${method.name}`,
            managementName: mgmt.name,
            name: method.name,
            jsName: method.name,
            params: method.params.map((p) => ({
              name: p.name,
              tsType: p.type,
              optional: p.optional ?? false
            })),
            returnType: method.returnType,
            isCollection: method.operation === 'list' || method.name.startsWith('list'),
            tags: [`crud:${method.operation}`],
            crudOperation: method.operation
          });
        }
      }

      // Apply pipeline transformations (defaults to identity)
      let processedMethods = mgmtMethods;
      for (const transform of config.pipeline || []) {
        processedMethods = transform(processedMethods);
      }

      // Convert to RawMethod
      const rawMethods = processedMethods.map((m) => toRawMethod(m));

      // Store raw snapshot
      rawMethodsSnapshot = [...rawMethods];
      crudApplied = false;
      enhancedLanguages = [];

      // Build and attach method helpers to context (classic API)
      context.methods = buildContextMethods(rawMethods);

      // Build and attach query API (new chainable API)
      context.query = createQueryAPI(rawMethods);

      return rawMethods;
    },

    buildData(dataFn, current, previous): Record<string, unknown> {
      return dataFn(context, current, previous);
    },

    async generateFiles(outputs, data, _methods): Promise<GeneratedFile[]> {
      const files: GeneratedFile[] = [];

      for (const output of outputs) {
        // Check condition
        if (output.condition && !output.condition(context)) {
          continue;
        }

        // Resolve path template
        const outputPath = output.path.replace(/\{(\w+)\}/g, (match, key) => {
          if (key in data) {
            return String(data[key]);
          }
          return match;
        });

        // Detect language from template filename
        const detectedLang = detectLanguageFromTemplate(output.template);

        // Auto-enhance if needed for this output's language
        if (detectedLang && detectedLang !== 'unknown') {
          const langKey = getLanguageExtensionKey(detectedLang);
          if (!kit.language.isEnhanced) {
            kit.language.add(detectedLang);
          } else if (!enhancedLanguages.includes(langKey)) {
            kit.language.add(detectedLang);
          }
        }

        // Use enhanced methods from context
        const enhancedMethods = context.methods.all;

        // Merge per-output context with main data (context takes precedence)
        // Include enhanced entities for template access (entity.rs.fields, etc.)
        const mergedData = output.context
          ? { ...data, ...output.context, methods: enhancedMethods, entities: enhancedEntities }
          : { ...data, methods: enhancedMethods, entities: enhancedEntities };

        // Generate the file (workspace → package → builtin templates)
        const file = await generateCode({
          template: output.template,
          outputPath,
          data: mergedData,
          methods: enhancedMethods,
          workspaceRoot: context.workspaceRoot,
          packagePath: context.packagePath
        });

        files.push(file);
      }

      return files;
    },

    hookup: {
      async android(data): Promise<void> {
        const files: GeneratedFile[] = [];
        await hookup.executeAndroidHookup(context, files, data);
      },

      rustCrate(_packageDir: string, _moduleName: string): void {
        console.log('[KIT] Rust crate hookup not yet implemented. Use custom hookup.');
      },

      tauriPlugin(_options: { libRsPath: string; commands: string[] }): void {
        console.log('[KIT] Tauri plugin hookup not yet implemented. Use custom hookup.');
      }
    }
  };

  return kit;
}

/**
 * Detect language from template filename.
 *
 * @param template - Template filename (e.g., 'commands.rs.mejs')
 * @returns Language identifier or 'unknown'
 */
function detectLanguageFromTemplate(template: string): string | undefined {
  const basename = template.toLowerCase();

  // Check against registered language file extensions
  for (const lang of languages.getAll()) {
    if (!lang.codeGen?.fileExtensions) continue;
    for (const ext of lang.codeGen.fileExtensions) {
      if (basename.endsWith(ext.toLowerCase())) {
        return lang.name;
      }
    }
  }

  return undefined;
}

// Re-export enhancement types for treadle authors
export type { LanguageView, EnhancedMethod } from '../reed/enhanced/index.js';
