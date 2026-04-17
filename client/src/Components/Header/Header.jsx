import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Burger, Drawer, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import logo from '../../images/logo.svg';
import SearchBlock from '../Catalog/SearchBlock';
import CountrySwitcher from '../CountrySelect/CountrySwitcher';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import { useCart } from '../../CartContext.jsx';
import { useWishlist } from '../../contexts/WishlistContext.jsx';
import {
    IconHeart,
    IconSearch,
    IconShoppingBag,
    IconUser,
} from '../../icons';
import classes from './Header.module.scss';

const Header = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const isAuthPage = location.pathname === '/auth';
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { cart } = useCart();
    const wishlist = useWishlist();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const wishCount = wishlist.ids.length;

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 4);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
        setSearchOpen(false);
    }, [location.pathname]);

    if (isAuthPage) return null;

    const navLinks = [
        { to: '/', label: t('header.nav.home'), end: true },
        { to: '/catalog', label: t('header.nav.catalog') },
    ];

    return (
        <>
            <header
                className={`${classes.header} ${scrolled ? classes.scrolled : ''}`}
            >
                <div className={classes.inner}>
                    <Link
                        to="/"
                        className={classes.logo}
                        aria-label={t('common.brand')}
                    >
                        <img src={logo} alt="" />
                        <span>{t('common.brand')}</span>
                    </Link>

                    <nav className={classes.desktopNav} aria-label="Primary">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.end}
                                className={({ isActive }) =>
                                    `${classes.navItem} ${isActive ? classes.navItemActive : ''}`
                                }
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className={classes.right}>
                        <button
                            type="button"
                            className={classes.iconBtn}
                            onClick={() => setSearchOpen(true)}
                            aria-label={t('search.title')}
                        >
                            <IconSearch size={20} stroke={1.8} />
                        </button>

                        <div className={classes.hideOnMobile}>
                            <LanguageSwitcher compact />
                        </div>
                        <div className={classes.hideOnMobile}>
                            <CountrySwitcher compact />
                        </div>

                        <span className={classes.divider} aria-hidden="true" />

                        <NavLink
                            to="/profile?tab=wishlist"
                            className={({ isActive }) =>
                                `${classes.iconBtn} ${classes.hideOnMobile} ${isActive ? classes.active : ''}`
                            }
                            aria-label={t('wishlist.title')}
                        >
                            <IconHeart size={20} stroke={1.8} />
                            {wishCount > 0 && (
                                <span
                                    key={wishCount}
                                    className={classes.badge}
                                    aria-hidden="true"
                                >
                                    {wishCount > 99 ? '99+' : wishCount}
                                </span>
                            )}
                        </NavLink>

                        <NavLink
                            to="/profile"
                            className={({ isActive }) =>
                                `${classes.iconBtn} ${classes.hideOnMobile} ${isActive ? classes.active : ''}`
                            }
                            aria-label={t('header.nav.profile')}
                        >
                            <IconUser size={20} stroke={1.8} />
                        </NavLink>

                        <NavLink
                            to="/cart"
                            className={({ isActive }) =>
                                `${classes.iconBtn} ${isActive ? classes.active : ''}`
                            }
                            aria-label={t('header.nav.cart')}
                        >
                            <IconShoppingBag size={20} stroke={1.8} />
                            {totalItems > 0 && (
                                <span
                                    key={totalItems}
                                    className={classes.badge}
                                    aria-hidden="true"
                                >
                                    {totalItems > 99 ? '99+' : totalItems}
                                </span>
                            )}
                        </NavLink>

                        <Burger
                            opened={menuOpen}
                            onClick={() => setMenuOpen((v) => !v)}
                            size="sm"
                            aria-label={
                                menuOpen
                                    ? t('header.menu_close')
                                    : t('header.menu_open')
                            }
                            className={classes.burger}
                        />
                    </div>
                </div>
            </header>

            <Drawer
                opened={searchOpen}
                onClose={() => setSearchOpen(false)}
                position="top"
                size="auto"
                title={t('search.title')}
                padding="lg"
            >
                <SearchBlock
                    onSubmit={() => setSearchOpen(false)}
                    autoFocus
                />
            </Drawer>

            <Drawer
                opened={menuOpen}
                onClose={() => setMenuOpen(false)}
                position="right"
                size="85%"
                padding="lg"
                title={
                    <span style={{ fontFamily: 'Hagrid', fontWeight: 800 }}>
                        {t('common.brand')}
                    </span>
                }
            >
                <Stack gap="xs">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            className={({ isActive }) =>
                                `${classes.drawerLink} ${isActive ? classes.drawerLinkActive : ''}`
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            `${classes.drawerLink} ${isActive ? classes.drawerLinkActive : ''}`
                        }
                    >
                        {t('header.nav.profile')}
                    </NavLink>
                    <NavLink
                        to="/cart"
                        className={({ isActive }) =>
                            `${classes.drawerLink} ${isActive ? classes.drawerLinkActive : ''}`
                        }
                    >
                        {t('header.nav.cart')}
                        {totalItems > 0 && ` · ${totalItems}`}
                    </NavLink>

                    <div className={classes.drawerDivider} />

                    <div style={{ display: 'flex', gap: 8 }}>
                        <LanguageSwitcher />
                        <CountrySwitcher />
                    </div>
                </Stack>
            </Drawer>
        </>
    );
};

export default Header;
