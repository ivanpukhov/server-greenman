const { Op } = require('sequelize');
const { Reel, ReelView, Media } = require('../../models/social');
const { parseLimit, parseCursor } = require('../../services/social/paginate');
const { hydrateEngagement, attachEngagement } = require('../../services/social/engagement');

async function hydrate(reel) {
    const obj = reel.toJSON();
    if (reel.videoMediaId) obj.video = (await Media.findByPk(reel.videoMediaId))?.toJSON() || null;
    if (reel.thumbnailMediaId) obj.thumbnail = (await Media.findByPk(reel.thumbnailMediaId))?.toJSON() || null;
    return obj;
}

exports.adminList = async (_req, res) => {
    const items = await Reel.findAll({ order: [['id', 'DESC']] });
    const out = await Promise.all(items.map(hydrate));
    res.json(out);
};

exports.adminCreate = async (req, res) => {
    try {
        const adminUserId = req.admin?.adminUserId || req.admin?.id || 0;
        const { videoMediaId, thumbnailMediaId, description, publishedAt, isDraft } = req.body || {};
        if (!videoMediaId) return res.status(400).json({ message: 'videoMediaId обязателен' });
        const reel = await Reel.create({
            adminUserId,
            videoMediaId,
            thumbnailMediaId: thumbnailMediaId || null,
            description: description || null,
            publishedAt: publishedAt ? new Date(publishedAt) : (isDraft === false ? new Date() : null),
            isDraft: isDraft !== false
        });
        res.status(201).json(await hydrate(reel));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminUpdate = async (req, res) => {
    try {
        const reel = await Reel.findByPk(req.params.id);
        if (!reel) return res.status(404).json({ message: 'Reel не найден' });
        const { videoMediaId, thumbnailMediaId, description, publishedAt, isDraft } = req.body || {};
        if (videoMediaId !== undefined) reel.videoMediaId = videoMediaId;
        if (thumbnailMediaId !== undefined) reel.thumbnailMediaId = thumbnailMediaId;
        if (description !== undefined) reel.description = description;
        if (publishedAt !== undefined) reel.publishedAt = publishedAt ? new Date(publishedAt) : null;
        if (isDraft !== undefined) {
            reel.isDraft = !!isDraft;
            if (!reel.isDraft && !reel.publishedAt) reel.publishedAt = new Date();
        }
        await reel.save();
        res.json(await hydrate(reel));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminRemove = async (req, res) => {
    const reel = await Reel.findByPk(req.params.id);
    if (!reel) return res.status(404).json({ message: 'Reel не найден' });
    await reel.destroy();
    res.json({ ok: true });
};

exports.publicList = async (req, res) => {
    try {
        const limit = parseLimit(req.query.limit, 10, 30);
        const before = parseCursor(req.query.before);
        const where = { isDraft: false, publishedAt: { [Op.not]: null } };
        if (before) where.id = { [Op.lt]: before };
        const items = await Reel.findAll({ where, order: [['publishedAt', 'DESC'], ['id', 'DESC']], limit });
        const out = await Promise.all(items.map(hydrate));
        const userId = req.user?.userId || null;
        const eng = await hydrateEngagement(out.map((r) => ({ kind: 'reel', entityId: r.id })), userId);
        for (const r of out) {
            const e = eng.get(`reel:${r.id}`) || { likes: 0, comments: 0, bookmarks: 0, reposts: 0, liked: false, bookmarked: false, reposted: false };
            r.engagement = { likes: e.likes, comments: e.comments, bookmarks: e.bookmarks, reposts: e.reposts, views: r.viewCount ?? 0 };
            r.me = { liked: e.liked, bookmarked: e.bookmarked, reposted: e.reposted };
        }
        res.json(out);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.publicGet = async (req, res) => {
    const reel = await Reel.findByPk(req.params.id);
    if (!reel || reel.isDraft || !reel.publishedAt) return res.status(404).json({ message: 'Reel не найден' });
    const obj = await hydrate(reel);
    await attachEngagement(obj, 'reel', req.user?.userId || null);
    res.json(obj);
};

exports.view = async (req, res) => {
    try {
        const reel = await Reel.findByPk(req.params.id);
        if (!reel) return res.status(404).json({ message: 'Reel не найден' });
        const userId = req.user?.userId || null;
        const already = userId ? await ReelView.findOne({ where: { reelId: reel.id, userId } }) : null;
        if (!already) {
            await ReelView.create({ reelId: reel.id, userId });
            reel.viewCount = (reel.viewCount || 0) + 1;
            await reel.save();
        }
        res.json({ ok: true, viewCount: reel.viewCount });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
