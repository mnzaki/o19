/**
 * Heddles Enrichment
 *
 * Enriches management methods with computed metadata from the ownership chain.
 * This is the core value of heddles - computing useResult, wrappers, etc.
 */

import type { ManagementMetadata, MethodMetadata } from '../reed/index.js';
import { RUST_STRUCT_CONFIG, RUST_WRAPPERS, type RustStructOptions } from '../../warp/rust.js';

/**
 * Enriched method metadata with computed values from heddles.
 * This extends the base MethodMetadata with values computed from ownership chain.
 */
export interface EnrichedMethodMetadata extends MethodMetadata {
  /**
   * Whether methods return Result<T, E> for error handling.
   * Computed from the linked struct's @rust.Struct({ useResult: true }) config.
   */
  useResult?: boolean;
  /**
   * Wrapper types for the linked field (e.g., ['Mutex', 'Option']).
   * Computed from the linked struct field's decorators.
   */
  wrappers?: string[];
  /**
   * The field name in the linked struct (e.g., 'thestream', 'device_manager').
   * Computed from the link target.
   */
  fieldName?: string;
}

/**
 * Enrich management methods with computed metadata.
 *
 * The heddles look up the ownership chain to compute values:
 * - Management → Link → Struct Field → Wrappers
 * - Management → Link → Struct → useResult config
 *
 * This is the proper place for such computation (not in reed or treadles).
 */
export function enrichManagementMethods(managements: ManagementMetadata[]): ManagementMetadata[] {
  return managements.map((mgmt) => {
    // If no link, return as-is
    if (!mgmt.link) {
      return mgmt;
    }

    // Resolve the link to get struct metadata
    const link = mgmt.link;
    const structClass = link.structClass as any;

    // Get struct config for useResult
    const structConfig: RustStructOptions | undefined = structClass?.[RUST_STRUCT_CONFIG];
    const useResult = structConfig?.useResult ?? false;

    // Get field wrappers from struct metadata
    // The structClass.__rustFields is a Map<string, { [RUST_WRAPPERS]: string[] }>
    const rustFields = structClass?.__rustFields as
      | Map<string, { [RUST_WRAPPERS]?: string[] }>
      | undefined;
    const fieldMeta = rustFields?.get(link.fieldName);
    // Access wrappers using the Symbol key (not string 'wrappers')
    const wrappers = fieldMeta?.[RUST_WRAPPERS] ?? [];

    // Enrich each method with computed metadata
    const enrichedMethods: EnrichedMethodMetadata[] = mgmt.methods.map((method) => ({
      ...method,
      useResult,
      wrappers,
      fieldName: link.fieldName
    }));

    return {
      ...mgmt,
      methods: enrichedMethods
    };
  });
}
