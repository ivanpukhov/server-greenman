const { buildCdekItems } = require('./itemsMapper');
const { buildPackages } = require('./buildPackages');

const DEFAULT_TARIFF_CODE = 482; // дверь-дверь, интернет-магазин
const CONTRACT_TYPE = 1; // интернет-магазин

const normalizePhoneE164 = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('7')) return `+${digits}`;
    if (digits.startsWith('8') && digits.length === 11) return `+7${digits.slice(1)}`;
    if (digits.length === 10) return `+7${digits}`;
    return digits.startsWith('+') ? digits : `+${digits}`;
};

const buildOrderPayload = (order) => {
    const tariffCode = Number(process.env.CDEK_TARIFF_CODE || DEFAULT_TARIFF_CODE);

    const senderCityCode = Number(process.env.CDEK_SENDER_CITY_CODE);
    const senderAddress = process.env.CDEK_SENDER_ADDRESS;
    const senderName = process.env.CDEK_SENDER_NAME || 'Green Man';
    const senderPhone = process.env.CDEK_SENDER_PHONE;
    const senderCompany = process.env.CDEK_SENDER_COMPANY || 'Green Man';

    if (!senderCityCode || !senderAddress || !senderPhone) {
        throw new Error('CDEK sender is not configured (CDEK_SENDER_CITY_CODE, CDEK_SENDER_ADDRESS, CDEK_SENDER_PHONE)');
    }

    const items = buildCdekItems(order.products);
    const orderNumber = `GM-${order.id}`;
    const packages = buildPackages({ orderNumber, items });

    return {
        type: CONTRACT_TYPE,
        tariff_code: tariffCode,
        number: orderNumber,
        comment: `Интернет-магазин Greenman, заказ #${order.id}`,
        sender: {
            name: senderName,
            company: senderCompany,
            phones: [{ number: senderPhone }]
        },
        from_location: {
            code: senderCityCode,
            address: senderAddress
        },
        recipient: {
            name: order.customerName,
            email: order.email || undefined,
            phones: [{ number: normalizePhoneE164(order.phoneNumber) }]
        },
        to_location: {
            code: Number(order.cdekCityCode),
            address: order.cdekAddress
        },
        packages
    };
};

module.exports = {
    buildOrderPayload,
    normalizePhoneE164,
    DEFAULT_TARIFF_CODE
};
