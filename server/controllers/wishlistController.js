const WishlistItem = require('../models/orders/WishlistItem');
const Product = require('../models/Product');
const ProductType = require('../models/ProductType');

async function hydrateProducts(items) {
    const ids = [...new Set(items.map((i) => i.productId))];
    if (ids.length === 0) return [];
    const products = await Product.findAll({
        where: { id: ids },
        include: [{ model: ProductType, as: 'types' }],
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return items
        .map((i) => {
            const p = byId.get(i.productId);
            return p ? { productId: i.productId, product: p } : null;
        })
        .filter(Boolean);
}

exports.list = async (req, res) => {
    try {
        const items = await WishlistItem.findAll({
            where: { userId: req.user.userId },
            order: [['createdAt', 'DESC']],
        });
        const hydrated = await hydrateProducts(items);
        res.json({ items: hydrated });
    } catch (err) {
        console.error('Wishlist list error:', err);
        res.status(500).json({ message: 'Failed to load wishlist' });
    }
};

exports.add = async (req, res) => {
    const productId = Number(req.body.productId);
    if (!productId) return res.status(400).json({ message: 'productId required' });
    try {
        await WishlistItem.findOrCreate({
            where: { userId: req.user.userId, productId },
            defaults: { userId: req.user.userId, productId },
        });
        res.json({ ok: true });
    } catch (err) {
        console.error('Wishlist add error:', err);
        res.status(500).json({ message: 'Failed to add wishlist item' });
    }
};

exports.remove = async (req, res) => {
    const productId = Number(req.params.productId);
    if (!productId) return res.status(400).json({ message: 'productId required' });
    try {
        await WishlistItem.destroy({
            where: { userId: req.user.userId, productId },
        });
        res.json({ ok: true });
    } catch (err) {
        console.error('Wishlist remove error:', err);
        res.status(500).json({ message: 'Failed to remove wishlist item' });
    }
};

exports.merge = async (req, res) => {
    const productIds = Array.isArray(req.body.productIds)
        ? req.body.productIds.map(Number).filter(Boolean)
        : [];
    if (productIds.length === 0) {
        const items = await WishlistItem.findAll({
            where: { userId: req.user.userId },
        });
        const hydrated = await hydrateProducts(items);
        return res.json({ items: hydrated });
    }
    try {
        await Promise.all(
            productIds.map((productId) =>
                WishlistItem.findOrCreate({
                    where: { userId: req.user.userId, productId },
                    defaults: { userId: req.user.userId, productId },
                }),
            ),
        );
        const items = await WishlistItem.findAll({
            where: { userId: req.user.userId },
            order: [['createdAt', 'DESC']],
        });
        const hydrated = await hydrateProducts(items);
        res.json({ items: hydrated });
    } catch (err) {
        console.error('Wishlist merge error:', err);
        res.status(500).json({ message: 'Failed to merge wishlist' });
    }
};
