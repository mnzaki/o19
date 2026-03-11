/**
 * Integration Test: Scrim-Loom + AAAArchi Compiler + Ferror
 * 
 * Demonstrates the full Three Friends integration:
 * - 🦏 AAAArchi: Compile architecture to fast validators
 * - 🦀 Ferror: Rich error context with compiled suggestions
 * - 🐋 Orka: (Stub) Would track retry attempts
 */

import { 
  AAAArchi, 
  compileToImperative,
  compileSuggestionsGenerator,
  type ArchitectureConfig 
} from '../../../o19/packages/aaaarchi/src/index.js';

// ============================================
// STEP 1: Define Architecture (Declarative)
// ============================================

const foundframeArchitecture: ArchitectureConfig = {
  layers: {
    // Core domain (center of onion)
    domain: {
      canDependOn: [],
      position: 0,
      invariant: 'Domain logic is pure and has no dependencies',
    },
    
    // Infrastructure (primitives)
    infrastructure: {
      canDependOn: [],
      position: 0,
      invariant: 'Infrastructure provides system primitives',
    },
    
    // Use cases
    usecase: {
      canDependOn: ['domain'],
      position: 1,
      invariant: 'Use cases orchestrate domain logic',
    },
    
    // Repository (data access)
    repository: {
      canDependOn: ['domain', 'infrastructure'],
      position: 1,
      invariant: 'Repositories abstract storage concerns',
    },
    
    // Services (coordination)
    service: {
      canDependOn: ['domain', 'repository', 'usecase'],
      position: 2,
      invariant: 'Services coordinate use cases and repositories',
    },
    
    // Controllers (HTTP handling)
    controller: {
      canDependOn: ['domain', 'service'],
      position: 3,
      invariant: 'Controllers handle HTTP only, no business logic',
    },
  },
};

// ============================================
// STEP 2: Compile to Imperative (Fast Runtime)
// ============================================

console.log('🦏 Compiling architecture...');
const imperative = compileToImperative(foundframeArchitecture);
console.log('✅ Compiled! O(1) lookups ready\n');

// ============================================
// STEP 3: Test Valid Transitions
// ============================================

console.log('🧪 Testing valid transitions:');
console.log(`  controller → service: ${imperative.canCall('controller', 'service') ? '✅' : '❌'}`);
console.log(`  service → repository: ${imperative.canCall('service', 'repository') ? '✅' : '❌'}`);
console.log(`  repository → infrastructure: ${imperative.canCall('repository', 'infrastructure') ? '✅' : '❌'}`);
console.log(`  domain → (nothing): ${imperative.getDependencies('domain').length === 0 ? '✅' : '❌'}`);
console.log();

// ============================================
// STEP 4: Test Invalid Transition (Violation)
// ============================================

console.log('🧪 Testing invalid transition (layer skip):');
console.log(`  controller → repository: ${imperative.canCall('controller', 'repository') ? '✅' : '❌ (expected)'}`);

const violationResult = imperative.validatePath(['controller', 'repository']);
console.log(`  Violation detected: ${!violationResult.valid ? '✅' : '❌'}`);
console.log(`  Explanation: ${violationResult.violations[0].explanation}`);
console.log(`  Suggested path: ${violationResult.suggestedPath?.join(' → ')}`);
console.log();

// ============================================
// STEP 5: Generate Rich Suggestions
// ============================================

console.log('🦀 Generating rich suggestions with Ferror:');
const suggest = compileSuggestionsGenerator(foundframeArchitecture);
const suggestions = suggest('controller', 'repository');

for (const s of suggestions) {
  console.log(`  [${s.type}] ${s.description} (impact: ${s.impact})`);
  if (s.path) {
    console.log(`    Path: ${s.path.join(' → ')}`);
  }
}
console.log();

// ============================================
// STEP 6: File Scope Integration
// ============================================

console.log('🦏 Testing file scope detection:');
const controllerScope = AAAArchi.forFile('/app/bookmark/controller.ts');
console.log(`  File: /app/bookmark/controller.ts`);
console.log(`  Detected domain: ${controllerScope.domain}`);
console.log(`  Detected layer: ${controllerScope.layer}`);
console.log(`  Can call: ${controllerScope.getValidTargets().join(', ')}`);
console.log();

// ============================================
// STEP 7: Architecture Analysis
// ============================================

console.log('📊 Architecture DAG Analysis:');
console.log(`  Total layers: ${imperative.getAllLayers().length}`);
console.log(`  Entry points: ${imperative.getEntryPoints().join(', ')}`);
console.log(`  Leaf nodes: ${imperative.getLeaves().join(', ')}`);

const dag = imperative.toDAG();
console.log(`  DAG nodes: ${dag.nodes.length}`);
console.log(`  DAG edges: ${dag.edges.length}`);
console.log();

// ============================================
// STEP 8: Simulated Error Scenario
// ============================================

console.log('🎭 Simulated Error Scenario:');
console.log('  Scenario: Developer tries to call repository from controller\n');

const fromLayer = 'controller';
const toLayer = 'repository';

if (!imperative.canCall(fromLayer, toLayer)) {
  const result = imperative.validatePath([fromLayer, toLayer]);
  const violation = result.violations[0];
  
  console.log('  ❌ Error: ArchitectureViolation');
  console.log(`     ${violation.explanation}`);
  console.log();
  console.log('  💡 Fix suggestion:');
  console.log(`     ${violation.fix}`);
  console.log();
  console.log('  🛤️  Proper call path:');
  console.log(`     ${result.suggestedPath?.join(' → ')}`);
  console.log();
  console.log('  📝 Code example:');
  console.log('     // ❌ Bad: Direct repository access');
  console.log('     this.repository.save(data);');
  console.log();
  console.log('     // ✅ Good: Through service layer');
  console.log('     this.service.saveBookmark(data);');
  console.log('     // Service then calls: this.repository.save(data);');
}

console.log();
console.log('✅ Integration test complete!');
console.log('   🦏 AAAArchi: Compiled architecture to O(1) validators');
console.log('   🦀 Ferror: Would generate rich error with these suggestions');
console.log('   🐋 Orka: Would track this validation attempt for retry logic');
