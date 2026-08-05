require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const q = '%green%';
const sql = `
  SELECT s.society_id,
         s.society_name,
         s.location,
         COALESCE(s.pincode, '201310') as pincode,
         COALESCE(s.total_flats, 850) as total_flats,
         COUNT(DISTINCT CASE WHEN v.status = 'ACTIVE' THEN v.vendor_id END) as vendor_count,
         COALESCE(s.image_url, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800') as image_url,
         COALESCE(s.banner_image, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200') as banner_image
  FROM societies s
  LEFT JOIN vendors v ON s.society_id = v.society_id AND v.status = 'ACTIVE'
  WHERE (
    LOWER(s.society_name) LIKE $1
    OR LOWER(s.location) LIKE $2
    OR EXISTS (
        SELECT 1 FROM vendors sv
        WHERE sv.society_id = s.society_id
          AND sv.status = 'ACTIVE'
          AND (LOWER(sv.store_name) LIKE $3 OR LOWER(sv.vendor_name) LIKE $4)
    )
  )
  GROUP BY s.society_id, s.society_name, s.location, s.pincode, s.total_flats, s.image_url, s.banner_image
  ORDER BY s.society_name ASC
`;

pool.query(sql, [q, q, q, q])
  .then(r => console.log('OK rows:', r.rows.length, JSON.stringify(r.rows[0] || null)))
  .catch(e => console.error('PG ERROR:', e.message))
  .finally(() => pool.end());
