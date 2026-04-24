const { Op } = require('sequelize');
const {
    Post,
    Article,
    Reel,
    Webinar,
    Course,
    Story,
    CourseEnrollment,
    Comment,
    Media,
} = require('../../models/social');

exports.stats = async (req, res) => {
    try {
        const [
            posts,
            postsDraft,
            articles,
            articlesDraft,
            reels,
            reelsDraft,
            webinars,
            webinarsDraft,
            courses,
            coursesDraft,
            stories,
            enrollments,
            enrollmentsActive,
            comments,
            media,
        ] = await Promise.all([
            Post.count(),
            Post.count({ where: { isDraft: true } }),
            Article.count(),
            Article.count({ where: { isDraft: true } }),
            Reel.count(),
            Reel.count({ where: { isDraft: true } }),
            Webinar.count(),
            Webinar.count({ where: { isDraft: true } }),
            Course.count(),
            Course.count({ where: { isDraft: true } }),
            Story.count(),
            CourseEnrollment.count(),
            CourseEnrollment.count({ where: { status: 'active' } }),
            Comment.count({ where: { isDeleted: false } }),
            Media.count(),
        ]);

        res.json({
            posts: { total: posts, draft: postsDraft },
            articles: { total: articles, draft: articlesDraft },
            reels: { total: reels, draft: reelsDraft },
            webinars: { total: webinars, draft: webinarsDraft },
            courses: { total: courses, draft: coursesDraft },
            stories: { total: stories },
            enrollments: { total: enrollments, active: enrollmentsActive },
            comments: { total: comments },
            media: { total: media },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.drafts = async (req, res) => {
    try {
        const limit = Math.min(20, Number(req.query.limit) || 10);
        const [posts, articles, reels, webinars, courses] = await Promise.all([
            Post.findAll({ where: { isDraft: true }, order: [['updatedAt', 'DESC']], limit }),
            Article.findAll({ where: { isDraft: true }, order: [['updatedAt', 'DESC']], limit }),
            Reel.findAll({ where: { isDraft: true }, order: [['updatedAt', 'DESC']], limit }),
            Webinar.findAll({ where: { isDraft: true }, order: [['updatedAt', 'DESC']], limit }),
            Course.findAll({ where: { isDraft: true }, order: [['updatedAt', 'DESC']], limit }),
        ]);
        const items = [
            ...posts.map((p) => ({
                kind: 'post',
                id: p.id,
                title: (p.text || '').slice(0, 80) || 'Без текста',
                updatedAt: p.updatedAt,
            })),
            ...articles.map((a) => ({
                kind: 'article',
                id: a.id,
                title: a.title,
                updatedAt: a.updatedAt,
            })),
            ...reels.map((r) => ({
                kind: 'reel',
                id: r.id,
                title: (r.description || '').slice(0, 80) || 'Без описания',
                updatedAt: r.updatedAt,
            })),
            ...webinars.map((w) => ({
                kind: 'webinar',
                id: w.id,
                title: w.title,
                updatedAt: w.updatedAt,
            })),
            ...courses.map((c) => ({
                kind: 'course',
                id: c.id,
                title: c.title,
                updatedAt: c.updatedAt,
            })),
        ];
        items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        res.json({ items: items.slice(0, limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
