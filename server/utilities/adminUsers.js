const AdminUser = require('../models/orders/AdminUser');

const DEFAULT_ADMIN_USERS = [
    { phoneNumber: '7775464450', fullName: 'Наталья' },
    { phoneNumber: '7055596645', fullName: 'Константин' },
    { phoneNumber: '7073670497', fullName: 'Иван' },
    { phoneNumber: '7474509360', fullName: 'Даниил' }
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

const ensureDefaultAdmins = async () => {
    await Promise.all(
        DEFAULT_ADMIN_USERS.map(async (admin) => {
            const existing = await AdminUser.findOne({
                where: {
                    phoneNumber: admin.phoneNumber
                }
            });

            if (existing) {
                if (!existing.isActive || existing.fullName !== admin.fullName) {
                    await existing.update({
                        fullName: admin.fullName,
                        isActive: true
                    });
                }
                return;
            }

            await AdminUser.create({
                phoneNumber: admin.phoneNumber,
                fullName: admin.fullName,
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

    return admin ? admin.toJSON() : null;
};

const isAdminPhoneAllowed = async (phoneNumber) => {
    const admin = await getAdminByPhone(phoneNumber);
    return Boolean(admin);
};

module.exports = {
    DEFAULT_ADMIN_USERS,
    normalizeAdminPhone,
    ensureDefaultAdmins,
    getActiveAdmins,
    getAdminByPhone,
    isAdminPhoneAllowed
};
