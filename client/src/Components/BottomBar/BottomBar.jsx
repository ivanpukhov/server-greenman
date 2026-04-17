import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Transition } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import {
    IconHome,
    IconHomeFilled,
    IconCategory,
    IconCategoryFilled,
    IconShoppingBag,
    IconShoppingBagCheck,
    IconUser,
    IconUserFilled,
    IconArrowNarrowRight,
} from '../../icons';
import { useCart } from '../../CartContext.jsx';
import { useFormatPrice } from '../../contexts/CountryContext.jsx';
import s from './BottomBar.module.scss';

const TABS = [
    {
        to: '/',
        end: true,
        labelKey: 'header.nav.home',
        icon: IconHome,
        iconActive: IconHomeFilled,
    },
    {
        to: '/catalog',
        labelKey: 'header.nav.catalog',
        icon: IconCategory,
        iconActive: IconCategoryFilled,
    },
    {
        to: '/cart',
        labelKey: 'header.nav.cart',
        icon: IconShoppingBag,
        iconActive: IconShoppingBagCheck,
        withBadge: true,
    },
    {
        to: '/profile',
        labelKey: 'header.nav.profile',
        icon: IconUser,
        iconActive: IconUserFilled,
    },
];

const BottomBar = () => {
    const { t } = useTranslation();
    const { cart } = useCart();
    const formatPrice = useFormatPrice();
    const location = useLocation();

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce(
        (sum, item) => sum + item.type.price * item.quantity,
        0,
    );

    const isCartPage = location.pathname === '/cart';
    const isAuthPage = location.pathname === '/auth';
    const isProductPage = /\/product\/.*/.test(location.pathname);

    if (isAuthPage) return null;

    const showCartCTA = !isCartPage && !isProductPage && totalItems > 0;

    return (
        <>
            <Transition mounted={showCartCTA} transition="slide-up" duration={180}>
                {(style) => (
                    <Link to="/cart" className={s.cartCta} style={style}>
                        <div className={s.cartCtaText}>
                            <span className={s.cartCtaLabel}>
                                {t('cart.actions.to_checkout')}
                            </span>
                            <span className={s.cartCtaMeta}>
                                {totalItems} {t('common.pieces')} ·{' '}
                                {formatPrice(totalPrice)}
                            </span>
                        </div>
                        <IconArrowNarrowRight size={20} stroke={1.8} />
                    </Link>
                )}
            </Transition>

            <nav className={s.bar} aria-label="Primary">
                {TABS.map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        end={tab.end}
                        className={({ isActive }) =>
                            `${s.tab} ${isActive ? s.tabActive : ''}`
                        }
                    >
                        {({ isActive }) => {
                            const Icon = isActive ? tab.iconActive : tab.icon;
                            const showBadge = tab.withBadge && totalItems > 0;
                            return (
                                <>
                                    <span className={s.iconBox}>
                                        <Icon
                                            size={22}
                                            stroke={isActive ? 2 : 1.7}
                                        />
                                    </span>
                                    <span className={s.tabLabel}>
                                        {t(tab.labelKey)}
                                    </span>
                                    {showBadge && (
                                        <span
                                            key={totalItems}
                                            className={s.badge}
                                            aria-hidden="true"
                                        >
                                            {totalItems > 99
                                                ? '99+'
                                                : totalItems}
                                        </span>
                                    )}
                                </>
                            );
                        }}
                    </NavLink>
                ))}
            </nav>
        </>
    );
};

export default BottomBar;
