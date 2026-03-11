/**
 * Example: AAAArchi + Spire-Loom Integration
 * 
 * Shows how AAAArchi can enhance spire-loom's architecture validation
 * and error reporting without disrupting existing workflows.
 */

import { AAAArchi } from '@o19/aaaarchi';
import { ferroringModule } from '@o19/ferror';
import { Orka } from '@o19/orka';

// ============================================
// 1. WARP DECORATORS WITH AAAARCHI
// ============================================

/**
 * Enhanced @rust.Struct decorator that validates against architecture.
 * 
 * Original spire-loom: just collects metadata
 * With AAAArchi: validates the struct is in allowed layer
 */
export function rustStruct(config: { useResult?: boolean }) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    // Get architectural context
    const scope = AAAArchi.forFile(import.meta.url);
    const ctx = scope.getContext();
    
    // Validate: rust structs should be in domain/infrastructure layers
    if (ctx.layer !== 'infrastructure' && ctx.layer !== 'domain') {
      const ferror = ferroringModule()[ctx.domain][ctx.layer];
      throw ferror(
        new Error('Architectural violation'),
        {
          function: target.name,
          stance: 'authoritative',
          summary: `@rust.Struct used in invalid layer: ${ctx.layer}`,
          explanation: 'Rust structs should be defined in infrastructure or domain layers, not in service/controller layers.',
          suggestions: [
            { action: 'move-file', message: `Move ${target.name} to infrastructure/ or domain/` },
            { action: 'change-decorator', message: 'Use @typescript.Class for service-layer types' }
          ],
          tags: ['architectural-violation', 'layer-misuse']
        }
      );
    }
    
    // Register with AAAArchi
    scope.annotate(target, {
      function: target.name,
      tags: ['rust-struct', config.useResult ? 'use-result' : '']
    });
    
    // Continue with original spire-loom logic...
    return target;
  };
}

// ============================================
// 2. HEDDLES ENRICHMENT WITH AAAARCHI
// ============================================

interface ManagementMetadata {
  name: string;
  link?: string;
  methods: Array<{ name: string; returnType: string }>;
}

interface EnrichedManagement {
  name: string;
  useResult: boolean;
  wrappers: string[];
  validTargets: string[];
  _violation?: {
    type: string;
    from: string;
    to: string;
    explanation: string;
    fix: string;
  };
}

/**
 * Enhanced heddles enrichment that uses AAAArchi for validation.
 */
export function enrichManagementWithValidation(
  mgmt: ManagementMetadata
): EnrichedManagement {
  const scope = AAAArchi.forFile(import.meta.url);
  
  // Original spire-loom: follow link, get wrappers
  const linkMetadata = resolveLink(mgmt.link);
  
  // NEW: Validate the link path against DAG
  const fromLayer = scope.getContext().layer;
  const toLayer = linkMetadata?.targetLayer;
  
  if (toLayer && !scope.canCall(toLayer)) {
    // Invalid transition detected!
    return {
      ...mgmt,
      useResult: false,
      wrappers: [],
      validTargets: scope.getValidTargets(),
      _violation: {
        type: 'layer-skip',
        from: fromLayer,
        to: toLayer,
        explanation: `Management ${mgmt.name} links to ${toLayer} but ${fromLayer} cannot directly access it`,
        fix: `Add intermediate layer or move ${mgmt.name}`
      }
    };
  }
  
  // Record attempt for Orka retry tracking
  AAAArchi.recordAttempt(`${mgmt.name}:enrichment`, {
    layer: fromLayer,
    success: true
  });
  
  return {
    name: mgmt.name,
    useResult: linkMetadata?.structConfig?.useResult ?? false,
    wrappers: linkMetadata?.fieldWrappers ?? [],
    validTargets: scope.getValidTargets()
  };
}

// ============================================
// 3. TREADLE GENERATOR WITH FERROR
// ============================================

/**
 * Treadle generator with architectural validation.
 */
export async function generateValidatedService(
  mgmt: EnrichedManagement
): Promise<string> {
  const ferrorMod = ferroringModule();
  const scope = AAAArchi.forFile(import.meta.url);
  const ctx = scope.getContext();
  const ferror = ferrorMod[ctx.domain][ctx.layer];
  
  // Check for violations detected by heddles
  if (mgmt._violation) {
    throw ferror(
      new Error('Generator cannot proceed'),
      {
        function: 'generateValidatedService',
        stance: 'authoritative',
        summary: `Architecture violation in ${mgmt.name}`,
        explanation: mgmt._violation.explanation,
        suggestions: [
          { action: 'fix-architecture', message: mgmt._violation.fix },
          { action: 'view-dag', message: 'Run AAAArchi.buildProjectDAG() to see valid transitions' }
        ],
        context: {
          management: mgmt.name,
          violation: mgmt._violation
        },
        tags: ['generator-blocked', 'architectural-violation']
      }
    );
  }
  
  // Generate code...
  return renderServiceCode(mgmt);
}

// ============================================
// UTILITIES
// ============================================

function resolveLink(link?: string): any {
  return link ? { targetLayer: 'infrastructure', structConfig: {}, fieldWrappers: [] } : undefined;
}

function renderServiceCode(mgmt: EnrichedManagement): string {
  return `// Generated service for ${mgmt.name}`;
}
