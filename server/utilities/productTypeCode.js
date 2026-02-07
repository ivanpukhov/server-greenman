const normalizeCodePart = (value) => {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9а-яё-]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'na';
};

const buildProductTypeCode = (productName, typeName) => {
    return `greenman-${normalizeCodePart(productName)}-${normalizeCodePart(typeName)}`;
};

const buildQrCodeUrl = (code) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(code)}`;
};

module.exports = {
    buildProductTypeCode,
    buildQrCodeUrl
};
