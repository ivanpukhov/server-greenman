import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import {
    SegmentedControl,
    Skeleton,
    Tabs,
} from '@mantine/core';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../config/api';
import { useCart } from '../../CartContext.jsx';
import { useCountry } from '../../contexts/CountryContext';
import { useRecentlyViewed } from '../../contexts/RecentlyViewedContext.jsx';
import { useWishlist } from '../../contexts/WishlistContext.jsx';
import { CURRENCIES, toDisplayPrice } from '../../config/currency';
import ScrollToTop from '../ScrollToTop';
import {
    Breadcrumbs,
    Button,
    EmptyState,
    ErrorState,
    PageContainer,
    PlaceholderImage,
    PricePill,
    ProductCard,
    toast,
} from '../../ui';
import {
    IconAlertCircle,
    IconHeart,
    IconHeartFilled,
    IconInfoCircle,
    IconLeaf,
    IconMinus,
    IconMoodKid,
    IconPlus,
    IconShare,
    IconShieldCheck,
    IconShoppingBag,
    IconUser,
} from '../../icons';
import s from './ProductDetails.module.scss';

const GALLERY_VARIANTS = [
    { glyph: 'leaf', tone: 'light' },
    { glyph: 'drop', tone: 'mid' },
    { glyph: 'sun', tone: 'deep' },
];

const ProductDetails = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const { country } = useCountry();
    const recentlyViewed = useRecentlyViewed();
    const wishlist = useWishlist();
    const currencyCode = CURRENCIES[country]?.code || 'KZT';

    const [product, setProduct] = useState(null);
    const [related, setRelated] = useState([]);
    const [recentItems, setRecentItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [variantIndex, setVariantIndex] = useState(0);
    const [thumbIndex, setThumbIndex] = useState(0);
    const wished = product ? wishlist.has(product.id) : false;
    const [activeTab, setActiveTab] = useState('description');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        axios
            .get(apiUrl(`/products/${id}`))
            .then((res) => {
                if (cancelled) return;
                setProduct(res.data);
                setVariantIndex(0);
                setThumbIndex(0);
                setActiveTab('description');
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    useEffect(() => {
        if (product?.id != null) recentlyViewed.add(product.id);
    }, [product?.id, recentlyViewed]);

    const diseases = product?.diseases || [];
    const primaryDisease = diseases[0];

    useEffect(() => {
        if (!product) {
            setRelated([]);
            return;
        }
        let cancelled = false;
        const qp = new URLSearchParams();
        qp.set('limit', '12');
        if (primaryDisease) qp.set('diseases', primaryDisease);
        axios
            .get(`${apiUrl('/products')}?${qp.toString()}`)
            .then((res) => {
                if (cancelled) return;
                const items = Array.isArray(res.data?.items)
                    ? res.data.items
                    : Array.isArray(res.data)
                      ? res.data
                      : [];
                setRelated(items.filter((p) => p.id !== product.id).slice(0, 8));
            })
            .catch(() => {
                if (!cancelled) setRelated([]);
            });
        return () => {
            cancelled = true;
        };
    }, [product, primaryDisease]);

    useEffect(() => {
        const otherIds = recentlyViewed.ids.filter(
            (rid) => rid !== Number(id) && rid !== id,
        );
        if (otherIds.length === 0) {
            setRecentItems([]);
            return;
        }
        let cancelled = false;
        Promise.all(
            otherIds.slice(0, 8).map((rid) =>
                axios
                    .get(apiUrl(`/products/${rid}`))
                    .then((res) => res.data)
                    .catch(() => null),
            ),
        ).then((results) => {
            if (cancelled) return;
            setRecentItems(results.filter(Boolean));
        });
        return () => {
            cancelled = true;
        };
    }, [id, recentlyViewed.ids]);

    const types = useMemo(
        () => (Array.isArray(product?.types) ? product.types : []),
        [product],
    );
    const currentType = types[variantIndex] || types[0] || null;
    const hasMultipleTypes = types.length > 1;
    const minKztPrice = useMemo(
        () => (types.length ? Math.min(...types.map((tp) => tp.price)) : 0),
        [types],
    );
    const displayPrice = currentType
        ? toDisplayPrice(currentType.price, country)
        : 0;
    const displayMin = toDisplayPrice(minKztPrice, country);
    const inCart = cart.find((item) => item.id === product?.id);

    const handleAdd = () => {
        if (!product || !currentType) return;
        addToCart({ ...product, type: currentType, quantity: 1 });
        toast.success(t('catalog.toast.added', { name: product.name }), {
            action: { label: t('catalog.toast.to_cart'), to: '/cart' },
        });
    };

    const handleIncrement = () => {
        if (!inCart) return;
        updateQuantity(product.id, inCart.quantity + 1);
    };
    const handleDecrement = () => {
        if (!inCart) return;
        if (inCart.quantity > 1) updateQuantity(product.id, inCart.quantity - 1);
        else removeFromCart(product.id);
    };

    const handleShare = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: product?.name, url });
            } else {
                await navigator.clipboard.writeText(url);
                toast.success(t('product.share_copied'));
            }
        } catch {}
    };

    const handleAddRelated = (p) => {
        if (!p.types || p.types.length === 0) return;
        if (p.types.length > 1) {
            window.location.assign(`/product/${p.id}`);
            return;
        }
        addToCart({ ...p, type: p.types[0], quantity: 1 });
        toast.success(t('catalog.toast.added', { name: p.name }), {
            action: { label: t('catalog.toast.to_cart'), to: '/cart' },
        });
    };
    const handleIncrementRelated = (p) => {
        const line = cart.find((c) => c.id === p.id);
        if (line) updateQuantity(p.id, line.quantity + 1);
    };
    const handleDecrementRelated = (p) => {
        const line = cart.find((c) => c.id === p.id);
        if (!line) return;
        if (line.quantity > 1) updateQuantity(p.id, line.quantity - 1);
        else removeFromCart(p.id);
    };

    const cartById = useMemo(() => {
        const m = new Map();
        cart.forEach((c) => m.set(c.id, c));
        return m;
    }, [cart]);

    if (loading) {
        return (
            <PageContainer size="xl" className={s.page}>
                <ScrollToTop />
                <Skeleton h={18} w={280} mb="lg" radius="sm" />
                <div className={s.layout}>
                    <Skeleton h={480} radius="xl" />
                    <div className={s.skeletonRight}>
                        <Skeleton h={36} w="80%" radius="sm" />
                        <Skeleton h={18} w="60%" radius="sm" mt={12} />
                        <Skeleton h={56} w="50%" radius="sm" mt={24} />
                        <Skeleton h={44} radius="xl" mt={24} />
                        <Skeleton h={56} radius="xl" mt={16} />
                    </div>
                </div>
            </PageContainer>
        );
    }

    if (error || !product) {
        return (
            <PageContainer size="xl" className={s.page}>
                <ScrollToTop />
                {error ? (
                    <ErrorState
                        title={t('common.error')}
                        description={t('product.error')}
                        retryLabel={t('common.retry')}
                        onRetry={() => window.location.reload()}
                    />
                ) : (
                    <EmptyState
                        title={t('product.not_found')}
                        actions={
                            <Button component={Link} to="/catalog" color="greenman">
                                {t('common.catalog')}
                            </Button>
                        }
                    />
                )}
            </PageContainer>
        );
    }

    return (
        <PageContainer size="xl" className={s.page}>
            <Helmet>
                <title>{`${product.name} — GreenMan`}</title>
                <meta
                    name="description"
                    content={(product.description || '').slice(0, 160)}
                />
                <meta property="og:title" content={`${product.name} — GreenMan`} />
                <meta property="og:type" content="product" />
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org/',
                        '@type': 'Product',
                        name: product.name,
                        description: (product.description || '').slice(0, 300),
                        brand: { '@type': 'Brand', name: 'GreenMan' },
                        offers: (product.types || []).map((tp) => ({
                            '@type': 'Offer',
                            price: tp.price,
                            priceCurrency: currencyCode,
                            availability: 'https://schema.org/InStock',
                            name: tp.name,
                        })),
                    })}
                </script>
            </Helmet>
            <ScrollToTop />

            <Breadcrumbs
                items={[
                    { label: t('common.home'), to: '/' },
                    { label: t('catalog.title'), to: '/catalog' },
                    { label: product.name },
                ]}
            />

            <div className={s.layout}>
                <div className={s.gallerySide}>
                    <div className={s.galleryMain}>
                        <PlaceholderImage
                            name={`${product.name}-${thumbIndex}`}
                            size="lg"
                            rounded="xl"
                            aspect="1/1"
                            className={s.galleryImage}
                        />
                        <button
                            type="button"
                            className={`${s.floatingBtn} ${s.floatingHeart} ${wished ? s.floatingActive : ''}`}
                            onClick={() => wishlist.toggle(product.id)}
                            aria-label={t('product.save')}
                        >
                            {wished ? (
                                <IconHeartFilled size={18} stroke={1.8} />
                            ) : (
                                <IconHeart size={18} stroke={1.8} />
                            )}
                        </button>
                        <button
                            type="button"
                            className={`${s.floatingBtn} ${s.floatingShare}`}
                            onClick={handleShare}
                            aria-label={t('product.share')}
                        >
                            <IconShare size={18} stroke={1.8} />
                        </button>
                    </div>
                    <div className={s.thumbStrip}>
                        {GALLERY_VARIANTS.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className={`${s.thumb} ${idx === thumbIndex ? s.thumbActive : ''}`}
                                onClick={() => setThumbIndex(idx)}
                                aria-label={`${product.name} — ${idx + 1}`}
                            >
                                <PlaceholderImage
                                    name={`${product.name}-${idx}`}
                                    size="sm"
                                    rounded="md"
                                    aspect="1/1"
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div className={s.infoSide}>
                    {diseases.length > 0 && (
                        <div className={s.tagRow}>
                            {diseases.slice(0, 4).map((d) => (
                                <span key={d} className={s.tag}>
                                    {d}
                                </span>
                            ))}
                        </div>
                    )}

                    <h1 className={s.title}>{product.name}</h1>

                    {product.description && (
                        <p className={s.lead}>
                            {product.description.split('\n')[0]}
                        </p>
                    )}

                    <div className={s.priceBlock}>
                        <PricePill
                            value={currentType ? displayPrice : displayMin}
                            currency={currencyCode}
                            from={!currentType && hasMultipleTypes}
                            size="xl"
                        />
                    </div>

                    {hasMultipleTypes && (
                        <div className={s.variantGroup}>
                            <div className={s.variantLabel}>
                                {t('product.variant_label')}
                            </div>
                            <SegmentedControl
                                fullWidth
                                radius="xl"
                                color="greenman"
                                size="md"
                                value={String(variantIndex)}
                                onChange={(v) => setVariantIndex(Number(v))}
                                data={types.map((tp, idx) => ({
                                    label: tp.type,
                                    value: String(idx),
                                }))}
                            />
                        </div>
                    )}

                    <div className={s.ctaRow}>
                        {inCart ? (
                            <div className={s.stepper}>
                                <button
                                    type="button"
                                    className={s.stepBtn}
                                    onClick={handleDecrement}
                                    aria-label="-"
                                >
                                    <IconMinus size={18} stroke={2} />
                                </button>
                                <span className={s.stepCount}>
                                    {inCart.quantity}
                                </span>
                                <button
                                    type="button"
                                    className={s.stepBtn}
                                    onClick={handleIncrement}
                                    aria-label="+"
                                >
                                    <IconPlus size={18} stroke={2} />
                                </button>
                            </div>
                        ) : (
                            <Button
                                size="lg"
                                color="greenman"
                                radius="xl"
                                fullWidth
                                leftSection={<IconShoppingBag size={18} stroke={1.8} />}
                                onClick={handleAdd}
                            >
                                {t('product.add_to_cart')}
                            </Button>
                        )}

                        {inCart && (
                            <Button
                                component={Link}
                                to="/cart"
                                size="lg"
                                variant="light"
                                color="greenman"
                                radius="xl"
                                fullWidth
                            >
                                {t('product.go_to_cart')}
                            </Button>
                        )}
                    </div>

                    <div className={s.benefits}>
                        <div className={s.benefit}>
                            <IconLeaf size={18} stroke={1.6} />
                            <span>{t('main.trust.natural.title')}</span>
                        </div>
                        <div className={s.benefit}>
                            <IconShieldCheck size={18} stroke={1.6} />
                            <span>{t('main.trust.quality.title')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs
                value={activeTab}
                onChange={setActiveTab}
                color="greenman"
                radius="md"
                className={s.tabs}
            >
                <Tabs.List>
                    {product.description && (
                        <Tabs.Tab
                            value="description"
                            leftSection={<IconInfoCircle size={16} stroke={1.7} />}
                        >
                            {t('product.tabs.description')}
                        </Tabs.Tab>
                    )}
                    {(product.applicationMethodAdults ||
                        product.applicationMethodChildren) && (
                        <Tabs.Tab
                            value="usage"
                            leftSection={<IconShieldCheck size={16} stroke={1.7} />}
                        >
                            {t('product.tabs.usage')}
                        </Tabs.Tab>
                    )}
                    {product.contraindications && (
                        <Tabs.Tab
                            value="contraindications"
                            leftSection={<IconAlertCircle size={16} stroke={1.7} />}
                        >
                            {t('product.tabs.contraindications')}
                        </Tabs.Tab>
                    )}
                </Tabs.List>

                {product.description && (
                    <Tabs.Panel value="description">
                        <div className={s.panel}>
                            <p className={s.panelText}>{product.description}</p>
                        </div>
                    </Tabs.Panel>
                )}

                {(product.applicationMethodAdults ||
                    product.applicationMethodChildren) && (
                    <Tabs.Panel value="usage">
                        <div className={s.panel}>
                            <div className={s.usageGrid}>
                                {product.applicationMethodAdults && (
                                    <div className={s.usageCard}>
                                        <div className={s.usageHead}>
                                            <IconUser size={18} stroke={1.7} />
                                            <span>{t('product.usage_adults')}</span>
                                        </div>
                                        <p className={s.usageText}>
                                            {product.applicationMethodAdults}
                                        </p>
                                    </div>
                                )}
                                {product.applicationMethodChildren && (
                                    <div className={s.usageCard}>
                                        <div className={s.usageHead}>
                                            <IconMoodKid size={18} stroke={1.7} />
                                            <span>{t('product.usage_children')}</span>
                                        </div>
                                        <p className={s.usageText}>
                                            {product.applicationMethodChildren}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Tabs.Panel>
                )}

                {product.contraindications && (
                    <Tabs.Panel value="contraindications">
                        <div className={`${s.panel} ${s.panelWarn}`}>
                            <div className={s.warnHead}>
                                <IconAlertCircle size={18} stroke={1.7} />
                                <span>{t('product.contraindications')}</span>
                            </div>
                            <p className={s.panelText}>
                                {product.contraindications}
                            </p>
                        </div>
                    </Tabs.Panel>
                )}
            </Tabs>

            {related.length > 0 && (
                <section className={s.rail}>
                    <h2 className={s.railTitle}>{t('product.related')}</h2>
                    <div className={s.railGrid}>
                        {related.map((p) => (
                            <ProductCard
                                key={p.id}
                                product={p}
                                inCart={cartById.get(p.id)}
                                onAdd={handleAddRelated}
                                onIncrement={handleIncrementRelated}
                                onDecrement={handleDecrementRelated}
                                wished={wishlist.has(p.id)}
                                onToggleWish={(pp) => wishlist.toggle(pp.id)}
                                variant="compact"
                            />
                        ))}
                    </div>
                </section>
            )}

            {recentItems.length > 0 && (
                <section className={s.rail}>
                    <h2 className={s.railTitle}>{t('product.recently_viewed')}</h2>
                    <div className={s.railGrid}>
                        {recentItems.map((p) => (
                            <ProductCard
                                key={p.id}
                                product={p}
                                inCart={cartById.get(p.id)}
                                onAdd={handleAddRelated}
                                onIncrement={handleIncrementRelated}
                                onDecrement={handleDecrementRelated}
                                wished={wishlist.has(p.id)}
                                onToggleWish={(pp) => wishlist.toggle(pp.id)}
                                variant="compact"
                            />
                        ))}
                    </div>
                </section>
            )}

            <div className={s.stickyCta}>
                <PricePill
                    value={currentType ? displayPrice : displayMin}
                    currency={currencyCode}
                    from={!currentType && hasMultipleTypes}
                    size="md"
                />
                {inCart ? (
                    <div className={s.stepperMini}>
                        <button
                            type="button"
                            className={s.stepBtn}
                            onClick={handleDecrement}
                            aria-label="-"
                        >
                            <IconMinus size={16} stroke={2} />
                        </button>
                        <span className={s.stepCount}>{inCart.quantity}</span>
                        <button
                            type="button"
                            className={s.stepBtn}
                            onClick={handleIncrement}
                            aria-label="+"
                        >
                            <IconPlus size={16} stroke={2} />
                        </button>
                    </div>
                ) : (
                    <Button
                        color="greenman"
                        radius="xl"
                        size="md"
                        leftSection={<IconShoppingBag size={16} stroke={1.8} />}
                        onClick={handleAdd}
                    >
                        {t('product.add_to_cart')}
                    </Button>
                )}
            </div>
        </PageContainer>
    );
};

export default ProductDetails;
