const { Op } = require('sequelize');
const { Webinar, Media, Poll, PollOption, PollVote } = require('../../models/social');
const { setAttachments, attachMap } = require('../../services/social/attachments');
const { uniqueSlug } = require('../../services/social/slugs');

const ATTACH_TYPE = 'webinar';
const POLLABLE_TYPE = 'webinar';

async function hydrate(w, { withPolls = true } = {}) {
    const obj = w.toJSON();
    if (w.videoMediaId) obj.video = (await Media.findByPk(w.videoMediaId))?.toJSON() || null;
    if (w.coverMediaId) obj.cover = (await Media.findByPk(w.coverMediaId))?.toJSON() || null;
    if (obj.descriptionBlocks) {
        try { obj.descriptionBlocks = JSON.parse(obj.descriptionBlocks); } catch (_e) { /* keep */ }
    }
    const files = await attachMap(ATTACH_TYPE, [w.id]);
    obj.files = files.get(w.id) || [];
    if (withPolls) {
        const polls = await Poll.findAll({
            where: { pollableType: POLLABLE_TYPE, pollableId: w.id },
            include: [{ model: PollOption, as: 'options' }]
        });
        obj.polls = await Promise.all(polls.map(async (p) => {
            const votes = await PollVote.findAll({ where: { pollId: p.id } });
            const counts = {};
            for (const v of votes) counts[v.pollOptionId] = (counts[v.pollOptionId] || 0) + 1;
            return { ...p.toJSON(), voteCounts: counts, totalVotes: votes.length };
        }));
    }
    return obj;
}

exports.adminList = async (_req, res) => {
    const items = await Webinar.findAll({ order: [['id', 'DESC']] });
    res.json(await Promise.all(items.map((w) => hydrate(w, { withPolls: false }))));
};

exports.adminGet = async (req, res) => {
    const w = await Webinar.findByPk(req.params.id);
    if (!w) return res.status(404).json({ message: 'Вебинар не найден' });
    res.json(await hydrate(w));
};

exports.adminCreate = async (req, res) => {
    try {
        const adminUserId = req.admin?.adminUserId || req.admin?.id || 0;
        const { title, slug, descriptionBlocks, videoMediaId, coverMediaId, publishedAt, isDraft, fileMediaIds } = req.body || {};
        if (!title) return res.status(400).json({ message: 'title обязателен' });
        const finalSlug = await uniqueSlug(Webinar, slug || title, title);
        const w = await Webinar.create({
            adminUserId,
            title,
            slug: finalSlug,
            descriptionBlocks: descriptionBlocks ? JSON.stringify(descriptionBlocks) : null,
            videoMediaId: videoMediaId || null,
            coverMediaId: coverMediaId || null,
            publishedAt: publishedAt ? new Date(publishedAt) : (isDraft === false ? new Date() : null),
            isDraft: isDraft !== false
        });
        await setAttachments(ATTACH_TYPE, w.id, fileMediaIds || []);
        res.status(201).json(await hydrate(w));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminUpdate = async (req, res) => {
    try {
        const w = await Webinar.findByPk(req.params.id);
        if (!w) return res.status(404).json({ message: 'Вебинар не найден' });
        const { title, slug, descriptionBlocks, videoMediaId, coverMediaId, publishedAt, isDraft, fileMediaIds } = req.body || {};
        if (title !== undefined) w.title = title;
        if (slug !== undefined && slug !== w.slug) w.slug = await uniqueSlug(Webinar, slug, w.title);
        if (descriptionBlocks !== undefined) w.descriptionBlocks = descriptionBlocks ? JSON.stringify(descriptionBlocks) : null;
        if (videoMediaId !== undefined) w.videoMediaId = videoMediaId || null;
        if (coverMediaId !== undefined) w.coverMediaId = coverMediaId || null;
        if (publishedAt !== undefined) w.publishedAt = publishedAt ? new Date(publishedAt) : null;
        if (isDraft !== undefined) {
            w.isDraft = !!isDraft;
            if (!w.isDraft && !w.publishedAt) w.publishedAt = new Date();
        }
        await w.save();
        if (Array.isArray(fileMediaIds)) await setAttachments(ATTACH_TYPE, w.id, fileMediaIds);
        res.json(await hydrate(w));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminRemove = async (req, res) => {
    const w = await Webinar.findByPk(req.params.id);
    if (!w) return res.status(404).json({ message: 'Вебинар не найден' });
    await w.destroy();
    res.json({ ok: true });
};

exports.publicList = async (_req, res) => {
    const items = await Webinar.findAll({
        where: { isDraft: false, publishedAt: { [Op.not]: null } },
        order: [['publishedAt', 'DESC']]
    });
    res.json(await Promise.all(items.map((w) => hydrate(w, { withPolls: false }))));
};

exports.publicGetBySlug = async (req, res) => {
    const w = await Webinar.findOne({ where: { slug: req.params.slug, isDraft: false, publishedAt: { [Op.not]: null } } });
    if (!w) return res.status(404).json({ message: 'Вебинар не найден' });
    res.json(await hydrate(w));
};
