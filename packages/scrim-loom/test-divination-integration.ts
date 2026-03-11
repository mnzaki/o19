/**
 * Divination Integration Test 🌀
 * 
 * Demonstrates the new async divination system integrated with scrim-loom.
 * 
 * Divination Engine now lives in @o19/aaaarchi (the foundation layer).
 * Scrim-loom provides the integration with Heddles for Management validation.
 */

import {
  Divination,
  DivinationProvider,
  createManagementDivination,
  resolveWithTracking,
  heddles
} from './src/index.js';
import type { Management } from './src/heddles/validator.js';

// Mock language for testing
const mockLang = {
  name: 'typescript',
  extensions: ['.ts'],
  codeGen: {
    types: {} as any,
    rendering: {
      formatParam: (name: string) => name,
      renderParams: (params: string[]) => params.join(', '),
      functionSignature: () => 'test()',
      renderDefinition: () => 'test() {}',
      renderEntityField: () => 'field: Type',
      renderEntityFields: () => 'field1, field2',
      renderEntityClass: () => 'class Entity {}'
    }
  }
} as any;

// ============================================================================
// Test 1: Create Divination from Management
// ============================================================================

async function testCreateDivination() {
  console.log('━'.repeat(60));
  console.log('Test 1: Create Divination from Management');
  console.log('━'.repeat(60));
  
  const management: Management = {
    name: 'UserMgmt',
    layer: 'service',
    domain: 'foundframe',
    link: 'foundframe.inner.core.user',
    methods: [
      { name: 'createUser', operation: 'create', returnType: 'User', parameters: [] }
    ]
  };
  
  console.log('\n  Creating divination for management:');
  console.log(`    Name: ${management.name}`);
  console.log(`    Layer: ${management.layer}`);
  console.log(`    Link: ${management.link}`);
  
  // Create divination using heddles
  const divination = createManagementDivination(management, {
    lang: mockLang,
    tags: ['service', 'user']
  });
  
  console.log(`\n  Created Divination:`);
  console.log(`    ID: ${divination.id}`);
  console.log(`    Tags: ${divination.tags.join(', ')}`);
  console.log(`    Resolved: ${divination.resolved}`);
  
  return divination;
}

// ============================================================================
// Test 2: Watch Resolution Rounds
// ============================================================================

async function testWatchRounds(divination: Divination<Management>) {
  console.log('\n' + '━'.repeat(60));
  console.log('Test 2: Watch Resolution Rounds');
  console.log('━'.repeat(60));
  
  console.log('\n  Resolving with round tracking...\n');
  
  for await (const round of divination.watch()) {
    console.log(`  Round ${round.round}:`);
    console.log(`    Complete: ${round.complete}`);
    console.log(`    Resolved deps: ${round.resolved.size}`);
    if (round.value) {
      console.log(`    Has _computed: ${!!round.value._computed}`);
      console.log(`    Violations: ${round.value._violations?.length || 0}`);
    }
  }
  
  console.log(`\n  Final state:`);
  console.log(`    Resolved: ${divination.resolved}`);
  console.log(`    Value name: ${divination.value.name}`);
}

// ============================================================================
// Test 3: Batch Resolution with Provider
// ============================================================================

async function testBatchResolution() {
  console.log('\n' + '━'.repeat(60));
  console.log('Test 3: Batch Resolution with Provider');
  console.log('━'.repeat(60));
  
  const managements: Management[] = [
    {
      name: 'UserMgmt',
      layer: 'service',
      domain: 'foundframe',
      methods: []
    },
    {
      name: 'PostMgmt', 
      layer: 'service',
      domain: 'foundframe',
      methods: []
    },
    {
      name: 'BookmarkMgmt',
      layer: 'repository',
      domain: 'foundframe',
      methods: []
    }
  ];
  
  console.log('\n  Creating divinations:');
  const divinations = managements.map(m => {
    const div = createManagementDivination(m, { lang: mockLang });
    console.log(`    - ${m.name} (${m.layer}) → ${div.id}`);
    return div;
  });
  
  console.log('\n  Resolving with provider...\n');
  
  const provider = new DivinationProvider({
    onRoundComplete: (batch) => {
      console.log(`    Batch round ${batch.round}:`);
      console.log(`      Resolved: ${batch.resolved.length}`);
      console.log(`      Pending: ${batch.pending.length}`);
      console.log(`      Errors: ${batch.errors.size}`);
    }
  });
  
  const { values, rounds, errors } = await provider.resolveAllToValues(divinations);
  
  console.log(`\n  Final result:`);
  console.log(`    Total rounds: ${rounds}`);
  console.log(`    Resolved values: ${values.length}`);
  console.log(`    Errors: ${errors.size}`);
  
  values.forEach(v => {
    if (v) {
      console.log(`      - ${v.name}: canGenerate=${v._computed?.canGenerate}`);
    }
  });
}

// ============================================================================
// Test 4: resolveWithTracking Helper
// ============================================================================

async function testResolveWithTracking() {
  console.log('\n' + '━'.repeat(60));
  console.log('Test 4: resolveWithTracking Helper');
  console.log('━'.repeat(60));
  
  const management: Management = {
    name: 'MediaMgmt',
    layer: 'controller',
    domain: 'foundframe',
    methods: []
  };
  
  const divination = createManagementDivination(management, { lang: mockLang });
  
  console.log('\n  Using resolveWithTracking()...');
  const { value, rounds } = await resolveWithTracking(divination);
  
  console.log(`\n  Result:`);
  console.log(`    Value: ${value.name}`);
  console.log(`    Rounds: ${rounds}`);
}

// ============================================================================
// Test 5: Template Rendering (Placeholder Pattern)
// ============================================================================

async function testTemplateRendering() {
  console.log('\n' + '━'.repeat(60));
  console.log('Test 5: Template Rendering');
  console.log('━'.repeat(60));
  
  const management: Management = {
    name: 'StreamMgmt',
    layer: 'service',
    domain: 'foundframe',
    methods: []
  };
  
  const divination = createManagementDivination(management, { lang: mockLang });
  
  console.log('\n  Template rendering:');
  console.log(`    Before resolve: ${divination.toString()}`);
  
  await divination.resolve();
  
  console.log(`    After resolve: ${divination.toString().substring(0, 50)}...`);
}

// ============================================================================
// Test 6: Using AAAArchi Divination Directly
// ============================================================================

async function testAAAArchiDivination() {
  console.log('\n' + '━'.repeat(60));
  console.log('Test 6: AAAArchi Divination (Foundation Layer)');
  console.log('━'.repeat(60));
  
  // Using the divination API directly from @o19/aaaarchi
  const { createSimpleDivination, createDivinationProvider } = await import('@o19/aaaarchi');
  
  const cacheDiv = createSimpleDivination(
    async () => ({ source: 'cache', data: 'cached_value' }),
    { tags: ['cache'] }
  );
  
  const networkDiv = createSimpleDivination(
    async () => ({ source: 'network', data: 'fresh_value' }),
    { tags: ['network'] }
  );
  
  console.log('\n  Created divinations using @o19/aaaarchi:');
  console.log(`    Cache div: ${cacheDiv.id}`);
  console.log(`    Network div: ${networkDiv.id}`);
  
  const provider = createDivinationProvider({
    onProgress: (batch) => {
      console.log(`    Progress: ${batch.resolved.length}/${batch.resolved.length + batch.pending.length}`);
    }
  });
  
  const result = await provider.resolveAllToValues([cacheDiv, networkDiv]);
  
  console.log(`\n  Resolved ${result.values.length} values in ${result.rounds} rounds`);
  result.values.forEach((v, i) => {
    if (v && typeof v === 'object' && 'source' in v) {
      console.log(`    [${i}] ${v.source}: ${v.data}`);
    }
  });
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     🦡 Divination Integration Test - Scrim-Loom 🌀            ║');
  console.log('║     Async, multi-round architectural validation                ║');
  console.log('║                                                                ║');
  console.log('║     Divination Engine: @o19/aaaarchi (foundation)             ║');
  console.log('║     Integration: @o19/scrim-loom (scrim-loom specific)        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  try {
    const divination = await testCreateDivination();
    await testWatchRounds(divination);
    await testBatchResolution();
    await testResolveWithTracking();
    await testTemplateRendering();
    await testAAAArchiDivination();
    
    console.log('\n' + '═'.repeat(60));
    console.log('                    All Tests Passed! ✅');
    console.log('═'.repeat(60));
    console.log('\nKey features demonstrated:');
    console.log('  • createManagementDivination() - scrim-loom integration');
    console.log('  • divination.watch() - round-by-round progress');
    console.log('  • DivinationProvider - batch resolution');
    console.log('  • resolveWithTracking() - convenient helper');
    console.log('  • toString() - template placeholder pattern');
    console.log('  • @o19/aaaarchi - foundation layer divination API');
    console.log('');
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
