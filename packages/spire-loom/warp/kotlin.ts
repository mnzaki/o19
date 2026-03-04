/**
 * Kotlin Language Definition 🌾
 *
 * First-class Kotlin support using the pure-config architecture.
 *
 * Demonstrates how easy it is to add a new language:
 * - Define TypeFactory
 * - Define RenderingConfig
 * - No custom transform needed!
 */

import {
  declareLanguage,
  LanguageType,
  type TypeFactory,
  type LanguageParam,
} from '../machinery/reed/language.js';
import { camelCase } from '../machinery/stringing.js';

// ============================================================================
// Kotlin-Specific Types
// ============================================================================

/**
 * Kotlin parameter with language-specific metadata.
 */
interface KotlinParam extends LanguageParam {
  /** Kotlin type name (e.g., 'String', 'Int', 'List<T>') */
  ktType: string;
}

// ============================================================================
// Kotlin Type Factory
// ============================================================================

/**
 * Type factory for Kotlin code generation.
 */
class KotlinTypeFactory implements TypeFactory<KotlinParam, LanguageType> {
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
    return new LanguageType(innerType.name, innerType.stubReturn);
  }

  result(okType: LanguageType, errType: string | LanguageType = 'Throwable'): LanguageType {
    const errName = typeof errType === 'string' ? errType : errType.name;
    return new LanguageType(`Result<${okType.name}, ${errName}>`, 'Result.success()');
  }

  // Entity type factory
  entity(name: string): LanguageType {
    return new LanguageType(name, 'null', false, true);
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

// ============================================================================
// Language Definition
// ============================================================================

/**
 * Kotlin language definition.
 *
 * Demonstrates the pure-config architecture:
 * - TypeFactory provides type mappings
 * - Rendering config provides code formatting
 * - Transform is auto-generated
 * - No custom enhancers needed!
 */
export const kotlinLanguage = declareLanguage<KotlinParam, LanguageType>({
  name: 'kotlin',

  codeGen: {
    fileExtensions: ['.kt.ejs', '.kts.ejs'],
    
    // Type factory defines how TS types map to Kotlin
    types: new KotlinTypeFactory(),
    
    // Rendering config defines code formatting
    rendering: {
      formatParamName: camelCase,
      functionSignature: (method) => {
        const params = method.params.map(p => 
          `${p.name}: ${p.langType}${p.optional ? '?' : ''}`
        ).join(', ');
        return `fun ${method.camelName}(${params}): ${method.returnTypeDef.name}`;
      },
      asyncFunctionSignature: (method) => {
        const params = method.params.map(p => 
          `${p.name}: ${p.langType}${p.optional ? '?' : ''}`
        ).join(', ');
        return `suspend fun ${method.camelName}(${params}): ${method.returnTypeDef.name}`;
      },
      renderDefinition: (method, opts) => {
        // Kotlin typically doesn't use visibility keywords in interfaces
        const params = method.params.map(p => 
          `${p.name}: ${p.langType}${p.optional ? '?' : ''}`
        ).join(', ');
        return `fun ${method.camelName}(${params}): ${method.returnTypeDef.name}`;
      },
      naming: {
        function: 'camel',
        type: 'pascal',
        variable: 'camel',
        const: 'screaming_snake',
        module: 'snake'
      }
    },
    
    // No enhancers needed — defaults are sufficient!
  },

  // No WARP config yet - Kotlin is code-generation-only for now
});
