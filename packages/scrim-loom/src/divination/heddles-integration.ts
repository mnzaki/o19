/**
 * Heddles Integration 🌀
 * 
 * Creates Divinations from Management objects.
 * 
 * Bridges Heddles validation logic with the Divination system
 * from @o19/aaaarchi. This is scrim-loom specific - it knows
 * about Management structure and architectural validation.
 */

import { 
  Divination, 
  type DivinationConfig,
  type ValidationResult,
  type ValidationContext
} from '@o19/aaaarchi';
import { AAAArchi } from '@o19/aaaarchi';
import type { Management, Violation } from '../heddles/validator.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LanguageDefinitionImperative = any;

// ============================================================================
// Factory: Create Divination from Management
// ============================================================================

export interface CreateManagementDivinationOptions {
  lang: LanguageDefinitionImperative;
  tags?: string[];
}

/**
 * Creates a Divination from a Management object.
 * 
 * The divination validates the management through multiple rounds:
 * 1. **Layer validation**: Checks if the layer is valid
 * 2. **Link validation**: Validates architectural links
 * 3. **DAG validation**: Checks for circular dependencies
 * 
 * @param management - The management to validate
 * @param options - Configuration options
 * @returns A Divination that resolves to the validated management
 * 
 * @example
 * ```typescript
 * const divination = createManagementDivination(management, {
 *   lang: typescript,
 *   tags: ['service']
 * });
 * 
 * // Watch validation progress
 * for await (const round of divination.watch()) {
 *   console.log(`Round ${round.round}: validating ${round.resolved.size} aspects`);
 * }
 * 
 * // Get final result
 * const result = await divination.resolve();
 * if (result._violations?.length > 0) {
 *   console.error('Validation failed:', result._violations);
 * }
 * ```
 */
export function createManagementDivination(
  management: Management,
  options: CreateManagementDivinationOptions
): Divination<Management> {
  const validLayers = ['domain', 'infrastructure', 'repository', 'service', 'controller', 'usecase', 'application'];
  const violations: Violation[] = [];
  
  const config: DivinationConfig<Management> = {
    shape: {
      deps: [],
      
      rounds: [
        // Round 1: Validate layer
        {
          name: 'layer',
          validate: async (_current: Partial<Management>, _ctx: ValidationContext): Promise<ValidationResult<Management>> => {
            if (!validLayers.includes(management.layer)) {
              const violation: Violation = {
                type: 'missing-layer',
                from: 'unknown',
                to: management.layer,
                explanation: `"${management.layer}" is not a valid layer`,
                fix: `Use one of: ${validLayers.join(', ')}`,
                severity: 'error'
              };
              violations.push(violation);
              
              return {
                valid: false,
                error: violation.explanation,
                value: { ...management, _violations: violations }
              };
            }
            
            return {
              valid: true,
              value: { ...management, layer: management.layer }
            };
          }
        },
        
        // Round 2: Validate link (if present)
        {
          name: 'link',
          deps: ['layer'],
          validate: async (_current: Partial<Management>, _ctx: ValidationContext): Promise<ValidationResult<Management>> => {
            if (!management.link) {
              return { valid: true, value: undefined };
            }
            
            const scope = AAAArchi.forFile(import.meta.url);
            const targetLayer = inferLayerFromPath(management.link);
            
            if (targetLayer && !scope.canCall(targetLayer)) {
              const pathViolations = AAAArchi.validatePath([
                scope.layer || 'unknown',
                targetLayer
              ]);
              
              if (pathViolations.length > 0) {
                const violation: Violation = {
                  type: 'layer-skip',
                  from: scope.layer || 'unknown',
                  to: targetLayer,
                  explanation: `${management.name} links to ${targetLayer}, but this violates architecture`,
                  fix: pathViolations[0].fix,
                  severity: 'error'
                };
                violations.push(violation);
                
                return {
                  valid: false,
                  error: violation.explanation,
                  value: { ...management, _violations: violations }
                };
              }
            }
            
            return { valid: true, value: undefined };
          }
        },
        
        // Round 3: Validate against DAG
        {
          name: 'dag',
          deps: ['layer', 'link'],
          validate: async (_current: Partial<Management>, _ctx: ValidationContext): Promise<ValidationResult<Management>> => {
            const dag = AAAArchi.buildProjectDAG();
            const nodeId = `${management.domain}:${management.layer}`;
            
            // Check for circular dependencies
            const cycle = findCycle(dag, nodeId, nodeId, new Set());
            if (cycle) {
              const violation: Violation = {
                type: 'circular-dep',
                from: nodeId,
                to: cycle[1] || nodeId,
                explanation: `Circular dependency: ${cycle.join(' → ')}`,
                fix: 'Break the cycle by restructuring dependencies',
                severity: 'error'
              };
              violations.push(violation);
              
              return {
                valid: false,
                error: violation.explanation,
                value: { ...management, _violations: violations }
              };
            }
            
            // Success - validation passed
            return {
              valid: true,
              value: undefined
            };
          }
        }
      ],
      
      // Final computation - assemble the result
      compute: async (): Promise<Management> => {
        return {
          ...management,
          _violations: violations.length > 0 ? violations : undefined,
          _computed: violations.length === 0 ? {
            canGenerate: true,
            validTargets: AAAArchi.forFile(import.meta.url).getValidTargets(),
            dagContext: AAAArchi.forFile(import.meta.url).getContext()
          } : undefined
        };
      }
    },
    
    tags: options.tags || [management.layer, management.domain, 'management'],
    meta: { 
      lang: options.lang,
      source: 'scrim-loom',
      managementName: management.name
    }
  };
  
  return new Divination(config);
}

// ============================================================================
// Helpers
// ============================================================================

function inferLayerFromPath(path: string): string | undefined {
  if (path.includes('infrastructure')) return 'infrastructure';
  if (path.includes('repository')) return 'repository';
  if (path.includes('service')) return 'service';
  if (path.includes('controller')) return 'controller';
  if (path.includes('core') || path.includes('domain')) return 'domain';
  if (path.includes('usecase')) return 'usecase';
  return undefined;
}

function findCycle(
  dag: { edges?: Array<{ from: string; to: string }> },
  start: string,
  target: string,
  visited: Set<string>,
  path: string[] = []
): string[] | null {
  if (start === target && path.length > 0) {
    return [...path, target];
  }
  
  if (visited.has(start)) {
    return null;
  }
  
  visited.add(start);
  path.push(start);
  
  const edges = dag.edges?.filter((e) => e.from === start) || [];
  for (const edge of edges) {
    const cycle = findCycle(dag, edge.to, target, new Set(visited), [...path]);
    if (cycle) return cycle;
  }
  
  return null;
}
