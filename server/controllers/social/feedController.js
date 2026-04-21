const { Op } = require('sequelize');
const { Post, Reel, Article, Webinar, Media } = require('../../models/social');
const { attachMap } = require('../../services/social/attachments');
const { parseLimit } = require('../../services/social/paginate');

exports.unifiedFeed = async (req, res) => {
    try {
        const limit = parseLimit(req.query.limit, 20, 50);
        const before = req.query.before ? new Date(req.query.before) : null;

        const baseWhere = { isDraft: false, publishedAt: { [Op.not]: null } };
        const wherePub = before ? { ...baseWhere, publishedAt: { ...baseWhere.publishedAt, [Op.lt]: before } } : baseWhere;

        const [posts, reels, articles, webinars] = await Promise.all([
            Post.findAll({ where: wherePub, order: [['publishedAt', 'DESC']], limit }),
            Reel.findAll({ where: wherePub, order: [['publishedAt', 'DESC']], limit }),
            Article.findAll({ where: wherePub, order: [['publishedAt', 'DESC']], limit, attributes: { exclude: ['blocks'] } }),
            Webinar.findAll({ where: wherePub, order: [['publishedAt', 'DESC']], limit })
        ]);

        const postMedia = await attachMap('post', posts.map((p) => p.id));

        const mediaIds = [
            ...reels.map((r) => r.videoMediaId),
            ...reels.map((r) => r.thumbnailMediaId),
            ...articles.map((a) => a.coverMediaId),
            ...webinars.map((w) => w.coverMediaId),
            ...webinars.map((w) => w.videoMediaId)
        ].filter(Boolean);
        const mediaRows = mediaIds.length ? await Media.findAll({ where: { id: [...new Set(mediaIds)] } }) : [];
        const mediaById = new Map(mediaRows.map((m) => [m.id, m.toJSON()]));

        const items = [
            ...posts.map((p) => ({ kind: 'post', publishedAt: p.publishedAt, data: { ...p.toJSON(), media: postMedia.get(p.id) || [] } })),
            ...reels.map((r) => ({ kind: 'reel', publishedAt: r.publishedAt, data: {
                ...r.toJSON(),
                video: mediaById.get(r.videoMediaId) || null,
                thumbnail: mediaById.get(r.thumbnailMediaId) || null
            } })),
            ...articles.map((a) => ({ kind: 'article', publishedAt: a.publishedAt, data: {
                ...a.toJSON(),
                cover: mediaById.get(a.coverMediaId) || null
            } })),
            ...webinars.map((w) => ({ kind: 'webinar', publishedAt: w.publishedAt, data: {
                ...w.toJSON(),
                cover: mediaById.get(w.coverMediaId) || null,
                video: mediaById.get(w.videoMediaId) || null
            } }))
        ];
        items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        const sliced = items.slice(0, limit);
        res.json({
            items: sliced,
            nextCursor: sliced.length ? sliced[sliced.length - 1].publishedAt : null
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
