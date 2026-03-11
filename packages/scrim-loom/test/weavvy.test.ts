/**
 * 🦡 Weavvy the Warthog Tests
 *
 * Tests the custom weaver that integrates AAAArchi + Ferror + Orka.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Weavvy, createWeavvy, scrimHeddles } from '../src/index.js';
import { AAAArchi } from '@o19/aaaarchi';

// ============================================
// AAAARCHI SETUP
// ============================================

beforeAll(() => {
  AAAArchi.forFile(import.meta.url, {
    domain: 'foundframe',
    layer: 'weaver',
    metadata: { purpose: 'testing' }
  });
});

// ============================================
// WEVVY CREATION
// ============================================

describe('Weavvy Creation', () => {
  it('should create a Weavvy instance', () => {
    const weavvy = createWeavvy();
    expect(weavvy).toBeInstanceOf(Weavvy);
  });
  
  it('should accept configuration', () => {
    const weavvy = createWeavvy({
      validateArchitecture: true,
      strictMode: false,
      saga: { maxRetries: 3 }
    });
    expect(weavvy).toBeInstanceOf(Weavvy);
  });
});

// ============================================
// ARCHITECTURE DAG
// ============================================

describe('Architecture DAG', () => {
  it('should get project DAG from Weavvy', () => {
    const weavvy = createWeavvy();
    const dag = weavvy.getArchitectureDAG();
    expect(dag).toHaveProperty('nodes');
    expect(dag).toHaveProperty('edges');
  });
});

// ============================================
// HEDDLES VALIDATION
// ============================================

describe('Scrim Heddles', () => {
  it('should enrich management with validation', () => {
    const management = scrimHeddles.enrich({
      name: 'TestManagement',
      layer: 'service',
      domain: 'foundframe',
      methods: [
        { name: 'createStream', returnType: 'Promise<Stream>', parameters: [] }
      ]
    });
    expect(management.name).toBe('TestManagement');
    expect(management.layer).toBe('service');
  });
  
  it('should detect invalid layer', () => {
    const management = scrimHeddles.enrich({
      name: 'BadManagement',
      layer: 'invalid-layer',
      domain: 'foundframe',
      methods: []
    });
    expect(management._violations).toBeDefined();
    expect(management._violations!.length).toBeGreaterThan(0);
    expect(management._violations![0].type).toBe('missing-layer');
  });
});

console.log('🦡 Weavvy tests loaded!');
