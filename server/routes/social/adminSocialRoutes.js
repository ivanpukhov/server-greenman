const express = require('express');
const adminAuthMiddleware = require('../../middleware/adminAuthMiddleware');
const { single } = require('../../middleware/mediaUpload');

const mediaController = require('../../controllers/social/mediaController');
const postController = require('../../controllers/social/postController');
const reelController = require('../../controllers/social/reelController');
const storyController = require('../../controllers/social/storyController');
const bannerController = require('../../controllers/social/bannerController');
const articleController = require('../../controllers/social/articleController');
const webinarController = require('../../controllers/social/webinarController');
const pollController = require('../../controllers/social/pollController');
const courseController = require('../../controllers/social/courseController');
const commentController = require('../../controllers/social/commentController');
const dashboardController = require('../../controllers/social/dashboardController');

const router = express.Router();
router.use(adminAuthMiddleware);

// Dashboard
router.get('/stats', dashboardController.stats);
router.get('/drafts', dashboardController.drafts);

// Media
router.post('/media', single('file'), mediaController.upload);
router.get('/media', mediaController.list);
router.post('/media/bulk-remove', mediaController.bulkRemove);
router.delete('/media/:id', mediaController.remove);

// Posts
router.get('/posts', postController.adminList);
router.post('/posts', postController.adminCreate);
router.patch('/posts/:id', postController.adminUpdate);
router.put('/posts/:id', postController.adminUpdate);
router.delete('/posts/:id', postController.adminRemove);

// Reels
router.get('/reels', reelController.adminList);
router.post('/reels', reelController.adminCreate);
router.patch('/reels/:id', reelController.adminUpdate);
router.put('/reels/:id', reelController.adminUpdate);
router.delete('/reels/:id', reelController.adminRemove);

// Stories
router.get('/stories', storyController.adminList);
router.post('/stories', storyController.adminCreate);
router.patch('/stories/:id', storyController.adminUpdate);
router.put('/stories/:id', storyController.adminUpdate);
router.delete('/stories/:id', storyController.adminRemove);

// Home banners
router.get('/banners', bannerController.adminList);
router.post('/banners', bannerController.adminCreate);
router.patch('/banners/:id', bannerController.adminUpdate);
router.put('/banners/:id', bannerController.adminUpdate);
router.delete('/banners/:id', bannerController.adminRemove);

// Articles
router.get('/articles', articleController.adminList);
router.get('/articles/:id', articleController.adminGet);
router.post('/articles', articleController.adminCreate);
router.patch('/articles/:id', articleController.adminUpdate);
router.put('/articles/:id', articleController.adminUpdate);
router.delete('/articles/:id', articleController.adminRemove);

// Webinars
router.get('/webinars', webinarController.adminList);
router.get('/webinars/:id', webinarController.adminGet);
router.post('/webinars', webinarController.adminCreate);
router.patch('/webinars/:id', webinarController.adminUpdate);
router.put('/webinars/:id', webinarController.adminUpdate);
router.delete('/webinars/:id', webinarController.adminRemove);

// Polls
router.post('/polls', pollController.adminCreate);
router.patch('/polls/:id', pollController.adminUpdate);
router.put('/polls/:id', pollController.adminUpdate);
router.delete('/polls/:id', pollController.adminRemove);

// Courses
router.get('/courses', courseController.adminCourseList);
router.get('/courses/:id', courseController.adminCourseGet);
router.post('/courses', courseController.adminCourseCreate);
router.patch('/courses/:id', courseController.adminCourseUpdate);
router.put('/courses/:id', courseController.adminCourseUpdate);
router.delete('/courses/:id', courseController.adminCourseRemove);

// Course days
router.get('/courses/:courseId/days', courseController.adminDayList);
router.post('/courses/:courseId/days', courseController.adminDayCreate);
router.patch('/courses/:courseId/days/:dayId', courseController.adminDayUpdate);
router.put('/courses/:courseId/days/:dayId', courseController.adminDayUpdate);
router.delete('/courses/:courseId/days/:dayId', courseController.adminDayRemove);

// Course enrollments + support
router.get('/courses/:courseId/enrollments', courseController.adminEnrollmentsByCourse);
router.post('/courses/enrollments/:enrollmentId/activate', courseController.adminActivateEnrollment);
router.get('/courses/enrollments/:enrollmentId/support', courseController.adminSupportList);
router.post('/courses/enrollments/:enrollmentId/support', courseController.adminSupportSend);

// Comments moderation
router.get('/comments', commentController.adminListAll);
router.delete('/comments/:id', commentController.remove);

module.exports = router;
