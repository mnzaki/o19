/**
 * Kotlin Language Definition 🌾
 *
 * First-class Kotlin support using the modern declarative architecture.
 *
 * Demonstrates how easy it is to add a new language:
 * - Define TypeFactory
 * - Define syntax with type constructors
 * - Add function variants
 * - Auto-generated rendering from templates
 */

import {
  declareLanguage,
  LanguageType,
  type TypeFactory
} from '../machinery/reed/language/index.js';
import { camelCase } from '../machinery/stringing.js';

// ============================================================================
// Kotlin Type Factory
// ============================================================================

/**
 * Type factory for Kotlin code generation.
 */
class KotlinTypeFactory implements Partial<TypeFactory<LanguageType>> {
  // Primitive types
  boolean = new LanguageType('Boolean', 'false', true);
  string = new LanguageType('String', '""', true);
  number = new LanguageType('Int', '0', true);
  void = new LanguageType('Unit', '', true);

  // Generic type factories
  array(itemType: LanguageType): LanguageType {
    return new LanguageType(`List<${itemType.name}>`, 'emptyList()');
  }

  optional(innerType: LanguageType): LanguageType {
    return new LanguageType(`${innerType.name}?`, 'null');
  }

  promise(innerType: LanguageType): LanguageType {
    // Kotlin uses Deferred for async, but typically we just use the type in suspend functions
    return new LanguageType(innerType.name, innerType.stub);
  }

  result(okType: LanguageType, errType: string | LanguageType = 'Throwable'): LanguageType {
    const errName = typeof errType === 'string' ? errType : errType.name;
    return new LanguageType(`Result<${okType.name}, ${errName}>`, 'Result.success()');
  }

  // Entity type factory
  entity(name: string): LanguageType {
    return new LanguageType(name, 'null', false, [], true);
  }

  // Map TypeScript type to Kotlin type
  fromTsType(tsType: string, isCollection: boolean): LanguageType {
    // Handle TypeScript array syntax: T[] -> List<T>
    let normalizedType = tsType.trim();
    let isArraySyntax = false;

    if (normalizedType.endsWith('[]')) {
      normalizedType = normalizedType.slice(0, -2).trim();
      isArraySyntax = true;
    }

    // Final collection flag is true if either passed in or detected from syntax
    const finalIsCollection = isCollection || isArraySyntax;

    const baseType = (() => {
      switch (normalizedType.toLowerCase()) {
        case 'string':
          return this.string;
        case 'number':
          return this.number;
        case 'boolean':
        case 'bool':
          return this.boolean;
        case 'void':
          return this.void;
        case 'date':
          // Date is typically represented as Long (timestamp) or String in Kotlin
          return new LanguageType('String', '""', true);
        default:
          // Complex type / entity
          return this.entity(normalizedType);
      }
    })();

    return finalIsCollection ? this.array(baseType) : baseType;
  }
}

// Export the type factory
export const types = new KotlinTypeFactory();

// ============================================================================
// Language Definition
// ============================================================================

/**
 * Kotlin language definition.
 *
 * Uses the modern declarative architecture:
 * - TypeFactory provides type mappings
 * - Syntax definitions for code generation
 * - Function variants for suspend, public, etc.
 * - Auto-generated rendering from templates
 */
export const kotlinLanguage = declareLanguage<LanguageType>({
  name: 'kotlin',
  extensions: ['.kt', '.kts'],
  types,

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

  // Function variants that can be accessed via method.{variant}
  functionVariants: {
    suspend: { prependKeyword: 'suspend' },
    public: { prependKeyword: 'public' },
    private: { prependKeyword: 'private' },
    protected: { prependKeyword: 'protected' },
    internal: { prependKeyword: 'internal' }
  },

  // Syntax definitions for code generation
  syntax: {
    keywords: {
      function: 'fun',
      public: 'public',
      private: 'private',
      protected: 'protected',
      internal: 'internal'
    },
    functionReturnTypeSeparator: ': ',
    types: {
      boolean: {
        template: 'Boolean',
        stub: 'false'
      },
      string: {
        template: 'String',
        stub: '""'
      },
      signed: {
        template: 'Int',
        stub: '0'
      },
      unsigned: {
        template: 'UInt',
        stub: '0u'
      },
      number: {
        template: 'Int',
        stub: '0'
      },
      void: {
        template: 'Unit',
        stub: ''
      },
      array: {
        template: (T: LanguageType) => `List<${T.name}>`,
        stub: 'emptyList()'
      }
    }
  }

  // No WARP config yet - Kotlin is code-generation-only for now
});
