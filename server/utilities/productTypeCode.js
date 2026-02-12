const buildProductTypeCode = (productId, typeId) => {
    const normalizedProductId = Number(productId);
    const normalizedTypeId = Number(typeId);

    if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) {
        return '';
    }

    if (!Number.isInteger(normalizedTypeId) || normalizedTypeId <= 0) {
        return '';
    }

    return `https://greenman.kz/product/${normalizedProductId}#${normalizedTypeId}`;
};

const buildQrCodeUrl = (code) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(code)}`;
};

module.exports = {
    buildProductTypeCode,
    buildQrCodeUrl
};
