const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/gif', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff',
    'image/svg+xml', 'application/octet-stream'
];

const EXT_TO_MIME = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.webp': 'image/webp',
    '.gif': 'image/gif', '.heic': 'image/heic',
    '.heif': 'image/heif', '.bmp': 'image/bmp',
    '.tiff': 'image/tiff', '.svg': 'image/svg+xml'
};

function resolveExtension(file) {
    const mimeToExt = {
        'image/jpeg': '.jpg', 'image/jpg': '.jpg',
        'image/png': '.png', 'image/webp': '.webp',
        'image/gif': '.gif', 'image/heic': '.jpg',
        'image/heif': '.jpg', 'image/avif': '.jpg', 'image/bmp': '.bmp', 'image/tiff': '.tiff',
    };
    if (file.mimetype && mimeToExt[file.mimetype.toLowerCase()]) {
        return mimeToExt[file.mimetype.toLowerCase()];
    }
    const extFromName = path.extname(file.originalname || '').toLowerCase();
    if (extFromName === '.avif' || extFromName === '.heic' || extFromName === '.heif') {
        return '.jpg';
    }
    return extFromName || '.jpg';
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = resolveExtension(file);
        const unique = `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, unique);
    }
});

const fileFilter = (req, file, cb) => {
    const mimeOk = ALLOWED_MIME_TYPES.includes((file.mimetype || '').toLowerCase());
    const ext = path.extname(file.originalname || '').toLowerCase();
    const extOk = !ext || Object.keys(EXT_TO_MIME).includes(ext);

    if (mimeOk || extOk) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only image files are allowed.'));
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

function handleMulterError(err, req, res, next) {
    if (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message, code: err.code });
        }
        return res.status(500).json({ error: 'File upload failed.', details: err.message });
    }
    next();
}

module.exports = {
    upload,
    handleMulterError
};
