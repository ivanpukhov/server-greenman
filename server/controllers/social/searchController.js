const { Op } = require('sequelize');
const { Article, Post, Webinar, Reel, Course, Media } = require('../../models/social');
const { attachMap } = require('../../services/social/attachments');
const { hydrateEngagement } = require('../../services/social/engagement');

const ALLOWED_KINDS = ['post', 'article', 'reel', 'webinar', 'course'];

function ensurePublic() {
    return { isDraft: false, publishedAt: { [Op.not]: null } };
}

async function searchArticles(q, limit) {
    const where = {
        ...ensurePublic(),
        [Op.or]: [
            { title: { [Op.like]: `%${q}%` } },
            { excerpt: { [Op.like]: `%${q}%` } },
        ],
    };
    const items = await Article.findAll({
        where,
        order: [['publishedAt', 'DESC']],
        limit,
        attributes: { exclude: ['blocks'] },
    });
    return Promise.all(items.map(async (a) => ({
        id: `article-${a.id}`,
        kind: 'article',
        entityId: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        publishedAt: a.publishedAt,
        cover: a.coverMediaId ? (await Media.findByPk(a.coverMediaId))?.toJSON() : null,
    })));
}

async function searchPosts(q, limit) {
    const where = { ...ensurePublic(), text: { [Op.like]: `%${q}%` } };
    const items = await Post.findAll({
        where,
        order: [['publishedAt', 'DESC']],
        limit,
    });
    const media = await attachMap('post', items.map((p) => p.id));
    return items.map((p) => {
        const firstMedia = (media.get(p.id) || [])[0] || null;
        return {
            id: `post-${p.id}`,
            kind: 'post',
            entityId: p.id,
            text: p.text,
            publishedAt: p.publishedAt,
            cover: firstMedia,
        };
    });
}

async function searchWebinars(q, limit) {
    const where = { ...ensurePublic(), title: { [Op.like]: `%${q}%` } };
    const items = await Webinar.findAll({
        where,
        order: [['publishedAt', 'DESC']],
        limit,
    });
    return Promise.all(items.map(async (w) => ({
        id: `webinar-${w.id}`,
        kind: 'webinar',
        entityId: w.id,
        title: w.title,
        slug: w.slug,
        publishedAt: w.publishedAt,
        cover: w.coverMediaId ? (await Media.findByPk(w.coverMediaId))?.toJSON() : null,
    })));
}

async function searchReels(q, limit) {
    const where = { ...ensurePublic(), description: { [Op.like]: `%${q}%` } };
    const items = await Reel.findAll({
        where,
        order: [['publishedAt', 'DESC']],
        limit,
    });
    return Promise.all(items.map(async (r) => ({
        id: `reel-${r.id}`,
        kind: 'reel',
        entityId: r.id,
        description: r.description,
        publishedAt: r.publishedAt,
        cover: r.thumbnailMediaId ? (await Media.findByPk(r.thumbnailMediaId))?.toJSON() : null,
    })));
}

async function searchCourses(q, limit) {
    const where = {
        ...ensurePublic(),
        [Op.or]: [
            { title: { [Op.like]: `%${q}%` } },
            { description: { [Op.like]: `%${q}%` } },
        ],
    };
    const items = await Course.findAll({
        where,
        order: [['publishedAt', 'DESC']],
        limit,
    });
    return Promise.all(items.map(async (c) => ({
        id: `course-${c.id}`,
        kind: 'course',
        entityId: c.id,
        title: c.title,
        slug: c.slug,
        excerpt: c.description,
        publishedAt: c.publishedAt,
        cover: c.coverMediaId ? (await Media.findByPk(c.coverMediaId))?.toJSON() : null,
    })));
}

exports.search = async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (!q) return res.json({ items: [], total: 0 });
        const limitPerKind = Math.min(20, Math.max(3, Number(req.query.limit) || 10));
        const kindFilter = req.query.kind ? String(req.query.kind) : null;
        const kinds = kindFilter && ALLOWED_KINDS.includes(kindFilter) ? [kindFilter] : ALLOWED_KINDS;

        const runners = {
            article: () => searchArticles(q, limitPerKind),
            post: () => searchPosts(q, limitPerKind),
            webinar: () => searchWebinars(q, limitPerKind),
            reel: () => searchReels(q, limitPerKind),
            course: () => searchCourses(q, limitPerKind),
        };
        const results = await Promise.all(kinds.map((k) => runners[k]()));
        const flat = results.flat();

        const eng = await hydrateEngagement(
            flat.map((it) => ({ kind: it.kind, entityId: it.entityId })),
            req.user?.userId || null
        );
        for (const it of flat) {
            const e = eng.get(`${it.kind}:${it.entityId}`);
            if (e) {
                it.engagement = { likes: e.likes, comments: e.comments, bookmarks: e.bookmarks };
                it.me = { liked: e.liked, bookmarked: e.bookmarked };
            }
        }

        flat.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        res.json({ items: flat, total: flat.length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
