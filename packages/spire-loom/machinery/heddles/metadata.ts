/**
 * Heddles Metadata
 *
 * Metadata computation and management for spiral rings.
 */

import { SpiralRing, SpiralOut, SpiralMux } from '../../warp/index.js';
import { CoreRing, RustCore, TsCore } from '../../warp/spiral/index.js';

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
    if (ring instanceof RustCore) {
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

  // Compute package path based on language
  const packagePath = language === 'rust' ? `crates/${packageName}` : `packages/${packageName}`;

  // Set/merge metadata (preserve existing language if present)
  anyRing.metadata = {
    ...anyRing.metadata, // preserve existing (e.g., language)
    packageName,
    packagePath,
    language
  };
}
