const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.resolve(__dirname, '..', 'logs');
const ERROR_LOG_FILE = path.join(LOGS_DIR, 'errors.log');

const toSafeObject = (value) => {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value !== 'object') {
        return value;
    }

    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_error) {
        return String(value);
    }
};

const logError = (context, error, meta = {}) => {
    const payload = {
        timestamp: new Date().toISOString(),
        level: 'error',
        context: String(context || 'unknown'),
        message: error?.message || String(error || 'Unknown error'),
        stack: error?.stack || null,
        meta: toSafeObject(meta)
    };

    const line = `${JSON.stringify(payload)}\n`;

    try {
        if (!fs.existsSync(LOGS_DIR)) {
            fs.mkdirSync(LOGS_DIR, { recursive: true });
        }
        fs.appendFileSync(ERROR_LOG_FILE, line, 'utf8');
    } catch (fileError) {
        // Fallback to console when file logging is unavailable.
        console.error('Не удалось записать ошибку в лог-файл:', fileError);
    }

    console.error(`[${payload.context}]`, payload.message, payload.meta || {});
};

module.exports = {
    logError
};
