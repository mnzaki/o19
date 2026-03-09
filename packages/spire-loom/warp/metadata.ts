/**
 * Heddles Metadata
 *
 * Metadata computation and management for spiral rings.
 */

import { SpiralRing, SpiralOut, SpiralMux, ExternalLayer } from './index.js';
import { RustCore, TsCore } from './spiral/index.js';
import { SurfaceRing } from './spiral/surface.js';

/**
 * Ensure metadata is set on a ring, computing it from export name if needed.
 *
 * This is called after loadWarp has set .name on all Layer instances.
 * For rings without metadata (like those created by factory methods),
 * we compute packageName, packagePath, and language from the export name.
 *
 * Also recursively ensures metadata on inner rings (e.g., CoreRing inside SpiralOut).
 * SpiralMux (multiplexers) don't have their own metadata - they just aggregate.
 *
 * Priority for package name:
 *   1. ring.name (if explicitly set in WARP.ts after creation)
 *   2. exportName (from WARP.ts export)
 */
export function ensureMetadata(ring: SpiralRing, exportName: string): void {
  const anyRing = ring as any;

  // SpiralMux is a multiplexer - it doesn't have its own package
  // Just ensure metadata on its inner rings
  if (ring instanceof SpiralMux) {
    for (const inner of ring.innerRings) {
      ensureMetadata(inner, exportName);
    }
    return;
  }

  // Determine language from ring type or existing metadata
  let language: 'rust' | 'typescript' | undefined = anyRing.metadata?.language;

  if (!language) {
    if (ring instanceof SurfaceRing) {
      // Surface apps go in apps/ directory
      language = ring.options.language || 'typescript';
    } else if (ring instanceof RustCore) {
      language = 'rust';
    } else if (ring instanceof TsCore) {
      language = 'typescript';
    } else if (ring instanceof SpiralOut) {
      // Infer from inner ring and also ensure inner ring has metadata
      if (ring.inner instanceof RustCore) {
        language = 'rust';
        ensureMetadata(ring.inner, exportName);
      } else if (ring.inner instanceof TsCore) {
        language = 'typescript';
        ensureMetadata(ring.inner, exportName);
      } else if (ring.inner instanceof SpiralMux) {
        // SpiralOut wrapping a mux - ensure metadata on the mux's inner rings
        ensureMetadata(ring.inner, exportName);
        // Default to rust for now (could be smarter here)
        language = 'rust';
      } else {
        throw new Error(
          `Cannot determine language for SpiralOut "${exportName}": inner ring is not RustCore or TsCore`
        );
      }
    } else {
      throw new Error(
        `Cannot determine language for ring "${exportName}": unknown ring type ${ring.constructor.name}`
      );
    }
  }

  // If metadata already has packageName, don't overwrite
  if (anyRing.metadata?.packageName) {
    return;
  }

  // Use ring.name if explicitly set (allows WARP.ts override), otherwise use exportName
  const packageName = ring.name || exportName;

  // Compute package path based on ring type and language
  let packagePath: string;
  if (ring instanceof SurfaceRing) {
    // Surface apps live in apps/
    packagePath = `apps/${packageName}`;
  } else if (language === 'rust') {
    packagePath = `crates/${packageName}`;
  } else {
    packagePath = `packages/${packageName}`;
  }

  // Set/merge metadata (preserve existing language if present)
  anyRing.metadata = {
    ...anyRing.metadata, // preserve existing (e.g., language)
    packageName,
    packagePath,
    language
  };
}

/**
 * CRUD operation type.
 */
export type CrudOperation = 'create' | 'read' | 'update' | 'delete' | 'list';

/**
 * Management reach level.
 */
export type ReachLevel = 'Private' | 'Local' | 'Global';

/**
 * Method metadata from @crud decorator.
 *
 * NOTE: This contains ONLY immediately available metadata from the loom source.
 * Computed values (useResult, wrappers) are added by heddles, not here.
 */
export interface MethodMetadata {
  /** Unique identifier: "{managementName}.{methodName}" */
  readonly id: string;
  /** Management this method belongs to (e.g., "BookmarkMgmt") */
  managementName: string;
  /** Method name */
  name: string;
  /** CRUD operation type (if CRUD-tagged) */
  crudOperation?: CrudOperation;
  /** Parameter types (parsed from signature) */
  params: Array<MethodParamMetadata>;
  /** Return type */
  returnType: string;
  /** JSDoc description */
  description?: string;
  /** Whether this is a collection operation (returns array) */
  isCollection?: boolean;
  /** Whether this is a soft delete */
  isSoftDelete?: boolean;
  /** Tags attached to this method (e.g., ['crud:create', 'auth:required']) */
  tags?: string[];
  /**
   * Arbitrary metadata that translations can attach.
   * Use namespacing: 'myTranslation.key' to avoid collisions.
   *
   * NOTE: Heddles use this to store computed metadata like useResult, wrappers.
   */
  metadata?: Record<string, unknown>;
  /** Link to ExternalLayer for service invocation (inherited from Management) */
  link?: LinkMetadata;
}

/**
 * Minimal metadata stored by @loom.link decorator.
 * Heavy processing (resolving methods, mapping types) happens in heddles.
 */
export interface LinkMetadata {
  /** The target ExternalLayer (e.g., a RustExternalLayer) */
  target: ExternalLayer;

  // TODO FIXME
  // Language specific bits that should be abstracted, here for rust

  /**
   * Whether methods return Result<T, E> for error handling.
   * Inherited from @rust.Struct({ useResult: true }) on the linked struct.
   */
  useResult?: boolean;
  /**
   * Wrapper types for the linked field (e.g., ['Mutex', 'Option']).
   * Used to generate proper field access code.
   */
  wrappers?: string[];
}

// ============================================================================
// Entity Management System
// ============================================================================

/**
 * Options for the @Management.Entity decorator.
 */
export interface EntityOptions {
  /** Custom table/collection name (defaults to entity class name) */
  tableName?: string;
  /** Whether this entity is read-only (no create/update/delete) */
  readOnly?: boolean;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Field metadata for entity code generation.
 */
export interface EntityFieldMetadata {
  /** Property name (camelCase) */
  name: string;
  /** TypeScript type (source of truth) */
  tsType: string;
  /** SQL column name (snake_case) */
  columnName: string;
  /** Whether field is nullable */
  nullable: boolean;
  /** Whether this is the primary key */
  isPrimary: boolean;
  /** Whether this is an auto-managed created timestamp */
  isCreatedAt: boolean;
  /** Whether this is an auto-managed updated timestamp */
  isUpdatedAt: boolean;
  /** Whether to include in INSERT statements */
  forInsert: boolean;
  /** Whether to include in UPDATE statements */
  forUpdate: boolean;
}

/**
 * Metadata for an Entity associated with a Management.
 */
export interface EntityMetadata {
  /** The entity class constructor */
  entityClass: new (...args: any[]) => any;
  /** The entity class name */
  name: string;
  /** Management class this entity belongs to */
  managementName: string;
  /** Management class name without 'Mgmt' */
  serviceName: string;
  /** Entity name all lower case */
  lower: string;
  /** Optional metadata attached by decorator */
  options?: EntityOptions;
  /** Field metadata for code generation */
  fields?: EntityFieldMetadata[];
}

/**
 * A parameter in a Management method.
 */
export interface MethodParamMetadata {
  /** Parameter name */
  name: string;

  /** TypeScript type */
  tsType: string;

  /** Whether optional */
  optional?: boolean;
}

/**
 * Management Imprint metadata.
 *
 * NOTE: This contains ONLY immediately available metadata from the loom source.
 * The link is stored as-is; heddles will resolve it to compute wrappers/useResult.
 */
export interface ManagementMetadata {
  /** Management class name (e.g., "BookmarkMgmt") */
  name: string;
  /** Reach level from @reach decorator */
  reach: ReachLevel;
  /** Source file path */
  sourceFile: string;
  /** Methods with their CRUD metadata */
  methods: MethodMetadata[];
  /** Entity classes associated with this management */
  entities: EntityMetadata[];
  /** Constants defined in the management */
  constants: Record<string, unknown>;
  /** Link target for routing (raw, unresolved) */
  link?: LinkMetadata;
}
