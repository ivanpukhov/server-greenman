const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');

const postController = require('../../controllers/social/postController');
const reelController = require('../../controllers/social/reelController');
const storyController = require('../../controllers/social/storyController');
const articleController = require('../../controllers/social/articleController');
const webinarController = require('../../controllers/social/webinarController');
const pollController = require('../../controllers/social/pollController');
const courseController = require('../../controllers/social/courseController');
const commentController = require('../../controllers/social/commentController');
const reactionController = require('../../controllers/social/reactionController');
const bookmarkController = require('../../controllers/social/bookmarkController');
const repostController = require('../../controllers/social/repostController');
const feedController = require('../../controllers/social/feedController');
const searchController = require('../../controllers/social/searchController');
const notificationController = require('../../controllers/social/notificationController');
const profileController = require('../../controllers/social/profileController');

const router = express.Router();

// Опциональный auth — некоторые публичные эндпоинты хотят знать, авторизован ли пользователь
function optionalAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (!header) return next();
    try {
        const jwtUtility = require('../../utilities/jwtUtility');
        const token = header.split(' ')[1];
        const decoded = jwtUtility.verifyToken(token);
        if (decoded && !decoded.isAdmin) req.user = decoded;
    } catch (_e) {
        // ignore
    }
    next();
}

// Feed
router.get('/feed', optionalAuth, feedController.unifiedFeed);

// Search
router.get('/search', optionalAuth, searchController.search);

// Posts
router.get('/posts', optionalAuth, postController.publicList);
router.get('/posts/:id', optionalAuth, postController.publicGet);

// Reels
router.get('/reels', optionalAuth, reelController.publicList);
router.get('/reels/:id', optionalAuth, reelController.publicGet);
router.post('/reels/:id/view', optionalAuth, reelController.view);

// Stories
router.get('/stories/active', optionalAuth, storyController.publicActive);
router.post('/stories/:id/view', authMiddleware, storyController.view);

// Articles
router.get('/articles', optionalAuth, articleController.publicList);
router.get('/articles/:slug', optionalAuth, articleController.publicGetBySlug);

// Webinars
router.get('/webinars', optionalAuth, webinarController.publicList);
router.get('/webinars/:slug', optionalAuth, webinarController.publicGetBySlug);

// Polls
router.post('/polls/:id/vote', authMiddleware, pollController.vote);

// Courses
router.get('/courses', optionalAuth, courseController.publicList);
router.get('/courses/mine', authMiddleware, courseController.myEnrollments);
router.get('/courses/:slug', optionalAuth, courseController.publicGetBySlug);
router.post('/courses/:id/enroll', authMiddleware, courseController.enroll);
router.get('/courses/:slug/days', optionalAuth, courseController.publicDaysList);
router.get('/courses/:slug/days/:dayNumber', authMiddleware, courseController.publicDayGet);
router.post('/courses/:slug/days/:dayNumber/complete', authMiddleware, courseController.completeDay);
router.post('/courses/enrollments/:enrollmentId/reports', authMiddleware, courseController.submitReport);
router.get('/courses/enrollments/:enrollmentId/support', authMiddleware, courseController.supportList);
router.post('/courses/enrollments/:enrollmentId/support', authMiddleware, courseController.supportSend);

// Comments (public read, auth to write)
router.get('/comments', optionalAuth, commentController.list);
router.post('/comments', authMiddleware, commentController.create);
router.patch('/comments/:id', authMiddleware, commentController.update);
router.delete('/comments/:id', authMiddleware, commentController.remove);

// Reactions
router.get('/reactions', optionalAuth, reactionController.counts);
router.post('/reactions/toggle', authMiddleware, reactionController.toggle);

// Bookmarks
router.get('/bookmarks', authMiddleware, bookmarkController.list);
router.post('/bookmarks/toggle', authMiddleware, bookmarkController.toggle);

// Reposts
router.get('/reposts', authMiddleware, repostController.list);
router.get('/reposts/counts', optionalAuth, repostController.counts);
router.post('/reposts/toggle', authMiddleware, repostController.toggle);

// Profile
router.get('/profile/activity', authMiddleware, profileController.activity);
router.get('/profile/homework', authMiddleware, profileController.homework);

// Notifications
router.get('/notifications', authMiddleware, notificationController.list);
router.post('/notifications/:id/read', authMiddleware, notificationController.markRead);

module.exports = router;
