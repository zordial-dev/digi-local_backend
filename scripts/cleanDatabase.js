const { cleanDatabaseTables, closeDb } = require('../src/models/db');

async function runCleanup() {
  console.log('🧹 Starting database cleanup execution...');
  try {
    const cleanVendors = process.argv.includes('--clean-vendors');
    const result = await cleanDatabaseTables({ cleanVendors });

    console.log('\n==================================================');
    console.log('✅ DATABASE CLEANUP COMPLETE');
    console.log('==================================================');
    console.log(`Summary: ${result.message}\n`);

    console.log('🗑️ Cleaned Tables:');
    result.cleanedTables.forEach(t => console.log(`  - ${t}`));

    console.log('\n🔒 Preserved Sensitive & System Data:');
    result.preservedTables.forEach(t => console.log(`  - ${t}`));
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ Error executing database cleanup:', err);
  } finally {
    await closeDb().catch(() => {});
    process.exit(0);
  }
}

runCleanup();
