import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import { Drawer, Menu, Skeleton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../config/api';
import {
    IconChevronDown,
    IconFilter,
    IconX,
    IconRefresh,
} from '../../icons';
import {
    Breadcrumbs,
    Button,
    EmptyState,
    ErrorState,
    PageContainer,
    ProductCard,
    toast,
} from '../../ui';
import { useCart } from '../../CartContext.jsx';
import { useWishlist } from '../../contexts/WishlistContext.jsx';
import AddTypeDrawer from './AddTypeDrawer';
import CatalogFilters from './CatalogFilters';
import { useCatalogFilters } from './useCatalogFilters';
import s from './Catalog.module.scss';

const SORT_KEYS = ['popular', 'new', 'price_asc', 'price_desc', 'name'];
const PAGE_LIMIT = 24;

const Catalog = () => {
    const { t } = useTranslation();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const wishlist = useWishlist();
    const { filters, setFilters, reset, isActive, apiQuery } = useCatalogFilters();

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    const [facets, setFacets] = useState(null);

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [typeDrawer, setTypeDrawer] = useState(null);

    useEffect(() => {
        let cancelled = false;
        axios
            .get(apiUrl('/products/facets'))
            .then((res) => {
                if (!cancelled) setFacets(res.data);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const fetchProducts = useCallback(
        async ({ pageNum, append }) => {
            const isFirst = pageNum === 1;
            if (isFirst) setLoading(true);
            else setLoadingMore(true);
            setError(null);

            const qp = new URLSearchParams(apiQuery);
            qp.set('page', String(pageNum));
            qp.set('limit', String(PAGE_LIMIT));

            try {
                const res = await axios.get(
                    `${apiUrl('/products')}?${qp.toString()}`,
                );
                const data = res.data || {};
                const nextItems = Array.isArray(data.items) ? data.items : [];
                setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
                setTotal(Number(data.total) || nextItems.length);
                setPage(Number(data.page) || pageNum);
                setHasMore(Boolean(data.hasMore));
            } catch (e) {
                setError(e.message || 'error');
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [apiQuery],
    );

    useEffect(() => {
        fetchProducts({ pageNum: 1, append: false });
    }, [fetchProducts]);

    const handleLoadMore = () => {
        if (!hasMore || loadingMore) return;
        fetchProducts({ pageNum: page + 1, append: true });
    };

    const handleSort = (next) => {
        if (next === filters.sort) return;
        setFilters({ sort: next });
    };

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

    const cartById = useMemo(() => {
        const m = new Map();
        cart.forEach((c) => m.set(c.id, c));
        return m;
    }, [cart]);

    const activeChips = useMemo(() => {
        const chips = [];
        if (filters.search) {
            chips.push({
                key: 'search',
                label: `"${filters.search}"`,
                onRemove: () => setFilters({ search: '' }),
            });
        }
        filters.diseases.forEach((d) => {
            chips.push({
                key: `d-${d}`,
                label: d,
                onRemove: () =>
                    setFilters({
                        diseases: filters.diseases.filter((x) => x !== d),
                    }),
            });
        });
        if (filters.priceMin !== '') {
            chips.push({
                key: 'pmin',
                label: `≥ ${filters.priceMin}`,
                onRemove: () => setFilters({ priceMin: '' }),
            });
        }
        if (filters.priceMax !== '') {
            chips.push({
                key: 'pmax',
                label: `≤ ${filters.priceMax}`,
                onRemove: () => setFilters({ priceMax: '' }),
            });
        }
        if (filters.inStock) {
            chips.push({
                key: 'stock',
                label: t('catalog.filters.in_stock'),
                onRemove: () => setFilters({ inStock: false }),
            });
        }
        return chips;
    }, [filters, setFilters, t]);

    const handleCloseTypeDrawer = (payload) => {
        setTypeDrawer(null);
        if (payload) {
            toast.success(
                t('catalog.toast.added', { name: payload.name }),
                { action: { label: t('catalog.toast.to_cart'), to: '/cart' } },
            );
        }
    };

    return (
        <PageContainer size="xl" className={s.page}>
            <Helmet>
                <title>{t('catalog.seo_title')}</title>
                <meta name="description" content={t('catalog.seo_description')} />
            </Helmet>

            <Breadcrumbs
                items={[
                    { label: t('common.home'), to: '/' },
                    { label: t('catalog.title') },
                ]}
            />

            <header className={s.header}>
                <div>
                    <h1 className={s.title}>{t('catalog.title')}</h1>
                    <p className={s.subtitle}>
                        {loading
                            ? t('common.loading')
                            : total > 0
                              ? t('catalog.results_count', { count: total })
                              : t('catalog.results_count_zero')}
                    </p>
                </div>
                <div className={s.toolbar}>
                    <Button
                        variant="light"
                        color="greenman"
                        leftSection={<IconFilter size={16} stroke={1.8} />}
                        onClick={() => setFiltersOpen(true)}
                        className={s.filterBtn}
                    >
                        {t('catalog.show_filters')}
                        {isActive && (
                            <span className={s.filterDot} aria-hidden="true" />
                        )}
                    </Button>
                    <Menu shadow="md" width={220} position="bottom-end">
                        <Menu.Target>
                            <Button
                                variant="subtle"
                                color="greenman"
                                rightSection={<IconChevronDown size={14} stroke={2} />}
                            >
                                {t(`catalog.sort.${filters.sort}`)}
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>{t('catalog.sort.label')}</Menu.Label>
                            {SORT_KEYS.map((k) => (
                                <Menu.Item
                                    key={k}
                                    onClick={() => handleSort(k)}
                                    className={
                                        filters.sort === k ? s.sortActive : ''
                                    }
                                >
                                    {t(`catalog.sort.${k}`)}
                                </Menu.Item>
                            ))}
                        </Menu.Dropdown>
                    </Menu>
                </div>
            </header>

            {activeChips.length > 0 && (
                <div className={s.chipRow}>
                    <span className={s.chipLabel}>
                        {t('catalog.active_filters')}:
                    </span>
                    {activeChips.map((c) => (
                        <button
                            key={c.key}
                            type="button"
                            className={s.chip}
                            onClick={c.onRemove}
                        >
                            <span>{c.label}</span>
                            <IconX size={14} stroke={2.2} />
                        </button>
                    ))}
                    <button
                        type="button"
                        className={s.chipReset}
                        onClick={reset}
                    >
                        {t('catalog.reset_filters')}
                    </button>
                </div>
            )}

            <div className={s.layout}>
                <aside className={s.sidebar}>
                    <CatalogFilters
                        filters={filters}
                        setFilters={setFilters}
                        onReset={reset}
                        facets={facets}
                        isActive={isActive}
                    />
                </aside>

                <section className={s.main}>
                    {loading ? (
                        <div className={s.grid}>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} h={340} radius="xl" />
                            ))}
                        </div>
                    ) : error ? (
                        <ErrorState
                            title={t('common.error')}
                            description={t('catalog.toast.load_error')}
                            retryLabel={t('common.retry')}
                            onRetry={() =>
                                fetchProducts({ pageNum: 1, append: false })
                            }
                        />
                    ) : items.length === 0 ? (
                        <EmptyState
                            title={t('catalog.empty_title')}
                            description={t('catalog.empty_text')}
                            actions={
                                isActive ? (
                                    <Button
                                        color="greenman"
                                        leftSection={
                                            <IconRefresh size={16} stroke={1.8} />
                                        }
                                        onClick={reset}
                                    >
                                        {t('catalog.reset_filters')}
                                    </Button>
                                ) : null
                            }
                        />
                    ) : (
                        <>
                            <div className={s.grid}>
                                {items.map((product) => (
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
                            {hasMore && (
                                <div className={s.loadMore}>
                                    <Button
                                        variant="outline"
                                        color="greenman"
                                        size="md"
                                        loading={loadingMore}
                                        onClick={handleLoadMore}
                                    >
                                        {t('catalog.load_more')}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>

            <Drawer
                opened={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                position="bottom"
                size="90%"
                padding="md"
                radius="xl"
                title={t('catalog.show_filters')}
                classNames={{ body: s.filterDrawerBody }}
            >
                <CatalogFilters
                    filters={filters}
                    setFilters={setFilters}
                    onReset={reset}
                    facets={facets}
                    isActive={isActive}
                    onClose={() => setFiltersOpen(false)}
                />
            </Drawer>

            <AddTypeDrawer
                product={typeDrawer}
                onClose={handleCloseTypeDrawer}
            />
        </PageContainer>
    );
};

export default Catalog;
