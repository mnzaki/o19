/**
 * Quick smoke test for the compactor - MJS version
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const SCHEMA_PATH = path.join(ROOT_DIR, '..', 'foundframe-drizzle', 'src', 'schema.ts');
const OUTPUT_DIR = path.join(__dirname, '.test-output');
const MIDSTAGE_DIR = path.join(__dirname, '.test-midstage');

console.log('\n🧵 ORM Compactor Smoke Test\n');
console.log('=' .repeat(60));

try {
  console.log(`\n📖 Loading schema from: ${SCHEMA_PATH}`);
  
  // Import the parser
  const { parseDrizzleSchema } = await import('../machinery/reed/drizzle-parser.js');
  const schema = await parseDrizzleSchema(SCHEMA_PATH);
  
  console.log(`\n✅ Parsed ${schema.tables.length} tables:`);
  for (const table of schema.tables) {
    console.log(`   - ${table.name} (${table.columns.length} columns)`);
  }
  
  // Clean up
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.rm(MIDSTAGE_DIR, { recursive: true, force: true });
  
  console.log('\n🔧 Creating precompiler...');
  const { RustOrmlitePrecompiler } = await import('../machinery/beater/index.js');
  
  const precompiler = new RustOrmlitePrecompiler({
    midstagePath: MIDSTAGE_DIR,
    outputPath: OUTPUT_DIR,
    schema,
    database: 'sqlite',
    keepMidstage: true,
  });
  
  console.log('\n🔨 Generating midstage code...');
  await precompiler['generateOrmMidstage']();
  
  console.log('\n📁 Generated files:');
  const files = await fs.readdir(MIDSTAGE_DIR, { recursive: true });
  for (const file of files) {
    const fullPath = path.join(MIDSTAGE_DIR, file);
    const stat = await fs.stat(fullPath);
    if (stat.isFile()) {
      console.log(`   ${file}`);
    }
  }
  
  console.log('\n📜 src/schema.rs preview:');
  const schemaRs = await fs.readFile(path.join(MIDSTAGE_DIR, 'src', 'schema.rs'), 'utf-8');
  console.log('-'.repeat(60));
  console.log(schemaRs.slice(0, 800));
  console.log('-'.repeat(60));
  console.log('... (truncated)');
  
  console.log('\n✅ Smoke test passed!');
  console.log(`\n💡 Midstage kept in: ${MIDSTAGE_DIR}`);
  console.log('   You can manually compile with:');
  console.log(`   cd ${MIDSTAGE_DIR} && cargo build --release`);
  
} catch (error) {
  console.error('\n❌ Error:', error);
  process.exit(1);
}
