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
            linkedOrderId: null,
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
    if (recentPaymentLink.sellerIin) {
        orderPayload.paymentSellerIin = String(recentPaymentLink.sellerIin);
    }
    if (recentPaymentLink.sellerAdminName) {
        orderPayload.paymentSellerName = String(recentPaymentLink.sellerAdminName);
    }
    return recentPaymentLink;
};

const markPaymentLinkConnectionAsUsed = async (connectionId, orderId) => {
    if (!connectionId || !orderId) {
        return false;
    }

    const [updatedCount] = await SentPaymentLink.update(
        {
            linkedOrderId: orderId,
            usedAt: new Date()
        },
        {
            where: {
                id: connectionId,
                linkedOrderId: null
            }
        }
    );

    return updatedCount > 0;
};

const roundAmount = (value) => Math.round(Number(value) || 0);

const canAutoMarkOrderAsPaidByConnection = (connection, orderTotalPrice) => {
    if (!connection || connection.isPaid !== true) {
        return false;
    }

    const expectedAmount = Number(connection.expectedAmount);
    const paidAmount = Number(connection.paidAmount);
    const orderAmount = roundAmount(orderTotalPrice);

    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
        return false;
    }

    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
        return false;
    }

    return expectedAmount === paidAmount && orderAmount === expectedAmount;
};

module.exports = {
    LINK_LIFETIME_MS,
    normalizePhoneNumber,
    normalizePaymentLink,
    findMatchedLinkInDescription,
    findRecentPaymentLinkForPhone,
    attachRecentPaymentLinkToOrder,
    markPaymentLinkConnectionAsUsed,
    canAutoMarkOrderAsPaidByConnection
};
