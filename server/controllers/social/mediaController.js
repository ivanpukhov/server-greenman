const { Media } = require('../../models/social');
const mediaStorage = require('../../utilities/mediaStorage');
const { mediaTypeOf } = require('../../middleware/mediaUpload');

exports.upload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Файл не передан' });
        }
        const type = mediaTypeOf(req.file.mimetype);
        if (!type) {
            return res.status(400).json({ message: 'Неподдерживаемый тип файла' });
        }
        const adminUserId = req.admin?.adminUserId || req.admin?.userId || req.admin?.id || 0;
        const stored = await mediaStorage.put(req.file.buffer, {
            mimeType: req.file.mimetype,
            originalName: req.file.originalname
        });
        const media = await Media.create({
            adminUserId,
            type,
            storageKey: stored.key,
            url: stored.url,
            mimeType: req.file.mimetype,
            originalName: req.file.originalname,
            sizeBytes: stored.sizeBytes
        });
        return res.status(201).json(media);
    } catch (err) {
        console.error('media.upload error:', err);
        return res.status(500).json({ message: 'Ошибка загрузки файла', error: err.message });
    }
};

exports.list = async (req, res) => {
    try {
        const limit = Math.min(100, Number(req.query.limit) || 50);
        const type = req.query.type;
        const where = {};
        if (type) where.type = type;
        const items = await Media.findAll({ where, order: [['id', 'DESC']], limit });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const media = await Media.findByPk(req.params.id);
        if (!media) return res.status(404).json({ message: 'Медиа не найдено' });
        await mediaStorage.delete(media.storageKey);
        await media.destroy();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
