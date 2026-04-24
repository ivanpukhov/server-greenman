const { Reaction, Comment, Bookmark } = require('../../models/social');

function makeKey(kind, id) {
    return `${kind}:${id}`;
}

/**
 * Для списка айтемов { kind, entityId } возвращает Map key→{ likes, comments, bookmarks, liked, bookmarked }.
 * userId — опциональный, если есть, заполняет liked/bookmarked.
 */
async function hydrateEngagement(items, userId = null) {
    const result = new Map();
    if (!items || items.length === 0) return result;

    const byKind = new Map();
    for (const it of items) {
        const arr = byKind.get(it.kind) || [];
        arr.push(it.entityId);
        byKind.set(it.kind, arr);
    }

    for (const [kind, ids] of byKind) {
        for (const id of ids) {
            result.set(makeKey(kind, id), {
                likes: 0,
                comments: 0,
                bookmarks: 0,
                liked: false,
                bookmarked: false
            });
        }
    }

    await Promise.all([...byKind.entries()].map(async ([kind, ids]) => {
        const uniq = [...new Set(ids)];
        if (uniq.length === 0) return;

        const [likes, comments, bookmarks, myLikes, myBookmarks] = await Promise.all([
            Reaction.findAll({
                where: { reactableType: kind, reactableId: uniq, type: 'like' },
                attributes: ['reactableId']
            }),
            Comment.findAll({
                where: { commentableType: kind, commentableId: uniq, isDeleted: false },
                attributes: ['commentableId']
            }),
            Bookmark.findAll({
                where: { bookmarkableType: kind, bookmarkableId: uniq },
                attributes: ['bookmarkableId']
            }),
            userId ? Reaction.findAll({
                where: { reactableType: kind, reactableId: uniq, type: 'like', userId },
                attributes: ['reactableId']
            }) : Promise.resolve([]),
            userId ? Bookmark.findAll({
                where: { bookmarkableType: kind, bookmarkableId: uniq, userId },
                attributes: ['bookmarkableId']
            }) : Promise.resolve([])
        ]);

        for (const r of likes) {
            const k = makeKey(kind, r.reactableId);
            const cur = result.get(k);
            if (cur) cur.likes += 1;
        }
        for (const c of comments) {
            const k = makeKey(kind, c.commentableId);
            const cur = result.get(k);
            if (cur) cur.comments += 1;
        }
        for (const b of bookmarks) {
            const k = makeKey(kind, b.bookmarkableId);
            const cur = result.get(k);
            if (cur) cur.bookmarks += 1;
        }
        for (const r of myLikes) {
            const cur = result.get(makeKey(kind, r.reactableId));
            if (cur) cur.liked = true;
        }
        for (const b of myBookmarks) {
            const cur = result.get(makeKey(kind, b.bookmarkableId));
            if (cur) cur.bookmarked = true;
        }
    }));

    return result;
}

/**
 * Добавляет engagement+me к одному объекту (мутирует и возвращает). Для detail-экранов.
 */
async function attachEngagement(item, kind, userId = null) {
    if (!item) return item;
    const id = item.id;
    const map = await hydrateEngagement([{ kind, entityId: id }], userId);
    const e = map.get(makeKey(kind, id)) || { likes: 0, comments: 0, bookmarks: 0, liked: false, bookmarked: false };
    item.engagement = { likes: e.likes, comments: e.comments, bookmarks: e.bookmarks };
    item.me = { liked: e.liked, bookmarked: e.bookmarked };
    return item;
}

module.exports = { hydrateEngagement, attachEngagement, makeKey };
