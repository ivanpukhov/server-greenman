const PACKAGE_WEIGHT_GRAMS = 1000;
const PACKAGE_LENGTH_CM = 20;
const PACKAGE_WIDTH_CM = 20;
const PACKAGE_HEIGHT_CM = 10;

const buildPackages = ({ orderNumber, items }) => {
    return [{
        number: `${orderNumber || 'pkg'}-1`,
        weight: PACKAGE_WEIGHT_GRAMS,
        length: PACKAGE_LENGTH_CM,
        width: PACKAGE_WIDTH_CM,
        height: PACKAGE_HEIGHT_CM,
        comment: 'Стандартная упаковка',
        items: Array.isArray(items) ? items : []
    }];
};

module.exports = {
    buildPackages,
    PACKAGE_WEIGHT_GRAMS,
    PACKAGE_LENGTH_CM,
    PACKAGE_WIDTH_CM,
    PACKAGE_HEIGHT_CM
};
