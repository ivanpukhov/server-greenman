const { Op } = require('sequelize');
const { Comment } = require('../../models/social');

const ALLOWED = new Set(['post', 'reel', 'webinar', 'article', 'course_day']);

exports.list = async (req, res) => {
    try {
        const { type, id } = req.query;
        if (!ALLOWED.has(type) || !id) return res.status(400).json({ message: 'type и id обязательны' });
        const items = await Comment.findAll({
            where: { commentableType: type, commentableId: Number(id), isDeleted: false },
            order: [['id', 'ASC']]
        });
        res.json(items);
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
            parentCommentId: parentCommentId ? Number(parentCommentId) : null
        });
        res.status(201).json(c);
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
        res.json(c);
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
    const items = await Comment.findAll({ where, order: [['id', 'DESC']], limit: Math.min(500, Number(req.query.limit) || 100) });
    res.json(items);
};
