/**
 * Enhancement System 🌀
 *
 * Generic method enhancement with language-specific views.
 *
 * Provides:
 * - enhanceMethod: Transform a raw method for a specific language
 * - createLanguageView: Create an idiomatic view with naming conventions
 * - createEnhancedMethod: Container with multiple language views
 *
 * @module machinery/reed/enhancement
 */

import { languages as languageRegistry, getLanguageExtensionKey } from './language.js';
import type {
  LanguageDefinition,
  NamingConventionConfig
} from './language.js';
import type {
  LanguageMethod,
  LanguageParam,
  LanguageType,
  RawMethod
} from './language-types.js';
import {
  pascalCase,
  camelCase,
  toSnakeCase
} from '../stringing.js';

// ============================================================================
// Method Enhancement
// ============================================================================

/**
 * Enhance a raw method with a language's transform pipeline.
 *
 * @param method - Raw method from management metadata
 * @param language - Language identifier (e.g., 'rust', 'typescript')
 * @returns Language-enhanced method
 * @throws Error if language not registered or has no transform
 */
export function enhanceMethod(
  method: RawMethod,
  language: string
): LanguageMethod {
  const lang = languageRegistry.get(language);
  if (!lang?.codeGen?.transform) {
    throw new Error(
      `Language '${language}' not registered or has no transform. ` +
        `Registered languages: ${languageRegistry.getAll().map((l) => l.name).join(', ') || '(none)'}`
    );
  }

  const [enhanced] = lang.codeGen.transform([method]);
  return enhanced;
}

// ============================================================================
// Language View
// ============================================================================

/**
 * Simplified parameter view for language views.
 */
export interface ParamView {
  /** Original parameter name */
  readonly name: string;
  /** Language-appropriate variable name */
  readonly variableName: string;
  /** Language-specific type */
  readonly type: string;
  /** Original TypeScript type */
  readonly tsType: string;
  /** Whether parameter is optional */
  readonly optional: boolean;
}

/**
 * Parameter views array with legacy helper properties.
 */
export interface ParamViews extends Array<ParamView> {
  /** Comma-separated parameter list for function signatures (e.g., "name: string, age: number") */
  readonly list: string;
  /** Parameter list with optional markers (e.g., "name?: string") */
  readonly listWithOptionality: string;
  /** Comma-separated parameter names only (e.g., "name, age") */
  readonly names: string;
  /** Object-style invocation (e.g., "name: name, age: age") */
  readonly invocation: string;
}

/**
 * Language view - idiomatic API for a specific language.
 *
 * Provides naming conventions and simplified access to method properties.
 */
export interface LanguageView {
  /** Reference to language definition */
  readonly _language: LanguageDefinition;
  /** Reference to underlying LanguageMethod */
  readonly _raw: LanguageMethod;
  /** Reference to naming convention */
  readonly _naming: NamingConventionConfig;

  // Idiomatic naming (from convention)
  /** Function name in language's convention */
  readonly functionName: string;
  /** Type name in language's convention (usually PascalCase) */
  readonly typeName: string;
  /** Variable name in language's convention */
  readonly variableName: string;
  /** Constant name in language's convention (usually SCREAMING_SNAKE) */
  readonly constName: string;
  /** Module/file name in language's convention */
  readonly moduleName: string;

  // Raw names (always available)
  readonly camelName: string;
  readonly pascalName: string;
  readonly snakeName: string;

  // Type information
  /** Return type in language syntax */
  readonly returnType: string;
  /** Stub return value for mocks */
  readonly stubReturn: string;
  /** Parameters with language-appropriate naming */
  readonly params: ParamViews;

  // Code generation
  /** Function signature */
  readonly signature: string;
  /** Full function definition */
  readonly definition: string;

  // Language-specific extras (dynamic)
  [key: string]: unknown;
}

/**
 * Apply naming convention to a name.
 */
function applyNamingConvention(
  name: string,
  convention: NamingConventionConfig['function']
): string {
  switch (convention) {
    case 'snake':
      return toSnakeCase(name);
    case 'camel':
      return camelCase(name);
    case 'pascal':
      return pascalCase(name);
    case 'screaming_snake':
      return toSnakeCase(name).toUpperCase();
    default:
      return name;
  }
}

/**
 * Create a language view with idiomatic naming.
 *
 * @param method - Language-enhanced method
 * @param lang - Language definition
 * @param langKey - Extension key (rs, ts, kt)
 * @returns Language view with simplified API
 */
export function createLanguageView(
  method: LanguageMethod,
  lang: LanguageDefinition,
  langKey: string
): LanguageView {
  const view = {} as LanguageView;

  // Get naming convention from language declaration
  const naming = lang.codeGen.rendering.naming;

  // Store references
  Object.defineProperty(view, '_language', {
    value: lang,
    writable: false,
    enumerable: false
  });
  Object.defineProperty(view, '_raw', {
    value: method,
    writable: false,
    enumerable: false
  });
  Object.defineProperty(view, '_naming', {
    value: naming,
    writable: false,
    enumerable: false
  });

  // Idiomatic naming properties
  Object.defineProperty(view, 'functionName', {
    get() {
      return applyNamingConvention(method.name, naming.function);
    },
    enumerable: true
  });

  Object.defineProperty(view, 'typeName', {
    get() {
      return applyNamingConvention(method.name, naming.type);
    },
    enumerable: true
  });

  Object.defineProperty(view, 'variableName', {
    get() {
      return applyNamingConvention(method.name, naming.variable);
    },
    enumerable: true
  });

  Object.defineProperty(view, 'constName', {
    get() {
      return applyNamingConvention(method.name, naming.const);
    },
    enumerable: true
  });

  Object.defineProperty(view, 'moduleName', {
    get() {
      return applyNamingConvention(method.name, naming.module);
    },
    enumerable: true
  });

  // Raw names
  Object.defineProperty(view, 'camelName', {
    get() {
      return method.camelName;
    },
    enumerable: true
  });

  Object.defineProperty(view, 'pascalName', {
    get() {
      return method.pascalName;
    },
    enumerable: true
  });

  Object.defineProperty(view, 'snakeName', {
    get() {
      return method.snakeName;
    },
    enumerable: true
  });

  // Type information
  Object.defineProperty(view, 'returnType', {
    get() {
      return method.returnTypeDef.name;
    },
    enumerable: true
  });

  Object.defineProperty(view, 'stubReturn', {
    get() {
      return method.stubReturn;
    },
    enumerable: true
  });

  // Parameters with language-appropriate naming
  Object.defineProperty(view, 'params', {
    get() {
      const paramViews = method.params.map((p: LanguageParam) => ({
        get name() {
          return p.name;
        },
        get variableName() {
          return applyNamingConvention(p.name, naming.variable);
        },
        get type() {
          return p.langType;
        },
        get tsType() {
          return p.type;
        },
        get optional() {
          return p.optional ?? false;
        }
      }));

      // Legacy helper properties for template compatibility
      Object.defineProperty(paramViews, 'list', {
        get() {
          return method.params.map((p: LanguageParam) => 
            `${applyNamingConvention(p.name, naming.variable)}: ${p.langType}`
          ).join(', ');
        },
        enumerable: false
      });

      Object.defineProperty(paramViews, 'listWithOptionality', {
        get() {
          return method.params.map((p: LanguageParam) => 
            `${applyNamingConvention(p.name, naming.variable)}${p.optional ? '?' : ''}: ${p.langType}`
          ).join(', ');
        },
        enumerable: false
      });

      Object.defineProperty(paramViews, 'names', {
        get() {
          return method.params.map((p: LanguageParam) => 
            applyNamingConvention(p.name, naming.variable)
          ).join(', ');
        },
        enumerable: false
      });

      Object.defineProperty(paramViews, 'invocation', {
        get() {
          return method.params.map((p: LanguageParam) => 
            `${applyNamingConvention(p.name, naming.variable)}: ${applyNamingConvention(p.name, naming.variable)}`
          ).join(', ');
        },
        enumerable: false
      });

      return paramViews;
    },
    enumerable: true
  });

  // Code generation
  Object.defineProperty(view, 'signature', {
    get() {
      return lang.codeGen.rendering.functionSignature(method);
    },
    enumerable: true
  });

  Object.defineProperty(view, 'definition', {
    get() {
      const render = lang.codeGen.rendering.renderDefinition;
      return render
        ? render(method, { public: true })
        : lang.codeGen.rendering.functionSignature(method);
    },
    enumerable: true
  });

  // Copy any extra properties from custom enhancers
  for (const [key, value] of Object.entries(method)) {
    if (key.startsWith('_')) continue;
    if (key in view) continue;

    Object.defineProperty(view, key, {
      get() {
        return (method as Record<string, unknown>)[key];
      },
      enumerable: true
    });
  }

  return view;
}

// ============================================================================
// Enhanced Method Container
// ============================================================================

/**
 * Enhanced method with multiple language views.
 *
 * The base RawMethod properties are preserved, with language views
 * attached as extension-keyed properties (rs, ts, kt).
 *
 * Getters like `returnType` delegate to the default language view.
 */
export interface EnhancedMethod extends RawMethod {
  /** Default language extension key */
  readonly _default: string;
  /** All enhanced language keys */
  readonly _languages: string[];
  /** Raw methods snapshot for incremental enhancement */
  readonly _raw?: RawMethod[];

  // Default language getters (delegate to _default view)
  readonly returnType: string;
  readonly signature: string;
  readonly definition: string;
  readonly functionName: string;
  readonly typeName: string;
  readonly variableName: string;
  readonly constName: string;
  readonly moduleName: string;
  readonly camelName: string;
  readonly pascalName: string;
  readonly snakeName: string;
  readonly stubReturn: string;
  readonly params: ParamViews;

  // Language views by extension key
  readonly rs?: LanguageView;
  readonly ts?: LanguageView;
  readonly kt?: LanguageView;
}

/**
 * Create an enhanced method container with language views.
 *
 * @param raw - Original raw method
 * @param enhancements - Map of language key to {method, lang}
 * @param defaultLangKey - Default language extension key
 * @returns Enhanced method with views and delegating getters
 */
export function createEnhancedMethod(
  raw: RawMethod,
  enhancements: Map<string, { method: LanguageMethod; lang: LanguageDefinition }>,
  defaultLangKey: string
): EnhancedMethod {
  // Start with raw method properties
  const container = { ...raw } as EnhancedMethod;

  // Create views for each language
  for (const [langKey, { method, lang }] of enhancements) {
    const view = createLanguageView(method, lang, langKey);
    (container as Record<string, unknown>)[langKey] = view;
  }

  // Store metadata
  Object.defineProperty(container, '_default', {
    value: defaultLangKey,
    writable: false,
    enumerable: false
  });

  Object.defineProperty(container, '_languages', {
    value: Array.from(enhancements.keys()),
    writable: false,
    enumerable: false
  });

  // Create delegating getters
  const createDelegator = (prop: keyof LanguageView) => {
    Object.defineProperty(container, prop, {
      get() {
        const view = (this as Record<string, LanguageView>)[this._default];
        return view?.[prop];
      },
      enumerable: true
    });
  };

  createDelegator('returnType');
  createDelegator('signature');
  createDelegator('definition');
  createDelegator('functionName');
  createDelegator('typeName');
  createDelegator('variableName');
  createDelegator('constName');
  createDelegator('moduleName');
  createDelegator('camelName');
  createDelegator('pascalName');
  createDelegator('snakeName');
  createDelegator('stubReturn');
  createDelegator('params');

  return container;
}

/**
 * Enhance multiple methods with multiple languages.
 *
 * @param methods - Raw methods to enhance
 * @param languages - Language identifiers to enhance with
 * @param defaultLanguage - Default language (first in array if not specified)
 * @returns Enhanced methods with language views
 */
export function enhanceMethods(
  methods: RawMethod[],
  languages: string[],
  defaultLanguage?: string
): EnhancedMethod[] {
  const defaultLang = defaultLanguage || languages[0];
  const defaultLangKey = getLanguageExtensionKey(defaultLang);

  return methods.map((raw) => {
    // Enhance for each language
    const enhancements = new Map<string, { method: LanguageMethod; lang: LanguageDefinition }>();

    for (const langName of languages) {
      const langKey = getLanguageExtensionKey(langName);
      const langDef = languageRegistry.get(langName);
      if (!langDef) continue;

      const enhanced = enhanceMethod(raw, langName);
      enhancements.set(langKey, { method: enhanced, lang: langDef });
    }

    return createEnhancedMethod(raw, enhancements, defaultLangKey);
  });
}

/**
 * Type guard to check if a method is enhanced.
 */
export function isEnhanced(method: RawMethod | EnhancedMethod): method is EnhancedMethod {
  return '_default' in method;
}
