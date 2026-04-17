import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Skeleton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../config/api';
import { useCart } from '../../CartContext.jsx';
import { useWishlist } from '../../contexts/WishlistContext.jsx';
import {
    Breadcrumbs,
    EmptyState,
    ErrorState,
    PageContainer,
    ProductCard,
    toast,
} from '../../ui';
import SearchBlock from './SearchBlock';
import AddTypeDrawer from './AddTypeDrawer';
import s from './Catalog.module.scss';

const Search = () => {
    const { t } = useTranslation();
    const { type, query } = useParams();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const wishlist = useWishlist();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [typeDrawer, setTypeDrawer] = useState(null);

    const load = useCallback(() => {
        if (!query) return;
        setLoading(true);
        setError(null);
        axios
            .get(`${apiUrl('/products/search')}/${encodeURIComponent(query)}?type=${type}`)
            .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
            .catch((err) => {
                if (err.response?.status === 404) setProducts([]);
                else setError(err.message);
            })
            .finally(() => setLoading(false));
    }, [query, type]);

    useEffect(() => {
        load();
    }, [load]);

    const cartById = useMemo(() => {
        const m = new Map();
        cart.forEach((c) => m.set(c.id, c));
        return m;
    }, [cart]);

    const handleAdd = (product) => {
        if (!product.types || product.types.length === 0) return;
        if (product.types.length > 1) {
            setTypeDrawer(product);
            return;
        }
        addToCart({ ...product, type: product.types[0], quantity: 1 });
        toast.success(t('catalog.toast.added', { name: product.name }), {
            action: { label: t('catalog.toast.to_cart'), to: '/cart' },
        });
    };

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

    return (
        <PageContainer size="xl" className={s.page}>
            <Helmet>
                <title>{t('search.title')} — GreenMan</title>
                <meta name="description" content={t('search.results_for', { query })} />
            </Helmet>

            <Breadcrumbs
                items={[
                    { label: t('common.home'), to: '/' },
                    { label: t('catalog.title'), to: '/catalog' },
                    { label: `«${query}»` },
                ]}
            />

            <header className={s.header}>
                <div>
                    <h1 className={s.title}>{t('search.title')}</h1>
                    <p className={s.subtitle}>
                        {t('search.results_for', { query })}
                    </p>
                </div>
            </header>

            <SearchBlock initialType={type} initialQuery={query || ''} />

            {loading ? (
                <div className={s.grid}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} h={340} radius="xl" />
                    ))}
                </div>
            ) : error ? (
                <ErrorState
                    title={t('common.error')}
                    description={error}
                    onRetry={load}
                    retryLabel={t('common.retry')}
                />
            ) : products.length === 0 ? (
                <EmptyState
                    title={t('search.empty_title')}
                    description={t('search.empty_text')}
                />
            ) : (
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
            )}

            <AddTypeDrawer product={typeDrawer} onClose={handleCloseTypeDrawer} />
        </PageContainer>
    );
};

export default Search;
