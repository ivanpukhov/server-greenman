import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Skeleton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../config/api';
import { useCart } from '../../CartContext.jsx';
import { useWishlist } from '../../contexts/WishlistContext.jsx';
import { ProductCard, EmptyState, toast } from '../../ui';
import AddTypeDrawer from './AddTypeDrawer';
import s from './CatalogTop.module.scss';

const CatalogTop = ({ limit = 8 }) => {
    const { t } = useTranslation();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const wishlist = useWishlist();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [typeDrawer, setTypeDrawer] = useState(null);

    useEffect(() => {
        let cancelled = false;
        axios
            .get(apiUrl('/products'))
            .then((res) => {
                if (cancelled) return;
                const items = Array.isArray(res.data) ? res.data : [];
                setProducts(
                    items
                        .filter((p) => p.types && p.types.length > 0)
                        .slice(0, limit),
                );
            })
            .catch((err) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [limit]);

    const cartById = useMemo(() => {
        const m = new Map();
        cart.forEach((c) => m.set(c.id, c));
        return m;
    }, [cart]);

    const handleAdd = useCallback(
        (product) => {
            if (!product.types || product.types.length === 0) return;
            if (product.types.length > 1) {
                setTypeDrawer(product);
                return;
            }
            addToCart({ ...product, type: product.types[0], quantity: 1 });
            toast.success(t('catalog.toast.added', { name: product.name }), {
                action: { label: t('catalog.toast.to_cart'), to: '/cart' },
            });
        },
        [addToCart, t],
    );

    const handleIncrement = (product) => {
        const line = cart.find((c) => c.id === product.id);
        if (line) updateQuantity(product.id, line.quantity + 1);
    };

    const handleDecrement = (product) => {
        const line = cart.find((c) => c.id === product.id);
        if (!line) return;
        if (line.quantity > 1) updateQuantity(product.id, line.quantity - 1);
        else removeFromCart(product.id);
    };

    const handleCloseTypeDrawer = (payload) => {
        setTypeDrawer(null);
        if (payload) {
            toast.success(t('catalog.toast.added', { name: payload.name }), {
                action: { label: t('catalog.toast.to_cart'), to: '/cart' },
            });
        }
    };

    if (loading) {
        return (
            <div className={s.grid}>
                {Array.from({ length: limit }).map((_, i) => (
                    <Skeleton key={i} h={320} radius="xl" />
                ))}
            </div>
        );
    }

    if (error || !products.length) {
        return <EmptyState title={t('catalog.empty_title')} />;
    }

    return (
        <>
            <div className={s.grid}>
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        inCart={cartById.get(product.id)}
                        onAdd={handleAdd}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                        wished={wishlist.has(product.id)}
                        onToggleWish={(p) => wishlist.toggle(p.id)}
                    />
                ))}
            </div>
            <AddTypeDrawer product={typeDrawer} onClose={handleCloseTypeDrawer} />
        </>
    );
};

export default CatalogTop;
