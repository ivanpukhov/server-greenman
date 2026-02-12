const PaymentLink = require('../models/orders/PaymentLink');
const PaymentLinkDispatchPlan = require('../models/orders/PaymentLinkDispatchPlan');
const { normalizeAdminPhone } = require('./adminUsers');

const IVAN_ADMIN_PHONE = '7073670497';
const DASHA_ADMIN_PHONE = '7077632624';

const normalizeChainStep = (step) => {
    const adminPhone = normalizeAdminPhone(step?.adminPhone);
    const repeatCount = Math.max(1, Math.floor(Number(step?.repeatCount) || 1));

    if (!adminPhone) {
        return null;
    }

    return {
        adminPhone: String(adminPhone),
        repeatCount
    };
};

const parseChain = (chainJson) => {
    try {
        const parsed = JSON.parse(String(chainJson || '[]'));
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map(normalizeChainStep).filter(Boolean);
    } catch (_error) {
        return [];
    }
};

const canCurrentAdminSeeTargetAdmin = (currentAdminPhone, targetAdminPhone) => {
    const normalizedCurrentPhone = String(normalizeAdminPhone(currentAdminPhone) || '');
    const normalizedTargetPhone = String(normalizeAdminPhone(targetAdminPhone) || '');

    if (normalizedTargetPhone === IVAN_ADMIN_PHONE) {
        return normalizedCurrentPhone === IVAN_ADMIN_PHONE;
    }

    if (normalizedTargetPhone === DASHA_ADMIN_PHONE) {
        return normalizedCurrentPhone === IVAN_ADMIN_PHONE || normalizedCurrentPhone === DASHA_ADMIN_PHONE;
    }

    return true;
};

const mergeVisibleChainKeepingHidden = (fullChain, visibleChain, currentAdminPhone) => {
    const safeFullChain = Array.isArray(fullChain) ? fullChain.map(normalizeChainStep).filter(Boolean) : [];
    const safeVisibleChain = Array.isArray(visibleChain) ? visibleChain.map(normalizeChainStep).filter(Boolean) : [];

    const result = [];
    let visibleCursor = 0;

    safeFullChain.forEach((step) => {
        if (canCurrentAdminSeeTargetAdmin(currentAdminPhone, step.adminPhone)) {
            if (visibleCursor < safeVisibleChain.length) {
                result.push(safeVisibleChain[visibleCursor]);
                visibleCursor += 1;
            }
            return;
        }

        result.push(step);
    });

    while (visibleCursor < safeVisibleChain.length) {
        result.push(safeVisibleChain[visibleCursor]);
        visibleCursor += 1;
    }

    return result;
};

const getOrCreatePlanState = async () => {
    const [state] = await PaymentLinkDispatchPlan.findOrCreate({
        where: { id: 1 },
        defaults: {
            id: 1,
            chainJson: '[]',
            cursorStepIndex: 0,
            sentInCurrentStep: 0
        }
    });

    return state;
};

const getVisibleDispatchPlan = async (currentAdminPhone) => {
    const state = await getOrCreatePlanState();
    const fullChain = parseChain(state.chainJson);
    const visibleChain = fullChain.filter((step) => canCurrentAdminSeeTargetAdmin(currentAdminPhone, step.adminPhone));

    return {
        chain: visibleChain,
        hasHiddenSteps: fullChain.length !== visibleChain.length
    };
};

const saveVisibleDispatchPlan = async (currentAdminPhone, chain) => {
    const state = await getOrCreatePlanState();
    const fullChain = parseChain(state.chainJson);
    const nextFullChain = mergeVisibleChainKeepingHidden(fullChain, chain, currentAdminPhone);

    await state.update({
        chainJson: JSON.stringify(nextFullChain),
        cursorStepIndex: 0,
        sentInCurrentStep: 0,
        updatedByPhone: String(normalizeAdminPhone(currentAdminPhone) || '')
    });

    const visibleChain = nextFullChain.filter((step) => canCurrentAdminSeeTargetAdmin(currentAdminPhone, step.adminPhone));

    return {
        chain: visibleChain,
        hasHiddenSteps: nextFullChain.length !== visibleChain.length
    };
};

const pickFallbackLink = (activeLinks) => {
    if (!Array.isArray(activeLinks) || activeLinks.length === 0) {
        return null;
    }

    return activeLinks[0];
};

const buildLinkByAdminMap = (activeLinks) => {
    const byAdminPhone = new Map();
    activeLinks.forEach((link) => {
        const adminPhone = String(normalizeAdminPhone(link.adminPhone) || '');
        if (!adminPhone) {
            return;
        }

        // Для каждого администратора берем первую ссылку из отсортированного списка (самую новую).
        if (!byAdminPhone.has(adminPhone)) {
            byAdminPhone.set(adminPhone, link);
        }
    });

    return byAdminPhone;
};

const pickNextPaymentLinkByDispatchPlan = async () => {
    const activeLinks = await PaymentLink.findAll({
        where: { isActive: true },
        order: [['createdAt', 'DESC']]
    });

    if (!activeLinks.length) {
        return null;
    }

    const state = await getOrCreatePlanState();
    const chain = parseChain(state.chainJson);
    if (!chain.length) {
        return pickFallbackLink(activeLinks);
    }

    const byAdminPhone = buildLinkByAdminMap(activeLinks);
    let cursorStepIndex = Number(state.cursorStepIndex) || 0;
    let sentInCurrentStep = Number(state.sentInCurrentStep) || 0;

    if (cursorStepIndex < 0 || cursorStepIndex >= chain.length) {
        cursorStepIndex = 0;
        sentInCurrentStep = 0;
    }

    for (let attempts = 0; attempts < chain.length; attempts += 1) {
        const step = chain[cursorStepIndex];
        const repeatCount = Math.max(1, Math.floor(Number(step.repeatCount) || 1));
        const link = byAdminPhone.get(String(step.adminPhone));

        if (!link) {
            cursorStepIndex = (cursorStepIndex + 1) % chain.length;
            sentInCurrentStep = 0;
            continue;
        }

        sentInCurrentStep += 1;

        if (sentInCurrentStep >= repeatCount) {
            cursorStepIndex = (cursorStepIndex + 1) % chain.length;
            sentInCurrentStep = 0;
        }

        await state.update({
            cursorStepIndex,
            sentInCurrentStep
        });

        return link;
    }

    return pickFallbackLink(activeLinks);
};

module.exports = {
    canCurrentAdminSeeTargetAdmin,
    getVisibleDispatchPlan,
    saveVisibleDispatchPlan,
    pickNextPaymentLinkByDispatchPlan
};
