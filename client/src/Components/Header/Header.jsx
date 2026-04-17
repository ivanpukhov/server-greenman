import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ActionIcon, Burger, Drawer, Group, Indicator, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import logo from '../../images/logo.svg';
import SearchBlock from '../Catalog/SearchBlock';
import CountrySwitcher from '../CountrySelect/CountrySwitcher';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import { useCart } from '../../CartContext.jsx';
import { IconSearch, IconShoppingBag, IconUser } from '../../icons';
import classes from './Header.module.scss';

const Header = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const isAuthPage = location.pathname === '/auth';
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { cart } = useCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
            <header className={`${classes.header} ${scrolled ? classes.scrolled : ''}`}>
                <div className={classes.inner}>
                    <Link to="/" className={classes.logo} aria-label={t('common.brand')}>
                        <img src={logo} alt="" />
                        <span>{t('common.brand')}</span>
                    </Link>

                    <nav className={classes.desktopNav}>
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

                    <Group gap={6} className={classes.right} wrap="nowrap">
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            radius="xl"
                            onClick={() => setSearchOpen(true)}
                            aria-label={t('search.title')}
                            color="gray"
                        >
                            <IconSearch size={20} stroke={1.7} />
                        </ActionIcon>

                        <div className={classes.hideOnMobile}>
                            <LanguageSwitcher compact />
                        </div>
                        <div className={classes.hideOnMobile}>
                            <CountrySwitcher compact />
                        </div>

                        <ActionIcon
                            component={NavLink}
                            to="/cart"
                            variant="subtle"
                            size="lg"
                            radius="xl"
                            color="gray"
                            aria-label={t('header.nav.cart')}
                        >
                            <Indicator
                                label={totalItems}
                                size={16}
                                disabled={totalItems === 0}
                                color="greenman"
                                offset={2}
                            >
                                <IconShoppingBag size={20} stroke={1.7} />
                            </Indicator>
                        </ActionIcon>

                        <ActionIcon
                            component={NavLink}
                            to="/profile"
                            variant="subtle"
                            size="lg"
                            radius="xl"
                            color="gray"
                            className={classes.hideOnMobile}
                            aria-label={t('header.nav.profile')}
                        >
                            <IconUser size={20} stroke={1.7} />
                        </ActionIcon>

                        <Burger
                            opened={menuOpen}
                            onClick={() => setMenuOpen((v) => !v)}
                            size="sm"
                            aria-label={menuOpen ? t('header.menu_close') : t('header.menu_open')}
                            className={classes.burger}
                        />
                    </Group>
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
                <SearchBlock onSubmit={() => setSearchOpen(false)} />
            </Drawer>

            <Drawer
                opened={menuOpen}
                onClose={() => setMenuOpen(false)}
                position="right"
                size="80%"
                padding="lg"
                title={t('common.brand')}
            >
                <Stack gap="md">
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

                    <div className={classes.drawerDivider} />

                    <Group gap="xs">
                        <LanguageSwitcher />
                        <CountrySwitcher />
                    </Group>

                    <Text size="xs" c="dimmed" mt="md">
                        {t('common.tagline')}
                    </Text>
                </Stack>
            </Drawer>
        </>
    );
};

export default Header;
