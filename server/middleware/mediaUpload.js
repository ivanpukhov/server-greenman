const multer = require('multer');

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'];
const AUDIO_MIMES = ['audio/mpeg', 'audio/mp4', 'audio/ogg'];
const FILE_MIMES = [
    'application/pdf',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
];

const MB = 1024 * 1024;

function mediaTypeOf(mime) {
    if (IMAGE_MIMES.includes(mime)) return 'image';
    if (VIDEO_MIMES.includes(mime)) return 'video';
    if (AUDIO_MIMES.includes(mime)) return 'audio';
    if (FILE_MIMES.includes(mime)) return 'file';
    return null;
}

const uploader = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * MB },
    fileFilter: (_req, file, cb) => {
        if (!mediaTypeOf(file.mimetype)) {
            return cb(new Error(`MIME-тип ${file.mimetype} не разрешён`));
        }
        cb(null, true);
    }
});

module.exports = {
    single: (field = 'file') => uploader.single(field),
    mediaTypeOf
};
