const Sequelize = require('sequelize');
const SentPaymentLink = require('../models/orders/SentPaymentLink');

const { Op } = Sequelize;
const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;

const normalizePhoneNumber = (rawValue) => {
    const digits = String(rawValue || '').replace(/\D/g, '');

    if (digits.length === 10) {
        return digits;
    }

    if (digits.length === 11 && digits.startsWith('7')) {
        return digits.slice(1);
    }

    return null;
};

const normalizePaymentLink = (value) => String(value || '').trim();

const findMatchedLinkInDescription = (description, links) => {
    const normalizedDescription = String(description || '');

    if (!normalizedDescription || !Array.isArray(links) || links.length === 0) {
        return null;
    }

    return links.find((linkItem) => normalizedDescription.includes(normalizePaymentLink(linkItem.url))) || null;
};

const findRecentPaymentLinkForPhone = async (phoneNumber) => {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone) {
        return null;
    }

    const validFrom = new Date(Date.now() - LINK_LIFETIME_MS);

    return SentPaymentLink.findOne({
        where: {
            customerPhone: normalizedPhone,
            receivedAt: {
                [Op.gte]: validFrom
            }
        },
        order: [['receivedAt', 'DESC']]
    });
};

const attachRecentPaymentLinkToOrder = async (orderPayload, phoneNumber) => {
    const recentPaymentLink = await findRecentPaymentLinkForPhone(phoneNumber);

    if (!recentPaymentLink) {
        return null;
    }

    orderPayload.paymentLink = recentPaymentLink.paymentLink;
    return recentPaymentLink.paymentLink;
};

module.exports = {
    LINK_LIFETIME_MS,
    normalizePhoneNumber,
    normalizePaymentLink,
    findMatchedLinkInDescription,
    findRecentPaymentLinkForPhone,
    attachRecentPaymentLinkToOrder
};
