const { Op } = require('sequelize');
const {
    Course,
    CourseDay,
    CourseEnrollment,
    CourseDayReport,
    CourseDayProgress,
    CourseSupportMessage,
    Media
} = require('../../models/social');
const { uniqueSlug } = require('../../services/social/slugs');
const { setAttachments, attachMap } = require('../../services/social/attachments');
const { currentUnlockedDay, isDayUnlocked } = require('../../services/social/courseAccess');

const DAY_ATTACH_TYPE = 'course_day';
const REPORT_ATTACH_TYPE = 'course_day_report';
const SUPPORT_ATTACH_TYPE = 'course_support_message';

async function hydrateCourse(c) {
    const obj = c.toJSON();
    if (c.coverMediaId) obj.cover = (await Media.findByPk(c.coverMediaId))?.toJSON() || null;
    if (c.trailerMediaId) obj.trailer = (await Media.findByPk(c.trailerMediaId))?.toJSON() || null;
    if (obj.descriptionBlocks) {
        try { obj.descriptionBlocks = JSON.parse(obj.descriptionBlocks); } catch (_e) { /* noop */ }
    }
    return obj;
}

async function hydrateDay(d) {
    const obj = d.toJSON();
    if (obj.contentBlocks) {
        try { obj.contentBlocks = JSON.parse(obj.contentBlocks); } catch (_e) { /* noop */ }
    }
    const files = await attachMap(DAY_ATTACH_TYPE, [d.id]);
    obj.files = files.get(d.id) || [];
    return obj;
}

async function enrollmentProgress(enrollment, course) {
    if (!enrollment) return { completedDayIds: [], completedDayNumbers: [], percent: 0 };
    const marks = await CourseDayProgress.findAll({
        where: { enrollmentId: enrollment.id },
        attributes: ['courseDayId']
    });
    const ids = marks.map((m) => m.courseDayId);
    let numbers = [];
    if (ids.length) {
        const days = await CourseDay.findAll({
            where: { id: ids },
            attributes: ['id', 'dayNumber']
        });
        numbers = days.map((d) => d.dayNumber).sort((a, b) => a - b);
    }
    const total = Math.max(1, Number(course?.durationDays) || 1);
    const percent = Math.min(100, Math.round((numbers.length / total) * 100));
    return { completedDayIds: ids, completedDayNumbers: numbers, percent };
}

// ===== Admin — courses =====

exports.adminCourseList = async (_req, res) => {
    const items = await Course.findAll({ order: [['id', 'DESC']] });
    res.json(await Promise.all(items.map(hydrateCourse)));
};

exports.adminCourseGet = async (req, res) => {
    const c = await Course.findByPk(req.params.id);
    if (!c) return res.status(404).json({ message: 'Курс не найден' });
    res.json(await hydrateCourse(c));
};

exports.adminCourseCreate = async (req, res) => {
    try {
        const adminUserId = req.admin?.adminUserId || req.admin?.id || 0;
        const {
            title, slug, shortDescription, descriptionBlocks,
            trailerMediaId, coverMediaId, priceCents, currency, durationDays,
            publishedAt, isDraft
        } = req.body || {};
        if (!title) return res.status(400).json({ message: 'title обязателен' });
        const finalSlug = await uniqueSlug(Course, slug || title, title);
        const course = await Course.create({
            adminUserId,
            title,
            slug: finalSlug,
            shortDescription: shortDescription || null,
            descriptionBlocks: descriptionBlocks ? JSON.stringify(descriptionBlocks) : null,
            trailerMediaId: trailerMediaId || null,
            coverMediaId: coverMediaId || null,
            priceCents: Number(priceCents) || 0,
            currency: currency || 'KZT',
            durationDays: Math.max(1, Number(durationDays) || 1),
            publishedAt: publishedAt ? new Date(publishedAt) : (isDraft === false ? new Date() : null),
            isDraft: isDraft !== false
        });
        res.status(201).json(await hydrateCourse(course));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminCourseUpdate = async (req, res) => {
    try {
        const c = await Course.findByPk(req.params.id);
        if (!c) return res.status(404).json({ message: 'Курс не найден' });
        const body = req.body || {};
        const fields = ['title', 'shortDescription', 'trailerMediaId', 'coverMediaId', 'priceCents', 'currency', 'durationDays'];
        for (const f of fields) if (body[f] !== undefined) c[f] = body[f];
        if (body.descriptionBlocks !== undefined) {
            c.descriptionBlocks = body.descriptionBlocks ? JSON.stringify(body.descriptionBlocks) : null;
        }
        if (body.slug !== undefined && body.slug !== c.slug) c.slug = await uniqueSlug(Course, body.slug, c.title);
        if (body.publishedAt !== undefined) c.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
        if (body.isDraft !== undefined) {
            c.isDraft = !!body.isDraft;
            if (!c.isDraft && !c.publishedAt) c.publishedAt = new Date();
        }
        await c.save();
        res.json(await hydrateCourse(c));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminCourseRemove = async (req, res) => {
    const c = await Course.findByPk(req.params.id);
    if (!c) return res.status(404).json({ message: 'Курс не найден' });
    await c.destroy();
    res.json({ ok: true });
};

// ===== Admin — days =====

exports.adminDayList = async (req, res) => {
    const days = await CourseDay.findAll({ where: { courseId: req.params.courseId }, order: [['dayNumber', 'ASC']] });
    res.json(await Promise.all(days.map(hydrateDay)));
};

exports.adminDayCreate = async (req, res) => {
    try {
        const { dayNumber, title, contentBlocks, publishedAt, isDraft, fileMediaIds } = req.body || {};
        if (!dayNumber || !title) return res.status(400).json({ message: 'dayNumber и title обязательны' });
        const day = await CourseDay.create({
            courseId: Number(req.params.courseId),
            dayNumber: Number(dayNumber),
            title,
            contentBlocks: contentBlocks ? JSON.stringify(contentBlocks) : null,
            publishedAt: publishedAt ? new Date(publishedAt) : (isDraft === false ? new Date() : null),
            isDraft: isDraft !== false
        });
        if (Array.isArray(fileMediaIds)) await setAttachments(DAY_ATTACH_TYPE, day.id, fileMediaIds);
        res.status(201).json(await hydrateDay(day));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminDayUpdate = async (req, res) => {
    try {
        const day = await CourseDay.findOne({ where: { id: req.params.dayId, courseId: req.params.courseId } });
        if (!day) return res.status(404).json({ message: 'День не найден' });
        const body = req.body || {};
        if (body.dayNumber !== undefined) day.dayNumber = Number(body.dayNumber);
        if (body.title !== undefined) day.title = body.title;
        if (body.contentBlocks !== undefined) day.contentBlocks = body.contentBlocks ? JSON.stringify(body.contentBlocks) : null;
        if (body.publishedAt !== undefined) day.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
        if (body.isDraft !== undefined) {
            day.isDraft = !!body.isDraft;
            if (!day.isDraft && !day.publishedAt) day.publishedAt = new Date();
        }
        await day.save();
        if (Array.isArray(body.fileMediaIds)) await setAttachments(DAY_ATTACH_TYPE, day.id, body.fileMediaIds);
        res.json(await hydrateDay(day));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminDayRemove = async (req, res) => {
    const day = await CourseDay.findOne({ where: { id: req.params.dayId, courseId: req.params.courseId } });
    if (!day) return res.status(404).json({ message: 'День не найден' });
    await day.destroy();
    res.json({ ok: true });
};

// ===== Admin — enrollments / support =====

exports.adminEnrollmentsByCourse = async (req, res) => {
    const items = await CourseEnrollment.findAll({ where: { courseId: req.params.courseId }, order: [['id', 'DESC']] });
    res.json(items);
};

exports.adminActivateEnrollment = async (req, res) => {
    const e = await CourseEnrollment.findByPk(req.params.enrollmentId);
    if (!e) return res.status(404).json({ message: 'Enrollment не найден' });
    if (!e.startedAt) {
        e.startedAt = new Date();
        e.status = 'active';
        await e.save();
    }
    res.json(e);
};

exports.adminSupportList = async (req, res) => {
    const items = await CourseSupportMessage.findAll({
        where: { enrollmentId: req.params.enrollmentId },
        order: [['id', 'ASC']]
    });
    const media = await attachMap(SUPPORT_ATTACH_TYPE, items.map((m) => m.id));
    res.json(items.map((m) => ({ ...m.toJSON(), media: media.get(m.id) || [] })));
};

exports.adminSupportSend = async (req, res) => {
    try {
        const adminUserId = req.admin?.adminUserId || req.admin?.id || 0;
        const enrollment = await CourseEnrollment.findByPk(req.params.enrollmentId);
        if (!enrollment) return res.status(404).json({ message: 'Enrollment не найден' });
        const { text, mediaIds } = req.body || {};
        const msg = await CourseSupportMessage.create({
            enrollmentId: enrollment.id,
            senderType: 'admin',
            senderId: adminUserId,
            text: text || null
        });
        if (Array.isArray(mediaIds)) await setAttachments(SUPPORT_ATTACH_TYPE, msg.id, mediaIds);
        res.status(201).json(msg);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ===== Public =====

exports.publicList = async (_req, res) => {
    const items = await Course.findAll({
        where: { isDraft: false, publishedAt: { [Op.not]: null } },
        order: [['publishedAt', 'DESC']]
    });
    res.json(await Promise.all(items.map(hydrateCourse)));
};

exports.publicGetBySlug = async (req, res) => {
    const c = await Course.findOne({
        where: { slug: req.params.slug, isDraft: false, publishedAt: { [Op.not]: null } }
    });
    if (!c) return res.status(404).json({ message: 'Курс не найден' });
    const out = await hydrateCourse(c);
    const userId = req.user?.userId;
    if (userId) {
        const enrollment = await CourseEnrollment.findOne({ where: { courseId: c.id, userId } });
        out.enrollment = enrollment ? enrollment.toJSON() : null;
        out.progress = await enrollmentProgress(enrollment, c);
    } else {
        out.progress = { completedDayIds: [], completedDayNumbers: [], percent: 0 };
    }
    res.json(out);
};

exports.enroll = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Требуется авторизация' });
        const c = await Course.findByPk(req.params.id);
        if (!c || c.isDraft || !c.publishedAt) return res.status(404).json({ message: 'Курс не найден' });

        const existing = await CourseEnrollment.findOne({ where: { courseId: c.id, userId } });
        if (existing && existing.startedAt) return res.json({ enrollment: existing, requiresPayment: false });

        if (!c.priceCents || c.priceCents <= 0) {
            const enrollment = existing
                ? await existing.update({ status: 'active', startedAt: new Date() })
                : await CourseEnrollment.create({ courseId: c.id, userId, status: 'active', startedAt: new Date() });
            return res.json({ enrollment, requiresPayment: false });
        }

        const enrollment = existing
            ? existing
            : await CourseEnrollment.create({ courseId: c.id, userId, status: 'pending' });
        return res.json({
            enrollment,
            requiresPayment: true,
            priceCents: c.priceCents,
            currency: c.currency,
            hint: 'Используйте существующий flow PaymentLink: админ отправит ссылку и после оплаты курс активируется.'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.publicDaysList = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const c = await Course.findOne({
            where: { slug: req.params.slug, isDraft: false, publishedAt: { [Op.not]: null } }
        });
        if (!c) return res.status(404).json({ message: 'Курс не найден' });
        const enrollment = userId ? await CourseEnrollment.findOne({ where: { courseId: c.id, userId } }) : null;
        const unlockedUpTo = enrollment ? currentUnlockedDay(enrollment, c) : 0;
        const days = await CourseDay.findAll({ where: { courseId: c.id }, order: [['dayNumber', 'ASC']] });
        const out = await Promise.all(days.map(async (d) => {
            const unlocked = unlockedUpTo >= d.dayNumber && !d.isDraft && !!d.publishedAt;
            if (!unlocked) {
                return {
                    id: d.id,
                    dayNumber: d.dayNumber,
                    title: d.title,
                    locked: true
                };
            }
            return { ...(await hydrateDay(d)), locked: false };
        }));
        const progress = await enrollmentProgress(enrollment, c);
        const completedSet = new Set(progress.completedDayIds);
        for (const item of out) {
            if (item && !item.locked) item.completed = completedSet.has(item.id);
        }
        res.json({ course: await hydrateCourse(c), unlockedUpTo, days: out, progress });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.publicDayGet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const c = await Course.findOne({
            where: { slug: req.params.slug, isDraft: false, publishedAt: { [Op.not]: null } }
        });
        if (!c) return res.status(404).json({ message: 'Курс не найден' });
        const enrollment = userId ? await CourseEnrollment.findOne({ where: { courseId: c.id, userId } }) : null;
        if (!enrollment || !enrollment.startedAt) {
            return res.status(403).json({ message: 'Нужна регистрация на курс' });
        }
        const dayNumber = Number(req.params.dayNumber);
        if (!isDayUnlocked(enrollment, c, dayNumber)) return res.status(403).json({ message: 'День ещё не открыт' });
        const day = await CourseDay.findOne({ where: { courseId: c.id, dayNumber } });
        if (!day || day.isDraft || !day.publishedAt) return res.status(404).json({ message: 'День не опубликован' });
        const dayObj = await hydrateDay(day);
        const completed = !!(await CourseDayProgress.findOne({
            where: { enrollmentId: enrollment.id, courseDayId: day.id }
        }));
        dayObj.completed = completed;
        const reports = await CourseDayReport.findAll({
            where: { enrollmentId: enrollment.id, courseDayId: day.id },
            order: [['id', 'DESC']]
        });
        dayObj.reports = reports.map((r) => r.toJSON());
        const progress = await enrollmentProgress(enrollment, c);
        res.json({ course: await hydrateCourse(c), enrollment, day: dayObj, progress });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.submitReport = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Нужна авторизация' });
        const enrollment = await CourseEnrollment.findOne({ where: { id: req.params.enrollmentId, userId } });
        if (!enrollment) return res.status(404).json({ message: 'Enrollment не найден' });
        const { courseDayId, text, mediaIds } = req.body || {};
        if (!courseDayId) return res.status(400).json({ message: 'courseDayId обязателен' });
        const report = await CourseDayReport.create({
            enrollmentId: enrollment.id,
            courseDayId: Number(courseDayId),
            text: text || null
        });
        if (Array.isArray(mediaIds)) await setAttachments(REPORT_ATTACH_TYPE, report.id, mediaIds);
        res.status(201).json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.supportList = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Нужна авторизация' });
        const enrollment = await CourseEnrollment.findOne({ where: { id: req.params.enrollmentId, userId } });
        if (!enrollment) return res.status(404).json({ message: 'Enrollment не найден' });
        const items = await CourseSupportMessage.findAll({ where: { enrollmentId: enrollment.id }, order: [['id', 'ASC']] });
        const media = await attachMap(SUPPORT_ATTACH_TYPE, items.map((m) => m.id));
        res.json(items.map((m) => ({ ...m.toJSON(), media: media.get(m.id) || [] })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.supportSend = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Нужна авторизация' });
        const enrollment = await CourseEnrollment.findOne({ where: { id: req.params.enrollmentId, userId } });
        if (!enrollment) return res.status(404).json({ message: 'Enrollment не найден' });
        const { text, mediaIds } = req.body || {};
        const msg = await CourseSupportMessage.create({
            enrollmentId: enrollment.id,
            senderType: 'user',
            senderId: userId,
            text: text || null
        });
        if (Array.isArray(mediaIds)) await setAttachments(SUPPORT_ATTACH_TYPE, msg.id, mediaIds);
        res.status(201).json(msg);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.myEnrollments = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Нужна авторизация' });
    const items = await CourseEnrollment.findAll({ where: { userId }, order: [['id', 'DESC']] });
    const courses = await Course.findAll({ where: { id: items.map((e) => e.courseId) } });
    const byId = new Map(courses.map((c) => [c.id, c]));
    const out = await Promise.all(items.map(async (e) => {
        const course = byId.get(e.courseId) || null;
        return {
            ...e.toJSON(),
            course: course ? await hydrateCourse(course) : null,
            unlockedUpTo: course ? currentUnlockedDay(e, course) : 0,
            progress: await enrollmentProgress(e, course)
        };
    }));
    res.json(out);
};

exports.completeDay = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Нужна авторизация' });
        const c = await Course.findOne({
            where: { slug: req.params.slug, isDraft: false, publishedAt: { [Op.not]: null } }
        });
        if (!c) return res.status(404).json({ message: 'Курс не найден' });
        const enrollment = await CourseEnrollment.findOne({ where: { courseId: c.id, userId } });
        if (!enrollment || !enrollment.startedAt) {
            return res.status(403).json({ message: 'Нужна регистрация на курс' });
        }
        const dayNumber = Number(req.params.dayNumber);
        if (!isDayUnlocked(enrollment, c, dayNumber)) return res.status(403).json({ message: 'День ещё не открыт' });
        const day = await CourseDay.findOne({ where: { courseId: c.id, dayNumber } });
        if (!day) return res.status(404).json({ message: 'День не найден' });
        const [, created] = await CourseDayProgress.findOrCreate({
            where: { enrollmentId: enrollment.id, courseDayId: day.id },
            defaults: { enrollmentId: enrollment.id, courseDayId: day.id, completedAt: new Date() }
        });
        const progress = await enrollmentProgress(enrollment, c);
        if (progress.completedDayNumbers.length >= (Number(c.durationDays) || 0) && !enrollment.completedAt) {
            enrollment.completedAt = new Date();
            enrollment.status = 'completed';
            await enrollment.save();
        }
        res.json({ ok: true, created, progress });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
