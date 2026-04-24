const Media = require('./Media');
const MediaAttachment = require('./MediaAttachment');
const Post = require('./Post');
const Reel = require('./Reel');
const ReelView = require('./ReelView');
const Story = require('./Story');
const StoryView = require('./StoryView');
const Banner = require('./Banner');
const Webinar = require('./Webinar');
const Poll = require('./Poll');
const PollOption = require('./PollOption');
const PollVote = require('./PollVote');
const Course = require('./Course');
const CourseDay = require('./CourseDay');
const CourseEnrollment = require('./CourseEnrollment');
const CourseDayReport = require('./CourseDayReport');
const CourseDayProgress = require('./CourseDayProgress');
const CourseSupportMessage = require('./CourseSupportMessage');
const Article = require('./Article');
const Comment = require('./Comment');
const Reaction = require('./Reaction');
const Bookmark = require('./Bookmark');
const Repost = require('./Repost');
const SocialNotification = require('./SocialNotification');

// Associations — стараемся держать плоско: полиморфные связи обрабатываются в контроллерах.
Course.hasMany(CourseDay, { foreignKey: 'courseId', as: 'days' });
CourseDay.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Course.hasMany(CourseEnrollment, { foreignKey: 'courseId', as: 'enrollments' });
CourseEnrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

CourseEnrollment.hasMany(CourseSupportMessage, { foreignKey: 'enrollmentId', as: 'supportMessages' });
CourseSupportMessage.belongsTo(CourseEnrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });

CourseEnrollment.hasMany(CourseDayReport, { foreignKey: 'enrollmentId', as: 'reports' });
CourseDayReport.belongsTo(CourseEnrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });

CourseEnrollment.hasMany(CourseDayProgress, { foreignKey: 'enrollmentId', as: 'progress' });
CourseDayProgress.belongsTo(CourseEnrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });
CourseDay.hasMany(CourseDayProgress, { foreignKey: 'courseDayId', as: 'progressMarks' });
CourseDayProgress.belongsTo(CourseDay, { foreignKey: 'courseDayId', as: 'day' });

Poll.hasMany(PollOption, { foreignKey: 'pollId', as: 'options' });
PollOption.belongsTo(Poll, { foreignKey: 'pollId', as: 'poll' });
Poll.hasMany(PollVote, { foreignKey: 'pollId', as: 'votes' });
PollVote.belongsTo(Poll, { foreignKey: 'pollId', as: 'poll' });
PollOption.hasMany(PollVote, { foreignKey: 'pollOptionId', as: 'votes' });
PollVote.belongsTo(PollOption, { foreignKey: 'pollOptionId', as: 'option' });

module.exports = {
    Media,
    MediaAttachment,
    Post,
    Reel,
    ReelView,
    Story,
    StoryView,
    Banner,
    Webinar,
    Poll,
    PollOption,
    PollVote,
    Course,
    CourseDay,
    CourseEnrollment,
    CourseDayReport,
    CourseDayProgress,
    CourseSupportMessage,
    Article,
    Comment,
    Reaction,
    Bookmark,
    Repost,
    SocialNotification
};
