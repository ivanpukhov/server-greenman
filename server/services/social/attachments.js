const { Media, MediaAttachment } = require('../../models/social');

async function setAttachments(attachableType, attachableId, mediaIds) {
    const ids = Array.isArray(mediaIds) ? mediaIds.filter((x) => Number.isFinite(Number(x))).map(Number) : [];
    await MediaAttachment.destroy({ where: { attachableType, attachableId } });
    if (ids.length === 0) return [];
    const rows = ids.map((mediaId, idx) => ({
        attachableType,
        attachableId,
        mediaId,
        order: idx
    }));
    return MediaAttachment.bulkCreate(rows);
}

async function getAttachments(attachableType, attachableId) {
    const atts = await MediaAttachment.findAll({
        where: { attachableType, attachableId },
        order: [['order', 'ASC'], ['id', 'ASC']]
    });
    if (atts.length === 0) return [];
    const mediaIds = atts.map((a) => a.mediaId);
    const media = await Media.findAll({ where: { id: mediaIds } });
    const byId = new Map(media.map((m) => [m.id, m]));
    return atts.map((a) => ({ ...byId.get(a.mediaId)?.toJSON(), order: a.order })).filter((m) => m.id);
}

async function attachMap(attachableType, attachableIds) {
    if (!attachableIds || attachableIds.length === 0) return new Map();
    const atts = await MediaAttachment.findAll({
        where: { attachableType, attachableId: attachableIds },
        order: [['order', 'ASC'], ['id', 'ASC']]
    });
    if (atts.length === 0) return new Map();
    const mediaIds = [...new Set(atts.map((a) => a.mediaId))];
    const media = await Media.findAll({ where: { id: mediaIds } });
    const mediaById = new Map(media.map((m) => [m.id, m.toJSON()]));
    const result = new Map();
    for (const a of atts) {
        const bucket = result.get(a.attachableId) || [];
        const m = mediaById.get(a.mediaId);
        if (m) bucket.push({ ...m, order: a.order });
        result.set(a.attachableId, bucket);
    }
    return result;
}

module.exports = { setAttachments, getAttachments, attachMap };
