const { Op } = require('sequelize');
const { Banner, Media } = require('../../models/social');

const TYPES = new Set(['text', 'image', 'image_link']);

function normalizeType(input) {
    return TYPES.has(input) ? input : 'text';
}

function normalizeString(value, fallback = null) {
    if (value === undefined) return undefined;
    const s = String(value ?? '').trim();
    return s || fallback;
}

async function hydrate(banner) {
    const obj = banner.toJSON();
    if (obj.mediaId) obj.media = (await Media.findByPk(obj.mediaId))?.toJSON() || null;
    return obj;
}

function payload(req) {
    const body = req.body || {};
    const type = normalizeType(body.type);
    const out = {
        type,
        title: normalizeString(body.title),
        text: normalizeString(body.text),
        buttonText: normalizeString(body.buttonText),
        buttonUrl: normalizeString(body.buttonUrl),
        linkUrl: normalizeString(body.linkUrl),
        backgroundColor: normalizeString(body.backgroundColor, '#05210f'),
        textColor: normalizeString(body.textColor, '#ffffff'),
        mediaId: body.mediaId ? Number(body.mediaId) : null,
        order: Number(body.order) || 0,
        isDraft: !!body.isDraft
    };

    if (body.publishedAt !== undefined) {
        out.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    } else if (!out.isDraft) {
        out.publishedAt = new Date();
    }

    if ((type === 'image' || type === 'image_link') && !out.mediaId) {
        const err = new Error('Для баннера с изображением нужно выбрать медиа');
        err.status = 400;
        throw err;
    }

    if (type === 'image_link' && !out.linkUrl) {
        const err = new Error('Для баннера-ссылки нужна ссылка');
        err.status = 400;
        throw err;
    }

    return out;
}

exports.adminList = async (_req, res) => {
    try {
        const items = await Banner.findAll({ order: [['order', 'ASC'], ['id', 'DESC']] });
        res.json(await Promise.all(items.map(hydrate)));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminCreate = async (req, res) => {
    try {
        const adminUserId = req.admin?.adminUserId || req.admin?.id || 0;
        const banner = await Banner.create({ adminUserId, ...payload(req) });
        res.status(201).json(await hydrate(banner));
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
};

exports.adminUpdate = async (req, res) => {
    try {
        const banner = await Banner.findByPk(req.params.id);
        if (!banner) return res.status(404).json({ message: 'Баннер не найден' });
        await banner.update(payload(req));
        res.json(await hydrate(banner));
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
};

exports.adminRemove = async (req, res) => {
    try {
        const banner = await Banner.findByPk(req.params.id);
        if (!banner) return res.status(404).json({ message: 'Баннер не найден' });
        await banner.destroy();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.publicList = async (_req, res) => {
    try {
        const now = new Date();
        const items = await Banner.findAll({
            where: {
                isDraft: false,
                [Op.or]: [{ publishedAt: null }, { publishedAt: { [Op.lte]: now } }]
            },
            order: [['order', 'ASC'], ['id', 'DESC']],
            limit: 20
        });
        res.json(await Promise.all(items.map(hydrate)));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
