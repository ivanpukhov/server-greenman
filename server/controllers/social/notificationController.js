const { SocialNotification } = require('../../models/social');

exports.list = async (req, res) => {
    try {
        const userId = req.user?.userId || null;
        const adminUserId = req.admin?.adminUserId || req.admin?.id || null;
        const where = {};
        if (userId) where.userId = userId;
        else if (adminUserId) where.adminUserId = adminUserId;
        else return res.status(401).json({ message: 'Нужна авторизация' });
        const items = await SocialNotification.findAll({ where, order: [['id', 'DESC']], limit: 100 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.markRead = async (req, res) => {
    try {
        const userId = req.user?.userId || null;
        const adminUserId = req.admin?.adminUserId || req.admin?.id || null;
        const n = await SocialNotification.findByPk(req.params.id);
        if (!n) return res.status(404).json({ message: 'Не найдено' });
        if ((userId && n.userId !== userId) && (adminUserId && n.adminUserId !== adminUserId)) {
            return res.status(403).json({ message: 'Нет прав' });
        }
        n.readAt = new Date();
        await n.save();
        res.json(n);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
