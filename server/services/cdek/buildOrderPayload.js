const { get: getSetting } = require('./settingsStore');
const { buildCdekItems } = require('./itemsMapper');
const { buildPackages } = require('./buildPackages');

const DEFAULT_TARIFF_CODE = 482;
const DEFAULT_PVZ_TARIFF_CODE = 483;
const CONTRACT_TYPE = 1;

const normalizePhoneE164 = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('7')) return `+${digits}`;
    if (digits.startsWith('8') && digits.length === 11) return `+7${digits.slice(1)}`;
    if (digits.length === 10) return `+7${digits}`;
    return digits.startsWith('+') ? digits : `+${digits}`;
};

const buildOrderPayload = async (order) => {
    const isPvzDelivery = String(order.cdekDeliveryMode || 'door').trim().toLowerCase() === 'pvz';
    const tariffCode = Number(
        await getSetting(isPvzDelivery ? 'CDEK_TARIFF_CODE_PVZ' : 'CDEK_TARIFF_CODE')
        || (isPvzDelivery ? DEFAULT_PVZ_TARIFF_CODE : DEFAULT_TARIFF_CODE)
    );
    const senderCityCode = Number(await getSetting('CDEK_SENDER_CITY_CODE'));
    const senderAddress = await getSetting('CDEK_SENDER_ADDRESS');
    const senderName = await getSetting('CDEK_SENDER_NAME') || 'Green Man';
    const senderPhone = await getSetting('CDEK_SENDER_PHONE');
    const senderCompany = await getSetting('CDEK_SENDER_COMPANY') || 'Green Man';

    if (!senderCityCode || !senderAddress || !senderPhone) {
        throw new Error('СДЭК не настроен — заполните раздел «Настройки СДЭК» в админке (код города отправителя, адрес, телефон)');
    }

    const items = buildCdekItems(order.products);
    const orderNumber = `GM-${order.id}`;
    const packages = buildPackages({ orderNumber, items });

    const payload = {
        type: CONTRACT_TYPE,
        tariff_code: tariffCode,
        number: orderNumber,
        comment: `Интернет-магазин Greenman, заказ #${order.id}${isPvzDelivery ? ', выдача в ПВЗ' : ', доставка до двери'}`,
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
        packages
    };

    if (isPvzDelivery) {
        if (!order.cdekPvzCode) {
            throw new Error('Для доставки в ПВЗ требуется cdekPvzCode');
        }
        payload.delivery_point = String(order.cdekPvzCode).trim();
    } else {
        payload.to_location = {
            code: Number(order.cdekCityCode),
            address: order.cdekAddress
        };
    }

    return payload;
};

module.exports = {
    buildOrderPayload,
    normalizePhoneE164,
    DEFAULT_TARIFF_CODE,
    DEFAULT_PVZ_TARIFF_CODE
};
