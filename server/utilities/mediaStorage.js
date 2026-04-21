const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const UPLOADS_SUBDIR = 'uploads/social';

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function extFromMime(mimeType, originalName) {
    if (originalName && originalName.includes('.')) {
        const fromName = path.extname(originalName).toLowerCase();
        if (fromName) return fromName;
    }
    if (!mimeType) return '';
    const map = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
        'video/mp4': '.mp4',
        'video/quicktime': '.mov',
        'video/webm': '.webm',
        'audio/mpeg': '.mp3',
        'audio/mp4': '.m4a',
        'audio/ogg': '.ogg',
        'application/pdf': '.pdf',
        'application/zip': '.zip'
    };
    return map[mimeType] || '';
}

function publicBaseUrl() {
    return process.env.MEDIA_PUBLIC_BASE_URL || '';
}

const LocalAdapter = {
    async put(buffer, { mimeType, originalName }) {
        const now = new Date();
        const yyyy = String(now.getUTCFullYear());
        const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
        const subdir = path.join(UPLOADS_SUBDIR, yyyy, mm);
        const absDir = path.join(PUBLIC_DIR, subdir);
        ensureDir(absDir);
        const ext = extFromMime(mimeType, originalName);
        const filename = `${crypto.randomUUID()}${ext}`;
        const relKey = path.posix.join(subdir, filename);
        const absPath = path.join(PUBLIC_DIR, relKey);
        await fs.promises.writeFile(absPath, buffer);
        const url = `${publicBaseUrl()}/${relKey}`;
        return { key: relKey, url, sizeBytes: buffer.length };
    },
    async delete(key) {
        if (!key) return;
        const abs = path.join(PUBLIC_DIR, key);
        try {
            await fs.promises.unlink(abs);
        } catch (_err) {
            // ignore missing
        }
    },
    getUrl(key) {
        if (!key) return null;
        return `${publicBaseUrl()}/${key}`;
    }
};

const S3Adapter = {
    async put() {
        throw new Error('S3 adapter не настроен. Установите MEDIA_STORAGE=local или реализуйте адаптер.');
    },
    async delete() {},
    getUrl() {
        return null;
    }
};

function getAdapter() {
    const mode = (process.env.MEDIA_STORAGE || 'local').toLowerCase();
    if (mode === 's3') return S3Adapter;
    return LocalAdapter;
}

module.exports = {
    put: (...args) => getAdapter().put(...args),
    delete: (...args) => getAdapter().delete(...args),
    getUrl: (...args) => getAdapter().getUrl(...args)
};
