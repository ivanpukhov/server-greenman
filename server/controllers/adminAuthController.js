const User = require('../models/orders/User');
const jwtUtility = require('../utilities/jwtUtility');
const sendNotification = require('../utilities/notificationService');
const { getAdminByIin, normalizeAdminIinStrict } = require('../utilities/adminUsers');
const CODE_LIFETIME_MS = 10 * 60 * 1000;

const generateConfirmationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const adminAuthController = {
    async requestCode(req, res) {
        try {
            const normalizedIin = normalizeAdminIinStrict(req.body.iin);

            if (!normalizedIin) {
                return res.status(400).json({ message: 'Введите корректный ИИН (12 цифр)' });
            }

            const adminProfile = await getAdminByIin(normalizedIin);

            if (!adminProfile) {
                return res.status(403).json({ message: 'Доступ к админ-панели запрещен для этого ИИН' });
            }

            let user = await User.findOne({ where: { phoneNumber: adminProfile.phoneNumber } });

            if (!user) {
                user = await User.create({
                    phoneNumber: adminProfile.phoneNumber,
                    role: 'admin',
                    isPhoneConfirmed: false
                });
            }

            user.role = 'admin';
            user.confirmationCode = generateConfirmationCode();
            user.confirmationCodeExpires = new Date(Date.now() + CODE_LIFETIME_MS);
            await user.save();

            await sendNotification(
                adminProfile.phoneNumber,
                `Код входа в админ-панель Greenman: ${user.confirmationCode}`
            );

            return res.status(200).json({
                message: 'Код подтверждения отправлен',
                phoneMask: `+7${String(adminProfile.phoneNumber).slice(0, 3)}***${String(adminProfile.phoneNumber).slice(-2)}`
            });
        } catch (error) {
            return res.status(500).json({ message: 'Ошибка при отправке кода', error: error.message });
        }
    },

    async confirmCode(req, res) {
        try {
            const normalizedIin = normalizeAdminIinStrict(req.body.iin);
            const confirmationCode = String(req.body.confirmationCode || '').replace(/\D/g, '');

            if (!normalizedIin || confirmationCode.length !== 6) {
                return res.status(400).json({ message: 'Некорректные данные для входа' });
            }

            const adminProfile = await getAdminByIin(normalizedIin);

            if (!adminProfile) {
                return res.status(403).json({ message: 'Доступ запрещен' });
            }

            const user = await User.findOne({ where: { phoneNumber: adminProfile.phoneNumber } });

            if (!user || user.confirmationCode !== confirmationCode || new Date() > user.confirmationCodeExpires) {
                return res.status(400).json({ message: 'Неверный или просроченный код' });
            }

            user.confirmationCode = null;
            user.confirmationCodeExpires = null;
            user.isPhoneConfirmed = true;
            user.role = 'admin';
            await user.save();

            const token = jwtUtility.generateToken(user.id, {
                isAdmin: true,
                phoneNumber: user.phoneNumber,
                iin: adminProfile.iin,
                role: 'admin',
                fullName: adminProfile?.fullName || `+7${user.phoneNumber}`
            });

            return res.status(200).json({
                token,
                user: {
                    id: user.id,
                    phoneNumber: user.phoneNumber,
                    iin: adminProfile.iin,
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
