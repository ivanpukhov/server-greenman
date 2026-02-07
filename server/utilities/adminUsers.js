const ADMIN_USERS = [
    { phoneNumber: '7775464450', fullName: 'Наталья' },
    { phoneNumber: '7055596645', fullName: 'Константин' },
    { phoneNumber: '7073670497', fullName: 'Иван' },
    { phoneNumber: '7474509360', fullName: 'Даниил' }
];

const ADMIN_USERS_BY_PHONE = new Map(ADMIN_USERS.map((item) => [item.phoneNumber, item]));
const ADMIN_PHONE_WHITELIST = new Set(ADMIN_USERS.map((item) => item.phoneNumber));

const getAdminByPhone = (phoneNumber) => ADMIN_USERS_BY_PHONE.get(String(phoneNumber || '')) || null;

module.exports = {
    ADMIN_USERS,
    ADMIN_PHONE_WHITELIST,
    getAdminByPhone
};
