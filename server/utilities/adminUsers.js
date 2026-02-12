const AdminUser = require('../models/orders/AdminUser');
const DEFAULT_ADMIN_IIN = '000000000000';
const FALLBACK_ADMIN = {
    phoneNumber: '7073670497',
    fullName: 'Иван',
    iin: '041007550334'
};

const DEFAULT_ADMIN_USERS = [
    FALLBACK_ADMIN
];

const normalizeAdminPhone = (rawPhone) => {
    const digits = String(rawPhone || '').replace(/\D/g, '');

    if (digits.length === 10) {
        return digits;
    }

    if (digits.length === 11 && digits.startsWith('7')) {
        return digits.slice(1);
    }

    return null;
};

const normalizeAdminIin = (rawIin) => {
    const digits = String(rawIin || '').replace(/\D/g, '');

    if (!digits) {
        return DEFAULT_ADMIN_IIN;
    }

    if (digits.length !== 12) {
        return null;
    }

    return digits;
};

const normalizeAdminIinStrict = (rawIin) => {
    const digits = String(rawIin || '').replace(/\D/g, '');
    return digits.length === 12 ? digits : null;
};

const ensureDefaultAdmins = async () => {
    await Promise.all(
        DEFAULT_ADMIN_USERS.map(async (admin) => {
            const existing = await AdminUser.findOne({
                where: {
                    phoneNumber: admin.phoneNumber
                }
            });

            if (existing) {
                if (!existing.isActive || existing.fullName !== admin.fullName || existing.iin !== admin.iin) {
                    await existing.update({
                        fullName: admin.fullName,
                        iin: admin.iin,
                        isActive: true
                    });
                }
                return;
            }

            await AdminUser.create({
                phoneNumber: admin.phoneNumber,
                fullName: admin.fullName,
                iin: admin.iin,
                isActive: true
            });
        })
    );
};

const getActiveAdmins = async () => {
    const admins = await AdminUser.findAll({
        where: { isActive: true },
        order: [['fullName', 'ASC']]
    });

    return admins.map((admin) => admin.toJSON());
};

const getAdminByPhone = async (phoneNumber) => {
    const normalizedPhone = normalizeAdminPhone(phoneNumber);
    if (!normalizedPhone) {
        return null;
    }

    const admin = await AdminUser.findOne({
        where: {
            phoneNumber: normalizedPhone,
            isActive: true
        }
    });

    if (admin) {
        return admin.toJSON();
    }

    if (normalizedPhone === FALLBACK_ADMIN.phoneNumber) {
        return {
            id: 'fallback-admin',
            ...FALLBACK_ADMIN,
            isActive: true,
            isFallback: true
        };
    }

    return null;
};

const isAdminPhoneAllowed = async (phoneNumber) => {
    const admin = await getAdminByPhone(phoneNumber);
    return Boolean(admin);
};

const getAdminByIin = async (iin) => {
    const normalizedIin = normalizeAdminIinStrict(iin);
    if (!normalizedIin) {
        return null;
    }

    const admin = await AdminUser.findOne({
        where: {
            iin: normalizedIin,
            isActive: true
        }
    });

    if (admin) {
        return admin.toJSON();
    }

    if (normalizedIin === FALLBACK_ADMIN.iin) {
        return {
            id: 'fallback-admin',
            ...FALLBACK_ADMIN,
            isActive: true,
            isFallback: true
        };
    }

    return null;
};

const isAdminIinAllowed = async (iin) => {
    const admin = await getAdminByIin(iin);
    return Boolean(admin);
};

module.exports = {
    DEFAULT_ADMIN_USERS,
    FALLBACK_ADMIN,
    DEFAULT_ADMIN_IIN,
    normalizeAdminPhone,
    normalizeAdminIin,
    normalizeAdminIinStrict,
    ensureDefaultAdmins,
    getActiveAdmins,
    getAdminByPhone,
    getAdminByIin,
    isAdminPhoneAllowed,
    isAdminIinAllowed
};
