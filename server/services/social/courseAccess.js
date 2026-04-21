function currentUnlockedDay(enrollment, course) {
    if (!enrollment || !enrollment.startedAt) return 0;
    const started = new Date(enrollment.startedAt).getTime();
    const now = Date.now();
    const diffDays = Math.floor((now - started) / 86400000) + 1;
    const maxDays = course?.durationDays || 0;
    return Math.max(0, Math.min(maxDays, diffDays));
}

function isDayUnlocked(enrollment, course, dayNumber) {
    return dayNumber > 0 && dayNumber <= currentUnlockedDay(enrollment, course);
}

module.exports = { currentUnlockedDay, isDayUnlocked };
