const { kztToRub } = require('./pricing');

const SPIRIT_REGEX = /\bспирт\w*/giu;
const DEFAULT_ITEM_WEIGHT_GRAMS = 1000;

const stripSpirit = (name) => {
    if (!name) return '';
    return String(name).replace(SPIRIT_REGEX, '').replace(/\s+/g, ' ').trim();
};

const truncate = (str, max) => (str.length > max ? str.slice(0, max) : str);

/**
 * Преобразует позиции заказа в формат items для СДЭК.
 * Требования задачи:
 *  - из названия удалить слово «спирт»
 *  - вес нетто за единицу передаём в items.weight, иначе СДЭК валидирует заказ как INVALID
 *  - payment.value = cost * amount (наложенный платёж)
 */
const buildCdekItems = (orderProducts) => {
    if (!Array.isArray(orderProducts)) return [];

    return orderProducts.map((product, index) => {
        const rawName = product.name || product.product || '';
        const type = product.type?.type || product.typeLabel || '';
        const cleanedName = stripSpirit(`${rawName} ${type}`.trim());
        const name = truncate(cleanedName || `Товар ${index + 1}`, 255);

        const amount = Math.max(1, Number(product.quantity || 1));
        const kztPrice = Number(product.type?.price ?? product.price ?? 0);
        const costRub = kztToRub(kztPrice);
        const productTypeId = product.type?.id ?? product.typeId ?? product.productTypeId ?? product.productId;

        return {
            name,
            ware_key: truncate(String(productTypeId ?? `item-${index}`), 50),
            cost: costRub,
            amount,
            weight: DEFAULT_ITEM_WEIGHT_GRAMS,
            payment: { value: costRub * amount }
        };
    });
};

module.exports = {
    stripSpirit,
    buildCdekItems,
    kztToRub
};
