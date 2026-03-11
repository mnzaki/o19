/**
 * Examples: compileToImperative() Usage
 * 
 * Shows how the declarative → imperative compilation works
 * and the performance benefits of pre-computed validators.
 */

import {
  compileToImperative,
  compileContextValidator,
  compileChainValidator,
  compileSuggestionsGenerator,
  type ArchitectureConfig,
} from '@o19/aaaarchi';

// ============================================
// EXAMPLE 1: Basic Compilation
// ============================================

function example1_basicCompilation() {
  // LAYER 1: Declarative (what we want)
  const config: ArchitectureConfig = {
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
  
  // LAYER 2: Imperative (compiled - fast runtime)
  const imperative = compileToImperative(config);
  
  // O(1) lookups!
  console.log('Can controller call service?', imperative.canCall('controller', 'service'));
  // true
  
  console.log('Can controller call repository?', imperative.canCall('controller', 'repository'));
  // false
  
  // Pre-computed shortest path
  const path = imperative.getPath('controller', 'repository');
  console.log('Proper path:', path);
  // ['controller', 'service', 'repository']
}

// ============================================
// EXAMPLE 2: Path Validation
// ============================================

function example2_pathValidation() {
  const config: ArchitectureConfig = {
    layers: {
      controller: { canDependOn: ['service'], position: 3 },
      service: { canDependOn: ['repository'], position: 2 },
      repository: { canDependOn: ['infrastructure'], position: 1 },
      infrastructure: { canDependOn: [], position: 0 },
    },
  };
  
  const imperative = compileToImperative(config);
  
  // Valid path
  const valid = imperative.validatePath(['controller', 'service', 'repository']);
  console.log('Valid path result:', valid);
  // { valid: true, violations: [], suggestedPath: [...] }
  
  // Invalid path - layer skip
  const invalid = imperative.validatePath(['controller', 'repository']);
  console.log('Invalid path result:', invalid);
  // {
  //   valid: false,
  //   violations: [{
  //     type: 'layer-skip',
  //     from: 'controller',
  //     to: 'repository',
  //     explanation: 'Missing intermediate layer(s): service',
  //     fix: 'Use path: controller → service → repository',
  //     severity: 'error'
  //   }],
  //   suggestedPath: ['controller', 'service', 'repository']
  // }
}

// ============================================
// EXAMPLE 3: Context Validator (for Ferror)
// ============================================

function example3_contextValidator() {
  const config: ArchitectureConfig = {
    layers: {
      controller: { canDependOn: ['service'], position: 3 },
      service: { canDependOn: ['repository'], position: 2 },
      repository: { canDependOn: [], position: 1 },
    },
  };
  
  // Compile a validator function for reuse
  const validate = compileContextValidator(config);
  
  // Use in error handling
  const context = {
    domain: 'user',
    layer: 'controller',
    function: 'UserController.create',
    file: '/app/user/controller.ts',
    canDependOn: ['service'],
  };
  
  // Check if controller can call repository
  const result = validate(context, 'repository');
  
  if (!result.valid) {
    console.log('Violation:', result.violations[0].explanation);
    console.log('Suggested fix:', result.violations[0].fix);
    console.log('Proper path:', result.suggestedPath);
  }
}

// ============================================
// EXAMPLE 4: Chain Validator
// ============================================

function example4_chainValidator() {
  const config: ArchitectureConfig = {
    layers: {
      api: { canDependOn: ['service'], position: 4 },
      controller: { canDependOn: ['service'], position: 3 },
      service: { canDependOn: ['repository'], position: 2 },
      repository: { canDependOn: ['infrastructure'], position: 1 },
      infrastructure: { canDependOn: [], position: 0 },
    },
  };
  
  const validateChain = compileChainValidator(config);
  
  // Validate a call chain from error stack
  const callChain = ['api', 'controller', 'service', 'repository'];
  const result = validateChain(callChain);
  
  console.log('Chain valid:', result.valid);
  console.log('Violations:', result.violations);
  
  // Detect cycle
  const cycleChain = ['service', 'repository', 'service'];
  const cycleResult = validateChain(cycleChain);
  console.log('Cycle detected:', cycleResult.violations.some(v => v.type === 'cycle'));
}

// ============================================
// EXAMPLE 5: Suggestions Generator
// ============================================

function example5_suggestionsGenerator() {
  const config: ArchitectureConfig = {
    layers: {
      controller: { canDependOn: ['service', 'domain'], position: 3 },
      service: { canDependOn: ['repository', 'usecase'], position: 2 },
      repository: { canDependOn: ['infrastructure'], position: 1 },
      usecase: { canDependOn: ['domain'], position: 1 },
      infrastructure: { canDependOn: [], position: 0 },
      domain: { canDependOn: [], position: 0 },
    },
  };
  
  const getSuggestions = compileSuggestionsGenerator(config);
  
  // Get fix suggestions for a violation
  const suggestions = getSuggestions('controller', 'repository');
  
  console.log('Suggestions for controller → repository:');
  for (const s of suggestions) {
    console.log(`  [${s.type}] ${s.description} (impact: ${s.impact})`);
    if (s.path) {
      console.log(`    Path: ${s.path.join(' → ')}`);
    }
  }
  // Output:
  // [add-layer] Use intermediate layer(s): service (impact: medium)
  //   Path: controller → service → repository
  // [change-path] Alternative path: controller → domain → usecase → ...
  // [reconfigure] Allow controller to depend on repository... (impact: high)
}

// ============================================
// EXAMPLE 6: DAG Analysis
// ============================================

function example6_dagAnalysis() {
  const config: ArchitectureConfig = {
    layers: {
      controller: { canDependOn: ['service'], position: 3 },
      service: { canDependOn: ['repository'], position: 2 },
      repository: { canDependOn: ['infrastructure'], position: 1 },
      infrastructure: { canDependOn: [], position: 0 },
    },
  };
  
  const imperative = compileToImperative(config);
  
  // Structural analysis
  console.log('All layers:', imperative.getAllLayers());
  // ['controller', 'service', 'repository', 'infrastructure']
  
  console.log('Entry points:', imperative.getEntryPoints());
  // ['controller'] (no incoming edges)
  
  console.log('Leaf nodes:', imperative.getLeaves());
  // ['infrastructure'] (no outgoing edges)
  
  console.log('Dependencies of service:', imperative.getDependencies('service'));
  // ['repository']
  
  console.log('Dependents of repository:', imperative.getDependents('repository'));
  // ['service']
  
  console.log('Position in onion:', imperative.getPosition('controller'));
  // 3 (outer layer)
  
  // Generate DAG for visualization
  const dag = imperative.toDAG();
  console.log('DAG nodes:', dag.nodes.length);
  console.log('DAG edges:', dag.edges.length);
}

// ============================================
// EXAMPLE 7: Performance Comparison
// ============================================

function example7_performanceComparison() {
  const config: ArchitectureConfig = {
    layers: {
      controller: { canDependOn: ['service'], position: 3 },
      service: { canDependOn: ['repository'], position: 2 },
      repository: { canDependOn: ['infrastructure'], position: 1 },
      infrastructure: { canDependOn: [], position: 0 },
    },
  };
  
  // Compile once
  const imperative = compileToImperative(config);
  
  // Measure O(1) lookup
  console.time('O(1) lookup');
  for (let i = 0; i < 100000; i++) {
    imperative.canCall('controller', 'service');
  }
  console.timeEnd('O(1) lookup');
  // ~1ms
  
  // Measure path validation (also O(1) for pre-computed)
  console.time('Path validation');
  for (let i = 0; i < 100000; i++) {
    imperative.validatePath(['controller', 'service', 'repository']);
  }
  console.timeEnd('Path validation');
  // ~2ms
}

// ============================================
// EXAMPLE 8: Integration with Ferror
// ============================================

function example8_ferrorIntegration() {
  import { FerrorNext as Ferror } from '@o19/ferror';
  
  const config: ArchitectureConfig = {
    layers: {
      controller: { canDependOn: ['service'], position: 3 },
      service: { canDependOn: ['repository'], position: 2 },
      repository: { canDependOn: [], position: 1 },
    },
  };
  
  const imperative = compileToImperative(config);
  
  // In a controller trying to call repository directly
  const fromLayer = 'controller';
  const toLayer = 'repository';
  
  if (!imperative.canCall(fromLayer, toLayer)) {
    const result = imperative.validatePath([fromLayer, toLayer]);
    const violation = result.violations[0];
    
    throw Ferror.forFile(import.meta.url, new Error('Architecture violation'))
      .function('UserController.create')
      .stance('authoritative')
      .summary(violation.explanation)
      .explanation(`Attempted: ${fromLayer} → ${toLayer}`)
      .suggest('fix-violation', violation.fix)
      .withContext('proper_path', result.suggestedPath)
      .withContext('violation_type', violation.type)
      .build();
  }
}

// ============================================
// EXAMPLE 9: Caching Behavior
// ============================================

import { clearCompilationCache } from '@o19/aaaarchi';

function example9_caching() {
  const config: ArchitectureConfig = {
    layers: {
      a: { canDependOn: ['b'], position: 1 },
      b: { canDependOn: [], position: 0 },
    },
  };
  
  // First compilation
  const start1 = Date.now();
  const impl1 = compileToImperative(config);
  const time1 = Date.now() - start1;
  console.log(`First compile: ${time1}ms`);
  
  // Second compilation (cached)
  const start2 = Date.now();
  const impl2 = compileToImperative(config);
  const time2 = Date.now() - start2;
  console.log(`Second compile (cached): ${time2}ms`);
  // Much faster!
  
  // Same instance
  console.log('Same instance?', impl1 === impl2);
  // true
  
  // Clear cache
  clearCompilationCache();
  
  // Third compilation (not cached)
  const start3 = Date.now();
  const impl3 = compileToImperative(config);
  const time3 = Date.now() - start3;
  console.log(`Third compile (after clear): ${time3}ms`);
  // Similar to first
}

// Export examples
export {
  example1_basicCompilation,
  example2_pathValidation,
  example3_contextValidator,
  example4_chainValidator,
  example5_suggestionsGenerator,
  example6_dagAnalysis,
  example7_performanceComparison,
  example8_ferrorIntegration,
  example9_caching,
};
