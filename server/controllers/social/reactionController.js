const { Reaction } = require('../../models/social');

const ALLOWED = new Set(['post', 'reel', 'webinar', 'article', 'course_day', 'comment']);

exports.toggle = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Нужна авторизация' });
        const { type, id, reaction } = req.body || {};
        const kind = reaction || 'like';
        if (!ALLOWED.has(type) || !id) return res.status(400).json({ message: 'type и id обязательны' });
        const existing = await Reaction.findOne({
            where: { reactableType: type, reactableId: Number(id), userId, type: kind }
        });
        if (existing) {
            await existing.destroy();
            const count = await Reaction.count({ where: { reactableType: type, reactableId: Number(id), type: kind } });
            return res.json({ reacted: false, count });
        }
        await Reaction.create({ reactableType: type, reactableId: Number(id), userId, type: kind });
        const count = await Reaction.count({ where: { reactableType: type, reactableId: Number(id), type: kind } });
        res.json({ reacted: true, count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.counts = async (req, res) => {
    try {
        const { type, id } = req.query;
        if (!ALLOWED.has(type) || !id) return res.status(400).json({ message: 'type и id обязательны' });
        const userId = req.user?.userId || null;
        const all = await Reaction.findAll({ where: { reactableType: type, reactableId: Number(id) } });
        const counts = {};
        let mine = null;
        for (const r of all) {
            counts[r.type] = (counts[r.type] || 0) + 1;
            if (userId && r.userId === userId) mine = r.type;
        }
        res.json({ counts, mine });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
