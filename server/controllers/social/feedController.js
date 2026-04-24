const { Op } = require('sequelize');
const { Post, Reel, Article, Webinar, Media } = require('../../models/social');
const { attachMap } = require('../../services/social/attachments');
const { parseLimit } = require('../../services/social/paginate');
const { hydrateEngagement, makeKey } = require('../../services/social/engagement');

function parseCursor(value) {
    if (!value) return null;
    // Формат: "ISO|id" — дата публикации + id для стабильного tie-break.
    const [iso, idStr] = String(value).split('|');
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    const id = Number(idStr);
    return { date, id: Number.isFinite(id) ? id : 0 };
}

function buildCursor(item) {
    const iso = new Date(item.publishedAt).toISOString();
    return `${iso}|${item.entityId}`;
}

function makeWhere(cursor) {
    const base = { isDraft: false, publishedAt: { [Op.not]: null } };
    if (!cursor) return base;
    // "меньше по (publishedAt, id)" — (publishedAt < cur.date) OR (publishedAt = cur.date AND id < cur.id)
    return {
        ...base,
        [Op.and]: [
            {
                [Op.or]: [
                    { publishedAt: { [Op.lt]: cursor.date } },
                    { publishedAt: cursor.date, id: { [Op.lt]: cursor.id } }
                ]
            }
        ]
    };
}

function compareItems(a, b) {
    const ta = new Date(a.publishedAt).getTime();
    const tb = new Date(b.publishedAt).getTime();
    if (tb !== ta) return tb - ta;
    return b.entityId - a.entityId;
}

/**
 * Унифицированный feed:
 *   GET /api/social/feed?cursor=<iso|id>&limit=20&ranking=latest
 * Возвращает { items: FeedItem[], nextCursor: string|null }.
 */
exports.unifiedFeed = async (req, res) => {
    try {
        const userId = req.user?.userId || null;
        const limit = parseLimit(req.query.limit, 20, 50);
        const cursor = parseCursor(req.query.cursor || req.query.before);

        const where = makeWhere(cursor);

        const [posts, reels, articles, webinars] = await Promise.all([
            Post.findAll({ where, order: [['publishedAt', 'DESC'], ['id', 'DESC']], limit }),
            Reel.findAll({ where, order: [['publishedAt', 'DESC'], ['id', 'DESC']], limit }),
            Article.findAll({
                where,
                order: [['publishedAt', 'DESC'], ['id', 'DESC']],
                limit,
                attributes: { exclude: ['blocks'] }
            }),
            Webinar.findAll({
                where,
                order: [['publishedAt', 'DESC'], ['id', 'DESC']],
                limit,
                attributes: { exclude: ['descriptionBlocks'] }
            })
        ]);

        const postMedia = await attachMap('post', posts.map((p) => p.id));

        const mediaIds = [
            ...reels.map((r) => r.videoMediaId),
            ...reels.map((r) => r.thumbnailMediaId),
            ...articles.map((a) => a.coverMediaId),
            ...webinars.map((w) => w.coverMediaId),
            ...webinars.map((w) => w.videoMediaId)
        ].filter(Boolean);
        const mediaRows = mediaIds.length
            ? await Media.findAll({ where: { id: [...new Set(mediaIds)] } })
            : [];
        const mediaById = new Map(mediaRows.map((m) => [m.id, m.toJSON()]));

        const toItem = (kind, row) => {
            const raw = row.toJSON();
            let cover = null;
            let video = null;
            let media = [];
            if (kind === 'post') {
                media = postMedia.get(row.id) || [];
                cover = media[0] || null;
            } else if (kind === 'reel') {
                video = mediaById.get(raw.videoMediaId) || null;
                cover = mediaById.get(raw.thumbnailMediaId) || null;
            } else if (kind === 'article') {
                cover = mediaById.get(raw.coverMediaId) || null;
            } else if (kind === 'webinar') {
                cover = mediaById.get(raw.coverMediaId) || null;
                video = mediaById.get(raw.videoMediaId) || null;
            }
            return {
                id: `${kind}-${row.id}`,
                kind,
                entityId: row.id,
                publishedAt: raw.publishedAt,
                adminUserId: raw.adminUserId,
                title: raw.title || null,
                slug: raw.slug || null,
                excerpt: raw.excerpt || null,
                text: raw.text || null,
                description: raw.description || null,
                cover,
                video,
                media,
                raw
            };
        };

        const merged = [
            ...posts.map((p) => toItem('post', p)),
            ...reels.map((r) => toItem('reel', r)),
            ...articles.map((a) => toItem('article', a)),
            ...webinars.map((w) => toItem('webinar', w))
        ];
        merged.sort(compareItems);
        const sliced = merged.slice(0, limit);

        // Hydrate engagement + me
        const engagement = await hydrateEngagement(
            sliced.map((it) => ({ kind: it.kind, entityId: it.entityId })),
            userId
        );

        const items = sliced.map((it) => {
            const eng = engagement.get(makeKey(it.kind, it.entityId)) || {
                likes: 0,
                comments: 0,
                bookmarks: 0,
                liked: false,
                bookmarked: false
            };
            return {
                ...it,
                engagement: {
                    likes: eng.likes,
                    comments: eng.comments,
                    bookmarks: eng.bookmarks,
                    views: it.kind === 'reel' ? it.raw.viewCount || 0 : undefined
                },
                me: userId
                    ? { liked: eng.liked, bookmarked: eng.bookmarked }
                    : { liked: false, bookmarked: false }
            };
        });

        const nextCursor = items.length === limit ? buildCursor(items[items.length - 1]) : null;

        res.json({ items, nextCursor });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
