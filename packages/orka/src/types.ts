/**
 * Orka - Organized Retrying and Kuul Administration
 * 
 * The orchestration layer: sagas, retries, circuit breakers, audit logging.
 * Built on Ferror and AAAArchi.
 * 
 * "The orca that coordinates the pod"
 */

import type { Ferror, ErrorAnnotation } from '@o19/ferror';

// ============================================
// ORKA ANNOTATION (extends ErrorAnnotation)
// ============================================

/**
 * Orka extends errors with orchestration context.
 * Built on Ferror, which is built on AAAArchi.
 */
export interface OrkaAnnotation extends ErrorAnnotation {
  /** Saga identifier for distributed transactions */
  sagaId?: string;
  
  /** Step index within the saga */
  stepIndex?: number;
  
  /** Retry attempt number */
  attemptNumber?: number;
  
  /** Circuit breaker state */
  circuitState?: 'closed' | 'open' | 'half-open';
  
  /** Compensation function for rollback */
  compensation?: () => Promise<void>;
  
  /** Audit log entry ID */
  auditId?: string;
  
  /** Performance timing */
  timing?: {
    start: number;
    end: number;
    duration: number;
  };
}

// ============================================
// SAGA
// ============================================

export interface SagaStep {
  /** Layer where this step executes */
  layer: string;
  
  /** Execute the step */
  execute: (...args: unknown[]) => Promise<unknown>;
  
  /** Compensate (undo) if saga fails */
  compensate: (result: unknown) => Promise<void>;
}

export interface SagaConfig {
  steps: SagaStep[];
  onCompensationFailure?: (step: SagaStep, error: Error, chain: Ferror[]) => Ferror;
}

// ============================================
// RETRY
// ============================================

export type RetryDecision = 'retry' | 'escalate' | 'fail';

export interface RetryConfig {
  /** Maximum attempts before giving up */
  maxAttempts?: number;
  
  /** 
   * Strategy function decides what to do next.
   * Receives the ferror chain and attempt history.
   */
  strategy: (chain: Ferror[], attemptHistory: Array<{
    layer: string;
    timestamp: number;
    success: boolean;
  }>) => RetryDecision | { decision: RetryDecision; delay?: number };
  
  /** Called when escalating to parent layer */
  onEscalate?: (error: Ferror) => Ferror;
}

// ============================================
// CIRCUIT BREAKER
// ============================================

export interface CircuitConfig {
  /** The DAG edge to monitor (e.g., 'service.repository') */
  edge: string;
  
  /** Failures before opening circuit */
  failureThreshold: number;
  
  /** Time before attempting recovery (ms) */
  recoveryTimeout: number;
  
  /** Called when circuit is open */
  onOpen?: (state: CircuitState) => Ferror | 'allow';
  
  /** Fallback value/function when circuit is open */
  fallback?: (error: Ferror) => unknown;
}

export interface CircuitState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailure?: number;
  openedAt?: number;
}

// ============================================
// AUDIT
// ============================================

export interface AuditConfig {
  /** Operation name */
  operation: string;
  
  /** Classify sensitivity level */
  classify?: (args: unknown[]) => 'standard' | 'sensitive' | 'critical';
  
  /** Called after execution for logging */
  onAudit?: (record: AuditRecord) => void | Promise<void>;
}

export interface AuditRecord {
  auditId: string;
  operation: string;
  timestamp: number;
  success: boolean;
  classification: string;
  chain: Array<{
    domain: string;
    layer: string;
    function: string;
  }>;
  context?: Record<string, unknown>;
  error?: Error;
}

// ============================================
// TIMING
// ============================================

export interface TimingConfig {
  /** Called after execution with timing data */
  onComplete: (result: {
    duration: number;
    error?: Error;
    chain: Ferror[];
  }) => void | Promise<void>;
}

// ============================================
// ORKA API
// ============================================

/**
 * The Orka orchestration API.
 * 
 * Usage:
 *   @Orka.saga({ steps: [...] })
 *   @Orka.retry({ strategy: ... })
 *   @Orka.circuit({ edge: 'service.repository' })
 *   @Orka.audit({ operation: 'updateUser' })
 *   @Orka.timed({ onComplete: ... })
 */
export interface OrkaAPI {
  saga(config: SagaConfig): MethodDecorator;
  retry(config: RetryConfig): MethodDecorator;
  circuit(config: CircuitConfig): MethodDecorator;
  audit(config: AuditConfig): MethodDecorator;
  timed(config: TimingConfig): MethodDecorator;
}
