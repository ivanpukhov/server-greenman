import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Chip, Skeleton } from '@mantine/core';
import { apiUrl } from '../../config/api';
import { hasValidSiteSession, useAuth } from '../../AuthContext.jsx';
import { useCart } from '../../CartContext.jsx';
import { useCountry } from '../../contexts/CountryContext.jsx';
import { useWishlist } from '../../contexts/WishlistContext.jsx';
import ScrollToTop from '../ScrollToTop';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher.jsx';
import emptyOrders from '../../images/illustrations/empty-orders.svg';
import {
    Breadcrumbs,
    Button,
    EmptyState,
    PageContainer,
    ProductCard,
    toast,
} from '../../ui';
import {
    IconArrowRight,
    IconHeart,
    IconHome,
    IconLogout,
    IconPackage,
    IconRefresh,
    IconSettings,
    IconShoppingBag,
    IconTruck,
    IconUser,
    IconWorld,
} from '../../icons';
import s from './Profile.module.scss';

const STATUS_KEYS = [
    'all',
    'в обработке',
    'Оплачено',
    'Отправлено',
    'Доставлено',
    'Отменено',
];

const STATUS_SORT_PRIORITY = {
    'в обработке': 0,
    оплачено: 1,
    отправлено: 2,
    доставлено: 3,
    отменено: 4,
};

const STATUS_TIMELINE = ['в обработке', 'оплачено', 'отправлено', 'доставлено'];

const STATUS_I18N = {
    all: 'profile.status.all',
    'в обработке': 'profile.status.processing',
    оплачено: 'profile.status.paid',
    отправлено: 'profile.status.shipped',
    доставлено: 'profile.status.delivered',
    отменено: 'profile.status.cancelled',
};

const STATUS_TONE = {
    'в обработке': 'warn',
    оплачено: 'info',
    отправлено: 'brand',
    доставлено: 'brand',
    отменено: 'danger',
};

const normalizeStatus = (s) => String(s || '').trim().toLowerCase();

const prettyPhone = (p) => {
    const m = (p || '').match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
    return m ? `+7 (${m[1]}) ${m[2]}-${m[3]}-${m[4]}` : `+7${p || ''}`;
};

const formatTotal = (total, currency) =>
    new Intl.NumberFormat(currency === 'RUB' ? 'ru-RU' : 'ru-KZ', {
        maximumFractionDigits: 0,
    }).format(total);

const TABS = [
    { id: 'overview', icon: IconHome, labelKey: 'profile.tabs.overview' },
    { id: 'orders', icon: IconPackage, labelKey: 'profile.orders_title' },
    { id: 'wishlist', icon: IconHeart, labelKey: 'wishlist.title' },
    { id: 'settings', icon: IconSettings, labelKey: 'profile.tabs.settings' },
];

const OrderTimeline = ({ status, cancelled }) => {
    const activeIndex = STATUS_TIMELINE.indexOf(status);
    return (
        <div
            className={`${s.timeline} ${cancelled ? s.timelineCancelled : ''}`}
        >
            {STATUS_TIMELINE.map((step, i) => {
                const isActive = !cancelled && i <= activeIndex;
                const isCurrent = !cancelled && i === activeIndex;
                return (
                    <div
                        key={step}
                        className={`${s.timelineStep} ${isActive ? s.timelineStepActive : ''} ${isCurrent ? s.timelineStepCurrent : ''}`}
                    >
                        <span className={s.timelineDot} />
                        <span className={s.timelineLabel}>
                            {
                                {
                                    'в обработке': 'Принят',
                                    оплачено: 'Оплачен',
                                    отправлено: 'Отправлен',
                                    доставлено: 'Доставлен',
                                }[step]
                            }
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

const Profile = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const { country, setCountry } = useCountry();
    const wishlist = useWishlist();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeTab = TABS.find((x) => x.id === searchParams.get('tab'))?.id
        || 'overview';
    const setActiveTab = (id) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', id);
        setSearchParams(next, { replace: true });
    };

    const [profileData, setProfileData] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [reordering, setReordering] = useState(null);

    useEffect(() => {
        if (!hasValidSiteSession()) navigate('/auth');
    }, [navigate]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        axios
            .get(apiUrl('/profile/'), {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((r) => setProfileData(r.data))
            .catch((err) => {
                if (err.response?.status === 401) {
                    logout();
                    navigate('/auth');
                }
            });
    }, [logout, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    const orders = profileData?.orders || [];

    const availableStatuses = useMemo(
        () =>
            STATUS_KEYS.filter(
                (value) =>
                    value === 'all' ||
                    orders.some(
                        (o) => normalizeStatus(o.status) === normalizeStatus(value),
                    ),
            ),
        [orders],
    );

    const filteredOrders = useMemo(
        () =>
            [...orders]
                .filter(
                    (o) =>
                        selectedStatus === 'all' ||
                        normalizeStatus(o.status) === normalizeStatus(selectedStatus),
                )
                .sort((a, b) => {
                    const pa =
                        STATUS_SORT_PRIORITY[normalizeStatus(a.status)] ?? 99;
                    const pb =
                        STATUS_SORT_PRIORITY[normalizeStatus(b.status)] ?? 99;
                    return pa !== pb ? pa - pb : b.id - a.id;
                }),
        [orders, selectedStatus],
    );

    const activeOrder = useMemo(() => {
        const active = orders.find(
            (o) =>
                ['в обработке', 'оплачено', 'отправлено'].includes(
                    normalizeStatus(o.status),
                ),
        );
        return active || orders[0] || null;
    }, [orders]);

    const statsDelivered = orders.filter(
        (o) => normalizeStatus(o.status) === 'доставлено',
    ).length;

    const handleReorder = async (order) => {
        setReordering(order.id);
        try {
            const uniqueProductIds = [
                ...new Set(order.products.map((p) => p.productId)),
            ];
            const products = await Promise.all(
                uniqueProductIds.map((pid) =>
                    axios
                        .get(apiUrl(`/products/${pid}`))
                        .then((r) => r.data)
                        .catch(() => null),
                ),
            );
            const byId = new Map(
                products.filter(Boolean).map((p) => [p.id, p]),
            );
            let added = 0;
            order.products.forEach((line) => {
                const prod = byId.get(line.productId);
                if (!prod) return;
                const type =
                    prod.types?.find((tp) => tp.id === line.typeId) ||
                    prod.types?.[0];
                if (!type) return;
                addToCart({ ...prod, type, quantity: line.quantity });
                added += 1;
            });
            if (added > 0) {
                toast.success(t('profile.reorder.success'), {
                    action: {
                        label: t('catalog.toast.to_cart'),
                        to: '/cart',
                    },
                });
            } else {
                toast.error(t('profile.reorder.none'));
            }
        } catch {
            toast.error(t('profile.reorder.error'));
        } finally {
            setReordering(null);
        }
    };

    if (!profileData) {
        return (
            <PageContainer size="xl" className={s.page}>
                <ScrollToTop />
                <Skeleton h={80} radius="xl" />
                <div className={s.layout}>
                    <Skeleton h={280} radius="xl" mt="xl" />
                </div>
            </PageContainer>
        );
    }

    const initials = (profileData.phoneNumber || '?').slice(-2);

    return (
        <PageContainer size="xl" className={s.page}>
            <ScrollToTop />
            <Helmet>
                <title>{t('profile.title')} — GreenMan</title>
            </Helmet>
            <Breadcrumbs
                items={[
                    { label: t('common.home'), to: '/' },
                    { label: t('profile.title') },
                ]}
            />

            <header className={s.hero}>
                <div className={s.heroLeft}>
                    <div className={s.avatar}>{initials}</div>
                    <div>
                        <div className={s.heroName}>{t('profile.title')}</div>
                        <div className={s.heroPhone}>
                            {prettyPhone(profileData.phoneNumber)}
                        </div>
                    </div>
                </div>
                <Button
                    variant="subtle"
                    color="red"
                    radius="xl"
                    size="sm"
                    leftSection={<IconLogout size={16} stroke={1.7} />}
                    onClick={handleLogout}
                    className={s.logoutBtn}
                >
                    {t('profile.logout')}
                </Button>
            </header>

            <div className={s.layout}>
                <nav className={s.sidenav} aria-label="profile navigation">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                className={`${s.navItem} ${isActive ? s.navItemActive : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon size={18} stroke={1.7} />
                                <span>{t(tab.labelKey)}</span>
                            </button>
                        );
                    })}
                </nav>

                <section className={s.content}>
                    {activeTab === 'overview' && (
                        <div className={s.panel}>
                            <div className={s.statsGrid}>
                                <div className={s.statCard}>
                                    <span className={s.statLabel}>
                                        {t('profile.stats.orders')}
                                    </span>
                                    <span className={s.statValue}>{orders.length}</span>
                                </div>
                                <div className={s.statCard}>
                                    <span className={s.statLabel}>
                                        {t('profile.stats.delivered')}
                                    </span>
                                    <span className={s.statValue}>
                                        {statsDelivered}
                                    </span>
                                </div>
                            </div>

                            {activeOrder ? (
                                <div className={s.activeCard}>
                                    <div className={s.activeHead}>
                                        <div>
                                            <div className={s.activeLabel}>
                                                {t('profile.overview.active')}
                                            </div>
                                            <div className={s.activeNumber}>
                                                {t('profile.order.number', {
                                                    number: activeOrder.id,
                                                })}
                                            </div>
                                        </div>
                                        <span
                                            className={`${s.badge} ${s[`badge-${STATUS_TONE[normalizeStatus(activeOrder.status)] || 'info'}`]}`}
                                        >
                                            {t(
                                                STATUS_I18N[
                                                    normalizeStatus(activeOrder.status)
                                                ] || STATUS_I18N.all,
                                            )}
                                        </span>
                                    </div>
                                    <OrderTimeline
                                        status={normalizeStatus(activeOrder.status)}
                                        cancelled={
                                            normalizeStatus(activeOrder.status) ===
                                            'отменено'
                                        }
                                    />
                                    <Button
                                        onClick={() => setActiveTab('orders')}
                                        color="greenman"
                                        variant="light"
                                        radius="xl"
                                        size="sm"
                                        rightSection={
                                            <IconArrowRight size={16} stroke={1.7} />
                                        }
                                    >
                                        {t('profile.overview.see_orders')}
                                    </Button>
                                </div>
                            ) : (
                                <EmptyState
                                    illustration={
                                        <img
                                            src={emptyOrders}
                                            alt=""
                                            style={{ width: 200 }}
                                        />
                                    }
                                    title={t('profile.empty_title')}
                                    description={t('profile.empty_text')}
                                    actions={
                                        <Button
                                            component={Link}
                                            to="/catalog"
                                            color="greenman"
                                            radius="xl"
                                            leftSection={
                                                <IconShoppingBag
                                                    size={16}
                                                    stroke={1.8}
                                                />
                                            }
                                        >
                                            {t('common.catalog')}
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className={s.panel}>
                            {orders.length === 0 ? (
                                <EmptyState
                                    illustration={
                                        <img
                                            src={emptyOrders}
                                            alt=""
                                            style={{ width: 220 }}
                                        />
                                    }
                                    title={t('profile.empty_title')}
                                    description={t('profile.empty_text')}
                                    actions={
                                        <Button
                                            component={Link}
                                            to="/catalog"
                                            color="greenman"
                                            radius="xl"
                                        >
                                            {t('common.catalog')}
                                        </Button>
                                    }
                                />
                            ) : (
                                <>
                                    {availableStatuses.length > 1 && (
                                        <div className={s.chipRow}>
                                            {availableStatuses.map((value) => (
                                                <Chip
                                                    key={value}
                                                    checked={selectedStatus === value}
                                                    onChange={() =>
                                                        setSelectedStatus(value)
                                                    }
                                                    color="greenman"
                                                    radius="xl"
                                                    variant="light"
                                                    size="sm"
                                                >
                                                    {t(
                                                        STATUS_I18N[
                                                            normalizeStatus(value)
                                                        ] || STATUS_I18N.all,
                                                    )}
                                                </Chip>
                                            ))}
                                        </div>
                                    )}

                                    {filteredOrders.length === 0 ? (
                                        <EmptyState
                                            title={t('profile.empty_status')}
                                            size="sm"
                                        />
                                    ) : (
                                        <div className={s.orderList}>
                                            {filteredOrders.map((order) => {
                                                const status = normalizeStatus(
                                                    order.status,
                                                );
                                                const cancelled =
                                                    status === 'отменено';
                                                const currencySymbol =
                                                    order.currency === 'RUB'
                                                        ? '₽'
                                                        : '₸';
                                                return (
                                                    <article
                                                        key={order.id}
                                                        className={s.orderCard}
                                                    >
                                                        <div className={s.orderHead}>
                                                            <div className={s.orderHeadLeft}>
                                                                <div className={s.orderNumber}>
                                                                    {t(
                                                                        'profile.order.number',
                                                                        { number: order.id },
                                                                    )}
                                                                </div>
                                                                <div
                                                                    className={
                                                                        s.orderTracking
                                                                    }
                                                                >
                                                                    {order.trackingNumber ||
                                                                        t(
                                                                            'profile.order.processing',
                                                                        )}
                                                                </div>
                                                            </div>
                                                            <span
                                                                className={`${s.badge} ${s[`badge-${STATUS_TONE[status] || 'info'}`]}`}
                                                            >
                                                                {t(
                                                                    STATUS_I18N[status] ||
                                                                        STATUS_I18N.all,
                                                                )}
                                                            </span>
                                                        </div>

                                                        <OrderTimeline
                                                            status={status}
                                                            cancelled={cancelled}
                                                        />

                                                        <ul className={s.orderItems}>
                                                            {order.products.map((p) => (
                                                                <li
                                                                    key={`${order.id}-${p.productId}-${p.typeId}`}
                                                                >
                                                                    <Link
                                                                        to={`/product/${p.productId}`}
                                                                        className={s.orderItemLink}
                                                                    >
                                                                        <span className={s.orderItemName}>
                                                                            {p.product}
                                                                        </span>
                                                                        <span className={s.orderItemType}>
                                                                            · {p.type}
                                                                        </span>
                                                                    </Link>
                                                                    <span className={s.orderItemQty}>
                                                                        ×{p.quantity}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>

                                                        <div className={s.orderFoot}>
                                                            <div className={s.orderTotal}>
                                                                <span>
                                                                    {t(
                                                                        'profile.order.total',
                                                                    )}
                                                                </span>
                                                                <strong>
                                                                    {formatTotal(
                                                                        order.totalPrice,
                                                                        order.currency,
                                                                    )}{' '}
                                                                    {currencySymbol}
                                                                </strong>
                                                            </div>
                                                            <div className={s.orderActions}>
                                                                {order.trackingNumber && (
                                                                    <Button
                                                                        component="a"
                                                                        href={`https://track.greenman.kz/${order.trackingNumber}`}
                                                                        target="_blank"
                                                                        rel="noopener"
                                                                        variant="light"
                                                                        color="greenman"
                                                                        radius="xl"
                                                                        size="xs"
                                                                        leftSection={
                                                                            <IconTruck
                                                                                size={14}
                                                                                stroke={1.7}
                                                                            />
                                                                        }
                                                                    >
                                                                        {t(
                                                                            'profile.order.track',
                                                                        )}
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    onClick={() =>
                                                                        handleReorder(order)
                                                                    }
                                                                    variant="subtle"
                                                                    color="greenman"
                                                                    radius="xl"
                                                                    size="xs"
                                                                    loading={
                                                                        reordering ===
                                                                        order.id
                                                                    }
                                                                    leftSection={
                                                                        <IconRefresh
                                                                            size={14}
                                                                            stroke={1.7}
                                                                        />
                                                                    }
                                                                >
                                                                    {t('profile.order.reorder')}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'wishlist' && (
                        <div className={s.panel}>
                            {wishlist.items.length === 0 ? (
                                <EmptyState
                                    illustration={
                                        <img
                                            src={emptyOrders}
                                            alt=""
                                            style={{ width: 200 }}
                                        />
                                    }
                                    title={t('wishlist.empty_title')}
                                    description={t('wishlist.empty_text')}
                                    actions={
                                        <Button
                                            component={Link}
                                            to="/catalog"
                                            color="greenman"
                                            radius="xl"
                                        >
                                            {t('common.catalog')}
                                        </Button>
                                    }
                                />
                            ) : (
                                <div className={s.wishGrid}>
                                    {wishlist.items.map(({ product }) => {
                                        const cartEntry = cart.find(
                                            (c) => c.id === product.id,
                                        );
                                        return (
                                            <ProductCard
                                                key={product.id}
                                                product={product}
                                                inCart={cartEntry}
                                                wished
                                                onToggleWish={(p) =>
                                                    wishlist.remove(p.id)
                                                }
                                                onAdd={(p) => {
                                                    const type = p.types?.[0];
                                                    if (!type) return;
                                                    addToCart({
                                                        ...p,
                                                        type,
                                                        quantity: 1,
                                                    });
                                                }}
                                                onIncrement={(p) => {
                                                    const entry = cart.find(
                                                        (c) => c.id === p.id,
                                                    );
                                                    if (entry)
                                                        updateQuantity(
                                                            entry.id,
                                                            entry.quantity + 1,
                                                        );
                                                }}
                                                onDecrement={(p) => {
                                                    const entry = cart.find(
                                                        (c) => c.id === p.id,
                                                    );
                                                    if (!entry) return;
                                                    if (entry.quantity <= 1)
                                                        removeFromCart(entry.id);
                                                    else
                                                        updateQuantity(
                                                            entry.id,
                                                            entry.quantity - 1,
                                                        );
                                                }}
                                                variant="compact"
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className={s.panel}>
                            <div className={s.settingBlock}>
                                <div className={s.settingHead}>
                                    <IconUser size={18} stroke={1.7} />
                                    <span>{t('profile.settings.account')}</span>
                                </div>
                                <div className={s.settingRow}>
                                    <span className={s.settingLabel}>
                                        {t('cart.delivery.whatsapp')}
                                    </span>
                                    <span className={s.settingValue}>
                                        {prettyPhone(profileData.phoneNumber)}
                                    </span>
                                </div>
                            </div>

                            <div className={s.settingBlock}>
                                <div className={s.settingHead}>
                                    <IconWorld size={18} stroke={1.7} />
                                    <span>{t('profile.settings.region')}</span>
                                </div>
                                <div className={s.settingRow}>
                                    <span className={s.settingLabel}>
                                        {t('country.label')}
                                    </span>
                                    <div className={s.countryToggle}>
                                        <button
                                            type="button"
                                            className={`${s.countryBtn} ${country === 'KZ' ? s.countryBtnActive : ''}`}
                                            onClick={() => setCountry('KZ')}
                                        >
                                            {t('country.kz')}
                                        </button>
                                        <button
                                            type="button"
                                            className={`${s.countryBtn} ${country === 'RF' ? s.countryBtnActive : ''}`}
                                            onClick={() => setCountry('RF')}
                                        >
                                            {t('country.rf')}
                                        </button>
                                    </div>
                                </div>
                                <div className={s.settingRow}>
                                    <span className={s.settingLabel}>
                                        {t('language.label')}
                                    </span>
                                    <LanguageSwitcher />
                                </div>
                            </div>

                            <div className={s.settingBlock}>
                                <Button
                                    variant="light"
                                    color="red"
                                    radius="xl"
                                    leftSection={
                                        <IconLogout size={16} stroke={1.7} />
                                    }
                                    onClick={handleLogout}
                                >
                                    {t('profile.logout')}
                                </Button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </PageContainer>
    );
};

export default Profile;
