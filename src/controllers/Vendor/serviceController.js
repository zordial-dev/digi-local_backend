const path = require('path');
const fs = require('fs');
const { query } = require('../../models/db');
const { resolveImageUrl, normalizeImageUrl } = require('../../utils/imageUtils');
const { formatISTISO, formatISTReadable } = require('../../utils/time');

/**
 * Helper: Resolve Base URL from Request
 */
function getBaseUrl(req) {
    if (process.env.PUBLIC_API_URL) {
        return process.env.PUBLIC_API_URL.replace(/\/$/, '');
    }
    const host = req.get('host') || 'localhost:5000';
    const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    return `${proto}://${host}`;
}

/**
 * Helper: Process Base64 image upload if provided
 */
function processBase64Upload(req) {
    const body = req.body || {};
    let rawBase64 = body.base64 || body.image_base64 || body.file_base64 || body.photo_base64 || body.data;

    if (!rawBase64) {
        const candidate = body.image || body.photo || body.service_photo || body.image_url;
        if (typeof candidate === 'string' && candidate.length > 100 && !candidate.startsWith('http://') && !candidate.startsWith('https://')) {
            rawBase64 = candidate;
        }
    }

    if (!rawBase64 || typeof rawBase64 !== 'string') {
        return null;
    }

    let cleanBase64 = rawBase64.trim();
    let mimeType = body.fileType || body.filetype || body.mimetype || 'image/jpeg';
    let ext = 'jpg';

    const dataUriMatch = cleanBase64.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/i);
    if (dataUriMatch) {
        mimeType = dataUriMatch[1];
        cleanBase64 = dataUriMatch[2];
        ext = mimeType.split('/')[1] || 'jpg';
        if (ext === 'jpeg') ext = 'jpg';
    }

    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!validExts.includes(ext)) {
        ext = 'jpg';
    }

    try {
        const buffer = Buffer.from(cleanBase64, 'base64');
        if (buffer.length === 0) return null;

        const uploadDir = path.join(__dirname, '../../../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filename = `service_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);

        const baseUrl = getBaseUrl(req);
        return {
            filename,
            image_url: `${baseUrl}/uploads/${filename}`
        };
    } catch (err) {
        console.error('[Base64 Service Image Upload Error]:', err.message);
        return null;
    }
}

/**
 * Helper: Map and normalize location option
 */
function normalizeServiceLocation(input) {
    if (!input) return "At Customer's Doorstep";
    const str = String(input).trim().toLowerCase();
    if (str.includes('door') || str === 'doorstep') return "At Customer's Doorstep";
    if (str.includes('shop') || str.includes('clinic')) return "At Shop / Clinic";
    if (str.includes('online') || str.includes('remote')) return "Online / Remote";
    return String(input).trim();
}

/**
 * Helper: Format service record for response
 */
function formatServiceRow(row) {
    if (!row) return null;
    return {
        service_id: Number(row.service_id),
        id: Number(row.service_id),
        vendor_id: Number(row.vendor_id),
        service_name: row.service_name,
        name: row.service_name,
        category: row.category || 'General Services',
        price: parseFloat(row.price || 0),
        visiting_charge: parseFloat(row.visiting_charge || 0),
        estimated_duration: row.estimated_duration || '1 hour',
        service_location: row.service_location || "At Customer's Doorstep",
        description: row.description || '',
        image_url: row.image_url ? normalizeImageUrl(row.image_url) : null,
        photo_url: row.image_url ? normalizeImageUrl(row.image_url) : null,
        is_available: row.is_available === true || row.is_available === 1 || row.is_available === '1',
        created_at: row.created_at,
        created_at_ist: row.created_at ? formatISTISO(row.created_at) : null,
        created_at_readable: row.created_at ? formatISTReadable(row.created_at) : null,
        updated_at: row.updated_at,
        updated_at_ist: row.updated_at ? formatISTISO(row.updated_at) : null,
        updated_at_readable: row.updated_at ? formatISTReadable(row.updated_at) : null
    };
}

/**
 * 1. Add New Service
 * POST /api/vendors/:vendorId/services
 * POST /api/vendorPanel/:vendorId/services
 */
async function addService(req, res) {
    try {
        const vendorId = req.params.vendorId || req.body?.vendor_id || req.user?.vendor_id;
        if (!vendorId) {
            return res.status(400).json({ success: false, error: 'vendor_id is required' });
        }

        // Verify vendor exists
        const vCheck = await query(
            `SELECT vendor_id, vendor_name, store_name, vendor_type FROM vendors WHERE vendor_id = ? OR CAST(vendor_id AS TEXT) = ?`,
            [vendorId, String(vendorId)]
        );
        if (!vCheck.rows || vCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Vendor with ID ${vendorId} not found` });
        }

        const body = req.body || {};
        const serviceName = String(
            body.service_name || body.serviceName || body.name || body.title || ''
        ).trim();

        if (!serviceName) {
            return res.status(400).json({
                success: false,
                error: 'service_name is required (e.g. Split AC Deep Cleaning & Servicing)'
            });
        }

        const category = String(body.category || 'Electrician & Repairs').trim();
        const price = Math.max(0, parseFloat(body.price ?? body.service_price ?? 0) || 0);
        const visitingCharge = Math.max(0, parseFloat(body.visiting_charge ?? body.visitingCharge ?? body.visiting_fee ?? body.inspection_charge ?? 0) || 0);
        const estimatedDuration = String(body.estimated_duration || body.estimatedDuration || body.duration || '1 hour').trim();
        const serviceLocation = normalizeServiceLocation(body.service_location || body.serviceLocation || body.location);
        const description = String(body.description || body.service_description || body.serviceDescription || '').trim();

        const isAvailable = body.is_available !== undefined
            ? (body.is_available === true || body.is_available === 'true' || body.is_available === 1 || body.is_available === '1')
            : true;

        // Process Image: file upload (multer), base64, or direct URL
        let uploadedUrl = null;
        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        if (file) {
            const baseUrl = getBaseUrl(req);
            uploadedUrl = `${baseUrl}/uploads/${file.filename}`;
        } else {
            const b64 = processBase64Upload(req);
            if (b64) {
                uploadedUrl = b64.image_url;
            } else if (body.image_url || body.photo || body.service_photo || body.photo_url) {
                uploadedUrl = String(body.image_url || body.photo || body.service_photo || body.photo_url).trim();
            }
        }

        const finalImage = uploadedUrl ? await resolveImageUrl(uploadedUrl) : null;

        const insertRes = await query(
            `INSERT INTO services (
                vendor_id, service_name, category, price, visiting_charge,
                estimated_duration, service_location, description, image_url, is_available,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *`,
            [
                Number(vendorId),
                serviceName,
                category,
                price,
                visitingCharge,
                estimatedDuration,
                serviceLocation,
                description,
                finalImage,
                isAvailable
            ]
        );

        const newService = formatServiceRow(insertRes.rows[0]);

        return res.status(201).json({
            success: true,
            message: `Service "${serviceName}" added successfully`,
            service: newService,
            data: newService
        });
    } catch (err) {
        console.error('❌ [ADD SERVICE ERROR]:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to add service',
            details: err.message
        });
    }
}

/**
 * 2. Get All Services for a Vendor
 * GET /api/vendors/:vendorId/services
 * GET /api/vendorPanel/:vendorId/services
 */
async function getVendorServices(req, res) {
    try {
        const vendorId = req.params.vendorId;
        if (!vendorId) {
            return res.status(400).json({ success: false, error: 'vendor_id is required' });
        }

        const { category, search, is_available } = req.query || {};

        let sql = `SELECT * FROM services WHERE vendor_id = ? OR CAST(vendor_id AS TEXT) = ?`;
        const params = [vendorId, String(vendorId)];

        if (category && category.toLowerCase() !== 'all') {
            sql += ` AND LOWER(category) = LOWER(?)`;
            params.push(category);
        }

        if (is_available !== undefined && is_available !== '') {
            const availBool = is_available === 'true' || is_available === true || is_available === '1' || is_available === 1;
            sql += ` AND is_available = ?`;
            params.push(availBool);
        }

        if (search) {
            sql += ` AND (LOWER(service_name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(category) LIKE ?)`;
            const q = `%${search.toLowerCase()}%`;
            params.push(q, q, q);
        }

        sql += ` ORDER BY service_id DESC`;

        const sRes = await query(sql, params).catch(() => ({ rows: [] }));
        const formattedList = (sRes.rows || []).map(formatServiceRow);

        return res.status(200).json({
            success: true,
            vendor_id: Number(vendorId),
            count: formattedList.length,
            services: formattedList,
            data: formattedList
        });
    } catch (err) {
        console.error('❌ [GET VENDOR SERVICES ERROR]:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch services',
            details: err.message
        });
    }
}

/**
 * 3. Get Single Service by ID
 * GET /api/services/:serviceId
 * GET /api/vendors/:vendorId/services/:serviceId
 */
async function getServiceById(req, res) {
    try {
        const { serviceId } = req.params;
        const sRes = await query(
            `SELECT s.*, v.store_name, v.vendor_name, v.phone_number, v.whatsapp_number 
             FROM services s 
             LEFT JOIN vendors v ON s.vendor_id = v.vendor_id 
             WHERE s.service_id = ?`,
            [serviceId]
        );

        if (!sRes.rows || sRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Service with ID ${serviceId} not found` });
        }

        const row = sRes.rows[0];
        const formatted = formatServiceRow(row);
        formatted.vendor = {
            vendor_id: Number(row.vendor_id),
            store_name: row.store_name,
            vendor_name: row.vendor_name,
            phone_number: row.phone_number,
            whatsapp_number: row.whatsapp_number
        };

        return res.status(200).json({
            success: true,
            service: formatted,
            data: formatted
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve service',
            details: err.message
        });
    }
}

/**
 * 4. Update Existing Service
 * PUT & PATCH /api/vendors/:vendorId/services/:serviceId
 * PUT & PATCH /api/services/:serviceId
 */
async function updateService(req, res) {
    try {
        const serviceId = req.params.serviceId;
        const vendorId = req.params.vendorId;

        // Check if service exists
        let checkSql = `SELECT * FROM services WHERE service_id = ?`;
        const checkParams = [serviceId];
        if (vendorId) {
            checkSql += ` AND (vendor_id = ? OR CAST(vendor_id AS TEXT) = ?)`;
            checkParams.push(vendorId, String(vendorId));
        }

        const existingRes = await query(checkSql, checkParams);
        if (!existingRes.rows || existingRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Service #${serviceId} not found` });
        }

        const existing = existingRes.rows[0];
        const body = req.body || {};

        const serviceName = (body.service_name || body.serviceName || body.name || body.title) !== undefined
            ? String(body.service_name || body.serviceName || body.name || body.title).trim()
            : existing.service_name;

        const category = body.category !== undefined ? String(body.category).trim() : existing.category;

        const price = (body.price !== undefined || body.service_price !== undefined)
            ? Math.max(0, parseFloat(body.price ?? body.service_price ?? 0) || 0)
            : parseFloat(existing.price || 0);

        const visitingCharge = (body.visiting_charge !== undefined || body.visitingCharge !== undefined || body.visiting_fee !== undefined)
            ? Math.max(0, parseFloat(body.visiting_charge ?? body.visitingCharge ?? body.visiting_fee ?? 0) || 0)
            : parseFloat(existing.visiting_charge || 0);

        const estimatedDuration = (body.estimated_duration || body.estimatedDuration || body.duration) !== undefined
            ? String(body.estimated_duration || body.estimatedDuration || body.duration).trim()
            : existing.estimated_duration;

        const serviceLocation = (body.service_location || body.serviceLocation || body.location) !== undefined
            ? normalizeServiceLocation(body.service_location || body.serviceLocation || body.location)
            : existing.service_location;

        const description = (body.description || body.service_description || body.serviceDescription) !== undefined
            ? String(body.description || body.service_description || body.serviceDescription).trim()
            : existing.description;

        let isAvailable = existing.is_available;
        if (body.is_available !== undefined) {
            isAvailable = body.is_available === true || body.is_available === 'true' || body.is_available === 1 || body.is_available === '1';
        }

        // Process image update if new file or URL provided
        let newImageUrl = existing.image_url;
        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        if (file) {
            const baseUrl = getBaseUrl(req);
            newImageUrl = `${baseUrl}/uploads/${file.filename}`;
        } else {
            const b64 = processBase64Upload(req);
            if (b64) {
                newImageUrl = b64.image_url;
            } else if (body.image_url !== undefined || body.photo !== undefined || body.service_photo !== undefined) {
                const candidate = String(body.image_url || body.photo || body.service_photo || '').trim();
                newImageUrl = candidate ? await resolveImageUrl(candidate) : null;
            }
        }

        const updateRes = await query(
            `UPDATE services 
             SET service_name = ?,
                 category = ?,
                 price = ?,
                 visiting_charge = ?,
                 estimated_duration = ?,
                 service_location = ?,
                 description = ?,
                 image_url = ?,
                 is_available = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE service_id = ?
             RETURNING *`,
            [
                serviceName,
                category,
                price,
                visitingCharge,
                estimatedDuration,
                serviceLocation,
                description,
                newImageUrl,
                isAvailable,
                serviceId
            ]
        );

        const updatedService = formatServiceRow(updateRes.rows[0]);

        return res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            service: updatedService,
            data: updatedService
        });
    } catch (err) {
        console.error('❌ [UPDATE SERVICE ERROR]:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to update service',
            details: err.message
        });
    }
}

/**
 * 5. Toggle Service Availability
 * PATCH /api/vendors/:vendorId/services/:serviceId/availability
 * PATCH /api/services/:serviceId/availability
 */
async function toggleServiceAvailability(req, res) {
    try {
        const { serviceId } = req.params;
        const body = req.body || {};

        let newStatus;
        if (body.is_available !== undefined) {
            newStatus = body.is_available === true || body.is_available === 'true' || body.is_available === 1 || body.is_available === '1';
        } else {
            const current = await query(`SELECT is_available FROM services WHERE service_id = ?`, [serviceId]);
            if (!current.rows || current.rows.length === 0) {
                return res.status(404).json({ success: false, error: `Service #${serviceId} not found` });
            }
            newStatus = !current.rows[0].is_available;
        }

        await query(
            `UPDATE services SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE service_id = ?`,
            [newStatus, serviceId]
        );

        return res.status(200).json({
            success: true,
            service_id: Number(serviceId),
            is_available: newStatus,
            message: `Service is now ${newStatus ? 'AVAILABLE' : 'UNAVAILABLE'}`
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Failed to toggle service availability',
            details: err.message
        });
    }
}

/**
 * 6. Delete Service
 * DELETE /api/vendors/:vendorId/services/:serviceId
 * DELETE /api/services/:serviceId
 */
async function deleteService(req, res) {
    try {
        const { serviceId, vendorId } = req.params;

        let sql = `DELETE FROM services WHERE service_id = ?`;
        const params = [serviceId];
        if (vendorId) {
            sql += ` AND (vendor_id = ? OR CAST(vendor_id AS TEXT) = ?)`;
            params.push(vendorId, String(vendorId));
        }

        const delRes = await query(sql, params);
        if (delRes.rowCount === 0) {
            return res.status(404).json({ success: false, error: `Service #${serviceId} not found` });
        }

        return res.status(200).json({
            success: true,
            message: `Service #${serviceId} deleted successfully`
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Failed to delete service',
            details: err.message
        });
    }
}

module.exports = {
    addService,
    getVendorServices,
    getServiceById,
    updateService,
    toggleServiceAvailability,
    deleteService
};
