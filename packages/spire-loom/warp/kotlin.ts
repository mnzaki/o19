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
    blockOpen: '{',
    blockClose: '}',
    blockImplicitReturn: false,
    blockStatementSeparator: '',
    paramsOpen: '(',
    paramsSeparator: ', ',
    paramsClose: ')',
    propertyNameSeparator: ': ',
    functionReturnTypeSeparator: ': ',
    keywords: {
      function: 'fun',
      public: 'public',
      private: 'private',
      protected: 'protected',
      internal: 'internal'
    },
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
    },
    composition: {
      functionSignature: {
        source:
          '{{ prependedKeywords }} {{keywords.function}} {{name}}{{generics}}{{params}}{% if returnType %}{{functionReturnTypeSeparator}}{{returnType}}{% endif %}'
      },
      parameter: {
        source: '{{name}}: {{type}}'
      },
      functionParams: {
        source: '{{ paramsOpen }}{{ params.join(paramsSeparator) }}{{ paramsClose }}'
      },
      functionDefinition: {
        source: '{{signature}} {{blockOpen}}\n{{body}}\n{{blockClose}}'
      },
      typeDefinition: {
        source:
          '{% if isExport %}export {% endif %}{% if isAbstract %}abstract {% endif %}class {{name}}{% if generics %}{{generics}}{% endif %}{% if base %} extends {{base}}{% endif %} {{blockOpen}}{{members}}{{blockClose}}',
        whitespace: 'trim'
      },
      interfaceDefinition: {
        source:
          '{% if isExport %}export {% endif %}interface {{name}}{{generics}} {{blockOpen}}{{members}}{{blockClose}}',
        whitespace: 'trim'
      },
      enumDefinition: {
        source:
          '{% if isExport %}export {% endif %}enum {{name}} {{blockOpen}}{{variants}}{{blockClose}}',
        whitespace: 'trim'
      },
      importStatement: {
        source: 'import {{importSpec}}',
        whitespace: 'trim'
      },
      objectWrappedParams: {
        source: '{{objectParamName}}: { {{innerParamList}} }',
        whitespace: 'trim'
      },
      // Entity composition templates
      entityField: {
        source: 'val {{ name }}: {{ type.name }}'
      },
      entityFields: {
        source: '{% fields.forEach(function(field, i) { %}{{ field }}{% if (i < fields.length - 1) { %},\n    {% } %}{% }) %}'
      },
      entityClass: {
        source: `data class {{ name.pascalCase }}(
    {{ renderEntityFields(entity) }}
)`
      },
      jsonSerializableEntity: {
        source: `@Serializable
@SerialName("{{ sourceName }}")
data class {{ name.pascalCase }}Json(
    {{ renderEntityFields(entity) }}
)`
      },
      parcelizeEntity: {
        source: `@Parcelize
data class {{ name.pascalCase }}(
    {{ renderEntityFields(entity) }}
) : Parcelable`
      }
    }
  }

  // No WARP config yet - Kotlin is code-generation-only for now
});
