function parseLimit(value, fallback = 20, max = 100) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(max, Math.floor(n));
}

function parseCursor(value) {
    if (!value) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return n;
}

module.exports = { parseLimit, parseCursor };
