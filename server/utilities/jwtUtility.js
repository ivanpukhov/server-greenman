const jwt = require('jsonwebtoken');

const JWT_SECRET = 'secret';
const JWT_EXPIRES_IN = '24000h';

const jwtUtility = {
    generateToken(userId) {
        return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    },

    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return null;
        }
    }
};

module.exports = jwtUtility;
