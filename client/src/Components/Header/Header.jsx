import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ActionIcon, Drawer, Group, Indicator, Text } from '@mantine/core';
import logo from '../../images/logo.svg';
import SearchBlock from '../Catalog/SearchBlock';
import { useCart } from '../../CartContext.jsx';
import CountrySwitcher from '../CountrySelect/CountrySwitcher';
import classes from './Header.module.scss';

const Header = () => {
    const location = useLocation();
    const isNotAuthPage = location.pathname !== '/auth';
    const [searchOpen, setSearchOpen] = useState(false);
    const { cart } = useCart();
    const totalItemsInCart = cart.reduce((total, item) => total + item.quantity, 0);

    if (!isNotAuthPage) return null;

    return (
        <header className={classes.header}>
            <Link to="/" className={classes.logo}>
                <img src={logo} alt="greenman.kz" />
                <span>GreenMan</span>
            </Link>

            <nav className={classes.desktopNav}>
                <NavLink to="/" className={({ isActive }) => `${classes.navItem} ${isActive ? classes.navItemActive : ''}`} end>
                    Главная
                </NavLink>
                <NavLink to="/catalog" className={({ isActive }) => `${classes.navItem} ${isActive ? classes.navItemActive : ''}`}>
                    Каталог
                </NavLink>
                <NavLink to="/cart" className={({ isActive }) => `${classes.navItem} ${isActive ? classes.navItemActive : ''}`}>
                    <Indicator label={totalItemsInCart} size={16} disabled={totalItemsInCart === 0} color="greenman">
                        <Text>Корзина</Text>
                    </Indicator>
                </NavLink>
                <NavLink to="/profile" className={({ isActive }) => `${classes.navItem} ${isActive ? classes.navItemActive : ''}`}>
                    Профиль
                </NavLink>
            </nav>

            <Group className={classes.right} gap="sm">
                <CountrySwitcher />
                <ActionIcon variant="subtle" color="greenman" size="lg" onClick={() => setSearchOpen(true)} aria-label="Поиск">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                </ActionIcon>
            </Group>

            <Drawer
                opened={searchOpen}
                onClose={() => setSearchOpen(false)}
                position="top"
                size="auto"
                title="Поиск"
                overlayProps={{ opacity: 0.4, blur: 2 }}
            >
                <div style={{ padding: '0 0 16px' }}>
                    <SearchBlock />
                </div>
            </Drawer>
        </header>
    );
};

export default Header;
