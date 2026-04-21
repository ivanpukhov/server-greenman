const { CourseEnrollment, Course } = require('../../models/social');

// Активирует enrollment для оплаченного курса. Вызывается из места, где помечается оплата
// sent_payment_links (если у записи есть courseId). Идемпотентно.
async function activateEnrollmentForSentPaymentLink(sentPaymentLink, { userId } = {}) {
    if (!sentPaymentLink || !sentPaymentLink.courseId || !sentPaymentLink.isPaid) return null;
    const course = await Course.findByPk(sentPaymentLink.courseId);
    if (!course) return null;
    const resolvedUserId = userId || sentPaymentLink.userId || null;
    if (!resolvedUserId) return null;

    const [enrollment] = await CourseEnrollment.findOrCreate({
        where: { courseId: course.id, userId: resolvedUserId },
        defaults: {
            courseId: course.id,
            userId: resolvedUserId,
            status: 'active',
            startedAt: new Date(),
            sentPaymentLinkId: sentPaymentLink.id
        }
    });
    if (!enrollment.startedAt) {
        enrollment.startedAt = new Date();
        enrollment.status = 'active';
        enrollment.sentPaymentLinkId = sentPaymentLink.id;
        await enrollment.save();
    }
    return enrollment;
}

module.exports = { activateEnrollmentForSentPaymentLink };
