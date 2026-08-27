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
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT 'android'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(20) DEFAULT 'product'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS can_add_items BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) DEFAULT 'society'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_global_coverage BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS delivery_radius_km DECIMAL(5,2) DEFAULT 0.00`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS selected_zones JSONB DEFAULT '[]'`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) DEFAULT 28.6270`,
    `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) DEFAULT 77.3720`,
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

  // Backfill public_id if missing
  const socRows = await query(`SELECT society_id FROM societies WHERE public_id IS NULL`);
  if (socRows.rows && socRows.rows.length > 0) {
    await Promise.all(socRows.rows.map(r => query(`UPDATE societies SET public_id = ? WHERE society_id = ?`, [genPublicId(5), r.society_id])));
  }

  const venRows = await query(`SELECT vendor_id FROM vendors WHERE public_id IS NULL`);
  if (venRows.rows && venRows.rows.length > 0) {
    await Promise.all(venRows.rows.map(r => query(`UPDATE vendors SET public_id = ? WHERE vendor_id = ?`, [genPublicId(6), r.vendor_id])));
  }
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

  const socCheck = await query(`SELECT society_id FROM societies WHERE society_id = 1`);
  if (!socCheck.rows || socCheck.rows.length === 0) {
    await query(`INSERT INTO societies (society_id, society_name, location, latitude, longitude, secretary_name, secretary_mobile, pincode) VALUES
      (1, 'Omaxe Greenwood Residency', 'Sector 62, Noida', 28.6270, 77.3720, 'Ramesh Gupta', '9876543210', '201309'),
      (2, 'Apex Golf Avenue', 'Sector 1, Greater Noida West', 28.6320, 77.3780, 'Suresh Sharma', '9876543211', '201306'),
      (3, 'Cleo County', 'Sector 121, Noida', 28.6210, 77.3650, 'Anil Verma', '9876543212', '201307'),
      (4, 'Supertech Capetown', 'Sector 74, Noida', 28.6100, 77.3850, 'Vikram Singh', '9876543213', '201301'),
      (5, 'Gaur City 1', 'Sector 4, Greater Noida West', 28.6050, 77.4250, 'Pradeep Kumar', '9876543214', '201318')
    `).catch(() => {});
  }

  const { hashPassword } = require('../utils/auth');
  const pwdHash = await hashPassword('password123');
  const vendorPwdHash = await hashPassword('vendor123');

  const usrCheck = await query(`SELECT user_id FROM users WHERE user_id = ?`, ['usr_101']);
  if (!usrCheck.rows || usrCheck.rows.length === 0) {
    await query(`INSERT INTO users (user_id, name, email, phone, password_hash, person_type, status, society_id, society_name, flat, flags_count, joined_date, avatar) VALUES
      ('usr_101', 'Shivin', 'lovelysethia53@gmail.com', '9764694949', '${pwdHash}', 'user_vendor', 'active', 1, 'Udb', 'Tower A-402', 0, 'August 2026', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200')
    `).catch(() => { });
  }

  const vCheck = await query(`SELECT vendor_id FROM vendors WHERE vendor_id = 1`);
  if (!vCheck.rows || vCheck.rows.length === 0) {
    await query(`INSERT INTO vendors (vendor_id, society_id, society_name, vendor_name, store_name, owner_name, gstin, gst_number, phone_number, email, password, password_hash, opening_time, closing_time, logo, avatar_url, description, subscription_tier, status, total_orders, total_revenue, public_id) VALUES 
      (1, 1, 'Greenwood Residency', 'Rajesh Sharma', 'Apna Store Grocery', 'Apna Store Grocery', '07AAAAA140001Z5', '07AAAAA140001Z5', '8890450564', 'apnastore@gmail.com', 'vendor123', '${vendorPwdHash}', '08:00 AM', '10:00 PM', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', 'Quality goods & daily essentials delivered within society via WhatsApp.', 'pro', 'active', 9525, 4170000.00, '${genPublicId(6)}')
    `).catch(() => { });
  }

  const itemCheck = await query(`SELECT item_id FROM items WHERE item_id = 101`);
  if (!itemCheck.rows || itemCheck.rows.length === 0) {
    await query(`INSERT INTO items (item_id, vendor_id, item_name, description, price, stock, category, unit, is_available, in_stock, image_url) VALUES 
      (101, 1, 'Fresh Organic Milk (1L)', 'Pure farm fresh whole cow milk pouch.', 68.00, 50, 'Dairy & Milk', '1 Litre', TRUE, TRUE, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400'),
      (102, 1, 'Fresh Butter 500g', 'Pure unsalted cream butter block.', 180.00, 30, 'Dairy & Milk', '500g', TRUE, TRUE, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400'),
      (103, 1, 'Multigrain Bread', 'Fresh 100% multigrain brown bread loaf.', 50.00, 20, 'Bakery', '400g', TRUE, TRUE, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'),
      (105, 1, 'Organic Honey (250g)', 'Raw unpasteurized forest honey.', 240.00, 15, 'Organic', '250g', TRUE, TRUE, 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=400')
    `).catch((err) => console.error('Error seeding items:', err.message));

    await query(`INSERT INTO catalog_items (item_id, vendor_id, item_name, price, category, description, image_url, in_stock) VALUES 
      (101, 1, 'Fresh Organic Milk (1L)', 68.00, 'Dairy & Milk', 'Pure farm fresh whole cow milk pouch.', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', TRUE),
      (102, 1, 'Fresh Butter 500g', 180.00, 'Dairy & Milk', 'Pure unsalted cream butter block.', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400', TRUE),
      (103, 1, 'Multigrain Bread', 50.00, 'Bakery', 'Fresh 100% multigrain brown bread loaf.', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', TRUE),
      (105, 1, 'Organic Honey (250g)', 240.00, 'Organic', 'Raw unpasteurized forest honey.', 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=400', TRUE)
    `).catch((err) => console.error('Error seeding catalog_items:', err.message));
  }

  const ordCheck = await query(`SELECT order_id FROM orders WHERE order_id = ?`, ['ORD-9842']);
  if (!ordCheck.rows || ordCheck.rows.length === 0) {
    await query(`INSERT INTO orders (order_id, user_id, vendor_id, society_id, total_amount, status, delivery_address) VALUES 
      ('ORD-9842', 'usr_101', 1, 1, 236.00, 'DELIVERED', 'Tower A-402, Omaxe Greenwood Residency'),
      ('ORD-9843', 'usr_101', 1, 1, 180.00, 'PENDING', 'Tower A-402')
    `).catch((err) => console.error('Error seeding orders:', err.message));

    await query(`INSERT INTO order_details (order_id, item_id, item_name, quantity, price, unit_price, item_total) VALUES 
      ('ORD-9842', 101, 'Fresh Organic Milk (1L)', 2, 68.00, 68.00, 136.00),
      ('ORD-9842', 103, 'Multigrain Bread', 1, 50.00, 50.00, 50.00),
      ('ORD-9843', 102, 'Fresh Butter 500g', 1, 180.00, 180.00, 180.00)
    `).catch((err) => console.error('Error seeding order_details:', err.message));
  }

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

  // Seed support contacts
  const scCheck = await query(`SELECT id FROM support_contacts WHERE id = 1`).catch(() => null);
  if (!scCheck || !scCheck.rows || scCheck.rows.length === 0) {
    await query(`
      INSERT INTO support_contacts (id, phone, email, toll_free, whatsapp, address, working_hours, updated_at)
      VALUES (1, '+91 800-562-5999', 'support@digilocal.in', '1800-123-4567', '+91 80056 25999', 'DigiLocal Tech Hub, Tower B, Sector 62, Noida, UP - 201309', 'Monday to Saturday: 9:00 AM - 8:00 PM IST', NOW())
    `).catch(() => {});
  }

  // Seed CMS pages
  const cmsCheck = await query(`SELECT slug FROM cms_pages WHERE slug = 'help-support'`).catch(() => null);
  if (!cmsCheck || !cmsCheck.rows || cmsCheck.rows.length === 0) {
    await query(`
      INSERT INTO cms_pages (slug, title, content, meta_description, updated_at) VALUES
      ('help-support', 'Help & Support Center', '# DigiLocal Help & Support Center\n\nWelcome to the DigiLocal Help & Support Center. We are committed to providing seamless assistance to resident customers, society secretaries, and local vendor merchants.\n\n---\n\n## 📞 Quick Contact Information\n- **Support Hotline**: +91 800-562-5999\n- **Official Email**: support@digilocal.in\n- **Toll-Free Support**: 1800-123-4567\n- **WhatsApp Support**: +91 80056 25999\n- **Working Hours**: Monday - Saturday | 9:00 AM - 8:00 PM IST\n- **Head Office**: DigiLocal Tech Hub, Tower B, Sector 62, Noida, UP - 201309\n\n---\n\n## 📋 Frequently Asked Questions (FAQ)\n\n### 1. How do I place an order on DigiLocal?\nYou can browse verified vendor stores inside your registered residential society, select items into your cart, and checkout using Razorpay UPI, Cards, NetBanking, or Cash on Delivery.\n\n### 2. What should I do if my order is delayed?\nYou can track live delivery status on your app dashboard or contact your society delivery rider directly using the phone number listed on your order invoice. For escalation, reach our support team at **+91 800-562-5999**.\n\n### 3. How do refunds work for cancelled orders?\nRefunds for prepaid orders are processed immediately upon order cancellation and are credited back to your original payment source within **3-5 business days** via Razorpay.\n\n### 4. How can a store owner register as a Vendor?\nLocal merchants can apply by filling out the Merchant Registration form in the Vendor App or Admin Portal. Once verified by the Society Admin or Super Admin, your store will go live.\n\n### 5. Need Urgent Help?\nEmail us directly at **support@digilocal.in** with your Order ID or Ticket Number for priority assistance.', 'Official DigiLocal Help & Support, FAQ, Order Assistance, and Customer Service Contacts.', NOW()),
      ('about-us', 'About DigiLocal', '# About DigiLocal\n\nDigiLocal is India''s leading **Hyperlocal Enclave E-Commerce Platform**, empowering residential enclave societies, gated communities, and local neighborhood merchants.\n\n---\n\n## 🚀 Our Mission\nOur mission is to bridge the gap between residential society families and trusted local store owners. By digitizing neighborhood stores, we deliver fresh groceries, daily essentials, artisan goods, and doorstep services with lightning-fast local delivery.\n\n---\n\n## 🌟 Why DigiLocal?\n- **Verified Society Stores**: All vendor merchants are vetted and approved for your gated enclave.\n- **Zero Delivery Delays**: Local neighborhood delivery within minutes directly to your flat.\n- **Direct Merchant Connect**: Chat or call store owners directly for custom requests.\n- **Secure Payments**: Powered by bank-grade Razorpay payment security and transparent order tracking.\n\n---\n\n## 🏢 Contact & Corporate Info\n- **Corporate Email**: support@digilocal.in\n- **Customer Helpline**: +91 800-562-5999\n- **Corporate Address**: DigiLocal Tech Hub, Sector 62, Noida, UP - 201309', 'Learn about DigiLocal, India premier hyperlocal enclave e-commerce and residential merchant ecosystem.', NOW()),
      ('privacy-policy', 'Privacy Policy', '# DigiLocal Privacy Policy\n\n**Effective Date**: August 14, 2026 | **Version**: 3.2.0\n\nDigiLocal ("we", "our", or "us") respects your privacy and is dedicated to protecting your personal data. This Privacy Policy governs your use of the DigiLocal mobile applications, website, and admin platforms.\n\n---\n\n## 1. Information We Collect\n- **Account Data**: Name, email address, mobile phone number, residential society name, and flat/tower details.\n- **Transaction Data**: Order history, payment reference IDs, delivery addresses, and invoice summaries.\n- **Technical Data**: Device IP address, app operating system, and secure session tokens.\n\n---\n\n## 2. How We Use Your Data\n- To process and fulfill your daily local orders.\n- To communicate order updates, delivery notifications, and support responses.\n- To verify society residency and prevent fraudulent account creation.\n\n---\n\n## 3. Data Protection & Security\nWe enforce **256-bit SSL/TLS encryption** across all API traffic. Payment card and UPI details are securely handled by PCI-DSS compliant payment gateways (Razorpay). We **never** sell your personal information to third parties.\n\n---\n\n## 4. User Rights & Account Deletion\nYou reserve the right to request permanent deletion of your DigiLocal account and personal data at any time via App Settings or by emailing **support@digilocal.in**.\n\n---\n\n## 5. Contact Privacy Officer\nFor any privacy inquiries or data access requests, please contact our Data Protection Officer at:\n- **Email**: support@digilocal.in\n- **Phone**: +91 800-562-5999', 'DigiLocal Privacy Policy detailing data protection, encryption, user consent, and security standards.', NOW()),
      ('terms-conditions', 'Terms & Conditions', '# DigiLocal Terms & Conditions\n\n**Effective Date**: August 14, 2026 | **Version**: 3.2.0\n\nPlease read these Terms & Conditions carefully before using the DigiLocal platform, mobile apps, or vendor services.\n\n---\n\n## 1. Acceptance of Terms\nBy creating an account on DigiLocal as a Resident User, Society Admin, or Vendor Merchant, you agree to comply with and be bound by these Terms & Conditions.\n\n---\n\n## 2. Resident Customer Terms\n- Account details provided during registration must be accurate and reflect your true society residency.\n- Payments must be completed through official platform channels (Razorpay UPI/Cards/COD).\n\n---\n\n## 3. Vendor Merchant Terms\n- Merchants must maintain accurate product pricing, stock availability, and GST compliance.\n- Orders must be fulfilled promptly in accordance with society delivery standards.\n\n---\n\n## 4. Cancellations & Dispute Resolution\n- Orders cancelled prior to merchant dispatch qualify for a 100% instant refund.\n- Any quality disputes regarding goods should be raised within **2 hours of delivery** through our Support Desk or by calling **+91 800-562-5999**.\n\n---\n\n## 5. Contact Information\nFor any legal inquiries regarding these terms:\n- **Email**: support@digilocal.in\n- **Phone**: +91 800-562-5999', 'DigiLocal Terms & Conditions of Service for residents, customers, and vendor merchants.', NOW())
    `).catch((err) => console.error('Error seeding cms_pages:', err.message));
  }
}

/**
 * Removes duplicate same-name shops (store_name) per society in DB tables, keeping only one vendor per shop name.
 * Reassigns items, catalog_items, orders, subscriptions, payments to the retained vendor before deleting duplicate vendors.
 */
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
