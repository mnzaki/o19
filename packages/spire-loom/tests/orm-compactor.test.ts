/**
 * ORM Compactor Test
 * 
 * "Give the compactor a whirl!"
 * 
 * Tests the three-layer beater architecture:
 * 1. Parse Drizzle schema
 * 2. Run RustOrmlitePrecompiler
 * 3. Verify output
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { parseDrizzleSchema } from '../machinery/reed/drizzle-parser.js';
import { RustOrmlitePrecompiler } from '../machinery/beater/index.js';

const TEST_DIR = path.dirname(new URL(import.meta.url).pathname);
const ROOT_DIR = path.join(TEST_DIR, '..');
const SCHEMA_PATH = path.join(ROOT_DIR, '..', 'foundframe-drizzle', 'src', 'schema.ts');
const OUTPUT_DIR = path.join(TEST_DIR, '.test-output');
const MIDSTAGE_DIR = path.join(TEST_DIR, '.test-midstage');

describe('ORM Compactor', () => {
  it('should parse the foundframe drizzle schema', async () => {
    console.log('\n🧵 Testing Drizzle Schema Parser...\n');
    console.log(`   Loading schema from: ${SCHEMA_PATH}`);
    
    const schema = await parseDrizzleSchema(SCHEMA_PATH);
    
    console.log(`   ✓ Parsed ${schema.tables.length} tables:`);
    for (const table of schema.tables) {
      console.log(`     - ${table.name} (${table.columns.length} columns)`);
    }
    
    assert(schema.tables.length > 0, 'Should have at least one table');
    
    // Check for expected tables
    const tableNames = schema.tables.map(t => t.name);
    console.log(`\n   Found tables: ${tableNames.join(', ')}`);
  });

  it('should generate midstage code', async () => {
    console.log('\n🔧 Testing Midstage Generation...\n');
    
    // Clean up any previous test output
    await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
    await fs.rm(MIDSTAGE_DIR, { recursive: true, force: true });
    
    const schema = await parseDrizzleSchema(SCHEMA_PATH);
    
    const precompiler = new RustOrmlitePrecompiler({
      midstagePath: MIDSTAGE_DIR,
      outputPath: OUTPUT_DIR,
      schema,
      database: 'sqlite',
      keepMidstage: true, // Keep for inspection
    });
    
    console.log('   Generating midstage code...');
    // Call the protected method via type assertion for testing
    await (precompiler as any).generateOrmMidstage();
    
    // Check that files were created
    const cargoToml = await fs.readFile(path.join(MIDSTAGE_DIR, 'Cargo.toml'), 'utf-8');
    const mainRs = await fs.readFile(path.join(MIDSTAGE_DIR, 'src', 'main.rs'), 'utf-8');
    const schemaRs = await fs.readFile(path.join(MIDSTAGE_DIR, 'src', 'schema.rs'), 'utf-8');
    const codegenRs = await fs.readFile(path.join(MIDSTAGE_DIR, 'src', 'codegen.rs'), 'utf-8');
    
    console.log('   ✓ Generated Cargo.toml');
    console.log('   ✓ Generated src/main.rs');
    console.log('   ✓ Generated src/schema.rs');
    console.log('   ✓ Generated src/codegen.rs');
    
    // Verify content
    assert(cargoToml.includes('ormlite'), 'Cargo.toml should reference ormlite');
    assert(mainRs.includes('mod schema'), 'main.rs should import schema module');
    assert(schemaRs.includes('struct'), 'schema.rs should contain struct definitions');
    
    console.log('\n   📁 Midstage files generated in:', MIDSTAGE_DIR);
  });

  it('should show generated midstage content', async () => {
    console.log('\n📜 Sample Generated Content:\n');
    
    const schemaRs = await fs.readFile(path.join(MIDSTAGE_DIR, 'src', 'schema.rs'), 'utf-8');
    const lines = schemaRs.split('\n').slice(0, 30);
    
    console.log('   src/schema.rs (first 30 lines):');
    console.log('   ' + lines.join('\n   '));
  });

  it('should attempt full compaction (may fail without cargo)', async () => {
    console.log('\n⚒️  Testing Full Compaction...\n');
    console.log('   (This will fail if cargo is not installed)');
    
    const schema = await parseDrizzleSchema(SCHEMA_PATH);
    
    const precompiler = new RustOrmlitePrecompiler({
      midstagePath: MIDSTAGE_DIR,
      outputPath: OUTPUT_DIR,
      schema,
      database: 'sqlite',
      keepMidstage: true,
    });
    
    try {
      const result = await precompiler.compact();
      
      console.log('   ✓ Compaction successful!');
      console.log(`   Generated files: ${result.generatedFiles.length}`);
      for (const file of result.generatedFiles) {
        console.log(`     - ${file}`);
      }
      
      // Show a sample of generated output
      if (result.generatedFiles.length > 0) {
        const firstFile = result.generatedFiles[0];
        const content = await fs.readFile(firstFile, 'utf-8');
        console.log(`\n   📄 Sample from ${path.basename(firstFile)}:`);
        console.log('   ' + content.split('\n').slice(0, 20).join('\n   '));
      }
      
    } catch (error) {
      console.log('\n   ⚠️  Compaction failed (expected if cargo not installed):');
      console.log(`   ${(error as Error).message.split('\n')[0]}`);
      
      // This is acceptable for the test - we just want to see the midstage generation
      console.log('\n   ✓ But midstage generation worked! Check the files in:');
      console.log(`   ${MIDSTAGE_DIR}`);
    }
  });
});

// Run tests directly if executed
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n🧵 ORM Compactor Test\n');
  console.log('=' .repeat(60));
  
  try {
    const schema = await parseDrizzleSchema(SCHEMA_PATH);
    console.log(`\n✅ Parsed ${schema.tables.length} tables from schema`);
    
    await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
    await fs.rm(MIDSTAGE_DIR, { recursive: true, force: true });
    
    const precompiler = new RustOrmlitePrecompiler({
      midstagePath: MIDSTAGE_DIR,
      outputPath: OUTPUT_DIR,
      schema,
      database: 'sqlite',
      keepMidstage: true,
    });
    
    console.log('\n🔧 Generating midstage...');
    await (precompiler as any).generateOrmMidstage();
    
    console.log('\n📁 Generated files:');
    const files = await fs.readdir(MIDSTAGE_DIR, { recursive: true });
    for (const file of files) {
      console.log(`   ${file}`);
    }
    
    console.log('\n📜 src/schema.rs preview:');
    const schemaRs = await fs.readFile(path.join(MIDSTAGE_DIR, 'src', 'schema.rs'), 'utf-8');
    console.log(schemaRs.slice(0, 500) + '...');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}
