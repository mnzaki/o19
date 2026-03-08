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

import type { GeneratedFile } from '../bobbin/index.js';
import type { TreadleKit } from './types.js';
import { getLanguageExtensionKey, languages } from '../reed/language/index.js';
import { generateCode } from '../shuttle/code-printer.js';
import type { GeneratorContext } from '../../weaver/plan-builder.js';
import type { EntityMetadata } from '../../warp/metadata.js';
import { hookup } from '../sley/index.js';

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
  let crudApplied = false;
  let enhancedLanguages: string[] = [];

  // Entity enhancement state
  let rawEntitiesSnapshot: Array<{ name: string; fields: any[] }> = [];

  // EAGER: Collect entities immediately when kit is created
  const allEntities: EntityMetadata[] = [];
  for (const mgmt of context.plan.managements) {
    if (mgmt.entities) {
      allEntities.push(...mgmt.entities);
    }
  }

  // Store raw entity snapshots for enhancement (convert to RawEntity format)
  rawEntitiesSnapshot = allEntities.map((e) => ({
    name: e.name,
    fields:
      e.fields?.map((f) => ({
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

  //context.entities = buildContextEntities(allEntities);

  const kit: TreadleKit = {
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

    language: {
      /**
       * Enhance methods with specified languages.
       *
       * First language becomes the default (item.lang),
       * additional languages accessible as item.rs, item.ts, etc.
       *
       * @param langs - Language identifiers (e.g., 'rust', 'typescript')
       */
      add(...langs: string[]): void {
        if (langs.length === 0) return;

        for (const langName of langs) {
          const lang = languages.get(langName);
          if (!lang) {
            console.warn(`[KIT] Unknown language: ${langName}`);
            continue;
          }

          // Add language to the BoundQuery
          context.shed.methods.addLang(lang);

          // Track enhanced languages
          const langKey = getLanguageExtensionKey(langName);
          if (!enhancedLanguages.includes(langKey)) {
            enhancedLanguages.push(langKey);
          }
        }
      },

      get isEnhanced(): boolean {
        return enhancedLanguages.length > 0;
      },

      get languages(): string[] {
        return [...enhancedLanguages];
      }
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
          if (!kit.language.isEnhanced || !enhancedLanguages.includes(langKey)) {
            kit.language.add(detectedLang);
          }
        }

        // Merge per-output context with main data (context takes precedence)
        // Include enhanced entities for template access (entity.rs.fields, etc.)
        const mergedData = output.context
          ? { ...data, ...output.context, entities: [] } // TODO
          : { ...data, entities: [] }; // TODO

        // Generate the file (workspace → package → builtin templates)
        const file = await generateCode({
          template: output.template,
          outputPath,
          data: mergedData,
          shed: context.shed,
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
    if (!lang.extensions) continue;
    for (const ext of lang.extensions) {
      if (basename.endsWith(ext.toLowerCase())) {
        return lang.name;
      }
    }
  }

  return undefined;
}
