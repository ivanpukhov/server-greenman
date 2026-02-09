const User = require('../models/orders/User');
const jwtUtility = require('../utilities/jwtUtility');
const sendNotification = require('../utilities/notificationService');
const { isAdminPhoneAllowed, getAdminByPhone } = require('../utilities/adminUsers');
const CODE_LIFETIME_MS = 10 * 60 * 1000;

const normalizePhoneNumber = (rawPhone) => {
    const digitsOnly = String(rawPhone || '').replace(/\D/g, '');

    if (digitsOnly.length === 10) {
        return digitsOnly;
    }

    if (digitsOnly.length === 11 && digitsOnly.startsWith('7')) {
        return digitsOnly.slice(1);
    }

    return null;
};

const generateConfirmationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const adminAuthController = {
    async requestCode(req, res) {
        try {
            const normalizedPhone = normalizePhoneNumber(req.body.phoneNumber);

            if (!normalizedPhone) {
                return res.status(400).json({ message: 'Некорректный номер телефона' });
            }

            if (!(await isAdminPhoneAllowed(normalizedPhone))) {
                return res.status(403).json({ message: 'Доступ к админ-панели запрещен для этого номера' });
            }

            let user = await User.findOne({ where: { phoneNumber: normalizedPhone } });

            if (!user) {
                user = await User.create({
                    phoneNumber: normalizedPhone,
                    role: 'admin',
                    isPhoneConfirmed: false
                });
            }

            user.role = 'admin';
            user.confirmationCode = generateConfirmationCode();
            user.confirmationCodeExpires = new Date(Date.now() + CODE_LIFETIME_MS);
            await user.save();

            await sendNotification(normalizedPhone, `Код входа в админ-панель Greenman: ${user.confirmationCode}`);

            return res.status(200).json({ message: 'Код подтверждения отправлен' });
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка при отправке кода', error: error.message });
        }
    },

    async confirmCode(req, res) {
        try {
            const normalizedPhone = normalizePhoneNumber(req.body.phoneNumber);
            const confirmationCode = String(req.body.confirmationCode || '').replace(/\D/g, '');

            if (!normalizedPhone || confirmationCode.length !== 6) {
                return res.status(400).json({ message: 'Некорректные данные для входа' });
            }

            if (!(await isAdminPhoneAllowed(normalizedPhone))) {
                return res.status(403).json({ message: 'Доступ запрещен' });
            }

            const user = await User.findOne({ where: { phoneNumber: normalizedPhone } });

            if (!user || user.confirmationCode !== confirmationCode || new Date() > user.confirmationCodeExpires) {
                return res.status(400).json({ message: 'Неверный или просроченный код' });
            }

            user.confirmationCode = null;
            user.confirmationCodeExpires = null;
            user.isPhoneConfirmed = true;
            user.role = 'admin';
            await user.save();

            const adminProfile = await getAdminByPhone(user.phoneNumber);

            const token = jwtUtility.generateToken(user.id, {
                isAdmin: true,
                phoneNumber: user.phoneNumber,
                role: 'admin',
                fullName: adminProfile?.fullName || `+7${user.phoneNumber}`
            });

            return res.status(200).json({
                token,
                user: {
                    id: user.id,
                    phoneNumber: user.phoneNumber,
                    role: 'admin',
                    fullName: adminProfile?.fullName || `+7${user.phoneNumber}`
                }
            });
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка при подтверждении кода', error: error.message });
        }
    }
};

module.exports = adminAuthController;
