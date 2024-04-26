function adminMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token === '56j48P2jHy38uvzrjtFNNkjlwdfkjbvwlkejgbUMqKhTzRjyIRj7xcmChhTYuF1VZuLLcGIsR4egG') {
        next();
    } else {
        res.status(403).json({ message: 'Доступ запрещен' });
    }
}

module.exports = adminMiddleware;
