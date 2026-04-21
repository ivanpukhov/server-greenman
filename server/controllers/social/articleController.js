const { Op } = require('sequelize');
const { Article, Media } = require('../../models/social');
const { uniqueSlug } = require('../../services/social/slugs');
const { parseLimit, parseCursor } = require('../../services/social/paginate');

async function hydrate(article) {
    const obj = article.toJSON();
    if (article.coverMediaId) obj.cover = (await Media.findByPk(article.coverMediaId))?.toJSON() || null;
    if (obj.blocks) {
        try { obj.blocks = JSON.parse(obj.blocks); } catch (_e) { /* leave string */ }
    }
    return obj;
}

exports.adminList = async (_req, res) => {
    const items = await Article.findAll({ order: [['id', 'DESC']] });
    res.json(await Promise.all(items.map(hydrate)));
};

exports.adminGet = async (req, res) => {
    const a = await Article.findByPk(req.params.id);
    if (!a) return res.status(404).json({ message: 'Статья не найдена' });
    res.json(await hydrate(a));
};

exports.adminCreate = async (req, res) => {
    try {
        const adminUserId = req.admin?.adminUserId || req.admin?.id || 0;
        const { title, excerpt, coverMediaId, blocks, publishedAt, isDraft, slug } = req.body || {};
        if (!title) return res.status(400).json({ message: 'title обязателен' });
        const finalSlug = await uniqueSlug(Article, slug || title, title);
        const article = await Article.create({
            adminUserId,
            title,
            slug: finalSlug,
            excerpt: excerpt || null,
            coverMediaId: coverMediaId || null,
            blocks: blocks ? JSON.stringify(blocks) : null,
            publishedAt: publishedAt ? new Date(publishedAt) : (isDraft === false ? new Date() : null),
            isDraft: isDraft !== false
        });
        res.status(201).json(await hydrate(article));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminUpdate = async (req, res) => {
    try {
        const a = await Article.findByPk(req.params.id);
        if (!a) return res.status(404).json({ message: 'Статья не найдена' });
        const { title, excerpt, coverMediaId, blocks, publishedAt, isDraft, slug } = req.body || {};
        if (title !== undefined) a.title = title;
        if (excerpt !== undefined) a.excerpt = excerpt;
        if (coverMediaId !== undefined) a.coverMediaId = coverMediaId || null;
        if (blocks !== undefined) a.blocks = blocks ? JSON.stringify(blocks) : null;
        if (publishedAt !== undefined) a.publishedAt = publishedAt ? new Date(publishedAt) : null;
        if (isDraft !== undefined) {
            a.isDraft = !!isDraft;
            if (!a.isDraft && !a.publishedAt) a.publishedAt = new Date();
        }
        if (slug !== undefined && slug !== a.slug) {
            a.slug = await uniqueSlug(Article, slug, a.title);
        }
        await a.save();
        res.json(await hydrate(a));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminRemove = async (req, res) => {
    const a = await Article.findByPk(req.params.id);
    if (!a) return res.status(404).json({ message: 'Статья не найдена' });
    await a.destroy();
    res.json({ ok: true });
};

exports.publicList = async (req, res) => {
    try {
        const limit = parseLimit(req.query.limit, 20, 50);
        const before = parseCursor(req.query.before);
        const where = { isDraft: false, publishedAt: { [Op.not]: null } };
        if (before) where.id = { [Op.lt]: before };
        const items = await Article.findAll({
            where,
            order: [['publishedAt', 'DESC'], ['id', 'DESC']],
            limit,
            attributes: { exclude: ['blocks'] }
        });
        res.json(await Promise.all(items.map(hydrate)));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.publicGetBySlug = async (req, res) => {
    const a = await Article.findOne({ where: { slug: req.params.slug, isDraft: false, publishedAt: { [Op.not]: null } } });
    if (!a) return res.status(404).json({ message: 'Статья не найдена' });
    res.json(await hydrate(a));
};
