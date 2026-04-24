const { Op } = require('sequelize');
const {
    Bookmark,
    Post,
    Article,
    Reel,
    Webinar,
    Course,
    Media
} = require('../../models/social');
const { attachMap } = require('../../services/social/attachments');
const { parseLimit } = require('../../services/social/paginate');

const ALLOWED = new Set(['post', 'article', 'reel', 'webinar', 'course']);

exports.toggle = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Нужна авторизация' });
        const { type, id } = req.body || {};
        if (!ALLOWED.has(type) || !id) {
            return res.status(400).json({ message: 'type и id обязательны' });
        }
        const existing = await Bookmark.findOne({
            where: { userId, bookmarkableType: type, bookmarkableId: Number(id) }
        });
        if (existing) {
            await existing.destroy();
            const count = await Bookmark.count({
                where: { bookmarkableType: type, bookmarkableId: Number(id) }
            });
            return res.json({ bookmarked: false, count });
        }
        await Bookmark.create({ userId, bookmarkableType: type, bookmarkableId: Number(id) });
        const count = await Bookmark.count({
            where: { bookmarkableType: type, bookmarkableId: Number(id) }
        });
        res.json({ bookmarked: true, count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.list = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Нужна авторизация' });
        const kind = req.query.kind;
        const limit = parseLimit(req.query.limit, 20, 50);
        const before = req.query.before ? new Date(req.query.before) : null;

        const where = { userId };
        if (kind && ALLOWED.has(kind)) where.bookmarkableType = kind;
        if (before && !Number.isNaN(before.getTime())) {
            where.createdAt = { [Op.lt]: before };
        }

        const rows = await Bookmark.findAll({
            where,
            order: [['createdAt', 'DESC'], ['id', 'DESC']],
            limit
        });

        const byType = new Map();
        for (const r of rows) {
            const arr = byType.get(r.bookmarkableType) || [];
            arr.push(r.bookmarkableId);
            byType.set(r.bookmarkableType, arr);
        }

        const modelMap = {
            post: Post,
            article: Article,
            reel: Reel,
            webinar: Webinar,
            course: Course
        };

        const fetched = new Map();
        await Promise.all(
            [...byType.entries()].map(async ([type, ids]) => {
                const Model = modelMap[type];
                if (!Model) return;
                const attrs = type === 'article' || type === 'course' || type === 'webinar'
                    ? { exclude: ['blocks', 'descriptionBlocks', 'contentBlocks'] }
                    : undefined;
                const items = await Model.findAll({ where: { id: ids }, attributes: attrs });
                fetched.set(type, new Map(items.map((it) => [it.id, it.toJSON()])));
            })
        );

        const postIds = byType.get('post') || [];
        const postMedia = postIds.length ? await attachMap('post', postIds) : new Map();

        const mediaIds = [];
        const reelRows = fetched.get('reel');
        const articleRows = fetched.get('article');
        const webinarRows = fetched.get('webinar');
        const courseRows = fetched.get('course');
        if (reelRows) {
            for (const r of reelRows.values()) {
                if (r.videoMediaId) mediaIds.push(r.videoMediaId);
                if (r.thumbnailMediaId) mediaIds.push(r.thumbnailMediaId);
            }
        }
        if (articleRows) for (const a of articleRows.values()) if (a.coverMediaId) mediaIds.push(a.coverMediaId);
        if (webinarRows) {
            for (const w of webinarRows.values()) {
                if (w.coverMediaId) mediaIds.push(w.coverMediaId);
                if (w.videoMediaId) mediaIds.push(w.videoMediaId);
            }
        }
        if (courseRows) {
            for (const c of courseRows.values()) {
                if (c.coverMediaId) mediaIds.push(c.coverMediaId);
                if (c.trailerMediaId) mediaIds.push(c.trailerMediaId);
            }
        }
        const mediaRows = mediaIds.length
            ? await Media.findAll({ where: { id: [...new Set(mediaIds)] } })
            : [];
        const mediaById = new Map(mediaRows.map((m) => [m.id, m.toJSON()]));

        const items = rows.map((b) => {
            const base = fetched.get(b.bookmarkableType)?.get(b.bookmarkableId);
            if (!base) return null;
            let hydrated = { ...base };
            if (b.bookmarkableType === 'post') {
                hydrated.media = postMedia.get(b.bookmarkableId) || [];
            } else if (b.bookmarkableType === 'reel') {
                hydrated.video = mediaById.get(base.videoMediaId) || null;
                hydrated.thumbnail = mediaById.get(base.thumbnailMediaId) || null;
            } else if (b.bookmarkableType === 'article') {
                hydrated.cover = mediaById.get(base.coverMediaId) || null;
            } else if (b.bookmarkableType === 'webinar') {
                hydrated.cover = mediaById.get(base.coverMediaId) || null;
                hydrated.video = mediaById.get(base.videoMediaId) || null;
            } else if (b.bookmarkableType === 'course') {
                hydrated.cover = mediaById.get(base.coverMediaId) || null;
                hydrated.trailer = mediaById.get(base.trailerMediaId) || null;
            }
            return {
                kind: b.bookmarkableType,
                bookmarkedAt: b.createdAt,
                data: hydrated
            };
        }).filter(Boolean);

        res.json({
            items,
            nextCursor: rows.length === limit ? rows[rows.length - 1].createdAt : null
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
