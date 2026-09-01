const { Pool, types } = require('pg');
const path = require('path');
const fs = require('fs');

// Ensure PostgreSQL NUMERIC/DECIMAL types (OID 1700) parse as JS floats
types.setTypeParser(1700, parseFloat);

let pgPool = null;

/**
 * Custom Error class for Database exceptions.
 */
class DatabaseError extends Error {
  constructor(message, originalError = null, queryText = '') {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    this.queryText = queryText;
  }
}

/**
 * Generates a unique alphanumeric public ID (e.g., GW4K2, VND9A).
 * Omits ambiguous characters (I, O, 0, 1).
 */
function genPublicId(length = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/**
 * Returns current database dialect.
 */
function getDbType() {
  return 'postgres';
}

let initPromise = null;

/**
 * Initializes PostgreSQL Database Pool, executes schema migrations, and seeds initial data.
 */
async function initDb(maxRetries = 5, initialDelayMs = 2000) {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const databaseUrl = process.env.DATABASE_URL || process.env.PG_URI;
    const pgHost = process.env.PGHOST;

    if (!databaseUrl && !pgHost) {
      throw new Error('PostgreSQL connection parameters missing. Please set DATABASE_URL or PGHOST in .env.');
    }

    const isCloudOrRender = databaseUrl && (
      databaseUrl.includes('render.com') ||
      databaseUrl.includes('sslmode=require') ||
      process.env.PGSSL === 'true' ||
      process.env.NODE_ENV === 'production'
    );

    const sslOption = isCloudOrRender ? { rejectUnauthorized: false } : undefined;

    const poolConfig = databaseUrl
      ? {
        connectionString: databaseUrl,
        ssl: sslOption,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000
      }
      : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'digilocal',
        ssl: sslOption,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000
      };

    pgPool = new Pool(poolConfig);

    pgPool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error] Unexpected error on idle client:', err.message);
    });

    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        attempt++;
        const client = await pgPool.connect();
        client.release();
        console.log('[Database] Connected to PostgreSQL successfully (Pool max: 20).');
        await setupTablesPg();
        await removeDuplicateVendors();
        await createIndexes();
        await seedInitialData();
        return;
      } catch (err) {
        console.error(`[Database Error] Connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
        if (attempt >= maxRetries) {
          initPromise = null;
          throw new DatabaseError('Failed to connect to PostgreSQL database after multiple retries', err);
        }
        const delay = initialDelayMs * attempt;
        console.log(`[Database] Retrying connection in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  })();

  return initPromise;
}

/**
 * Unified PostgreSQL query execution wrapper returning Promise<{ rows, rowCount, insertId }>.
 */
async function query(sqlText, params = []) {
  if (!pgPool && initPromise) {
    await initPromise;
  }
  if (!pgPool) {
    throw new DatabaseError('PostgreSQL database pool is not initialized');
  }

  return new Promise((resolve, reject) => {
    let paramCount = 0;
    let pgSql = sqlText.replace(/\?/g, () => `$${++paramCount}`);

    const trimmed = pgSql.trim();
    if (/^INSERT\s+INTO/i.test(trimmed) && !/RETURNING/i.test(trimmed)) {
      pgSql += ' RETURNING *';
    }

    pgPool.query(pgSql, params, (err, result) => {
      if (err) {
        console.error('[DB Query Error - PostgreSQL]:', err.message, '| Query:', sqlText);
        return reject(new DatabaseError('PostgreSQL query execution failed', err, sqlText));
      }
      const firstRow = result.rows && result.rows[0] ? result.rows[0] : null;
      let insertedId = null;
      if (firstRow) {
        const uSql = sqlText.trim().toUpperCase();
        if (uSql.includes('INTO VENDORS')) insertedId = firstRow.vendor_id;
        else if (uSql.includes('INTO SOCIETIES')) insertedId = firstRow.society_id;
        else if (uSql.includes('INTO USERS')) insertedId = firstRow.user_id;
        else if (uSql.includes('INTO ITEMS') || uSql.includes('INTO CATALOG_ITEMS')) insertedId = firstRow.item_id;
        else if (uSql.includes('INTO ORDERS')) insertedId = firstRow.order_id;
        else if (uSql.includes('INTO SUBSCRIPTIONS')) insertedId = firstRow.subscription_id || firstRow.id;
        else if (uSql.includes('INTO PAYMENTS')) insertedId = firstRow.payment_id || firstRow.id;
        else if (uSql.includes('INTO CUSTOMERS')) insertedId = firstRow.customer_id || firstRow.id;
        else if (uSql.includes('INTO ENQUIRIES')) insertedId = firstRow.enquiry_id || firstRow.id;
        else {
          insertedId = firstRow.id || firstRow.enquiry_id || firstRow.vendor_id || firstRow.society_id || firstRow.item_id || firstRow.order_id || firstRow.subscription_id || firstRow.payment_id || null;
        }
      }

      resolve({
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        insertId: insertedId
      });
    });
  });
}

/**
 * Helper to execute multiple operations within an ACID PostgreSQL transaction.
 * @param {Function} callback - Async function receiving (txQuery)
 */
async function withTransaction(callback) {
  if (!pgPool && initPromise) {
    await initPromise;
  }
  if (!pgPool) {
    throw new DatabaseError('PostgreSQL database pool is not initialized');
  }

  const client = await pgPool.connect();
  const txQuery = (sqlText, params = []) => {
    return new Promise((resolve, reject) => {
      let paramCount = 0;
      let pgSql = sqlText.replace(/\?/g, () => `$${++paramCount}`);

      const trimmed = pgSql.trim();
      if (/^INSERT\s+INTO/i.test(trimmed) && !/RETURNING/i.test(trimmed)) {
        pgSql += ' RETURNING *';
      }

      client.query(pgSql, params, (err, result) => {
        if (err) return reject(new DatabaseError('PG Transaction Query Failed', err, sqlText));
        const firstRow = result.rows && result.rows[0] ? result.rows[0] : null;
        const insertedId = firstRow ? (
          firstRow.enquiry_id || firstRow.society_id || firstRow.vendor_id || firstRow.customer_id ||
          firstRow.order_id || firstRow.item_id || firstRow.subscription_id ||
          firstRow.payment_id || firstRow.id || null
        ) : null;

        resolve({
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
          insertId: insertedId
        });
      });
    });
  };

  try {
    await client.query('BEGIN');
    const result = await callback(txQuery);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Creates targeted performance database indexes for societies and vendors.
 */
async function createIndexes() {
  try {
    await query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
  } catch (_) { }

  const indexesToCreate = [
    // Indexes for Societies
    'CREATE INDEX IF NOT EXISTS idx_societies_name ON societies (society_name)',
    'CREATE INDEX IF NOT EXISTS idx_societies_status_name ON societies (status, society_name)',
    'CREATE INDEX IF NOT EXISTS idx_societies_lower_name ON societies (LOWER(society_name))',
    'CREATE INDEX IF NOT EXISTS idx_societies_trgm_name ON societies USING gin (LOWER(society_name) gin_trgm_ops)',

    // Indexes for Vendors
    'CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors (vendor_name)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_store_name ON vendors (store_name)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors (status)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_status_society ON vendors (status, society_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_society_id ON vendors (society_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_lower_store ON vendors (LOWER(store_name))',
    'CREATE INDEX IF NOT EXISTS idx_vendors_lower_name ON vendors (LOWER(vendor_name))',
    'CREATE INDEX IF NOT EXISTS idx_vendors_trgm_store ON vendors USING gin (LOWER(store_name) gin_trgm_ops)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_trgm_name ON vendors USING gin (LOWER(vendor_name) gin_trgm_ops)'
  ];

  for (const sql of indexesToCreate) {
    try {
      await query(sql);
    } catch (err) {
      console.warn(`[Index Notice] ${err.message}`);
    }
  }
}

/**
 * Setup PostgreSQL Tables using schema.sql and apply column migrations.
 */
async function setupTablesPg() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pgPool.query(schemaSql).catch(() => {});
  }

  const columns = [
    `ALTER TABLE societies ADD COLUMN IF NOT EXISTS code VARCHAR(50)`,
    `ALTER TABLE societies ADD COLUMN IF NOT EXISTS address TEXT`,
    `ALTER TABLE societies ADD COLUMN IF NOT EXISTS city VARCHAR(100)`,
    `ALTER TABLE societies ADD COLUMN IF NOT EXISTS state VARCHAR(100)`,
    `ALTER TABLE societies ADD COLUMN IF NOT EXISTS pincode VARCHAR(20)`,
    `ALTER TABLE societies ADD COLUMN IF NOT EXISTS secretary_name VARCHAR(255) DEFAULT 'Society Secretary'`,
    `ALTER TABLE societies ADD COLUMN IF NOT EXISTS secretary_mobile VARCHAR(20) DEFAULT '9876543210'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS gstin VARCHAR(50)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS opening_time VARCHAR(20) DEFAULT '08:00 AM'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS closing_time VARCHAR(20) DEFAULT '10:00 PM'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS opening_timing VARCHAR(20) DEFAULT '08:00 AM'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS closing_timing VARCHAR(20) DEFAULT '10:00 PM'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS min_order_value DECIMAL(10,2) DEFAULT 0.00`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS max_quantity_limit INT DEFAULT 10`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10,2) DEFAULT 0.00`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 5.00`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_charge_percentage DECIMAL(5,2) DEFAULT 0.00`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address TEXT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city VARCHAR(100)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pincode VARCHAR(20)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'pro'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS renewal_date TIMESTAMP DEFAULT '2026-12-31 00:00:00'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(15,2) DEFAULT 0.00`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS person_type VARCHAR(50) DEFAULT 'user'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS society_name VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS flat VARCHAR(255) DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS area VARCHAR(255) DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS store_name VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS flags_count INT DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE orders ALTER COLUMN order_id TYPE VARCHAR(100) USING order_id::text`,
    `ALTER TABLE order_details ALTER COLUMN order_id TYPE VARCHAR(100) USING order_id::text`,
    `ALTER TABLE order_details ADD COLUMN IF NOT EXISTS item_name VARCHAR(255)`,
    `ALTER TABLE order_details ADD COLUMN IF NOT EXISTS price DECIMAL(10,2)`,
    `ALTER TABLE items ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE societies ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
    `ALTER TABLE sub_admins ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
    `ALTER TABLE sub_admins ADD COLUMN IF NOT EXISTS assigned_society_id BIGINT`,
    `ALTER TABLE sub_admins ADD COLUMN IF NOT EXISTS created_by VARCHAR(120) DEFAULT 'Super Admin'`,
    `ALTER TABLE sub_admins ADD COLUMN IF NOT EXISTS creator_id VARCHAR(64) DEFAULT 'super-admin'`,
    `ALTER TABLE sub_admins ADD COLUMN IF NOT EXISTS created_role VARCHAR(50) DEFAULT 'super_admin'`,
    `ALTER TABLE sub_admins ADD COLUMN IF NOT EXISTS powers TEXT[] DEFAULT '{}'`,
    `ALTER TABLE sub_admins ADD COLUMN IF NOT EXISTS allowed_delegation_powers TEXT[] DEFAULT '{}'`,
    `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS user_id VARCHAR(100)`,
    `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS user_name VARCHAR(255)`,
    `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
    `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50)`,
    `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS subject VARCHAR(255)`,
    `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
    `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS priority VARCHAR(20)`,
    `ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS platform_name VARCHAR(255) DEFAULT 'DigiLocal'`,
    `ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS platform_logo TEXT DEFAULT 'https://imgh.in/host/ucila6'`,
    `ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS admin_password_hash VARCHAR(255)`,
    `ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 18.00`,
    `ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR'`,
    `ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id VARCHAR(100)`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS society_id INT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS push_token TEXT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS fcm_token TEXT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS device_token TEXT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS account_number VARCHAR(50)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ifsc VARCHAR(20)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS qr_code_url TEXT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS upi_qr_code TEXT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS qr_code TEXT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS accepted_payment_methods VARCHAR(255) DEFAULT 'COD,UPI,BANK_TRANSFER,QR_CODE'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_instructions TEXT`,

    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) DEFAULT 'android'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_id BIGINT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shop_number VARCHAR(100)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shop_image TEXT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pan_number VARCHAR(50)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS area VARCHAR(255)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT 'android'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS hold_reason TEXT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS hold_email_subject VARCHAR(255)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS has_resubmitted BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS resubmitted_at TIMESTAMP`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(20) DEFAULT 'product'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS can_add_items BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE vendors DROP COLUMN IF EXISTS location_type`,
    `ALTER TABLE vendors DROP COLUMN IF EXISTS is_global_coverage`,
    `ALTER TABLE vendors DROP COLUMN IF EXISTS delivery_radius_km`,
    `ALTER TABLE vendors DROP COLUMN IF EXISTS selected_zones`,
    `ALTER TABLE vendors DROP COLUMN IF EXISTS latitude`,
    `ALTER TABLE vendors DROP COLUMN IF EXISTS longitude`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_address TEXT`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location VARCHAR(255)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city VARCHAR(100)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS state VARCHAR(100)`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pincode VARCHAR(20)`,
    `ALTER TABLE societies ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) DEFAULT 28.6270`,
    `ALTER TABLE societies ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) DEFAULT 77.3720`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)`,
    `ALTER TABLE users ALTER COLUMN email DROP NOT NULL`,
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`
  ];

  await Promise.all(columns.map(colSql => pgPool.query(colSql).catch(() => { })));

  // Ensure locations table
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS locations (
      location_id BIGSERIAL PRIMARY KEY,
      area VARCHAR(255) NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      pincode VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).catch(() => { });

  // Ensure enquiries table
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS enquiries (
      enquiry_id BIGSERIAL PRIMARY KEY,
      vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE CASCADE,
      user_id VARCHAR(100),
      user_name VARCHAR(255) NOT NULL,
      user_phone VARCHAR(50) NOT NULL,
      society_id BIGINT,
      society_name VARCHAR(255),
      sector VARCHAR(100),
      service_type VARCHAR(255),
      preferred_time VARCHAR(100),
      description TEXT,
      issue_photos TEXT[] DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'NEW',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => { });

  // Ensure sub_admins table
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS sub_admins (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'SUB_ADMIN',
      assigned_society_id BIGINT,
      powers TEXT[] DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => { });

  // Ensure platform_config table
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS platform_config (
      id INT PRIMARY KEY DEFAULT 1,
      platform_name VARCHAR(255) DEFAULT 'DigiLocal',
      platform_logo TEXT DEFAULT 'https://imgh.in/host/ucila6',
      admin_password_hash VARCHAR(255),
      gst_percentage DECIMAL(5,2) DEFAULT 18.00,
      maintenance_mode BOOLEAN DEFAULT FALSE,
      currency VARCHAR(10) DEFAULT 'INR',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => { });

  
  // Auto-migrate societies into locations (area, city, state, pincode, created_at)
  try {
    await pgPool.query(`
      INSERT INTO locations (location_id, area, city, state, pincode, created_at)
      SELECT society_id, society_name, COALESCE(city, 'Noida'), COALESCE(state, 'Uttar Pradesh'), COALESCE(pincode, '201301'), COALESCE(created_at, CURRENT_TIMESTAMP)
      FROM societies
      ON CONFLICT (location_id) DO NOTHING;
    `).catch(() => {});

    await pgPool.query(`
      UPDATE vendors SET location_id = society_id WHERE location_id IS NULL AND society_id IS NOT NULL;
    `).catch(() => {});
  } catch (_) {}

  // Backfill public_id if missing (Optimized single SQL updates)
  await pgPool.query(`UPDATE societies SET public_id = SUBSTRING(MD5(RANDOM()::text), 1, 5) WHERE public_id IS NULL`).catch(() => {});
  await pgPool.query(`UPDATE vendors SET public_id = SUBSTRING(MD5(RANDOM()::text), 1, 6) WHERE public_id IS NULL`).catch(() => {});
}

/**
 * Seed initial platform data if empty.
 */
async function seedInitialData() {
  try {
    const logoCheck = await query(`SELECT config_value FROM platform_config WHERE config_key = 'platform_logo'`);
    if (!logoCheck.rows || logoCheck.rows.length === 0) {
      await query(`INSERT INTO platform_config (config_key, config_value) VALUES ('platform_logo', 'https://imgh.in/host/ucila6')`).catch(() => {});
    }
    const nameCheck = await query(`SELECT config_value FROM platform_config WHERE config_key = 'platform_name'`);
    if (!nameCheck.rows || nameCheck.rows.length === 0) {
      await query(`INSERT INTO platform_config (config_key, config_value) VALUES ('platform_name', 'DigiLocal')`).catch(() => {});
    }
  } catch (_) { }

  // Ensure cms_pages table
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS cms_pages (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      meta_description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => { });

  // Ensure support_contacts table
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS support_contacts (
      id INT PRIMARY KEY DEFAULT 1,
      phone VARCHAR(50) NOT NULL DEFAULT '+91 800-562-5999',
      email VARCHAR(255) NOT NULL DEFAULT 'support@digilocal.in',
      toll_free VARCHAR(50) DEFAULT '1800-123-4567',
      whatsapp VARCHAR(50) DEFAULT '+91 80056 25999',
      address TEXT DEFAULT 'DigiLocal Tech Hub, Tower B, Sector 62, Noida, UP - 201309',
      working_hours VARCHAR(100) DEFAULT 'Monday to Saturday: 9:00 AM - 8:00 PM IST',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => { });
}

async function removeDuplicateVendors() {
  try {
    const res = await query(`SELECT vendor_id, society_id, store_name FROM vendors ORDER BY vendor_id ASC`);
    if (!res.rows || res.rows.length === 0) return { removedCount: 0 };

    const seenStoreNames = new Map();
    const duplicatesToRemove = [];

    for (const v of res.rows) {
      const societyId = String(v.society_id || 1);
      const sNameNorm = v.store_name ? String(v.store_name).trim().toLowerCase().replace(/\s+/g, ' ') : '';
      const currentVendorId = Number(v.vendor_id);

      if (!sNameNorm) continue;

      const sKey = `${societyId}:${sNameNorm}`;

      // Skip deduplication for core seed vendors (IDs 1-20, 79, 89, 90, 104) to strictly protect production & seed data
      const isProtectedSeedVendor = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 79, 89, 90, 104].includes(currentVendorId);

      if (seenStoreNames.has(sKey)) {
        const keptVendorId = seenStoreNames.get(sKey);
        if (!isProtectedSeedVendor) {
          duplicatesToRemove.push({ duplicateVendorId: currentVendorId, keptVendorId });
        }
      } else {
        seenStoreNames.set(sKey, currentVendorId);
      }
    }

    for (const dup of duplicatesToRemove) {
      const { duplicateVendorId, keptVendorId } = dup;
      await query(`UPDATE items SET vendor_id = ? WHERE vendor_id = ?`, [keptVendorId, duplicateVendorId]).catch(() => {});
      await query(`UPDATE catalog_items SET vendor_id = ? WHERE vendor_id = ?`, [keptVendorId, duplicateVendorId]).catch(() => {});
      await query(`UPDATE orders SET vendor_id = ? WHERE vendor_id = ?`, [keptVendorId, duplicateVendorId]).catch(() => {});
      await query(`UPDATE subscriptions SET vendor_id = ? WHERE vendor_id = ?`, [keptVendorId, duplicateVendorId]).catch(() => {});
      await query(`UPDATE payments SET vendor_id = ? WHERE vendor_id = ?`, [keptVendorId, duplicateVendorId]).catch(() => {});

      await query(`DELETE FROM vendors WHERE vendor_id = ?`, [duplicateVendorId]);
      console.log(`[Deduplication] Removed duplicate shop ID ${duplicateVendorId} in society. Reassigned records to vendor ID ${keptVendorId}.`);
    }

    return { removedCount: duplicatesToRemove.length };
  } catch (err) {
    console.error('[Deduplication Error] Failed to remove duplicate shops:', err.message);
    return { removedCount: 0, error: err.message };
  }
}

/**
 * Closes PostgreSQL database connection pool cleanly during process termination.
 */
async function closeDb() {
  if (pgPool) {
    await pgPool.end();
  }
}

module.exports = {
  initDb,
  query,
  withTransaction,
  closeDb,
  genPublicId,
  getDbType,
  removeDuplicateVendors,
  DatabaseError
};
