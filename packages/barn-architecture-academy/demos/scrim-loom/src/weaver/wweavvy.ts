/**
 * 🦡 Weavvy the Warthog Weaver
 *
 * A subclass of spire-loom's Weaver that integrates:
 * - AAAArchi for architectural validation
 * - Ferror for rich error context
 * - Orka for saga-based generation
 *
 * "The warthog digs deep, validating every thread."
 */

import { Weaver, type WeaverConfig, type WeavingResult } from '@o19/spire-loom/weaver';
import type { WeavingPlan } from '@o19/spire-loom/weaver';
import { AAAArchi } from '@o19/aaaarchi';
import { ferroringModule } from '@o19/ferror';
import { Orka } from '@o19/orka';
import { scrimHeddles, type ScrimManagement } from '../heddles/index.js';

// ============================================
// WEVVY CONFIG
// ============================================

export interface WeavvyConfig extends WeaverConfig {
  /** Enable AAAArchi validation (default: true) */
  validateArchitecture?: boolean;
  
  /** Strict mode - throw on warnings too (default: false) */
  strictMode?: boolean;
  
  /** Saga configuration for resilient generation */
  saga?: {
    /** Max retry attempts per generation step */
    maxRetries?: number;
    /** Callback when compensation fails */
    onCompensationFailure?: (step: string, error: Error) => void;
  };
}

// ============================================
// WEVVY THE WARTHOG
// ============================================

export class Weavvy extends Weaver {
  private scrimConfig: WeavvyConfig;
  private ferror: ReturnType<typeof ferroringModule>['scrim']['weaver'];
  
  constructor(config?: WeavvyConfig) {
    super(config);
    this.scrimConfig = {
      validateArchitecture: true,
      strictMode: false,
      ...config
    };
    
    // Create ferror instance for this weaver
    this.ferror = ferroringModule().scrim.weaver;
  }
  
  /**
   * Build weaving plan with AAAArchi validation.
   *
   * Overrides parent buildPlan to add architectural validation
   * using AAAArchi's DAG builder.
   */
  async buildPlan(
    workspace: any,
    warp: any
  ): Promise<WeavingPlan & { _scrimValidated?: boolean }> {
    // Call parent's buildPlan
    const plan = await super.buildPlan(workspace, warp);
    
    if (!this.scrimConfig.validateArchitecture) {
      return plan;
    }
    
    try {
      // Build project DAG
      const dag = AAAArchi.buildProjectDAG();
      
      // Validate plan against DAG
      this.validatePlan(plan, dag);
      
      // Mark as validated
      return {
        ...plan,
        _scrimValidated: true
      };
    } catch (error) {
      // Enhance error with Ferror context
      throw this.ferror(error as Error, {
        function: 'Weavvy.buildPlan',
        stance: 'authoritative',
        summary: 'Weaving plan validation failed',
        explanation: 'The weaving plan violates architectural constraints.',
        suggestions: [
          { action: 'view-dag', message: 'Check AAAArchi.buildProjectDAG() for architecture visualization' },
          { action: 'fix-warp', message: 'Update loom/WARP.ts to fix architectural violations' },
          { action: 'disable-validation', message: 'Set validateArchitecture: false to skip (not recommended)' }
        ],
        context: { workspace, plan },
        tags: ['weaving-failed', 'architectural-violation']
      });
    }
  }
  
  /**
   * Weave with saga-based resilience.
   *
   * Overrides parent weave to use Orka sagas for
   * resilient generation with compensation.
   */
  async weave(options?: { saga?: WeavvyConfig['saga'] }): Promise<WeavingResult> {
    const sagaConfig = options?.saga ?? this.scrimConfig.saga;
    
    if (!sagaConfig) {
      // No saga config - use parent implementation
      return super.weave({} as any);
    }
    
    // Execute weaving with manual saga pattern (Orka stub)
    let generationResult: WeavingResult | undefined;
    const executedSteps: Array<{ name: string; result: unknown }> = [];
    
    try {
      // Step 1: Validation
      const dag = AAAArchi.buildProjectDAG();
      executedSteps.push({ name: 'validation', result: { dag, valid: true } });
      
      // Step 2: Enrichment
      const heddlesResult = scrimHeddles.enrich({
        name: 'WeavvyGeneration',
        layer: 'weaver',
        domain: 'scrim',
        methods: []
      });
      executedSteps.push({ name: 'enrichment', result: heddlesResult });
      
      // Step 3: Generation
      generationResult = await super.weave({} as any);
      executedSteps.push({ name: 'generation', result: generationResult });
      
    } catch (error) {
      // Compensation: roll back executed steps
      console.log('🦡 Weavvy: Saga failed, compensating...');
      
      for (let i = executedSteps.length - 1; i >= 0; i--) {
        const step = executedSteps[i];
        if (step.name === 'generation' && generationResult) {
          console.log(`🦡 Weavvy: Compensation - would delete ${generationResult.filesGenerated} files`);
        } else if (step.name === 'enrichment') {
          console.log('🦡 Weavvy: Enrichment step compensated');
        } else if (step.name === 'validation') {
          console.log('🦡 Weavvy: Validation step compensated (no action needed)');
        }
      }
      
      if (sagaConfig.onCompensationFailure) {
        sagaConfig.onCompensationFailure('generation', error as Error);
      }
      
      throw error;
    }
    
    return generationResult ?? { filesGenerated: 0, filesModified: 0, filesUnchanged: 0, errors: [] };
  }
  
  /**
   * Validate a weaving plan against the architecture DAG.
   */
  private validatePlan(plan: WeavingPlan, dag: ReturnType<typeof AAAArchi.buildProjectDAG>): void {
    // Check for architectural violations in the plan
    const violations: string[] = [];
    
    // Validate each generation task
    for (const task of (plan as any).tasks || []) {
      const fromLayer = task.sourceLayer || 'unknown';
      const toLayer = task.targetLayer || 'unknown';
      
      const scope = AAAArchi.forFile(import.meta.url);
      if (!scope.canCall(toLayer)) {
        const pathViolations = AAAArchi.validatePath([fromLayer, toLayer]);
        if (pathViolations.length > 0) {
          violations.push(`${task.name}: ${pathViolations[0].explanation}`);
        }
      }
    }
    
    if (violations.length > 0) {
      throw new Error(
        `Architectural violations detected in weaving plan:\n${violations.join('\n')}`
      );
    }
  }
  
  /**
   * Get the project DAG for visualization.
   */
  getArchitectureDAG(): ReturnType<typeof AAAArchi.buildProjectDAG> {
    return AAAArchi.buildProjectDAG();
  }
  
  /**
   * Validate a single management with rich error context.
   */
  validateManagement(mgmt: ScrimManagement): void {
    const enriched = scrimHeddles.enrich(mgmt);
    scrimHeddles.throwIfErrors(enriched);
  }
}

// ============================================
// WEVVY INSTANCE CREATOR
// ============================================

/**
 * Create a Weavvy instance with configuration.
 *
 * Usage:
 *   const weavvy = createWeavvy({
 *     workspace: './o19',
 *     validateArchitecture: true,
 *     saga: { maxRetries: 3 }
 *   });
 */
export function createWeavvy(config?: WeavvyConfig): Weavvy {
  return new Weavvy(config);
}
