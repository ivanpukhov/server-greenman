const KZT_TO_RUB_RATE = Number(process.env.CDEK_KZT_TO_RUB_RATE || 6);
const RF_MARKUP = Number(process.env.CDEK_RF_MARKUP || 1.3);

const roundMoney = (value) => Math.round(Number(value || 0));

const kztToRub = (kztAmount) => roundMoney(Number(kztAmount || 0) * RF_MARKUP / KZT_TO_RUB_RATE);

const normalizeCdekMoneyToRub = (amount, currency) => {
    const normalizedCurrency = String(currency || 'RUB').trim().toUpperCase();
    if (normalizedCurrency === 'KZT') return kztToRub(amount);
    return roundMoney(amount);
};

module.exports = {
    KZT_TO_RUB_RATE,
    RF_MARKUP,
    kztToRub,
    normalizeCdekMoneyToRub
};
