const { Poll, PollOption, PollVote } = require('../../models/social');

exports.adminCreate = async (req, res) => {
    try {
        const { pollableType, pollableId, question, allowMultiple, options } = req.body || {};
        if (!pollableType || !pollableId || !question || !Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ message: 'Нужны pollableType, pollableId, question, 2+ options' });
        }
        const poll = await Poll.create({
            pollableType,
            pollableId,
            question,
            allowMultiple: !!allowMultiple
        });
        await PollOption.bulkCreate(
            options.map((text, idx) => ({ pollId: poll.id, text, order: idx }))
        );
        const fresh = await Poll.findByPk(poll.id, { include: [{ model: PollOption, as: 'options' }] });
        res.status(201).json(fresh);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminUpdate = async (req, res) => {
    try {
        const poll = await Poll.findByPk(req.params.id);
        if (!poll) return res.status(404).json({ message: 'Опрос не найден' });
        const { question, allowMultiple, closedAt, options } = req.body || {};
        if (question !== undefined) poll.question = question;
        if (allowMultiple !== undefined) poll.allowMultiple = !!allowMultiple;
        if (closedAt !== undefined) poll.closedAt = closedAt ? new Date(closedAt) : null;
        await poll.save();
        if (Array.isArray(options)) {
            await PollOption.destroy({ where: { pollId: poll.id } });
            await PollVote.destroy({ where: { pollId: poll.id } });
            await PollOption.bulkCreate(options.map((text, idx) => ({ pollId: poll.id, text, order: idx })));
        }
        const fresh = await Poll.findByPk(poll.id, { include: [{ model: PollOption, as: 'options' }] });
        res.json(fresh);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminRemove = async (req, res) => {
    const poll = await Poll.findByPk(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Опрос не найден' });
    await poll.destroy();
    res.json({ ok: true });
};

exports.vote = async (req, res) => {
    try {
        const poll = await Poll.findByPk(req.params.id);
        if (!poll) return res.status(404).json({ message: 'Опрос не найден' });
        if (poll.closedAt && poll.closedAt < new Date()) {
            return res.status(400).json({ message: 'Опрос закрыт' });
        }
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Только для авторизованных' });
        let optionIds = req.body?.optionIds || req.body?.optionId;
        if (!Array.isArray(optionIds)) optionIds = [optionIds];
        optionIds = optionIds.map(Number).filter(Number.isFinite);
        if (optionIds.length === 0) return res.status(400).json({ message: 'Выберите вариант' });
        if (!poll.allowMultiple && optionIds.length > 1) optionIds = [optionIds[0]];

        const validOptions = await PollOption.findAll({ where: { pollId: poll.id, id: optionIds } });
        if (validOptions.length !== optionIds.length) return res.status(400).json({ message: 'Неверный вариант' });

        await PollVote.destroy({ where: { pollId: poll.id, userId } });
        await PollVote.bulkCreate(optionIds.map((pollOptionId) => ({ pollId: poll.id, pollOptionId, userId })));

        const votes = await PollVote.findAll({ where: { pollId: poll.id } });
        const counts = {};
        for (const v of votes) counts[v.pollOptionId] = (counts[v.pollOptionId] || 0) + 1;
        res.json({ ok: true, voteCounts: counts, totalVotes: votes.length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
