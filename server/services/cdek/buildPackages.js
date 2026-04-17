const PACKAGE_WEIGHT_GRAMS = 1000;
const PACKAGE_LENGTH_CM = 20;
const PACKAGE_WIDTH_CM = 20;
const PACKAGE_HEIGHT_CM = 10;

const buildPackages = ({ orderNumber, items }) => {
    const safeItems = Array.isArray(items) ? items : [];
    const totalWeight = safeItems.reduce((sum, item) => {
        const perUnitWeight = Math.max(0, Number(item?.weight) || 0);
        const amount = Math.max(1, Number(item?.amount) || 1);
        return sum + perUnitWeight * amount;
    }, 0);

    return [{
        number: `${orderNumber || 'pkg'}-1`,
        weight: totalWeight > 0 ? totalWeight : PACKAGE_WEIGHT_GRAMS,
        length: PACKAGE_LENGTH_CM,
        width: PACKAGE_WIDTH_CM,
        height: PACKAGE_HEIGHT_CM,
        comment: 'Стандартная упаковка',
        items: safeItems
    }];
};

module.exports = {
    buildPackages,
    PACKAGE_WEIGHT_GRAMS,
    PACKAGE_LENGTH_CM,
    PACKAGE_WIDTH_CM,
    PACKAGE_HEIGHT_CM
};
