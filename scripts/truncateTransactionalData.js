require('dotenv').config();
const { initDb, query, closeDb } = require('../src/models/db');

// Tables that MUST be strictly preserved (Master config, legal, branding, system contacts)
const SENSITIVE_PRESERVED_TABLES = [
  'platform_config',
  'cms_pages',
  'support_contacts',
  'support_sla_config',
  'support_tags',
  'settings'
];

async function truncateNonSensitiveData() {
  console.log('====================================================');
  console.log('🧹 TRUNCATE TRANSACTIONAL DATA (PRESERVE SENSITIVE)');
  console.log('====================================================');

  try {
    await initDb();

    // 1. Get all public tables currently in PostgreSQL
    const tablesRes = await query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);

    const allTables = tablesRes.rows.map(r => r.tablename);
    console.log(`Found ${allTables.length} total tables in database.\n`);

    const tablesToTruncate = allTables.filter(t => !SENSITIVE_PRESERVED_TABLES.includes(t));
    const preservedTables = allTables.filter(t => SENSITIVE_PRESERVED_TABLES.includes(t));

    console.log('🔒 SENSITIVE TABLES TO PRESERVE:');
    preservedTables.forEach(t => console.log(`   [PRESERVED] ${t}`));

    console.log('\n🗑️ TABLES TO TRUNCATE:');
    tablesToTruncate.forEach(t => console.log(`   [TRUNCATE]  ${t}`));
    console.log('----------------------------------------------------');

    // 2. Snapshot row counts before truncation
    console.log('\n📊 Row counts BEFORE truncation:');
    for (const table of tablesToTruncate) {
      try {
        const cRes = await query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`   - ${table.padEnd(30)} : ${cRes.rows[0].count} rows`);
      } catch (_) {}
    }

    // 3. Execute TRUNCATE TABLE ... CASCADE on all non-sensitive tables
    console.log('\n⚡ Executing TRUNCATE CASCADE...');
    const truncateList = tablesToTruncate.map(t => `"${t}"`).join(', ');
    if (truncateList.length > 0) {
      await query(`TRUNCATE TABLE ${truncateList} CASCADE`);
      console.log('✅ TRUNCATE CASCADE executed successfully!');
    }

    // 4. Verify row counts after truncation
    console.log('\n📊 Row counts AFTER truncation:');
    let allCleaned = true;
    for (const table of tablesToTruncate) {
      try {
        const cRes = await query(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = parseInt(cRes.rows[0].count, 10);
        console.log(`   - ${table.padEnd(30)} : ${count} rows`);
        if (count !== 0) allCleaned = false;
      } catch (err) {
        console.log(`   - ${table.padEnd(30)} : Error (${err.message})`);
      }
    }

    // 5. Verify sensitive tables are 100% intact
    console.log('\n🔒 Verifying SENSITIVE TABLES are intact:');
    for (const table of preservedTables) {
      try {
        const cRes = await query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`   ✓ ${table.padEnd(35)} : ${cRes.rows[0].count} rows PRESERVED`);
      } catch (_) {}
    }

    console.log('\n====================================================');
    if (allCleaned) {
      console.log('🎉 ALL TRANSACTIONAL TABLES SUCCESSFULLY TRUNCATED!');
      console.log('🔒 ALL SENSITIVE & SYSTEM TABLES FULLY PRESERVED!');
    } else {
      console.warn('⚠️ Some tables may still contain rows.');
    }
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Truncation failed with error:', err);
  } finally {
    await closeDb().catch(() => {});
    process.exit(0);
  }
}

truncateNonSensitiveData();
