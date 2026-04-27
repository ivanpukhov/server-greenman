const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const UPLOADS_SUBDIR = 'uploads/products';

const MIME_EXTENSIONS = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
};

const ensureDir = async (dir) => {
    await fs.promises.mkdir(dir, { recursive: true });
};

const extensionFromFile = (file) => {
    const fromName = path.extname(file.originalname || '').toLowerCase();
    if (fromName && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(fromName)) {
        return fromName === '.jpeg' ? '.jpg' : fromName;
    }

    return MIME_EXTENSIONS[file.mimetype] || '';
};

const storeProductImage = async (file) => {
    if (!file || !file.buffer) {
        throw new Error('Файл изображения не передан');
    }

    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const subdir = path.join(UPLOADS_SUBDIR, yyyy, mm);
    const absDir = path.join(PUBLIC_DIR, subdir);
    await ensureDir(absDir);

    const filename = `${crypto.randomUUID()}${extensionFromFile(file)}`;
    const relativeKey = path.posix.join(UPLOADS_SUBDIR, yyyy, mm, filename);
    await fs.promises.writeFile(path.join(PUBLIC_DIR, relativeKey), file.buffer);

    return `/${relativeKey}`;
};

module.exports = {
    storeProductImage
};
