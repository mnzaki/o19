/**
 * The Bobbin 🧵
 *
 * Thread storage, transformation rules, and code generation.
 *
 * The bobbin holds what becomes code:
 * - Templates (MEJS/EJS)
 * - Code printing and generation
 *
 * Note: Type mappings and Android/Gradle helpers have moved:
 * - Type mappings → enhancement system (use entity.rs.fields[i].type)
 * - Android helpers → shuttle/hookup-manager.ts
 * - Gradle blocks → shuttle/gradle-blocks.ts
 *
 * @module machinery/bobbin
 */

export * as mejs from './mejs.js';

/**
 * A generated file specification.
 */
export interface GeneratedFile {
  /** Output path */
  path: string;
  /** File content */
  content: string;
}

export interface Bobbin {
  /** The name of this Bobbin, which is used as directory to hold the weft
   * (generated files)
   **/
  name: string;
  weft: Array<{
    /** a file name */
    name: string;
    /** file sections */
    sections: Array<{
      /** a file section name */
      name: string;
      /** the section's template */
      template: string;
      /** a file section's content, which is a context object for the section
       * template
       */
      context: Record<string, unknown>;
    }>;
  }>;
}

import * as mejs from './mejs.js';

export function bobbinToGeneratedFiles(bobbin: Bobbin): GeneratedFile[] {
  return bobbin.weft.map((weft) => ({
    path: `${bobbin.name}/${weft.name}`,
    content: weft.sections
      .map((section) => mejs.renderFile({ templatePath: section.type, data: section.content }))
      .join('\n')
  }));
}
