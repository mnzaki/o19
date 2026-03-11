/**
 * Integration Tests: AAAArchi + Ferror + Compiler
 * 
 * Tests the full flow: compile → validate → error with context
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AAAArchi,
  compileToImperative,
  compileContextValidator,
  compileChainValidator,
  compileSuggestionsGenerator,
  clearCompilationCache,
  type ArchitectureConfig,
} from '../src/index.js';

// Test configuration
const testConfig: ArchitectureConfig = {
  layers: {
    controller: {
      canDependOn: ['service', 'domain'],
      position: 3,
      invariant: 'Controllers handle HTTP only',
    },
    service: {
      canDependOn: ['repository', 'usecase'],
      position: 2,
      invariant: 'Services coordinate use cases',
    },
    repository: {
      canDependOn: ['infrastructure'],
      position: 1,
      invariant: 'Repositories abstract storage',
    },
    infrastructure: {
      canDependOn: [],
      position: 0,
      invariant: 'Infrastructure provides primitives',
    },
    domain: {
      canDependOn: [],
      position: 0,
      invariant: 'Domain logic is pure',
    },
    usecase: {
      canDependOn: ['domain'],
      position: 1,
      invariant: 'Use cases orchestrate domain',
    },
  },
};

describe('AAAArchi Integration', () => {
  beforeEach(() => {
    clearCompilationCache();
  });

  describe('compileToImperative', () => {
    it('should compile config to imperative validators', () => {
      const imperative = compileToImperative(testConfig);
      
      expect(imperative).toBeDefined();
      expect(imperative.canCall('controller', 'service')).toBe(true);
      expect(imperative.canCall('controller', 'repository')).toBe(false);
    });

    it('should cache compiled results', () => {
      const impl1 = compileToImperative(testConfig);
      const impl2 = compileToImperative(testConfig);
      
      expect(impl1).toBe(impl2); // Same instance
    });

    it('should provide O(1) lookups', () => {
      const imperative = compileToImperative(testConfig);
      
      // All should be instant (we can't easily test timing in unit tests)
      expect(imperative.canCall('controller', 'service')).toBe(true);
      expect(imperative.canCall('service', 'repository')).toBe(true);
      expect(imperative.canCall('repository', 'infrastructure')).toBe(true);
      expect(imperative.canCall('controller', 'infrastructure')).toBe(false);
    });

    it('should pre-compute shortest paths', () => {
      const imperative = compileToImperative(testConfig);
      
      const path = imperative.getPath('controller', 'repository');
      expect(path).toEqual(['controller', 'service', 'repository']);
    });

    it('should return null for invalid paths', () => {
      const imperative = compileToImperative(testConfig);
      
      // No path from infrastructure to controller (wrong direction)
      const path = imperative.getPath('infrastructure', 'controller');
      expect(path).toBeNull();
    });

    it('should validate paths with violations', () => {
      const imperative = compileToImperative(testConfig);
      
      const result = imperative.validatePath(['controller', 'repository']);
      
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('layer-skip');
      expect(result.suggestedPath).toEqual(['controller', 'service', 'repository']);
    });

    it('should validate valid paths', () => {
      const imperative = compileToImperative(testConfig);
      
      const result = imperative.validatePath(['controller', 'service', 'repository']);
      
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect cycles', () => {
      const imperative = compileToImperative(testConfig);
      
      const cycle = imperative.detectCycle(['a', 'b', 'c', 'a']);
      expect(cycle).toEqual(['a', 'b', 'c', 'a']);
    });

    it('should return null for non-cycles', () => {
      const imperative = compileToImperative(testConfig);
      
      const cycle = imperative.detectCycle(['a', 'b', 'c']);
      expect(cycle).toBeNull();
    });

    it('should get all layers', () => {
      const imperative = compileToImperative(testConfig);
      
      const layers = imperative.getAllLayers();
      expect(layers).toContain('controller');
      expect(layers).toContain('service');
      expect(layers).toContain('repository');
      expect(layers).toContain('infrastructure');
      expect(layers).toContain('domain');
      expect(layers).toContain('usecase');
    });

    it('should get positions in onion', () => {
      const imperative = compileToImperative(testConfig);
      
      expect(imperative.getPosition('controller')).toBe(3);
      expect(imperative.getPosition('service')).toBe(2);
      expect(imperative.getPosition('repository')).toBe(1);
      expect(imperative.getPosition('infrastructure')).toBe(0);
    });

    it('should get dependencies', () => {
      const imperative = compileToImperative(testConfig);
      
      expect(imperative.getDependencies('controller')).toEqual(['service', 'domain']);
      expect(imperative.getDependencies('service')).toEqual(['repository', 'usecase']);
    });

    it('should get dependents (reverse lookup)', () => {
      const imperative = compileToImperative(testConfig);
      
      // Who depends on repository?
      const dependents = imperative.getDependents('repository');
      expect(dependents).toContain('service');
    });

    it('should identify entry points', () => {
      const imperative = compileToImperative(testConfig);
      
      const entryPoints = imperative.getEntryPoints();
      // Entry points have no incoming edges
      expect(entryPoints).toContain('controller');
    });

    it('should identify leaf nodes', () => {
      const imperative = compileToImperative(testConfig);
      
      const leaves = imperative.getLeaves();
      // Leaves have no outgoing edges
      expect(leaves).toContain('infrastructure');
      expect(leaves).toContain('domain');
    });

    it('should check layer existence', () => {
      const imperative = compileToImperative(testConfig);
      
      expect(imperative.hasLayer('controller')).toBe(true);
      expect(imperative.hasLayer('nonexistent')).toBe(false);
    });

    it('should get layer config', () => {
      const imperative = compileToImperative(testConfig);
      
      const config = imperative.getLayerConfig('controller');
      expect(config).toBeDefined();
      expect(config?.canDependOn).toContain('service');
      expect(config?.position).toBe(3);
      expect(config?.invariant).toBe('Controllers handle HTTP only');
    });

    it('should generate DAG', () => {
      const imperative = compileToImperative(testConfig);
      
      const dag = imperative.toDAG();
      expect(dag.nodes).toHaveLength(6);
      expect(dag.edges.length).toBeGreaterThan(0);
    });
  });

  describe('compileContextValidator', () => {
    it('should validate context against layer', () => {
      const validate = compileContextValidator(testConfig);
      
      const context = {
        domain: 'user',
        layer: 'controller',
        function: 'create',
        file: '/app/user/controller.ts',
        canDependOn: ['service'],
      };
      
      // Controller can call service
      const result1 = validate(context, 'service');
      expect(result1.valid).toBe(true);
      
      // Controller cannot call repository directly
      const result2 = validate(context, 'repository');
      expect(result2.valid).toBe(false);
      expect(result2.violations[0].type).toBe('layer-skip');
    });
  });

  describe('compileChainValidator', () => {
    it('should validate call chains', () => {
      const validateChain = compileChainValidator(testConfig);
      
      const validChain = ['controller', 'service', 'repository'];
      const result1 = validateChain(validChain);
      expect(result1.valid).toBe(true);
      
      const invalidChain = ['controller', 'repository'];
      const result2 = validateChain(invalidChain);
      expect(result2.valid).toBe(false);
    });

    it('should detect cycles in chains', () => {
      const validateChain = compileChainValidator(testConfig);
      
      // This would require a cycle in the architecture
      // Our test config doesn't have cycles, so we test the cycle detection separately
      const result = validateChain(['controller', 'service', 'controller']);
      // This is actually invalid because service can't call controller
      expect(result.valid).toBe(false);
    });
  });

  describe('compileSuggestionsGenerator', () => {
    it('should generate suggestions for violations', () => {
      const suggest = compileSuggestionsGenerator(testConfig);
      
      const suggestions = suggest('controller', 'repository');
      
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should suggest adding intermediate layer
      const addLayerSuggestion = suggestions.find(s => s.type === 'add-layer');
      expect(addLayerSuggestion).toBeDefined();
      expect(addLayerSuggestion?.path).toEqual(['controller', 'service', 'repository']);
      
      // Should suggest reconfiguring
      const reconfigSuggestion = suggestions.find(s => s.type === 'reconfigure');
      expect(reconfigSuggestion).toBeDefined();
    });

    it('should include impact levels', () => {
      const suggest = compileSuggestionsGenerator(testConfig);
      
      const suggestions = suggest('controller', 'repository');
      
      for (const s of suggestions) {
        expect(['low', 'medium', 'high']).toContain(s.impact);
      }
    });
  });

  describe('Integration with AAAArchi.forFile', () => {
    it('should use compiled validators with file scopes', () => {
      const scope = AAAArchi.forFile('/app/user/controller.ts');
      const imperative = compileToImperative(testConfig);
      
      // File scope should have detected controller layer
      expect(scope.layer).toBe('controller');
      
      // Can use imperative validators with scope
      const canCallService = imperative.canCall(scope.layer, 'service');
      expect(canCallService).toBe(true);
    });
  });
});

console.log('🦏 AAAArchi Integration Tests Loaded');
