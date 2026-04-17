export const KZT_TO_RUB_RATE = 6;
export const RF_MARKUP = 1.3;

export const CURRENCIES = {
    KZ: { code: 'KZT', symbol: '₸', locale: 'ru-KZ', label: 'Казахстан' },
    RF: { code: 'RUB', symbol: '₽', locale: 'ru-RU', label: 'Россия' }
};

export const toDisplayPrice = (kztPrice, country) => {
    const base = Number(kztPrice) || 0;
    if (country === 'RF') {
        return Math.round(base * RF_MARKUP / KZT_TO_RUB_RATE);
    }
    return Math.round(base);
};

export const formatDisplayPrice = (kztPrice, country) => {
    const currency = CURRENCIES[country] || CURRENCIES.KZ;
    const value = toDisplayPrice(kztPrice, country);
    const formatted = new Intl.NumberFormat(currency.locale, { maximumFractionDigits: 0 }).format(value);
    return `${formatted} ${currency.symbol}`;
};
