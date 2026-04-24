const { Comment } = require('../../models/social');
const User = require('../../models/orders/User');

const ALLOWED = new Set(['post', 'reel', 'webinar', 'article', 'course_day']);

async function hydrateAuthors(items) {
    const userIds = [...new Set(items.map((c) => c.userId).filter(Boolean))];
    const users = userIds.length
        ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'phoneNumber'] })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    return items.map((c) => {
        const json = c.toJSON ? c.toJSON() : c;
        if (json.adminUserId) {
            json.author = { id: `admin-${json.adminUserId}`, name: 'Greenman', kind: 'admin' };
        } else if (json.userId) {
            const u = userMap.get(json.userId);
            const phone = u?.phoneNumber ?? '';
            const last4 = phone.replace(/\D/g, '').slice(-4);
            json.author = {
                id: `user-${json.userId}`,
                name: last4 ? `Пользователь •••${last4}` : 'Пользователь',
                kind: 'user',
            };
        } else {
            json.author = { id: 'anon', name: 'Гость', kind: 'anon' };
        }
        return json;
    });
}

exports.list = async (req, res) => {
    try {
        const { type, id } = req.query;
        if (!ALLOWED.has(type) || !id) return res.status(400).json({ message: 'type и id обязательны' });
        const items = await Comment.findAll({
            where: { commentableType: type, commentableId: Number(id), isDeleted: false },
            order: [['id', 'ASC']],
        });
        const hydrated = await hydrateAuthors(items);
        res.json(hydrated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const userId = req.user?.userId || null;
        const adminUserId = req.admin?.adminUserId || req.admin?.id || null;
        if (!userId && !adminUserId) return res.status(401).json({ message: 'Нужна авторизация' });
        const { type, id, body, parentCommentId } = req.body || {};
        if (!ALLOWED.has(type) || !id || !body) return res.status(400).json({ message: 'type, id, body обязательны' });
        const c = await Comment.create({
            commentableType: type,
            commentableId: Number(id),
            userId,
            adminUserId,
            body,
            parentCommentId: parentCommentId ? Number(parentCommentId) : null,
        });
        const [hydrated] = await hydrateAuthors([c]);
        res.status(201).json(hydrated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const c = await Comment.findByPk(req.params.id);
        if (!c || c.isDeleted) return res.status(404).json({ message: 'Комментарий не найден' });
        const userId = req.user?.userId || null;
        const adminUserId = req.admin?.adminUserId || req.admin?.id || null;
        const isOwner = (userId && c.userId === userId) || (adminUserId && c.adminUserId === adminUserId);
        const isAdmin = !!adminUserId;
        if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Нет прав' });
        const { body } = req.body || {};
        if (body !== undefined) {
            c.body = body;
            c.editedAt = new Date();
        }
        await c.save();
        const [hydrated] = await hydrateAuthors([c]);
        res.json(hydrated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const c = await Comment.findByPk(req.params.id);
        if (!c) return res.status(404).json({ message: 'Комментарий не найден' });
        const userId = req.user?.userId || null;
        const adminUserId = req.admin?.adminUserId || req.admin?.id || null;
        const isOwner = (userId && c.userId === userId) || (adminUserId && c.adminUserId === adminUserId);
        const isAdmin = !!adminUserId;
        if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Нет прав' });
        c.isDeleted = true;
        await c.save();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminListAll = async (req, res) => {
    const where = { isDeleted: false };
    if (req.query.type) where.commentableType = req.query.type;
    const items = await Comment.findAll({
        where,
        order: [['id', 'DESC']],
        limit: Math.min(500, Number(req.query.limit) || 100),
    });
    const hydrated = await hydrateAuthors(items);
    res.json(hydrated);
};
