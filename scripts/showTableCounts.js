const { query, closeDb } = require('../src/models/db');

async function showCounts() {
  console.log('\n📊 CURRENT DATABASE TABLE ROW COUNTS');
  console.log('==================================================');

  const tables = [
    'societies',
    'vendors',
    'users',
    'sub_admins',
    'items',
    'catalog_items',
    'orders',
    'order_details',
    'subscriptions',
    'payments',
    'enquiries',
    'support_tickets',
    'ticket_messages',
    'ticket_attachments',
    'support_sla_config',
    'support_tags',
    'platform_config',
    'support_contacts',
    'cms_pages',
    'audit_logs',
    'notifications',
    'locations'
  ];

  for (const table of tables) {
    try {
      const res = await query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = res.rows && res.rows[0] ? res.rows[0].count : 0;
      console.log(`  - ${table.padEnd(25)} : ${count} rows`);
    } catch (err) {
      console.log(`  - ${table.padEnd(25)} : (table does not exist or empty)`);
    }
  }

  console.log('==================================================\n');
  await closeDb().catch(() => {});
  process.exit(0);
}

showCounts();
