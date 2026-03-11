/**
 * Example: Ferror using AAAArchi's domain:layer abstractions
 * 
 * This shows how the improved Ferror API uses AAAArchi directly
 * instead of duplicating domain:layer concepts.
 */

import { AAAArchi, findLayerPath, generateSuggestions, toMermaid } from '@o19/aaaarchi';
import { FerrorNext as Ferror } from '@o19/ferror';

// ============================================
// EXAMPLE 1: Basic Error with Auto-Resolved Context
// ============================================

function example1_basic() {
  // Old way (duplicating AAAArchi's domain:layer):
  // const ferror = ferrorMod.user.service;
  // throw ferror(error, { ... });
  
  // New way (using AAAArchi's abstraction):
  try {
    // Some code that fails
    throw new Error('Database connection failed');
  } catch (e) {
    // Ferror.forFile() uses AAAArchi.forFile() to auto-resolve domain:layer
    throw Ferror.forFile(import.meta.url, e as Error)
      .function('UserService.create')
      .stance('authoritative')
      .summary('Failed to create user')
      .explanation('The database connection failed. This may be due to network issues.')
      .suggest('check-connection', 'Verify database is reachable')
      .suggest('retry', 'Retry with exponential backoff')
      .build();
  }
}

// ============================================
// EXAMPLE 2: Architectural Violation Detection
// ============================================

function example2_violationDetection() {
  // Simulate a controller trying to call repository directly
  const scope = AAAArchi.forFile('/app/user/controller.ts');
  
  // This would be detected as a violation
  if (!scope.canCall('repository')) {
    const error = new Error('Direct repository access');
    
    // Ferror automatically includes violation analysis
    const ferror = Ferror.forFile('/app/user/controller.ts', error)
      .function('UserController.create')
      .stance('authoritative')
      .summary('Controller cannot directly access repository')
      .explanation('This violates the layered architecture')
      .suggestFromAnalysis()  // Auto-adds suggestions from DAG analysis
      .build();
    
    // Get rich violation info
    const violations = ferror.getViolations();
    console.log('Violations:', violations);
    
    // Format for display
    console.log(ferror.format());
    
    throw ferror;
  }
}

// ============================================
// EXAMPLE 3: Using AAAArchi Utilities for Rich Context
// ============================================

function example3_richContext() {
  const error = new Error('Invalid transition');
  const fromLayer = 'controller';
  const toLayer = 'repository';
  
  // Use AAAArchi's default config
  const defaultConfig = {
    layers: {
      controller: { canDependOn: ['service'], position: 3 },
      service: { canDependOn: ['repository'], position: 2 },
      repository: { canDependOn: ['infrastructure'], position: 1 },
      infrastructure: { canDependOn: [], position: 0 },
    }
  };
  
  // Find the proper path
  const properPath = findLayerPath(defaultConfig.layers, fromLayer, toLayer);
  console.log(`Proper path: ${properPath?.join(' → ')}`);
  // Output: controller → service → repository
  
  // Generate suggestions
  const suggestions = generateSuggestions(defaultConfig.layers, fromLayer, toLayer);
  console.log('Suggestions:', suggestions);
  // Output: [{ type: 'add-layer', description: 'Add service between...', ... }]
  
  // Build error with suggestions
  throw Ferror.forFile(import.meta.url, error)
    .summary('Layer skip detected')
    .explanation(`Direct ${fromLayer} → ${toLayer} is not allowed`)
    .suggest('add-service', `Use path: ${properPath?.join(' → ')}`)
    .build();
}

// ============================================
// EXAMPLE 4: Decorator with Fresh Context
// ============================================

// Using the improved decorator that resolves context at error time
import { ferrorHandler } from '@o19/ferror';

class UserService {
  @ferrorHandler((ctx) => ({
    stance: 'authoritative',
    summary: `Failed in ${ctx.archContext.layer}`,
    // Context is fresh - resolved at error time, not decoration time
  }))
  async createUser(data: unknown) {
    // If this throws, the decorator catches and wraps with Ferror
    // using the ACTUAL file context where the error occurred
    return await databaseInsert(data);
  }
}

// ============================================
// EXAMPLE 5: DAG Visualization in Errors
// ============================================

function example5_visualization() {
  const dag = AAAArchi.buildProjectDAG();
  
  // Generate Mermaid diagram for documentation
  const mermaid = toMermaid(dag);
  console.log('Architecture DAG:');
  console.log(mermaid);
  /*
  graph TD
    user_controller[user:controller]
    user_service[user:service]
    user_repository[user:repository]
    user_controller --> user_service
    user_service --> user_repository
  */
  
  // Include in error for rich debugging
  const error = Ferror.forFile(import.meta.url, new Error('Violation'))
    .summary('Architecture violation detected')
    .withContext('dag_diagram', mermaid)
    .withContext('valid_targets', ['service', 'domain'])
    .build();
  
  throw error;
}

// ============================================
// EXAMPLE 6: Explicit Override (Rarely Needed)
// ============================================

function example6_explicitOverride() {
  // Usually you want auto-resolution, but sometimes you need explicit
  // e.g., when forwarding errors from another domain
  
  const originalError = new Error('Payment failed');
  
  // Explicitly set domain:layer when needed
  throw Ferror.forDomainLayer('payment', 'service', originalError)
    .function('PaymentService.charge')
    .stance('authoritative')
    .summary('Payment processing failed')
    .build();
}

// ============================================
// COMPARISON: Old vs New API
// ============================================

function comparison_oldVsNew() {
  const error = new Error('Something failed');
  
  // OLD API - Duplicates AAAArchi's domain:layer
  // const ferrorMod = ferroringModule();
  // const ferror = ferrorMod.user.service;  // Hardcoded "user:service"
  // throw ferror(error, {
  //   function: 'createUser',
  //   stance: 'authoritative',
  //   summary: 'Failed',
  //   // domain: 'user', layer: 'service' auto-injected
  // });
  
  // NEW API - Uses AAAArchi's abstractions
  throw Ferror.forFile(import.meta.url, error)
    .function('createUser')
    .stance('authoritative')
    .summary('Failed')
    // domain:layer auto-resolved from file path via AAAArchi.forFile()
    .build();
}

// Mock for example
async function databaseInsert(data: unknown) {
  return data;
}

// Export examples
export {
  example1_basic,
  example2_violationDetection,
  example3_richContext,
  example5_visualization,
  example6_explicitOverride,
};
