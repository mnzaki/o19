/**
 * Android Generator - Declarative Version
 *
 * Generates Android foreground service code from spiral patterns.
 * Uses the declarative API for cleaner, more maintainable code.
 *
 * Matrix match: (RustAndroidSpiraler, RustCore) → Android bridge
 *
 * > *"The treadle is glue; the helpers are the craft."*
 */

import { RustAndroidSpiraler } from '../../warp/spiral/spiralers/rust/android.js';
import { RustCore, SpiralOut } from '../../warp/spiral/index.js';
import { buildCrateNaming } from '../stringing.js';
import { hookup } from '../sley/index.js';
import { declareTreadle, generateFromTreadle } from './index.js';
import type { LanguageParam } from '../reed/language/types.js';
import { LanguageMethod } from '../reed/method.js';
import type { MethodMetadata } from '../../warp/metadata.js';

/**
 * Extended parameter with AIDL type information.
 */
interface AidlParam extends LanguageParam {
  name: string;
  type: string;
  optional?: boolean;
  /** AIDL type for the parameter */
  aidlType?: string;
  /** Direction qualifier ('in', 'out', 'inout') */
  direction?: 'in' | 'out' | 'inout';
}

/**
 * Extended MethodMetadata with AIDL-specific type information.
 */
export class AidlMethod extends LanguageMethod<AidlParam> {
  /** AIDL return type */
  aidlReturnType?: string;
}

/**
 * Map internal type representation to AIDL type.
 * AIDL supports: primitives, String, Parcelable, arrays, interfaces
 *
 * @param type - The internal type (e.g., 'String', 'i32', 'Vec<u8>')
 * @returns The AIDL type (e.g., 'String', 'int', 'byte[]')
 */
export function mapToAidlType(type: string): string {
  // Handle nullable marker
  const isNullable = type.startsWith('?');
  const baseType = isNullable ? type.slice(1) : type;

  // Map to AIDL type
  switch (baseType.toLowerCase()) {
    // Primitives
    case 'string':
      return 'String';
    case 'i32':
    case 'int':
      return 'int';
    case 'i64':
    case 'long':
      return 'long';
    case 'bool':
    case 'boolean':
      return 'boolean';
    case 'f32':
    case 'float':
      return 'float';
    case 'f64':
    case 'double':
      return 'double';
    case 'u8':
    case 'byte':
      return 'byte';
    // Arrays
    case 'vec<u8>':
    case 'bytes':
      return 'byte[]';
    case 'vec<string>':
      return 'String[]';
    // Complex types - assume Parcelable for now
    default:
      return baseType;
  }
}

/**
 * Map method parameters for AIDL generation.
 * Adds AIDL-specific type info and direction qualifiers.
 *
 * @param params - Raw parameters to transform
 * @returns Parameters with AIDL type information added
 */
function addAidlTypesToParams(
  params: Array<{ name: string; type: string; optional?: boolean }>
): AidlParam[] {
  return params.map((param) => ({
    ...param,
    aidlType: mapToAidlType(param.type),
    direction: 'in' // Default: client sends data to service
  }));
}

/**
 * Add AIDL type information to all methods.
 * Adds aidlReturnType and aidlType to each method's params.
 *
 * @param methods - Raw methods to transform
 * @returns Methods with AIDL type information added
 */
export function addAidlTypesToMethods(methods: MethodMetadata[]): AidlMethod[] {
  return methods.map((method) => ({
    ...method,
    aidlReturnType: mapToAidlType(method.returnType),
    params: addAidlTypesToParams(method.params)
  }));
}

// ============================================================================
// Treadle Definition
// ============================================================================

export const androidServiceTreadle = declareTreadle({
  // When does this run?
  matches: [{ current: 'RustAndroidSpiraler.foregroundService', previous: 'RustCore' }],

  // Extra validation
  validate: (current, previous) => {
    // current.ring is a SpiralOut, the spiraler is stored in .spiraler
    const spiraler = (current.ring as any).spiraler;
    if (!(spiraler instanceof RustAndroidSpiraler)) return false;
    if (!(previous.ring instanceof RustCore)) {
      throw new Error('RustAndroidSpiraler must wrap RustCore');
    }
    return true;
  },

  // Method filtering and transformation
  methods: {
    filter: 'platform',
    pipeline: []
  },

  // Add link metadata for JNI routing and AIDL types
  transformMethods: (methods, context): MethodMetadata[] => {
    const linkMap = new Map(context.plan.managements.map((m) => [m.name, buildMethodLink(m)]));
    const mgmtNames = context.plan.managements.map((m) => m.name);

    // First add link metadata
    const withLinks = methods.map((method) => {
      const mgmtName = extractManagementFromBindPoint(method.name, mgmtNames);
      return {
        ...method,
        link: mgmtName ? linkMap.get(mgmtName) : undefined
      };
    });

    // Then add AIDL type information for all methods
    return addAidlTypesToMethods(withLinks);
  },

  // Template data
  data: (_context, current, previous) => {
    if (!(current.ring instanceof SpiralOut)) {
      throw new Error('Expected SpiralOut');
    }
    const android = current.ring.spiraler as RustAndroidSpiraler;
    const core = previous.ring as RustCore;
    const metadata = core.getMetadata();

    const naming = buildServiceNaming(metadata.packageName, android.getNameAffix());
    const paths = buildAndroidPackageData(
      metadata.packageName,
      android.getGradleNamespace(metadata.packageName)
    );

    // Build crate naming for Rust code generation
    const crateNaming = buildCrateNaming(metadata.crateName);

    return {
      // Package structure
      ...paths,
      coreName: metadata.packageName,
      coreNamePascal: naming.serviceName.replace(/Service$/, ''),
      coreCrateName: metadata.crateName,
      crateNaming,
      // Backwards compatibility
      coreCrateRustId: crateNaming.rustIdentifier,

      // Service naming
      nameAffix: naming.nameAffix,
      pascalAffix: naming.pascalAffix,
      serviceName: naming.serviceName,
      interfaceName: naming.interfaceName,

      // Service configuration
      logTag: naming.logTag,
      channelId: naming.channelId,
      channelName: naming.channelName,
      channelDescription: `Background service for ${metadata.packageName}`,
      notificationTitle: `${metadata.packageName} Service`,
      notificationText: 'Running in background',

      // Native library
      nativeLibName: 'android',
      homeDirName: `.${metadata.packageName}`,

      // AIDL imports
      imports: [`${paths.packageName}.IEventCallback`],

      // Store current ring for hookup
      _currentRing: current.ring
    };
  },

  // Output files
  // Note: paths are relative to the package directory. The weaver automatically
  // prepends 'spire/' to isolate generated code from package source.
  outputs: [
    {
      template: 'android/service.kt.mejs',
      path: 'android/java/{packagePath}/service/{serviceName}.kt'
    },
    // AIDL generation enabled - generates interface for NDK aidl tool
    {
      template: 'android/aidl_interface.aidl.mejs',
      path: 'android/aidl/{packagePath}/{interfaceName}.aidl'
    },
    {
      template: 'android/jni_bridge.jni.rs.mejs',
      path: 'src/lib.rs'
    }
  ],

  // Package integration
  hookup: {
    // FIXME this is the old hookup system!!!
    type: 'custom',
    async customHookup(context, files, data) {
      await hookup.executeAndroidHookup(context, files, {
        workspaceRoot: context.workspaceRoot ?? process.cwd(),
        packageDir: context.packageDir,
        coreName: data.coreName as string,
        coreNamePascal: data.coreNamePascal as string,
        packageName: data.packageName as string,
        packagePath: data.packagePath as string,
        serviceName: data.serviceName as string,
        interfaceName: data.interfaceName as string,
        currentRing: data._currentRing
      });
    }
  }
});

// ============================================================================
// Exports
// ============================================================================

export type AndroidGenerationOptions = {
  outputDir: string;
  coreCrateName: string;
  packageName: string;
  serviceName: string;
};

export const generateAndroidService = generateFromTreadle(androidServiceTreadle);
