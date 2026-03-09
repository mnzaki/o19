/**
 * AIDL Language Definition 🌾
 *
 * Android Interface Definition Language support.
 * Used for generating .aidl files for Android inter-process communication.
 *
 * AIDL supports:
 * - Primitives: int, long, boolean, float, double, byte, char
 * - String and CharSequence
 * - Arrays: byte[], String[], etc.
 * - Parcelables: custom data types
 * - Interfaces: for callbacks
 */

import { declareLanguage, LanguageType } from '../machinery/reed/language/index.js';

// ============================================================================
// Language Definition
// ============================================================================

/**
 * AIDL language definition.
 *
 * Uses the modern declarative architecture:
 * - TypeFactory provides AIDL type mappings
 * - Syntax definitions for interface generation
 * - No function variants (oneway is manual in templates)
 */
export const aidlLanguage = declareLanguage<LanguageType>({
  name: 'aidl',
  extensions: ['.aidl'],

  conventions: {
    naming: {
      function: 'camelCase',
      type: 'PascalCase',
      variable: 'camelCase',
      const: 'SCREAMING_SNAKE',
      module: 'snake_case',
      field: 'camelCase',
      method: 'camelCase',
      parameter: 'camelCase',
      generic: 'PascalCase'
    }
  },

  // No function variants - oneway is manual in templates
  functionVariants: {},

  syntax: {
    keywords: {
      string: 'String',
      function: '', // AIDL doesn't have a function keyword
      interface: 'interface',
      parcelable: 'parcelable',
      enum: 'enum',
      union: 'union',
      const: 'const',
      // Direction markers for parameters
      in: 'in',
      out: 'out',
      inout: 'inout'
    },
    composition: {
      functionSignature: {
        source: '{{returnType} {{name}}{{params}}'
      }
    },
    types: {
      boolean: {
        template: 'boolean',
        stub: 'false'
      },
      string: {
        template: 'String',
        stub: '""'
      },
      signed: {
        template: 'int',
        stub: '0'
      },
      unsigned: {
        template: 'int',
        stub: '0'
      },
      number: {
        template: 'int',
        stub: '0'
      },
      void: {
        template: 'void',
        stub: 'void'
      },
      array: {
        template: (T: LanguageType) => `${T}[]`,
        stub: '[]'
      }
    }
  }

  // No WARP config - AIDL is code-generation-only
});
