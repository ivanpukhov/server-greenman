const Sequelize = require('sequelize');
const Order = require('../models/orders/Order');

const { Op } = Sequelize;

function normalizeTrackingNumber(value) {
    return String(value || '').trim().toUpperCase();
}

async function findOrderByTrackingNumber(trackingNumber, options = {}) {
    const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
    if (!normalizedTrackingNumber) {
        return null;
    }

    const where = {
        trackingNumber: {
            [Op.not]: null
        },
        [Op.and]: [
            Sequelize.where(
                Sequelize.fn('upper', Sequelize.fn('trim', Sequelize.col('trackingNumber'))),
                normalizedTrackingNumber
            )
        ]
    };

    if (options.excludeOrderId !== undefined && options.excludeOrderId !== null) {
        where.id = {
            [Op.ne]: options.excludeOrderId
        };
    }

    return Order.findOne({ where });
}

module.exports = {
    normalizeTrackingNumber,
    findOrderByTrackingNumber
};
