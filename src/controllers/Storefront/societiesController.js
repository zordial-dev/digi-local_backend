const { query } = require('../../models/db');
const memoryCache = require('../../utils/cache');
const { performance } = require('perf_hooks');

/**
 * A1. List Housing Societies (with Search & Filter)
 * GET /api/societies
 */
async function getAllSocieties(req, res) {
  try {
    const { search, page, limit } = req.query;
    const isPaginated = page !== undefined || limit !== undefined;

    const pageNum = parseInt(page || 1, 10);
    const limitNum = parseInt(limit || 24, 10);
    const offset = (pageNum - 1) * limitNum;

    const startTime = performance.now();

    let sql = `
      SELECT s.society_id, 
             s.society_name, 
             s.location, 
             COALESCE(s.public_id, 'SOC-' || s.society_id) as public_id,
             COALESCE(s.pincode, '201310') as pincode,
             COALESCE(s.total_flats, 500) as total_flats,
             COALESCE(s.secretary_name, 'Society Secretary') as secretary_name,
             COALESCE(s.secretary_mobile, '9876543210') as secretary_mobile,
             COUNT(DISTINCT CASE WHEN v.status = 'ACTIVE' THEN v.vendor_id END) as vendor_count
      FROM societies s
      LEFT JOIN vendors v ON s.society_id = v.society_id AND v.status = 'ACTIVE'
      WHERE s.status = 'active'
    `;
    const params = [];
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      sql += `
        AND (
          LOWER(s.society_name) LIKE ?
          OR LOWER(s.location) LIKE ?
          OR LOWER(COALESCE(s.pincode, '')) LIKE ?
          OR LOWER(s.secretary_name) LIKE ?
          OR EXISTS (
              SELECT 1 FROM vendors sv
              WHERE sv.society_id = s.society_id
                AND sv.status = 'ACTIVE'
                AND (LOWER(sv.store_name) LIKE ? OR LOWER(sv.vendor_name) LIKE ?)
          )
        )
      `;
      params.push(q, q, q, q, q, q);
    }
    sql += ` GROUP BY s.society_id, s.society_name, s.location, s.public_id, s.pincode, s.total_flats, s.secretary_name, s.secretary_mobile ORDER BY s.society_name ASC`;

    const countSql = `SELECT COUNT(*) as total FROM (${sql}) sub`;
    const countRes = await query(countSql, params);
    const total_records = parseInt(countRes.rows[0]?.total || 0, 10);

    if (isPaginated) {
      sql += ` LIMIT ${limitNum} OFFSET ${offset}`;
    }

    const result = await query(sql, params);

    const societies = result.rows.map(soc => ({
      society_id: Number(soc.society_id),
      society_name: soc.society_name,
      location: soc.location,
      public_id: soc.public_id || `GW-${soc.society_id}`,
      pincode: soc.pincode || '201310',
      total_flats: Number(soc.total_flats || 500),
      image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
      secretary_name: soc.secretary_name,
      secretary_mobile: soc.secretary_mobile,
      vendor_count: Number(soc.vendor_count || 0)
    }));

    const endTime = performance.now();
    if (search) {
      console.log(`societies search query time: ${endTime - startTime}`);
    } else {
      console.log(`societies query time: ${endTime - startTime}`);
    }

    if (isPaginated) {
      const total_pages = Math.ceil(total_records / limitNum) || 1;
      const responsePayload = {
        success: true,
        data: societies,
        meta: {
          total_records,
          total_pages,
          current_page: pageNum,
          page_size: limitNum,
          has_next: pageNum < total_pages,
          has_prev: pageNum > 1
        }
      };
      return res.status(200).json(responsePayload);
    }

    return res.status(200).json(societies);
  } catch (err) {
    console.error('Error fetching societies:', err.message || err);
    res.status(500).json({ error: 'DB query failed: Unable to fetch societies' });
  }
}

/**
 * A2. Get Society Details by ID
 * GET /api/societies/:id
 */
async function getSocietyById(req, res) {
  try {
    const { id } = req.params;
    const result = await query(`SELECT * FROM societies WHERE society_id = ?`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Society ID not found' });

    const soc = result.rows[0];

    // Blocked societies are not visible to users
    if (soc.status && soc.status !== 'active') {
      return res.status(404).json({ error: 'Society not found' });
    }

    res.status(200).json({
      society_id: Number(soc.society_id),
      society_name: soc.society_name,
      location: soc.location,
      secretary_name: soc.secretary_name || soc.rwa_name || 'Society Secretary',
      secretary_mobile: soc.secretary_mobile || soc.rwa_phone || '9876543210'
    });
  } catch (err) {
    console.error('Error fetching society details:', err);
    res.status(500).json({ error: 'DB query failed' });
  }
}

/**
 * A3. Request / Onboard Unlisted Society
 * POST /api/societies
 * Required Fields: society_name, location, secretary_name, secretary_mobile
 */
async function createSociety(req, res) {
  try {
    const body = req.body || {};
    const society_name = String(body.society_name || body.societyName || body.name || '').trim();
    const location = String(body.location || body.address || '').trim();
    const secretary_name = String(body.secretary_name || body.secretaryName || body.rwa_name || body.rwaName || '').trim();
    const secretary_mobile = String(body.secretary_mobile || body.secretaryMobile || body.secretary_phone || body.secretaryPhone || body.rwa_phone || body.rwaPhone || body.mobile || body.phone || '').trim();

    if (!society_name || !location || !secretary_name || !secretary_mobile) {
      return res.status(400).json({
        error: 'Society name, location, secretary name, and secretary mobile number are required'
      });
    }

    const existing = await query(
      `SELECT society_id FROM societies WHERE LOWER(TRIM(society_name)) = LOWER(?)`,
      [society_name]
    );

    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({
        error: `A society named "${society_name}" already exists. Please choose a different name.`
      });
    }

    const result = await query(
      `INSERT INTO societies (society_name, location, secretary_name, secretary_mobile) 
       VALUES (?, ?, ?, ?) RETURNING *`,
      [society_name, location, secretary_name, secretary_mobile]
    );
    memoryCache.clear();

    const newId = Number(result.insertId || result.rows[0]?.society_id);

    res.status(201).json({
      message: 'Society onboarded successfully',
      society_id: newId,
      society: {
        society_id: newId,
        society_name,
        location,
        secretary_name,
        secretary_mobile
      }
    });
  } catch (err) {
    console.error('Error creating society:', err);
    res.status(500).json({ error: 'Failed to create society' });
  }
}

/**
 * C1. Fetch Approved Vendors for a Housing Society
 * GET /api/societies/:id/vendors
 */
async function getSocietyVendors(req, res) {
  try {
    const { id } = req.params;
    const { search, page, limit } = req.query;
    const isPaginated = page !== undefined || limit !== undefined;

    const pageNum = parseInt(page || 1, 10);
    const limitNum = parseInt(limit || 24, 10);
    const offset = (pageNum - 1) * limitNum;

    const startTime = performance.now();
    const isAll = !id || String(id).toLowerCase() === 'all' || id === '0';

    let sql = `
      SELECT v.*, s.society_name
      FROM vendors v
      LEFT JOIN societies s ON v.society_id = s.society_id
      WHERE v.status = 'ACTIVE'
    `;
    const params = [];

    if (!isAll) {
      const socIdStr = String(id);
      sql += ` AND (v.society_id = ? OR (v.is_global_coverage = TRUE AND (v.selected_zones::text LIKE ? OR v.selected_zones::text LIKE ?)))`;
      params.push(id, `%"zone_id":${socIdStr}%`, `%"zone_id":"${socIdStr}"%`);
    }

    if (search) {
      sql += ` AND (LOWER(v.store_name) LIKE ? OR LOWER(v.vendor_name) LIKE ? OR LOWER(v.description) LIKE ? OR LOWER(s.society_name) LIKE ? OR LOWER(v.category) LIKE ?)`;
      const q = `%${search.toLowerCase()}%`;
      params.push(q, q, q, q, q);
    }

    const countSql = `SELECT COUNT(*) as total FROM (${sql}) sub`;
    const countRes = await query(countSql, params);
    const total_records = parseInt(countRes.rows[0]?.total || 0, 10);

    sql += ` ORDER BY v.vendor_id ASC`;

    if (isPaginated) {
      sql += ` LIMIT ${limitNum} OFFSET ${offset}`;
    }

    const result = await query(sql, params);

    const endTime = performance.now();
    if (search) {
      console.log(`vendors search query time: ${endTime - startTime}`);
      console.log(`shop search query time: ${endTime - startTime}`);
    } else {
      console.log(`vendors query time: ${endTime - startTime}`);
    }

    const vendors = result.rows.map(v => ({
      vendor_id: Number(v.vendor_id),
      id: Number(v.vendor_id),
      store_name: v.store_name,
      vendor_name: v.vendor_name || v.owner_name || 'Vendor Owner',
      owner_name: v.owner_name || v.vendor_name || '',
      email: v.email || '',
      phone_number: v.phone_number || '',
      phone: v.phone_number || '',
      gst_number: v.gst_number || '07AAACR12341Z5',
      opening_time: v.opening_time || v.opening_timing || '08:00 AM',
      closing_time: v.closing_time || v.closing_timing || '10:00 PM',
      opening_timing: v.opening_timing || v.opening_time || '08:00 AM',
      closing_timing: v.closing_timing || v.closing_time || '10:00 PM',
      logo: v.logo || v.avatar_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
      description: v.description || 'Quality goods & daily essentials delivered within society via WhatsApp.',
      category: v.category || 'Grocery & Daily Essentials',
      society_id: v.society_id ? Number(v.society_id) : 'SOC-101',
      society_name: v.society_name || 'Omaxe Greenwood Residency',
      status: v.status || 'ACTIVE'
    }));

    if (isPaginated) {
      const total_pages = Math.ceil(total_records / limitNum) || 1;
      return res.status(200).json({
        success: true,
        data: vendors,
        meta: {
          total_records,
          total_pages,
          current_page: pageNum,
          page_size: limitNum,
          has_next: pageNum < total_pages,
          has_prev: pageNum > 1
        }
      });
    }

    return res.status(200).json(vendors);
  } catch (err) {
    console.error('Error fetching vendors for society:', err);
    res.status(500).json({ error: 'Failed to fetch vendors for society' });
  }
}

/**
 * Approve or update status for a society
 * POST/PUT /api/societies/:societyId/approve or /status
 */
async function approveSociety(req, res) {
  try {
    const societyId = req.params.societyId || req.params.id;
    const status = req.body.status || 'active';

    const existing = await query(`SELECT * FROM societies WHERE society_id = ?`, [societyId]);
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: 'Society not found' });
    }

    await query(`UPDATE societies SET status = ? WHERE society_id = ?`, [status.toLowerCase(), societyId]);

    // Clear cache so block/unblock is reflected immediately to users
    memoryCache.clear();

    res.status(200).json({
      message: 'Society approved successfully',
      society_id: Number(societyId),
      status: status.toLowerCase()
    });
  } catch (err) {
    console.error('Error approving society:', err);
    res.status(500).json({ error: 'Failed to approve society' });
  }
}

module.exports = {
  getAllSocieties,
  getSocietyById,
  createSociety,
  getSocietyVendors,
  approveSociety
};
