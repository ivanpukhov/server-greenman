const { Op } = require('sequelize');
const { Story, StoryView, Media } = require('../../models/social');

const DEFAULT_TTL_HOURS = 24;

async function hydrate(story) {
    const obj = story.toJSON();
    if (story.mediaId) obj.media = (await Media.findByPk(story.mediaId))?.toJSON() || null;
    return obj;
}

exports.adminList = async (_req, res) => {
    const items = await Story.findAll({ order: [['id', 'DESC']] });
    const out = await Promise.all(items.map(hydrate));
    res.json(out);
};

exports.adminCreate = async (req, res) => {
    try {
        const adminUserId = req.admin?.adminUserId || req.admin?.id || 0;
        const { mediaId, caption, durationSec, ttlHours, publishedAt, expiresAt, isDraft } = req.body || {};
        if (!mediaId) return res.status(400).json({ message: 'mediaId обязателен' });
        const pub = publishedAt ? new Date(publishedAt) : (isDraft ? null : new Date());
        const hours = Number.isFinite(Number(ttlHours)) ? Number(ttlHours) : DEFAULT_TTL_HOURS;
        const exp = expiresAt ? new Date(expiresAt) : (pub ? new Date(pub.getTime() + hours * 3600 * 1000) : null);
        const story = await Story.create({
            adminUserId,
            mediaId,
            caption: caption || null,
            durationSec: Number(durationSec) || 7,
            publishedAt: pub,
            expiresAt: exp,
            isDraft: !!isDraft
        });
        res.status(201).json(await hydrate(story));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminUpdate = async (req, res) => {
    try {
        const story = await Story.findByPk(req.params.id);
        if (!story) return res.status(404).json({ message: 'Сториз не найдена' });
        const { caption, durationSec, publishedAt, expiresAt, isDraft } = req.body || {};
        if (caption !== undefined) story.caption = caption;
        if (durationSec !== undefined) story.durationSec = Number(durationSec) || 7;
        if (publishedAt !== undefined) story.publishedAt = publishedAt ? new Date(publishedAt) : null;
        if (expiresAt !== undefined) story.expiresAt = expiresAt ? new Date(expiresAt) : null;
        if (isDraft !== undefined) story.isDraft = !!isDraft;
        await story.save();
        res.json(await hydrate(story));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminRemove = async (req, res) => {
    const story = await Story.findByPk(req.params.id);
    if (!story) return res.status(404).json({ message: 'Сториз не найдена' });
    await story.destroy();
    res.json({ ok: true });
};

exports.publicActive = async (_req, res) => {
    try {
        const now = new Date();
        const items = await Story.findAll({
            where: {
                isDraft: false,
                publishedAt: { [Op.not]: null, [Op.lte]: now },
                [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: now } }]
            },
            order: [['publishedAt', 'ASC']]
        });
        const out = await Promise.all(items.map(hydrate));
        const groups = new Map();
        for (const s of out) {
            const key = s.adminUserId;
            if (!groups.has(key)) groups.set(key, { adminUserId: key, stories: [] });
            groups.get(key).stories.push(s);
        }
        res.json([...groups.values()]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.view = async (req, res) => {
    try {
        const userId = req.user?.userId || null;
        if (!userId) return res.json({ ok: true });
        const story = await Story.findByPk(req.params.id);
        if (!story) return res.status(404).json({ message: 'Сториз не найдена' });
        const exists = await StoryView.findOne({ where: { storyId: story.id, userId } });
        if (!exists) await StoryView.create({ storyId: story.id, userId });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
