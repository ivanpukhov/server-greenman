const { Op } = require('sequelize');
const { Post } = require('../../models/social');
const { setAttachments, attachMap } = require('../../services/social/attachments');
const { parseLimit, parseCursor } = require('../../services/social/paginate');
const { attachEngagement } = require('../../services/social/engagement');

const ATTACH_TYPE = 'post';

exports.adminList = async (req, res) => {
    try {
        const items = await Post.findAll({ order: [['id', 'DESC']] });
        const media = await attachMap(ATTACH_TYPE, items.map((p) => p.id));
        res.json(items.map((p) => ({ ...p.toJSON(), media: media.get(p.id) || [] })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminCreate = async (req, res) => {
    try {
        const adminUserId = req.admin?.adminUserId || req.admin?.id || 0;
        const { text, publishedAt, isDraft, mediaIds } = req.body || {};
        const post = await Post.create({
            adminUserId,
            text: text || null,
            publishedAt: publishedAt ? new Date(publishedAt) : (isDraft === false ? new Date() : null),
            isDraft: isDraft !== false
        });
        await setAttachments(ATTACH_TYPE, post.id, mediaIds || []);
        res.status(201).json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminUpdate = async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post) return res.status(404).json({ message: 'Пост не найден' });
        const { text, publishedAt, isDraft, mediaIds } = req.body || {};
        if (text !== undefined) post.text = text;
        if (publishedAt !== undefined) post.publishedAt = publishedAt ? new Date(publishedAt) : null;
        if (isDraft !== undefined) {
            post.isDraft = !!isDraft;
            if (!post.isDraft && !post.publishedAt) post.publishedAt = new Date();
        }
        await post.save();
        if (Array.isArray(mediaIds)) {
            await setAttachments(ATTACH_TYPE, post.id, mediaIds);
        }
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminRemove = async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post) return res.status(404).json({ message: 'Пост не найден' });
        await post.destroy();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.publicList = async (req, res) => {
    try {
        const limit = parseLimit(req.query.limit, 20, 50);
        const before = parseCursor(req.query.before);
        const where = { isDraft: false, publishedAt: { [Op.not]: null } };
        if (before) where.id = { [Op.lt]: before };
        const items = await Post.findAll({ where, order: [['publishedAt', 'DESC'], ['id', 'DESC']], limit });
        const media = await attachMap(ATTACH_TYPE, items.map((p) => p.id));
        res.json(items.map((p) => ({ ...p.toJSON(), media: media.get(p.id) || [] })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.publicGet = async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post || post.isDraft || !post.publishedAt) {
            return res.status(404).json({ message: 'Пост не найден' });
        }
        const media = await attachMap(ATTACH_TYPE, [post.id]);
        const obj = { ...post.toJSON(), media: media.get(post.id) || [] };
        await attachEngagement(obj, 'post', req.user?.userId || null);
        res.json(obj);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
