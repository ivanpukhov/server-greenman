const jwtUtility = require('../utilities/jwtUtility');

function adminAuthMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Токен не предоставлен' });
    }

    const decoded = jwtUtility.verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
        return res.status(403).json({ message: 'Доступ запрещен' });
    }

    req.admin = decoded;
    return next();
}

module.exports = adminAuthMiddleware;
