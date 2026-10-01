const path = require('path');
const fs = require('fs');
const { query } = require('../../models/db');
const { resolveImageUrl, normalizeImageUrl, DEFAULT_PRODUCT_SERVICE_IMAGE } = require('../../utils/imageUtils');
const { formatISTISO, formatISTReadable } = require('../../utils/time');

/**
 * Helper: Resolve Base URL from Request
 */
function getBaseUrl(req) {
    if (process.env.PUBLIC_API_URL) {
        return process.env.PUBLIC_API_URL.replace(/\/$/, '');
    }
    const host = req.get('host') || 'localhost:5000';
    const isHttps = req.secure || req.get('x-forwarded-proto') === 'https' || host.includes('onrender.com');
    const proto = isHttps ? 'https' : (req.protocol || 'http');
    return `${proto}://${host}`;
}

/**
 * Helper: Process Base64 image upload if provided
 */
function processBase64Upload(req) {
    const body = req.body || {};
    let rawBase64 = body.base64 || body.image_base64 || body.file_base64 || body.photo_base64 || body.data;

    if (!rawBase64) {
        const candidate = body.image || body.photo || body.service_photo || body.image_url || body.imageUrl || body.service_image;
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
 * Helper: Extract candidate image from request (multipart file, base64, or direct URL string)
 */
function extractCandidateImage(req) {
    // 1. Multipart uploaded file via multer (req.file or first file in req.files)
    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    if (file) {
        const baseUrl = getBaseUrl(req);
        return `${baseUrl}/uploads/${file.filename}`;
    }

    // 2. Base64 payload in req.body
    const b64 = processBase64Upload(req);
    if (b64 && b64.image_url) {
        return b64.image_url;
    }

    // 3. String URL or array in req.body
    const body = req.body || {};
    const raw = body.image_url ?? body.imageUrl ?? body.image ?? body.photo ?? body.photo_url ?? body.photoUrl ??
                body.service_image ?? body.serviceImage ?? body.service_photo ?? body.servicePhoto ??
                body.picture ?? body.img ?? (Array.isArray(body.images) && body.images.length > 0 ? body.images[0] : null);

    if (raw && typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed && trimmed.length > 4 && trimmed !== 'null' && trimmed !== 'undefined') {
            return trimmed;
        }
    }

    return null;
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
 * Helper: Format service record for response with complete alias keys for frontend app & web
 */
function formatServiceRow(row) {
    if (!row) return null;
    const finalImage = normalizeImageUrl(row.image_url, DEFAULT_PRODUCT_SERVICE_IMAGE);
    const isAvail = row.is_available === true || row.is_available === 1 || row.is_available === '1';

    return {
        service_id: Number(row.service_id),
        id: Number(row.service_id),
        vendor_id: Number(row.vendor_id),
        service_name: row.service_name,
        name: row.service_name,
        title: row.service_name,
        category: row.category || 'General Services',
        price: parseFloat(row.price || 0),
        visiting_charge: parseFloat(row.visiting_charge || 0),
        estimated_duration: row.estimated_duration || '1 hour',
        duration: row.estimated_duration || '1 hour',
        service_location: row.service_location || "At Customer's Doorstep",
        location: row.service_location || "At Customer's Doorstep",
        description: row.description || '',
        image_url: finalImage,
        imageUrl: finalImage,
        image: finalImage,
        photo_url: finalImage,
        photoUrl: finalImage,
        photo: finalImage,
        service_image: finalImage,
        service_photo: finalImage,
        images: finalImage ? [finalImage] : [],
        is_available: isAvail,
        isAvailable: isAvail,
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

        // Process Image: file upload (multer), base64, or direct URL string (all aliases supported)
        const candidateImg = extractCandidateImage(req);
        const finalImage = candidateImg ? await resolveImageUrl(candidateImg, DEFAULT_PRODUCT_SERVICE_IMAGE) : DEFAULT_PRODUCT_SERVICE_IMAGE;

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
 * POST /api/vendorPanel/:vendorId/services/:serviceId
 */
async function updateService(req, res) {
    try {
        const serviceId = req.params.serviceId || req.body?.service_id || req.body?.serviceId;
        const vendorId = req.params.vendorId || req.body?.vendor_id || req.body?.vendorId || req.user?.vendor_id;

        if (!serviceId) {
            return res.status(400).json({ success: false, error: 'serviceId is required' });
        }

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

        const serviceName = (body.service_name ?? body.serviceName ?? body.name ?? body.title) !== undefined
            ? String(body.service_name ?? body.serviceName ?? body.name ?? body.title).trim()
            : existing.service_name;

        const category = body.category !== undefined ? String(body.category).trim() : existing.category;

        const price = (body.price !== undefined || body.service_price !== undefined || body.servicePrice !== undefined)
            ? Math.max(0, parseFloat(body.price ?? body.service_price ?? body.servicePrice ?? 0) || 0)
            : parseFloat(existing.price || 0);

        const visitingCharge = (body.visiting_charge !== undefined || body.visitingCharge !== undefined || body.visiting_fee !== undefined || body.visitingFee !== undefined || body.inspection_charge !== undefined)
            ? Math.max(0, parseFloat(body.visiting_charge ?? body.visitingCharge ?? body.visiting_fee ?? body.visitingFee ?? body.inspection_charge ?? 0) || 0)
            : parseFloat(existing.visiting_charge || 0);

        const estimatedDuration = (body.estimated_duration ?? body.estimatedDuration ?? body.duration) !== undefined
            ? String(body.estimated_duration ?? body.estimatedDuration ?? body.duration).trim()
            : existing.estimated_duration;

        const serviceLocation = (body.service_location ?? body.serviceLocation ?? body.location) !== undefined
            ? normalizeServiceLocation(body.service_location ?? body.serviceLocation ?? body.location)
            : existing.service_location;

        const description = (body.description ?? body.service_description ?? body.serviceDescription) !== undefined
            ? String(body.description ?? body.service_description ?? body.serviceDescription).trim()
            : existing.description;

        let isAvailable = existing.is_available;
        if (body.is_available !== undefined || body.isAvailable !== undefined || body.available !== undefined) {
            const rawAvail = body.is_available ?? body.isAvailable ?? body.available;
            isAvailable = rawAvail === true || rawAvail === 'true' || rawAvail === 1 || rawAvail === '1';
        }

        // Process image update if new file, base64, or direct URL provided
        let newImageUrl = existing.image_url;
        const candidateImg = extractCandidateImage(req);
        if (candidateImg) {
            newImageUrl = await resolveImageUrl(candidateImg, DEFAULT_PRODUCT_SERVICE_IMAGE);
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
 * 4b. Dedicated Update Service Photo / Image Only
 * POST, PUT, PATCH /api/vendorPanel/:vendorId/services/:serviceId/image
 * POST, PUT, PATCH /api/services/:serviceId/image
 */
async function updateServiceImage(req, res) {
    try {
        const serviceId = req.params.serviceId || req.body?.service_id;
        const vendorId = req.params.vendorId || req.body?.vendor_id;

        if (!serviceId) {
            return res.status(400).json({ success: false, error: 'serviceId is required' });
        }

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

        const candidateImg = extractCandidateImage(req);
        if (!candidateImg) {
            return res.status(400).json({
                success: false,
                error: 'No image provided. Please upload an image file (multipart key "image" or "photo"), base64 string, or image_url.',
                code: 'NO_IMAGE_PROVIDED'
            });
        }

        const finalImage = await resolveImageUrl(candidateImg, DEFAULT_PRODUCT_SERVICE_IMAGE);

        const updateRes = await query(
            `UPDATE services SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE service_id = ? RETURNING *`,
            [finalImage, serviceId]
        );

        const updatedService = formatServiceRow(updateRes.rows[0]);

        return res.status(200).json({
            success: true,
            message: 'Service photo updated successfully',
            service_id: Number(serviceId),
            image_url: finalImage,
            imageUrl: finalImage,
            image: finalImage,
            photo_url: finalImage,
            photoUrl: finalImage,
            photo: finalImage,
            service: updatedService,
            data: updatedService
        });
    } catch (err) {
        console.error('❌ [UPDATE SERVICE IMAGE ERROR]:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to update service image',
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
    updateServiceImage,
    toggleServiceAvailability,
    deleteService
};
