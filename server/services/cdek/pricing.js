const KZT_TO_RUB_RATE = Number(process.env.CDEK_KZT_TO_RUB_RATE || 6);
const RF_MARKUP = Number(process.env.CDEK_RF_MARKUP || 1.3);

module.exports = {
    KZT_TO_RUB_RATE,
    RF_MARKUP
};
