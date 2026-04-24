const { Op } = require('sequelize');
const {
    Reaction,
    Post,
    Article,
    Reel,
    Webinar,
    Media,
    CourseDayReport,
    CourseDay,
    CourseEnrollment,
    Course
} = require('../../models/social');
const { attachMap } = require('../../services/social/attachments');
const { parseLimit } = require('../../services/social/paginate');

const ACTIVITY_TYPES = new Set(['post', 'article', 'reel', 'webinar']);

exports.activity = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Нужна авторизация' });
        const limit = parseLimit(req.query.limit, 30, 100);

        const reactions = await Reaction.findAll({
            where: { userId, type: 'like' },
            order: [['createdAt', 'DESC']],
            limit
        });

        const byType = new Map();
        for (const r of reactions) {
            if (!ACTIVITY_TYPES.has(r.reactableType)) continue;
            const arr = byType.get(r.reactableType) || [];
            arr.push(r.reactableId);
            byType.set(r.reactableType, arr);
        }

        const modelMap = { post: Post, article: Article, reel: Reel, webinar: Webinar };
        const fetched = new Map();
        await Promise.all(
            [...byType.entries()].map(async ([type, ids]) => {
                const Model = modelMap[type];
                const attrs = type === 'article' || type === 'webinar'
                    ? { exclude: ['blocks', 'descriptionBlocks'] }
                    : undefined;
                const items = await Model.findAll({ where: { id: ids }, attributes: attrs });
                fetched.set(type, new Map(items.map((it) => [it.id, it.toJSON()])));
            })
        );

        const postIds = byType.get('post') || [];
        const postMedia = postIds.length ? await attachMap('post', postIds) : new Map();

        const mediaIds = [];
        const collect = (row, keys) => {
            for (const k of keys) if (row && row[k]) mediaIds.push(row[k]);
        };
        if (fetched.get('article')) for (const a of fetched.get('article').values()) collect(a, ['coverMediaId']);
        if (fetched.get('webinar')) for (const w of fetched.get('webinar').values()) collect(w, ['coverMediaId', 'videoMediaId']);
        if (fetched.get('reel')) for (const r of fetched.get('reel').values()) collect(r, ['thumbnailMediaId', 'videoMediaId']);
        const mediaRows = mediaIds.length
            ? await Media.findAll({ where: { id: [...new Set(mediaIds)] } })
            : [];
        const mediaById = new Map(mediaRows.map((m) => [m.id, m.toJSON()]));

        const items = reactions.map((r) => {
            const base = fetched.get(r.reactableType)?.get(r.reactableId);
            if (!base) return null;
            const hydrated = { ...base };
            if (r.reactableType === 'post') {
                hydrated.media = postMedia.get(r.reactableId) || [];
            } else if (r.reactableType === 'article') {
                hydrated.cover = mediaById.get(base.coverMediaId) || null;
            } else if (r.reactableType === 'webinar') {
                hydrated.cover = mediaById.get(base.coverMediaId) || null;
                hydrated.video = mediaById.get(base.videoMediaId) || null;
            } else if (r.reactableType === 'reel') {
                hydrated.video = mediaById.get(base.videoMediaId) || null;
                hydrated.thumbnail = mediaById.get(base.thumbnailMediaId) || null;
            }
            return {
                kind: r.reactableType,
                likedAt: r.createdAt,
                data: hydrated
            };
        }).filter(Boolean);

        res.json({ items });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.homework = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Нужна авторизация' });

        const enrollments = await CourseEnrollment.findAll({ where: { userId } });
        if (!enrollments.length) return res.json({ items: [] });

        const enrollmentIds = enrollments.map((e) => e.id);
        const reports = await CourseDayReport.findAll({
            where: { enrollmentId: enrollmentIds },
            order: [['id', 'DESC']]
        });

        const dayIds = [...new Set(reports.map((r) => r.courseDayId))];
        const days = dayIds.length
            ? await CourseDay.findAll({ where: { id: dayIds } })
            : [];
        const dayById = new Map(days.map((d) => [d.id, d.toJSON()]));

        const courseIds = [...new Set(days.map((d) => d.courseId))];
        const courses = courseIds.length
            ? await Course.findAll({ where: { id: courseIds } })
            : [];
        const courseById = new Map(courses.map((c) => [c.id, c.toJSON()]));
        const enrollmentById = new Map(enrollments.map((e) => [e.id, e.toJSON()]));

        const items = reports.map((r) => {
            const day = dayById.get(r.courseDayId);
            const course = day ? courseById.get(day.courseId) : null;
            const enrollment = enrollmentById.get(r.enrollmentId) || null;
            return {
                ...r.toJSON(),
                day: day ? { id: day.id, dayNumber: day.dayNumber, title: day.title } : null,
                course: course ? { id: course.id, slug: course.slug, title: course.title } : null,
                enrollment
            };
        });

        res.json({ items });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
